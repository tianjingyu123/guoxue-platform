import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /** 全局搜索 */
  async search(params: {
    q: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { q, type, page = 1, pageSize = 20 } = params;

    const results: any = { q, type };

    if (!type || type === "article") {
      const where = {
        auditStatus: "APPROVED",
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { excerpt: { contains: q, mode: "insensitive" as const } },
        ],
      };
      results.articles = await this.prisma.article.findMany({
        where,
        select: { id: true, title: true, cover: true, excerpt: true, viewCount: true },
        take: type ? pageSize : 5,
        orderBy: { viewCount: "desc" },
      });
    }

    if (!type || type === "course") {
      results.courses = await this.prisma.course.findMany({
        where: {
          auditStatus: "APPROVED",
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { intro: { contains: q, mode: "insensitive" as const } },
          ],
        },
        select: { id: true, title: true, cover: true, intro: true, price: true, studentCount: true },
        take: type ? pageSize : 5,
        orderBy: { studentCount: "desc" },
      });
    }

    if (!type || type === "product") {
      results.products = await this.prisma.product.findMany({
        where: {
          status: "ON_SALE",
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { intro: { contains: q, mode: "insensitive" as const } },
          ],
        },
        select: { id: true, title: true, images: true, price: true, salesCount: true },
        take: type ? pageSize : 5,
        orderBy: { salesCount: "desc" },
      });
    }

    if (!type || type === "circle") {
      results.circles = await this.prisma.circle.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { intro: { contains: q, mode: "insensitive" as const } },
          ],
        },
        select: { id: true, name: true, cover: true, intro: true, memberCount: true },
        take: type ? pageSize : 5,
        orderBy: { memberCount: "desc" },
      });
    }

    if (!type || type === "video") {
      results.videos = await this.prisma.video.findMany({
        where: {
          status: "PUBLISHED",
          title: { contains: q, mode: "insensitive" as const },
        },
        select: { id: true, title: true, videoUrl: true, coverUrl: true, duration: true, viewCount: true },
        take: type ? pageSize : 5,
        orderBy: { viewCount: "desc" },
      });
    }

    if (!type || type === "user") {
      results.users = await this.prisma.user.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { nickname: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        },
        select: { id: true, nickname: true, avatar: true },
        take: type ? pageSize : 5,
        orderBy: { createdAt: "desc" },
      });
    }

    if (!type || type === "classic") {
      results.classics = await this.prisma.classicBook.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { author: { contains: q, mode: "insensitive" as const } },
            { intro: { contains: q, mode: "insensitive" as const } },
          ],
        },
        select: { id: true, title: true, author: true, cover: true, category: true, dynasty: true },
        take: type ? pageSize : 5,
        orderBy: { viewCount: "desc" },
      });
    }

    return results;
  }

  /** 热门搜索（基于搜索历史频次 + 种子数据兜底） */
  async getHotSearches(limit = 10) {
    const rows = await this.prisma.searchHistory.groupBy({
      by: ["keyword"],
      _count: { keyword: true },
      orderBy: { _count: { keyword: "desc" } },
      take: limit,
    });

    // 如果搜索历史为空，从 ConfigSystem 读取热门搜索词作为兜底
    if (rows.length === 0) {
      const config = await this.prisma.configSystem.findUnique({
        where: { configKey: "search_hot_words" },
      });
      if (config) {
        try {
          const hotWords = JSON.parse(config.configValue) as Array<{ keyword: string; count: number }>;
          return hotWords.slice(0, limit).map(r => ({ keyword: r.keyword, count: r.count }));
        } catch {
          // JSON 解析失败则忽略
        }
      }
    }

    return rows.map(r => ({ keyword: r.keyword, count: r._count.keyword }));
  }

  /** 保存搜索历史 */
  async saveHistory(userId: string, keyword: string) {
    if (!keyword.trim()) return;
    await this.prisma.searchHistory.create({ data: { userId, keyword } });
  }

  /** 获取用户搜索历史 */
  async getHistory(userId: string, limit = 20) {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      select: { id: true, keyword: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** 搜索建议 */
  async suggest(keyword: string) {
    if (!keyword?.trim()) return [];
    const q = keyword.trim();
    const [articles, courses, circles] = await Promise.all([
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED", title: { contains: q, mode: "insensitive" as const } },
        select: { id: true, title: true },
        take: 5, orderBy: { viewCount: "desc" },
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED", title: { contains: q, mode: "insensitive" as const } },
        select: { id: true, title: true },
        take: 3, orderBy: { studentCount: "desc" },
      }),
      this.prisma.circle.findMany({
        where: { status: "ACTIVE", name: { contains: q, mode: "insensitive" as const } },
        select: { id: true, name: true },
        take: 2, orderBy: { memberCount: "desc" },
      }),
    ]);
    return [
      ...articles.map(a => ({ label: a.title, type: "article", id: a.id })),
      ...courses.map(c => ({ label: c.title, type: "course", id: c.id })),
      ...circles.map(c => ({ label: c.name, type: "circle", id: c.id })),
    ].slice(0, 8);
  }

  /** 清除搜索历史 */
  async clearHistory(userId: string) {
    await this.prisma.searchHistory.deleteMany({ where: { userId } });
    return { success: true };
  }

  /** 搜索统计 */
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSearches, todaySearches, hotKeywords, recentSearches] = await Promise.all([
      this.prisma.searchHistory.count(),
      this.prisma.searchHistory.count({ where: { createdAt: { gte: today } } }),
      this.prisma.searchHistory.groupBy({
        by: ["keyword"],
        _count: { keyword: true },
        orderBy: { _count: { keyword: "desc" } },
        take: 20,
      }),
      this.prisma.searchHistory.findMany({
        select: { keyword: true, createdAt: true, user: { select: { nickname: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      totalSearches,
      todaySearches,
      hotKeywords: hotKeywords.map(r => ({ keyword: r.keyword, count: r._count.keyword })),
      recentSearches,
    };
  }
}
