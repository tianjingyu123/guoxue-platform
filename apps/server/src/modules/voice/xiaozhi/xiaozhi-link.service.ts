import { Injectable, Logger, Optional } from "@nestjs/common";
import { createHash, createHmac, randomBytes, randomInt, randomUUID } from "crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { VoiceDeviceService } from "../voice-device.service";
import { isActivationCode, normalizeDeviceSerial, summarizeDeviceInfo } from "./xiaozhi-protocol";
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

type TokenRecord = { deviceId: string; serialHash: string; bindingVersion: number; userId: string };
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

  /** OTA 检查：返回固件认识的 JSON（activation / websocket / server_time / firmware） */
  async handleOta(headers: Record<string, unknown>, body: unknown, host?: string) {
    const serial = normalizeDeviceSerial(this.header(headers, "device-id"));
    if (!serial) throw new BusinessException(ErrorCode.BAD_REQUEST, "缺少或无法识别 Device-Id");
    const info = summarizeDeviceInfo(body, this.header(headers, "user-agent"));
    const serialHash = this.devices.serialHash(serial);
    const d = await this.prisma.voiceDevice.findUnique({ where: { serialHash } });
    await this.recordSeen(serialHash, serial, info, d);

    // 固件：只对已登记、未停用的设备按发布与灰度决定；其余原样回报当前版本（设备不会升级）
    const firmware =
      d && this.firmware
        ? await this.firmware.decide(d, info.boardName, info.firmwareVersion, this.baseUrl(host))
        : { version: info.firmwareVersion || "0.0.0", url: "" };
    const base = {
      server_time: { timestamp: Date.now(), timezone_offset: 480 },
      firmware,
    };
    const websocket = (token: string) => ({ url: this.wsUrl(host), token, version: 1 });

    if (!d || d.status === "disabled") {
      return {
        ...base,
        websocket: websocket(""),
        activation: { message: d ? "设备已停用，请联系热卜客服" : "设备尚未在热卜登记，请联系热卜客服" },
      };
    }
    if (d.status === "unbound") {
      const { code, challenge } = await this.activationCodeFor(d.id, serialHash);
      return {
        ...base,
        websocket: websocket(""),
        activation: { code, message: `打开热卜App「我的硬件」\n输入激活码 ${code}`, challenge, timeout_ms: 30000 },
      };
    }
    // bound / transfer_pending：当前主人可用
    const token = await this.issueToken({ deviceId: d.id, serialHash, bindingVersion: d.bindingVersion, userId: d.currentUserId! });
    return { ...base, websocket: websocket(token) };
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
  async verifyConnection(authorization: string | undefined, deviceIdHeader: string | undefined) {
    const token = String(authorization || "").replace(/^Bearer\s+/i, "").trim();
    const serial = normalizeDeviceSerial(deviceIdHeader);
    if (!token || !serial) return null;
    const rec = await this.redis.getJson<TokenRecord>(`xz:tok:${sha256(token)}`);
    if (!rec || rec.serialHash !== this.devices.serialHash(serial)) return null;
    const d = await this.prisma.voiceDevice.findUnique({ where: { id: rec.deviceId } });
    if (!d || !["bound", "transfer_pending"].includes(d.status)) return null;
    if (d.bindingVersion !== rec.bindingVersion || d.currentUserId !== rec.userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: rec.userId }, select: { status: true } });
    if (!user || (user.status && user.status !== "ACTIVE")) return null;
    return { deviceId: d.id, userId: rec.userId, bindingVersion: d.bindingVersion, serialHint: d.serialHint };
  }

  // ───────── 终端核对（型号 / 芯片 / 固件） ─────────

  private async recordSeen(serialHash: string, serial: string, info: SeenRecord["info"], d: { id: string; status: string } | null) {
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
        ...(d ? {} : { serialForRegistration: serial }),
      };
      await this.redis.setJson(`xz:seen:${seenId}`, rec, SEEN_TTL_SECONDS);
      await this.redis.zadd("xz:seen:index", Date.now(), seenId);
      this.logger.log(`小智终端 OTA：…${rec.serialHint} ${d ? `台账 ${d.status}` : "未登记"} ${info.chipModel || "?"} ${info.boardName || info.boardType || "?"} 固件 ${info.firmwareVersion || "?"}`);
    } catch (e: any) {
      this.logger.warn(`记录小智终端信息失败：${e?.message || e}`);
    }
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
