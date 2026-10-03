import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { tc3Sign, TencentCloudResponse } from "../../common/tc3.util";
import { resolveTencentCloudCredentials } from "../../common/tencent-instance-role-credentials";
import { LiveStreamService } from "./live-stream.service";
import {
  buildLiveTrtcTicket,
  toLiveObsTrtcUserId,
  toLiveTrtcRoomId,
  toLiveTrtcUserId,
} from "./live-trtc.util";

type LiveMixState = {
  taskId?: string;
  streamKey: string;
  sourceType?: "MOBILE" | "OBS";
  mainUserId?: string;
  status: "ACTIVE" | "FAILED";
  lastHeartbeatAt: string;
  retryAt?: string;
  requestId?: string;
  errorCode?: string;
};

type TrtcApiResponse = TencentCloudResponse & {
  Response?: {
    Error?: { Code: string; Message: string };
    TaskId?: string;
    RequestId?: string;
  };
};

/**
 * TRTC 多人连麦云端混流。
 *
 * 手机单主播、手机多嘉宾与 OBS 都进入同一 TRTC 房间，并由
 * 独立 room_{id}_mix 输出统一的 CDN 观众画面。普通观众按服务端
 * streamMode 切流；任何一路没有真实媒体或混流失败时回退原流，不黑屏等待。
 */
