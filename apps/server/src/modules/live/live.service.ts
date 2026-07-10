import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Cacheable } from "../../common/cache.decorator";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { LiveStreamService } from "./live-stream.service";
import { createHash } from "crypto";
import { WebhookService } from "../webhook/webhook.service";
import { CreateRoomDto, UpdateRoomDto } from "./live.dto";
import { Prisma, LiveStatus } from "@prisma/client";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { CoinService } from "../coin/coin.service";
import { RevenueService } from "../revenue/revenue.service";
import { AuditService } from "../audit/audit.service";
import { safePagination } from "../../common/pagination";

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private stream: LiveStreamService,
    private webhook: WebhookService,
    private audit: AuditService,
    @Optional() private coin?: CoinService,
    @Optional() private revenue?: RevenueService,
  ) {}

  async createRoom(userId: string, dto: CreateRoomDto, isAdmin = false) {
    // 开播前机审封面/标题（直播实时内容走 LiveAuditLog 机审）
    await this.audit.moderateTextOrThrow(dto.title, { scene: "LIVE", userId });
    await this.audit.moderateImageOrThrow(dto.cover, { scene: "LIVE", userId });

    // 开放范围分流：CIRCLE_ONLY 圈内直生效；PLATFORM 须平台审核（管理员/官方圈自动过审）
    const { visibility, auditStatus } = await this.audit.resolveContentVisibility({
      visibility: dto.visibility,
      circleId: dto.circleId,
      isAdmin,
    });

    const data: Record<string, unknown> = {
      userId,
      title: dto.title,
      cover: dto.cover,
      circleId: dto.circleId,
      hostUserId: dto.hostUserId || userId,
      hostType: dto.circleId ? "CIRCLE_OWNER" : "STATION_MASTER",
      coHostIds: dto.coHostIds || [],
      quality: dto.quality || "basic",
      chargeType: dto.chargeType || "FREE",
      chargePrice: dto.chargePrice,
      status: "WAITING",
      visibility,
      auditStatus,
      replayVisibility: dto.replayVisibility || "CIRCLE_ONLY",
      replayCharge: dto.replayCharge ?? false,
      ...(dto.startTime ? { startTime: new Date(dto.startTime) } : {}),
      ...(dto.courseId ? { courseId: dto.courseId } : {}),
      ...(dto.stationId ? { stationId: dto.stationId } : {}),
      ...(dto.productIds?.length ? { products: { create: dto.productIds.map(productId => ({ productId })) } } : {}),
    };

    const room = await this.prisma.liveRoom.create({ data: data as Prisma.LiveRoomCreateInput, include: { products: true } });

    if (auditStatus === "PENDING") {
      await this.audit.openContentAudit({ contentType: "LIVE", contentId: room.id, circleId: dto.circleId, submitterId: userId });
    }

    return room;
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

    // 分档播放：basic=原流(零转码成本)；hd/uhd=腾讯云转码流(推流后自动产出 {stream}_{模板名})
    // 转码模板已在生产创建并绑定 test.rebugx.com/live：hd720 / hd1080
    const baseKey = `room_${id}`;
    const quality = (room as { quality?: string }).quality || "basic";
    const streamKey =
      quality === "hd" ? `${baseKey}_hd720` : quality === "uhd" ? `${baseKey}_hd1080` : baseKey;
    return { ...this.stream.genPlayUrlWithAuth(streamKey, userId), quality };
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

  @Cacheable({ key: (args: any[]) => `live:rooms:${args[0] || "all"}:${args[1]}:${args[2]}:${args[3] || ""}:${args[4] || ""}:${args[5] || ""}`, ttl: 15 })
  async listRooms(status?: string, rawPage = 1, rawPageSize = 20, circleId?: string, stationId?: string, scope?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.LiveRoomWhereInput = {};
    if (status) where.status = status as LiveStatus;
    if (circleId) where.circleId = circleId;
    if (stationId) where.stationId = stationId;
    // 平台公共池（直播广场·未按圈子过滤·非管理端 scope=all）：只出「全平台开放+审核通过」——绝不展示他圈封闭直播
    if (!circleId && scope !== "all") {
      where.visibility = "PLATFORM";
      where.auditStatus = "APPROVED";
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

    return { rooms, total, page, pageSize };
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
        chargeType: r.chargeType,
        startTime: r.startTime,
        endTime: r.endTime,
        createdAt: r.createdAt,
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
    const where: Prisma.ProductWhereInput = {};
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

  /** 主播直播间设置 — 资料取自用户档案；通知/隐私为默认偏好（上线接偏好存储表后改为读取持久值） */
  async getStreamerSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, avatar: true, bio: true },
    });
    return {
      profile: { name: user?.nickname || "我的直播间", desc: user?.bio || "", cover: user?.avatar || "" },
      notify: { newViewer: true, reward: true, comment: false, order: true },
      privacy: { allowComment: true, allowGift: true, showViewCount: true, autoRecord: true },
    };
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
      select: { hostUserId: true, viewCount: true, title: true },
    });
    if (!room) throw new BusinessException(ErrorCode.LIVE_ROOM_NOT_FOUND);
    if (room.hostUserId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问该直播间");

    const [minuteAgg, giftAgg, orderAgg, commentCount, likeCount, uniqueGifters, comments, liveProds] = await Promise.all([
      this.prisma.liveMinuteData.aggregate({ where: { roomId }, _max: { onlineCount: true }, _avg: { onlineCount: true } }),
      this.prisma.giftRecord.aggregate({ where: { liveRoomId: roomId }, _sum: { totalCoin: true } }),
      this.prisma.order.aggregate({ where: { type: "LIVESTREAM", targetId: roomId, status: { in: ["PAID", "COMPLETED"] } }, _sum: { amount: true } }),
      this.prisma.comment.count({ where: { targetType: "LIVESTREAM", targetId: roomId } }),
      this.prisma.like.count({ where: { targetType: "LIVESTREAM", targetId: roomId } }),
      this.prisma.giftRecord.groupBy({ by: ["userId"], where: { liveRoomId: roomId } }).then((r) => r.length),
      this.prisma.comment.findMany({ where: { targetType: "LIVESTREAM", targetId: roomId }, orderBy: { createdAt: "desc" }, take: 20, select: { content: true, createdAt: true, userId: true } }),
      this.prisma.liveProduct.findMany({ where: { liveId: roomId }, select: { productId: true }, orderBy: { sortOrder: "asc" } }),
    ]);

    const totalViews = room.viewCount;
    const stats = {
      onlineCount: Math.round(minuteAgg._avg.onlineCount || 0),
      totalViews,
      newFollowers: uniqueGifters,
      totalGift: Number(giftAgg._sum.totalCoin || 0),
      totalSales: Number(orderAgg._sum.amount || 0),
      peakOnline: minuteAgg._max.onlineCount || 0,
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
    const danmaku = comments.map((c, i) => ({ id: i + 1, user: nick.get(c.userId) || "观众", content: c.content, time: fmtTime(c.createdAt), level: 1, isVip: false }));

    const prodIds = liveProds.map((p) => p.productId);
    const prodDetails = await this.prisma.product.findMany({ where: { id: { in: prodIds } }, select: { id: true, title: true, price: true, stock: true, salesCount: true } });
    const prodMap = new Map(prodDetails.map((p) => [p.id, p]));
    const products = liveProds.map((lp, i) => {
      const p = prodMap.get(lp.productId);
      return { id: i + 1, name: p?.title || "商品", price: p ? Number(p.price) : 0, stock: p?.stock || 0, sold: p?.salesCount || 0, isLive: i === 0, isHot: (p?.salesCount || 0) > 0 };
    });

    // 连麦请求 / 提词器脚本无对应数据源 → 空（前端降级）
    return { title: room.title, stats, danmaku, requests: [], products, script: [] };
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
  async listScheduled(rawPage = 1, rawPageSize = 10, stationId?: string) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
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

    // 扣币与打赏记录在同一事务
    const record = await this.prisma.$transaction(async (tx) => {
      if (this.coin) {
        await this.coin.spend(userId, {
          amountCoin: totalCoin,
          scene: "LIVE_GIFT",
          refId: giftId,
          description: `在直播间 ${room.title} 送出 ${gift.name} x${quantity}`,
        }, tx);
      }

      const giftRecord = await tx.giftRecord.create({
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

      // 打赏分账：主播实时入账 50%（平台留 50%·2026-07-01 业务规则），同一事务原子。
      // 董事长拍板 2026-07-10：打赏金币与平台虚拟币消费通用——主播分成直接进金币余额（可消费直播画质/咨询等虚拟币项目），
      // 不再记 UserEarning RMB 提现收益（避免双记；历史 UserEarning 记录保留不动）。
      if (this.coin && room.hostUserId && room.hostUserId !== userId) {
        const hostCoin = Math.floor(totalCoin * 0.5);
        if (hostCoin > 0) {
          await this.coin.income(room.hostUserId, {
            amountCoin: hostCoin,
            scene: "LIVE_GIFT_INCOME",
            refId: giftRecord.id,
            description: `直播间 ${room.title} 收到 ${gift.name} x${quantity} 打赏分成（50%）`,
          }, tx);
        }
      }

      return giftRecord;
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

  async getHosts(filter?: string) {
    const rooms = await this.prisma.liveRoom.findMany({
      where: { status: filter === 'live' ? 'LIVING' : undefined },
      select: { id: true, cover: true, status: true, viewCount: true, user: { select: { nickname: true, avatar: true } } },
      take: 20, orderBy: { viewCount: 'desc' },
    });
    return { items: rooms.map(r => ({ id: r.id, name: r.user?.nickname || '', avatar: r.user?.avatar || '', cover: r.cover || '', specialty: '', followers: 0, likes: 0, liveCount: 0, rating: 4.5, isLive: r.status === 'LIVING', viewerCount: r.viewCount, tags: [], verified: false })), total: rooms.length };
  }

  async getReplays(sortBy?: string) {
    const rooms = await this.prisma.liveRoom.findMany({
      // 回放列表含「已结束(ENDED)」与「已生成回放(REPLAY)」两态（原仅 ENDED 漏掉 REPLAY 房）
      where: { status: { in: ['ENDED', 'REPLAY'] } },
      select: { id: true, title: true, cover: true, viewCount: true, startTime: true, endTime: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
      take: 20,
      orderBy: sortBy === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' },
    });
    return { items: rooms.map(r => ({ id: r.id, title: r.title, cover: r.cover || '', hostName: r.user?.nickname || '', hostAvatar: r.user?.avatar || '', category: '', viewers: r.viewCount, duration: this.calcDuration(r.startTime, r.endTime), dateText: r.createdAt.toISOString().slice(0, 10) })), total: rooms.length };
  }

  async getPreview(id: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id }, include: { user: { select: { nickname: true, avatar: true } } } });
    if (!room) return null;
    return { id: room.id, title: room.title, cover: room.cover || '', hostName: room.user?.nickname || '', hostAvatar: room.user?.avatar || '', hostFollowers: 0, bookedCount: 0, estimatedDuration: this.calcDuration(room.startTime, room.endTime) || 60, scheduledAt: room.startTime, tags: [], descriptionLines: [] };
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
