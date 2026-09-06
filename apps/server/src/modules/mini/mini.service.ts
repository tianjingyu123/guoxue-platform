import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { SystemService } from "../system/system.service";
import { RecommendService } from "../recommend/recommend.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { Prisma } from "@prisma/client";
import { safePagination } from "../../common/pagination";

@Injectable()
export class MiniService {
  private readonly logger = new Logger(MiniService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private systemService: SystemService,
    private recommendService: RecommendService,
  ) {}

  /** 小程序首页聚合数据 — 组件级缓存 + Redis mget 批量读取 */
  async getHome(options: { stationId?: string; contentType?: string }) {
    const { stationId } = options;
    const prefix = stationId || "default";

    // 组件级缓存键
    const keys = ["banners", "hotContents", "recentArticles", "activeCircles", "station"].map(
      (c) => `mini:comp:${prefix}:${c}`,
    );

    // 批量读取所有组件缓存
    const cached = await this.redis.mgetJson<any>(keys);
    const [cachedBanners, cachedHot, cachedArticles, cachedCircles, cachedStation] = cached;

    // 构建缺失组件
    const [
      banners,
      hotContents,
      recentArticles,
      activeCircles,
      station,
    ] = await Promise.all([
      cachedBanners ?? this.fetchBanners(stationId, keys[0]),
      cachedHot ?? this.fetchHotContents(stationId, keys[1]),
      cachedArticles ?? this.fetchRecentArticles(stationId, keys[2]),
      cachedCircles ?? this.fetchActiveCircles(stationId, keys[3]),
      cachedStation ?? this.fetchStation(stationId, keys[4]),
    ]);

    return {
      banners: safeJsonParse(banners?.home_banners ?? "[]", []),
      notice: banners?.home_notice ?? "",
      hotContents,
      recentArticles,
      activeCircles,
      station,
    };
  }

  private async fetchBanners(stationId: string | undefined, cacheKey: string) {
    const data = await this.systemService.getPublicConfigs(["home_banners", "home_notice"]).catch((err) => { this.logger.warn("获取Banner配置失败", err); return { home_banners: "[]", home_notice: "" }; });
    this.redis.setJson(cacheKey, data, 120).catch((err) => this.logger.warn("缓存写入失败", err));
    return data;
  }

  private async fetchHotContents(stationId: string | undefined, cacheKey: string) {
    const data = await this.prisma.content.findMany({
      where: { status: "PUBLISHED", ...(stationId ? { stationId } : {}) },
      select: { id: true, title: true, type: true, cover: true, excerpt: true, viewCount: true, author: true, dynasty: true, tags: true },
      orderBy: { viewCount: "desc" },
      take: 6,
    }).catch((err) => { this.logger.warn("获取热门内容失败", err); return []; });
    this.redis.setJson(cacheKey, data, 120).catch((err) => this.logger.warn("缓存写入失败", err));
    return data;
  }

