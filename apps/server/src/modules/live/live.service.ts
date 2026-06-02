import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Cacheable } from "../../common/cache.decorator";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { LiveStreamService } from "./live-stream.service";
import { WebhookService } from "../webhook/webhook.service";
import { CreateRoomDto, UpdateRoomDto } from "./live.dto";
import { Prisma, LiveStatus } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CoinService } from "../coin/coin.service";

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private stream: LiveStreamService,
    private webhook: WebhookService,
    @Optional() private coin?: CoinService,
  ) {}

  async createRoom(userId: string, dto: CreateRoomDto) {
    const data: Record<string, unknown> = {
      userId,
      title: dto.title,
      cover: dto.cover,
      circleId: dto.circleId,
      hostUserId: dto.hostUserId || userId,
      hostType: dto.circleId ? "CIRCLE_OWNER" : "STATION_MASTER",
      coHostIds: dto.coHostIds || [],
      chargeType: dto.chargeType || "FREE",
      chargePrice: dto.chargePrice,
      status: "WAITING",
      ...(dto.courseId ? { courseId: dto.courseId } : {}),
      ...(dto.stationId ? { stationId: dto.stationId } : {}),
      ...(dto.productIds?.length ? { products: { create: dto.productIds.map(productId => ({ productId })) } } : {}),
    };

    return this.prisma.liveRoom.create({ data: data as Prisma.LiveRoomCreateInput, include: { products: true } });
  }

  async updateRoom(userId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id }, select: { hostUserId: true } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能修改自己的直播间");
    return this.prisma.liveRoom.update({ where: { id }, data: dto as unknown as Prisma.LiveRoomUpdateInput });
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

    return this.prisma.liveRoom.update({ where: { id }, data: data as Prisma.LiveRoomUpdateInput });
  }

  /** 开始直播，自动生成推拉流地址 */
  async startLive(id: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "WAITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "只能在等待状态开始直播");

    const streamKey = `room_${id}`;
    const pushUrl = this.stream.genPushUrl(streamKey);
    const playUrls = this.stream.genPlayUrls(streamKey);

    const result = await this.updateStatus(id, "LIVING", {
      pushUrl,
      pullUrl: JSON.stringify(playUrls),
      trtcRoomId: streamKey,
    });

    this.webhook.fire("LIVE_STARTED", {
      roomId: id,
      title: room.title,
      hostUserId: room.hostUserId,
      circleId: room.circleId,
    }).catch((e: unknown) => this.logger.warn("LIVE_STARTED webhook 发送失败", e instanceof Error ? e.message : String(e)));

    return result;
  }

  /** 获取指定房间的推/拉流地址（主播用） */
  async getStreamUrls(id: string, userId?: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (userId && room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播可获取推流地址");

    const streamKey = `room_${id}`;
    return {
      pushUrl: room.status === "LIVING" ? room.pushUrl : this.stream.genPushUrl(streamKey),
      playUrls: this.stream.genPlayUrls(streamKey),
    };
  }

  /** 获取观众拉流地址（可带鉴权） */
  async getPlayUrl(id: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");

    const streamKey = `room_${id}`;
    return this.stream.genPlayUrlWithAuth(streamKey, userId);
  }

  async endRoom(id: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id } });
    const result = await this.updateStatus(id, "ENDED");

    this.webhook.fire("LIVE_ENDED", {
      roomId: id,
      title: room?.title,
    }).catch((e: unknown) => this.logger.warn("LIVE_ENDED webhook 发送失败", e instanceof Error ? e.message : String(e)));

    return result;
  }

  @Cacheable({ key: (args: any[]) => `live:rooms:${args[0] || "all"}:${args[1]}:${args[2]}:${args[3] || ""}:${args[4] || ""}`, ttl: 15 })
  async listRooms(status?: string, page = 1, pageSize = 20, circleId?: string, stationId?: string) {
    const where: Prisma.LiveRoomWhereInput = {};
    if (status) where.status = status as LiveStatus;
    if (circleId) where.circleId = circleId;
    if (stationId) where.stationId = stationId;

    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.liveRoom.count({ where }),
    ]);

    return { rooms, total, page, pageSize };
  }

  async getRoom(id: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
        products: true,
      },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);

    await this.prisma.liveRoom.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return room;
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
  async listScheduled(page = 1, pageSize = 10, stationId?: string) {
    const where: Prisma.LiveRoomWhereInput = { status: "WAITING" as LiveStatus, startTime: { gte: new Date() } };
    if (stationId) where.stationId = stationId;
    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        select: {
          id: true, title: true, cover: true, startTime: true, endTime: true,
          userId: true,
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
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
  async getBookingCount(roomId: string) {
    const key = `live:bookings:${roomId}`;
    const count = await this.redis.scard(key);
    return { roomId, bookingCount: count };
  }

  /** 处理腾讯云直播回调事件 */
  async handleLiveEvent(streamKey: string, eventType: number, body: Record<string, unknown>) {
    const roomId = streamKey.replace("room_", "");

    switch (eventType) {
      case 0: // 断流
        this.logger.log(`直播间 ${roomId} 断流`);
        break;
      case 1: // 推流
        this.logger.log(`直播间 ${roomId} 开始推流`);
        break;
      case 100: { // 录制回调
        const videoUrl = (body.video_url || body.file_url) as string;
        if (videoUrl && roomId) {
          const room = await this.prisma.liveRoom.findUnique({
            where: { id: roomId },
            select: { id: true, courseId: true, title: true },
          });
          await this.prisma.liveRoom.update({
            where: { id: roomId },
            data: { replayUrl: videoUrl as string, status: "REPLAY" as const },
          });
          // 关联了课程 → 回放自动同步为课程章节
          if (room?.courseId) {
            await this.syncReplayToCourse(roomId, room.courseId, videoUrl as string, room.title).catch((e: unknown) => {
              this.logger.warn(`回放同步课程章节失败: ${roomId}: ${e instanceof Error ? e.message : String(e)}`);
            });
          }
        }
        break;
      }
      case 200: // 截图回调
        this.logger.log(`直播间 ${roomId} 截图: ${body.pic_url || body.file_url}`);
        break;
    }
  }

  // ───────── 麦位管理 ─────────

  /** 用户上麦 */
  async joinMic(roomId: string, userId: string, position: number) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);

    // 检查麦位是否已被占用
    const existing = await this.prisma.liveMic.findUnique({
      where: { liveRoomId_position: { liveRoomId: roomId, position } },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该麦位已被占用");

    try {
      return this.prisma.liveMic.create({
        data: { liveRoomId: roomId, userId, position, status: "OCCUPIED" },
      });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) throw new BusinessException(ErrorCode.BAD_REQUEST, "该麦位已被占用");
      throw e;
    }
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
    if (!mic) throw new BusinessException(ErrorCode.NOT_FOUND, "未在麦位上");
    await this.prisma.liveMic.delete({ where: { id: mic.id } });
    return { success: true };
  }

  /** 麦位操作（静音/解除静音/踢人） */
  async manageMic(roomId: string, operatorId: string, dto: { userId: string; position?: number; action?: string }) {
    const where: Prisma.LiveMicWhereInput = { liveRoomId: roomId, userId: dto.userId };
    if (dto.position) where.position = dto.position;

    const mic = await this.prisma.liveMic.findFirst({ where });
    if (!mic) throw new BusinessException(ErrorCode.NOT_FOUND, "未在麦位上");

    switch (dto.action) {
      case "MUTE":
        return this.prisma.liveMic.update({ where: { id: mic.id }, data: { status: "MUTED" } });
      case "UNMUTE":
        return this.prisma.liveMic.update({ where: { id: mic.id }, data: { status: "OCCUPIED" } });
      case "KICK":
        await this.prisma.liveMic.delete({ where: { id: mic.id } });
        return { success: true };
      default:
        throw new BusinessException(ErrorCode.BAD_REQUEST, "无效操作");
    }
  }

  /** 获取麦位列表 */
  async listMics(roomId: string) {
    return this.prisma.liveMic.findMany({
      where: { liveRoomId: roomId },
      orderBy: { position: "asc" },
    });
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

  /** 禁言用户 */
  async muteUser(roomId: string, operatorId: string, dto: { userId: string; durationMinutes?: number }) {
    const expiresAt = dto.durationMinutes
      ? new Date(Date.now() + dto.durationMinutes * 60000)
      : null;

    return this.prisma.liveMutedUser.upsert({
      where: { liveRoomId_userId: { liveRoomId: roomId, userId: dto.userId } },
      create: { liveRoomId: roomId, userId: dto.userId, mutedBy: operatorId, expiresAt },
      update: { mutedBy: operatorId, mutedAt: new Date(), expiresAt },
    });
  }

  /** 解除禁言（主播或管理员操作） */
  async unmuteUser(roomId: string, userId: string, operatorId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId }, select: { hostUserId: true } });
    if (!room || room.hostUserId !== operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有主播可以解除禁言");
    await this.prisma.liveMutedUser.deleteMany({
      where: { liveRoomId: roomId, userId },
    });
    return { success: true };
  }

  /** 获取禁言列表 */
  async listMutedUsers(roomId: string) {
    return this.prisma.liveMutedUser.findMany({
      where: { liveRoomId: roomId },
      orderBy: { mutedAt: "desc" },
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

  // ───────── 直播评论与点赞 ─────────

  /** 发送直播评论/弹幕 */
  async sendComment(roomId: string, userId: string, content: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");

    const muted = await this.isUserMuted(roomId, userId);
    if (muted) throw new BusinessException(ErrorCode.BAD_REQUEST, "您已被禁言");

    const comment = await this.prisma.comment.create({
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

    return comment;
  }

  /** 直播点赞 */
  async toggleLike(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");

    await this.prisma.like.create({
      data: {
        targetType: "LIVESTREAM",
        targetId: roomId,
        userId,
      },
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
  async listAuditLogs(roomId: string, page = 1, pageSize = 20) {
    const [logs, total] = await Promise.all([
      this.prisma.liveAuditLog.findMany({
        where: { liveRoomId: roomId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.liveAuditLog.count({ where: { liveRoomId: roomId } }),
    ]);
    return { logs, total, page, pageSize };
  }

  // ───────── 礼物系统 ─────────

  /** 获取可发送的礼物列表 */
  async listGifts() {
    return this.prisma.gift.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
    });
  }

  /** 发送礼物 */
  async sendGift(roomId: string, userId: string, giftId: string, quantity: number = 1) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.status !== "LIVING") throw new BusinessException(ErrorCode.BAD_REQUEST, "直播未开始或已结束");

    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift || gift.status !== "ACTIVE") throw new BusinessException(ErrorCode.NOT_FOUND, "礼物不存在或已下架");

    const totalCoin = gift.priceCoin * quantity;

    if (this.coin) {
      await this.coin.spend(userId, {
        amountCoin: totalCoin,
        scene: "LIVE_GIFT",
        refId: giftId,
        description: `在直播间 ${room.title} 送出 ${gift.name} x${quantity}`,
      });
    }

    const record = await this.prisma.giftRecord.create({
      data: {
        userId,
        liveRoomId: roomId,
        toUserId: room.hostUserId,
        giftId,
        quantity,
        totalCoin,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        gift: { select: { id: true, name: true, icon: true, level: true } },
      },
    });

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

  /** 直播间礼物排行榜 */
  async giftRanking(roomId: string, limit: number = 20) {
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
  async listCourseRooms(courseId: string, page = 1, pageSize = 20, stationId?: string) {
    const where: Prisma.LiveRoomWhereInput = { courseId };
    if (stationId) where.stationId = stationId;
    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { products: true } },
        },
        skip: (page - 1) * pageSize,
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
}