@Injectable()
export class LiveMixingService {
  private readonly logger = new Logger(LiveMixingService.name);
  private static readonly READY_TTL_SECONDS = 45;
  private static readonly STATE_TTL_SECONDS = 26 * 60 * 60;
  private static readonly RETRY_COOLDOWN_SECONDS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly stream: LiveStreamService,
  ) {}

  private enabled(): boolean {
    return /^(1|true|yes|on)$/i.test(String(process.env.LIVE_MULTI_GUEST_MIXING_ENABLED || ""));
  }

  private obsIngestEnabled(): boolean {
    return /^(1|true|yes|on)$/i.test(String(process.env.LIVE_OBS_TRTC_INGEST_ENABLED || ""));
  }

  private stateKey(roomId: string) {
    return `live:mix:${roomId}`;
  }

  private readyKey(roomId: string, userId: string) {
    return `live:mix-ready:${roomId}:${toLiveTrtcUserId(userId)}`;
  }

  private hostReadyKey(roomId: string, userId: string) {
    return `live:host-ready:${roomId}:${toLiveTrtcUserId(userId)}`;
  }

  private streamStatusKey(roomId: string) {
    return `live:stream-status:${roomId}`;
  }

  private async callApi(action: "StartPublishCdnStream" | "StopPublishCdnStream", payload: Record<string, unknown>) {
    const credentials = await resolveTencentCloudCredentials(
      process.env.TENCENT_SECRET_ID || "",
      process.env.TENCENT_SECRET_KEY || "",
    );
    const { host, headers, payloadStr } = tc3Sign({
      secretId: credentials.secretId,
      secretKey: credentials.secretKey,
      securityToken: credentials.securityToken,
      service: "trtc",
      action,
      version: "2019-07-22",
      payload,
      region: process.env.TRTC_MIXING_REGION || "ap-beijing",
    });
    const response = await fetch(`https://${host}`, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json() as TrtcApiResponse;
    if (!response.ok || data.Response?.Error) {
      const code = data.Response?.Error?.Code || `HTTP_${response.status}`;
      const message = data.Response?.Error?.Message || "腾讯云 TRTC 混流请求失败";
      const error = new Error(`${code}: ${message}`) as Error & { code?: string; requestId?: string };
      error.code = code;
      error.requestId = data.Response?.RequestId;
      throw error;
    }
    return data.Response || {};
  }

  private async activeReadyGuests(roomId: string) {
    const mics = await this.prisma.liveMic.findMany({
      where: { liveRoomId: roomId, status: { in: ["OCCUPIED", "MUTED"] } },
      select: { userId: true },
    });
    if (!mics.length) return [];
    const leases = await this.redis.mgetJson<string>(mics.map((mic) => this.readyKey(roomId, mic.userId)));
    return mics.filter((_mic, index) => leases[index] === "ready");
  }

  private async start(
    roomId: string,
    trtcRoomId: string,
    mainUserId: string,
    orientation: string,
    sourceType: "MOBILE" | "OBS",
  ): Promise<LiveMixState> {
    const ticket = buildLiveTrtcTicket(`live-mix-agent:${roomId}`, trtcRoomId, 42, 24 * 60 * 60);
    if (!ticket) throw new Error("TRTC_SDK_APP_ID 或 TRTC_SECRET_KEY 未配置");

    const streamKey = `room_${roomId}_mix`;
    const publishUrl = this.stream.genPushUrl(streamKey, 24 * 60 * 60);
    if (!publishUrl) throw new Error("直播推流域名或推流鉴权 Key 未配置");
    const portrait = orientation !== "landscape";
    const response = await this.callApi("StartPublishCdnStream", {
      SdkAppId: ticket.sdkAppId,
      RoomId: ticket.strRoomId,
      RoomIdType: 1,
      AgentParams: {
        UserId: ticket.userId,
        UserSig: ticket.userSig,
        MaxIdleTime: 60,
      },
      WithTranscoding: 1,
      AudioParams: {
        AudioEncode: { SampleRate: 48_000, Codec: 0, BitRate: 64, Channel: 2 },
      },
      VideoParams: {
        VideoEncode: portrait
          ? { Width: 720, Height: 1280, Fps: 15, BitRate: 1600, Gop: 2 }
          : { Width: 1280, Height: 720, Fps: 15, BitRate: 1800, Gop: 2 },
        LayoutParams: {
          MixLayoutMode: 1,
          PureAudioHoldPlaceMode: 0,
          RenderMode: 0,
          MaxVideoUser: {
            UserMediaStream: {
              StreamType: 0,
              UserInfo: {
                RoomId: ticket.strRoomId,
                RoomIdType: 1,
                UserId: mainUserId,
              },
            },
          },
        },
        BackGroundColor: "0x151316",
      },
      PublishCdnParams: [{ PublishCdnUrl: publishUrl, IsTencentCdn: 1 }],
    });
    if (!response.TaskId) throw new Error("腾讯云 TRTC 未返回混流 TaskId");
    return {
      taskId: response.TaskId,
      streamKey,
      sourceType,
      mainUserId,
      status: "ACTIVE",
      lastHeartbeatAt: new Date().toISOString(),
      requestId: response.RequestId,
    };
  }

  private async stopState(roomId: string, state: LiveMixState) {
    const sdkAppId = Number(process.env.TRTC_SDK_APP_ID || 0);
    if (state.taskId && Number.isSafeInteger(sdkAppId) && sdkAppId > 0) {
      await this.callApi("StopPublishCdnStream", { SdkAppId: sdkAppId, TaskId: state.taskId });
    }
    await this.redis.del(this.stateKey(roomId));
  }

  private async sync(roomId: string, options: { allowObsWaiting?: boolean; failHard?: boolean } = {}) {
    if (!this.enabled()) {
      void this.stopRoom(roomId).catch((error) => {
        this.logger.warn(`直播间 ${roomId} 混流开关关闭后的任务清理失败`, error);
      });
      return { active: false as const, streamMode: "ORIGIN" as const, reason: "DISABLED" };
    }
    const result = await this.redis.runExclusive(`live-mix:${roomId}`, 15, async () => {
      const [room, state, readyGuests] = await Promise.all([
        this.prisma.liveRoom.findUnique({
          where: { id: roomId },
          select: { status: true, hostUserId: true, orientation: true, trtcRoomId: true },
        }),
        this.redis.getJson<LiveMixState>(this.stateKey(roomId)),
        this.activeReadyGuests(roomId),
      ]);
      if (!room) {
        if (state?.taskId) await this.stopState(roomId, state);
        else if (state) await this.redis.del(this.stateKey(roomId));
        return { active: false as const, streamMode: "ORIGIN" as const };
      }
      const [hostLease, streamStatus] = await Promise.all([
        this.redis.getJson<string>(this.hostReadyKey(roomId, room.hostUserId)),
        this.redis.getJson<{ status?: string }>(this.streamStatusKey(roomId)),
      ]);
      const obsSource = room.orientation === "landscape" && this.obsIngestEnabled() && streamStatus?.status === "online";
      const roomIsActive = room.status === "LIVING" || (options.allowObsWaiting && room.status === "WAITING" && obsSource);
      const hostSource = hostLease === "ready";
      const sourceType = obsSource ? "OBS" as const : "MOBILE" as const;
      const mainUserId = obsSource ? toLiveObsTrtcUserId(roomId) : toLiveTrtcUserId(room.hostUserId);
      if (!roomIsActive || (!obsSource && !hostSource)) {
        if (state?.taskId) await this.stopState(roomId, state);
        else if (state) await this.redis.del(this.stateKey(roomId));
        return { active: false as const, streamMode: "ORIGIN" as const };
      }
      if (state?.status === "ACTIVE" && (state.mainUserId !== mainUserId || state.sourceType !== sourceType)) {
        await this.stopState(roomId, state);
      } else if (state?.status === "ACTIVE") {
        const next = { ...state, lastHeartbeatAt: new Date().toISOString() };
        await this.redis.setJson(this.stateKey(roomId), next, LiveMixingService.STATE_TTL_SECONDS);
        return { active: true as const, streamMode: "MIXED" as const, streamKey: state.streamKey };
      }
      if (state?.status === "FAILED" && state.retryAt && Date.parse(state.retryAt) > Date.now()) {
        return { active: false as const, streamMode: "ORIGIN" as const, reason: "START_COOLDOWN" };
      }
      try {
        const next = await this.start(
          roomId,
          room.trtcRoomId || toLiveTrtcRoomId(roomId),
          mainUserId,
          room.orientation,
          sourceType,
        );
        await this.redis.setJson(this.stateKey(roomId), next, LiveMixingService.STATE_TTL_SECONDS);
        this.logger.log(`直播间 ${roomId} 统一 CDN 输出已启动 source=${sourceType} guests=${readyGuests.length} requestId=${next.requestId || "-"}`);
        return { active: true as const, streamMode: "MIXED" as const, streamKey: next.streamKey };
      } catch (cause) {
        const error = cause as Error & { code?: string; requestId?: string };
        const failed: LiveMixState = {
          streamKey: `room_${roomId}_mix`,
          status: "FAILED",
          lastHeartbeatAt: new Date().toISOString(),
          retryAt: new Date(Date.now() + LiveMixingService.RETRY_COOLDOWN_SECONDS * 1000).toISOString(),
          requestId: error.requestId,
          errorCode: error.code || "UNKNOWN",
        };
        await this.redis.setJson(this.stateKey(roomId), failed, LiveMixingService.STATE_TTL_SECONDS);
        this.logger.error(`直播间 ${roomId} 多人混流启动失败 code=${error.code || "UNKNOWN"} requestId=${error.requestId || "-"}`);
        if (options.failHard) throw cause;
        return { active: false as const, streamMode: "ORIGIN" as const, reason: "START_FAILED" };
      }
    }, { critical: true });
    return result || { active: false as const, streamMode: "ORIGIN" as const, reason: "LOCK_BUSY" };
  }

  /** 嘉宾已完成原生 TRTC 进房；45 秒租约由客户端心跳续期。 */
  async markReady(roomId: string, userId: string) {
    const mic = await this.prisma.liveMic.findFirst({
      where: { liveRoomId: roomId, userId, status: { in: ["OCCUPIED", "MUTED"] } },
      select: { id: true },
    });
    if (!mic) return { active: false, streamMode: "ORIGIN" as const, reason: "MIC_NOT_ACTIVE" };
    await this.redis.setJson(this.readyKey(roomId, userId), "ready", LiveMixingService.READY_TTL_SECONDS);
    return this.sync(roomId);
  }

  /** 手机主播完成原生 TRTC 进房后续租；单主播也必须建立统一 CDN 输出。 */
  async markHostReady(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true, status: true },
    });
    if (!room || room.hostUserId !== userId || room.status !== "LIVING") {
      return { active: false, streamMode: "ORIGIN" as const, reason: "HOST_NOT_ACTIVE" };
    }
    await this.redis.setJson(this.hostReadyKey(roomId, userId), "ready", LiveMixingService.READY_TTL_SECONDS);
    return this.sync(roomId);
  }

  async markHostNotReady(roomId: string, userId: string) {
    await this.redis.del(this.hostReadyKey(roomId, userId));
    return this.sync(roomId);
  }

  /** OBS 媒体已真实进入 TRTC 后，在公开 LIVING 前先建立 CDN 输出，失败则阻断开播。 */
  async prepareObs(roomId: string) {
    if (!this.enabled() || !this.obsIngestEnabled()) {
      throw new Error("OBS TRTC 进房或统一 CDN 输出开关未启用");
    }
    const result = await this.sync(roomId, { allowObsWaiting: true, failHard: true });
    if (!result.active) throw new Error(`OBS CDN 输出未就绪: ${result.reason || "UNKNOWN"}`);
    return result;
  }

  async syncRoom(roomId: string) {
    return this.sync(roomId);
  }

  async markNotReady(roomId: string, userId: string) {
    await this.redis.del(this.readyKey(roomId, userId));
    return this.sync(roomId);
  }

  async playback(roomId: string, originStreamKey: string) {
    if (!this.enabled()) {
      void this.stopRoom(roomId).catch((error) => {
        this.logger.warn(`直播间 ${roomId} 混流开关关闭后的任务清理失败`, error);
      });
      return { streamKey: originStreamKey, streamMode: "ORIGIN" as const };
    }
    const state = await this.redis.getJson<LiveMixState>(this.stateKey(roomId));
    if (!state || state.status !== "ACTIVE") return { streamKey: originStreamKey, streamMode: "ORIGIN" as const };
    const heartbeatAge = Date.now() - Date.parse(state.lastHeartbeatAt);
    if (state.sourceType !== "OBS" && (!Number.isFinite(heartbeatAge) || heartbeatAge > LiveMixingService.READY_TTL_SECONDS * 1000)) {
      void this.sync(roomId).catch((error) => this.logger.warn(`清理直播间 ${roomId} 过期混流失败`, error));
      return { streamKey: originStreamKey, streamMode: "ORIGIN" as const };
    }
    return { streamKey: state.streamKey, streamMode: "MIXED" as const };
  }

  async stopRoom(roomId: string) {
    try {
      await this.redis.runExclusive(`live-mix:${roomId}`, 15, async () => {
        const state = await this.redis.getJson<LiveMixState>(this.stateKey(roomId));
        if (!state) return;
        if (state.taskId) await this.stopState(roomId, state);
        else await this.redis.del(this.stateKey(roomId));
      }, { critical: true });
    } catch (cause) {
      const error = cause as Error & { code?: string; requestId?: string };
      this.logger.error(`直播间 ${roomId} 混流停止失败 code=${error.code || "UNKNOWN"} requestId=${error.requestId || "-"}`);
      throw cause;
    }
  }
}
