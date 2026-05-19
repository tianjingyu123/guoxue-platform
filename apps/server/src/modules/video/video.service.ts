import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { VodService } from "./vod.service";
import { Cacheable, CacheEvict } from "../../common/cache.decorator";
import { Prisma } from "@prisma/client";

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private vod: VodService,
  ) {}

  @CacheEvict({ key: "video:list:*", pattern: true })
  async create(userId: string, dto: { circleId?: string; title?: string; videoUrl: string; coverUrl?: string; duration?: number; stationId?: string }) {
    return this.prisma.video.create({
      data: {
        userId,
        circleId: dto.circleId,
        title: dto.title,
        videoUrl: dto.videoUrl,
        coverUrl: dto.coverUrl,
        duration: dto.duration,
        stationId: dto.stationId || undefined,
      },
    });
  }

  @CacheEvict({ key: (args) => `video:detail:${args[1]}`, pattern: true })
  @CacheEvict({ key: "video:list:*", pattern: true })
  async update(userId: string, id: string, dto: { title?: string; coverUrl?: string; status?: string }) {
    const video = await this.prisma.video.findUnique({ where: { id }, select: { userId: true } });
    if (!video) throw new BusinessException(ErrorCode.NOT_FOUND, "视频不存在");
    if (video.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能修改自己的视频");
    return this.prisma.video.update({ where: { id }, data: dto as Prisma.VideoUpdateInput });
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

  @Cacheable({ key: (args) => `video:list:${JSON.stringify(args[0])}`, ttl: 60 })
  async list(params: { circleId?: string; status?: string; page?: number; pageSize?: number; stationId?: string }) {
    const { circleId, status, page = 1, pageSize = 20, stationId } = params;
    const where: Prisma.VideoWhereInput = {};
    if (circleId) where.circleId = circleId;
    if (status) where.status = status;
    else where.status = "PUBLISHED";
    if (stationId) where.stationId = stationId;

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          circle: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.video.count({ where }),
    ]);

    return { videos, total, page, pageSize };
  }

  @Cacheable({ key: (args) => `video:detail:${args[0]}`, ttl: 120 })
  async getDetail(id: string) {
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
    return video;
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
      if ((e as any)?.code === "P2002") return { collected: true };
      throw e;
    }
    await this.prisma.video.update({ where: { id: videoId }, data: { collectCount: { increment: 1 } } });
    return { collected: true };
  }

  /** 记录分享 */
  async recordShare(id: string) {
    return this.prisma.video.update({
      where: { id },
      data: { shareCount: { increment: 1 } },
    });
  }

  /** 添加商品关联 */
  async addProduct(videoId: string, productId: string) {
    return this.prisma.videoProduct.upsert({
      where: { videoId_productId: { videoId, productId } },
      create: { videoId, productId },
      update: {},
    });
  }

  /** 移除商品关联 */
  async removeProduct(videoId: string, productId: string) {
    await this.prisma.videoProduct.deleteMany({ where: { videoId, productId } });
    return { success: true };
  }

  /** 我收藏的视频 */
  @Cacheable({ key: (args) => `video:collected:${args[0]}:${args[1]}:${args[2]}`, ttl: 30 })
  async listCollected(userId: string, page = 1, pageSize = 20) {
    const where = { userId, targetType: "VIDEO" };
    const [collects, total] = await Promise.all([
      this.prisma.collect.findMany({
        where,
        skip: (page - 1) * pageSize,
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
}
