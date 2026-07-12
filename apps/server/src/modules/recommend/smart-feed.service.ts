import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RecommendService } from "./recommend.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

/**
 * 首页聚合瀑布流「九类卡统一信封」。
 *
 * 旧字段（id/type/title/subtitle/cover/score/reason）全部保留，向后兼容既有前端消费方；
 * 新增字段（coverRatio/author/metric/payload）均为可选，供九类卡片渲染差异化信息。
 *
 * type 九类：video 短视频 / article 文章 / post 圈子帖 / course 课程 / product 商品 /
 *   classic 古籍 / live 直播 / paipan 排盘钩子卡 / agent 智能体引导卡。
 * circle、ebook 保留仅作历史兼容（首页帖子统一走 post；电子书板块已下线）。
 */
interface FeedItem {
  id: string;
  type:
    | "video"
    | "article"
    | "post"
    | "course"
    | "product"
    | "classic"
    | "live"
    | "paipan"
    | "agent"
    // 历史兼容：circle（圈子）、ebook（电子书·已下线）
    | "circle"
    | "ebook";
  title: string;
  subtitle?: string;
  cover?: string;
  score: number;
  reason: string;
  /** 封面比例：'3:4' 竖屏短视频 / '4:3' 直播 / '1:1' 头像位 / '16:9' 横图 */
  coverRatio?: string;
  /** 作者信息（内容卡展示作者行） */
  author?: { name: string; avatar?: string };
  /** 卡片主指标：kind 如 play/like/view/price/students/readers/members/action */
  metric?: { kind: string; value: string | number };
  /** 类型专属负载：course{price,originalPrice,free}·product{price}·video{duration}·live{isLive,viewers}·post{circleName} 等 */
  payload?: Record<string, unknown>;
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

/** 各内容源统一 select（含 author/metric/payload 所需字段·mock 缺字段读到 undefined 安全回退） */
const ARTICLE_SELECT = {
  id: true,
  title: true,
  excerpt: true,
  cover: true,
  likeCount: true,
  user: { select: { nickname: true, avatar: true } },
} as const;

const COURSE_SELECT = {
  id: true,
  title: true,
  intro: true,
  cover: true,
  price: true,
  originalPrice: true,
  studentCount: true,
} as const;

const CLASSIC_SELECT = {
  id: true,
  title: true,
  intro: true,
  cover: true,
  viewCount: true,
} as const;

const POST_SELECT = {
  id: true,
  title: true,
  content: true,
  images: true,
  user: { select: { nickname: true, avatar: true } },
  circle: { select: { name: true } },
} as const;

const PRODUCT_SELECT = {
  id: true,
  title: true,
  intro: true,
  images: true,
  price: true,
  originalPrice: true,
} as const;

/** 混排纪律：一屏窗口大小（约一屏 4-6 卡） */
const SCREEN_WINDOW = 5;
/** 混排纪律：每屏窗口内至多 1 张工具/交易卡（product/paipan/agent） */
const TOOL_TYPES = new Set<FeedItem["type"]>(["product", "paipan", "agent"]);

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

    // 空兜底：某分层策略无产出（如 normal 段 personalized 返空 / 该段数据源恰好为空）时，
    // 回落到热门混排（新手池：热门文章/课程/古籍/视频），确保任何用户首页都有内容、不留白。
    if (items.length === 0) {
      items = await this.getNewUserFeed(userId, pageSize);
    }

    // 质量因子（创-P1·任务八接线）：qualityScore 作为排序因子（权重 0.3）·<40 分标记软限流
    const { items: qualityWeighted, lowQuality } = await this.applyQualityWeight(items);

    // 时段因子：作为基础权重乘子在 AI 重排之前生效；AI 不可用时降级路径同样保留时段排序
    items = this.applyTimeSlotWeight(qualityWeighted, timeSlot);

    // 电子书板块下线后内容源由 4 类减为 3 类，阈值同步下调（生产 feed 每源多条恒满足此阈值，无实际影响）
    if (items.length > 2) {
      items = await this.aiRankItems(userId, items, segment);
    }

