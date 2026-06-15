import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BannerDto, DailyVerseDto, FeedItemDto, HomeResponseDto } from "./home.dto";

@Injectable()
export class HomeService {
  constructor(private prisma: PrismaService) {}

  async getHome(params: { page: number; pageSize: number; userId?: string }): Promise<HomeResponseDto> {
    const { page, pageSize } = params;

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
    try {
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
          return { source: book.title, content: chapter.content.slice(0, 120), author: book.author ?? "佚名" };
        }
      }
    } catch { /* fallback */ }
    return { source: "周易", content: "天行健，君子以自强不息。地势坤，君子以厚德载物。", author: "周文王" };
  }

  private async getRecommendedCircles(): Promise<Record<string, unknown>[]> {
    try {
      return await this.prisma.circle.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, cover: true, intro: true, memberCount: true, postCount: true },
        orderBy: { memberCount: "desc" },
        take: 6,
      });
    } catch { return []; }
  }

  private async getFeed(page: number, pageSize: number): Promise<{ items: FeedItemDto[]; total: number }> {
    try {
      const [articles, courses, lives, posts, videos] = await Promise.all([
        this.prisma.article.findMany({
          where: { auditStatus: "APPROVED" },
          select: { id: true, title: true, cover: true, excerpt: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: pageSize,
        }),
        this.prisma.course.findMany({
          where: { auditStatus: "APPROVED" },
          select: { id: true, title: true, cover: true, price: true, originalPrice: true, studentCount: true, createdAt: true },
          orderBy: { studentCount: "desc" },
          take: pageSize,
        }),
        this.prisma.liveRoom.findMany({
          where: { status: { in: ["WAITING", "LIVING"] } },
          select: { id: true, title: true, cover: true, viewCount: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
          orderBy: { viewCount: "desc" },
          take: pageSize,
        }),
        this.prisma.post.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, title: true, content: true, images: true, createdAt: true, user: { select: { nickname: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: pageSize,
        }),
        this.prisma.video.findMany({
          where: { status: "PUBLISHED" },
          select: { id: true, title: true, coverUrl: true, duration: true, viewCount: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: pageSize,
        }),
      ]);

      const items: FeedItemDto[] = [
        ...articles.map((a) => ({ id: a.id, type: "article" as const, title: a.title, author: a.user?.nickname ?? undefined, authorAvatar: a.user?.avatar ?? undefined, cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined, tag: "文章" })),
        ...courses.map((c) => ({ id: c.id, type: "course" as const, title: c.title, cover: c.cover ?? undefined, price: Number(c.price ?? 0), originalPrice: Number(c.originalPrice ?? 0), tag: "课程" })),
        ...lives.map((l) => ({ id: l.id, type: "live" as const, title: l.title, author: l.user?.nickname ?? undefined, authorAvatar: l.user?.avatar ?? undefined, cover: l.cover ?? undefined, tag: "直播" })),
        ...posts.map((p) => ({ id: p.id, type: "circle_post" as const, title: p.title ?? undefined, author: p.user?.nickname ?? undefined, authorAvatar: p.user?.avatar ?? undefined, excerpt: p.content?.slice(0, 100), tag: "圈子" })),
        ...videos.map((v) => ({ id: v.id, type: "video" as const, title: v.title ?? undefined, cover: v.coverUrl ?? undefined, tag: "视频" })),
      ];

      const sorted = items.sort((a, b) => String(b.id).localeCompare(String(a.id)));
      const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

      return { items: paged, total: sorted.length };
    } catch { return { items: [], total: 0 }; }
  }
}
