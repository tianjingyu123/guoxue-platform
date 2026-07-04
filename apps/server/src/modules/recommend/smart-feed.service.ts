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

/** 时段（按请求时刻·Asia/Shanghai 时区） */
export type TimeSlot = "morning" | "afternoon" | "evening";

/**
 * 时段→内容类型族 加权映射表（常量·便于调整）
 *
 * - morning  早 5-11 时：轻内容类（文章/帖子·晨间碎片阅读；运势/宜忌/签到由首页固定卡片承载，不在 feed 类型内）
 * - afternoon 午 11-17 时：诗词/古籍/短内容休闲类（classic 覆盖古籍诗词·post 短内容）
 * - evening  晚 17-24 时（0-5 顺延晚间）：课程/学习计划/深度长文类（course/ebook 深度学习内容）
 *
 * 未命中的类型（circle/product 等）权重保持 1 不变。
 */
const TIME_SLOT_BOOSTED_TYPES: Record<TimeSlot, ReadonlyArray<FeedItem["type"]>> = {
  morning: ["article", "post"],
  afternoon: ["classic", "post"],
  evening: ["course", "ebook"],
};

/** 时段族基础权重乘子 */
const TIME_SLOT_BOOST_FACTOR = 1.3;

/** 内容质量排序因子权重（创-P1·任务八接线）：加权乘子 = 1 + 0.3 × (total/100)，满分内容最多 +30% */
const QUALITY_WEIGHT = 0.3;
/** 低分软限流阈值：<40 分不加权并沉底（不删除） */
const QUALITY_LOW_THRESHOLD = 40;

export interface SmartFeedResult {
  userId: string;
  userSegment: string;
  items: FeedItem[];
  /** 当前时段（Asia/Shanghai）·getFeed 恒返回；声明可选以兼容匿名降级等旧构造 */
  timeSlot?: TimeSlot;
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
    const timeSlot = this.resolveTimeSlot();

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

    // 质量因子（创-P1·任务八接线）：qualityScore 作为排序因子（权重 0.3）·<40 分标记软限流
    const { items: qualityWeighted, lowQuality } = await this.applyQualityWeight(items);

    // 时段因子：作为基础权重乘子在 AI 重排之前生效；AI 不可用时降级路径同样保留时段排序
    items = this.applyTimeSlotWeight(qualityWeighted, timeSlot);

    if (items.length > 3) {
      items = await this.aiRankItems(userId, items, segment);
    }

    // 低分软限流：<40 分内容整体沉底（放在 AI 重排之后执行，保证最终序仍沉底）
    if (lowQuality.size > 0) {
      const isLow = (i: FeedItem) => lowQuality.has(`${i.type}:${i.id}`);
      items = [...items.filter((i) => !isLow(i)), ...items.filter(isLow)];
    }

    return {
      userId,
      userSegment: segment,
      items: items.slice((page - 1) * pageSize, page * pageSize),
      timeSlot,
      generatedAt: new Date().toISOString(),
    };
  }

  /** 按请求时刻求当前时段（Asia/Shanghai 时区·与服务器本地时区无关） */
  private resolveTimeSlot(now: Date = new Date()): TimeSlot {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Shanghai",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    );
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "afternoon";
    return "evening"; // 17-24 及 0-5 顺延晚间
  }

  /**
   * 应用时段族基础权重乘子并按加权分稳定排序
   *
   * score 为 0 的候选取基准 1 再乘因子，保证乘子对纯热度型 feed（score 全 0）同样生效；
   * 同权重项保持原有相对顺序（稳定排序），不破坏各分层策略自身的编排。
   */
  private applyTimeSlotWeight(items: FeedItem[], slot: TimeSlot): FeedItem[] {
    const boosted = new Set<FeedItem["type"]>(TIME_SLOT_BOOSTED_TYPES[slot]);
    return items
      .map((item): FeedItem => {
        const factor = boosted.has(item.type) ? TIME_SLOT_BOOST_FACTOR : 1;
        return { ...item, score: (item.score || 1) * factor };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 内容质量排序因子（创-P1·任务八接线）：
   * - 已评分的 article/post（ContentQualityScore 只覆盖这两型）：score ×(1 + 0.3×total/100)
   * - <40 分：不加权并标记软限流（排序沉底）。诚实说明：feed 候选无「关注关系」上下文（各分层策略为
   *   热度/精华/推荐混排，不区分关注流），设计给的两个备选中「仅关注者可见」在此查询结构下不可行，
   *   故取「排序沉底」实现——内容不删除、不隐藏，仅排到列表末尾。
   * - 未评分内容不动；质量查询失败按无因子降级，不影响 feed 可用性。
   */
  private async applyQualityWeight(
    items: FeedItem[],
  ): Promise<{ items: FeedItem[]; lowQuality: Set<string> }> {
    const lowQuality = new Set<string>();
    const targets = items.filter((i) => i.type === "article" || i.type === "post");
    if (targets.length === 0) return { items, lowQuality };
    try {
      const rows = await this.prisma.contentQualityScore.findMany({
        where: { OR: targets.map((t) => ({ targetType: t.type.toUpperCase(), targetId: t.id })) },
        select: { targetType: true, targetId: true, total: true },
      });
      const totalMap = new Map(rows.map((r) => [`${r.targetType.toLowerCase()}:${r.targetId}`, r.total]));
      const weighted = items.map((item): FeedItem => {
        const total = totalMap.get(`${item.type}:${item.id}`);
        if (total === undefined) return item; // 未评分不动
        if (total < QUALITY_LOW_THRESHOLD) {
          lowQuality.add(`${item.type}:${item.id}`);
          return item; // 低分不加权（沉底在 getFeed 末段统一执行）
        }
        return { ...item, score: (item.score || 1) * (1 + QUALITY_WEIGHT * (total / 100)) };
      });
      return { items: weighted, lowQuality };
    } catch (err) {
      this.logger.warn(`质量因子加权失败，按无因子降级: ${(err as Error).message}`);
      return { items, lowQuality };
    }
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