    // 低分软限流：<40 分内容整体沉底（放在 AI 重排之后执行，保证最终序仍沉底）
    if (lowQuality.size > 0) {
      const isLow = (i: FeedItem) => lowQuality.has(`${i.type}:${i.id}`);
      items = [...items.filter((i) => !isLow(i)), ...items.filter(isLow)];
    }

    // 运营固定卡注入（paipan 排盘钩子 + agent 智能体引导）：仅在有内容卡时注入，
    // 空 feed（未登录降级/mock 无源）不注入，避免首页只剩两张工具卡。
    if (items.length > 0) {
      items = this.injectHookCards(items);
    }

    // 混排纪律轻量重排：一屏窗口（≈5 卡）内至多 1 张工具/交易卡（product/paipan/agent），
    // 避免工具卡扎堆；内容卡为主序不变。
    items = this.enforceMixDiscipline(items);

    return {
      userId,
      userSegment: segment,
      items: items.slice((page - 1) * pageSize, page * pageSize),
      timeSlot,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 匿名热门流（未登录游客预览用）：不做个性化分层/AI 排序（无 userId），
   * 直接取热门内容混排（新手池含热门文章/课程/古籍/视频）+ 时段权重 + 钩子卡注入 + 混排纪律。
   * 让游客也能预览首页，不再白屏。
   */
  async getAnonymousFeed(page = 1, pageSize = 20): Promise<SmartFeedResult> {
    const timeSlot = this.resolveTimeSlot();
    let items = await this.getNewUserFeed("", pageSize); // _userId 未被使用，安全传空
    items = this.applyTimeSlotWeight(items, timeSlot);
    if (items.length > 0) items = this.injectHookCards(items);
    items = this.enforceMixDiscipline(items);
    return {
      userId: null as unknown as string,
      userSegment: "anonymous",
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
    const [articles, courses, classics, videos] = await Promise.all([
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED" },
        select: ARTICLE_SELECT,
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: COURSE_SELECT,
        orderBy: { studentCount: "desc" },
        take: quarter,
      }),
      this.prisma.classicBook.findMany({
        where: { status: "PUBLISHED" },
        select: CLASSIC_SELECT,
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.getVideoItems(quarter, "为你推荐"),
    ]);

    return [
      ...articles.map((a): FeedItem => this.mapArticle(a, "新手推荐")),
      ...courses.map((c): FeedItem => this.mapCourse(c, "入门课程")),
      ...classics.map((b): FeedItem => this.mapClassic(b, "经典必读")),
      ...videos,
    ];
  }

  private async getAdvancedFeed(_userId: string, size: number): Promise<FeedItem[]> {
    const quarter = Math.floor(size / 4);
    const [posts, articles, classics, lives] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: "PUBLISHED", isEssence: true },
        select: POST_SELECT,
        orderBy: { createdAt: "desc" },
        take: quarter,
      }),
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED" },
        select: ARTICLE_SELECT,
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.prisma.classicBook.findMany({
        where: { status: "PUBLISHED" },
        select: CLASSIC_SELECT,
        orderBy: { viewCount: "desc" },
        take: quarter,
      }),
      this.getLiveItems(quarter, "正在直播"),
    ]);

    return [
      ...posts.map((p): FeedItem => this.mapPost(p, "精华内容")),
      ...articles.map((a): FeedItem => this.mapArticle(a, "深度推荐")),
      ...classics.map((b): FeedItem => this.mapClassic(b, "经典研读")),
      ...lives,
    ];
  }

  private async getPremiumFeed(_userId: string, size: number): Promise<FeedItem[]> {
    const half = Math.floor(size / 2);
    const [courses, products] = await Promise.all([
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: COURSE_SELECT,
        orderBy: { studentCount: "desc" },
        take: half,
      }),
      this.prisma.product.findMany({
        where: { status: "ON_SALE" },
        select: PRODUCT_SELECT,
        orderBy: { createdAt: "desc" },
        take: half,
      }),
    ]);

    return [
      ...courses.map((c): FeedItem => this.mapCourse(c, "精品课程")),
      ...products.map((p): FeedItem => this.mapProduct(p, "高端服务")),
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

  // ─── 内容源 → 统一信封 mapper（补 author/metric/coverRatio/payload） ───

  private toNum(v: unknown): number {
    if (v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private mapArticle(a: any, reason: string): FeedItem {
    const likes = this.toNum(a.likeCount);
    return {
      id: a.id,
      type: "article",
      title: a.title,
      subtitle: a.excerpt || "",
      cover: a.cover || "",
      score: 0,
      reason,
      coverRatio: "16:9",
      author: a.user ? { name: a.user.nickname, avatar: a.user.avatar || undefined } : undefined,
      metric: { kind: "like", value: likes },
    };
  }

  private mapCourse(c: any, reason: string): FeedItem {
    const price = this.toNum(c.price);
    const originalPrice = c.originalPrice != null ? this.toNum(c.originalPrice) : undefined;
    const free = price === 0;
    return {
      id: c.id,
      type: "course",
      title: c.title,
      subtitle: c.intro || "",
      cover: c.cover || "",
      score: 0,
      reason,
      coverRatio: "16:9",
      metric: { kind: "students", value: this.toNum(c.studentCount) },
      payload: { price, originalPrice, free },
    };
  }

  private mapClassic(b: any, reason: string): FeedItem {
    return {
      id: b.id,
      type: "classic",
      title: b.title,
      subtitle: b.intro || "",
      cover: b.cover || "",
      score: 0,
      reason,
      coverRatio: "3:4",
      metric: { kind: "readers", value: this.toNum(b.viewCount) },
    };
  }

  private mapPost(p: any, reason: string): FeedItem {
    const cover = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "";
    return {
      id: p.id,
      type: "post",
      title: p.title || "精华帖",
      subtitle: (p.content || "").slice(0, 100),
      cover,
      score: 0,
      reason,
      coverRatio: "1:1",
      author: p.user ? { name: p.user.nickname, avatar: p.user.avatar || undefined } : undefined,
      payload: p.circle?.name ? { circleName: p.circle.name } : undefined,
    };
  }

  private mapProduct(p: any, reason: string): FeedItem {
    const price = this.toNum(p.price);
    const originalPrice = p.originalPrice != null ? this.toNum(p.originalPrice) : undefined;
    return {
      id: p.id,
      type: "product",
      title: p.title,
      subtitle: p.intro || "",
      cover: p.images?.[0] || "",
      score: 0,
      reason,
      coverRatio: "1:1",
      metric: { kind: "price", value: price },
      payload: { price, originalPrice },
    };
  }

  /**
   * 短视频源 → 信封。查已发布、全平台可见、非私密视频；author 取创作者昵称/头像。
   * 该表在部分单测 mock 中未提供，捕获异常按空源降级（不影响其它类）。
   */
  private async getVideoItems(take: number, reason: string): Promise<FeedItem[]> {
    if (take <= 0) return [];
    try {
      const videos = await this.prisma.video.findMany({
        where: { status: "PUBLISHED", visibility: "PLATFORM", isPrivate: false },
        select: {
          id: true,
          title: true,
          description: true,
          coverUrl: true,
          duration: true,
          viewCount: true,
          likeCount: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: { viewCount: "desc" },
        take,
      });
      return videos.map((v: any): FeedItem => ({
        id: v.id,
        type: "video",
        title: v.title || "精彩短视频",
        subtitle: v.description || "",
        cover: v.coverUrl || "",
        score: 0,
        reason,
        coverRatio: "3:4",
        author: v.user ? { name: v.user.nickname, avatar: v.user.avatar || undefined } : undefined,
        metric: { kind: "play", value: this.toNum(v.viewCount) },
        payload: { duration: this.toNum(v.duration) },
      }));
    } catch (err) {
      this.logger.warn(`短视频源查询失败，按空源降级: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * 直播源 → 信封。查进行中（LIVING）与预告（WAITING）、全平台可见、审核通过的直播；
   * 进行中优先（isLive）。该表在部分单测 mock 中未提供，捕获异常按空源降级。
   */
  private async getLiveItems(take: number, reason: string): Promise<FeedItem[]> {
    if (take <= 0) return [];
    try {
      const lives = await this.prisma.liveRoom.findMany({
        where: {
          status: { in: ["LIVING", "WAITING"] },
          visibility: "PLATFORM",
          auditStatus: "APPROVED",
        },
        select: {
          id: true,
          title: true,
          cover: true,
          status: true,
          viewCount: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: [{ status: "asc" }, { viewCount: "desc" }],
        take,
      });
      return lives.map((l: any): FeedItem => {
        const isLive = l.status === "LIVING";
        const viewers = this.toNum(l.viewCount);
        return {
          id: l.id,
          type: "live",
          title: l.title,
          subtitle: isLive ? "正在直播中" : "直播预告",
          cover: l.cover || "",
          score: 0,
          reason,
          coverRatio: "4:3",
          author: l.user ? { name: l.user.nickname, avatar: l.user.avatar || undefined } : undefined,
          metric: { kind: "view", value: viewers },
          payload: { isLive, viewers },
        };
      });
    } catch (err) {
      this.logger.warn(`直播源查询失败，按空源降级: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * 注入运营固定卡：paipan 排盘钩子卡（靠前·前三屏必出）+ agent 智能体引导卡。
   *
   * 非内容表，用常量运营文案（不造假数据）。paipan 插入到列表靠前位置（第 3 位·首屏内），
   * agent 插入到稍后位置（第 8 位左右），两者错开避免工具卡相邻；后续 enforceMixDiscipline
   * 再统一保证一屏窗口内工具卡不超过 1 张。
   */
  private injectHookCards(items: FeedItem[]): FeedItem[] {
    const paipanCard: FeedItem = {
      id: "hook-paipan",
      type: "paipan",
      title: "今日运势 · 一测便知",
      subtitle: "结合生辰八字，看看你的今日宜忌与运程",
      score: 0,
      reason: "每日一测",
      coverRatio: "4:3",
      metric: { kind: "action", value: "测一测" },
      payload: { hint: "今日运势·点击测算", action: "paipan" },
    };
    const agentCard: FeedItem = {
      id: "hook-agent",
      type: "agent",
      title: "国学智能体 · 有问必答",
      subtitle: "「我的本命卦象是什么？」——问问 AI 国学助手",
      score: 0,
      reason: "智能问答",
      coverRatio: "4:3",
      metric: { kind: "action", value: "问一问" },
      payload: { question: "我的本命卦象是什么？", action: "agent" },
    };

    const result = [...items];
    // paipan 靠前：插到第 3 位（首屏内·前三屏必出）；列表过短则追加到末尾。
    const paipanPos = Math.min(2, result.length);
    result.splice(paipanPos, 0, paipanCard);
    // agent 稍后：插到第 8 位左右，与 paipan 错开一屏。
    const agentPos = Math.min(7, result.length);
    result.splice(agentPos, 0, agentCard);
    return result;
  }

  /**
   * 混排纪律轻量重排：滑动窗口（约一屏 SCREEN_WINDOW 卡）内至多 1 张工具/交易卡
   * （product/paipan/agent）。发现窗口内第 2 张工具卡时，后移与之后最近的内容卡交换，
   * 打散工具卡扎堆。单趟线性扫描，不做过度全局最优化。
   */
  private enforceMixDiscipline(items: FeedItem[]): FeedItem[] {
    const result = [...items];
    for (let i = 0; i < result.length; i++) {
      if (!TOOL_TYPES.has(result[i].type)) continue;
      // 检查该工具卡所在窗口起点之后、同窗口内是否已有工具卡
      const windowStart = Math.max(0, i - (SCREEN_WINDOW - 1));
      let toolInWindow = false;
      for (let j = windowStart; j < i; j++) {
        if (TOOL_TYPES.has(result[j].type)) {
          toolInWindow = true;
          break;
        }
      }
      if (!toolInWindow) continue;
      // 与之后最近的内容卡交换，把该工具卡后移出当前窗口
      let swap = -1;
      for (let k = i + 1; k < result.length; k++) {
        if (!TOOL_TYPES.has(result[k].type)) {
          swap = k;
          break;
        }
      }
      if (swap === -1) break; // 后面全是工具卡，无法再打散
      const tmp = result[i];
      result[i] = result[swap];
      result[swap] = tmp;
      // 交换后当前位是内容卡，i 原地重新评估（下一轮 i++ 前不需特殊处理）
      i--;
    }
    return result;
  }

  private async getTotalPayment(userId: string): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: { userId, status: "PAID" },
      _sum: { amount: true },
    });
    return Number(result._sum?.amount) || 0;
  }
}
