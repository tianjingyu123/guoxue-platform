import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import {
  RecommendContext,
  RecommendResponse,
  RecommendLogDto,
  RecommendScene,
} from "./recommend.dto";
import { toRecommendItemVO, RecommendItem } from "./strategies/base.strategy";
import { CollaborativeStrategy } from "./strategies/collaborative.strategy";
import { UserProfileStrategy } from "./strategies/user-profile.strategy";
import { ColdStartService } from "./services/cold-start.service";
import { ScoringService } from "./services/scoring.service";
import { VectorRecallStrategy } from "./strategies/vector-recall.strategy";
import { TfidfVectorProvider } from "./strategies/tfidf-vector.provider";
import { OpenAIEmbeddingProvider } from "./strategies/openai-embedding.provider";
import { AbTestService } from "./services/ab-test.service";
import { StrategyWeightOverride } from "./ab-test.dto";
import { StationPickService } from "../station-pick/station-pick.service";

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private collaborative: CollaborativeStrategy,
    private userProfile: UserProfileStrategy,
    private coldStart: ColdStartService,
    private scoring: ScoringService,
    private vectorRecall: VectorRecallStrategy,
    private tfidf: TfidfVectorProvider,
    private embedding: OpenAIEmbeddingProvider,
    private abTest: AbTestService,
    private stationPick: StationPickService,
  ) {
    // 优先使用 OpenAI/DeepSeek Embedding，其次 TF-IDF
    this.vectorRecall.setProvider(this.embedding.isEnabled ? this.embedding : this.tfidf);
  }

  // ═══════════════════════════════════════════
  // 统一推荐入口
  // ═══════════════════════════════════════════

  async getRecommendations(ctx: RecommendContext): Promise<RecommendResponse> {
    // 构建缓存键
    const cacheKey = this.cacheKey(ctx);

    // 读缓存
    const cached = await this.redis.getJson<RecommendResponse>(cacheKey);
    if (cached) return cached;

    // P3: 冷启动检测
    const isColdStart = ctx.userId ? await this.coldStart.isColdStart(ctx.userId).catch((err: Error) => { this.logger.warn("冷启动检测失败", err.message); return false; }) : false;

    // 按场景分发
    let items: RecommendItem[] = [];
    switch (ctx.scene) {
      case RecommendScene.ARTICLE_DETAIL:
        items = ctx.contentId ? await this.sceneArticleDetail(ctx) : await this.sceneFallback(ctx);
        break;
      case RecommendScene.EMPTY_STATE:
        items = await this.sceneEmptyState(ctx);
        break;
      case RecommendScene.GUESS_LIKE:
        items = await this.sceneGuessLike(ctx);
        break;
      case RecommendScene.PAIPAN_RESULT:
        items = await this.scenePaipanResult(ctx);
        break;
      case RecommendScene.COURSE_DETAIL:
        items = ctx.contentId ? await this.sceneCourseDetail(ctx) : await this.sceneFallback(ctx);
        break;
      case RecommendScene.PRODUCT_DETAIL:
        items = ctx.contentId ? await this.sceneProductDetail(ctx) : await this.sceneFallback(ctx);
        break;
      case RecommendScene.PAYMENT_SUCCESS:
        items = await this.scenePaymentSuccess(ctx);
        break;
      case RecommendScene.SEARCH_EMPTY:
        items = await this.sceneSearchEmpty(ctx);
        break;
      case RecommendScene.CONVERSATION_GUESS:
        items = await this.sceneConversationGuess(ctx);
        break;
      case RecommendScene.CONTACTS_DISCOVER:
        items = await this.sceneContactsDiscover(ctx);
        break;
      case RecommendScene.COURSE_LEARN:
        items = await this.sceneCourseLearn(ctx);
        break;
      case RecommendScene.SAME_CITY:
        items = await this.sceneSameCity(ctx);
        break;
      default:
        items = await this.sceneFallback(ctx);
    }

    // 去重
    const dedupSet = ctx.userId
      ? await this.getOwnedSet(ctx.userId, ctx.excludeIds)
      : new Set(ctx.excludeIds?.map((id: string) => `ANY:${id}`) ?? []);
    let filtered = items.filter(
      (item) => !dedupSet.has(`${item.type}:${item.id}`),
    );

    // P3: 冷启动用户混入精选内容（根据兴趣标签选个性化入门内容）
    if (isColdStart && ctx.page === 1) {
      const starterPack = await this.coldStart.getPersonalizedStarterPack(ctx.userId!).catch((err: Error) => { this.logger.warn("获取冷启动个性化内容失败", err.message); return [] as RecommendItem[]; });
      if (starterPack.length > 0) {
        // 将精选内容插入最前面（去重后）
        const existingSet = new Set(filtered.map((f) => `${f.type}:${f.id}`));
        const newItems = starterPack.filter((s) => !existingSet.has(`${s.type}:${s.id}`));
        filtered = [...newItems, ...filtered];
      }
    }

    // P3: 评分流水线（会员加权 + 归一化）
    filtered = await this.scoring.score(filtered, ctx.userId);

    // P2: 分区强插 — 运营插入指定内容到指定位置
    try {
      filtered = await this.applyInsertRules(ctx.scene, filtered);
    } catch (e) {
      this.logger.warn(`分区强插失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    // P2: 站长精选注入 — 分站站长配置的精选内容按固定位插入
    try {
      filtered = await this.applyStationPicks(ctx, filtered);
    } catch (e) {
      this.logger.warn(`站长精选注入失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 分页切片
    const start = (ctx.page - 1) * ctx.pageSize;
    const paged = filtered.slice(start, start + ctx.pageSize);

    // A/B 实验分配
    const abAssignments = ctx.userId ? await this.abTest.getAssignments(ctx.userId) : [];
    const abInfo = abAssignments.length > 0 ? { abTests: abAssignments } : undefined;

    const response: RecommendResponse = {
      items: paged.map(toRecommendItemVO),
      pagination: { page: ctx.page, pageSize: ctx.pageSize, total: filtered.length },
      recommendId: this.generateRecommendId(),
      extra: { ...(isColdStart ? { coldStart: true } : {}), ...(abInfo ?? {}) },
    };

    // 写缓存
    const ttl = ctx.userId ? 300 : 120;
    await this.redis.setJson(cacheKey, response, ttl);

    return response;
  }

  // ═══════════════════════════════════════════
  // 场景处理（P0：article_detail + empty_state + guess_like）
  // ═══════════════════════════════════════════

  private async sceneArticleDetail(ctx: RecommendContext): Promise<RecommendItem[]> {
    const article = await this.prisma.article.findUnique({
      where: { id: ctx.contentId },
      select: { id: true, tags: true, circleId: true },
    });
    if (!article) return await this.sceneFallback(ctx);

    const tags = article.tags ?? [];
    const items: RecommendItem[] = [];

    // 同标签文章
    if (tags.length > 0) {
      const related = await this.prisma.article.findMany({
        where: {
          id: { not: article.id },
          auditStatus: "APPROVED",
          tags: { hasSome: tags },
        },
        select: this.articleSelect(),
        take: 10,
        orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      });
      items.push(
        ...related.map((a) => ({
          id: a.id,
          type: "ARTICLE" as const,
          title: a.title,
          cover: a.cover ?? undefined,
          excerpt: a.excerpt ?? undefined,
          tags: a.tags,
          score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2,
          reason: "相同标签推荐",
          strategies: ["tag-match"],
          metadata: {
            viewCount: a.viewCount,
            likeCount: a.likeCount,
            author: a.user ? { id: a.user.id, nickname: a.user.nickname, avatar: a.user.avatar } : undefined,
          },
        })),
      );
    }

    // 来源圈子（固定展示）
    if (article.circleId) {
      const circle = await this.prisma.circle.findUnique({
        where: { id: article.circleId },
        select: { id: true, name: true, cover: true, intro: true, memberCount: true },
      });
      if (circle) {
        items.push({
          id: circle.id,
          type: "CIRCLE",
          title: circle.name,
          cover: circle.cover ?? undefined,
          excerpt: circle.intro ?? undefined,
          score: 10000,
          reason: "文章来源圈子",
          strategies: ["source-circle"],
          metadata: { memberCount: circle.memberCount },
        });
      }
    }

    return items;
  }

  private async sceneEmptyState(ctx: RecommendContext): Promise<RecommendItem[]> {
    const listType = ctx.listType || "default";
    const tagMap: Record<string, string[]> = {
      course: ["入门", "基础"],
      article: ["热门", "精选"],
      product: ["畅销"],
      circle: ["推荐", "热门"],
      video: ["热门"],
    };
    const tags = tagMap[listType] ?? ["热门", "推荐"];

    const items: RecommendItem[] = [];

    // 并行查询各类型热门内容
    const [courses, articles, products, circles, videos, classics, ebooks] = await Promise.all([
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED", tags: { hasSome: tags } }, select: this.courseSelect(), take: 6, orderBy: { studentCount: "desc" } }),
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED", tags: { hasSome: tags } }, select: this.articleSelect(), take: 6, orderBy: { viewCount: "desc" } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE", tags: { hasSome: tags } }, select: this.productSelect(), take: 6, orderBy: { salesCount: "desc" } }),
      this.prisma.circle.findMany({ where: { status: "ACTIVE", tags: { hasSome: tags } }, select: this.circleSelect(), take: 6, orderBy: { memberCount: "desc" } }),
      this.prisma.video.findMany({ where: { status: "PUBLISHED", tags: { hasSome: tags } }, select: this.videoSelect(), take: 6, orderBy: { viewCount: "desc" } }),
      this.prisma.classicBook.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, author: true, cover: true, intro: true, viewCount: true, category: true }, take: 6, orderBy: { viewCount: "desc" } }).catch(() => []),
      this.prisma.ebook.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, author: true, cover: true, description: true, viewCount: true, purchaseCount: true }, take: 6, orderBy: { viewCount: "desc" } }).catch(() => []),
    ]);

    items.push(...courses.map((c) => ({ id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0, reason: "热门课程推荐", strategies: ["hot-trending"], metadata: { price: Number(c.price), studentCount: c.studentCount } })));
    items.push(...articles.map((a) => ({ id: a.id, type: "ARTICLE" as const, title: a.title, cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined, tags: a.tags, score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2, reason: "热门文章推荐", strategies: ["hot-trending"], metadata: { viewCount: a.viewCount, likeCount: a.likeCount } })));
    items.push(...products.map((p) => ({ id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0], excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0, reason: "热销商品推荐", strategies: ["hot-trending"], metadata: { price: Number(p.price), salesCount: p.salesCount } })));
    items.push(...circles.map((c) => ({ id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0, reason: "热门圈子推荐", strategies: ["hot-trending"], metadata: { memberCount: c.memberCount } })));
    items.push(...videos.map((v) => ({ id: v.id, type: "VIDEO" as const, title: v.title ?? "", cover: v.coverUrl ?? undefined, tags: v.tags, score: v.viewCount ?? 0, reason: "热门视频推荐", strategies: ["hot-trending"], metadata: { viewCount: v.viewCount, likeCount: v.likeCount } })));
    items.push(...(Array.isArray(classics) ? classics : []).map((b) => ({ id: b.id, type: "CLASSIC" as const, title: b.title, cover: b.cover ?? undefined, excerpt: b.intro ?? undefined, tags: [b.category].filter(Boolean) as string[], score: b.viewCount ?? 0, reason: "热门古籍推荐", strategies: ["hot-trending"], metadata: { author: b.author, viewCount: b.viewCount } })));
    items.push(...(Array.isArray(ebooks) ? ebooks : []).map((e) => ({ id: e.id, type: "EBOOK" as const, title: e.title, cover: e.cover ?? undefined, excerpt: e.description ?? undefined, tags: [] as string[], score: (e.viewCount ?? 0) + (e.purchaseCount ?? 0) * 5, reason: "热门电子书推荐", strategies: ["hot-trending"], metadata: { author: e.author, viewCount: e.viewCount, purchaseCount: e.purchaseCount } })));

    return items.sort((a, b) => b.score - a.score);
  }

  private async sceneGuessLike(ctx: RecommendContext): Promise<RecommendItem[]> {
    // A/B 实验策略覆写
    const overrides = ctx.userId ? await this.abTest.getOverrides(ctx.userId) : [];
    const w = this.applyOverrides({ hot: 0.4, profile: 0.35, collab: 0.25, vector: 0.15 }, overrides);

    // 并行：热度基座 + 用户画像 + 协同过滤 + 向量召回
    const [articles, courses, products, circles, profileItems, collabItems, vectorItems] = await Promise.all([
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED" }, select: this.articleSelect(), take: 8, orderBy: { viewCount: "desc" } }),
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: this.courseSelect(), take: 8, orderBy: { studentCount: "desc" } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE" }, select: this.productSelect(), take: 8, orderBy: { salesCount: "desc" } }),
      this.prisma.circle.findMany({ where: { status: "ACTIVE" }, select: this.circleSelect(), take: 8, orderBy: { memberCount: "desc" } }),
      // P2: 用户画像策略
      ctx.userId ? this.userProfile.recommend({ ...ctx, scene: RecommendScene.GUESS_LIKE }).catch((err: Error) => { this.logger.warn("用户画像推荐失败", err.message); return [] as RecommendItem[]; }) : Promise.resolve([] as RecommendItem[]),
      // P2: 协同过滤（基于最近浏览/购买内容）
      ctx.userId ? this.getCollaborativeForUser(ctx).catch((err: Error) => { this.logger.warn("协同过滤推荐失败", err.message); return [] as RecommendItem[]; }) : Promise.resolve([] as RecommendItem[]),
      // P3: 向量召回（TF-IDF 相似度）
      ctx.userId ? this.vectorRecall.recommend(ctx).catch((err: Error) => { this.logger.warn("向量召回推荐失败", err.message); return [] as RecommendItem[]; }) : Promise.resolve([] as RecommendItem[]),
    ]);

    const items: RecommendItem[] = [];

    // 热度基座（权重 w.hot）
    items.push(...articles.map((a) => ({ id: a.id, type: "ARTICLE" as const, title: a.title, cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined, tags: a.tags, score: ((a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2) * w.hot, reason: "猜你喜欢", strategies: ["mixed", "hot-trending"], metadata: { viewCount: a.viewCount, likeCount: a.likeCount } })));
    items.push(...courses.map((c) => ({ id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: (c.studentCount ?? 0) * w.hot, reason: "猜你喜欢", strategies: ["mixed", "hot-trending"], metadata: { price: Number(c.price), studentCount: c.studentCount } })));
    items.push(...products.map((p) => ({ id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0], excerpt: p.intro ?? undefined, tags: p.tags, score: (p.salesCount ?? 0) * w.hot, reason: "猜你喜欢", strategies: ["mixed", "hot-trending"], metadata: { price: Number(p.price), salesCount: p.salesCount } })));
    items.push(...circles.map((c) => ({ id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: (c.memberCount ?? 0) * w.hot, reason: "猜你喜欢", strategies: ["mixed", "hot-trending"], metadata: { memberCount: c.memberCount } })));

    // P2: 用户画像信号融入（权重 w.profile）
    for (const pi of (profileItems ?? [])) {
      items.push({ ...pi, score: pi.score * w.profile, strategies: [...pi.strategies, "mixed"] });
    }

    // P2: 协同过滤信号融入（权重 w.collab）
    for (const ci of (collabItems ?? [])) {
      items.push({ ...ci, score: ci.score * w.collab, strategies: [...ci.strategies, "mixed"] });
    }

    // P3: 向量召回信号融入（权重 w.vector）
    for (const vi of (vectorItems ?? [])) {
      items.push({ ...vi, score: vi.score * w.vector, strategies: [...vi.strategies, "vector-recall", "mixed"] });
    }

    // 去重并排序
    const seen = new Set<string>();
    const unique: RecommendItem[] = [];
    for (const item of items.sort((a, b) => b.score - a.score)) {
      const key = `${item.type}:${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  /** 获取用户的协同过滤推荐（基于最近行为内容） */
  private async getCollaborativeForUser(ctx: RecommendContext): Promise<RecommendItem[]> {
    // 取用户最近交互的内容作为种子，查找相似内容
    const recentBehaviors = await this.prisma.userBehavior.findMany({
      where: { userId: ctx.userId },
      select: { targetType: true, targetId: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (recentBehaviors.length === 0) return [];

    // 对每个种子内容查相似矩阵，取前3个结果
    const allItems: RecommendItem[] = [];
    const seen = new Set<string>();

    for (const b of recentBehaviors.slice(0, 3)) {
      const simCtx = { ...ctx, scene: RecommendScene.GUESS_LIKE, contentId: b.targetId };
      const sims = await this.collaborative.recommend(simCtx);
      for (const s of sims) {
        const key = `${s.type}:${s.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          allItems.push(s);
        }
      }
    }

    return allItems;
  }

  private async sceneFallback(ctx: RecommendContext): Promise<RecommendItem[]> {
    return this.sceneGuessLike(ctx);
  }

  // ───── P1 新增场景 ─────

  private async scenePaipanResult(ctx: RecommendContext): Promise<RecommendItem[]> {
    const tagMap: Record<string, string[]> = {
      BAZI: ["八字", "命理", "四柱"],
      ZIWEI: ["紫微斗数", "紫微", "命盘"],
      FENGSHUI: ["风水", "家居风水", "办公风水"],
      NAME: ["命名", "取名", "姓名学"],
    };
    const matchTags = tagMap[ctx.paipanType ?? ""] ?? ["国学", "易学"];

    const items: RecommendItem[] = [];

    // 相关课程
    const courses = await this.prisma.course.findMany({
      where: { tags: { hasSome: matchTags }, auditStatus: "APPROVED" },
      select: this.courseSelect(),
      take: 4,
      orderBy: { studentCount: "desc" },
    });
    items.push(...courses.map((c) => ({
      id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined,
      excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0,
      reason: "根据排盘结果推荐课程", strategies: ["tag-match"],
      metadata: { price: Number(c.price), studentCount: c.studentCount },
    })));

    // 相关圈子
    const circles = await this.prisma.circle.findMany({
      where: { tags: { hasSome: matchTags }, status: "ACTIVE" },
      select: this.circleSelect(),
      take: 4,
      orderBy: { memberCount: "desc" },
    });
    items.push(...circles.map((c) => ({
      id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined,
      excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0,
      reason: "根据排盘结果推荐圈子", strategies: ["tag-match"],
      metadata: { memberCount: c.memberCount },
    })));

    // 底部综合推荐
    const fallback = await this.sceneGuessLike(ctx);
    items.push(...fallback.map((f) => ({ ...f, reason: "猜你喜欢" })));

    return items;
  }

  /** 同城流推荐：基于 LBS + 驿站关联内容 */
  private async sceneSameCity(ctx: RecommendContext): Promise<RecommendItem[]> {
    const items: RecommendItem[] = [];

    const stationWhere: Record<string, unknown> = { status: "ACTIVE" };
    if (ctx.cityCode) {
      stationWhere.cityCode = ctx.cityCode;
    }

    const stations = await this.prisma.stationOffline.findMany({
      where: stationWhere,
      select: { id: true, name: true, city: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    if (stations.length === 0) return this.sceneFallback(ctx);

    const stationIds = stations.map((s) => s.id);

    // 同城驿站课程
    const offlineCourses = await this.prisma.offlineCourse.findMany({
      where: { stationId: { in: stationIds }, status: "APPROVED" },
      select: { id: true, title: true, cover: true, intro: true, courseId: true, price: true },
      take: 10,
      orderBy: { startTime: "desc" },
    });
    items.push(...offlineCourses.map((c) => ({
      id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined,
      excerpt: c.intro ?? undefined, tags: [], score: 4000,
      reason: `同城${stations[0]?.city ?? ""}线下课程`, strategies: ["same-city"],
      metadata: { price: Number(c.price), courseId: c.courseId },
    })));

    // 同城驿站商品
    const stationProducts = await this.prisma.stationProduct.findMany({
      where: { stationId: { in: stationIds }, status: "ACTIVE" },
      select: { id: true, name: true, price: true, productId: true },
      take: 6,
    });
    items.push(...stationProducts.map((p) => ({
      id: p.id, type: "PRODUCT" as const, title: p.name, score: 3000,
      reason: `同城${stations[0]?.city ?? ""}好物`, strategies: ["same-city"],
      metadata: { price: Number(p.price), productId: p.productId },
    })));

    // 同城驿站相关文章（通过驿站名匹配）
    const cityNames = [...new Set(stations.map((s) => s.city).filter(Boolean))];
    if (cityNames.length > 0) {
      const articles = await this.prisma.article.findMany({
        where: {
          OR: cityNames.map((c: string) => ({ title: { contains: c } })),
          auditStatus: "APPROVED",
        },
        select: { id: true, title: true, cover: true, excerpt: true, tags: true, viewCount: true, likeCount: true },
        take: 6,
        orderBy: { viewCount: "desc" },
      });
      items.push(...articles.map((a) => ({
        id: a.id, type: "ARTICLE" as const, title: a.title, cover: a.cover ?? undefined,
        excerpt: a.excerpt ?? undefined, tags: a.tags,
        score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2 + 2000,
        reason: "同城动态", strategies: ["same-city"],
        metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
      })));
    }

    if (items.length === 0) return this.sceneFallback(ctx);
    items.sort((a, b) => b.score - a.score);
    return items;
  }

  private async sceneCourseDetail(ctx: RecommendContext): Promise<RecommendItem[]> {
    const items: RecommendItem[] = [];

    // 获取当前课程信息
    const course = await this.prisma.course.findUnique({
      where: { id: ctx.contentId },
      select: { id: true, tags: true, circleId: true },
    });
    if (!course) return this.sceneFallback(ctx);

    const tags = course.tags ?? [];

    // "学了此课的人也学了" — 通过订单共现
    const orderUsers = await this.prisma.order.findMany({
      where: { targetId: course.id, type: "COURSE", status: { in: ["PAID", "COMPLETED"] } },
      select: { userId: true },
      take: 100,
    });
    const userIds = [...new Set(orderUsers.map((o) => o.userId))];

    if (userIds.length > 0) {
      const relatedOrders = await this.prisma.order.findMany({
        where: { userId: { in: userIds }, type: "COURSE", targetId: { not: course.id }, status: { in: ["PAID", "COMPLETED"] } },
        select: { targetId: true },
      });
      const freq = new Map<string, number>();
      relatedOrders.forEach((o) => freq.set(o.targetId, (freq.get(o.targetId) ?? 0) + 1));
      const topIds = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);

      if (topIds.length > 0) {
        const collabCourses = await this.prisma.course.findMany({
          where: { id: { in: topIds } },
          select: this.courseSelect(),
        });
        const order = new Map(topIds.map((id, i) => [id, i]));
        collabCourses.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        items.push(...collabCourses.map((c) => ({
          id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined,
          excerpt: c.intro ?? undefined, tags: c.tags, score: 1000 - (order.get(c.id) ?? 0),
          reason: "学了此课的人也学了", strategies: ["collaborative"],
          metadata: { price: Number(c.price), studentCount: c.studentCount },
        })));
      }
    }

    // "配套好物" — 标签匹配商品
    if (tags.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { tags: { hasSome: tags }, status: "ON_SALE" },
        select: this.productSelect(),
        take: 4,
        orderBy: { salesCount: "desc" },
      });
      items.push(...products.map((p) => ({
        id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0],
        excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0,
        reason: "配套好物推荐", strategies: ["tag-match"],
        metadata: { price: Number(p.price), salesCount: p.salesCount },
      })));
    }

    // "加入圈子交流" — 课程所属圈子或标签匹配圈子
    const circleId = course.circleId;
    if (circleId) {
      const circle = await this.prisma.circle.findUnique({
        where: { id: circleId },
        select: this.circleSelect(),
      });
      if (circle) {
        items.push({
          id: circle.id, type: "CIRCLE" as const, title: circle.name,
          cover: circle.cover ?? undefined, excerpt: circle.intro ?? undefined,
          tags: circle.tags, score: 10000, reason: "课程所属圈子", strategies: ["source-circle"],
          metadata: { memberCount: circle.memberCount },
        });
      }
    } else if (tags.length > 0) {
      const relatedCircles = await this.prisma.circle.findMany({
        where: { tags: { hasSome: tags }, status: "ACTIVE" },
        select: this.circleSelect(),
        take: 3,
        orderBy: { memberCount: "desc" },
      });
      items.push(...relatedCircles.map((c) => ({
        id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0,
        reason: "加入圈子交流", strategies: ["tag-match"],
        metadata: { memberCount: c.memberCount },
      })));
    }

    return items;
  }

  private async sceneProductDetail(ctx: RecommendContext): Promise<RecommendItem[]> {
    const items: RecommendItem[] = [];

    // 获取当前商品信息
    const product = await this.prisma.product.findUnique({
      where: { id: ctx.contentId },
      select: { id: true, tags: true },
    });
    if (!product) return this.sceneFallback(ctx);

    const tags = product.tags ?? [];

    // "经常一起购买" — 同订单共现
    const orderUsers = await this.prisma.order.findMany({
      where: { targetId: product.id, type: "PRODUCT", status: { in: ["PAID", "COMPLETED"] } },
      select: { userId: true },
      take: 200,
    });
    const userIds = [...new Set(orderUsers.map((o) => o.userId))];

    if (userIds.length > 0) {
      const relatedOrders = await this.prisma.order.findMany({
        where: { userId: { in: userIds }, type: "PRODUCT", targetId: { not: product.id }, status: { in: ["PAID", "COMPLETED"] } },
        select: { targetId: true },
      });
      const freq = new Map<string, number>();
      relatedOrders.forEach((o) => freq.set(o.targetId, (freq.get(o.targetId) ?? 0) + 1));
      const topIds = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);

      if (topIds.length > 0) {
        const crossProducts = await this.prisma.product.findMany({
          where: { id: { in: topIds } },
          select: this.productSelect(),
        });
        const order = new Map(topIds.map((id, i) => [id, i]));
        crossProducts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        items.push(...crossProducts.map((p) => ({
          id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0],
          excerpt: p.intro ?? undefined, tags: p.tags, score: 1000 - (order.get(p.id) ?? 0),
          reason: "经常一起购买", strategies: ["cross-sell"],
          metadata: { price: Number(p.price), salesCount: p.salesCount },
        })));
      }
    }

    // "相关课程" — 标签匹配
    if (tags.length > 0) {
      const courses = await this.prisma.course.findMany({
        where: { tags: { hasSome: tags }, auditStatus: "APPROVED" },
        select: this.courseSelect(),
        take: 4,
        orderBy: { studentCount: "desc" },
      });
      items.push(...courses.map((c) => ({
        id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0,
        reason: "相关课程推荐", strategies: ["tag-match"],
        metadata: { price: Number(c.price), studentCount: c.studentCount },
      })));
    }

    return items;
  }

  private async scenePaymentSuccess(ctx: RecommendContext): Promise<RecommendItem[]> {
    const items: RecommendItem[] = [];
    const orderIds = ctx.orderItemIds ?? [];

    if (orderIds.length === 0) return this.sceneGuessLike(ctx);

    // 查询已购订单项
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { type: true, targetId: true },
    });

    // 批量获取已购商品/课程的标签（避免 N+1）
    const purchasedTags: string[] = [];
    const purchasedIds = new Set<string>();
    const courseIds = orders.filter((o) => o.type === "COURSE").map((o) => o.targetId);
    const productIds = orders.filter((o) => o.type === "PRODUCT").map((o) => o.targetId);

    courseIds.forEach((id) => purchasedIds.add(id));
    productIds.forEach((id) => purchasedIds.add(id));

    const [courseTags, productTags] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { tags: true } })
        : ([] as { tags: string[] }[]),
      productIds.length > 0
        ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { tags: true } })
        : ([] as { tags: string[] }[]),
    ]);

    courseTags.forEach((c) => purchasedTags.push(...(c.tags ?? [])));
    productTags.forEach((p) => purchasedTags.push(...(p.tags ?? [])));

    const uniqueTags = [...new Set(purchasedTags)];

    if (uniqueTags.length > 0) {
      const [courses, products, circles] = await Promise.all([
        this.prisma.course.findMany({ where: { tags: { hasSome: uniqueTags }, auditStatus: "APPROVED", id: { notIn: [...purchasedIds] } }, select: this.courseSelect(), take: 4, orderBy: { studentCount: "desc" } }),
        this.prisma.product.findMany({ where: { tags: { hasSome: uniqueTags }, status: "ON_SALE", id: { notIn: [...purchasedIds] } }, select: this.productSelect(), take: 4, orderBy: { salesCount: "desc" } }),
        this.prisma.circle.findMany({ where: { tags: { hasSome: uniqueTags }, status: "ACTIVE" }, select: this.circleSelect(), take: 3, orderBy: { memberCount: "desc" } }),
      ]);

      items.push(...courses.map((c) => ({ id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0, reason: "购买此课程的人也喜欢", strategies: ["tag-match"], metadata: { price: Number(c.price), studentCount: c.studentCount } })));
      items.push(...products.map((p) => ({ id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0], excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0, reason: "根据购买记录推荐", strategies: ["tag-match"], metadata: { price: Number(p.price), salesCount: p.salesCount } })));
      items.push(...circles.map((c) => ({ id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0, reason: "相关圈子推荐", strategies: ["tag-match"], metadata: { memberCount: c.memberCount } })));
    }

    if (items.length === 0) return this.sceneGuessLike(ctx);
    return items;
  }

  private async sceneSearchEmpty(_ctx: RecommendContext): Promise<RecommendItem[]> {
    const items: RecommendItem[] = [];

    // 全平台热门内容混排
    const [articles, courses, products, circles, classics, ebooks] = await Promise.all([
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED" }, select: this.articleSelect(), take: 6, orderBy: { viewCount: "desc" } }),
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: this.courseSelect(), take: 6, orderBy: { studentCount: "desc" } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE" }, select: this.productSelect(), take: 6, orderBy: { salesCount: "desc" } }),
      this.prisma.circle.findMany({ where: { status: "ACTIVE" }, select: this.circleSelect(), take: 6, orderBy: { memberCount: "desc" } }),
      this.prisma.classicBook.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, author: true, cover: true, intro: true, viewCount: true, category: true }, take: 6, orderBy: { viewCount: "desc" } }).catch(() => []),
      this.prisma.ebook.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, author: true, cover: true, description: true, viewCount: true, purchaseCount: true }, take: 6, orderBy: { viewCount: "desc" } }).catch(() => []),
    ]);

    items.push(...articles.map((a) => ({ id: a.id, type: "ARTICLE" as const, title: a.title, cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined, tags: a.tags, score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2, reason: "全平台热门", strategies: ["hot-trending"], metadata: { viewCount: a.viewCount, likeCount: a.likeCount } })));
    items.push(...courses.map((c) => ({ id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { price: Number(c.price), studentCount: c.studentCount } })));
    items.push(...products.map((p) => ({ id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0], excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { price: Number(p.price), salesCount: p.salesCount } })));
    items.push(...circles.map((c) => ({ id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { memberCount: c.memberCount } })));
    items.push(...(Array.isArray(classics) ? classics : []).map((b) => ({ id: b.id, type: "CLASSIC" as const, title: b.title, cover: b.cover ?? undefined, excerpt: b.intro ?? undefined, tags: [b.category].filter(Boolean) as string[], score: b.viewCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { author: b.author, viewCount: b.viewCount } })));
    items.push(...(Array.isArray(ebooks) ? ebooks : []).map((e) => ({ id: e.id, type: "EBOOK" as const, title: e.title, cover: e.cover ?? undefined, excerpt: e.description ?? undefined, tags: [] as string[], score: (e.viewCount ?? 0) + (e.purchaseCount ?? 0) * 5, reason: "全平台热门", strategies: ["hot-trending"], metadata: { author: e.author, viewCount: e.viewCount, purchaseCount: e.purchaseCount } })));

    return items.sort((a, b) => b.score - a.score);
  }

  // ───── 新增场景：会话列表底部猜你喜欢 ─────

  private async sceneConversationGuess(_ctx: RecommendContext): Promise<RecommendItem[]> {
    // 推荐热门圈子 + 热门课程
    const [circles, courses] = await Promise.all([
      this.prisma.circle.findMany({
        where: { status: "ACTIVE" },
        select: this.circleSelect(),
        take: 6,
        orderBy: { memberCount: "desc" },
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: this.courseSelect(),
        take: 6,
        orderBy: { studentCount: "desc" },
      }),
    ]);

    const items: RecommendItem[] = [];

    items.push(
      ...circles.map((c) => ({
        id: c.id,
        type: "CIRCLE" as const,
        title: c.name,
        cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined,
        tags: c.tags,
        score: (c.memberCount ?? 0) * 1.5,
        reason: "热门圈子推荐",
        strategies: ["hot-trending", "conversation-guess"],
        metadata: { memberCount: c.memberCount },
      })),
    );

    items.push(
      ...courses.map((c) => ({
        id: c.id,
        type: "COURSE" as const,
        title: c.title,
        cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined,
        tags: c.tags,
        score: c.studentCount ?? 0,
        reason: "热门课程推荐",
        strategies: ["hot-trending", "conversation-guess"],
        metadata: { price: Number(c.price), studentCount: c.studentCount },
      })),
    );

    return items.sort((a, b) => b.score - a.score);
  }

  // ───── 新增场景：通讯录空状态发现更多 ─────

  private async sceneContactsDiscover(_ctx: RecommendContext): Promise<RecommendItem[]> {
    // 推荐热门圈主 + 热门讲师
    const [topCircles, topCourses] = await Promise.all([
      this.prisma.circle.findMany({
        where: { status: "ACTIVE" },
        select: { ...this.circleSelect(), ownerId: true },
        take: 10,
        orderBy: { memberCount: "desc" },
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: { ...this.courseSelect() },
        take: 10,
        orderBy: { studentCount: "desc" },
      }),
    ]);

    // 提取圈主ID和讲师ID
    const circleOwnerIds = [...new Set(topCircles.map((c) => c.ownerId))];
    const courseTeacherIds = [...new Set(topCourses.map((c) => c.user.id))];

    const [circleOwners, courseTeachers] = await Promise.all([
      circleOwnerIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: circleOwnerIds } },
            select: { id: true, nickname: true, avatar: true },
          })
        : ([] as any[]),
      courseTeacherIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: courseTeacherIds } },
            select: { id: true, nickname: true, avatar: true },
          })
        : ([] as any[]),
    ]);

    const ownerMap = new Map(circleOwners.map((u) => [u.id, u]));
    const teacherMap = new Map(courseTeachers.map((u) => [u.id, u]));

    // 汇总圈主热度
    const ownerScoreMap = new Map<string, number>();
    topCircles.forEach((c) => {
      ownerScoreMap.set(c.ownerId, (ownerScoreMap.get(c.ownerId) ?? 0) + (c.memberCount ?? 0));
    });

    // 汇总讲师热度
    const teacherScoreMap = new Map<string, number>();
    topCourses.forEach((c) => {
      teacherScoreMap.set(c.user.id, (teacherScoreMap.get(c.user.id) ?? 0) + (c.studentCount ?? 0));
    });

    const items: RecommendItem[] = [];

    // 推荐热门圈主
    for (const [userId, score] of [...ownerScoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)) {
      const owner = ownerMap.get(userId);
      if (owner) {
        items.push({
          id: userId,
          type: "CIRCLE" as const,
          title: owner.nickname ?? "圈主",
          cover: owner.avatar ?? undefined,
          excerpt: undefined,
          score,
          reason: "热门圈主推荐",
          strategies: ["hot-trending", "contacts-discover"],
          metadata: { role: "圈主", userId },
        });
      }
    }

    // 推荐热门讲师
    for (const [userId, score] of [...teacherScoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)) {
      const teacher = teacherMap.get(userId);
      if (teacher) {
        items.push({
          id: userId,
          type: "COURSE" as const,
          title: teacher.nickname ?? "讲师",
          cover: teacher.avatar ?? undefined,
          excerpt: teacher.bio ?? undefined,
          score,
          reason: "热门讲师推荐",
          strategies: ["hot-trending", "contacts-discover"],
          metadata: { role: "讲师", userId },
        });
      }
    }

    return items.sort((a, b) => b.score - a.score);
  }

  // ───── 新增场景：课程学习页推荐 ─────

  private async sceneCourseLearn(ctx: RecommendContext): Promise<RecommendItem[]> {
    if (!ctx.contentId) return this.sceneFallback(ctx);

    const course = await this.prisma.course.findUnique({
      where: { id: ctx.contentId },
      select: { id: true, tags: true, circleId: true },
    });
    if (!course) return this.sceneFallback(ctx);

    const tags = course.tags ?? [];
    const items: RecommendItem[] = [];

    // 「猜你喜欢」— 同标签相关课程
    if (tags.length > 0) {
      const relatedCourses = await this.prisma.course.findMany({
        where: {
          id: { not: course.id },
          auditStatus: "APPROVED",
          tags: { hasSome: tags },
        },
        select: this.courseSelect(),
        take: 6,
        orderBy: { studentCount: "desc" },
      });

      items.push(
        ...relatedCourses.map((c) => ({
          id: c.id,
          type: "COURSE" as const,
          title: c.title,
          cover: c.cover ?? undefined,
          excerpt: c.intro ?? undefined,
          tags: c.tags,
          score: c.studentCount ?? 0,
          reason: "相关课程推荐",
          strategies: ["tag-match", "course-learn"],
          metadata: { price: Number(c.price), studentCount: c.studentCount },
        })),
      );
    }

    // 完成弹窗 — 进阶课程（同标签，可按难度/热度）
    const advancedCourses = await this.prisma.course.findMany({
      where: {
        id: { not: course.id },
        auditStatus: "APPROVED",
        ...(tags.length > 0 ? { tags: { hasSome: tags } } : {}),
      },
      select: this.courseSelect(),
      take: 4,
      orderBy: { studentCount: "desc" },
      skip: items.length > 0 ? 0 : 0,
    });

    items.push(
      ...advancedCourses.map((c, i) => ({
        id: c.id,
        type: "COURSE" as const,
        title: c.title,
        cover: c.cover ?? undefined,
        excerpt: c.intro ?? undefined,
        tags: c.tags,
        score: (c.studentCount ?? 0) - i * 100,
        reason: "学完推荐进阶课程",
        strategies: ["tag-match", "completion-popup"],
        metadata: { price: Number(c.price), studentCount: c.studentCount },
      })),
    );

    // 完成弹窗 — 相关圈子
    const circleId = course.circleId;
    if (circleId) {
      const circle = await this.prisma.circle.findUnique({
        where: { id: circleId },
        select: this.circleSelect(),
      });
      if (circle) {
        items.push({
          id: circle.id,
          type: "CIRCLE" as const,
          title: circle.name,
          cover: circle.cover ?? undefined,
          excerpt: circle.intro ?? undefined,
          tags: circle.tags,
          score: 10000,
          reason: "课程所属圈子",
          strategies: ["source-circle", "completion-popup"],
          metadata: { memberCount: circle.memberCount },
        });
      }
    } else if (tags.length > 0) {
      const relatedCircles = await this.prisma.circle.findMany({
        where: { tags: { hasSome: tags }, status: "ACTIVE" },
        select: this.circleSelect(),
        take: 3,
        orderBy: { memberCount: "desc" },
      });
      items.push(
        ...relatedCircles.map((c) => ({
          id: c.id,
          type: "CIRCLE" as const,
          title: c.name,
          cover: c.cover ?? undefined,
          excerpt: c.intro ?? undefined,
          tags: c.tags,
          score: c.memberCount ?? 0,
          reason: "加入圈子继续学习",
          strategies: ["tag-match", "completion-popup"],
          metadata: { memberCount: c.memberCount },
        })),
      );
    }

    // 去重：避免课程自身出现在推荐中
    return items.filter((item) => !(item.type === "COURSE" && item.id === course.id));
  }

  // ═══════════════════════════════════════════
  // 去重辅助
  // ═══════════════════════════════════════════

  private async getOwnedSet(userId: string, excludeIds?: string[]): Promise<Set<string>> {
    const cacheKey = `recommend:dedup:${userId}`;
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return new Set([...cached, ...(excludeIds?.map((id) => `ANY:${id}`) ?? [])]);

    // 并行查询用户已拥有的内容
    const [orders, collects, likes, members, progresses] = await Promise.all([
      this.prisma.order.findMany({ where: { userId, status: { in: ["PAID", "COMPLETED"] } }, select: { type: true, targetId: true } }),
      this.prisma.collect.findMany({ where: { userId }, select: { targetType: true, targetId: true } }),
      this.prisma.like.findMany({ where: { userId }, select: { targetType: true, targetId: true } }),
      this.prisma.circleMember.findMany({ where: { userId }, select: { circleId: true } }),
      this.prisma.courseProgress.findMany({ where: { userId, completed: true }, select: { courseId: true } }),
    ]);

    const set = new Set<string>();
    orders.forEach((o) => set.add(`${o.type}:${o.targetId}`));
    collects.forEach((c) => set.add(`${c.targetType}:${c.targetId}`));
    likes.forEach((l) => set.add(`${l.targetType}:${l.targetId}`));
    members.forEach((m) => set.add(`CIRCLE_JOIN:${m.circleId}`));
    progresses.forEach((p) => set.add(`COURSE:${p.courseId}`));

    if (excludeIds) excludeIds.forEach((id) => set.add(`ANY:${id}`));

    await this.redis.setJson(cacheKey, [...set], 300);
    return set;
  }

  // ═══════════════════════════════════════════
  // 推荐日志回传
  // ═══════════════════════════════════════════

  async logInteractions(dto: RecommendLogDto) {
    const logs = dto.interactions.map((i) => ({
      recommendId: dto.recommendId,
      itemType: i.itemType,
      itemId: i.itemId,
      position: i.position,
      isClick: i.action === "CLICK",
      staySeconds: i.staySeconds,
      strategy: "",
      scene: "",
    }));

    await this.prisma.recommendLog.createMany({ data: logs }).catch((err) => this.logger.warn("推荐日志写入失败", err));
    return { success: true };
  }

  // ═══════════════════════════════════════════
  // 分区强插管理
  // ═══════════════════════════════════════════

  async insertContent(position: number, contentId: string, contentType: string) {
    // 验证要插入的内容是否存在
    const item = await this.fetchContentItemForInsert(contentType, contentId);
    if (!item) throw new BusinessException(ErrorCode.NOT_FOUND, "要强插的内容不存在");

    // 若该位置已有强插规则则更新，否则新建
    const existing = await this.prisma.recommendRule.findFirst({
      where: { ruleType: "INSERT", position },
    });

    if (existing) {
      return this.prisma.recommendRule.update({
        where: { id: existing.id },
        data: { targetId: contentId, targetType: contentType, scene: "ALL" },
      });
    }

    return this.prisma.recommendRule.create({
      data: {
        scene: "ALL",
        targetType: contentType,
        targetId: contentId,
        ruleType: "INSERT",
        position,
        priority: 100,
        createdBy: "admin",
      },
    });
  }

  async removeInsertedContent(position: number) {
    const existing = await this.prisma.recommendRule.findFirst({
      where: { ruleType: "INSERT", position },
    });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "该位置没有强插规则");

    await this.prisma.recommendRule.delete({ where: { id: existing.id } });
    return { success: true };
  }

  /** 在推荐结果中应用分区强插规则 */
  private async applyInsertRules(scene: RecommendScene, items: RecommendItem[]): Promise<RecommendItem[]> {
    const rules = await this.prisma.recommendRule.findMany({
      where: {
        ruleType: "INSERT",
        position: { not: null },
        OR: [{ scene }, { scene: "ALL" }],
      },
      orderBy: { position: "asc" },
    });

    if (rules.length === 0) return items;

    const result = [...items];
    for (const rule of rules) {
      const insertItem = await this.fetchContentItemForInsert(rule.targetType, rule.targetId);
      if (!insertItem) continue;

      const pos = Math.min(rule.position!, result.length);
      result.splice(pos, 0, insertItem);
    }

    return result;
  }

  /**
   * 站长精选注入 — 在推荐流中按分站配置的固定位置插入站长精选内容
   */
  private async applyStationPicks(ctx: RecommendContext, items: RecommendItem[]): Promise<RecommendItem[]> {
    if (!ctx.stationId) return items;

    const station = await this.prisma.station.findUnique({
      where: { id: ctx.stationId },
      select: { templateConfig: true },
    });
    const config = (station?.templateConfig as Record<string, any>) ?? {};
    if (config?.stationZoneEnabled === false) return items;

    const positions: number[] = config?.stationPickPositions ?? [2, 5, 9];

    const picks = await this.prisma.stationPick.findMany({
      where: { stationId: ctx.stationId },
      orderBy: { sortOrder: "asc" },
      take: positions.length,
    });
    if (picks.length === 0) return items;

    const pickItems = await this.stationPick.fetchContentItems(picks);
    const validItems = pickItems.filter(Boolean);

    const result = [...items];
    for (let i = 0; i < Math.min(positions.length, validItems.length); i++) {
      const pos = positions[i];
      if (pos < result.length) {
        result.splice(pos, 0, validItems[i] as any);
      }
    }

    return result;
  }

  /** 根据类型和ID查询内容，构造强插用的 RecommendItem */
  private async fetchContentItemForInsert(contentType: string, contentId: string): Promise<RecommendItem | null> {
    switch (contentType) {
      case "ARTICLE": {
        const a = await this.prisma.article.findUnique({
          where: { id: contentId },
          select: this.articleSelect(),
        });
        if (!a) return null;
        return {
          id: a.id, type: "ARTICLE", title: a.title, cover: a.cover ?? undefined,
          excerpt: a.excerpt ?? undefined, tags: a.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
        };
      }
      case "COURSE": {
        const c = await this.prisma.course.findUnique({
          where: { id: contentId },
          select: this.courseSelect(),
        });
        if (!c) return null;
        return {
          id: c.id, type: "COURSE", title: c.title, cover: c.cover ?? undefined,
          excerpt: c.intro ?? undefined, tags: c.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { price: Number(c.price), studentCount: c.studentCount },
        };
      }
      case "PRODUCT": {
        const p = await this.prisma.product.findUnique({
          where: { id: contentId },
          select: this.productSelect(),
        });
        if (!p) return null;
        return {
          id: p.id, type: "PRODUCT", title: p.title, cover: p.images?.[0],
          excerpt: p.intro ?? undefined, tags: p.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { price: Number(p.price), salesCount: p.salesCount },
        };
      }
      case "CIRCLE": {
        const ci = await this.prisma.circle.findUnique({
          where: { id: contentId },
          select: this.circleSelect(),
        });
        if (!ci) return null;
        return {
          id: ci.id, type: "CIRCLE", title: ci.name, cover: ci.cover ?? undefined,
          excerpt: ci.intro ?? undefined, tags: ci.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { memberCount: ci.memberCount },
        };
      }
      case "VIDEO": {
        const v = await this.prisma.video.findUnique({
          where: { id: contentId },
          select: this.videoSelect(),
        });
        if (!v) return null;
        return {
          id: v.id, type: "VIDEO", title: v.title ?? "", cover: v.coverUrl ?? undefined,
          tags: v.tags, score: 99999,
          reason: "运营强插", strategies: ["insert"],
          metadata: { viewCount: v.viewCount, likeCount: v.likeCount },
        };
      }
      default:
        return null;
    }
  }

  // ═══════════════════════════════════════════
  // 旧方法（向后兼容）
  // ═══════════════════════════════════════════

  async related(contentId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: contentId },
      select: { tags: true },
    });
    if (!article) throw new BusinessException(ErrorCode.NOT_FOUND, "文章不存在");

    const tags = article.tags ?? [];
    if (tags.length === 0) return [];

    return this.prisma.article.findMany({
      where: { id: { not: contentId }, auditStatus: "APPROVED", tags: { hasSome: tags } },
      select: this.articleSelect(),
      take: 5,
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
    });
  }

  async personalized(userId: string) {
    const [likes, collects] = await Promise.all([
      this.prisma.like.findMany({ where: { userId, targetType: "ARTICLE" }, select: { targetId: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      this.prisma.collect.findMany({ where: { userId, targetType: "ARTICLE" }, select: { targetId: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    const interactedIds = [...new Set([...likes.map((l) => l.targetId), ...collects.map((c) => c.targetId)])];
    if (interactedIds.length === 0) return [];

    const interactedArticles = await this.prisma.article.findMany({
      where: { id: { in: interactedIds } },
      select: { tags: true },
    });

    const tags = [...new Set(interactedArticles.flatMap((a) => a.tags ?? []))];
    if (tags.length === 0) return [];

    return this.prisma.article.findMany({
      where: { id: { notIn: interactedIds }, auditStatus: "APPROVED", tags: { hasSome: tags } },
      select: this.articleSelect(),
      take: 5,
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
    });
  }

  async trending() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const byViews = await this.prisma.article.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, auditStatus: "APPROVED" },
      select: this.articleSelect(),
      take: 10,
      orderBy: { viewCount: "desc" },
    });

    const [recentLikes, recentCollects] = await Promise.all([
      this.prisma.like.findMany({ where: { targetType: "ARTICLE", createdAt: { gte: sevenDaysAgo } }, select: { targetId: true } }),
      this.prisma.collect.findMany({ where: { targetType: "ARTICLE", createdAt: { gte: sevenDaysAgo } }, select: { targetId: true } }),
    ]);

    const engagementMap = new Map<string, number>();
    for (const l of recentLikes) engagementMap.set(l.targetId, (engagementMap.get(l.targetId) ?? 0) + 2);
    for (const c of recentCollects) engagementMap.set(c.targetId, (engagementMap.get(c.targetId) ?? 0) + 3);

    const sortedIds = [...engagementMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
    const byEngagement = sortedIds.length > 0
      ? await this.prisma.article.findMany({
          where: { id: { in: sortedIds }, auditStatus: "APPROVED" },
          select: this.articleSelect(),
        })
      : [];
    if (byEngagement.length > 0) {
      const order = new Map(sortedIds.map((id, i) => [id, i]));
      byEngagement.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    return { byViews, byEngagement };
  }

  // ═══════════════════════════════════════════
  // 工具方法
  // ═══════════════════════════════════════════

  /** 根据 A/B 实验覆写调整策略权重 */
  private applyOverrides(
    defaults: { hot: number; profile: number; collab: number; vector: number },
    overrides: StrategyWeightOverride[],
  ): { hot: number; profile: number; collab: number; vector: number } {
    const result = { ...defaults };
    for (const o of overrides) {
      switch (o.strategy) {
        case "hot-trending": result.hot = o.weight; break;
        case "user-profile": result.profile = o.weight; break;
        case "collaborative": result.collab = o.weight; break;
        case "vector-recall": result.vector = o.weight; break;
      }
    }
    return result;
  }

  private cacheKey(ctx: RecommendContext): string {
    const params = [ctx.contentId, ctx.paipanType, ctx.listType, ctx.page, ctx.pageSize].join(":");
    return `recommend:${ctx.scene}:${ctx.userId ?? "anonymous"}:${params}:v1`;
  }

  private generateRecommendId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  // ───── Prisma select helpers ─────

  private articleSelect() {
    return {
      id: true, title: true, cover: true, excerpt: true, tags: true,
      viewCount: true, likeCount: true, collectCount: true, createdAt: true,
      user: { select: { id: true, nickname: true, avatar: true } },
    } as const;
  }

  private courseSelect() {
    return {
      id: true, title: true, cover: true, intro: true, tags: true,
      price: true, studentCount: true,
      user: { select: { id: true, nickname: true, avatar: true } },
    } as const;
  }

  private productSelect() {
    return {
      id: true, title: true, images: true, intro: true, tags: true,
      price: true, salesCount: true,
    } as const;
  }

  private circleSelect() {
    return {
      id: true, name: true, cover: true, intro: true, tags: true,
      memberCount: true,
    } as const;
  }

  private videoSelect() {
    return {
      id: true, title: true, coverUrl: true, tags: true,
      viewCount: true, likeCount: true,
      user: { select: { id: true, nickname: true, avatar: true } },
    } as const;
  }

  async getRecommendStats(params: { startDate?: string; endDate?: string; scene?: string }) {
    const where: any = {};
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }
    if (params.scene) where.scene = params.scene;

    const [totalImpressions, totalClicks, byScene, bySceneClicks, byStrategy, byStrategyClicks] = await Promise.all([
      this.prisma.recommendLog.count({ where }),
      this.prisma.recommendLog.count({ where: { ...where, isClick: true } }),
      this.prisma.recommendLog.groupBy({ by: ["scene"], where, _count: { id: true } }),
      this.prisma.recommendLog.groupBy({ by: ["scene"], where: { ...where, isClick: true }, _count: { id: true } }),
      this.prisma.recommendLog.groupBy({ by: ["strategy"], where, _count: { id: true } }),
      this.prisma.recommendLog.groupBy({ by: ["strategy"], where: { ...where, isClick: true }, _count: { id: true } }),
    ]);

    const clickMap = Object.fromEntries(bySceneClicks.map(s => [s.scene, s._count.id]));
    const strategyClickMap = Object.fromEntries(byStrategyClicks.map(s => [s.strategy, s._count.id]));

    const days = 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const recentLogs = await this.prisma.recommendLog.findMany({
      where: { ...where, createdAt: { gte: since } },
      select: { createdAt: true, isClick: true },
    });

    const dailyMap: Record<string, { impressions: number; clicks: number }> = {};
    for (const log of recentLogs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { impressions: 0, clicks: 0 };
      dailyMap[day].impressions++;
      if (log.isClick) dailyMap[day].clicks++;
    }

    return {
      total: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: totalImpressions > 0 ? +(totalClicks / totalImpressions).toFixed(4) : 0,
      },
      byScene: byScene.map(s => ({
        scene: s.scene,
        impressions: s._count.id,
        clicks: clickMap[s.scene] || 0,
        ctr: s._count.id > 0 ? +((clickMap[s.scene] || 0) / s._count.id).toFixed(4) : 0,
      })),
      byStrategy: byStrategy.map(s => ({
        strategy: s.strategy,
        impressions: s._count.id,
        clicks: strategyClickMap[s.strategy] || 0,
        ctr: s._count.id > 0 ? +((strategyClickMap[s.strategy] || 0) / s._count.id).toFixed(4) : 0,
      })),
      dailyTrend: Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          ...data,
          ctr: data.impressions > 0 ? +(data.clicks / data.impressions).toFixed(4) : 0,
        })),
    };
  }
}
