import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RecommendService } from "./recommend.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

interface FeedItem {
  id: string;
  type: "article" | "course" | "circle" | "classic" | "product" | "post" | "ebook";
  title: string;
  subtitle?: string;
  cover?: string;
  score: number;
  reason: string;
}

export interface SmartFeedResult {
  userId: string;
  userSegment: string;
  items: FeedItem[];
  generatedAt: string;
}

/**
 * AI 智能首页/信息流服务
 *
 * 基于用户画像 + AI 编排首页内容顺序：
 * - 新用户：引导型内容
 * - 进阶用户：深度内容
 * - 高消费用户：高端课程/服务
 */
@Injectable()
export class SmartFeedService {
  private readonly logger = new Logger(SmartFeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recommend: RecommendService,
    private readonly gateway: AiGatewayService,
  ) {}

  /** 获取智能信息流 */
  async getFeed(userId: string, page = 1, pageSize = 20): Promise<SmartFeedResult> {
    const segment = await this.classifyUser(userId);

    let items: FeedItem[] = [];
    switch (segment) {
      case "new":
        items = await this.getNewUserFeed(userId, pageSize);
        break;
      case "advanced":
        items = await this.getAdvancedFeed(userId, pageSize);
        break;
      case "premium":
        items = await this.getPremiumFeed(userId, pageSize);
        break;
      default:
        items = await this.getDefaultFeed(userId, pageSize);
    }

    if (items.length > 3) {
      items = await this.aiRankItems(userId, items, segment);
    }

    return {
      userId,
      userSegment: segment,
      items: items.slice((page - 1) * pageSize, page * pageSize),
      generatedAt: new Date().toISOString(),
    };
  }

  /** 用户分层 */
  private async classifyUser(userId: string): Promise<"new" | "advanced" | "premium" | "normal"> {
    const [orderCount, interestCount, postCount, memberSince] = await Promise.all([
      this.prisma.order.count({ where: { userId, status: "PAID" } }),
      this.prisma.userInterest.count({ where: { userId } }),
      this.prisma.post.count({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    ]);

    const totalPayment = await this.getTotalPayment(userId);

    if (orderCount >= 3 || totalPayment > 100000) return "premium";

    const daysSinceJoin = memberSince
      ? (Date.now() - memberSince.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : 100;
    if (daysSinceJoin < 7 || interestCount < 3) return "new";

    if (postCount >= 5 && interestCount >= 5) return "advanced";

    return "normal";
  }

  // ─── 不同分层的feed策略 ───

  private async getNewUserFeed(_userId: string, size: number): Promise<FeedItem[]> {
    const quarter = Math.floor(size / 4);
    const [articles, courses, classics, ebooks] = await Promise.all([
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED" },
        select: { id: true, title: true, excerpt: true, cover: true },
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: { id: true, title: true, intro: true, cover: true },
        orderBy: { studentCount: "desc" },
        take: quarter,
      }),
      this.prisma.classicBook.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, intro: true, cover: true },
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.prisma.ebook.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, description: true, cover: true },
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
    ]);

