import { Injectable, Logger, Optional } from "@nestjs/common";
import { createHash, createHmac, randomBytes, randomInt, randomUUID } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { VoiceDeviceService } from "../voice-device.service";
import { isActivationCode, normalizeClientId, normalizeDeviceSerial, summarizeDeviceInfo } from "./xiaozhi-protocol";
import { XiaozhiFirmwareService } from "./xiaozhi-firmware.service";

/**
 * 小智协议终端 · 设备身份、激活与连接令牌（「热卜主业务、小智协议终端」）
 *
 * 流程（与开源固件 main/ota.cc 行为对齐）：
 *   1. 设备开机 POST {OTA地址}，请求头带 Device-Id(MAC)、Client-Id(UUID)，正文是板卡与固件信息
 *   2. 热卜按 MAC 查设备台账：
 *      - 未登记 / 已停用：不给令牌、不给激活码（设备连不上，**也不会回退到官方云**：我们始终下发指向热卜的 websocket 地址）
 *      - 已登记未绑定：下发数字激活码（设备逐位播报），用户在热卜 App「我的硬件」输入完成绑定
 *      - 已绑定：下发一次性长度的连接令牌（只存哈希），设备存入本机后连接热卜 WebSocket
 *   3. 设备轮询 POST {OTA地址}activate：未绑定回 202，绑定后回 200
 *
 * 安全：
 * - MAC 只以 HMAC 形式进台账；激活码、令牌只存 HMAC/哈希，明文只下发给设备这一次，不写日志
 * - 令牌绑定「设备 + 绑定代次 + 用户」：解绑、转赠、停用后旧令牌立即失效
 * - 设备权限不替代用户权限：连接时仍校验绑定用户状态，会话照常走热卜的场景权限与额度
 * - 固件的 Serial-Number/HMAC 激活载荷依赖设备 eFuse 密钥，热卜不持有，不据此做任何信任判断
 */

export const XIAOZHI_WS_PATH = "/api/v1/xiaozhi/ws";
const CODE_TTL_SECONDS = 10 * 60;
const TOKEN_TTL_SECONDS = 30 * 86400;
const SEEN_TTL_SECONDS = 30 * 86400;
const BIND_ATTEMPTS_PER_10MIN = 10;
/** 上报记录索引上限：防止伪造 Device-Id 刷爆 Redis 与后台列表 */
const SEEN_INDEX_MAX = 5000;
/** 机主/后台重置设备身份：同一设备每小时最多 3 次 */
const IDENTITY_RESETS_PER_HOUR = 3;

/** 同一出口 IP 每分钟 OTA 次数上限（家庭一台设备开机只调一两次；工厂自检工位同一出口可调大） */
function otaPerIpPerMinute() {
  const n = Number(process.env.XIAOZHI_OTA_PER_IP_PER_MIN || 120);
  return Number.isInteger(n) && n > 0 ? n : 120;
}

type TokenRecord = { deviceId: string; serialHash: string; bindingVersion: number; userId: string; terminalIdHash: string };
/** 设备身份核对结果：ok 与锁定一致 / pinned 本次首次锁定 / mismatch 与锁定不一致 / missing 没带设备 ID */
type Identity = "ok" | "pinned" | "mismatch" | "missing";
type SeenRecord = {
  seenId: string;
  serialHint: string;
  /** 只有未登记设备才暂存明文 MAC，供后台一键登记；登记后立即删除 */
  serialForRegistration?: string;
  deviceId: string | null;
  registered: boolean;
  status: string | null;
  info: ReturnType<typeof summarizeDeviceInfo>;
  firstSeenAt: string;
  lastSeenAt: string;
  /** 最近一次身份核对结果；身份不符时记下时间，核对通过后清除 */
  identity?: Identity | null;
  identityMismatchAt?: string | null;
};

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

@Injectable()
export class XiaozhiLinkService {
  private readonly logger = new Logger(XiaozhiLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly devices: VoiceDeviceService,
    /** 固件在线升级（可选注入，兼容只测激活流程的用例） */
    @Optional() private readonly firmware?: XiaozhiFirmwareService,
  ) {}

