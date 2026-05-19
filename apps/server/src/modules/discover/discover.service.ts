import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** 发现页缓存 TTL */
const DISCOVER_CACHE_TTL = 120;

/** 统一发现页条目 */
export interface DiscoverItem {
  id: string;
  title: string;
  cover: string | null;
  type: "content" | "course" | "product" | "classic" | "bot";
  intro: string | null;
  tags: string[];
  categoryLevel1: string | null;
  categoryLevel2: string | null;
  stats: Record<string, unknown>;
}

/** 内容查询统一选择字段 */
const CONTENT_SELECT = {
  id: true, title: true, cover: true, excerpt: true, tags: true,
  categoryLevel1: true, categoryLevel2: true, viewCount: true, likeCount: true,
} as const;

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ───────── 发现页主接口 ✨增强 ─────────

  async getDiscover(params: {
    page: number;
    pageSize: number;
    type?: string;
    categoryLevel1?: string;
    categoryLevel2?: string;
  }) {
    const { page, pageSize, type, categoryLevel1, categoryLevel2 } = params;

    const filterHash = createHash("sha1")
      .update(`${page}|${pageSize}|${type || "all"}|${categoryLevel1 || ""}|${categoryLevel2 || ""}`)
      .digest("hex");
    const cacheKey = `discover:${filterHash}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * pageSize;

    // 单类型模式
    if (type && type !== "all") {
      const result = await this.getTypedDiscover(type, { skip, pageSize, categoryLevel1, categoryLevel2, page });
      await this.redis.setJson(cacheKey, result, DISCOVER_CACHE_TTL);
      return result;
    }

    // 聚合模式：均分 pageSize
    const perSection = Math.max(2, Math.ceil(pageSize / 5));
    const cat = categoryLevel1 ? { categoryLevel1, categoryLevel2 } : undefined;

    const [content, courses, products, classics, bots] = await Promise.all([
      this.queryContent({ skip, pageSize: perSection, cat }),
      this.queryCourses({ skip, pageSize: perSection, cat }),
      this.queryProducts({ skip, pageSize: perSection, cat }),
      this.queryClassics({ skip, pageSize: perSection }),
      this.queryBots({ skip, pageSize: perSection }),
    ]);

    const data = {
      page,
      pageSize,
      sections: [
        { type: "content", title: "精选内容", items: content.items, total: content.total },
        { type: "course", title: "热门课程", items: courses.items, total: courses.total },
        { type: "product", title: "精选商品", items: products.items, total: products.total },
        { type: "classic", title: "古籍经典", items: classics.items, total: classics.total },
        { type: "bot", title: "智能体", items: bots.items, total: bots.total },
      ],
    };
    await this.redis.setJson(cacheKey, data, DISCOVER_CACHE_TTL);
    return data;
  }

  private async getTypedDiscover(
    type: string,
    opts: { skip: number; pageSize: number; categoryLevel1?: string; categoryLevel2?: string; page: number },
  ) {
    const { skip, pageSize, categoryLevel1, categoryLevel2, page } = opts;
    const cat = categoryLevel1 ? { categoryLevel1, categoryLevel2 } : undefined;
    let result: { items: DiscoverItem[]; total: number };

    switch (type) {
      case "content": result = await this.queryContent({ skip, pageSize, cat }); break;
      case "course": result = await this.queryCourses({ skip, pageSize, cat }); break;
      case "product": result = await this.queryProducts({ skip, pageSize, cat }); break;
      case "classic": result = await this.queryClassics({ skip, pageSize }); break;
      case "bot": result = await this.queryBots({ skip, pageSize }); break;
      default: result = { items: [], total: 0 };
    }

    return { page, pageSize, type, items: result.items, total: result.total };
  }

  // ───────── 分类导航 ─────────

  async getCategoryTree(): Promise<Record<string, string[]>> {
    try {
      const row = await this.prisma.configSystem.findUnique({
        where: { configKey: "category_tree" },
      });
      if (row?.configValue) {
        const parsed = JSON.parse(row.configValue);
        if (typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string[]>;
      }
    } catch (err) {
      // fallback
      this.logger.warn(`分类树 JSON 解析失败，使用默认值`, err);
    }

    return {
      "国学经典": ["儒家经典", "道家典籍", "佛学经典", "诸子百家"],
      "诗词歌赋": ["唐诗", "宋词", "元曲", "诗经楚辞"],
      "传统艺术": ["书法", "国画", "篆刻", "陶瓷"],
      "中医养生": ["中医基础", "中药", "食疗养生", "经络穴位"],
      "民俗文化": ["二十四节气", "传统节日", "民间传说", "地方风俗"],
      "武术功夫": ["太极拳", "少林武术", "气功", "兵器"],
      "茶道香道": ["茶道", "香道", "花道"],
      "棋艺": ["围棋", "象棋", "国际象棋"],
      "传统建筑": ["宫殿", "园林", "寺庙", "民居"],
      "中华美食": ["菜系", "面点", "茶点", "药膳"],
    };
  }

  // ───────── 热门内容（从运营引擎热榜池读取） ─────────

  async getHotContent(page = 1, pageSize = 10) {
    let hotIds: string[] = [];
    try {
      const row = await this.prisma.configSystem.findUnique({
        where: { configKey: "hot_content_pool" },
      });
      if (row?.configValue) {
        const parsed = JSON.parse(row.configValue);
        hotIds = (parsed.contentIds as string[]) || [];
      }
    } catch (err) {
      // 回退为实时查询
      this.logger.warn(`热榜池 JSON 解析失败，回退为实时查询`, err);
    }

    const skip = (page - 1) * pageSize;
    const pagedIds = hotIds.slice(skip, skip + pageSize);

    if (pagedIds.length === 0) {
      return this.queryContent({ skip, pageSize });
    }

    const contents = await this.prisma.content.findMany({
      where: { id: { in: pagedIds }, status: "PUBLISHED" },
      select: CONTENT_SELECT,
    });

    // 保持热榜顺序
    const idOrder: Record<string, number> = {};
    pagedIds.forEach((id, i) => { idOrder[id] = i; });
    contents.sort((a, b) => (idOrder[a.id] ?? 999) - (idOrder[b.id] ?? 999));

    return { page, pageSize, items: contents.map(c => this.toContentItem(c)), total: hotIds.length };
  }

  // ───────── 个性化推荐 ─────────

  async getRecommendations(userId?: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    let interests: string[] = [];

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { interestCategories: true },
      });
      interests = user?.interestCategories || [];
    }

    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (interests.length > 0) {
      where.categoryLevel1 = { in: interests };
    }

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select: CONTENT_SELECT,
        orderBy: [{ likeCount: "desc" }, { viewCount: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.content.count({ where }),
    ]);

    if (contents.length < pageSize && interests.length > 0) {
      // 兴趣内容不足时用热门补齐
      const existingIds = new Set(contents.map(c => c.id));
      const fallback = await this.prisma.content.findMany({
        where: { status: "PUBLISHED", id: { notIn: [...existingIds] } },
        select: CONTENT_SELECT,
        orderBy: [{ likeCount: "desc" }, { viewCount: "desc" }],
        take: pageSize - contents.length,
      });
      contents.push(...fallback);
    }

    return { page, pageSize, personalized: interests.length > 0, interests, items: contents.map(c => this.toContentItem(c)), total };
  }

  // ───────── 私有查询 ─────────

  private buildCategoryWhere(
    base: Record<string, unknown>,
    cat?: { categoryLevel1: string; categoryLevel2?: string },
  ): Record<string, unknown> {
    if (!cat) return base;
    base.categoryLevel1 = cat.categoryLevel1;
    if (cat.categoryLevel2) base.categoryLevel2 = cat.categoryLevel2;
    return base;
  }

  private async queryContent(opts: { skip: number; pageSize: number; cat?: { categoryLevel1: string; categoryLevel2?: string } }) {
    const where = this.buildCategoryWhere({ status: "PUBLISHED" }, opts.cat);
    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select: CONTENT_SELECT,
        orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
        skip: opts.skip, take: opts.pageSize,
      }),
      this.prisma.content.count({ where }),
    ]);
    return { items: items.map(c => this.toContentItem(c)), total };
  }

  private async queryCourses(opts: { skip: number; pageSize: number; cat?: { categoryLevel1: string; categoryLevel2?: string } }) {
    const where = this.buildCategoryWhere({ auditStatus: "APPROVED" }, opts.cat);
    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: { id: true, title: true, cover: true, intro: true, tags: true, categoryLevel1: true, categoryLevel2: true, price: true, studentCount: true },
        orderBy: { studentCount: "desc" },
        skip: opts.skip, take: opts.pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);
    return {
      items: items.map(c => ({
        id: c.id, title: c.title, cover: c.cover, type: "course" as const,
        intro: c.intro, tags: c.tags, categoryLevel1: c.categoryLevel1, categoryLevel2: c.categoryLevel2,
        stats: { studentCount: c.studentCount, price: Number(c.price) },
      })),
      total,
    };
  }

  private async queryProducts(opts: { skip: number; pageSize: number; cat?: { categoryLevel1: string; categoryLevel2?: string } }) {
    const where = this.buildCategoryWhere({ status: "ON_SALE" }, opts.cat);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: { id: true, title: true, images: true, intro: true, tags: true, categoryLevel1: true, categoryLevel2: true, price: true, salesCount: true },
        orderBy: { salesCount: "desc" },
        skip: opts.skip, take: opts.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: items.map(p => ({
        id: p.id, title: p.title, cover: p.images?.[0] || null, type: "product" as const,
        intro: p.intro, tags: p.tags, categoryLevel1: p.categoryLevel1, categoryLevel2: p.categoryLevel2,
        stats: { salesCount: p.salesCount, price: Number(p.price) },
      })),
      total,
    };
  }

  private async queryClassics(opts: { skip: number; pageSize: number }) {
    const where = { status: "PUBLISHED" };
    const [items, total] = await Promise.all([
      this.prisma.classicBook.findMany({
        where,
        select: { id: true, title: true, cover: true, intro: true, author: true, category: true, viewCount: true },
        orderBy: { viewCount: "desc" },
        skip: opts.skip, take: opts.pageSize,
      }),
      this.prisma.classicBook.count({ where }),
    ]);
    return {
      items: items.map(c => ({
        id: c.id, title: c.title, cover: c.cover, type: "classic" as const,
        intro: c.intro, tags: c.author ? [c.author] : [],
        categoryLevel1: c.category, categoryLevel2: null,
        stats: { viewCount: c.viewCount },
      })),
      total,
    };
  }

  private async queryBots(opts: { skip: number; pageSize: number }) {
    const where = { status: "ACTIVE" };
    const [items, total] = await Promise.all([
      this.prisma.botConfig.findMany({
        where,
        select: { id: true, name: true, avatar: true, intro: true, type: true, sortOrder: true, isFree: true, price: true },
        orderBy: { sortOrder: "asc" },
        skip: opts.skip, take: opts.pageSize,
      }),
      this.prisma.botConfig.count({ where }),
    ]);
    return {
      items: items.map(b => ({
        id: b.id, title: b.name, cover: b.avatar, type: "bot" as const,
        intro: b.intro, tags: [b.isFree ? "免费" : "付费"],
        categoryLevel1: b.type, categoryLevel2: null,
        stats: b.isFree ? {} : { price: b.price ? Number(b.price) : 0 },
      })),
      total,
    };
  }

  private toContentItem(c: {
    id: string; title: string; cover?: string | null; excerpt?: string | null;
    tags?: string[]; categoryLevel1?: string | null; categoryLevel2?: string | null;
    viewCount?: number; likeCount?: number;
  }): DiscoverItem {
    return {
      id: c.id, title: c.title, cover: c.cover || null, type: "content",
      intro: c.excerpt || null, tags: c.tags || [],
      categoryLevel1: c.categoryLevel1 || null, categoryLevel2: c.categoryLevel2 || null,
      stats: { viewCount: c.viewCount, likeCount: c.likeCount },
    };
  }
}
