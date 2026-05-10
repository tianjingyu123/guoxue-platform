import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface SearchResult {
  id: string;
  title?: string;
  name?: string;
  rank: number;
  headline?: string;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /** 全局搜索（PostgreSQL 全文搜索，tsvector + tsquery + ts_rank） */
  async search(params: {
    q: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { q, type, page = 1, pageSize = 20 } = params;
    const limit = type ? pageSize : 5;
    const offset = type ? (page - 1) * pageSize : 0;
    const results: Record<string, unknown> = { q, type };

    if (!q?.trim()) return results;

    // 各类型并行的全文本搜索（参数化查询防 SQL 注入）
    const searches: Promise<void>[] = [];

    if (!type || type === "article") {
      searches.push(this.ftsArticles(q, limit, offset).then((rows) => { results.articles = rows; }));
    }
    if (!type || type === "course") {
      searches.push(this.ftsCourses(q, limit, offset).then((rows) => { results.courses = rows; }));
    }
    if (!type || type === "product") {
      searches.push(this.ftsProducts(q, limit, offset).then((rows) => { results.products = rows; }));
    }
    if (!type || type === "circle") {
      searches.push(this.ftsCircles(q, limit, offset).then((rows) => { results.circles = rows; }));
    }
    if (!type || type === "video") {
      searches.push(this.ftsVideos(q, limit, offset).then((rows) => { results.videos = rows; }));
    }
    if (!type || type === "user") {
      searches.push(this.ftsUsers(q, limit, offset).then((rows) => { results.users = rows; }));
    }
    if (!type || type === "classic") {
      searches.push(this.ftsClassics(q, limit, offset).then((rows) => { results.classics = rows; }));
    }
    if (!type || type === "content") {
      searches.push(this.ftsContents(q, limit, offset).then((rows) => { results.contents = rows; }));
    }

    await Promise.all(searches);
    return results;
  }

  // ───── 各类型全文搜索 ─────

  private async ftsArticles(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, title, cover, excerpt, "viewCount",
             ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "Article"
      WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,''))
            @@ plainto_tsquery('simple', ${q})
        AND "auditStatus" = 'APPROVED'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private async ftsCourses(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, title, cover, intro, price, "studentCount",
             ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(intro,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "Course"
      WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(intro,''))
            @@ plainto_tsquery('simple', ${q})
        AND "auditStatus" = 'APPROVED'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private async ftsProducts(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, title, images, price, "salesCount",
             ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(intro,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "Product"
      WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(intro,''))
            @@ plainto_tsquery('simple', ${q})
        AND "status" = 'ON_SALE'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private async ftsCircles(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, name, cover, intro, "memberCount",
             ts_rank(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(intro,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "Circle"
      WHERE to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(intro,''))
            @@ plainto_tsquery('simple', ${q})
        AND "status" = 'ACTIVE'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private async ftsVideos(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, title, "videoUrl", "coverUrl", duration, "viewCount",
             ts_rank(to_tsvector('simple', coalesce(title,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "Video"
      WHERE to_tsvector('simple', coalesce(title,''))
            @@ plainto_tsquery('simple', ${q})
        AND "status" = 'PUBLISHED'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private async ftsUsers(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, nickname, avatar,
             ts_rank(to_tsvector('simple', coalesce(nickname,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "User"
      WHERE to_tsvector('simple', coalesce(nickname,''))
            @@ plainto_tsquery('simple', ${q})
        AND "status" = 'ACTIVE'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private async ftsClassics(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, title, author, cover, category, dynasty,
             ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(intro,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "ClassicBook"
      WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(intro,''))
            @@ plainto_tsquery('simple', ${q})
        AND "status" = 'PUBLISHED'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  private async ftsContents(q: string, limit: number, offset: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, title, type, author, dynasty, cover, excerpt, "viewCount", "likeCount",
             ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(excerpt,'')),
                     plainto_tsquery('simple', ${q})) AS rank
      FROM "Content"
      WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(excerpt,''))
            @@ plainto_tsquery('simple', ${q})
        AND "status" = 'PUBLISHED'
      ORDER BY rank DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  /** 热门搜索（基于搜索历史频次 + 种子数据兜底） */
  async getHotSearches(limit = 10) {
    const rows = await this.prisma.searchHistory.groupBy({
      by: ["keyword"],
      _count: { keyword: true },
      orderBy: { _count: { keyword: "desc" } },
      take: limit,
    });

    if (rows.length === 0) {
      const config = await this.prisma.configSystem.findUnique({
        where: { configKey: "search_hot_words" },
      });
      if (config) {
        try {
          const hotWords = JSON.parse(config.configValue) as Array<{ keyword: string; count: number }>;
          return hotWords.slice(0, limit).map((r) => ({ keyword: r.keyword, count: r.count }));
        } catch {
          // JSON 解析失败则忽略
        }
      }
    }

    return rows.map((r) => ({ keyword: r.keyword, count: r._count.keyword }));
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

  /** 搜索建议（前缀匹配 + 全文搜索混合） */
  async suggest(keyword: string) {
    if (!keyword?.trim()) return [];
    const q = keyword.trim();

    const [articles, courses, circles, contents] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT id, title FROM "Article"
        WHERE to_tsvector('simple', coalesce(title,'')) @@ plainto_tsquery('simple', ${q})
          AND "auditStatus" = 'APPROVED'
        ORDER BY ts_rank(to_tsvector('simple', coalesce(title,'')),
                         plainto_tsquery('simple', ${q})) DESC
        LIMIT 3
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT id, title FROM "Course"
        WHERE to_tsvector('simple', coalesce(title,'')) @@ plainto_tsquery('simple', ${q})
          AND "auditStatus" = 'APPROVED'
        ORDER BY ts_rank(to_tsvector('simple', coalesce(title,'')),
                         plainto_tsquery('simple', ${q})) DESC
        LIMIT 3
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT id, name FROM "Circle"
        WHERE to_tsvector('simple', coalesce(name,'')) @@ plainto_tsquery('simple', ${q})
          AND "status" = 'ACTIVE'
        ORDER BY ts_rank(to_tsvector('simple', coalesce(name,'')),
                         plainto_tsquery('simple', ${q})) DESC
        LIMIT 2
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT id, title FROM "Content"
        WHERE to_tsvector('simple', coalesce(title,'')) @@ plainto_tsquery('simple', ${q})
          AND "status" = 'PUBLISHED'
        ORDER BY ts_rank(to_tsvector('simple', coalesce(title,'')),
                         plainto_tsquery('simple', ${q})) DESC
        LIMIT 3
      `,
    ]);

    return [
      ...articles.map((a) => ({ label: a.title, type: "article", id: a.id })),
      ...contents.map((c) => ({ label: c.title, type: "content", id: c.id })),
      ...courses.map((c) => ({ label: c.title, type: "course", id: c.id })),
      ...circles.map((c) => ({ label: c.name, type: "circle", id: c.id })),
    ].slice(0, 10);
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
      hotKeywords: hotKeywords.map((r) => ({ keyword: r.keyword, count: r._count.keyword })),
      recentSearches,
    };
  }
}
