import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Cacheable } from "../../common/cache.decorator";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { LiveStreamService } from "./live-stream.service";
import { createHash, randomUUID } from "crypto";
import { WebhookService } from "../webhook/webhook.service";
import { CreateRoomDto, UpdateRoomDto, UpdateLiveWatchProgressDto } from "./live.dto";
import { Prisma, LiveStatus } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";
import { AuditService } from "../audit/audit.service";
import { NotificationService } from "../notification/notification.service";
import { ImService } from "../im/im.service";
import { safePagination } from "../../common/pagination";
import { publicQuarantinedIds } from "../../common/public-content-quarantine";
import { CirclePublishGrantService } from "../circle/circle-publish-grant.service";
import {
  buildLiveObsRtmpPushUrl,
  buildLiveTrtcTicket,
  toLiveObsTrtcUserId,
  toLiveTrtcRoomId,
  toLiveTrtcUserId,
} from "./live-trtc.util";
import { LivePresenceService } from "./live-presence.service";
import { LiveMixingService } from "./live-mixing.service";

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);
  private static readonly STREAM_STATUS_TTL_SECONDS = 48 * 60 * 60;
  private static readonly LIVE_SETTINGS_TTL_SECONDS = 26 * 60 * 60;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private stream: LiveStreamService,
    private webhook: WebhookService,
    private audit: AuditService,
    private publishGrants: CirclePublishGrantService,
    @Optional() private coin?: CoinService,
    @Optional() private revenue?: RevenueService,
    @Optional() private notification?: NotificationService,
    @Optional() private im?: ImService,
    @Optional() private presence?: LivePresenceService,
    @Optional() private mixing?: LiveMixingService,
  ) {}

  /** 公开预告发布护栏：排期开播的场次必须同时具备首图和介绍。 */
  private validatePreviewPublish(startTime?: string | Date | null, cover?: string | null, description?: string | null) {
    if (!startTime) return;
    if (!String(cover || "").trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "发布直播预告前请上传首图");
    }
    if (!String(description || "").trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "发布直播预告前请填写直播介绍");
    }
  }

  /** 直播挂车统一校验：最多 5 件、保持请求顺序、只允许当前在售且未隔离商品。 */
  private async validateLiveProductIds(productIds: string[]): Promise<string[]> {
    if (!Array.isArray(productIds)) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品清单格式错误");
    const normalized = productIds.map((id) => String(id || "").trim());
    if (normalized.some((id) => !id)) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品ID不能为空");
    if (normalized.length > 5) throw new BusinessException(ErrorCode.BAD_REQUEST, "每场直播最多挂载 5 件商品");
    if (new Set(normalized).size !== normalized.length) throw new BusinessException(ErrorCode.BAD_REQUEST, "商品清单不能包含重复商品");
    if (!normalized.length) return [];

    const available = await this.prisma.product.findMany({
      where: {
        id: { in: normalized, notIn: [...publicQuarantinedIds("product")] },
        status: "ON_SALE",
      },
      select: { id: true },
    });
    if (available.length !== normalized.length) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "部分商品已下架或不存在，请刷新商品库后重试");
    }
    return normalized;
  }

  private async replaceLiveProducts(tx: Prisma.TransactionClient, roomId: string, productIds: string[]) {
    await tx.liveProduct.deleteMany({ where: { liveId: roomId } });
    if (productIds.length) {
      await tx.liveProduct.createMany({ data: productIds.map((productId, sortOrder) => ({ liveId: roomId, productId, sortOrder })) });
    }
  }

  async createRoom(userId: string, dto: CreateRoomDto, isAdmin = false) {
    this.validatePreviewPublish(dto.startTime, dto.cover, dto.description);
    const requestedVisibility = dto.visibility || "CIRCLE_ONLY";
    if (requestedVisibility === "CIRCLE_ONLY" && !dto.circleId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "仅圈子可见的直播必须选择所属圈子");
    }
    if (dto.circleId && !isAdmin) {
      const manager = await this.prisma.circleMember.findFirst({
        where: { circleId: dto.circleId, userId, role: { in: ["OWNER", "ADMIN", "PARTNER"] } },
        select: { id: true },
      });
      if (!manager) throw new BusinessException(ErrorCode.FORBIDDEN, "只有圈主或圈子管理员可以在该圈发起直播");
    }
    if (requestedVisibility === "PLATFORM") {
      await this.publishGrants.assertCanPublish(userId, dto.circleId, "LIVE", isAdmin);
    }
    let parsedStartTime: Date | undefined;
    if (dto.startTime) {
      parsedStartTime = new Date(dto.startTime);
      if (Number.isNaN(parsedStartTime.getTime())) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "开播时间格式错误");
      }
    }
    const productIds = dto.productIds ? await this.validateLiveProductIds(dto.productIds) : [];
    const chargeType = dto.chargeType || "FREE";
    const requestedChargePrice = Number(dto.chargePrice);
    const chargePrice = chargeType === "PAID" ? requestedChargePrice : null;
    if (chargeType === "PAID" && (!Number.isFinite(requestedChargePrice) || requestedChargePrice <= 0)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "付费直播必须设置大于 0 元的票价");
    }
    // 审核无感化（20260711 第八节）：创建即生效，封面/标题机审改异步分级处置（直播实时内容仍走 LiveAuditLog 机审）
    const { visibility, auditStatus } = await this.audit.resolveContentVisibility({
      visibility: requestedVisibility,
      circleId: dto.circleId,
      isAdmin,
      instantPublish: true,
    });

    const data: Record<string, unknown> = {
      userId,
      title: dto.title,
      description: dto.description?.trim() || null,
      cover: dto.cover,
      circleId: dto.circleId,
      hostUserId: dto.hostUserId || userId,
      hostType: dto.circleId ? "CIRCLE_OWNER" : "STATION_MASTER",
      coHostIds: dto.coHostIds || [],
      quality: dto.quality || "basic",
      orientation: dto.orientation || "portrait",
      chargeType,
      chargePrice,
      status: "WAITING",
      visibility,
      auditStatus,
      replayVisibility: dto.replayVisibility || "CIRCLE_ONLY",
      replayCharge: dto.replayCharge ?? false,
      ...(parsedStartTime ? { startTime: parsedStartTime } : {}),
      ...(dto.courseId ? { courseId: dto.courseId } : {}),
      ...(dto.stationId ? { stationId: dto.stationId } : {}),
      ...(productIds.length ? { products: { create: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) } } : {}),
    };

    const room = await this.prisma.liveRoom.create({ data: data as Prisma.LiveRoomCreateInput, include: { products: true } });

    if (auditStatus === "PENDING") {
      await this.audit.openContentAudit({ contentType: "LIVE", contentId: room.id, circleId: dto.circleId, submitterId: userId });
    }

    // 异步机审（fire-and-forget·不阻塞创建响应）：标题文本 / 封面图
    this.audit.queueContentModeration({
      contentType: "LIVE",
      contentId: room.id,
      userId,
      circleId: dto.circleId,
      text: [dto.title, dto.description].filter(Boolean).join("\n"),
      images: dto.cover,
    });

    return room;
  }

  /** 编辑待开播场次；标题/封面沿用历史可编辑口径，排期/收费/画质仅 WAITING 可改。 */
  async updateRoom(userId: string, id: string, dto: UpdateRoomDto, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      select: {
        hostUserId: true,
        status: true,
        circleId: true,
        chargeType: true,
        chargePrice: true,
        startTime: true,
        cover: true,
        description: true,
      },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    // 平台管理员豁免归属校验（管理端编辑任意直播间）；普通用户仍只能改自己的
    if (!isAdmin && room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能修改自己的直播间");

    const changesWaitingConfig = dto.startTime !== undefined || dto.chargeType !== undefined || dto.chargePrice !== undefined
      || dto.quality !== undefined || dto.orientation !== undefined;
    if (changesWaitingConfig && room.status !== "WAITING") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播开始后不能修改排期、收费或画质");
    }

    const data: Prisma.LiveRoomUncheckedUpdateInput = {};
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BusinessException(ErrorCode.BAD_REQUEST, "直播标题不能为空");
      data.title = title;
    }
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.cover !== undefined) data.cover = dto.cover;
    if (dto.startTime !== undefined) {
      if (dto.startTime === null || dto.startTime === "") data.startTime = null;
      else {
        const parsed = new Date(dto.startTime);
        if (Number.isNaN(parsed.getTime())) throw new BusinessException(ErrorCode.BAD_REQUEST, "开播时间格式错误");
        data.startTime = parsed;
      }
    }
    const targetStartTime = dto.startTime === undefined ? room.startTime : dto.startTime;
    const targetCover = dto.cover === undefined ? room.cover : dto.cover;
    const targetDescription = dto.description === undefined ? room.description : dto.description;
    this.validatePreviewPublish(targetStartTime, targetCover, targetDescription);
    if (dto.chargeType !== undefined || dto.chargePrice !== undefined) {
      const targetType = dto.chargeType ?? room.chargeType;
      const targetPrice = dto.chargePrice !== undefined ? Number(dto.chargePrice) : Number(room.chargePrice);
      if (targetType === "PAID" && (!Number.isFinite(targetPrice) || targetPrice <= 0)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "付费直播必须设置大于 0 元的票价");
      }
      if (dto.chargeType !== undefined) data.chargeType = dto.chargeType;
      data.chargePrice = targetType === "PAID" ? targetPrice : null;
    }
    if (dto.quality !== undefined) data.quality = dto.quality;
    if (dto.orientation !== undefined) data.orientation = dto.orientation;

    const productIds = dto.productIds === undefined ? undefined : await this.validateLiveProductIds(dto.productIds);
    const updated = productIds === undefined
      ? await this.prisma.liveRoom.update({ where: { id }, data })
      : await this.prisma.$transaction(async (tx) => {
          const row = await tx.liveRoom.update({ where: { id }, data });
          await this.replaceLiveProducts(tx, id, productIds);
          return { ...row, products: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) };
        });

    // 编辑同样进入异步机审，避免“先发合规标题、再编辑绕审”；审核故障不阻断主播保存。
    if (dto.title !== undefined || dto.description !== undefined || dto.cover !== undefined) {
      this.audit.queueContentModeration({
        contentType: "LIVE",
        contentId: id,
        userId,
        circleId: room.circleId || undefined,
        text: [dto.title, dto.description].filter(Boolean).join("\n") || undefined,
        images: dto.cover,
      });
    }
    return updated;
  }

  /** 主播在开播前或直播中维护商品挂车；事务全量替换，排序与请求数组一致。 */
  async updateRoomProducts(userId: string, roomId: string, productIds: string[], isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (!isAdmin && room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能管理自己的直播间商品");

    const normalized = await this.validateLiveProductIds(productIds);
    await this.prisma.$transaction(async (tx) => this.replaceLiveProducts(tx, roomId, normalized));
    return { success: true, count: normalized.length, productIds: normalized };
  }

  /** 同一个幂等键只能描述同一用户、房间、礼物与数量，防止键复用篡改单据。 */
  private assertGiftIdempotencyMatch(
    record: { userId: string; liveRoomId: string; giftId: string; quantity: number },
    expected: { userId: string; liveRoomId: string; giftId: string; quantity: number },
  ) {
    if (
      record.userId !== expected.userId ||
      record.liveRoomId !== expected.liveRoomId ||
      record.giftId !== expected.giftId ||
      record.quantity !== expected.quantity
    ) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "送礼幂等键已被其他请求使用");
    }
  }

  /** 主播明确选择当前讲解商品；null 表示停止讲解，观众端不再猜测“第一件商品”。 */
  async featureRoomProduct(userId: string, roomId: string, productId?: string | null, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true, status: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (!isAdmin && room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能管理自己的直播间商品");
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "只能在直播中设置讲解商品");

    const normalized = String(productId || "").trim();
    if (!normalized) {
      await this.redis.del(this.featuredProductKey(roomId));
      return { featuredProductId: null };
    }
    const relation = await this.prisma.liveProduct.findFirst({
      where: { liveId: roomId, productId: normalized },
      select: { productId: true },
    });
    if (!relation) throw new BusinessException(ErrorCode.BAD_REQUEST, "该商品不在本场直播商品清单中");
    await this.redis.set(this.featuredProductKey(roomId), normalized, LiveService.STREAM_STATUS_TTL_SECONDS);
    return { featuredProductId: normalized };
  }

  private static readonly STATE_MACHINE: Record<string, string[]> = {
    WAITING: ["LIVING", "CANCELLED"],
    LIVING: ["REPLAY", "ENDED"],
    REPLAY: ["ENDED"],
  };

  async updateStatus(id: string, status: string, extra?: { pushUrl?: string; pullUrl?: string; trtcRoomId?: string; replayUrl?: string }) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id }, select: { status: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);

    const allowed = LiveService.STATE_MACHINE[room.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不允许从 ${room.status} 变更为 ${status}`);
    }
    const data: Record<string, unknown> = { status: status as LiveStatus };
    if (status === "LIVING") {
      data.startTime = new Date();
      if (extra?.pushUrl) data.pushUrl = extra.pushUrl;
      if (extra?.pullUrl) data.pullUrl = extra.pullUrl;
      if (extra?.trtcRoomId) data.trtcRoomId = extra.trtcRoomId;
    }
    if (status === "REPLAY" && extra?.replayUrl) data.replayUrl = extra.replayUrl;
    if (status === "ENDED") data.endTime = new Date();

    const updated = await this.prisma.liveRoom.update({ where: { id }, data: data as Prisma.LiveRoomUpdateInput });

    // 开播 → 通知预约用户（圈内通知中心·直播 LIVE·fire-and-forget 不阻断开播）
    // TODO(#25 通知部分·后续)：开播前 15 分钟提醒需定时任务扫描预约集合，本轮只做开播即时通知。
    if (status === "LIVING") {
      this.notifyBookedUsers(updated).catch((err) => this.logger.warn(`开播预约通知发送失败 room=${id}`, err));
    }

    // 直播回放画面+音频机审（先发后审·VM 异步轮询·四档处置）：回放是可下载录像，VM 适用。
    // 命中 severe → 回放下架 + 通知（applyModerationVerdict 对 LIVE 走 auditStatus=REJECTED）。
    // 注：LIVING 实时流审核需腾讯云「直播流审核」独立能力（Type=LIVE_VIDEO/推流回调），非本次录像任务制覆盖，后续接入。
    if (status === "REPLAY" && extra?.replayUrl) {
      this.audit.queueContentModeration({
        contentType: "LIVE",
        contentId: id,
        userId: updated.userId,
        circleId: updated.circleId,
        video: extra.replayUrl,
      });
    }

    return updated;
  }

  /** 开播时通知 Redis 预约集合中的用户（live:bookings:{roomId}·bookRoom 写入） */
  private async notifyBookedUsers(room: { id: string; title: string | null; circleId: string | null }) {
    if (!this.notification) return;
    const userIds = await this.redis.smembers(`live:bookings:${room.id}`);
    if (!userIds?.length) return;
    await this.notification.batchSend({
      userIds,
      type: "LIVE_STARTED",
      title: "你预约的直播已开播",
      content: `直播「${room.title || "直播间"}」已开播，点击进入直播间观看`,
      targetType: "LIVE_ROOM",
      targetId: room.id,
      category: "LIVE",
      circleId: room.circleId ?? undefined,
    });
  }

  private obsTrtcIngestEnabled(): boolean {
    return /^(1|true|yes|on)$/i.test(String(process.env.LIVE_OBS_TRTC_INGEST_ENABLED || ""));
  }

  private trtcRoomMapKey(trtcRoomId: string) {
    return `live:trtc-room-map:${trtcRoomId}`;
  }

  private async registerTrtcRoomMap(roomId: string, trtcRoomId: string) {
    await this.redis.set(this.trtcRoomMapKey(trtcRoomId), roomId, LiveService.STREAM_STATUS_TTL_SECONDS);
  }

  /** 开始直播（房主本人或管理员），自动生成推拉流地址 + 创建 IM 弹幕群（fail-open） */
  async startLive(id: string, operatorId?: string, isAdmin = false, options: { obsPreflight?: boolean } = {}) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (operatorId && room.hostUserId !== operatorId && !isAdmin) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以开播");
    }
    if (room.auditStatus === "REJECTED") throw new BusinessException(ErrorCode.FORBIDDEN, "该直播间已被下架，无法开播");
    if (room.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "只能在等待状态开始直播");
    if (!this.stream.isReady()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播推拉流配置不完整，请联系平台管理员后重试");
    }

    const useObsTrtc = room.orientation === "landscape" && this.obsTrtcIngestEnabled();
    if (useObsTrtc && !options.obsPreflight) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "OBS 直播必须先通过专用页面检测到真实媒体流");
    }

    const streamKey = `room_${id}`;
    const obsPush = useObsTrtc ? buildLiveObsRtmpPushUrl(id) : null;
    if (useObsTrtc && !obsPush) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "TRTC OBS 推流签发配置不完整");
    }
    const trtcRoomId = obsPush?.trtcRoomId || room.trtcRoomId || toLiveTrtcRoomId(id);
    const pushUrl = obsPush?.pushUrl || this.stream.genPushUrl(streamKey);
    const playUrls = this.stream.genPlayUrls(streamKey);
    await this.registerTrtcRoomMap(id, trtcRoomId);

    const result = await this.updateStatus(id, "LIVING", {
      pushUrl,
      pullUrl: JSON.stringify(playUrls),
      trtcRoomId,
    });
    await this.presence?.clearActive(id);

    // IM 弹幕群：开播时才建（WAITING 房可能永不开播·不浪费群资源）。
    // fail-open：IM 未配置/建群失败只记 warn，不阻断开播（前端有 if(imGroupId) 守卫自动降级为轮询弹幕）。
    const imGroupId = await this.createLiveImGroup(id, room.title, room.hostUserId);

    await this.webhook.fire("LIVE_STARTED", {
      roomId: id,
      title: room.title,
      hostUserId: room.hostUserId,
      circleId: room.circleId,
    }).catch((e: unknown) => this.logger.warn("LIVE_STARTED webhook 发送失败", e instanceof Error ? e.message : String(e)));

    return imGroupId ? { ...result, imGroupId } : result;
  }

  /**
   * 创建直播弹幕群（腾讯 IM AVChatRoom 直播大群）并回写 LiveRoom.imGroupId。
   * fail-open：任何失败（含 IM 未配置）只记 warn 返回 null，绝不阻断开播。
   */
  private async createLiveImGroup(roomId: string, title?: string | null, hostUserId?: string): Promise<string | null> {
    if (!this.im) return null;
    try {
      const groupId = `live_${roomId}`;
      // 群名限 30 字节（UTF-8 中文 3 字节/字），截断防超限
      const name = (title || "直播间").slice(0, 9);
      await this.im.createGroup(groupId, name, "AVChatRoom", hostUserId);
      await this.prisma.liveRoom.update({ where: { id: roomId }, data: { imGroupId: groupId } });
      return groupId;
    } catch (e: unknown) {
      this.logger.warn(
        `IM 弹幕群创建失败（fail-open·开播不受影响） room=${roomId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  /** 获取指定房间的推/拉流地址（主播或管理员用） */
  async getStreamUrls(id: string, userId?: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      select: { id: true, hostUserId: true, status: true, pushUrl: true, orientation: true, trtcRoomId: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (userId && room.hostUserId !== userId && !isAdmin) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播可获取推流地址");

    const streamKey = `room_${id}`;
    if (room.orientation === "landscape" && this.obsTrtcIngestEnabled()) {
      const obsPush = buildLiveObsRtmpPushUrl(id);
      if (!obsPush) throw new BusinessException(ErrorCode.BAD_REQUEST, "TRTC OBS 推流签发配置不完整");
      await this.registerTrtcRoomMap(id, obsPush.trtcRoomId);
      const serverUrl = "rtmp://rtmp.rtc.qq.com/push/";
      return {
        pushUrl: obsPush.pushUrl,
        serverUrl,
        streamKey: obsPush.pushUrl.slice(serverUrl.length),
        playUrls: this.stream.genPlayUrls(`${streamKey}_mix`),
        ingestMode: "TRTC_RTMP" as const,
        expiresAt: obsPush.expiresAt,
      };
    }
    return {
      pushUrl: room.status === "LIVING" ? room.pushUrl : this.stream.genPushUrl(streamKey),
      playUrls: this.stream.genPlayUrls(streamKey),
      ingestMode: "CSS_RTMP" as const,
    };
  }

  /**
   * OBS 推流连接态。房间进入 LIVING 与上游确实收到媒体流是两件事，
   * 这里以通过 TencentCallbackGuard 验签的推/断流回调为唯一事实来源。
   */
  async getStreamStatus(id: string, userId?: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      select: { id: true, hostUserId: true, status: true, orientation: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (userId && room.hostUserId !== userId && !isAdmin) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播可查看推流状态");
    }

    const runtime = await this.redis.getJson<{
      status?: "online" | "offline";
      connectedAt?: string | null;
      disconnectedAt?: string | null;
      lastEventAt?: string | null;
      reason?: string | null;
      metrics?: Record<string, number | string>;
    }>(this.streamStatusKey(id));
    const connectedAt = runtime?.connectedAt || null;
    const durationSeconds = runtime?.status === "online" && connectedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(connectedAt).getTime()) / 1000))
      : 0;

    return {
      roomId: id,
      roomStatus: room.status,
      orientation: room.orientation,
      status: runtime?.status === "online" ? "online" : "offline",
      connectedAt,
      disconnectedAt: runtime?.disconnectedAt || null,
      lastEventAt: runtime?.lastEventAt || null,
      durationSeconds,
      reason: runtime?.reason || null,
      metrics: runtime?.metrics || {},
    };
  }

  /** OBS 专用开播：必须先收到真实推流回调，避免无画面房间进入公共直播池。 */
  async startObsLive(id: string, operatorId?: string, isAdmin = false) {
    const status = await this.getStreamStatus(id, operatorId, isAdmin);
    if (status.status !== "online") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "尚未检测到 OBS 推流，请先在 OBS 中点击开始推流");
    }
    if (!this.obsTrtcIngestEnabled()) return this.startLive(id, operatorId, isAdmin);
    if (status.orientation !== "landscape") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该直播间不是 OBS 电脑直播形态");
    }
    if (!this.mixing) throw new BusinessException(ErrorCode.BAD_REQUEST, "OBS 云端输出服务不可用");

    await this.mixing.prepareObs(id).catch((cause: unknown) => {
      this.logger.error(`OBS 直播间 ${id} 开播前 CDN 输出建立失败`, cause instanceof Error ? cause.message : String(cause));
      throw new BusinessException(ErrorCode.BAD_REQUEST, "OBS 画面已进入 TRTC，但 CDN 输出尚未建立，请稍后重试");
    });
    try {
      return await this.startLive(id, operatorId, isAdmin, { obsPreflight: true });
    } catch (cause) {
      await this.mixing.stopRoom(id).catch(() => undefined);
      throw cause;
    }
  }

  /** 获取观众拉流地址（可带鉴权） */
  async getPlayUrl(id: string, userId?: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
    await this.assertRoomVisibilityAccess(room, userId);

    // 分档播放：basic=原流(零转码成本)；hd/uhd=腾讯云转码流(推流后自动产出 {stream}_{模板名})
    // 转码模板已在生产创建并绑定 test.rebugx.com/live：hd720 / hd1080
    const baseKey = `room_${id}`;
    const quality = (room as { quality?: string }).quality || "basic";
    const streamKey =
      quality === "hd" ? `${baseKey}_hd720` : quality === "uhd" ? `${baseKey}_hd1080` : baseKey;
    const playback = this.mixing
      ? await this.mixing.playback(id, streamKey)
      : { streamKey, streamMode: "ORIGIN" as const };
    return {
      ...this.stream.genPlayUrlWithAuth(playback.streamKey, userId || "guest"),
      // 独立混流统一编码为 720p；不能继续向客户端宣称原房间的 basic/uhd 档位。
      quality: playback.streamMode === "MIXED" ? "hd" : quality,
      streamMode: playback.streamMode,
    };
  }

  /** 结束直播（房主本人或管理员） */
  async endRoom(id: string, operatorId?: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    if (operatorId) {
      if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
      if (room.hostUserId !== operatorId && !isAdmin) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以结束直播");
      }
    }
    const result = await this.updateStatus(id, "ENDED");
    // 下播后立即撤销所有连麦授权，避免旧票据在房间结束后继续占用麦克风。
    await this.prisma.liveMic.deleteMany({ where: { liveRoomId: id } });
    await this.mixing?.stopRoom(id).catch((e: unknown) =>
      this.logger.error(`直播间 ${id} 下播时停止混流失败`, e instanceof Error ? e.message : String(e)),
    );
    await this.presence?.clearActive(id);
    await this.redis.del(this.featuredProductKey(id));
    await this.redis.del(this.moderationSettingsKey(id));
    const previous = await this.redis.getJson<Record<string, unknown>>(this.streamStatusKey(id));
    if (previous?.status === "online") {
      const now = new Date().toISOString();
      await this.redis.setJson(this.streamStatusKey(id), {
        ...previous,
        status: "offline",
        disconnectedAt: now,
        lastEventAt: now,
        reason: "room_ended",
      }, LiveService.STREAM_STATUS_TTL_SECONDS);
    }

    await this.webhook.fire("LIVE_ENDED", {
      roomId: id,
      title: room?.title,
    }).catch((e: unknown) => this.logger.warn("LIVE_ENDED webhook 发送失败", e instanceof Error ? e.message : String(e)));

    return result;
  }

  @Cacheable({ key: (args: any[]) => `live:rooms:${args[0] || "all"}:${args[1]}:${args[2]}:${args[3] || ""}:${args[4] || ""}:${args[5] || ""}:${args[6] === null ? "anon" : args[6] || ""}`, ttl: 15 })
  async listRooms(status?: string, rawPage = 1, rawPageSize = 20, circleId?: string, stationId?: string, scope?: string, followedByUserId?: string | null) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.LiveRoomWhereInput = {};
    if (followedByUserId === null) {
      return { rooms: [], total: 0, page, pageSize };
    }
    if (status) where.status = status as LiveStatus;
    if (circleId) where.circleId = circleId;
    if (stationId) where.stationId = stationId;
    // 平台公共池（直播广场·未按圈子过滤·非管理端 scope=all）：只出「全平台开放+审核通过」——绝不展示他圈封闭直播
    if (!circleId && scope !== "all") {
      where.visibility = "PLATFORM";
      where.auditStatus = "APPROVED";
      if (status === "WAITING") {
        where.cover = { not: "" };
        where.description = { not: "" };
      } else if (!status) {
        where.AND = [{
          OR: [
            { status: { not: "WAITING" as LiveStatus } },
            { cover: { not: "" }, description: { not: "" } },
          ],
        }];
      }
    } else if (circleId && scope !== "all") {
      // 圈内列表：机审降级 SELF_ONLY / 严重违规下架(REJECTED) 的直播间不出圈内流
      where.visibility = { not: "SELF_ONLY" };
      where.auditStatus = { not: "REJECTED" };
    }

    if (followedByUserId) {
      const follows = await this.prisma.follow.findMany({
        where: { userId: followedByUserId },
        select: { followedUserId: true },
      });
      const hostIds = follows.map((item) => item.followedUserId);
      if (!hostIds.length) return { rooms: [], total: 0, page, pageSize };
      where.hostUserId = { in: hostIds };
    }

    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.liveRoom.count({ where }),
    ]);

    const roomsWithPresence = await Promise.all(rooms.map(async (room) => ({
      ...room,
      onlineCount: room.status === "LIVING" && this.presence
        ? await this.presence.getOnlineCount(room.id)
        : 0,
      bookingCount: room.status === "WAITING"
        ? await this.redis.scard(`live:bookings:${room.id}`)
        : 0,
    })));

    return { rooms: roomsWithPresence, total, page, pageSize };
  }

  /**
   * 主播端「我的直播」聚合 — 当前用户作为主播（hostUserId）的全部直播间 + 经营概览。
   * 概览均为真实聚合：无运行时数据时自然为 0，不造假数据。
   */
  async getMyRooms(userId: string) {
    const rooms = await this.prisma.liveRoom.findMany({
      where: { hostUserId: userId },
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      stats: {
        monthCount: rooms.filter((r) => r.createdAt >= monthStart).length,
        totalViews: rooms.reduce((sum, r) => sum + (r.viewCount || 0), 0),
        endedCount: rooms.filter((r) => r.status === "ENDED" || r.status === "REPLAY").length,
        totalCount: rooms.length,
      },
      rooms: rooms.map((r) => ({
        id: r.id,
        title: r.title,
        cover: r.cover,
        status: r.status,
        viewCount: r.viewCount,
        hasProducts: r._count.products > 0,
        productCount: r._count.products,
        chargeType: r.chargeType,
        orientation: r.orientation,
        quality: r.quality,
        replayUrl: r.replayUrl,
        startTime: r.startTime,
        endTime: r.endTime,
        createdAt: r.createdAt,
        // 审核无感化：selfOnly=机审降级仅自己可见（灰色小标）；removed=严重违规已下架
        selfOnly: r.visibility === "SELF_ONLY",
        removed: r.auditStatus === "REJECTED",
      })),
    };
  }

  /**
   * 主播端收益聚合 — 按周期统计「带货」(LIVESTREAM 订单) 与「打赏」(GiftRecord 金币折现) 收益。
   * 数据均来自当前主播名下直播间的真实订单/打赏；金币按 10:1 折算为元。
   */
  async getEarnings(userId: string, range = "7d") {
    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    const now = Date.now();
    const since = new Date(now - days * 86400000);
    const prevSince = new Date(now - 2 * days * 86400000);
    const COIN_TO_YUAN = 0.1;
    const ranges = [
      { key: "7d", label: "近7天" },
      { key: "30d", label: "近30天" },
      { key: "90d", label: "近90天" },
    ];

    const rooms = await this.prisma.liveRoom.findMany({
      where: { hostUserId: userId },
      select: { id: true, title: true },
    });
    const roomIds = rooms.map((r) => r.id);
    const roomTitle = new Map(rooms.map((r) => [r.id, r.title]));

    if (!roomIds.length) {
      return { ranges, stats: { total: 0, reward: 0, goods: 0, trend: 0 }, records: [] };
    }

    const [orders, prevOrderAgg, gifts, prevGiftAgg] = await Promise.all([
      this.prisma.order.findMany({
        where: { type: "LIVESTREAM", targetId: { in: roomIds }, status: { in: ["PAID", "COMPLETED"] }, paidAt: { gte: since } },
        orderBy: { paidAt: "desc" }, take: 50,
      }),
      this.prisma.order.aggregate({
        where: { type: "LIVESTREAM", targetId: { in: roomIds }, status: { in: ["PAID", "COMPLETED"] }, paidAt: { gte: prevSince, lt: since } },
        _sum: { amount: true },
      }),
      this.prisma.giftRecord.findMany({
        where: { liveRoomId: { in: roomIds }, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" }, take: 50,
      }),
      this.prisma.giftRecord.aggregate({
        where: { liveRoomId: { in: roomIds }, createdAt: { gte: prevSince, lt: since } },
        _sum: { totalCoin: true },
      }),
    ]);

    const goods = orders.reduce((s, o) => s + Number(o.amount), 0);
    const reward = Math.round(gifts.reduce((s, g) => s + g.totalCoin, 0) * COIN_TO_YUAN);
    const total = goods + reward;

    const prevGoods = Number(prevOrderAgg._sum.amount || 0);
    const prevReward = Math.round(Number(prevGiftAgg._sum.totalCoin || 0) * COIN_TO_YUAN);
    const prevTotal = prevGoods + prevReward;
    const trend = prevTotal > 0 ? Number((((total - prevTotal) / prevTotal) * 100).toFixed(1)) : total > 0 ? 100 : 0;

    const giftUserIds = [...new Set(gifts.map((g) => g.userId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: giftUserIds } }, select: { id: true, nickname: true } });
    const nick = new Map(users.map((u) => [u.id, u.nickname]));
    const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const records = [
      ...orders.map((o) => ({
        _ts: (o.paidAt || o.createdAt).getTime(),
        id: o.id, date: fmtDate(o.paidAt || o.createdAt), type: "goods" as const,
        desc: `带货成交 · ${roomTitle.get(o.targetId) || "直播间"}`,
        amount: Number(o.amount), live: roomTitle.get(o.targetId) || "",
      })),
      ...gifts.map((g) => ({
        _ts: g.createdAt.getTime(),
        id: g.id, date: fmtDate(g.createdAt), type: "reward" as const,
        desc: `${nick.get(g.userId) || "观众"} 的打赏`,
        amount: Math.round(g.totalCoin * COIN_TO_YUAN), live: roomTitle.get(g.liveRoomId) || "",
      })),
    ].sort((a, b) => b._ts - a._ts).slice(0, 30).map(({ _ts, ...r }) => r);

    return { ranges, stats: { total, reward, goods, trend }, records };
  }

  /** 主播带货商品库 — 平台在售商品供主播选入直播间带货（filter: all/on/off） */
  async getLiveProducts(filter?: string) {
    const where: Prisma.ProductWhereInput = { id: { notIn: publicQuarantinedIds("product") } };
    if (filter === "on") where.status = "ON_SALE";
    else if (filter === "off") where.status = { not: "ON_SALE" };
    const products = await this.prisma.product.findMany({
      where,
      orderBy: { salesCount: "desc" },
      take: 100,
      select: { id: true, title: true, price: true, stock: true, salesCount: true, images: true, status: true },
    });
    return {
      items: products.map((p) => ({
        id: p.id,
        name: p.title,
        price: Number(p.price),
        stock: p.stock ?? 0,
        sold: p.salesCount ?? 0,
        cover: p.images?.[0] || "",
        status: p.status === "ON_SALE" ? "on" : "off",
      })),
    };
  }

  /** 主播直播间设置 — 资料走 User 主字段；直播通知/互动偏好复用现有 JSON 字段，无需新增 DDL。 */
  async getStreamerSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, avatar: true, bio: true, notifySettings: true, creatorSettings: true },
    });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

    const notify = (user.notifySettings as Record<string, unknown> | null) ?? {};
    const creator = (user.creatorSettings as Record<string, unknown> | null) ?? {};
    const privacy = (creator.livePrivacy as Record<string, unknown> | undefined) ?? {};
    return {
      profile: {
        name: user.nickname || "我的直播间",
        desc: user.bio || "",
        cover: typeof creator.liveCover === "string" ? creator.liveCover : (user.avatar || ""),
      },
      notify: {
        newViewer: typeof notify.liveNewViewer === "boolean" ? notify.liveNewViewer : true,
        reward: typeof notify.liveReward === "boolean" ? notify.liveReward : true,
        comment: typeof notify.liveComment === "boolean" ? notify.liveComment : false,
        order: typeof notify.liveOrder === "boolean" ? notify.liveOrder : true,
      },
      privacy: {
        allowComment: typeof privacy.allowComment === "boolean" ? privacy.allowComment : true,
        allowGift: typeof privacy.allowGift === "boolean" ? privacy.allowGift : true,
        showViewCount: typeof privacy.showViewCount === "boolean" ? privacy.showViewCount : true,
        autoRecord: typeof privacy.autoRecord === "boolean" ? privacy.autoRecord : true,
      },
    };
  }

  /** 保存主播直播间设置：只接收白名单字段，并与其他模块共享的 JSON 偏好做合并写入。 */
  async saveStreamerSettings(
    userId: string,
    data: {
      profile?: { name?: string; desc?: string; cover?: string };
      notify?: Record<string, boolean>;
      privacy?: Record<string, boolean>;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, bio: true, notifySettings: true, creatorSettings: true },
    });
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND);

    const update: Prisma.UserUpdateInput = {};
    const creator = { ...((user.creatorSettings as Record<string, unknown> | null) ?? {}) };
    const notify = { ...((user.notifySettings as Record<string, unknown> | null) ?? {}) };

    if (data.profile) {
      const name = String(data.profile.name ?? "").trim();
      const desc = String(data.profile.desc ?? "").trim();
      const cover = String(data.profile.cover ?? "").trim();
      if (!name) throw new BusinessException(ErrorCode.BAD_REQUEST, "直播间名称不能为空");
      if (name.length > 40) throw new BusinessException(ErrorCode.BAD_REQUEST, "直播间名称不能超过40字");
      if (desc.length > 100) throw new BusinessException(ErrorCode.BAD_REQUEST, "直播间简介不能超过100字");
      if (cover.length > 1000) throw new BusinessException(ErrorCode.BAD_REQUEST, "封面地址过长");
      update.nickname = name;
      update.bio = desc || null;
      creator.liveCover = cover;
    }

    if (data.notify) {
      if (typeof data.notify.newViewer === "boolean") notify.liveNewViewer = data.notify.newViewer;
      if (typeof data.notify.reward === "boolean") notify.liveReward = data.notify.reward;
      if (typeof data.notify.comment === "boolean") notify.liveComment = data.notify.comment;
      if (typeof data.notify.order === "boolean") notify.liveOrder = data.notify.order;
    }
    if (data.privacy) {
      const current = (creator.livePrivacy as Record<string, unknown> | undefined) ?? {};
      const next = { ...current };
      if (typeof data.privacy.allowComment === "boolean") next.allowComment = data.privacy.allowComment;
      if (typeof data.privacy.allowGift === "boolean") next.allowGift = data.privacy.allowGift;
      if (typeof data.privacy.showViewCount === "boolean") next.showViewCount = data.privacy.showViewCount;
      if (typeof data.privacy.autoRecord === "boolean") next.autoRecord = data.privacy.autoRecord;
      creator.livePrivacy = next;
    }

    update.notifySettings = notify as Prisma.InputJsonValue;
    update.creatorSettings = creator as Prisma.InputJsonValue;
    await this.prisma.user.update({ where: { id: userId }, data: update });
    return { success: true, message: "设置已保存" };
  }

  /** 主播端直播评价 — 评分分布 + 评价列表(filter: all/5/4/3/pending/replied)。LiveReview 为新表，用原生 SQL 访问。 */
  async getStreamerReviews(userId: string, filter?: string) {
    const filters = [
      { key: "all", label: "全部" }, { key: "5", label: "5星" }, { key: "4", label: "4星" },
      { key: "3", label: "3星及以下" }, { key: "pending", label: "待回复" }, { key: "replied", label: "已回复" },
    ];
    const rooms = await this.prisma.liveRoom.findMany({ where: { hostUserId: userId }, select: { id: true, title: true } });
    const roomIds = rooms.map((r) => r.id);
    const roomTitle = new Map(rooms.map((r) => [r.id, r.title]));
    if (!roomIds.length) return { dist: [], reviews: [], filters };

    const relTime = (d: Date) => {
      const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
      if (days <= 0) return "今天";
      if (days === 1) return "1天前";
      if (days < 7) return `${days}天前`;
      if (days < 30) return `${Math.floor(days / 7)}周前`;
      return `${Math.floor(days / 30)}个月前`;
    };

    const distRows = await this.prisma.$queryRawUnsafe<{ rating: number; count: number }[]>(
      `SELECT rating, count(*)::int AS count FROM "LiveReview" WHERE "roomId" = ANY($1::text[]) GROUP BY rating`, roomIds);
    const total = distRows.reduce((s, d) => s + d.count, 0);
    const distMap = new Map(distRows.map((d) => [d.rating, d.count]));
    const dist = [5, 4, 3, 2, 1].map((star) => {
      const count = distMap.get(star) || 0;
      return { star, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    });

    let cond = `lr."roomId" = ANY($1::text[])`;
    if (filter === "5") cond += ` AND lr.rating = 5`;
    else if (filter === "4") cond += ` AND lr.rating = 4`;
    else if (filter === "3") cond += ` AND lr.rating <= 3`;
    else if (filter === "pending") cond += ` AND lr.reply IS NULL`;
    else if (filter === "replied") cond += ` AND lr.reply IS NOT NULL`;
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT lr.id, lr."roomId", lr.rating, lr.content, lr.reply, lr.flagged, lr."createdAt", u.nickname, u.avatar
       FROM "LiveReview" lr JOIN "User" u ON u.id = lr."userId" WHERE ${cond} ORDER BY lr."createdAt" DESC LIMIT 50`, roomIds);

    const reviews = rows.map((r) => ({
      id: r.id, user: r.nickname || "观众", avatar: r.avatar || "", rating: r.rating,
      content: r.content, live: roomTitle.get(r.roomId) || "", time: relTime(r.createdAt),
      reply: r.reply, flagged: r.flagged,
    }));
    return { dist, reviews, filters };
  }

  /** 回复直播评价（仅评价所属直播间的房主）。LiveReview 为新表，用原生 SQL 访问。 */
  async replyStreamerReview(userId: string, reviewId: string, reply: string) {
    const content = (reply || "").trim();
    if (!content) throw new BusinessException(ErrorCode.BAD_REQUEST, "回复内容不能为空");
    if (content.length > 500) throw new BusinessException(ErrorCode.BAD_REQUEST, "回复内容不能超过 500 字");

    const rows = await this.prisma.$queryRawUnsafe<{ id: string; roomId: string }[]>(
      `SELECT id, "roomId" FROM "LiveReview" WHERE id = $1`, reviewId);
    if (!rows.length) throw new BusinessException(ErrorCode.NOT_FOUND, "评价不存在");

    const room = await this.prisma.liveRoom.findUnique({ where: { id: rows[0].roomId }, select: { hostUserId: true } });
    if (!room || room.hostUserId !== userId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人可以回复评价");
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE "LiveReview" SET reply = $1 WHERE id = $2`, content, reviewId);
    return { id: reviewId, reply: content };
  }

  /** 主播端直播团队 — 团队成员 + 可邀请成员。LiveTeamMember 为新表，用原生 SQL 访问。 */
  async getStreamerTeam(userId: string) {
    const memberRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT tm.id, tm."userId", tm.role, tm.expertise, tm."liveCount", tm."createdAt", u.nickname, u.avatar, u.phone
       FROM "LiveTeamMember" tm JOIN "User" u ON u.id = tm."userId" WHERE tm."ownerId" = $1
       ORDER BY CASE tm.role WHEN 'host' THEN 1 WHEN 'cohost' THEN 2 WHEN 'operator' THEN 3 ELSE 4 END`, userId);
    const maskPhone = (p?: string) => (p ? p.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "");
    const fmtDate = (d: Date) => {
      const x = new Date(d);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const members = memberRows.map((m) => ({
      id: m.id, name: m.nickname || "成员", avatar: m.avatar || "", role: m.role,
      expertise: m.expertise || [], phone: maskPhone(m.phone), joinDate: fmtDate(m.createdAt),
      liveCount: m.liveCount, hasActiveLive: false, status: "offline" as const,
    }));

    // 可邀请成员：平台其他用户（不在团队）
    const exclude = [...memberRows.map((m) => m.userId), userId];
    const others = await this.prisma.user.findMany({
      where: { id: { notIn: exclude } },
      select: { id: true, nickname: true, avatar: true },
      take: 6,
    });
    const available = others.map((u, i) => ({
      id: u.id, name: u.nickname || "用户", avatar: u.avatar || "",
      expertise: [] as string[], type: (i % 2 === 0 ? "lecturer" : "member") as "lecturer" | "member",
    }));
    return { members, available };
  }

  /** 主播端直播控制台 — 实时统计 + 弹幕 + 连麦 + 商品 + 提词器（聚合直播间真实数据，owner 校验） */
  async getConsoleData(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true, viewCount: true, title: true, quality: true, startTime: true, imGroupId: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该直播间");

    const [currentOnline, minuteAgg, giftAgg, orderAgg, commentCount, likeCount, comments, liveProds, featuredProductId, newFollowers] = await Promise.all([
      this.getOnlineCount(roomId),
      this.prisma.liveMinuteData.aggregate({ where: { roomId }, _max: { onlineCount: true }, _avg: { onlineCount: true } }),
      this.prisma.giftRecord.aggregate({ where: { liveRoomId: roomId }, _sum: { totalCoin: true } }),
      this.prisma.order.aggregate({ where: { type: "LIVESTREAM", targetId: roomId, status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } }),
      this.prisma.comment.count({ where: { targetType: "LIVESTREAM", targetId: roomId } }),
      this.prisma.like.count({ where: { targetType: "LIVESTREAM", targetId: roomId } }),
      this.prisma.comment.findMany({ where: { targetType: "LIVESTREAM", targetId: roomId }, orderBy: { createdAt: "desc" }, take: 20, select: { content: true, createdAt: true, userId: true } }),
      this.prisma.liveProduct.findMany({ where: { liveId: roomId }, select: { productId: true }, orderBy: { sortOrder: "asc" } }),
      this.redis.get(this.featuredProductKey(roomId)),
      room.startTime
        ? this.prisma.follow.count({ where: { followedUserId: room.hostUserId, createdAt: { gte: room.startTime } } })
        : Promise.resolve(0),
    ]);

    const totalViews = room.viewCount;
    const stats = {
      onlineCount: currentOnline,
      totalViews,
      // 数据模型尚无来源归因；这里只展示“开播时间后”的真实新增量，并由前端明确标注口径。
      newFollowers,
      newFollowersAvailable: !!room.startTime,
      totalGift: Number(giftAgg._sum.totalCoin || 0),
      totalSales: Number(orderAgg._sum.amount || 0),
      peakOnline: Math.max(currentOnline, minuteAgg._max.onlineCount || 0),
      avgWatchTime: "--",
      interactionRate: totalViews > 0 ? (((commentCount + likeCount) / totalViews) * 100).toFixed(1) + "%" : "0%",
    };

    const userIds = [...new Set(comments.map((c) => c.userId))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true } });
    const nick = new Map(users.map((u) => [u.id, u.nickname]));
    const fmtTime = (d: Date) => {
      const x = new Date(d);
      return `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}:${String(x.getSeconds()).padStart(2, "0")}`;
    };
    // userId 随弹幕返回：主播控制台禁言操作需要定位真实用户
    const danmaku = [...comments].reverse().map((c, i) => ({ id: i + 1, userId: c.userId, user: nick.get(c.userId) || "观众", content: c.content, time: fmtTime(c.createdAt), level: 1, isVip: false }));

    const prodIds = liveProds.map((p) => p.productId);
    const prodDetails = await this.prisma.product.findMany({ where: { id: { in: prodIds } }, select: { id: true, title: true, price: true, stock: true, salesCount: true } });
    const prodMap = new Map(prodDetails.map((p) => [p.id, p]));
    const products = liveProds.map((lp) => {
      const p = prodMap.get(lp.productId);
      return { id: lp.productId, name: p?.title || "商品", price: p ? Number(p.price) : 0, stock: p?.stock || 0, sold: p?.salesCount || 0, isLive: lp.productId === featuredProductId, isHot: (p?.salesCount || 0) > 0 };
    });

    // 连麦请求 / 提词器脚本无对应数据源 → 空（前端降级）
    const liveDurationSeconds = room.startTime
      ? Math.max(0, Math.floor((Date.now() - room.startTime.getTime()) / 1000))
      : 0;
    return {
      title: room.title,
      quality: room.quality,
      imGroupId: room.imGroupId || "",
      liveDurationSeconds,
      stats,
      danmaku,
      requests: [],
      products,
      script: [],
    };
  }

  async getRoom(id: string, viewerId?: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true, bio: true, _count: { select: { followers: true } } } },
        circle: { select: { id: true, name: true } },
        products: true,
      },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, viewerId);
    const host = room.hostUserId === room.userId
      ? room.user
      : await this.prisma.user.findUnique({
          where: { id: room.hostUserId },
          select: { id: true, nickname: true, avatar: true, bio: true, _count: { select: { followers: true } } },
        });

    // #21 回放章节点随详情返回（raw 读绕过 prisma generate；列未就绪/查询失败不阻断详情）
    const [replayChapters, featuredProductId] = await Promise.all([
      this.getReplayChapters(id),
      this.redis.get(this.featuredProductKey(id)),
    ]);
    const onlineCount = room.status === "LIVING"
      ? await (this.presence?.getOnlineCount(id)
        ?? this.redis.get(`live:online:${id}`).then((value) => Number.parseInt(value || "0", 10) || 0))
      : 0;
    return { ...room, onlineCount, user: host || room.user, replayChapters, featuredProductId };
  }

  /** 显式进房/心跳：详情读取不再产生副作用。主播本人不计入观众指标。 */
  async touchPresence(id: string, clientSessionId: string, viewerId?: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, viewerId);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
    const isOwner = !!viewerId && (room.hostUserId === viewerId || room.userId === viewerId);
    if (isOwner) return { onlineCount: await this.getOnlineCount(id), firstVisit: false };
    if (!this.presence) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "直播在线服务暂不可用");
    return this.presence.touch(id, clientSessionId, viewerId);
  }

  /** 离房可重复调用；网络中断未调用时由 45 秒滑动窗口自动收敛。 */
  async leavePresence(id: string, clientSessionId: string, viewerId?: string) {
    if (!this.presence) return { onlineCount: 0 };
    return this.presence.leave(id, clientSessionId, viewerId);
  }

  async getOnlineCount(id: string) {
    if (this.presence) return this.presence.getOnlineCount(id);
    return this.redis.get(`live:online:${id}`).then((value) => Number.parseInt(value || "0", 10) || 0);
  }

  // ───────── 回放章节点（#21·主播标注） ─────────

  /** 读取回放章节（raw SQL 绕过 prisma client 旧类型；异常时返回 null 不阻断） */
  private async getReplayChapters(id: string): Promise<Array<{ t: number; title: string }> | null> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ replayChapters: unknown }>>(
        Prisma.sql`SELECT "replayChapters" FROM "LiveRoom" WHERE "id" = ${id}`,
      );
      const raw = rows?.[0]?.replayChapters;
      return Array.isArray(raw) ? (raw as Array<{ t: number; title: string }>) : null;
    } catch {
      return null; // 列未应用（manual SQL 未跑）或查询异常 → 详情照常返回
    }
  }

  /**
   * 主播标注回放章节点（PUT /live/rooms/:id/replay-chapters·仅主播本人）。
   * chapters: [{ t: 秒(>=0 整数), title: 1~80 字 }]，按 t 升序存储，上限 100 条；传 [] 即清空。
   * TODO(#21): AI 自动生成章节（依赖回放转写）暂不做；观看进度已由 LiveWatchProgress 跨设备持久化。
   */
  async setReplayChapters(userId: string, roomId: string, chapters: Array<{ t?: unknown; title?: unknown }>) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "仅主播本人可标注回放章节");

    if (!Array.isArray(chapters)) throw new BusinessException(ErrorCode.BAD_REQUEST, "chapters 必须是数组");
    if (chapters.length > 100) throw new BusinessException(ErrorCode.BAD_REQUEST, "章节最多 100 条");
    const normalized = chapters.map((c) => {
      const t = Math.floor(Number(c?.t));
      const title = String(c?.title ?? "").trim();
      if (!Number.isFinite(t) || t < 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "章节时间点 t 须为不小于 0 的秒数");
      if (!title || title.length > 80) throw new BusinessException(ErrorCode.BAD_REQUEST, "章节标题须为 1~80 字");
      return { t, title };
    });
    normalized.sort((a, b) => a.t - b.t);

    await this.prisma.$executeRaw(
      Prisma.sql`UPDATE "LiveRoom" SET "replayChapters" = ${JSON.stringify(normalized)}::jsonb, "updatedAt" = now() WHERE "id" = ${roomId}`,
    );
    return { success: true, count: normalized.length, replayChapters: normalized };
  }

  /** 校验回放进度接口的最小可见性，避免利用进度接口探测私密或已下架直播间。 */
  private async assertWatchProgressAccess(userId: string, roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hostUserId: true,
        userId: true,
        status: true,
        replayUrl: true,
        circleId: true,
        visibility: true,
        auditStatus: true,
      },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, userId);
    if (!room.replayUrl || !["ENDED", "REPLAY"].includes(String(room.status))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "当前直播间暂无可观看回放");
    }
    return room;
  }

  /**
   * 直播详情、拉流和回放接口共用的可见性门禁。
   * 圈内直播即使房间 ID 泄露，也只允许主播本人或真实圈成员访问。
   */
  private async assertRoomVisibilityAccess(room: {
    hostUserId?: string | null;
    userId?: string | null;
    circleId?: string | null;
    visibility?: string | null;
    auditStatus?: string | null;
  }, viewerId?: string) {
    const isOwner = !!viewerId && (room.hostUserId === viewerId || room.userId === viewerId);
    if (isOwner) return;

    if (room.visibility === "SELF_ONLY" || room.auditStatus === "REJECTED") {
      throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    }
    if (room.visibility === "PLATFORM") {
      if (room.auditStatus !== "APPROVED") throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
      return;
    }
    if (room.visibility !== "CIRCLE_ONLY") return;
    if (!viewerId || !room.circleId) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);

    const membership = await this.prisma.circleMember.findFirst({
      where: {
        circleId: room.circleId,
        userId: viewerId,
        OR: [{ expireAt: null }, { expireAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (!membership) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
  }

  async getWatchProgress(userId: string, roomId: string) {
    await this.assertWatchProgressAccess(userId, roomId);
    const progress = await this.prisma.liveWatchProgress.findUnique({
      where: { userId_liveRoomId: { userId, liveRoomId: roomId } },
      select: {
        positionSeconds: true,
        durationSeconds: true,
        completed: true,
        lastWatchedAt: true,
      },
    });
    return progress || {
      positionSeconds: 0,
      durationSeconds: 0,
      completed: false,
      lastWatchedAt: null,
    };
  }

  async saveWatchProgress(userId: string, roomId: string, dto: UpdateLiveWatchProgressDto) {
    await this.assertWatchProgressAccess(userId, roomId);
    const existing = await this.prisma.liveWatchProgress.findUnique({
      where: { userId_liveRoomId: { userId, liveRoomId: roomId } },
    });
    // 同一播放会话内，请求序号必须单调递增。重试和迟到请求直接返回当前记录。
    if (
      existing
      && existing.clientSessionId === dto.clientSessionId
      && dto.clientSequence <= existing.clientSequence
    ) {
      return existing;
    }

    const durationSeconds = Math.max(0, Math.floor(dto.durationSeconds));
    const positionSeconds = Math.max(
      0,
      Math.min(Math.floor(dto.positionSeconds), durationSeconds || 604800),
    );
    const completed = durationSeconds > 0
      && positionSeconds >= Math.max(durationSeconds - 10, Math.floor(durationSeconds * 0.95));
    const data = {
      positionSeconds,
      durationSeconds,
      completed,
      clientSessionId: dto.clientSessionId,
      clientSequence: dto.clientSequence,
      lastWatchedAt: new Date(),
    };
    return this.prisma.liveWatchProgress.upsert({
      where: { userId_liveRoomId: { userId, liveRoomId: roomId } },
      create: { userId, liveRoomId: roomId, ...data },
      update: data,
    });
  }

  async deleteRoom(userId: string, id: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id }, select: { hostUserId: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (!isAdmin && room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的直播间");
    await this.prisma.liveRoom.delete({ where: { id } });
    return { success: true };
  }

  // ───────── 预告与预约 ─────────

  /** 获取即将开始的直播预告列表（按 startTime 升序） */
  @Cacheable({ key: (args: any[]) => `live:scheduled:${args[0]}:${args[1]}:${args[2] || ""}`, ttl: 30 })
  async listScheduled(rawPage = 1, rawPageSize = 10, stationId?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.LiveRoomWhereInput = {
      status: "WAITING" as LiveStatus,
      startTime: { gte: new Date() },
      cover: { not: "" },
      description: { not: "" },
    };
    if (stationId) where.stationId = stationId;
    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        select: {
          id: true, title: true, description: true, cover: true, startTime: true, endTime: true,
          userId: true,
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { startTime: "asc" },
      }),
      this.prisma.liveRoom.count({ where }),
    ]);
    return { rooms, total, page, pageSize };
  }

  /** 预约直播 */
  async bookRoom(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播已开始或已结束，无法预约");

    const key = `live:bookings:${roomId}`;
    await this.redis.sadd(key, userId);
    const count = await this.redis.scard(key);
    return { booked: true, bookingCount: count };
  }

  /** 取消预约 */
  async unbookRoom(roomId: string, userId: string) {
    const key = `live:bookings:${roomId}`;
    await this.redis.srem(key, userId);
    const count = await this.redis.scard(key);
    return { booked: false, bookingCount: count };
  }

  /** 获取预约人数 */
  async getBookingCount(roomId: string, userId?: string) {
    const key = `live:bookings:${roomId}`;
    const [count, isBooked] = await Promise.all([
      this.redis.scard(key),
      userId ? this.redis.sismember(key, userId) : Promise.resolve(false),
    ]);
    return { roomId, bookingCount: count, isBooked };
  }

  private streamStatusKey(roomId: string) {
    return `live:stream-status:${roomId}`;
  }

  private featuredProductKey(roomId: string) {
    return `live:featured-product:${roomId}`;
  }

  private callbackMetric(body: Record<string, unknown>, ...keys: string[]): number | undefined {
    for (const key of keys) {
      const value = Number(body[key]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return undefined;
  }

  private callbackMetrics(body: Record<string, unknown>): Record<string, number | string> {
    const width = this.callbackMetric(body, "width", "video_width");
    const height = this.callbackMetric(body, "height", "video_height");
    const fps = this.callbackMetric(body, "fps", "video_fps");
    const bitrate = this.callbackMetric(body, "bitrate", "video_bitrate");
    const droppedFrames = this.callbackMetric(body, "drop_frame_count", "dropped_frames");
    return {
      ...(width !== undefined && height !== undefined ? { resolution: `${width}x${height}` } : {}),
      ...(fps !== undefined ? { fps } : {}),
      ...(bitrate !== undefined ? { bitrate } : {}),
      ...(droppedFrames !== undefined ? { droppedFrames } : {}),
    };
  }

  /**
   * 处理 TRTC 房间/媒体回调。OBS 只有收到 201/203 媒体事件后才算真正在线；
   * 103 仅表示进房，不能用来放行无画面直播。手机主播媒体事件同时作为 CDN 输出的服务端兜底心跳。
   */
  async handleTrtcEvent(body: Record<string, unknown>) {
    const eventGroupId = Number(body.EventGroupId);
    const eventType = Number(body.EventType);
    const info = body.EventInfo && typeof body.EventInfo === "object"
      ? body.EventInfo as Record<string, unknown>
      : {};
    const trtcRoomId = String(info.RoomId ?? "").trim();
    const trtcUserId = String(info.UserId ?? "").trim();
    if (![1, 2].includes(eventGroupId) || !Number.isInteger(eventType) || !trtcRoomId || !trtcUserId) {
      return { ignored: true };
    }

    const mappedRoomId = await this.redis.get(this.trtcRoomMapKey(trtcRoomId));
    const select = { id: true, hostUserId: true, orientation: true, status: true } as const;
    const room = mappedRoomId
      ? await this.prisma.liveRoom.findUnique({ where: { id: mappedRoomId }, select })
      : await this.prisma.liveRoom.findFirst({ where: { trtcRoomId }, select });
    if (!room) return { ignored: true };

    if (trtcUserId === toLiveObsTrtcUserId(room.id)) {
      if (room.orientation !== "landscape" || !this.obsTrtcIngestEnabled()) return { ignored: true };
      const previous = await this.redis.getJson<{
        status?: "online" | "offline";
        connectedAt?: string | null;
        media?: { audio?: boolean; video?: boolean };
      }>(this.streamStatusKey(room.id));
      const media = { audio: !!previous?.media?.audio, video: !!previous?.media?.video };
      if (eventType === 201) media.video = true;
      else if (eventType === 202) media.video = false;
      else if (eventType === 203) media.audio = true;
      else if (eventType === 204) media.audio = false;
      else if (eventType === 104) {
        media.audio = false;
        media.video = false;
      } else if (eventType !== 103) {
        return { ignored: true };
      }

      const now = new Date().toISOString();
      const online = media.audio || media.video;
      const metricsSource = info.Payload && typeof info.Payload === "object"
        ? { ...info, ...info.Payload as Record<string, unknown> }
        : info;
      await this.redis.setJson(this.streamStatusKey(room.id), {
        status: online ? "online" : "offline",
        connectedAt: online
          ? (previous?.status === "online" && previous.connectedAt ? previous.connectedAt : now)
          : previous?.connectedAt || null,
        disconnectedAt: online ? null : now,
        lastEventAt: now,
        reason: online ? null : String(info.Reason ?? (eventType === 103 ? "entered_waiting_media" : "trtc_media_stopped")),
        media,
        metrics: this.callbackMetrics(metricsSource),
      }, LiveService.STREAM_STATUS_TTL_SECONDS);
      if (room.status === "LIVING") {
        await this.mixing?.syncRoom(room.id).catch((cause: unknown) =>
          this.logger.error(`TRTC 回调同步直播输出失败 room=${room.id}`, cause instanceof Error ? cause.message : String(cause)),
        );
      }
      return { roomId: room.id, status: online ? "online" : "offline", media };
    }

    if (trtcUserId === toLiveTrtcUserId(room.hostUserId) && room.status === "LIVING") {
      if (eventType === 201 || eventType === 203) {
        return this.mixing?.markHostReady(room.id, room.hostUserId) || { active: false, reason: "MIXING_UNAVAILABLE" };
      }
      if (eventType === 104) {
        return this.mixing?.markHostNotReady(room.id, room.hostUserId) || { active: false, reason: "MIXING_UNAVAILABLE" };
      }
    }
    return { ignored: true };
  }

  /** 处理腾讯云直播回调事件（必须由控制器 await，失败时让上游重试）。 */
  async handleLiveEvent(streamKey: string, eventType: number, body: Record<string, unknown>) {
    if (!streamKey.startsWith("room_") || streamKey.length <= "room_".length) {
      this.logger.warn(`忽略无法识别的直播流回调: eventType=${eventType}`);
      return { ignored: true };
    }
    const roomId = streamKey.slice("room_".length);

    switch (eventType) {
      case 0: { // 断流
        const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { id: true } });
        if (!room) return { ignored: true };
        const now = new Date().toISOString();
        const previous = await this.redis.getJson<Record<string, unknown>>(this.streamStatusKey(roomId));
        await this.redis.setJson(this.streamStatusKey(roomId), {
          ...previous,
          status: "offline",
          disconnectedAt: now,
          lastEventAt: now,
          reason: String(body.errmsg || body.errcode || "upstream_disconnected"),
          metrics: this.callbackMetrics(body),
        }, LiveService.STREAM_STATUS_TTL_SECONDS);
        this.logger.log(`直播间 ${roomId} 断流`);
        return { roomId, status: "offline" };
      }
      case 1: { // 推流
        const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { id: true } });
        if (!room) return { ignored: true };
        const now = new Date().toISOString();
        const previous = await this.redis.getJson<{ status?: string; connectedAt?: string | null }>(this.streamStatusKey(roomId));
        await this.redis.setJson(this.streamStatusKey(roomId), {
          status: "online",
          connectedAt: previous?.status === "online" && previous.connectedAt ? previous.connectedAt : now,
          disconnectedAt: null,
          lastEventAt: now,
          reason: null,
          metrics: this.callbackMetrics(body),
        }, LiveService.STREAM_STATUS_TTL_SECONDS);
        this.logger.log(`直播间 ${roomId} 开始推流`);
        return { roomId, status: "online" };
      }
      case 100: { // 录制回调
        const videoUrl = (body.video_url || body.file_url) as string;
        if (videoUrl && roomId) {
          const room = await this.prisma.liveRoom.findUnique({
            where: { id: roomId },
            select: { id: true, courseId: true, title: true, replayUrl: true },
          });
          if (!room || room.replayUrl === videoUrl) return { roomId, duplicate: room?.replayUrl === videoUrl };
          await this.prisma.liveRoom.update({
            where: { id: roomId },
            data: { replayUrl: videoUrl as string, status: "REPLAY" as const },
          });
          // 关联了课程 → 回放自动同步为课程章节
          if (room.courseId) {
            await this.syncReplayToCourse(roomId, room.courseId, videoUrl as string, room.title).catch((e: unknown) => {
              this.logger.warn(`回放同步课程章节失败: ${roomId}: ${e instanceof Error ? e.message : String(e)}`);
            });
          }
        }
        return { roomId, recorded: !!videoUrl };
      }
      case 200: // 截图回调
        this.logger.log(`直播间 ${roomId} 截图: ${body.pic_url || body.file_url}`);
        return { roomId, screenshot: true };
    }
    return { ignored: true };
  }

  // ───────── 麦位管理 ─────────

  /** 用户上麦 */
  async joinMic(
    roomId: string,
    userId: string,
    position?: number,
    mediaMode: "AUDIO" | "VIDEO" = "AUDIO",
  ) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { id: true, status: true, hostUserId: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
    if (room.hostUserId === userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "主播无需申请上麦");

    // 客户端强退时无法保证发出取消请求；过期待审批申请自动释放麦位。
    await this.prisma.liveMic.deleteMany({
      where: { liveRoomId: roomId, status: "PENDING", joinedAt: { lt: new Date(Date.now() - 2 * 60_000) } },
    });

    const ownRequest = await this.prisma.liveMic.findFirst({ where: { liveRoomId: roomId, userId } });
    if (ownRequest) throw new BusinessException(ErrorCode.BAD_REQUEST, "你已有待处理或进行中的连麦");

    // 未指定时自动尝试 1-6 号位；唯一索引承担并发竞争裁决，第二个请求继续尝试下一席。
    const candidates = position ? [position] : [1, 2, 3, 4, 5, 6];
    for (const candidate of candidates) {
      try {
        return await this.prisma.liveMic.create({
          data: { liveRoomId: roomId, userId, position: candidate, status: "PENDING", mediaMode, source: "REQUEST" },
        });
      } catch (e: unknown) {
        if (isUniqueConstraintError(e)) continue;
        throw e;
      }
    }
    throw new BusinessException(ErrorCode.BAD_REQUEST, position ? "该麦位已被占用" : "当前连麦席位已满");
  }

  /** 主播邀请用户连麦；受邀用户必须主动接受后才签发采集权限。 */
  async inviteMic(
    roomId: string,
    operatorId: string,
    userId: string,
    position?: number,
    mediaMode: "AUDIO" | "VIDEO" = "AUDIO",
    isAdmin = false,
  ) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { status: true, hostUserId: true, title: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (!isAdmin && room.hostUserId !== operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以发起连麦邀请");
    }
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
    if (room.hostUserId === userId) throw new BusinessException(ErrorCode.BAD_REQUEST, "不能邀请主播本人");
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new BusinessException(ErrorCode.NOT_FOUND, "受邀用户不存在");
    const existing = await this.prisma.liveMic.findFirst({ where: { liveRoomId: roomId, userId } });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户已有待处理或进行中的连麦");

    const candidates = position ? [position] : [1, 2, 3, 4, 5, 6];
    for (const candidate of candidates) {
      try {
        const invitation = await this.prisma.liveMic.create({
          data: { liveRoomId: roomId, userId, position: candidate, status: "PENDING", mediaMode, source: "INVITE" },
        });
        await this.notification?.send(userId, {
          type: "LIVE_MIC_INVITE",
          title: "主播邀请你连麦",
          content: `《${room.title}》邀请你进行${mediaMode === "VIDEO" ? "视频" : "语音"}连麦，请进入直播间确认。`,
          targetType: "LIVE_ROOM",
          targetId: roomId,
        }).catch((e: unknown) => this.logger.warn("直播连麦邀请通知发送失败", e));
        return invitation;
      } catch (e: unknown) {
        if (isUniqueConstraintError(e)) continue;
        throw e;
      }
    }
    throw new BusinessException(ErrorCode.BAD_REQUEST, position ? "该麦位已被占用" : "当前连麦席位已满");
  }

  async respondMicInvite(roomId: string, userId: string, action: "ACCEPT" | "DECLINE") {
    const invitation = await this.prisma.liveMic.findFirst({
      where: { liveRoomId: roomId, userId, status: "PENDING", source: "INVITE" },
    });
    if (!invitation) throw new BusinessException(ErrorCode.NOT_FOUND, "连麦邀请已失效或已处理");
    if (action === "DECLINE") {
      await this.prisma.liveMic.delete({ where: { id: invitation.id } });
      return { success: true, declined: true };
    }
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { status: true } });
    if (!room || room.status !== "LIVING") {
      await this.prisma.liveMic.delete({ where: { id: invitation.id } });
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播已结束，邀请自动失效");
    }
    return this.prisma.liveMic.update({
      where: { id: invitation.id },
      data: { status: "OCCUPIED", joinedAt: new Date() },
    });
  }

  /** 下麦（本人或主播/管理员操作） */
  async leaveMic(roomId: string, userId: string, operatorId?: string) {
    if (operatorId && operatorId !== userId) {
      const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
      if (!room || room.hostUserId !== operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播可以操作他人下麦");
    }
    const mic = await this.prisma.liveMic.findFirst({
      where: { liveRoomId: roomId, userId },
    });
    if (!mic) return { success: true, alreadyLeft: true };
    await this.prisma.liveMic.delete({ where: { id: mic.id } });
    await this.mixing?.markNotReady(roomId, userId);
    return { success: true };
  }

  /** 嘉宾原生 TRTC 进房成功后的租约心跳；只有已获批麦位可以触发混流。 */
  async markMicReady(roomId: string, userId: string) {
    if (!this.mixing) return { active: false, streamMode: "ORIGIN", reason: "MIXING_UNAVAILABLE" };
    return this.mixing.markReady(roomId, userId);
  }

  /** 手机主播原生 TRTC 进房后的租约心跳；普通 CDN 观众的单主播画面也依赖该输出。 */
  async markHostReady(roomId: string, userId: string) {
    if (!this.mixing) return { active: false, streamMode: "ORIGIN", reason: "MIXING_UNAVAILABLE" };
    return this.mixing.markHostReady(roomId, userId);
  }

  async markHostNotReady(roomId: string, userId: string) {
    if (!this.mixing) return { active: false, streamMode: "ORIGIN", reason: "MIXING_UNAVAILABLE" };
    return this.mixing.markHostNotReady(roomId, userId);
  }

  /** 主播/管理员处理申请、静音、解除静音或踢人。 */
  async manageMic(
    roomId: string,
    operatorId: string,
    dto: { userId: string; position?: number; action: string },
    isAdmin = false,
  ) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true, status: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (!isAdmin && room.hostUserId !== operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以管理麦位");
    }

    const where: Prisma.LiveMicWhereInput = { liveRoomId: roomId, userId: dto.userId };
    if (dto.position) where.position = dto.position;

    const mic = await this.prisma.liveMic.findFirst({ where });
    if (!mic && ["REJECT", "KICK"].includes(dto.action)) return { success: true, alreadyHandled: true };
    if (!mic) throw new BusinessException(ErrorCode.NOT_FOUND, "未在麦位上");

    switch (dto.action) {
      case "ACCEPT":
        if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
        if (mic.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该申请已处理");
        if (mic.source === "INVITE") {
          throw new BusinessException(ErrorCode.FORBIDDEN, "主播邀请必须由受邀用户本人接受");
        }
        return this.prisma.liveMic.update({ where: { id: mic.id }, data: { status: "OCCUPIED", joinedAt: new Date() } });
      case "REJECT":
        if (mic.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "只能拒绝待处理申请");
        await this.prisma.liveMic.delete({ where: { id: mic.id } });
        return { success: true };
      case "MUTE":
        if (mic.status !== "OCCUPIED") throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户尚未连麦");
        return this.prisma.liveMic.update({ where: { id: mic.id }, data: { status: "MUTED" } });
      case "UNMUTE":
        if (mic.status !== "MUTED") throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户未被静音");
        return this.prisma.liveMic.update({ where: { id: mic.id }, data: { status: "OCCUPIED" } });
      case "KICK":
        await this.prisma.liveMic.delete({ where: { id: mic.id } });
        await this.mixing?.markNotReady(roomId, mic.userId);
        return { success: true };
      default:
        throw new BusinessException(ErrorCode.BAD_REQUEST, "无效操作");
    }
  }

  /** 获取麦位列表 */
  async listMics(roomId: string, userId: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    const canManage = isAdmin || room.hostUserId === userId;
    await this.prisma.liveMic.deleteMany({
      where: { liveRoomId: roomId, status: "PENDING", joinedAt: { lt: new Date(Date.now() - 2 * 60_000) } },
    });
    const mics = await this.prisma.liveMic.findMany({
      where: canManage
        ? { liveRoomId: roomId }
        : {
            liveRoomId: roomId,
            OR: [
              { userId },
              { status: { in: ["OCCUPIED", "MUTED"] } },
            ],
          },
      orderBy: { position: "asc" },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(mics.map((mic) => mic.userId))] } },
      select: { id: true, nickname: true, avatar: true },
    });
    const profileById = new Map(users.map((profile) => [profile.id, profile]));
    return mics.map((mic) => ({
      ...mic,
      trtcUserId: toLiveTrtcUserId(mic.userId),
      nickname: profileById.get(mic.userId)?.nickname || "观众",
      avatar: profileById.get(mic.userId)?.avatar || null,
    }));
  }

  /**
   * 仅主播或已经主播批准的嘉宾可取得 TRTC 票据。
   * 票据十分钟过期且绑定字符串房间号；未配置时硬失败，不返回假成功。
   */
  async getRtcConfig(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { status: true, hostUserId: true, trtcRoomId: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "LIVING" || !room.trtcRoomId) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
    }

    let role: "HOST" | "GUEST" = "HOST";
    let mediaMode: "AUDIO" | "VIDEO" = "VIDEO";
    let privilegeMap = 255;
    if (room.hostUserId !== userId) {
      const mic = await this.prisma.liveMic.findFirst({ where: { liveRoomId: roomId, userId } });
      if (!mic || !["OCCUPIED", "MUTED"].includes(mic.status)) {
        throw new BusinessException(ErrorCode.FORBIDDEN, "连麦申请尚未获主播批准");
      }
      role = "GUEST";
      mediaMode = mic.mediaMode === "VIDEO" ? "VIDEO" : "AUDIO";
      // 权限位：2进房、4发音频、8收音频、16发视频、32收视频。
      // 视频嘉宾只获得主路视频权限，不授予创建房间、屏幕分享或其他高权限。
      if (mediaMode === "VIDEO") {
        privilegeMap = mic.status === "MUTED" ? 58 : 62;
      } else {
        privilegeMap = mic.status === "MUTED" ? 10 : 14;
      }
    }

    const ticket = buildLiveTrtcTicket(userId, room.trtcRoomId, privilegeMap);
    if (!ticket) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "TRTC 正式应用尚未配置");
    return {
      ...ticket,
      role,
      mediaMode,
      canPublishAudio: (privilegeMap & 4) === 4,
      canPublishVideo: (privilegeMap & 16) === 16,
      hostUserId: room.hostUserId,
      hostTrtcUserId: toLiveTrtcUserId(room.hostUserId),
      streamId: role === "HOST" ? `room_${roomId}` : undefined,
    };
  }

  // ───────── 课件管理 ─────────

  /** 上传课件 */
  async addSlide(roomId: string, dto: { title: string; url: string; type?: string; sortOrder?: number }) {
    return this.prisma.liveSlide.create({
      data: {
        liveRoomId: roomId,
        title: dto.title,
        url: dto.url,
        type: dto.type || "IMAGE",
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  /** 删除课件 */
  async removeSlide(slideId: string) {
    const existing = await this.prisma.liveSlide.findUnique({ where: { id: slideId } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "幻灯片不存在");
    await this.prisma.liveSlide.delete({ where: { id: slideId } });
    return { success: true };
  }

  /** 课件列表 */
  async listSlides(roomId: string) {
    return this.prisma.liveSlide.findMany({
      where: { liveRoomId: roomId },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ───────── 禁言管理 ─────────

  /** 禁言用户（主播本人或管理员） */
  async muteUser(roomId: string, operatorId: string, dto: { userId: string; durationMinutes?: number }, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.hostUserId !== operatorId && !isAdmin) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以禁言");
    }

    const expiresAt = dto.durationMinutes
      ? new Date(Date.now() + dto.durationMinutes * 60000)
      : null;

    return this.prisma.liveMutedUser.upsert({
      where: { liveRoomId_userId: { liveRoomId: roomId, userId: dto.userId } },
      create: { liveRoomId: roomId, userId: dto.userId, mutedBy: operatorId, expiresAt },
      update: { mutedBy: operatorId, mutedAt: new Date(), expiresAt },
    });
  }

  /** 解除禁言（主播本人或管理员） */
  async unmuteUser(roomId: string, userId: string, operatorId: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
    if (!room || (room.hostUserId !== operatorId && !isAdmin)) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以解除禁言");
    await this.prisma.liveMutedUser.deleteMany({
      where: { liveRoomId: roomId, userId },
    });
    return { success: true };
  }

  /** 获取当前有效禁言列表（仅主播本人或管理员） */
  async listMutedUsers(roomId: string, operatorId: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.hostUserId !== operatorId && !isAdmin) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以查看禁言名单");
    }

    const now = new Date();
    const records = await this.prisma.liveMutedUser.findMany({
      where: {
        liveRoomId: roomId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { mutedAt: "desc" },
    });
    if (records.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(records.map((record) => record.userId))] } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userById = new Map(users.map((user) => [user.id, user]));

    return records.map((record) => {
      const user = userById.get(record.userId);
      return {
        id: record.id,
        userId: record.userId,
        nickname: user?.nickname || "用户",
        avatar: user?.avatar || null,
        mutedAt: record.mutedAt,
        expiresAt: record.expiresAt,
        isPermanent: record.expiresAt === null,
      };
    });
  }

  /** 检查用户是否被禁言 */
  async isUserMuted(roomId: string, userId: string): Promise<boolean> {
    const record = await this.prisma.liveMutedUser.findUnique({
      where: { liveRoomId_userId: { liveRoomId: roomId, userId } },
    });
    if (!record) return false;
    if (record.expiresAt && record.expiresAt < new Date()) {
      await this.prisma.liveMutedUser.delete({ where: { id: record.id } });
      return false;
    }
    return true;
  }

  private moderationSettingsKey(roomId: string) {
    return `live:moderation:${roomId}`;
  }

  async getModerationSettings(roomId: string, operatorId: string, isAdmin = false) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (!isAdmin && room.hostUserId !== operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以查看互动规则");
    }
    return await this.redis.getJson<{ slowModeSeconds: number; followersOnly: boolean }>(
      this.moderationSettingsKey(roomId),
    ) || { slowModeSeconds: 0, followersOnly: false };
  }

  async updateModerationSettings(
    roomId: string,
    operatorId: string,
    settings: { slowModeSeconds: number; followersOnly: boolean },
    isAdmin = false,
  ) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (!isAdmin && room.hostUserId !== operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以设置互动规则");
    }
    const normalized = {
      slowModeSeconds: [0, 3, 5, 10, 30].includes(Number(settings.slowModeSeconds))
        ? Number(settings.slowModeSeconds)
        : 0,
      followersOnly: settings.followersOnly === true,
    };
    await this.redis.setJson(this.moderationSettingsKey(roomId), normalized, LiveService.LIVE_SETTINGS_TTL_SECONDS);
    return normalized;
  }

  // ───────── 直播评论与点赞 ─────────

  private async getHostLivePrivacy(hostUserId: string) {
    const host = await this.prisma.user.findUnique({
      where: { id: hostUserId },
      select: { creatorSettings: true },
    });
    const creator = (host?.creatorSettings as Record<string, unknown> | null) ?? {};
    return (creator.livePrivacy as Record<string, unknown> | undefined) ?? {};
  }

  /**
   * 观看端唯一能力契约。布尔值仅供客户端显隐；评论、点赞、礼物端点仍各自重复强制权限。
   * 在线身份保持空数组，不能从匿名 presence 哈希反查或伪造用户资料。
   */
  async getWatchContext(roomId: string, viewerId?: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        status: true,
        hostUserId: true,
        userId: true,
        circleId: true,
        visibility: true,
        auditStatus: true,
      },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, viewerId);

    const [privacy, moderation, onlineCount] = await Promise.all([
      this.getHostLivePrivacy(room.hostUserId),
      this.redis.getJson<{ followersOnly?: boolean }>(this.moderationSettingsKey(roomId)),
      room.status === "LIVING" ? this.getOnlineCount(roomId) : Promise.resolve(0),
    ]);
    const isHost = !!viewerId && (room.hostUserId === viewerId || room.userId === viewerId);
    const allowComment = room.status === "LIVING";
    const allowLike = room.status === "LIVING";
    const allowGift = room.status === "LIVING" && privacy.allowGift !== false;
    let muted = false;
    let followerEligible = true;
    if (viewerId && allowComment) {
      muted = await this.isUserMuted(roomId, viewerId);
      if (moderation?.followersOnly && !isHost) {
        const following = await this.prisma.follow.findUnique({
          where: { userId_followedUserId: { userId: viewerId, followedUserId: room.hostUserId } },
          select: { id: true },
        });
        followerEligible = !!following;
      }
    }

    return {
      room: {
        id: room.id,
        status: room.status,
        visibility: room.visibility,
        allowGift,
      },
      viewer: {
        authenticated: !!viewerId,
        isHost,
        canComment: !!viewerId && allowComment && !muted && followerEligible,
        canLike: !!viewerId && allowLike,
        canGift: !!viewerId && allowGift,
      },
      interaction: { allowComment, allowLike, allowGift },
      online: { count: onlineCount, avatars: [] as Array<{ userId: string; nickname: string; avatar: string | null }> },
    };
  }

  /** 直播公屏只从专属端点读取；房间可见性校验必须先于任何评论查询。 */
  async listComments(roomId: string, viewerId?: string, rawPage: number | string = 1, rawPageSize: number | string = 20) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hostUserId: true,
        userId: true,
        circleId: true,
        visibility: true,
        auditStatus: true,
      },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, viewerId);

    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, 20);
    const where = {
      targetType: "LIVESTREAM",
      targetId: roomId,
      parentId: null,
      status: "PUBLISHED",
      deletedAt: null,
    } as const;
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          replies: {
            where: { status: "PUBLISHED", deletedAt: null },
            include: { user: { select: { id: true, nickname: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { comments, total, page, pageSize };
  }

  /** 发送直播评论/弹幕 */
  async sendComment(roomId: string, userId: string, content: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, userId);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");

    const muted = await this.isUserMuted(roomId, userId);
    if (muted) throw new BusinessException(ErrorCode.BAD_REQUEST, "您已被禁言");

    const settings = await this.redis.getJson<{ slowModeSeconds?: number; followersOnly?: boolean }>(
      this.moderationSettingsKey(roomId),
    );
    if (settings?.followersOnly && userId !== room.hostUserId) {
      const following = await this.prisma.follow.findUnique({
        where: { userId_followedUserId: { userId, followedUserId: room.hostUserId } },
        select: { id: true },
      });
      if (!following) throw new BusinessException(ErrorCode.FORBIDDEN, "本场直播仅允许已关注主播的用户评论");
    }

    // 内容审核（先审后发·三层漏斗）：直播评论持久化入库前拦违规；fail-open 保证密钥未配不阻断发评论
    await this.audit.moderateTextOrThrow(content, { scene: "LIVE_COMMENT", userId, dataId: roomId });

    const slowModeSeconds = Number(settings?.slowModeSeconds || 0);
    let slowModeKey = "";
    if (slowModeSeconds > 0) {
      const memberId = createHash("sha256").update(userId).digest("hex").slice(0, 24);
      slowModeKey = `live:comment:slow:${roomId}:${memberId}`;
      const allowed = await this.redis.setNX(slowModeKey, "1", slowModeSeconds);
      if (!allowed) {
        const remaining = Math.max(1, await this.redis.ttl(slowModeKey));
        throw new BusinessException(ErrorCode.BAD_REQUEST, `本场已开启慢速模式，请 ${remaining} 秒后再评论`);
      }
    }

    try {
      const created = await this.prisma.comment.create({
        data: {
          targetType: "LIVESTREAM",
          targetId: roomId,
          userId,
          content: content.slice(0, 500),
        },
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      });
      if (room.imGroupId && this.im) {
        void this.im.relayLiveGroupMsg(room.imGroupId, created.content, userId).catch((error) => {
          this.logger.warn(`直播评论 IM 实时中继失败 room=${roomId}`, error);
        });
      }
      return created;
    } catch (cause) {
      if (slowModeKey) await this.redis.del(slowModeKey);
      throw cause;
    }
  }

  /** 直播点赞 */
  async toggleLike(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, userId);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");

    await this.prisma.like.upsert({
      where: {
        userId_targetType_targetId: { userId, targetType: "LIVESTREAM", targetId: roomId },
      },
      create: { targetType: "LIVESTREAM", targetId: roomId, userId },
      update: {},
    });

    const count = await this.prisma.like.count({
      where: { targetType: "LIVESTREAM", targetId: roomId },
    });

    return { liked: true, likeCount: count };
  }

  // ───────── 限时秒杀 ─────────

  /** 创建秒杀活动 */
  async createFlashSale(roomId: string, dto: { productId: string; flashPrice: number; stock: number; startTime: string; endTime: string }) {
    return this.prisma.liveFlashSale.create({
      data: {
        liveRoomId: roomId,
        productId: dto.productId,
        flashPrice: dto.flashPrice,
        stock: dto.stock,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: "WAITING",
      },
    });
  }

  /** 开始秒杀 */
  async startFlashSale(saleId: string) {
    const sale = await this.prisma.liveFlashSale.findUnique({ where: { id: saleId } });
    if (!sale) throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND);
    if (sale.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "秒杀状态不允许开始");

    return this.prisma.liveFlashSale.update({
      where: { id: saleId },
      data: { status: "ACTIVE" },
    });
  }

  /** 秒杀下单（原子扣减库存） */
  async flashSaleOrder(saleId: string, userId: string) {
    const sale = await this.prisma.liveFlashSale.findUnique({ where: { id: saleId } });
    if (!sale) throw new BusinessException(ErrorCode.FLASH_SALE_NOT_FOUND);
    if (sale.status !== "ACTIVE") throw new BusinessException(ErrorCode.BAD_REQUEST, "秒杀未开始或已结束");
    if (new Date() > sale.endTime) throw new BusinessException(ErrorCode.BAD_REQUEST, "秒杀已结束");

    // 原子扣减：where 加 soldCount < stock 防止超卖
    const updated = await this.prisma.liveFlashSale.updateMany({
      where: { id: saleId, soldCount: { lt: sale.stock } },
      data: { soldCount: { increment: 1 } },
    });
    if (updated.count === 0) throw new BusinessException(ErrorCode.PRODUCT_OUT_OF_STOCK, "秒杀库存不足");

    return { saleId, userId, flashPrice: sale.flashPrice, productId: sale.productId };
  }

  /** 结束秒杀 */
  async endFlashSale(saleId: string) {
    return this.prisma.liveFlashSale.update({
      where: { id: saleId },
      data: { status: "ENDED" },
    });
  }

  /** 秒杀列表 */
  async listFlashSales(roomId: string) {
    return this.prisma.liveFlashSale.findMany({
      where: { liveRoomId: roomId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ───────── 内容审核 ─────────

  /** CMS审核回调处理 */
  async handleAuditCallback(roomId: string, screenshotUrl: string, result: string, label?: string, rawData?: unknown) {
    const log = await this.prisma.liveAuditLog.create({
      data: {
        liveRoomId: roomId,
        screenshotUrl,
        auditResult: result,
        label,
        rawData: rawData as Prisma.InputJsonValue | undefined,
      },
    });

    // 违规自动切断流
    if (result === "BLOCK") {
      await this.prisma.liveRoom.update({
        where: { id: roomId },
        data: { status: "BANNED" as LiveStatus },
      });
      this.logger.warn(`直播间 ${roomId} 因违规被自动切断: ${label}`);
    }

    return log;
  }

  /** 审核日志列表 */
  async listAuditLogs(roomId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const [logs, total] = await Promise.all([
      this.prisma.liveAuditLog.findMany({
        where: { liveRoomId: roomId },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.liveAuditLog.count({ where: { liveRoomId: roomId } }),
    ]);
    return { logs, total, page, pageSize };
  }

  // ───────── 礼物系统 ─────────

  async getGiftSpendingPreference(userId: string) {
    if (!this.coin) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "送礼消费保护服务暂不可用");
    return this.coin.getLiveGiftSpendingPreference(userId);
  }

  async updateGiftSpendingPreference(
    userId: string,
    input: { singleLimitCoin: number; dailyLimitCoin: number; reminderEnabled?: boolean },
  ) {
    if (!this.coin) throw new BusinessException(ErrorCode.INTERNAL_ERROR, "送礼消费保护服务暂不可用");
    return this.coin.updateLiveGiftSpendingPreference(userId, input);
  }

  /** 获取可发送的礼物列表 */
  async listGifts() {
    return this.prisma.gift.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** 发送礼物：持久化幂等键保证网络重试、并发重复请求不重复扣币或分账。 */
  async sendGift(roomId: string, userId: string, giftId: string, quantity: number, idempotencyKey?: string) {
    // 旧客户端没有幂等键时只保证兼容可用；新版客户端的显式键才具备跨重试幂等语义。
    const normalizedKey = String(
      idempotencyKey || `legacy-live-gift:${userId}:${roomId}:${randomUUID()}`,
    ).trim();
    if (normalizedKey.length < 16 || normalizedKey.length > 128) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "送礼幂等键格式错误");
    }

    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    await this.assertRoomVisibilityAccess(room, userId);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");
    const privacy = await this.getHostLivePrivacy(room.hostUserId);
    if (privacy.allowGift === false) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "本场直播未开放礼物功能");
    }

    const expectedRequest = { userId, liveRoomId: roomId, giftId, quantity };
    const includeGiftContext = {
      user: { select: { id: true, nickname: true, avatar: true } },
      gift: { select: { id: true, name: true, icon: true, level: true } },
    } as const;
    const existing = await this.prisma.giftRecord.findUnique({
      where: { idempotencyKey: normalizedKey },
      include: includeGiftContext,
    });
    if (existing) {
      this.assertGiftIdempotencyMatch(existing, expectedRequest);
      return existing;
    }

    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift || gift.status !== "ACTIVE") throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在或已下架");
    const totalCoin = gift.priceCoin * quantity;

    let created = false;
    let record;
    try {
      record = await this.prisma.$transaction(async (tx) => {
        if (this.coin) {
          await this.coin.assertLiveGiftSpendAllowed(userId, totalCoin, tx);
          await this.coin.spend(userId, {
            amountCoin: totalCoin,
            scene: "LIVE_GIFT",
            refId: normalizedKey,
            description: `在直播间 ${room.title} 送出 ${gift.name} x${quantity}`,
          }, tx);
        }

        const giftRecord = await tx.giftRecord.create({
          data: {
            idempotencyKey: normalizedKey,
            userId,
            liveRoomId: roomId,
            toUserId: room.hostUserId,
            giftId,
            quantity,
            totalCoin,
          },
          include: includeGiftContext,
        });

        // 主播分账与赠礼者扣币、赠礼记录原子提交。
        if (this.revenue && room.hostUserId && room.hostUserId !== userId) {
          await this.revenue.record(
            { userId: room.hostUserId, scene: "LIVE_GIFT", refId: giftRecord.id, amountCoin: totalCoin, rate: 0.5 },
            tx,
          );
        }
        return giftRecord;
      });
      created = true;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const concurrent = await this.prisma.giftRecord.findUnique({
        where: { idempotencyKey: normalizedKey },
        include: includeGiftContext,
      });
      if (!concurrent) throw error;
      this.assertGiftIdempotencyMatch(concurrent, expectedRequest);
      record = concurrent;
    }

    // 统一总账影子双写只随首次成功请求触发，幂等重放不重复记账。
    if (created && this.revenue && record.toUserId && record.toUserId !== userId) {
      this.revenue.settleLedger({
        scene: "LIVE_GIFT",
        refType: "GIFT_RECORD",
        refId: record.id,
        amountCoin: record.totalCoin,
        payerId: userId,
        parties: { PROVIDER: { type: "USER", id: record.toUserId, userId: record.toUserId } },
      }).catch(() => undefined);
    }

    if (created && room.imGroupId && this.im) {
      void this.im.relayLiveGift(room.imGroupId, {
        recordId: record.id,
        giftId: gift.id,
        giftName: gift.name,
        quantity,
      }, userId).catch((error) => {
        this.logger.warn(`直播礼物 IM 实时中继失败 room=${roomId}`, error);
      });
    }

    return record;
  }

  /** 创建礼物（管理员） */
  async createGift(dto: { name: string; icon?: string; priceCoin: number; level?: string; sortOrder?: number }) {
    return this.prisma.gift.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        priceCoin: dto.priceCoin,
        level: dto.level || "BASIC",
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  /** 更新礼物（管理员） */
  async updateGift(giftId: string, dto: { name?: string; icon?: string; priceCoin?: number; level?: string; status?: string; sortOrder?: number }) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在");
    return this.prisma.gift.update({ where: { id: giftId }, data: dto });
  }

  /** 删除礼物（软删除，设为INACTIVE） */
  async removeGift(giftId: string) {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift) throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在");
    await this.prisma.gift.update({ where: { id: giftId }, data: { status: "INACTIVE" } });
    return { success: true };
  }

  /** 直播间礼物经营统计。消费金额属于敏感经营数据，仅主播本人或管理员可见。 */
  async giftRanking(roomId: string, operatorId: string, isAdmin = false, limit: number = 20) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND, "直播间不存在");
    if (!isAdmin && room.hostUserId !== operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播本人或管理员可以查看礼物经营统计");
    }

    const topGifters = await this.prisma.giftRecord.groupBy({
      by: ["userId"],
      where: { liveRoomId: roomId },
      _sum: { totalCoin: true },
      orderBy: { _sum: { totalCoin: "desc" } },
      take: limit,
    });

    const userIds = topGifters.map(g => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return topGifters.map(g => ({
      userId: g.userId,
      nickname: userMap.get(g.userId)?.nickname,
      avatar: userMap.get(g.userId)?.avatar,
      totalCoin: Number(g._sum.totalCoin || 0),
    }));
  }

  // ───────── 观众画像（暂基于礼物数据） ─────────

  /** 直播间观众画像（基于打赏和互动数据） */
  async getAudienceProfile(roomId: string) {
    const giftUserIds = await this.prisma.giftRecord.findMany({
      where: { liveRoomId: roomId },
      select: { userId: true },
      distinct: ["userId"],
    });

    const commentUserIds = await this.prisma.comment.findMany({
      where: { targetType: "LIVESTREAM", targetId: roomId },
      select: { userId: true },
      distinct: ["userId"],
    });

    const allUserIds = [...new Set([...giftUserIds.map(g => g.userId), ...commentUserIds.map(c => c.userId)])];

    if (!allUserIds.length) {
      return { totalAudience: 0, gender: "--", age: "--", region: "--", interests: "--" };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { gender: true, birthday: true, interestCategories: true },
    });

    const maleCount = users.filter((u: { gender: number | null }) => u.gender === 1).length;
    const femaleCount = users.filter((u: { gender: number | null }) => u.gender === 0).length;

    const now = new Date();
    const ageGroups = { under20: 0, "20s": 0, "30s": 0, "40s": 0, over50: 0 };
    users.forEach((u: { birthday: Date | null }) => {
      if (!u.birthday) return;
      const age = now.getFullYear() - new Date(u.birthday).getFullYear();
      if (age < 20) ageGroups.under20++;
      else if (age < 30) ageGroups["20s"]++;
      else if (age < 40) ageGroups["30s"]++;
      else if (age < 50) ageGroups["40s"]++;
      else ageGroups.over50++;
    });

    const tagCount: Record<string, number> = {};
    users.forEach((u: { interestCategories: string[] }) => {
      (u.interestCategories || []).forEach((t: string) => { tagCount[t] = (tagCount[t] || 0) + 1; });
    });
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    return {
      totalAudience: allUserIds.length,
      gender: `男${maleCount} / 女${femaleCount}`,
      age: Object.entries(ageGroups).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}人`).join(" ") || "--",
      region: "--",
      interests: topTags.join("、") || "--",
    };
  }

  // ───────── 课程联动 ─────────

  /** 获取课程关联的直播间列表 */
  async listCourseRooms(courseId: string, rawPage = 1, rawPageSize = 20, stationId?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.LiveRoomWhereInput = { courseId };
    if (stationId) where.stationId = stationId;
    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { products: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.liveRoom.count({ where }),
    ]);
    return { rooms, total, page, pageSize };
  }

  /** 直播回放同步为课程章节 */
  private async syncReplayToCourse(roomId: string, courseId: string, replayUrl: string, roomTitle: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return;

    // 腾讯云可能重复投递同一录制回调；以课程+媒体地址做持久化幂等保护。
    const existing = await this.prisma.courseChapter.findFirst({ where: { courseId, mediaUrl: replayUrl } });
    if (existing) return;

    // 获取当前课程的最大 sortOrder
    const lastChapter = await this.prisma.courseChapter.findFirst({
      where: { courseId },
      orderBy: { sortOrder: "desc" },
    });
    const sortOrder = (lastChapter?.sortOrder ?? 0) + 1;

    await this.prisma.courseChapter.create({
      data: {
        courseId,
        title: `直播回放: ${roomTitle}`,
        mediaUrl: replayUrl,
        duration: 0,
        sortOrder,
        freeTrial: false,
      },
    });

    this.logger.log(`直播间 ${roomId} 回放已同步为课程 ${courseId} 的章节`);
  }

  /** 推流配置 — 返回带防盗链签名的推流地址/密钥/推荐参数 */
  async getStreamConfig(_userId: string) {
    // 安全：streamName 经服务端密钥派生(不可从 userId 直接推算、且不泄露 userId)；
    // 推流地址统一走 LiveStreamService 生成(含 txSecret 防盗链签名)，杜绝原先「可预测 streamKey + 无签名裸流」被劫持推流的风险。
    const seed = _userId + (process.env.LIVE_PUSH_KEY || "guoxue-live");
    const streamName = "u" + createHash("sha256").update(seed).digest("hex").slice(0, 24);
    const fullPush = this.stream.genPushUrl(streamName);
    const playUrls = this.stream.genPlayUrls(streamName);

    // 拆为 OBS 所需的「服务器地址 + 流密钥(含签名)」两段；域名未配置时 fullPush 为空，降级返回空串而非硬编码假域名
    let streamUrl = "";
    let streamKey = streamName;
    const sepIdx = fullPush.indexOf(streamName);
    if (sepIdx > 0) {
      streamUrl = fullPush.slice(0, sepIdx);
      streamKey = fullPush.slice(sepIdx);
    }

    return {
      roomTitle: "我的直播间",
      roomId: _userId.slice(0, 8),
      streamUrl,
      streamKey,
      playUrl: playUrls.flv,
      recommendedSettings: {
        resolution: "1920×1080",
        bitrate: "4000 Kbps",
        fps: 30,
        encoder: "H.264 (x264)",
      },
    };
  }

  // ───────── 公开浏览服务 ─────────

  private calcDuration(start?: Date | null, end?: Date | null): number {
    if (start && end) return Math.floor((end.getTime() - start.getTime()) / 1000);
    return 0;
  }

  async getHosts(filter?: string, viewerId?: string) {
    let followedHostIds: string[] | undefined;
    if (filter === "followed") {
      if (!viewerId) return { items: [], total: 0 };
      const follows = await this.prisma.follow.findMany({
        where: { userId: viewerId },
        select: { followedUserId: true },
      });
      followedHostIds = follows.map((item) => item.followedUserId);
      if (!followedHostIds.length) return { items: [], total: 0 };
    }

    const rooms = await this.prisma.liveRoom.findMany({
      where: {
        status: filter === "live" ? "LIVING" : undefined,
        visibility: "PLATFORM",
        auditStatus: "APPROVED",
        ...(followedHostIds ? { hostUserId: { in: followedHostIds } } : {}),
      },
      select: { id: true, cover: true, status: true, viewCount: true, hostUserId: true },
      take: 100,
      orderBy: { viewCount: "desc" },
    });

    const representative = new Map<string, typeof rooms[number]>();
    const liveCounts = new Map<string, number>();
    for (const room of rooms) {
      liveCounts.set(room.hostUserId, (liveCounts.get(room.hostUserId) || 0) + 1);
      const current = representative.get(room.hostUserId);
      if (!current || (current.status !== "LIVING" && room.status === "LIVING")) {
        representative.set(room.hostUserId, room);
      }
    }
    const hostIds = [...representative.keys()];
    if (!hostIds.length) return { items: [], total: 0 };

    const [users, followerRows] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: hostIds } },
        select: { id: true, nickname: true, avatar: true, bio: true, identityVerified: true },
      }),
      this.prisma.follow.findMany({
        where: { followedUserId: { in: hostIds } },
        select: { followedUserId: true },
      }),
    ]);
    const userMap = new Map(users.map((user) => [user.id, user]));
    const followerCounts = new Map<string, number>();
    for (const row of followerRows) {
      followerCounts.set(row.followedUserId, (followerCounts.get(row.followedUserId) || 0) + 1);
    }
    const onlineByRoom = new Map<string, number>(await Promise.all(
      [...representative.values()].map(async (room) => [
        room.id,
        room.status === "LIVING" && this.presence ? await this.presence.getOnlineCount(room.id) : 0,
      ] as [string, number]),
    ));

    const items = [...representative.entries()].map(([hostId, room]) => {
      const user = userMap.get(hostId);
      return {
        id: room.id,
        name: user?.nickname || "主播",
        avatar: user?.avatar || "",
        cover: room.cover || user?.avatar || "",
        specialty: user?.bio || "",
        followers: followerCounts.get(hostId) || 0,
        likes: 0,
        liveCount: liveCounts.get(hostId) || 0,
        rating: 0,
        isLive: room.status === "LIVING",
        viewerCount: room.status === "LIVING" ? (onlineByRoom.get(room.id) || 0) : room.viewCount,
        tags: [],
        verified: !!user?.identityVerified,
      };
    });
    return { items, total: items.length };
  }

  async getReplays(sortBy?: string) {
    const rooms = await this.prisma.liveRoom.findMany({
      // 回放列表含「已结束(ENDED)」与「已生成回放(REPLAY)」两态（原仅 ENDED 漏掉 REPLAY 房）
      where: { status: { in: ["ENDED", "REPLAY"] }, replayVisibility: "PLATFORM", auditStatus: "APPROVED" },
      select: { id: true, title: true, cover: true, replayUrl: true, viewCount: true, startTime: true, endTime: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
      take: 20,
      orderBy: sortBy === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' },
    });
    return { items: rooms.map(r => ({ id: r.id, title: r.title, cover: r.cover || '', replayUrl: r.replayUrl || '', hostName: r.user?.nickname || '', hostAvatar: r.user?.avatar || '', category: '', viewers: r.viewCount, duration: this.calcDuration(r.startTime, r.endTime), dateText: r.createdAt.toISOString().slice(0, 10) })), total: rooms.length };
  }

  async getPreview(id: string, viewerId?: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      include: { user: { select: { id: true, nickname: true, avatar: true, bio: true } } },
    });
    const isOwner = !!room && !!viewerId && (room.hostUserId === viewerId || room.userId === viewerId);
    if (!room || (!isOwner && (room.visibility === "SELF_ONLY" || room.auditStatus === "REJECTED"))) {
      throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    }

    const host = room.hostUserId === room.userId
      ? room.user
      : await this.prisma.user.findUnique({
          where: { id: room.hostUserId },
          select: { id: true, nickname: true, avatar: true, bio: true },
        });
    const key = `live:bookings:${id}`;
    const [bookedCount, isBooked, hostFollowers] = await Promise.all([
      this.redis.scard(key).catch(() => 0),
      viewerId ? this.redis.sismember(key, viewerId).catch(() => false) : false,
      this.prisma.follow.count({ where: { followedUserId: room.hostUserId } }).catch(() => 0),
    ]);
    const durationSeconds = this.calcDuration(room.startTime, room.endTime);

    return {
      id: room.id,
      title: room.title,
      cover: room.cover || "",
      hostId: room.hostUserId,
      hostName: host?.nickname || "主播",
      hostAvatar: host?.avatar || "",
      hostFollowers,
      bookedCount,
      estimatedDuration: durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : 60,
      scheduledAt: room.startTime?.toISOString() || "",
      status: room.status,
      tags: [],
      descriptionLines: room.description
        ? room.description.split(/\r?\n/).filter(Boolean)
        : host?.bio ? [host.bio] : [],
      isBooked,
    };
  }

  async getReplayDetail(id: string) {
    const room = await this.prisma.liveRoom.findFirst({ where: { id, status: { in: ['ENDED', 'REPLAY'] } }, include: { user: { select: { nickname: true, avatar: true } } } });
    if (!room) return null;
    return { id: room.id, title: room.title, cover: room.cover || '', hostName: room.user?.nickname || '', hostAvatar: room.user?.avatar || '', duration: this.calcDuration(room.startTime, room.endTime), viewerCount: room.viewCount, chapters: [], discussions: [], qaList: [], products: [] };
  }

  async getEndRoom(id: string) {
    const room = await this.prisma.liveRoom.findFirst({ where: { id, status: { in: ['ENDED', 'REPLAY'] } }, include: { user: { select: { nickname: true, avatar: true } } } });
    if (!room) return null;
    // 聚合本场真实运行数据（峰值/获赞次数/打赏笔数），无数据则 0（不再硬编码假 0）
    const [peakMinute, likeSum, giftAgg] = await Promise.all([
      this.prisma.liveMinuteData.findFirst({ where: { roomId: id }, orderBy: { onlineCount: "desc" }, select: { onlineCount: true } }),
      this.prisma.liveMinuteData.aggregate({ where: { roomId: id }, _sum: { likeCount: true } }),
      this.prisma.giftRecord.aggregate({ where: { liveRoomId: id }, _sum: { totalCoin: true } }),
    ]);
    return {
      room: {
        id: room.id, title: room.title, cover: room.cover || '',
        hostName: room.user?.nickname || '', hostAvatar: room.user?.avatar || '',
        viewerCount: room.viewCount,
        peakViewers: peakMinute?.onlineCount || 0,
        duration: this.calcDuration(room.startTime, room.endTime),
        likeCount: Number(likeSum._sum.likeCount || 0),
        giftCoin: Number(giftAgg._sum.totalCoin || 0), // 打赏金币总额
        hasReplay: room.status === "REPLAY",
      },
      recommendLives: [],
      recommendCourses: [],
    };
  }
}
