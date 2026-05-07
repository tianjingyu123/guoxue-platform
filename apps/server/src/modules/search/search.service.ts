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

    return results;
  }

  /** 热门搜索（基于搜索历史频次） */
  async getHotSearches(limit = 10) {
    const rows = await this.prisma.searchHistory.groupBy({
      by: ["keyword"],
      _count: { keyword: true },
      orderBy: { _count: { keyword: "desc" } },
      take: limit,
    });
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

  /** 清除搜索历史 */
  async clearHistory(userId: string) {
    await this.prisma.searchHistory.deleteMany({ where: { userId } });
    return { success: true };
  }
}
