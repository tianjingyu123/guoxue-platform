import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { VodService } from "./vod.service";
import { Cacheable, CacheEvict } from "../../common/cache.decorator";
import { Prisma } from "@prisma/client";
import { isUniqueConstraintError } from "../../common/prisma-errors";
import { AuditService } from "../audit/audit.service";
import { safePagination } from "../../common/pagination";
import { publicQuarantinedIds } from "../../common/public-content-quarantine";

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private vod: VodService,
    private auditService: AuditService,
  ) {}

  /** circleId 缺省时兜底为「官方圈子」(id 存 ConfigSystem.official_circle_id·由后台/脚本一次性写入)。未配置则保持 undefined(游离·兼容旧行为)。 */
  private async resolveCircleId(circleId?: string): Promise<string | undefined> {
    if (circleId) return circleId;
    const cfg = await this.prisma.configSystem.findUnique({ where: { configKey: "official_circle_id" } });
    return cfg?.configValue || undefined;
  }

  /**
   * 反转义历史坏数据：旧版 SanitizePipe 曾把 URL 字段 HTML 实体转义后入库
   * （https:&#x2F;&#x2F;... 使 <video src> 无效 → 「新上传视频播不了」的真凶）。
   * 入口白名单已修（sanitize.pipe SKIP_FIELDS 已含 videoUrl/coverUrl），此处对读取路径防御性归一化，
   * 存量数据另有 prisma/manual/20260710-fix-video-url-html-escape.sql 幂等修复。
   */
  private static unescapeHtmlUrl<T extends string | null | undefined>(s: T): T {
    if (!s || !s.includes("&")) return s;
    return s
      .replace(/&amp;/g, "&")
      .replace(/&#x2F;/g, "/")
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">") as T;
  }

  /** 归一化单条视频的 URL 字段（就地修改并返回，供 list/getDetail 读取路径复用） */
  private normalizeVideoUrls<T extends { videoUrl?: string | null; coverUrl?: string | null }>(v: T): T {
    if (v) {
      v.videoUrl = VideoService.unescapeHtmlUrl(v.videoUrl);
      v.coverUrl = VideoService.unescapeHtmlUrl(v.coverUrl);
    }
    return v;
  }

  @CacheEvict({ key: "video:list:*", pattern: true })
  async create(userId: string, dto: { circleId?: string; title?: string; description?: string; videoUrl: string; coverUrl?: string; duration?: number; tags?: string[]; isPrivate?: boolean; visibility?: string; products?: string[]; stationId?: string }, isAdmin = false) {
    // 带货商品去重 + 限 5 件
    const productIds = Array.from(new Set((dto.products ?? []).filter(Boolean))).slice(0, 5);
    // 短视频=圈子内容：未指定圈子时兜底落「官方圈子」(供 AI/后台自动发布种子内容，人工前端在圈子内发时会带上下文 circleId)
    const circleId = await this.resolveCircleId(dto.circleId);
    // 审核无感化（20260711 第八节）：发布即可见（instantPublish），机审改异步分级处置（pass 不动 / mild 降 SELF_ONLY / severe 下架+通知）
    const { visibility, auditStatus } = await this.auditService.resolveContentVisibility({
      visibility: dto.visibility,
      circleId,
      isAdmin,
      instantPublish: true,
    });
    const video = await this.prisma.video.create({
      data: {
        userId,
        circleId,
        title: dto.title,
        description: dto.description,
        videoUrl: dto.videoUrl,
        coverUrl: dto.coverUrl,
        duration: dto.duration,
        tags: (dto.tags ?? []).slice(0, 5),
        isPrivate: dto.isPrivate ?? false,
        visibility,
        auditStatus,
        stationId: dto.stationId || undefined,
        products: productIds.length
          ? { create: productIds.map((productId, i) => ({ productId, sortOrder: i })) }
          : undefined,
      },
    });
    if (auditStatus === "PENDING") {
      await this.auditService.openContentAudit({ contentType: "VIDEO", contentId: video.id, circleId, submitterId: userId });
    }
    // 异步机审（fire-and-forget·不阻塞发布响应）：标题+简介文本 / 封面图 / 视频画面+音频（VM·耗时轮询）
    this.auditService.queueContentModeration({
      contentType: "VIDEO",
      contentId: video.id,
      userId,
      circleId,
      text: [dto.title, dto.description].filter(Boolean).join(" "),
      images: dto.coverUrl,
      video: dto.videoUrl,
    });
    return video;
  }

  @CacheEvict({ key: (args) => `video:detail:${args[1]}`, pattern: true })
  @CacheEvict({ key: "video:list:*", pattern: true })
  async update(userId: string, id: string, dto: { title?: string; coverUrl?: string; status?: string }) {
    const video = await this.prisma.video.findUnique({ where: { id }, select: { userId: true } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    if (video.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能修改自己的视频");
    const updated = await this.prisma.video.update({ where: { id }, data: dto as Prisma.VideoUpdateInput });
    // 改标题/封面同样先生效后异步机审（审核无感化）
    if (dto.title || dto.coverUrl) {
      this.auditService.queueContentModeration({ contentType: "VIDEO", contentId: id, userId, text: dto.title, images: dto.coverUrl });
    }
    return updated;
  }

  @CacheEvict({ key: (args) => `video:detail:${args[1]}`, pattern: true })
  @CacheEvict({ key: "video:list:*", pattern: true })
  async delete(userId: string, id: string) {
    const video = await this.prisma.video.findUnique({ where: { id }, select: { userId: true } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    if (video.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能删除自己的视频");
    await this.prisma.video.delete({ where: { id } });
    return { success: true };
  }

  /** 管理端审核：approve → PUBLISHED；reject → REJECTED（记录原因） */
  @CacheEvict({ key: (args) => `video:detail:${args[0]}`, pattern: true })
  @CacheEvict({ key: "video:list:*", pattern: true })
  async audit(id: string, action: "approve" | "reject", reason?: string) {
    const video = await this.prisma.video.findUnique({ where: { id }, select: { id: true } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    const data: Prisma.VideoUpdateInput =
      action === "approve"
        ? { status: "PUBLISHED", auditReason: null }
        : { status: "REJECTED", auditReason: reason ?? null };
    return this.prisma.video.update({ where: { id }, data });
  }

  @Cacheable({ key: (args) => `video:list:v2:${JSON.stringify(args[0])}`, ttl: 60 })
  async list(params: { circleId?: string; status?: string; page?: number; pageSize?: number; stationId?: string; scope?: string }) {
    const { circleId, status, stationId, scope } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const where: Prisma.VideoWhereInput = {};
    if (circleId) where.circleId = circleId;
    if (status) where.status = status;
    else where.status = "PUBLISHED";
    if (stationId) where.stationId = stationId;
    // 平台公共池（未按圈子过滤·非管理端 scope=all）：只出「全平台开放+审核通过+非私密」——绝不展示他圈封闭作品
    if (!circleId && scope !== "all") {
      where.visibility = "PLATFORM";
      where.auditStatus = "APPROVED";
      where.isPrivate = false;
    } else if (circleId && scope !== "all") {
      // 圈内列表：机审降级 SELF_ONLY 的作品仅作者本人可见（走「我的作品」），圈内流不出
      where.visibility = { not: "SELF_ONLY" };
    }
    if (scope !== "all") where.id = { notIn: publicQuarantinedIds("video") };

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.video.count({ where }),
    ]);

    return { videos: videos.map((v) => this.normalizeVideoUrls(v)), total, page, pageSize };
  }

  /**
   * 详情（带可见性收口）：SELF_ONLY / 已下架(REJECTED) 内容仅作者本人可访问，他人一律 404。
   * 校验放在缓存读取之后（getDetailRaw 的缓存 key 只含 id，不能把 viewer 相关判断缓存进去）。
   */
  async getDetail(id: string, viewerId?: string) {
    const video = await this.getDetailRaw(id);
    const isOwner = !!viewerId && video.userId === viewerId;
    if (!isOwner && (video.visibility === "SELF_ONLY" || video.status === "REJECTED")) {
      throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    }
    return video;
  }

  @Cacheable({ key: (args) => `video:detail:${args[0]}`, ttl: 120 })
  async getDetailRaw(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
        circle: { select: { id: true, name: true } },
        products: true,
      },
    });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");

    await this.prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((e) => this.logger.warn(`视频 ${id} 浏览计数失败`, e));
    return this.normalizeVideoUrls(video);
  }

  /** 点赞/取消点赞视频（per-user去重） */
  async toggleLike(userId: string, videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");

    const existing = await this.prisma.like.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: "VIDEO", targetId: videoId } },
    });
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      await this.prisma.video.update({ where: { id: videoId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false };
    }
    await this.prisma.like.create({ data: { userId, targetType: "VIDEO", targetId: videoId } });
    await this.prisma.video.update({ where: { id: videoId }, data: { likeCount: { increment: 1 } } });
    return { liked: true };
  }

  /** 收藏/取消收藏视频 */
  @CacheEvict({ key: (args) => `video:collected:${args[0]}:*`, pattern: true })
  async toggleCollect(userId: string, videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");

    const existing = await this.prisma.collect.findFirst({
      where: { userId, targetType: "VIDEO", targetId: videoId },
    });
    if (existing) {
      await this.prisma.collect.delete({ where: { id: existing.id } });
      await this.prisma.video.update({ where: { id: videoId }, data: { collectCount: { decrement: 1 } } });
      return { collected: false };
    }
    try {
      await this.prisma.collect.create({ data: { userId, targetType: "VIDEO", targetId: videoId } });
    } catch (e: unknown) {
      if (isUniqueConstraintError(e)) return { collected: true };
      throw e;
    }
    await this.prisma.video.update({ where: { id: videoId }, data: { collectCount: { increment: 1 } } });
    return { collected: true };
  }

  /** 记录分享 */
  async recordShare(id: string) {
    const existing = await this.prisma.video.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    return this.prisma.video.update({
      where: { id },
      data: { shareCount: { increment: 1 } },
    });
  }

  /** 添加商品关联 — 需校验视频归属，防越权操作他人视频 */
  async addProduct(userId: string, videoId: string, productId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId }, select: { userId: true } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    if (video.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能操作自己的视频");
    return this.prisma.videoProduct.upsert({
      where: { videoId_productId: { videoId, productId } },
      create: { videoId, productId },
      update: {},
    });
  }

  /** 移除商品关联 — 需校验视频归属 */
  async removeProduct(userId: string, videoId: string, productId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId }, select: { userId: true } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    if (video.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能操作自己的视频");
    await this.prisma.videoProduct.deleteMany({ where: { videoId, productId } });
    return { success: true };
  }

  /** 我收藏的视频 */
  @Cacheable({ key: (args) => `video:collected:${args[0]}:${args[1]}:${args[2]}`, ttl: 30 })
  async listCollected(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where = { userId, targetType: "VIDEO" };
    const [collects, total] = await Promise.all([
      this.prisma.collect.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.collect.count({ where }),
    ]);
    const videoIds = collects.map(c => c.targetId);
    const videos = videoIds.length > 0
      ? await this.prisma.video.findMany({
          where: { id: { in: videoIds } },
          include: { user: { select: { id: true, nickname: true, avatar: true } } },
        })
      : [];
    return { videos, total, page, pageSize };
  }

  // ───────── VOD 上传/点播 ─────────

  /** 获取VOD上传签名 */
  getUploadSignature(params?: { videoName?: string; expireSeconds?: number; procedure?: string; classId?: number }) {
    return this.vod.genUploadSignature(params);
  }

  /** 获取播放器鉴权签名（psign） */
  getPlaySignature(fileId: string, expireSeconds?: number) {
    return this.vod.genPlayerSignature(fileId, expireSeconds);
  }

  /** VOD URL拉取上传 */
  async pullUpload(urls: { url: string; fileName?: string }[], options?: { mediaName?: string; coverUrl?: string; procedure?: string; classId?: number }) {
    return this.vod.pullUpload(urls, options);
  }

  /** 处理媒资（转码+截图+水印） */
  async processMedia(fileId: string, options?: { transcodeDefinitions?: number[]; watermarkDefinition?: number; adaptiveDefinition?: number; snapshotDefinition?: number }) {
    return this.vod.processMedia(fileId, {
      transcodeDefinitions: options?.transcodeDefinitions,
      watermarkDefinition: options?.watermarkDefinition,
      adaptiveDynamicStreamingDefinition: options?.adaptiveDefinition,
      snapshotDefinition: options?.snapshotDefinition,
    });
  }

  /** 视频剪辑 */
  async clipVideo(params: { fileId: string; startTimeOffset: number; endTimeOffset: number; clipName?: string; classId?: number }) {
    return this.vod.clipVideo(params);
  }

  /** 获取VOD媒资信息 */
  async getMediaInfo(fileId: string) {
    return this.vod.getMediaInfo(fileId);
  }

  /** 删除VOD媒资 */
  async deleteMedia(fileId: string) {
    return this.vod.deleteMedia(fileId);
  }

  /** 获取播放统计 */
  async getPlaybackStats(fileId: string, startDate: string, endDate: string) {
    return this.vod.getDailyPlayStat(fileId, startDate, endDate);
  }

  /** 获取播放统计概览 */
  async getPlaybackSummary(startDate: string, endDate: string) {
    return this.vod.getPlayStatSummary(startDate, endDate);
  }

  /** 搜索VOD媒资 */
  async searchVodMedia(params: { keyword?: string; classIds?: number[]; offset?: number; limit?: number }) {
    return this.vod.searchMedia(params);
  }

  /** 处理VOD回调（转码完成、截图完成、上传完成） */
  async handleVodCallback(body: unknown) {
    if (!body || typeof body !== "object") return;
    const event = this.vod.parseEventNotification(body as Record<string, unknown>);
    if (!event) return;

    // 根据fileId反查本地视频记录并更新
    const localVideos = await this.prisma.video.findMany({
      where: { videoUrl: { contains: event.fileId } },
      take: 1,
    });

    if (localVideos.length > 0) {
      const video = localVideos[0];
      const updateData: Record<string, unknown> = {};

      if (event.eventType === "TranscodeComplete") {
        if (event.playUrl) updateData.videoUrl = event.playUrl;
        if (event.coverUrl) updateData.coverUrl = event.coverUrl;
        if (event.duration) updateData.duration = event.duration;
        updateData.status = "PUBLISHED";
      } else if (event.eventType === "NewFileUpload") {
        updateData.status = "PROCESSING";
      } else if (event.eventType === "FileDeleteComplete") {
        updateData.status = "HIDDEN";
      }

      if (event.adaptiveStreamingUrl) {
        // 存储自适应码流URL（可扩展Video模型字段或使用现有videoUrl）
        updateData.videoUrl = event.adaptiveStreamingUrl;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.video.update({
          where: { id: video.id },
          data: updateData,
        });
        this.logger.log(`视频 ${video.id} VOD状态更新: ${event.eventType}`);
      }
    }
  }

  // ───────── 瀑布流列表 / 搜索 / 商品库 ─────────

  /**
   * 视频瀑布流列表 — 返回 VideoListItem 格式
   * sort: recommend(默认)=播放量优先 / hot=点赞优先 / follow=已关注作者(需登录，未登录或未关注→空)
   */
  async listItems(rawPage: number, rawPageSize: number, opts?: { sort?: string; followerId?: string }) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    // 瀑布流=平台公共池：只出「全平台开放+审核通过+非私密」内容（圈内封闭作品不外泄）
    const where: Prisma.VideoWhereInput = {
      id: { notIn: publicQuarantinedIds("video") },
      status: "PUBLISHED",
      visibility: "PLATFORM",
      auditStatus: "APPROVED",
      isPrivate: false,
    };

    // 关注 tab：仅拉取已关注作者的视频；未登录或未关注任何人 → 空列表（前端引导登录/去关注）
    if (opts?.sort === "follow") {
      if (!opts.followerId) return [];
      const follows = await this.prisma.follow.findMany({
        where: { userId: opts.followerId },
        select: { followedUserId: true },
      });
      const authorIds = follows.map((f) => f.followedUserId);
      if (authorIds.length === 0) return [];
      where.userId = { in: authorIds };
    }

    const orderBy: Prisma.VideoOrderByWithRelationInput =
      opts?.sort === "hot"
        ? { likeCount: "desc" }
        : opts?.sort === "follow"
          ? { createdAt: "desc" }
          : { viewCount: "desc" };

    const videos = await this.prisma.video.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        user: { select: { nickname: true, avatar: true } },
        _count: { select: { products: true } },
      },
    });

    return videos.map((v) => ({
      id: v.id,
      title: v.title,
      coverUrl: VideoService.unescapeHtmlUrl(v.coverUrl),
      duration: v.duration ?? 0,
      author: { name: v.user.nickname, avatar: v.user.avatar ?? "" },
      likes: v.likeCount,
      plays: v.viewCount,
      hasProduct: v._count.products > 0,
      isHot: v.viewCount > 10000,
    }));
  }

  /** 搜索视频 — 标题/标签模糊匹配（平台级搜索=公共池口径：不出圈内封闭/SELF_ONLY/私密内容） */
  async searchVideos(params: { keyword?: string; category?: string; page: number; pageSize: number }) {
    const { keyword, category } = params;
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const where: Prisma.VideoWhereInput = {
      id: { notIn: publicQuarantinedIds("video") },
      status: "PUBLISHED",
      visibility: "PLATFORM",
      auditStatus: "APPROVED",
      isPrivate: false,
    };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { tags: { has: keyword } },
      ];
    }
    if (category) {
      where.categoryLevel1 = category;
    }

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy: { viewCount: "desc" },
        skip,
        take: pageSize,
        include: {
          user: { select: { nickname: true, avatar: true } },
        },
      }),
      this.prisma.video.count({ where }),
    ]);

    return {
      items: videos.map((v) => ({
        id: v.id,
        title: v.title,
        author: v.user.nickname,
        authorAvatar: v.user.avatar ?? "",
        cover: VideoService.unescapeHtmlUrl(v.coverUrl),
        duration: `${Math.floor((v.duration ?? 0) / 60)}:${String((v.duration ?? 0) % 60).padStart(2, "0")}`,
        views: v.viewCount,
        publishedAt: this.timeAgo(v.createdAt),
        category: v.categoryLevel1 ?? "",
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 可带货商品库 */
  async listProducts(rawPage: number, rawPageSize: number) {
    const { skip, pageSize } = safePagination(rawPage, rawPageSize);
    const products = await this.prisma.product.findMany({
      where: {
        id: { notIn: publicQuarantinedIds("product") },
        status: "ON_SALE",
        deletedAt: null,
      },
      orderBy: { salesCount: "desc" },
      skip,
      take: pageSize,
      select: { id: true, title: true, images: true, price: true, salesCount: true, stock: true },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.title,
      cover: p.images?.[0] ?? "",
      price: Number(p.price),
      commission: Math.round(Number(p.price) * 0.1),
      stock: p.stock,
    }));
  }

  private timeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "今天";
    if (days < 2) return "昨天";
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return `${Math.floor(days / 30)}月前`;
  }
}
