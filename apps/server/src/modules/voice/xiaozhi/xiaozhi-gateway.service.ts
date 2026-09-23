import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { randomUUID } from "crypto";
import type * as http from "http";
import type { Duplex } from "stream";
import { PrismaService } from "../../../prisma/prisma.service";
import { VoiceSessionService } from "../voice-session.service";
import { VoiceQuotaService } from "../voice-quota.service";
import { DeviceStream, DeviceStreamEvent, VOICE_PROVIDER, VoiceProvider } from "../provider/voice-provider.types";
import { MiniWsConnection, acceptUpgrade, rejectUpgrade } from "./mini-ws";
import { XIAOZHI_WS_PATH, XiaozhiLinkService } from "./xiaozhi-link.service";
import { RedisService } from "../../../redis/redis.service";
import { sendAlert } from "../../../common/alert";
import { xiaozhiReadiness } from "./xiaozhi-ops";

/** 跨实例顶替：新连接建立时广播，持有同一设备旧连接的其他实例关掉旧连接 */
const KICK_CHANNEL = "xz:kick";
import { BinaryVersion, normalizeBinaryVersion, packAudio, parseDeviceHello, unpackAudio } from "./xiaozhi-protocol";

/** 握手鉴权上限：engine.io 会在 1 秒内结束「无人应答」的升级请求，这里提前自行回 503 */
const AUTH_TIMEOUT_MS = 800;
const HELLO_TIMEOUT_MS = 10_000;

type Auth = NonNullable<Awaited<ReturnType<XiaozhiLinkService["verifyConnection"]>>>;

export interface XiaozhiDeps {
  sessions: VoiceSessionService;
  quota: VoiceQuotaService;
  provider: VoiceProvider;
  prisma: PrismaService;
  logger: Logger;
  /** 对话中标记与运行计数（可缺省：单元测试直接构造连接时不需要） */
  link?: Pick<XiaozhiLinkService, "markTalking" | "stat">;
}

/** 提前提醒：会话剩余多少秒时提醒一次 */
const LIMIT_WARN_SECONDS = 30;
/** 按余额开出的会话不超过这么长时，开场提醒余额 */
const LOW_BALANCE_SECONDS = 5 * 60;

/** 把额度类报错换成对硬件用户友好的说法（设备上只能看/听，没法点按钮） */
export function friendlyDeviceMessage(raw: string | undefined) {
  const m = raw || "";
  if (/额度不足/.test(m)) return "语音时长用完啦，请在热卜 App「我的硬件」里充值后再来找我。";
  if (/被其他通话使用/.test(m)) return "你的另一台设备正在通话，请先结束那边再试。";
  return `暂时无法开始：${m || "请稍后再试"}`;
}

/**
 * 小智协议终端 WebSocket 接入（「热卜主业务、小智协议终端」）
 *
 * 设备只负责拾音、播放与协议通信；会话、权限、额度、计费、审计都走热卜现有的会话编排（VoiceSessionService）：
 *   握手鉴权（令牌 + Device-Id + 绑定代次 + 用户状态）→ hello → 以绑定用户身份开硬件会话（额度/上下文/幂等键）
 *   → 打开供应商设备中继（openDeviceStream）→ 双向转发 → 结束时按实际时长估算收尾
 *
 * 供应商不支持设备中继（如「暂未开放」）时：回 hello 后下发提示并结束，不伪造对话。
 * Mock 供应商只做回放，所有文本标注「模拟」，会话在库里 providerIsMock=true。
 */