  /** 设备访问热卜的 HTTP 根地址（固件下载用）：优先配置，否则按 OTA 请求的 Host 推导 */
  baseUrl(host?: string) {
    return (process.env.XIAOZHI_PUBLIC_BASE_URL || `http://${host || "127.0.0.1"}`).replace(/\/+$/, "");
  }

  get codeLength() {
    const n = Number(process.env.XIAOZHI_ACTIVATION_CODE_LENGTH || 6);
    return Number.isInteger(n) && n >= 4 && n <= 8 ? n : 6;
  }

  private codeKey(code: string) {
    const pepper = process.env.XIAOBU_DEVICE_PEPPER || "";
    return `xz:act:code:${createHmac("sha256", pepper).update(`xz-act:${code}`).digest("hex")}`;
  }

  /** 设备连接地址：优先配置的对外地址，否则按设备访问 OTA 时的 Host 推导（本机隔离测试） */
  wsUrl(host?: string) {
    const configured = process.env.XIAOZHI_WS_PUBLIC_URL;
    if (configured) return configured;
    return `ws://${host || "127.0.0.1"}${XIAOZHI_WS_PATH}`;
  }

  private header(headers: Record<string, unknown>, name: string) {
    const v = headers[name.toLowerCase()];
    return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
  }

  /**
   * OTA 检查：返回固件认识的 JSON（activation / websocket / server_time / firmware）
   *
   * 设备身份 = MAC（Device-Id）+ 设备私有 ID（Client-Id）。MAC 可被空中嗅探、同批连号，只认 MAC 的话
   * 任何人都能冒充已绑定设备拿令牌（用机主的时长、读机主设在设备上的场景），或抢先拿未绑定设备的激活码。
   * 设备私有 ID 出厂预置（登记时锁定）或首次联网锁定，之后不一致的请求拿不到令牌、激活码和固件。
   */
  async handleOta(headers: Record<string, unknown>, body: unknown, host?: string, ip?: string) {
    if (ip) {
      const { count } = await this.redis.incrWithTtl(`xz:ota:ip:${ip}`, 60);
      if (count > otaPerIpPerMinute()) {
        await this.stat("ota_throttled");
        throw new BusinessException(ErrorCode.RATE_LIMITED, "请求过于频繁，请稍后再试");
      }
    }
    const serial = normalizeDeviceSerial(this.header(headers, "device-id"));
    if (!serial) throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少或无法识别 Device-Id");
    const info = summarizeDeviceInfo(body, this.header(headers, "user-agent"));
    const serialHash = this.devices.serialHash(serial);
    const d = await this.prisma.voiceDevice.findUnique({ where: { serialHash } });
    const clientId = normalizeClientId(this.header(headers, "client-id"));
    const identity = d && d.status !== "disabled" ? await this.checkIdentity(d, clientId) : null;
    await this.recordSeen(serialHash, serial, info, d, identity);
    await this.stat("ota");

    const base = (firmware = { version: info.firmwareVersion || "0.0.0", url: "" }) => ({
      server_time: { timestamp: Date.now(), timezone_offset: 480 },
      firmware,
    });
    const websocket = (token: string) => ({ url: this.wsUrl(host), token, version: 1 });

    if (!d || d.status === "disabled") {
      return {
        ...base(),
        websocket: websocket(""),
        activation: { message: d ? "设备已停用，请联系热卜客服" : "设备尚未在热卜登记，请联系热卜客服" },
      };
    }
    if (identity === "mismatch" || identity === "missing") {
      // 不给令牌、激活码、固件；不说明是哪一项不符（避免给冒充者提示）
      await this.stat("identity_mismatch");
      this.logger.warn(`小智终端身份不符：…${d.serialHint} 台账 ${d.status}（可能被冒充，或设备恢复出厂/换主板后需机主重新认证）`);
      return {
        ...base(),
        websocket: websocket(""),
        activation: { message: "设备认证未通过\n请在热卜App「我的硬件」重新认证" },
      };
    }
    // 固件：只对已登记、未停用、身份核对通过的设备按发布与灰度决定；其余原样回报当前版本（设备不会升级）
    const fw = this.firmware ? await this.firmware.decide(d, info.boardName, info.firmwareVersion, this.baseUrl(host)) : undefined;
    if (d.status === "unbound") {
      const { code, challenge } = await this.activationCodeFor(d.id, serialHash);
      return {
        ...base(fw),
        websocket: websocket(""),
        activation: { code, message: `打开热卜App「我的硬件」\n输入激活码 ${code}`, challenge, timeout_ms: 30000 },
      };
    }
    // bound / transfer_pending：当前主人可用
    const token = await this.issueToken({
      deviceId: d.id,
      serialHash,
      bindingVersion: d.bindingVersion,
      userId: d.currentUserId!,
      terminalIdHash: this.devices.terminalIdHash(clientId!),
    });
    return { ...base(fw), websocket: websocket(token) };
  }

