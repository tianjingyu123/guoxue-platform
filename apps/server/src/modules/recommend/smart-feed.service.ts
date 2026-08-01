import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RecommendService } from "./recommend.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { RedisService } from "../../redis/redis.service";
import {
  isPublicContentQuarantined,
  publicQuarantinedIds,
} from "../../common/public-content-quarantine";

/**
 * 首页聚合瀑布流「九类卡统一信封」。
 *
 * 旧字段（id/type/title/subtitle/cover/score/reason）全部保留，向后兼容既有前端消费方；
 * 新增字段（coverRatio/author/metric/payload）均为可选，供九类卡片渲染差异化信息。
 *
 * type 九类：video 短视频 / article 文章 / post 圈子帖（仅历史兼容，不进入平台流） / course 课程 / product 商品 /
 *   classic 古籍 / live 直播 / paipan 排盘钩子卡 / agent 智能体引导卡。
 * circle、ebook 保留仅作历史兼容（首页帖子统一走 post；电子书板块已下线）。
 */
export interface FeedItem {
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
// 注：圈子帖(post)不出圈，不参与平台 feed 混排与加权（仅文章可出圈）
const TIME_SLOT_BOOSTED_TYPES: Record<TimeSlot, ReadonlyArray<FeedItem["type"]>> = {
  morning: ["article", "video"],
  // 午间=诗词古籍休闲类（见上方注释）；course 属晚间深度学习族，此前被误加进午间
  // 导致课程与古籍同乘 1.3 抢占午间榜首（spec 时段因子用例失败·2026-07-15 修回）
  afternoon: ["classic"],
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
  author: true,
  dynasty: true,
  category: true,
  viewCount: true,
} as const;

const PRODUCT_SELECT = {
  id: true,
  title: true,
  intro: true,
  images: true,
  price: true,
  originalPrice: true,
  stock: true,
  salesCount: true,
  tags: true,
  sceneTags: true,
} as const;

/** 当前生产种子商品的项目内方形首图；真实 images 写入后自动优先使用真实数据。 */
/**
 * 种子商品图由 H5 静态托管统一提供。
 * 小程序包不再重复携带这些大图，因此始终返回完整 H5 地址；
 * H5_BASE_URL 允许各环境覆盖，未配置时回退到平台公开生产域名。
 */
const h5Asset = (path: string): string => {
  const base = (
    process.env.PUBLIC_ASSET_ORIGIN ||
    process.env.PUBLIC_H5_URL ||
    process.env.H5_BASE_URL ||
    ""
  ).replace(/\/+$/, "");
  return `${base}${path}`;
};

const PRODUCT_SEED_COVERS: Record<string, string> = {
  "a560eb0f-2c5b-4c90-a10c-025d1738804a": h5Asset("/static/images/products/wenfang-set.webp"),
  "7722247e-f20f-475e-80dd-33c1ba283568": h5Asset("/static/images/products/classics-audio-player.webp"),
  "58cae0ba-1dff-4945-b235-d16f5672e8c3": h5Asset("/static/images/products/zisha-tea-set.webp"),
};

// ─── 规模化缓存参数（抗 10 万 DAU·首页最高频接口·见下方缓存 key 论证） ───
/**
 * 各缓存 TTL（秒）。原则：候选池/分层结果变化缓慢，短 TTL 即可消掉每请求的十余次 DB 查询，
 * 又能在秒~分钟级追上新内容。所有缓存均经 RedisService.getOrSet（cache-aside + 防击穿互斥锁 +
 * Redis 不可用自动降级内存），任何缓存故障都不会让首页出错，只退化为直查 DB。
 */
/** 用户分层缓存（classifyUser）：分层由累计订单/兴趣/发帖/注册天数决定，变化很慢 → 5 分钟 */
const SEGMENT_TTL = 300;
/** 全局候选池缓存（new/advanced/premium/broad·不含用户私有数据·全平台共享）→ 2 分钟 */
const POOL_TTL = 120;
/** 个性化候选池缓存（default/normal 段·按 userId 隔离·含个性化推荐）→ 1 分钟 */
const POOL_TTL_USER = 60;
/** 分类 feed 缓存（发现页分区·全局热门·按 type/page 隔离）→ 2 分钟 */
const CATEGORY_TTL = 120;
/** AI 重排序结果缓存（按 segment+候选签名·纯公共内容重排序·无用户私有数据）→ 2 分钟 */
const AIRANK_TTL = 120;
/** AI 重排在线等待上限（毫秒）：超时立即走非 AI 兜底，绝不让首页等待 LLM */
const AI_RANK_TIMEOUT_MS = 800;

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
    private readonly redis: RedisService,
  ) {}

  /**
   * 统一缓存包装：走 RedisService.getOrSet（cache-aside + 防击穿互斥锁 + Redis 不可用降级内存）。
   * 任何缓存层异常都兜底为直接回源 factory()，保证首页永不因缓存故障而报错/白屏。
   */
  private async cached<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
    try {
      return await this.redis.getOrSet(key, ttl, factory);
    } catch (err) {
      this.logger.warn(`缓存读写失败，直接回源(${key}): ${(err as Error).message}`);
      return factory();
    }
  }

  /** 短哈希（djb2·仅用于压缩缓存 key 长度·非安全用途） */
  private hashKey(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  /** 获取智能信息流 */
  async getFeed(userId: string, page = 1, pageSize = 20): Promise<SmartFeedResult> {
    const segment = await this.classifyUser(userId);
    const timeSlot = this.resolveTimeSlot();

    // 候选池缓存：
    // - new/advanced/premium 三段的池函数均忽略 userId（纯热门/全平台共享），故用「全局 key」按
    //   segment+pageSize 缓存，所有同段用户共享一份池，天然无跨用户串味（池里只有公开内容）。
    // - default(normal 段) 走个性化推荐 personalized(userId)，含用户私有排序，必须按 userId 隔离缓存，
    //   否则会把 A 的个性化流串给 B（串味）。故 key 带 userId、TTL 更短。
    let items: FeedItem[] = [];
    switch (segment) {
      case "new":
        items = await this.cached(`smartfeed:pool:new:${pageSize}`, POOL_TTL, () => this.getNewUserFeed(userId, pageSize));
        break;
      case "advanced":
        items = await this.cached(`smartfeed:pool:advanced:${pageSize}`, POOL_TTL, () => this.getAdvancedFeed(userId, pageSize));
        break;
      case "premium":
        items = await this.cached(`smartfeed:pool:premium:${pageSize}`, POOL_TTL, () => this.getPremiumFeed(userId, pageSize));
        break;
      default:
        items = await this.cached(`smartfeed:pool:default:${userId}:${pageSize}`, POOL_TTL_USER, () => this.getDefaultFeed(userId, pageSize));
    }
    items = this.excludePublicQuarantine(items);

    // 空兜底：某分层策略无产出（如 normal 段 personalized 返空 / 该段数据源恰好为空）时，
    // 回落到热门混排（新手池：热门文章/课程/古籍/视频），确保任何用户首页都有内容、不留白。
    // 复用同一全局新手池缓存（与 new 段共享），无串味。
    if (items.length === 0) {
      items = await this.cached(`smartfeed:pool:new:${pageSize}`, POOL_TTL, () => this.getNewUserFeed(userId, pageSize));
      items = this.excludePublicQuarantine(items);
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

    // 运营固定卡注入（真实学习型智能体）：仅在有内容卡时注入，
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
    // 广口径池为全平台共享热门（getBroadFeed 无 userId 参数），全局 key 缓存·无串味
    let items = await this.cached(`smartfeed:pool:broad:${pageSize}`, POOL_TTL, () => this.getBroadFeed(pageSize)); // 广口径 6 类公开内容
    items = this.excludePublicQuarantine(items);
    // 游客可见内容控制：后台配置 ConfigSystem.guest.visibleTypes（JSON 类型白名单）·空/未配 = 全部可见
    const allow = await this.getGuestVisibleTypes();
    if (allow) items = items.filter((i) => allow.has(i.type));
    items = this.applyTimeSlotWeight(items, timeSlot);
    // 智能体钩子卡也受游客白名单约束
    if (items.length > 0) items = this.injectHookCards(items, allow);
    items = this.enforceMixDiscipline(items);
    return {
      userId: null as unknown as string,
      userSegment: "anonymous",
      items: items.slice((page - 1) * pageSize, page * pageSize),
      timeSlot,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 游客可见内容类型白名单（后台 ConfigSystem.guest.visibleTypes）。
   * 返回 Set 表示仅这些类型对游客可见；返回 null 表示未配置=全部可见。
   * 后台改此键即控制"未登录用户能看到哪些内容"。
   */
  private async getGuestVisibleTypes(): Promise<Set<FeedItem["type"]> | null> {
    try {
      const row = await this.prisma.configSystem.findUnique({
        where: { configKey: "guest.visibleTypes" },
        select: { configValue: true },
      });
      if (!row?.configValue) return null;
      const arr = JSON.parse(row.configValue) as unknown;
      if (!Array.isArray(arr) || arr.length === 0) return null; // 空数组视为不限制（避免误配全屏蔽）
      return new Set(arr.map((t) => String(t) as FeedItem["type"]));
    } catch {
      return null; // 读取/解析失败 → 不限制（诚实降级，不误伤内容）
    }
  }

  /**
   * 按类别取内容 feed（发现页分区用·统一信封）。公开类型为 course/classic/video/live/article/product。
   * 历史 post 参数保留兼容，但固定返回空数组。
   * 复用各类型查询与 mapXxx 映射，返回该类别的一页 FeedItem[]（分页）。
   */
  async getCategoryFeed(type: string, page = 1, size = 6): Promise<FeedItem[]> {
    // 分类 feed 为全平台共享热门（按 viewCount/studentCount 排序·无用户私有数据），
    // 全局 key 按 type/page/size 缓存，无跨用户串味。
    const items = await this.cached(`smartfeed:cat:v4:${type}:${page}:${size}`, CATEGORY_TTL, () => this.computeCategoryFeed(type, page, size));
    return this.excludePublicQuarantine(items);
  }

  /** 平台流统一出口兜底：圈帖永不出圈；同时覆盖个性化推荐与旧缓存。 */
  private excludePublicQuarantine(items: FeedItem[]): FeedItem[] {
    return items.filter(
      (item) =>
        item.type !== "post" &&
        (item.type !== "article" || Boolean(item.cover?.trim())) &&
        !isPublicContentQuarantined(item.type, item.id),
    );
  }

  private async computeCategoryFeed(type: string, page = 1, size = 6): Promise<FeedItem[]> {
    const skip = (Math.max(1, page) - 1) * size;
    try {
      switch (type) {
        case "course": {
          const rows = await this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: COURSE_SELECT, orderBy: { studentCount: "desc" }, take: size, skip });
          return rows.map((c) => this.mapCourse(c, "精选课程"));
        }
        case "classic": {
          const rows = await this.prisma.classicBook.findMany({ where: { status: "PUBLISHED" }, select: CLASSIC_SELECT, orderBy: { viewCount: "desc" }, take: size, skip });
          return rows.map((b) => this.mapClassic(b, "经典古籍"));
        }
        case "article": {
          const rows = await this.prisma.article.findMany({ where: { id: { notIn: publicQuarantinedIds("article") }, auditStatus: "APPROVED", visibility: "PLATFORM", cover: { not: "" } }, select: ARTICLE_SELECT, orderBy: { viewCount: "desc" }, take: size, skip });
          return rows.map((a) => this.mapArticle(a, "热门文章"));
        }
        case "product": {
          const rows = await this.prisma.product.findMany({ where: { id: { notIn: publicQuarantinedIds("product") }, status: "ON_SALE" }, select: PRODUCT_SELECT, orderBy: { createdAt: "desc" }, take: size, skip });
          return rows.map((p) => this.mapProduct(p, "严选好物"));
        }
        case "post": {
          // 保留历史 type 的接口兼容，但圈帖只允许在所属圈子内展示。
          return [];
        }
        case "video":
          return this.getVideoItems(size, "热门短视频", skip);
        case "live":
          return this.getLiveItems(size, "正在直播", skip);
        default:
          return [];
      }
    } catch {
      return [];
    }
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

  /**
   * 用户分层（带缓存）。分层依据（累计订单/兴趣数/发帖数/注册天数/累计消费）变化很慢，
   * 按 userId 缓存 5 分钟即可消掉每次首页的 5 次 DB 查询。key 含 userId，无跨用户串味。
   */
  private async classifyUser(userId: string): Promise<"new" | "advanced" | "premium" | "normal"> {
    return this.cached(`smartfeed:seg:${userId}`, SEGMENT_TTL, () => this.computeUserSegment(userId));
  }

  /** 用户分层实算（无缓存·供 classifyUser 缓存包装调用） */
  private async computeUserSegment(userId: string): Promise<"new" | "advanced" | "premium" | "normal"> {
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
        where: { auditStatus: "APPROVED", visibility: "PLATFORM", cover: { not: "" } },
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

  /**
   * 广口径混排（游客/预览首页用）：6 类公开内容（文章/课程/古籍/视频/直播/商品）。
   * 圈帖不进入平台混排。仅 getAnonymousFeed 使用，不影响登录分层策略与其测试。
   */
  private async getBroadFeed(size: number): Promise<FeedItem[]> {
    // 圈子帖不出圈：平台混排仅含文章/课程/古籍/视频/直播/商品 6 类（不含 post）
    const per = Math.max(2, Math.floor(size / 6));
    const [articles, courses, classics, videos, lives, products] = await Promise.all([
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED", visibility: "PLATFORM", cover: { not: "" } }, select: ARTICLE_SELECT, orderBy: { viewCount: "desc" }, take: per }),
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: COURSE_SELECT, orderBy: { studentCount: "desc" }, take: per }),
      this.prisma.classicBook.findMany({ where: { status: "PUBLISHED" }, select: CLASSIC_SELECT, orderBy: { viewCount: "desc" }, take: per }),
      this.getVideoItems(per, "为你推荐"),
      this.getLiveItems(per, "正在直播"),
      this.prisma.product.findMany({ where: { status: "ON_SALE" }, select: PRODUCT_SELECT, orderBy: { createdAt: "desc" }, take: per }),
    ]);
    return [
      ...articles.map((a): FeedItem => this.mapArticle(a, "新手推荐")),
      ...courses.map((c): FeedItem => this.mapCourse(c, "入门课程")),
      ...classics.map((b): FeedItem => this.mapClassic(b, "经典必读")),
      ...videos,
      ...lives,
      ...products.map((p): FeedItem => this.mapProduct(p, "严选好物")),
    ];
  }

  private async getAdvancedFeed(_userId: string, size: number): Promise<FeedItem[]> {
    const quarter = Math.floor(size / 4);
    // 圈子帖不出圈：登录分层 feed 以文章/课程/古籍/直播替代原 post 位
    const [courses, articles, classics, lives] = await Promise.all([
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: COURSE_SELECT,
        orderBy: { studentCount: "desc" },
        take: quarter,
      }),
      this.prisma.article.findMany({
        where: { auditStatus: "APPROVED", visibility: "PLATFORM", cover: { not: "" } },
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
      ...courses.map((c): FeedItem => this.mapCourse(c, "精品课程")),
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

  /**
   * AI 智能排序（缓存 + 限时降级 · 首页永不因 AI 慢/挂而阻塞）。
   *
   * 规模化改造要点：
   * 1) **结果缓存**：AI 重排的输入只有 segment + 候选内容标题（候选池本身已按 segment 缓存，
   *    故同段用户的候选签名一致），输出是对这批「公开内容」的一个排序。因此缓存 key 用
   *    `segment + 候选签名哈希`，**不含 userId**——重排结果只是公共内容的先后次序，不含任何用户
   *    私有信息，同段用户共享该次序是正确的（同输入必同输出），且天然无跨用户串味。命中即
   *    直接套用，跳过 LLM。
   * 2) **限时在线等待**：未命中时最多等 {@link AI_RANK_TIMEOUT_MS} ms；LLM 及时返回则套用并写缓存，
   *    超时/失败立即返回「非 AI 兜底序」（即 items 原序，已含时段/质量权重），绝不让首页等 LLM。
   * 3) **异步回填**：超时兜底后，LLM 若稍晚返回仍写入缓存，供下一次同签名请求命中——LLM 由每请求
   *    一次降为「每个候选签名在 TTL 内至多一次」。
   */
  private async aiRankItems(userId: string, items: FeedItem[], segment: string): Promise<FeedItem[]> {
    const top = items.slice(0, 20);
    const signature = top.map((i) => `${i.type}:${i.id}`).join("|");
    const cacheKey = `smartfeed:airank:${segment}:${this.hashKey(signature)}`;

    // 1) 命中缓存：直接套用已算好的 AI 次序，不调 LLM
    try {
      const cachedOrder = await this.redis.getJson<number[]>(cacheKey);
      if (cachedOrder && Array.isArray(cachedOrder) && cachedOrder.length > 0) {
        return this.applyRankOrder(items, cachedOrder);
      }
    } catch {
      /* 缓存读失败：忽略，继续走限时 LLM 或兜底 */
    }

    const itemsList = top.map((item, i) =>
      `${i + 1}. [${item.type}] ${item.title} — ${item.subtitle || ""}`
    ).join("\n");

    // LLM 调用（解析出序号数组；解析失败→null）。独立成 promise 以便限时竞速 + 超时后异步回填。
    const chatPromise: Promise<number[] | null> = this.gateway
      .chat({
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
      })
      .then((result) => {
        const match = result.content.match(/\[[\d,\s]+\]/);
        return match ? (JSON.parse(match[0]) as number[]) : null;
      });

    // 2) 限时等待：超时立即以 null 兜底（不阻塞首页）
    let order: number[] | null = null;
    try {
      order = await Promise.race([
        chatPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_RANK_TIMEOUT_MS)),
      ]);
    } catch (err) {
      this.logger.warn("AI排序失败，使用默认排序", err as Error);
      order = null;
    }

    if (order && Array.isArray(order) && order.length > 0) {
      // LLM 及时返回：写缓存（失败不影响本次）并套用
      this.redis.setJson(cacheKey, order, AIRANK_TTL).catch(() => undefined);
      return this.applyRankOrder(items, order);
    }

    // 3) 超时/失败/空结果：非 AI 兜底（原序），同时后台把稍晚返回的 LLM 结果回填缓存供下次命中。
    //    统一挂 catch 吞掉 chatPromise 可能的 rejection，避免未处理拒绝。
    void chatPromise
      .then((late) => {
        if (late && Array.isArray(late) && late.length > 0) {
          return this.redis.setJson(cacheKey, late, AIRANK_TTL);
        }
        return undefined;
      })
      .catch(() => undefined);
    return items;
  }

  /** 按 AI 返回的 1-based 序号数组重排 items；未被点名的项按原序补在末尾。 */
  private applyRankOrder(items: FeedItem[], ranked: number[]): FeedItem[] {
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
      author: b.author ? { name: b.author } : undefined,
      metric: { kind: "readers", value: this.toNum(b.viewCount) },
      payload: {
        author: b.author || "",
        dynasty: b.dynasty || "",
        category: b.category || "",
      },
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
      cover: p.images?.[0] || PRODUCT_SEED_COVERS[p.id] || "",
      score: 0,
      reason,
      coverRatio: "1:1",
      metric: { kind: "price", value: price },
      payload: {
        price,
        originalPrice,
        salesCount: this.toNum(p.salesCount),
        stock: this.toNum(p.stock),
        // 商品卡标签只展示商家在发布端填写的 tags；sceneTags 仅用于推荐检索，不混入消费者文案。
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 2) : [],
      },
    };
  }

  /**
   * 短视频源 → 信封。查已发布、全平台可见、非私密视频；author 取创作者昵称/头像。
   * 该表在部分单测 mock 中未提供，捕获异常按空源降级（不影响其它类）。
   */
  private async getVideoItems(take: number, reason: string, skip = 0): Promise<FeedItem[]> {
    if (take <= 0) return [];
    try {
      const videos = await this.prisma.video.findMany({
        where: {
          status: "PUBLISHED",
          visibility: "PLATFORM",
          isPrivate: false,
          // 播放器联调种子只用于验播放器，禁止进入首页/发现正式内容流。
          // 用专用 ID 前缀精确隔离，不按标题/作者模糊过滤，避免误伤真实内容。
          NOT: { id: { startsWith: "demo-video-" } },
        },
        select: {
          id: true,
          title: true,
          description: true,
          coverUrl: true,
          videoUrl: true,
          duration: true,
          viewCount: true,
          likeCount: true,
          user: { select: { nickname: true, avatar: true } },
        },
        orderBy: { viewCount: "desc" },
        take,
        skip,
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
        // 无封面时前端用 videoUrl 首帧兜底（发布未传封面 → 取视频第一帧）
        payload: { duration: this.toNum(v.duration), videoUrl: v.videoUrl || "" },
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
  private async getLiveItems(take: number, reason: string, skip = 0): Promise<FeedItem[]> {
    if (take <= 0) return [];
    try {
      const select = {
        id: true,
        title: true,
        cover: true,
        status: true,
        viewCount: true,
        startTime: true,
        replayUrl: true,
        user: { select: { nickname: true, avatar: true } },
      } as const;
      const limit = take + skip;
      const baseWhere = { visibility: "PLATFORM", auditStatus: "APPROVED" } as const;
      // 按业务优先级分桶查询，避免 Prisma 按 LiveStatus 枚举顺序把 WAITING 排在 LIVING 前面。
      // 预告进入公共流前必须已有首图和介绍；回放必须已有可播放录像。
      const [living, waiting, replays] = await Promise.all([
        this.prisma.liveRoom.findMany({
          where: { ...baseWhere, status: "LIVING" },
          select,
          orderBy: { viewCount: "desc" },
          take: limit,
        }),
        this.prisma.liveRoom.findMany({
          where: {
            ...baseWhere,
            status: "WAITING",
            cover: { not: "" },
            description: { not: "" },
          },
          select,
          orderBy: [{ startTime: "asc" }, { viewCount: "desc" }],
          take: limit,
        }),
        this.prisma.liveRoom.findMany({
          where: { ...baseWhere, status: "REPLAY", replayUrl: { not: "" } },
          select,
          orderBy: { viewCount: "desc" },
          take: limit,
        }),
      ]);
      const lives = [...living, ...waiting, ...replays].slice(skip, skip + take);
      return lives.map((l: any): FeedItem => {
        const status = l.status === "LIVING" ? "live" : l.status === "REPLAY" ? "replay" : "upcoming";
        const isLive = status === "live";
        const viewers = this.toNum(l.viewCount);
        return {
          id: l.id,
          type: "live",
          title: l.title,
          subtitle: isLive ? "正在直播中" : status === "replay" ? "直播回放" : "直播预告",
          cover: l.cover || "",
          score: 0,
          reason,
          coverRatio: "4:3",
          author: l.user ? { name: l.user.nickname, avatar: l.user.avatar || undefined } : undefined,
          metric: { kind: "view", value: viewers },
          payload: {
            isLive,
            status,
            viewers,
            scheduledTime: l.startTime?.toISOString?.() || l.startTime || "",
            replayUrl: status === "replay" ? l.replayUrl || "" : "",
          },
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
   * 使用已上线 BotConfig 的真实 ID，首页卡片点击直接进入对应智能体对话。
   * 学习规划师插入到列表靠前位置（第 3 位·首屏内），古籍句读助手插入到稍后位置（第 8 位左右）；
   * 两者错开避免智能体卡相邻，后续 enforceMixDiscipline
   * 再统一保证一屏窗口内工具卡不超过 1 张。
   */
  private injectHookCards(items: FeedItem[], allow?: Set<FeedItem["type"]> | null): FeedItem[] {
    const learningGuideCard: FeedItem = {
      id: "b1000001-0000-0000-0000-000000000008",
      type: "agent",
      title: "国学学习规划师",
      subtitle: "按兴趣、基础和可用时间，制定经典阅读路线与每周学习计划",
      score: 0,
      reason: "学习成长",
      coverRatio: "4:3",
      metric: { kind: "action", value: "开始规划" },
      payload: { category: "学习成长", action: "开始对话" },
    };
    const classicsAgentCard: FeedItem = {
      id: "b1000001-0000-0000-0000-000000000001",
      type: "agent",
      title: "古籍句读助手",
      subtitle: "断句、释词、通译与出处核对，把难读古文拆成可理解的知识卡",
      score: 0,
      reason: "经典研读",
      coverRatio: "4:3",
      metric: { kind: "action", value: "开始学习" },
      payload: { category: "经典研读", action: "开始对话" },
    };

    const result = [...items];
    // 游客白名单约束：agent 不在允许类型内则不注入（受“游客可见内容”控制）
    if (!allow || allow.has("agent")) {
      const guidePos = Math.min(2, result.length);
      result.splice(guidePos, 0, learningGuideCard);
      const classicsPos = Math.min(7, result.length);
      result.splice(classicsPos, 0, classicsAgentCard);
    }
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
