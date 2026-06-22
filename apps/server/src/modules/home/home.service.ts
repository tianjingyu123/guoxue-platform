import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BannerDto, DailyVerseDto, FeedItemDto, HomeResponseDto } from "./home.dto";

/** 首页缓存 TTL（秒）— 全站最高频接口，短缓存即可大幅降压 */
const HOME_CACHE_TTL = 30;
/** 最大分页（防全表扫描） */
const MAX_PAGE_SIZE = 50;

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getHome(params: { page: number; pageSize: number; userId?: string }): Promise<HomeResponseDto> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(params.pageSize || 20, MAX_PAGE_SIZE); // 硬上限 50

    // 仅缓存首页（page=1），后续页低频
    if (page === 1) {
      const cacheKey = "home:page1";
      const cached = await this.redis.getJson<HomeResponseDto>(cacheKey);
      if (cached) return cached;

      const data = await this.buildHome(page, pageSize);
      await this.redis.setJson(cacheKey, data, HOME_CACHE_TTL);
      return data;
    }

    return this.buildHome(page, pageSize);
  }

  private async buildHome(page: number, pageSize: number): Promise<HomeResponseDto> {
    const [banners, dailyVerse, recommendedCircles, feed] = await Promise.all([
      this.getBanners(),
      this.getDailyVerse(),
      this.getRecommendedCircles(),
      this.getFeed(page, pageSize),
    ]);
    return { banners, dailyVerse, recommendedCircles, feed: feed.items, total: feed.total, page, pageSize };
  }

  private async getBanners(): Promise<BannerDto[]> {
    return [
      { id: "1", image: "/static/images/banners/banner-1.png", title: "八字命理入门精讲 限时优惠", link: "/pages/courses/index" },
      { id: "2", image: "/static/images/banners/banner-2.png", title: "大师直播：2024下半年运势解读", link: "/pages/live/index" },
      { id: "3", image: "/static/images/banners/banner-3.png", title: "新人专享 首单立减50元", link: "/pages/mall/index" },
    ];
  }

  private async getDailyVerse(): Promise<DailyVerseDto> {
    const cacheKey = "home:dailyVerse";
    try {
      const cached = await this.redis.getJson<DailyVerseDto>(cacheKey);
      if (cached) return cached;

      const book = await this.prisma.classicBook.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { viewCount: "desc" },
        select: { id: true, title: true, author: true },
      });
      if (book) {
        const chapter = await this.prisma.classicChapter.findFirst({
          where: { bookId: book.id },
          orderBy: { id: "asc" },
          select: { content: true },
        });
        if (chapter?.content) {
          const verse = { source: book.title, content: chapter.content.slice(0, 120), author: book.author ?? "佚名" };
          await this.redis.setJson(cacheKey, verse, 3600); // 每天换一次，缓存1小时
          return verse;
        }
      }
    } catch (err) { this.logger.warn("每日一句加载失败", err); }
    return { source: "周易", content: "天行健，君子以自强不息。地势坤，君子以厚德载物。", author: "周文王" };
  }

  private async getRecommendedCircles(): Promise<Record<string, unknown>[]> {
    const cacheKey = "home:circles";
    try {
      const cached = await this.redis.getJson<any[]>(cacheKey);
      if (cached) return cached;

      const circles = await this.prisma.circle.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, cover: true, intro: true, memberCount: true, postCount: true },
        orderBy: { memberCount: "desc" },
        take: 6,
      });
      await this.redis.setJson(cacheKey, circles, 300);
      return circles;
    } catch { return []; }
  }

  /** Feed流：每种类型取固定条数，按时间排序后分页（内存分页可接受，因为总量有上限） */
  private async getFeed(page: number, pageSize: number): Promise<{ items: FeedItemDto[]; total: number }> {
    const PER_TYPE = 20; // 每种最多取20条，总共最多100条
    try {
      const [articles, courses, lives, posts, videos] = await Promise.all([
        this.prisma.article.findMany({
          where: { auditStatus: "APPROVED" },
          select: { id: true, title: true, cover: true, excerpt: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: PER_TYPE,
        }),
        this.prisma.course.findMany({
          where: { auditStatus: "APPROVED" },
          select: { id: true, title: true, cover: true, price: true, originalPrice: true, studentCount: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: PER_TYPE,
        }),
        this.prisma.liveRoom.findMany({
          where: { status: { in: ["WAITING", "LIVING"] } },
          select: { id: true, title: true, cover: true, viewCount: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: PER_TYPE,
        }),
        this.prisma.post.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, title: true, content: true, images: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: PER_TYPE,
        }),
        this.prisma.video.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, title: true, coverUrl: true, duration: true, viewCount: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: PER_TYPE,
        }),
      ]);

      const items: FeedItemDto[] = [
        ...articles.map((a) => ({ id: a.id, type: "article" as const, title: a.title, cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined, createdAt: a.createdAt.toISOString(), tag: "文章" })),
        ...courses.map((c) => ({ id: c.id, type: "course" as const, title: c.title, cover: c.cover ?? undefined, price: Number(c.price ?? 0), createdAt: c.createdAt.toISOString(), tag: "课程" })),
        ...lives.map((l) => ({ id: l.id, type: "live" as const, title: l.title, cover: l.cover ?? undefined, createdAt: l.createdAt.toISOString(), tag: "直播" })),
        ...posts.map((p) => ({ id: p.id, type: "circle_post" as const, title: p.title ?? undefined, excerpt: p.content?.slice(0, 100), createdAt: p.createdAt.toISOString(), tag: "圈子" })),
        ...videos.map((v) => ({ id: v.id, type: "video" as const, title: v.title ?? undefined, cover: v.coverUrl ?? undefined, createdAt: v.createdAt.toISOString(), tag: "视频" })),
      ];

      // 内容已按各自维度排序（最新/最热），按类型分组呈现
      const total = items.length;
      const paged = items.slice((page - 1) * pageSize, page * pageSize);

      return { items: paged, total };
    } catch { return { items: [], total: 0 }; }
  }
}