    return [
      ...articles.map((a): FeedItem => ({ id: a.id, type: "article", title: a.title, subtitle: a.excerpt || "", cover: a.cover || "", score: 0, reason: "新手推荐" })),
      ...courses.map((c): FeedItem => ({ id: c.id, type: "course", title: c.title, subtitle: c.intro || "", cover: c.cover || "", score: 0, reason: "入门课程" })),
      ...classics.map((b): FeedItem => ({ id: b.id, type: "classic", title: b.title, subtitle: b.intro || "", cover: b.cover || "", score: 0, reason: "经典必读" })),
      ...ebooks.map((e): FeedItem => ({ id: e.id, type: "ebook", title: e.title, subtitle: e.description || "", cover: e.cover || "", score: 0, reason: "推荐阅读" })),
    ];
  }

  private async getAdvancedFeed(_userId: string, size: number): Promise<FeedItem[]> {
    const quarter = Math.floor(size / 4);
    const [posts, articles, classics, ebooks] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: "PUBLISHED", isEssence: true },
        select: { id: true, title: true, content: true },
        orderBy: { createdAt: "desc" },
        take: quarter,
      }),
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED" },
        select: { id: true, title: true, excerpt: true, cover: true },
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.prisma.classicBook.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, intro: true, cover: true },
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.prisma.ebook.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, description: true, cover: true },
        orderBy: { purchaseCount: "desc" },
        take: quarter,
      }),
    ]);

    return [
      ...posts.map((p): FeedItem => ({ id: p.id, type: "post", title: p.title || "精华帖", subtitle: p.content.slice(0, 100), score: 0, reason: "精华内容" })),
      ...articles.map((a): FeedItem => ({ id: a.id, type: "article", title: a.title, subtitle: a.excerpt || "", cover: a.cover || "", score: 0, reason: "深度推荐" })),
      ...classics.map((b): FeedItem => ({ id: b.id, type: "classic", title: b.title, subtitle: b.intro || "", cover: b.cover || "", score: 0, reason: "经典研读" })),
      ...ebooks.map((e): FeedItem => ({ id: e.id, type: "ebook", title: e.title, subtitle: e.description || "", cover: e.cover || "", score: 0, reason: "深度阅读" })),
    ];
  }

  private async getPremiumFeed(_userId: string, size: number): Promise<FeedItem[]> {
    const half = Math.floor(size / 2);
    const [courses, products] = await Promise.all([
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: { id: true, title: true, intro: true, cover: true },
        orderBy: { studentCount: "desc" },
        take: half,
      }),
      this.prisma.product.findMany({
        where: { status: "LISTED" },
        select: { id: true, title: true, intro: true, images: true },
        orderBy: { createdAt: "desc" },
        take: half,
      }),
    ]);

    return [
      ...courses.map((c): FeedItem => ({ id: c.id, type: "course", title: c.title, subtitle: c.intro || "", cover: c.cover || "", score: 0, reason: "精品课程" })),
      ...products.map((p): FeedItem => ({ id: p.id, type: "product", title: p.title, subtitle: p.intro || "", cover: p.images?.[0] || "", score: 0, reason: "高端服务" })),
    ];
  }

  private async getDefaultFeed(userId: string, size: number): Promise<FeedItem[]> {
    try {
      const recommended = await this.recommend.personalized(userId);
      if (!recommended || !Array.isArray(recommended)) return [];
      return (recommended as any[]).slice(0, size).map((r): FeedItem => ({
        id: r.id || "",
        type: (r.type as FeedItem["type"]) || "article",
        title: r.title || "",
        subtitle: r.reason || "",
        cover: r.cover || "",
        score: r.score || 0,
        reason: r.reason || "智能推荐",
      }));
    } catch (err) {
      this.logger.warn(`智能推荐获取失败: ${(err as Error).message}`);
      return [];
    }
  }

  /** AI 智能排序 */
  private async aiRankItems(userId: string, items: FeedItem[], segment: string): Promise<FeedItem[]> {
    try {
      const itemsList = items.slice(0, 20).map((item, i) =>
        `${i + 1}. [${item.type}] ${item.title} — ${item.subtitle || ""}`
      ).join("\n");

      const result = await this.gateway.chat({
        scene: "smart_feed",
        userId,
        messages: [
          {
            role: "system",
            content: `你是内容推荐排序助手。用户属于"${segment}"类型。请对候选内容重新排序，返回JSON数组格式的前10个序号。只返回JSON，不要其他文字。`,
          },
          { role: "user", content: `候选内容:\n${itemsList}\n\n请为${segment}用户重新排序，返回前10个的序号数组。` },
        ],
        options: { temperature: 0.2, maxTokens: 256 },
      });

      const match = result.content.match(/\[[\d,\s]+\]/);
      if (match) {
        const ranked = JSON.parse(match[0]) as number[];
        const reranked: FeedItem[] = [];
        const rest = [...items];
        for (const idx of ranked) {
          if (idx >= 1 && idx <= rest.length) {
            reranked.push(rest[idx - 1]);
          }
        }
        for (const item of rest) {
          if (!reranked.includes(item)) reranked.push(item);
        }
        return reranked;
      }
    } catch (err) {
      this.logger.warn("AI排序失败，使用默认排序", err);
    }

    return items;
  }

  private async getTotalPayment(userId: string): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: { userId, status: "PAID" },
      _sum: { amount: true },
    });
    return Number(result._sum?.amount) || 0;
  }
}
