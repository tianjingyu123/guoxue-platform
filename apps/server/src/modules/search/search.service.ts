import { Injectable, Logger, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SemanticSearchService } from "./semantic-search.service";

/** 搜索结果缓存 TTL */
const SEARCH_CACHE_TTL = 120;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @Optional() private semantic?: SemanticSearchService,
  ) {}

  /** 语义搜索 — 基于向量相似度的内容发现 */
  async semanticSearch(query: string, topK = 10) {
    if (!this.semantic) {
      this.logger.warn("SemanticSearchService 未注入，回退到 FTS");
      return this.search({ q: query, pageSize: topK });
    }
    return this.semantic.search(query, topK);
  }

  /** 语义查询建议 — 相似搜索词推荐 */
  async suggestSimilarQueries(query: string, limit = 5) {
    if (!this.semantic) return [];
    return this.semantic.suggestSimilar(query, limit);
  }

  /** 全局搜索（加权重排 + LIKE 回退，带缓存） */
  async search(params: {
    q: string;
    type?: string;
    page?: number;
    pageSize?: number;
    weightMap?: Map<string, number>;
  }) {
    const { q, type, page = 1, pageSize = 20, weightMap } = params;

    if (!q?.trim()) return { q, type };

    const cacheKey = `search:${createHash("sha1").update(`${q}|${type || "all"}|${page}|${pageSize}`).digest("hex")}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const limit = type ? pageSize : 5;
    const offset = type ? (page - 1) * pageSize : 0;
    const results: Record<string, unknown> = { q, type };

    const searches: Promise<void>[] = [];

    if (!type || type === "article") {
      searches.push(this.ftsOrLike("Article", q, limit, offset, weightMap).then((rows) => { results.articles = rows; }));
    }
    if (!type || type === "course") {
      searches.push(this.ftsOrLike("Course", q, limit, offset, weightMap).then((rows) => { results.courses = rows; }));
    }
    if (!type || type === "product") {
      searches.push(this.ftsOrLike("Product", q, limit, offset, weightMap).then((rows) => { results.products = rows; }));
    }
    if (!type || type === "circle") {
      searches.push(this.ftsOrLike("Circle", q, limit, offset, weightMap).then((rows) => { results.circles = rows; }));
    }
    if (!type || type === "video") {
      searches.push(this.ftsOrLike("Video", q, limit, offset, weightMap).then((rows) => { results.videos = rows; }));
    }
    if (!type || type === "user") {
      searches.push(this.ftsOrLike("User", q, limit, offset, weightMap).then((rows) => { results.users = rows; }));
    }
    if (!type || type === "classic") {
      searches.push(this.ftsOrLike("ClassicBook", q, limit, offset, weightMap).then((rows) => { results.classics = rows; }));
    }
    if (!type || type === "ebook") {
      searches.push(this.ftsOrLike("Ebook", q, limit, offset, weightMap).then((rows) => { results.ebooks = rows; }));
    }
    if (!type || type === "content") {
      searches.push(this.ftsOrLike("Content", q, limit, offset, weightMap).then((rows) => { results.contents = rows; }));
    }

    await Promise.all(searches);
    await this.redis.setJson(cacheKey, results, SEARCH_CACHE_TTL);
    return results;
  }

  /** 通用 FTS + LIKE 回退搜索 */
  private async ftsOrLike(
    entityType: string,
    q: string,
    limit: number,
    offset: number,
    weightMap?: Map<string, number>,
  ) {
    // 1. 先尝试 PostgreSQL 全文搜索
    let rows = await this.runFts(entityType, q, limit, offset);

    // 2. 如果 FTS 无结果，回退到 ILIKE（中文适配）
    if (rows.length === 0) {
      rows = await this.runLike(entityType, q, limit, offset);
    }

    // 3. 应用权重
    if (weightMap && weightMap.size > 0) {
      for (const row of rows) {
        const entityWeight = weightMap.get(`${entityType.toLowerCase()}:all`) ?? 1.0;
        row.rank = (row.rank || 0.1) * entityWeight;
      }
      rows.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    }

    return rows;
  }

  /** PostgreSQL 全文搜索 */
  private async runFts(entityType: string, q: string, limit: number, offset: number): Promise<any[]> {
    const configs: Record<string, { table: string; fields: string; select: string; where: string }> = {
      Article: {
        table: "Article", fields: "coalesce(title,'') || ' ' || coalesce(excerpt,'')",
        select: `id, title, cover, excerpt, "viewCount"`, where: `"auditStatus" = 'APPROVED'`,
      },
      Course: {
        table: "Course", fields: "coalesce(title,'') || ' ' || coalesce(intro,'')",
        select: `id, title, cover, intro, price, "studentCount"`, where: `"auditStatus" = 'APPROVED'`,
      },
      Product: {
        table: "Product", fields: "coalesce(title,'') || ' ' || coalesce(intro,'')",
        select: `id, title, images, price, "salesCount"`, where: `"status" = 'ON_SALE'`,
      },
      Circle: {
        table: "Circle", fields: "coalesce(name,'') || ' ' || coalesce(intro,'')",
        select: `id, name, cover, intro, "memberCount"`, where: `"status" = 'ACTIVE'`,
      },
      Video: {
        table: "Video", fields: "coalesce(title,'')",
        select: `id, title, "videoUrl", "coverUrl", duration, "viewCount"`, where: `"status" = 'PUBLISHED'`,
      },
      User: {
        table: "User", fields: "coalesce(nickname,'')",
        select: `id, nickname, avatar`, where: `"status" = 'ACTIVE'`,
      },
      ClassicBook: {
        table: "ClassicBook", fields: "coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(intro,'')",
        select: `id, title, author, cover, category, dynasty`, where: `"status" = 'PUBLISHED'`,
      },
      Content: {
        table: "Content", fields: "coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(excerpt,'')",
        select: `id, title, type, author, dynasty, cover, excerpt, "viewCount", "likeCount"`, where: `"status" = 'PUBLISHED'`,
      },
    };

    const cfg = configs[entityType];
    if (!cfg) return [];

    try {
      return await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT ${cfg.select},
                ts_rank(to_tsvector('simple', ${cfg.fields}),
                        plainto_tsquery('simple', $1)) AS rank
         FROM "${cfg.table}"
         WHERE to_tsvector('simple', ${cfg.fields})
               @@ plainto_tsquery('simple', $1)
           AND ${cfg.where}
         ORDER BY rank DESC
         LIMIT $2 OFFSET $3`,
        q, limit, offset,
      );
    } catch (err: unknown) {
      this.logger.warn(`FTS 搜索 ${entityType} 失败: ${(err as Error).message}`);
      return [];
    }
  }

  /** ILIKE 回退搜索（更好的中文支持） */
  private async runLike(entityType: string, q: string, limit: number, offset: number): Promise<any[]> {
    const configs: Record<string, { table: string; searchFields: string[]; select: string; where: string }> = {
      Article: {
        table: "Article", searchFields: ["title", "excerpt"],
        select: `id, title, cover, excerpt, "viewCount"`, where: `"auditStatus" = 'APPROVED'`,
      },
      Course: {
        table: "Course", searchFields: ["title", "intro"],
        select: `id, title, cover, intro, price, "studentCount"`, where: `"auditStatus" = 'APPROVED'`,
      },
      Product: {
        table: "Product", searchFields: ["title", "intro"],
        select: `id, title, images, price, "salesCount"`, where: `"status" = 'ON_SALE'`,
      },
      Circle: {
        table: "Circle", searchFields: ["name", "intro"],
        select: `id, name, cover, intro, "memberCount"`, where: `"status" = 'ACTIVE'`,
      },
      Video: {
        table: "Video", searchFields: ["title"],
        select: `id, title, "videoUrl", "coverUrl", duration, "viewCount"`, where: `"status" = 'PUBLISHED'`,
      },
      User: {
        table: "User", searchFields: ["nickname"],
        select: `id, nickname, avatar`, where: `"status" = 'ACTIVE'`,
      },
      ClassicBook: {
        table: "ClassicBook", searchFields: ["title", "author", "intro"],
        select: `id, title, author, cover, category, dynasty`, where: `"status" = 'PUBLISHED'`,
      },
      Content: {
        table: "Content", searchFields: ["title", "author", "excerpt"],
        select: `id, title, type, author, dynasty, cover, excerpt, "viewCount", "likeCount"`, where: `"status" = 'PUBLISHED'`,
      },
    };

    const cfg = configs[entityType];
    if (!cfg) return [];

    const likeClauses = cfg.searchFields.map((f) => `"${f}" ILIKE '%' || $1 || '%'`);
    const likeWhere = `(${likeClauses.join(" OR ")})`;

    // 用匹配字段数作为排序评分
    const rankScore = cfg.searchFields.map((f) => `CASE WHEN "${f}" ILIKE '%' || $1 || '%' THEN 1 ELSE 0 END`).join(" + ");

    try {
      return await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT ${cfg.select}, (${rankScore})::float AS rank
         FROM "${cfg.table}"
         WHERE ${likeWhere} AND ${cfg.where}
         ORDER BY rank DESC
         LIMIT $2 OFFSET $3`,
        q, limit, offset,
      );
    } catch (err: unknown) {
      this.logger.warn(`Like 搜索 ${entityType} 失败: ${(err as Error).message}`);
      return [];
    }
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
        } catch (err) {
          // JSON 解析失败则忽略
          this.logger.warn(`热搜词 JSON 解析失败`, err);
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