  /** 核对设备私有 ID：已锁定则比对；未锁定则本次锁定（条件更新，并发只有一次生效） */
  private async checkIdentity(d: { id: string; serialHint: string; terminalIdHash: string | null }, clientId: string | null): Promise<Identity> {
    if (!clientId) return "missing";
    const h = this.devices.terminalIdHash(clientId);
    if (d.terminalIdHash) return d.terminalIdHash === h ? "ok" : "mismatch";
    const r = await this.prisma.voiceDevice.updateMany({
      where: { id: d.id, terminalIdHash: null },
      data: { terminalIdHash: h, terminalPinnedAt: new Date(), terminalPinSource: "first_contact" },
    });
    if (r.count === 1) {
      this.logger.log(`小智终端身份已锁定（首次联网）：…${d.serialHint}`);
      return "pinned";
    }
    const fresh = await this.prisma.voiceDevice.findUnique({ where: { id: d.id }, select: { terminalIdHash: true } });
    return fresh?.terminalIdHash === h ? "ok" : "mismatch";
  }

  /**
   * 重置设备身份（设备恢复出厂/换主板后设备 ID 会变）：清除锁定并作废现有连接令牌，设备下次联网时重新锁定。
   * 机主只能重置自己已绑定的设备；后台可重置任意设备。每台每小时最多 3 次。
   */
  async resetTerminalIdentity(deviceId: string, by: { userId?: string; adminId?: string }) {
    const d = await this.prisma.voiceDevice.findUnique({ where: { id: deviceId } });
    if (!d || (by.userId && d.currentUserId !== by.userId)) throw new BusinessException(ErrorCode.NOT_FOUND, "设备不存在");
    if (by.userId && d.status !== "bound") throw new BusinessException(ErrorCode.CONFLICT, "只有已绑定的设备才能重新认证");
    const { count } = await this.redis.incrWithTtl(`xz:idreset:${d.id}`, 3600);
    if (count > IDENTITY_RESETS_PER_HOUR) throw new BusinessException(ErrorCode.RATE_LIMITED, "操作太频繁，请 1 小时后再试");
    await this.prisma.voiceDevice.update({
      where: { id: d.id },
      data: { terminalIdHash: null, terminalPinnedAt: null, terminalPinSource: null },
    });
    await this.revokeTokens(d.id);
    this.logger.log(`小智终端身份已重置：…${d.serialHint} by=${by.adminId ? `admin:${by.adminId}` : `owner:${by.userId}`}`);
    return { ok: true, message: "已重置。请把设备断电重开，设备联网后会自动完成认证。" };
  }

  private async revokeTokens(deviceId: string) {
    const key = await this.redis.get(`xz:tok:dev:${deviceId}`);
    if (key) await this.redis.del(key);
    await this.redis.del(`xz:tok:dev:${deviceId}`);
  }

  /** 激活轮询：绑定完成 200，等待中 202，设备未登记 404 */
  async handleActivate(headers: Record<string, unknown>) {
    const serial = normalizeDeviceSerial(this.header(headers, "device-id"));
    if (!serial) return { status: 400 };
    const d = await this.prisma.voiceDevice.findUnique({ where: { serialHash: this.devices.serialHash(serial) } });
    if (!d || d.status === "disabled") return { status: 404 };
    if (d.status === "unbound") return { status: 202 };
    return { status: 200 };
  }