  private async fetchRecentArticles(stationId: string | undefined, cacheKey: string) {
    const data = await this.prisma.article.findMany({
      where: { auditStatus: "APPROVED", visibility: "PLATFORM", ...(stationId ? { stationId } : {}) },
      select: { id: true, title: true, cover: true, excerpt: true, viewCount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }).catch((err) => { this.logger.warn("获取最新文章失败", err); return []; });
    this.redis.setJson(cacheKey, data, 120).catch((err) => this.logger.warn("缓存写入失败", err));
    return data;
  }

  private async fetchActiveCircles(stationId: string | undefined, cacheKey: string) {
    const data = await this.prisma.circle.findMany({
      where: { status: "ACTIVE", ...(stationId ? { stationId } : {}) },
      select: { id: true, name: true, cover: true, memberCount: true, postCount: true, intro: true },
      orderBy: { memberCount: "desc" },
      take: 3,
    }).catch((err) => { this.logger.warn("获取活跃圈子失败", err); return []; });
    this.redis.setJson(cacheKey, data, 120).catch((err) => this.logger.warn("缓存写入失败", err));
    return data;
  }

  private async fetchStation(stationId: string | undefined, cacheKey: string) {
    if (!stationId) return null;
    const data = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, logo: true, themeColor: true, intro: true },
    }).catch((err) => { this.logger.warn("获取分站信息失败", err); return null; });
    if (data) this.redis.setJson(cacheKey, data, 300).catch((err) => this.logger.warn("缓存写入失败", err));
    return data;
  }

  /** 小程序内容流（精简版分页） */
  async getContents(options: { stationId?: string; type?: string; page: number; pageSize: number }) {
    const { stationId, type } = options;
    const { page, pageSize, skip } = safePagination(options.page, options.pageSize);
    const where: Prisma.ContentWhereInput = { status: "PUBLISHED" };
    if (stationId) where.stationId = stationId;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select: {
          id: true, title: true, type: true, cover: true, excerpt: true,
          author: true, dynasty: true, tags: true, viewCount: true, likeCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.content.count({ where }),
    ]);

    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  /** 公开详情必须实时确认发布状态；不能以旧缓存绕过下架/软删除。 */
  async getContentDetail(id: string) {
    return this.prisma.content.findFirst({
      where: {
        id, status: "PUBLISHED", deletedAt: null,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      select: {
        id: true, title: true, type: true, author: true, dynasty: true,
        body: true, cover: true, tags: true, excerpt: true,
        viewCount: true, likeCount: true, status: true, createdAt: true,
      },
    });
  }

  /** 只返回已存在、可公开且有真实页面的内容；不回退首页或另一内容类型。 */
  async getShareConfig(dto: { targetType: string; targetId: string; stationId?: string }) {
    const { targetType, targetId } = dto;
    const routes: Record<string, string> = {
      ARTICLE: "/pkg-circle/articles/detail",
      COURSE: "/pkg-course/detail/index",
      PRODUCT: "/pkg-mall/product/detail",
    };
    if (!Object.prototype.hasOwnProperty.call(routes, targetType)) {
      // Content 是独立内容库，并不是 Article；当前客户端没有其通用详情页。
      throw new BadRequestException("此内容类型暂未配置可分享页面");
    }
    if (!targetId?.trim()) throw new BadRequestException("缺少分享内容");

    const now = new Date();
    const published = {
      id: targetId, deletedAt: null, auditStatus: "APPROVED", visibility: "PLATFORM",
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    };
    let target: { title: string; cover?: string | null; images?: string[] } | null;
    if (targetType === "ARTICLE") {
      target = await this.prisma.article.findFirst({
        where: { ...published, circle: { status: "ACTIVE", deletedAt: null } },
        select: { title: true, cover: true },
      });
    } else if (targetType === "COURSE") {
      target = await this.prisma.course.findFirst({
        where: {
          ...published,
          AND: [
            { OR: [{ scheduledOnAt: null }, { scheduledOnAt: { lte: now } }] },
            { OR: [{ scheduledOffAt: null }, { scheduledOffAt: { gt: now } }] },
            { OR: [{ circleId: null }, { circle: { status: "ACTIVE", deletedAt: null } }] },
          ],
        },
        select: { title: true, cover: true },
      });
    } else {
      target = await this.prisma.product.findFirst({
        where: {
          id: targetId, status: "ON_SALE", deletedAt: null,
          OR: [{ circleId: null }, { circle: { status: "ACTIVE", deletedAt: null } }],
        },
        select: { title: true, images: true },
      });
    }
    if (!target) throw new NotFoundException("内容不存在或不可公开分享");
    // stationId 不能改变落地内容或执行数据库内的任意页面地址。
    return {
      title: target.title, imageUrl: target.cover || target.images?.[0] || undefined,
      path: `${routes[targetType]}?id=${encodeURIComponent(targetId)}`,
      targetType, targetId,
    };
  }

  // ───────── 多小程序配置 ─────────

  /** 获取可用域名列表（含备用域名） */
  async getDomainConfigs() {
    const configs = await this.prisma.miniAppConfig.findMany({
      where: { isActive: true },
      orderBy: { type: "asc" },
    });
    return configs.map((c) => ({
      type: c.type,
      domain: c.domain,
      h5Domain: c.h5Domain,
      appId: c.appId,
    }));
  }

  /** 获取可用小程序 AppId 列表 */
  async getAppIdConfigs() {
    const configs = await this.prisma.miniAppConfig.findMany({
      where: { isActive: true },
      select: { appId: true, appName: true, type: true, domain: true },
      orderBy: { type: "asc" },
    });
    return configs;
  }

  /** 创建小程序配置 */
  async createMiniAppConfig(data: {
    appId: string; appName: string; type?: string;
    domain?: string; h5Domain?: string; pathMappings?: Record<string, string>;
  }) {
    return this.prisma.miniAppConfig.create({
      data: {
        appId: data.appId,
        appName: data.appName,
        type: data.type || "MAIN",
        domain: data.domain,
        h5Domain: data.h5Domain,
        pathMappings: data.pathMappings as any,
      },
    });
  }

  /** 更新小程序配置 */
  async updateMiniAppConfig(id: string, data: Record<string, unknown> | any) {
    return this.prisma.miniAppConfig.update({
      where: { id },
      data: data as any,
    });
  }

  /** 小程序配置列表 */
  async listMiniAppConfigs() {
    return this.prisma.miniAppConfig.findMany({ orderBy: { createdAt: "desc" } });
  }

  /** 删除小程序配置 */
  async deleteMiniAppConfig(id: string) {
    await this.prisma.miniAppConfig.delete({ where: { id } });
    return { success: true };
  }
}

function safeJsonParse(str: string | undefined, fallback: unknown) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (_err) { return fallback; }
}