@Injectable()
export class XiaozhiGatewayService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(XiaozhiGatewayService.name);
  private readonly connections = new Map<string, XiaozhiConnection>();
  private attachedServer: http.Server | null = null;
  /** 本实例标识（跨实例顶替时区分消息来源） */
  readonly instanceId = randomUUID();
  private sub: { quit(): Promise<unknown> } | null = null;
  private readonly listener = (req: http.IncomingMessage, socket: Duplex, head: Buffer) => void this.onUpgrade(req, socket, head);

  constructor(
    private readonly link: XiaozhiLinkService,
    private readonly sessions: VoiceSessionService,
    private readonly quota: VoiceQuotaService,
    private readonly prisma: PrismaService,
    @Inject(VOICE_PROVIDER) private readonly provider: VoiceProvider,
    @Optional() private readonly adapterHost?: HttpAdapterHost,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async onApplicationBootstrap() {
    const server = this.adapterHost?.httpAdapter?.getHttpServer?.();
    if (server) this.attach(server);
    this.reportReadiness();
    await this.enableCrossInstance();
  }

  /** 启动体检：生产环境有缺项时记错误日志并发运维告警；非生产只记一条提示 */
  private reportReadiness() {
    const items = xiaozhiReadiness(process.env, this.provider.isMock);
    if (!items.length) return;
    const text = items.map((i) => `[${i.level === "error" ? "必须" : "建议"}] ${i.item}`).join("；");
    if (process.env.NODE_ENV === "production") {
      this.logger.error(`小智协议终端上线配置不完整：${text}`);
      if (items.some((i) => i.level === "error")) sendAlert("xz:readiness", "小卜硬件：上线配置不完整", text);
    } else {
      this.logger.log(`小智协议终端配置体检（非生产，仅提示）：${text}`);
    }
  }

  /**
   * 跨实例顶替：订阅 Redis 广播。设备换到另一台实例重连时，旧实例上的连接会被关掉，
   * 避免同一台设备同时挂着两路会话（两边都在计时计费）。内存模式（未配 REDIS_URL）即单实例，无需订阅。
   */
  async enableCrossInstance() {
    if (!this.redis || this.sub) return;
    try {
      await this.redis.get("xz:ping"); // 触发建立连接
      const client = this.redis.getClient();
      if (!client) {
        this.logger.log("小智协议终端：未连接 Redis，按单实例运行（新连接只在本实例内顶替旧连接）");
        return;
      }
      const sub = client.duplicate();
      sub.on("error", () => undefined);
      sub.on("message", (_ch: string, msg: string) => this.onKick(msg));
      await sub.subscribe(KICK_CHANNEL);
      this.sub = sub;
    } catch (e: any) {
      this.logger.warn(`小智协议终端跨实例顶替订阅失败（退化为单实例顶替）：${e?.message || e}`);
    }
  }

  private onKick(raw: string) {
    try {
      const m = JSON.parse(raw) as { deviceId: string; connId: string; from: string; epoch: number };
      if (m.from === this.instanceId) return;
      const c = this.connections.get(m.deviceId);
      // Redis 消息可能晚到：只允许较新的连接顶替较旧的连接。
      if (c && c.id !== m.connId && Number.isSafeInteger(m.epoch) && m.epoch > c.epoch) {
        c.shutdown("replaced_by_new_connection");
      }
    } catch {
      /* 忽略格式不对的消息 */
    }
  }

  onModuleDestroy() {
    this.attachedServer?.off("upgrade", this.listener);
    for (const c of this.connections.values()) c.shutdown("server_shutdown");
    void this.sub?.quit().catch(() => undefined);
    this.sub = null;
  }

  /** 挂到 HTTP 服务上；只处理小智路径，其它升级（socket.io）原样放过 */
  attach(server: http.Server) {
    this.attachedServer = server;
    server.on("upgrade", this.listener);
    this.logger.log(`小智协议终端接入已挂载：${XIAOZHI_WS_PATH}（供应商 ${this.provider.id}${this.provider.isMock ? "·模拟" : ""}）`);
  }

  activeCount() {
    return this.connections.size;
  }

  get providerIsMock() {
    return this.provider.isMock;
  }

  private async onUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer) {
    const path = (req.url || "").split("?")[0].replace(/\/+$/, "");
    if (path !== XIAOZHI_WS_PATH) return;
    socket.on("error", () => undefined);
    let auth: Auth | null = null;
    try {
      auth = await Promise.race([
        this.link.verifyConnection(req.headers.authorization, headerOf(req, "device-id"), headerOf(req, "client-id")),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("auth timeout")), AUTH_TIMEOUT_MS)),
      ]);
    } catch (e: any) {
      this.logger.warn(`小智终端握手鉴权超时/失败：${e?.message || e}`);
      return rejectUpgrade(socket, 503, "service busy");
    }
    if (!auth) {
      void this.link.stat("auth_fail");
      return rejectUpgrade(socket, 401, "unauthorized");
    }
    let epoch = 0;
    if (this.sub && this.redis) {
      try {
        epoch = (await this.redis.incrWithTtl(`xz:connseq:${auth.deviceId}`, 86400)).count;
      } catch (e: any) {
        this.logger.warn(`小智终端连接序号分配失败，按本实例顶替运行：${e?.message || e}`);
      }
    }
    const prev = this.connections.get(auth.deviceId);
    // 同一实例的两个异步握手也可能乱序完成，拒绝较早的那一个。
    if (prev && epoch > 0 && prev.epoch > 0 && epoch <= prev.epoch) {
      return rejectUpgrade(socket, 409, "superseded");
    }
    const ws = acceptUpgrade(req, socket, head);
    if (!ws) return;
    void this.link.stat("ws_open");

    if (prev) prev.shutdown("replaced_by_new_connection");
    const conn = new XiaozhiConnection(ws, auth, normalizeBinaryVersion(headerOf(req, "protocol-version")), {
      sessions: this.sessions,
      quota: this.quota,
      provider: this.provider,
      prisma: this.prisma,
      logger: this.logger,
      link: this.link,
    }, epoch);
    this.connections.set(auth.deviceId, conn);
    // 通知其他实例：这台设备已在本实例重连，旧连接可以关了
    if (epoch > 0) {
      void this.redis!.publish(KICK_CHANNEL, JSON.stringify({ deviceId: auth.deviceId, connId: conn.id, from: this.instanceId, epoch }))
        .catch((e: any) => this.logger.warn(`小智终端跨实例顶替广播失败：${e?.message || e}`));
    }
    conn.onClosed(() => {
      if (this.connections.get(auth!.deviceId) === conn) this.connections.delete(auth!.deviceId);
    });
    this.logger.log(`小智终端已连接：设备 …${auth.serialHint} 代次 ${auth.bindingVersion}`);
  }
}