  private async activationCodeFor(deviceId: string, serialHash: string) {
    const existing = await this.redis.getJson<{ code: string; challenge: string }>(`xz:act:dev:${deviceId}`);
    if (existing && (await this.redis.get(this.codeKey(existing.code)))) return existing;
    for (let i = 0; i < 20; i++) {
      const code = String(randomInt(0, 10 ** this.codeLength)).padStart(this.codeLength, "0");
      // 同一时刻不同设备不得拿到相同的码
      if (await this.redis.setNX(this.codeKey(code), JSON.stringify({ deviceId, serialHash }), CODE_TTL_SECONDS)) {
        const rec = { code, challenge: randomUUID() };
        await this.redis.setJson(`xz:act:dev:${deviceId}`, rec, CODE_TTL_SECONDS);
        return rec;
      }
    }
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, "激活码生成失败，请稍后重试");
  }

  /** 用户在 App 输入设备播报的激活码完成绑定（与平台绑定码同一状态机、同一审计） */
  async bindByActivationCode(userId: string, rawCode: string) {
    const code = String(rawCode || "").trim();
    if (!isActivationCode(code, this.codeLength)) throw new BusinessException(ErrorCode.BAD_REQUEST, "激活码格式不正确");
    const { count } = await this.redis.incrWithTtl(`xz:act:try:${userId}`, 600);
    if (count > BIND_ATTEMPTS_PER_10MIN) throw new BusinessException(ErrorCode.RATE_LIMITED, "尝试次数过多，请 10 分钟后再试");
    const rec = await this.redis.getJson<{ deviceId: string; serialHash: string }>(this.codeKey(code));
    if (!rec) throw new BusinessException(ErrorCode.BAD_REQUEST, "激活码无效或已过期，请重启设备获取新的激活码");
    const view = await this.devices.bindUnboundDevice(userId, rec.deviceId);
    await this.redis.del(this.codeKey(code));
    await this.redis.del(`xz:act:dev:${rec.deviceId}`);
    return view;
  }

  // ───────── 连接令牌 ─────────

  private async issueToken(rec: TokenRecord) {
    const token = randomBytes(32).toString("base64url");
    const key = `xz:tok:${sha256(token)}`;
    // 只保留最新一枚：设备每次开机取新令牌，旧的立即作废
    const prev = await this.redis.get(`xz:tok:dev:${rec.deviceId}`);
    if (prev) await this.redis.del(prev);
    await this.redis.setJson(key, rec, TOKEN_TTL_SECONDS);
    await this.redis.set(`xz:tok:dev:${rec.deviceId}`, key, TOKEN_TTL_SECONDS);
    return token;
  }

  /**
   * WebSocket 握手鉴权：令牌存在 + Device-Id 与令牌所属设备一致 + 设备仍由同一用户以同一代次持有 + 用户状态正常。
   * 任一不满足返回 null（调用方统一回 401，不说明原因）。
   */
  async verifyConnection(authorization: string | undefined, deviceIdHeader: string | undefined, clientIdHeader?: string | undefined) {
    const token = String(authorization || "").replace(/^Bearer\s+/i, "").trim();
    const serial = normalizeDeviceSerial(deviceIdHeader);
    const clientId = normalizeClientId(clientIdHeader);
    if (!token || !serial || !clientId) return null;
    const rec = await this.redis.getJson<TokenRecord>(`xz:tok:${sha256(token)}`);
    if (!rec || rec.serialHash !== this.devices.serialHash(serial)) return null;
    // 令牌与设备私有 ID 绑定：令牌被截获后换一台设备（或脚本）也连不上
    const idHash = this.devices.terminalIdHash(clientId);
    if (!rec.terminalIdHash || rec.terminalIdHash !== idHash) return null;
    const d = await this.prisma.voiceDevice.findUnique({ where: { id: rec.deviceId } });
    if (!d || !["bound", "transfer_pending"].includes(d.status)) return null;
    if (d.terminalIdHash !== idHash) return null;
    if (d.bindingVersion !== rec.bindingVersion || d.currentUserId !== rec.userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: rec.userId }, select: { status: true } });
    if (!user || (user.status && user.status !== "ACTIVE")) return null;
    return { deviceId: d.id, userId: rec.userId, bindingVersion: d.bindingVersion, serialHint: d.serialHint };
  }

  // ───────── 终端核对（型号 / 芯片 / 固件） ─────────

  private async recordSeen(serialHash: string, serial: string, info: SeenRecord["info"], d: { id: string; status: string } | null, identity: Identity | null = null) {
    try {
      const seenId = serialHash.slice(0, 24);
      const now = new Date().toISOString();
      const prev = await this.redis.getJson<SeenRecord>(`xz:seen:${seenId}`);
      const rec: SeenRecord = {
        seenId,
        serialHint: serial.slice(-4),
        deviceId: d?.id ?? null,
        registered: !!d,
        status: d?.status ?? null,
        info,
        firstSeenAt: prev?.firstSeenAt || now,
        lastSeenAt: now,
        identity,
        identityMismatchAt: identity === "mismatch" || identity === "missing" ? now : identity ? null : (prev?.identityMismatchAt ?? null),
        ...(d ? {} : { serialForRegistration: serial }),
      };
      await this.redis.setJson(`xz:seen:${seenId}`, rec, SEEN_TTL_SECONDS);
      await this.redis.zadd("xz:seen:index", Date.now(), seenId);
      if ((await this.redis.zcard("xz:seen:index")) > SEEN_INDEX_MAX) await this.redis.zremrangebyrank("xz:seen:index", 0, -SEEN_INDEX_MAX - 1);
      this.logger.log(`小智终端 OTA：…${rec.serialHint} ${d ? `台账 ${d.status}` : "未登记"} ${info.chipModel || "?"} ${info.boardName || info.boardType || "?"} 固件 ${info.firmwareVersion || "?"}`);
    } catch (e: any) {
      this.logger.warn(`记录小智终端信息失败：${e?.message || e}`);
    }
  }

  // ───────── 终端状态与运行统计 ─────────

  /**
   * 运行计数（按北京时间自然日，保留 8 天）：ota / auth_fail / ws_open / end:<原因>。
   * 只计数，不记录设备或用户标识；计数失败不影响业务。
   */
  async stat(metric: string) {
    try {
      const day = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10).replace(/-/g, "");
      await this.redis.incrWithTtl(`xz:stat:${day}:${metric}`, 8 * 86400);
    } catch {
      /* 忽略 */
    }
  }

  /**
   * 对话中标记：会话打开时置上（带过期兜底），断开时清掉。
   * 值为连接号，只清自己置的标记——同一设备新连接顶掉旧连接时，旧连接的收尾不会误清新标记。
   */
  async markTalking(deviceId: string, connId: string, on: boolean, ttlSeconds = 3600) {
    try {
      if (on) {
        await this.redis.set(`xz:talking:${deviceId}`, connId, ttlSeconds);
        await this.redis.zadd("xz:talking:index", Date.now() + ttlSeconds * 1000, deviceId);
      } else if (await this.redis.compareAndDelete(`xz:talking:${deviceId}`, connId)) {
        await this.redis.zrem("xz:talking:index", deviceId);
      }
    } catch {
      /* 忽略 */
    }
  }

  /**
   * 用户侧设备状态（诚实口径）：这类固件平时不保持长连接，只在开机和对话时联系服务器，
   * 所以只给「最近联网时间」「固件版本」「是否正在对话」，不伪造实时在线。
   */
  async terminalStatus(deviceIds: string[]) {
    type St = { lastSeenAt: string | null; firmwareVersion: string | null; talking: boolean; identityMismatch: boolean };
    if (!deviceIds.length) return {} as Record<string, St>;
    const rows = await this.prisma.voiceDevice.findMany({ where: { id: { in: deviceIds } }, select: { id: true, serialHash: true } });
    const seen = await this.redis.mgetJson<SeenRecord>(rows.map((r) => `xz:seen:${r.serialHash.slice(0, 24)}`));
    const out: Record<string, St> = {};
    for (let i = 0; i < rows.length; i++) {
      const talking = !!(await this.redis.get(`xz:talking:${rows[i].id}`).catch(() => null));
      out[rows[i].id] = {
        lastSeenAt: seen[i]?.lastSeenAt ?? null,
        firmwareVersion: seen[i]?.info?.firmwareVersion ?? null,
        talking,
        // 最近一次联网身份不符：提示机主「重新认证」（设备恢复出厂/换主板），也可能是有人在冒充
        identityMismatch: !!seen[i]?.identityMismatchAt,
      };
    }
    return out;
  }

  /** 后台运行概况：台账分布、近 24 小时/7 天联网、正在对话、固件版本分布、近 7 天运行计数 */
  async overview() {
    const now = Date.now();
    const byStatus = await this.prisma.voiceDevice.groupBy({ by: ["status"], _count: { _all: true } });
    const ids = await this.redis.zrevrange("xz:seen:index", 0, 999);
    const recs = (await this.redis.mgetJson<SeenRecord>(ids.map((id) => `xz:seen:${id}`))).filter(Boolean) as SeenRecord[];
    const within = (ms: number) => recs.filter((r) => now - new Date(r.lastSeenAt).getTime() <= ms);
    const firmware: Record<string, number> = {};
    for (const r of recs.filter((x) => x.registered)) {
      const k = `${r.info.boardName || r.info.boardType || "未知板型"} ${r.info.firmwareVersion || "?"}`;
      firmware[k] = (firmware[k] || 0) + 1;
    }
    // 过期的对话标记从索引里清掉后再计数
    await this.redis.zremrangebyscore("xz:talking:index", 0, now).catch(() => 0);
    const talking = await this.redis.zcard("xz:talking:index").catch(() => 0);
    const days: { day: string; counts: Record<string, number> }[] = [];
    const metrics = ["ota", "ota_throttled", "identity_mismatch", "auth_fail", "ws_open", "end:device_hangup", "end:device_disconnect", "end:idle_timeout", "end:session_limit", "end:provider_unavailable", "end:session_rejected", "end:relay_failed", "end:provider_error", "end:hello_timeout", "end:replaced_by_new_connection"];
    for (let i = 0; i < 7; i++) {
      const day = new Date(now + 8 * 3600_000 - i * 86400_000).toISOString().slice(0, 10).replace(/-/g, "");
      const counts: Record<string, number> = {};
      for (const m of metrics) {
        const v = Number(await this.redis.get(`xz:stat:${day}:${m}`).catch(() => null)) || 0;
        if (v) counts[m] = v;
      }
      days.push({ day, counts });
    }
    return {
      ledger: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])),
      seen: { last24h: within(86400_000).length, last7d: within(7 * 86400_000).length, unregistered: recs.filter((r) => !r.registered).length },
      talkingNow: talking,
      firmware,
      days,
    };
  }

  /** 后台：最近上报过的终端（不含明文 MAC） */
  async listSeen(limit = 50) {
    const ids = await this.redis.zrevrange("xz:seen:index", 0, Math.min(limit, 200) - 1);
    const rows = await this.redis.mgetJson<SeenRecord>(ids.map((id) => `xz:seen:${id}`));
    return rows.filter(Boolean).map((r) => {
      const { serialForRegistration, ...rest } = r as SeenRecord;
      return { ...rest, canRegister: !!serialForRegistration && !rest.registered };
    });
  }

  /** 后台：把上报过的未登记终端登记进台账（MAC 不经过前端） */
  async registerSeen(adminId: string, seenId: string, input: { productSku: string; circleId?: string | null; agentProfileId?: string | null }) {
    const rec = await this.redis.getJson<SeenRecord>(`xz:seen:${String(seenId || "").slice(0, 64)}`);
    if (!rec?.serialForRegistration) throw new BusinessException(ErrorCode.NOT_FOUND, "该终端不存在或已登记");
    const view = await this.devices.register(adminId, { serial: rec.serialForRegistration, ...input });
    const { serialForRegistration, ...rest } = rec;
    await this.redis.setJson(`xz:seen:${rec.seenId}`, { ...rest, registered: true, deviceId: view.id, status: view.status }, SEEN_TTL_SECONDS);
    return view;
  }
}