function headerOf(req: http.IncomingMessage, name: string) {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/** 单个设备连接的协议状态机 */
export class XiaozhiConnection {
  readonly id = randomUUID();
  private state: "awaiting_hello" | "starting" | "open" | "closing" | "closed" = "awaiting_hello";
  private sessionId: string | null = null;
  private sessionRequestId: string | null = null;
  private maxSeconds = 0;
  private stream: DeviceStream | null = null;
  private helloTimer: NodeJS.Timeout | null;
  private idleTimer: NodeJS.Timeout | null = null;
  private limitTimer: NodeJS.Timeout | null = null;
  private warnTimer: NodeJS.Timeout | null = null;
  private openedAt = 0;
  private talkingMarked = false;
  private idleMs = 60_000;
  private lastTouch = 0;
  private closedListeners: (() => void)[] = [];
  private finished = false;
  private lastDownlinkAt = 0;
  /** 统计（测试与日志用）：只计数，不保存任何音频 */
  readonly stats = { uplinkFrames: 0, downlinkFrames: 0, utterances: 0, lateDownlinkGaps: 0, maxDownlinkGapMs: 0, maxSendBufferBytes: 0, backpressureFrames: 0 };

  constructor(
    private readonly ws: MiniWsConnection,
    private readonly auth: Auth,
    private readonly binaryVersion: BinaryVersion,
    private readonly deps: XiaozhiDeps,
    readonly epoch = 0,
  ) {
    ws.on("text", (t: string) => void this.onText(t));
    ws.on("binary", (b: Buffer) => this.onBinary(b));
    ws.on("close", (code: number) => void this.finish(code === 1000 ? "device_hangup" : "device_disconnect"));
    this.helloTimer = setTimeout(() => this.shutdown("hello_timeout"), HELLO_TIMEOUT_MS);
  }

  onClosed(cb: () => void) {
    this.closedListeners.push(cb);
  }

  get currentSessionId() {
    return this.sessionId;
  }

  private send(obj: Record<string, unknown>) {
    this.ws.sendText(JSON.stringify(this.sessionRequestId ? { session_id: this.sessionRequestId, ...obj } : obj));
  }

  private async onText(text: string) {
    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      return; // 与固件一致：格式不对的消息忽略
    }
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "hello") return this.onHello(msg);
    if (this.state !== "open" || !this.stream) return;
    this.touch();
    switch (msg.type) {
      case "listen":
        if (msg.state === "start") {
          const mode = msg.mode === "manual" || msg.mode === "realtime" ? msg.mode : "auto";
          this.stream.control({ type: "listen_start", mode });
        } else if (msg.state === "stop") {
          this.stream.control({ type: "listen_stop" });
        } else if (msg.state === "detect") {
          this.stream.control({ type: "wake", text: typeof msg.text === "string" ? msg.text.slice(0, 40) : undefined });
        }
        break;
      case "abort":
        this.stream.control({ type: "abort", reason: typeof msg.reason === "string" ? msg.reason.slice(0, 40) : undefined });
        break;
      default:
        // mcp 等其它消息：第一阶段不处理（热卜 MCP 走服务端受控检索，不直接挂到设备）
        break;
    }
  }

  private async onHello(msg: any) {
    if (this.state !== "awaiting_hello") return;
    const hello = parseDeviceHello(msg);
    if (!hello.ok) {
      this.deps.logger.warn(`小智终端 hello 不合规：${hello.reason}`);
      return this.shutdown("bad_hello");
    }
    this.state = "starting";
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.helloTimer = null;

    // 以绑定用户身份开硬件会话：设备权限不替代用户权限，额度、上下文、幂等键都走热卜会话编排
    let started: any;
    try {
      started = await this.deps.sessions.startForDevice(this.auth.userId, this.auth.deviceId, `xz-${this.id}`, {
        allowPendingVendorForMockRelay: true,
      });
    } catch (e: any) {
      if (this.finished) return;
      return this.helloThenAlert(friendlyDeviceMessage(e?.message), "session_rejected");
    }
    // 设备可能在签发会话的异步等待中断开；此时收尾已运行过，需主动结束迟到的会话。
    if (this.finished) {
      if (started?.available && started.session?.id) {
        try {
          await this.deps.sessions.end(this.auth.userId, started.session.id, { reason: "user_hangup", clientEstimatedSeconds: 0 });
        } catch (e: any) {
          this.deps.logger.warn(`小智终端迟到会话收尾失败（清理任务会兜底）：${e?.message || e}`);
        }
      }
      return;
    }
    if (!started?.available) {
      return this.helloThenAlert(started?.userMessage || "语音服务暂未开放", "provider_unavailable");
    }
    this.sessionId = started.session.id;
    this.sessionRequestId = started.session.requestId;
    this.maxSeconds = started.session.maxSeconds;

    const row = await this.deps.prisma.voiceSession.findUnique({
      where: { id: this.sessionId! },
      select: { providerSessionId: true, requestId: true },
    });
    if (this.finished) return;
    if (!this.deps.provider.openDeviceStream || !row?.providerSessionId) {
      return this.helloThenAlert("小卜语音暂未开放，你可以先用热卜 App 和小卜文字交流。", "relay_unsupported");
    }
    try {
      this.stream = await this.deps.provider.openDeviceStream({
        providerSessionId: row.providerSessionId,
        correlationId: row.requestId,
        uplink: { codec: "opus", sampleRate: hello.audio.sample_rate, channels: 1, frameDurationMs: hello.audio.frame_duration },
        timeoutMs: 5000,
      });
    } catch (e: any) {
      if (this.finished) return;
      return this.helloThenAlert("语音服务连接失败，请稍后再试", "relay_failed");
    }
    if (this.finished) {
      try {
        this.stream.close("device_disconnect");
      } catch {
        /* 中继可能已自行断开 */
      }
      return;
    }
    this.stream.onEvent((e) => this.onStreamEvent(e));
    const d = this.stream.downlink;
    this.state = "open";
    this.openedAt = Date.now();
    this.send({
      type: "hello",
      transport: "websocket",
      audio_params: { format: "opus", sample_rate: d.sampleRate, channels: d.channels, frame_duration: d.frameDurationMs },
    });
    const cfg = await this.deps.quota.getConfig();
    if (this.finished) return;
    this.idleMs = Math.max(15, cfg.idleTimeoutSeconds || 60) * 1000;
    this.touch(true);
    if (this.deps.link) {
      this.talkingMarked = true;
      void this.deps.link.markTalking(this.auth.deviceId, this.id, true, this.maxSeconds + 120);
    }
    // 按余额开出的会话（比单次上限短）说明余额快用完了：开场提醒一次，结束语也按「时长用完」说
    const byBalance = !!cfg.chargeUsers && this.maxSeconds < cfg.sessionMaxSeconds;
    if (byBalance && this.maxSeconds <= LOW_BALANCE_SECONDS) {
      this.send({ type: "alert", status: "小卜", message: `语音时长只剩约 ${Math.max(1, Math.round(this.maxSeconds / 60))} 分钟，可在热卜 App 充值。`, emotion: "neutral" });
    }
    // 结束前提醒一次，避免话说到一半被切断
    if (this.maxSeconds > LIMIT_WARN_SECONDS * 2) {
      this.warnTimer = setTimeout(() => {
        if (this.state !== "open") return;
        this.send({
          type: "alert",
          status: "小卜",
          message: byBalance ? `语音时长还剩 ${LIMIT_WARN_SECONDS} 秒，可在热卜 App 充值。` : `本次通话还剩 ${LIMIT_WARN_SECONDS} 秒。`,
          emotion: "neutral",
        });
      }, (this.maxSeconds - LIMIT_WARN_SECONDS) * 1000);
    }
    // 单次会话上限（未开始计费时为免费体验上限）：到点提示并结束
    const endText = byBalance ? "语音时长用完啦，请在热卜 App 充值后再来找我。" : "本次通话时长已到，按一下按键可以继续。";
    this.limitTimer = setTimeout(() => this.endWithAlert(endText, "session_limit"), this.maxSeconds * 1000);
  }

  /** 让设备先完成握手再看到提示，否则设备只会显示「连接失败」 */
  private helloThenAlert(message: string, reason: string) {
    this.ws.sendText(JSON.stringify({ type: "hello", transport: "websocket", audio_params: { format: "opus", sample_rate: 16000, channels: 1, frame_duration: 60 } }));
    this.ws.sendText(JSON.stringify({ type: "alert", status: "小卜", message, emotion: "neutral" }));
    setTimeout(() => this.shutdown(reason), 300);
  }

  private endWithAlert(message: string, reason: string) {
    if (this.state !== "open") return;
    this.send({ type: "tts", state: "stop" });
    this.send({ type: "alert", status: "小卜", message, emotion: "neutral" });
    setTimeout(() => this.shutdown(reason), 300);
  }

  private onBinary(buf: Buffer) {
    if (this.state !== "open" || !this.stream) return;
    const a = unpackAudio(buf, this.binaryVersion);
    if (!a) return;
    this.stats.uplinkFrames++;
    this.stream.pushAudio(a.payload);
  }

  private onStreamEvent(e: DeviceStreamEvent) {
    if (this.state !== "open") return;
    switch (e.type) {
      case "stt":
        this.stats.utterances++;
        this.touch();
        this.send({ type: "stt", text: e.text });
        break;
      case "emotion":
        this.send({ type: "llm", emotion: e.emotion, text: "" });
        break;
      case "tts_start":
        this.lastDownlinkAt = 0;
        this.send({ type: "tts", state: "start" });
        break;
      case "tts_sentence":
        this.send({ type: "tts", state: "sentence_start", text: e.text });
        break;
      case "audio":
        if (this.lastDownlinkAt) {
          const gap = Date.now() - this.lastDownlinkAt;
          this.stats.maxDownlinkGapMs = Math.max(this.stats.maxDownlinkGapMs, gap);
          if (gap > (this.stream?.downlink.frameDurationMs || 60) * 1.5) this.stats.lateDownlinkGaps++;
        }
        this.lastDownlinkAt = Date.now();
        this.stats.downlinkFrames++;
        this.ws.sendBinary(packAudio(e.opus, this.binaryVersion));
        const buffer = this.ws.sendBufferState;
        this.stats.maxSendBufferBytes = Math.max(this.stats.maxSendBufferBytes, buffer.bytes);
        if (buffer.needDrain) this.stats.backpressureFrames++;
        break;
      case "tts_stop":
        this.lastDownlinkAt = 0;
        this.send({ type: "tts", state: "stop" });
        break;
      case "user_activity":
        this.touch();
        break;
      case "error":
        this.endWithAlert("语音服务出错，已结束本次通话", "provider_error");
        break;
    }
  }

  /** 空闲计时：有用户语音/控制时刷新；数据库里的 lastInputAt 限频刷新（与 App 语音页同一口径） */
  private touch(force = false) {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.endWithAlert("长时间没有听到你说话，先结束啦。", "idle_timeout"), this.idleMs);
    const now = Date.now();
    if (this.sessionId && (force || now - this.lastTouch > 10_000)) {
      this.lastTouch = now;
      this.deps.sessions.recordInput(this.auth.userId, this.sessionId).catch(() => undefined);
    }
  }

  /** 主动结束连接（替换、超时、错误） */
  shutdown(reason: string) {
    if (this.state === "closed" || this.state === "closing") return;
    this.state = "closing";
    try {
      this.ws.close(1000, reason);
    } catch {
      /* 已断开 */
    }
    void this.finish(reason);
  }

  /** 收尾（幂等）：关闭中继、按连接时长估算结束会话（Mock 会话在库里记为 mock，不计真实用量） */
  private async finish(reason: string) {
    if (this.finished) return;
    this.finished = true;
    this.state = "closed";
    for (const t of [this.helloTimer, this.idleTimer, this.limitTimer, this.warnTimer]) if (t) clearTimeout(t);
    if (this.talkingMarked) void this.deps.link?.markTalking(this.auth.deviceId, this.id, false);
    void this.deps.link?.stat(`end:${reason}`);
    try {
      this.stream?.close(reason);
    } catch {
      /* 忽略 */
    }
    if (this.sessionId) {
      const seconds = this.openedAt ? Math.round((Date.now() - this.openedAt) / 1000) : 0;
      const endReason = reason === "idle_timeout" ? "idle_timeout" : "user_hangup";
      try {
        await this.deps.sessions.end(this.auth.userId, this.sessionId, { reason: endReason as any, clientEstimatedSeconds: seconds });
      } catch (e: any) {
        this.deps.logger.warn(`小智终端会话收尾失败（清理任务会兜底）：${e?.message || e}`);
      }
    }
    this.deps.logger.log(
      `小智终端断开：设备 …${this.auth.serialHint} 原因 ${reason} 上行 ${this.stats.uplinkFrames} 帧 下行 ${this.stats.downlinkFrames} 帧 ${this.stats.utterances} 轮 下行间隔峰值 ${this.stats.maxDownlinkGapMs}ms 迟发 ${this.stats.lateDownlinkGaps} 次 发送缓冲峰值 ${this.stats.maxSendBufferBytes} 字节 背压帧 ${this.stats.backpressureFrames}`,
    );
    for (const cb of this.closedListeners) cb();
  }
}
