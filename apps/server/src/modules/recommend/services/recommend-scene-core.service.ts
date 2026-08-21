import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  RecommendContext,
  RecommendScene,
} from "../recommend.dto";
import { RecommendItem } from "../strategies/base.strategy";
import { CollaborativeStrategy } from "../strategies/collaborative.strategy";
import { UserProfileStrategy } from "../strategies/user-profile.strategy";
import { VectorRecallStrategy } from "../strategies/vector-recall.strategy";
import { TfidfVectorProvider } from "../strategies/tfidf-vector.provider";
import { OpenAIEmbeddingProvider } from "../strategies/openai-embedding.provider";
import { HunyuanEmbeddingProvider } from "../strategies/hunyuan-embedding.provider";
import { AbTestService } from "./ab-test.service";
import { StrategyWeightOverride } from "../ab-test.dto";
import { RecommendSelectService } from "./recommend-select.service";
import { PUBLIC_CLASSIC_BOOK_WHERE } from "../../classic/classic-publication-policy";
import { toPublicClassicIntro } from "../../classic/classic-public-copy";

/**
 * 推荐-基础召回场景域（从 recommend.service 拆出·纯搬家不改逻辑）。
 * 职责：猜你喜欢/兜底/热门混排类场景（sceneGuessLike/sceneFallback/sceneEmptyState/
 * sceneSearchEmpty/sceneConversationGuess/sceneContactsDiscover）+ 协同过滤/画像/向量融合。
 * 破环关键：sceneFallback/sceneGuessLike 被上下文场景域（SceneService）依赖，
 * 独立成基础域供其注入，避免循环依赖（本域不反向依赖上下文场景域）。
 */
@Injectable()
export class RecommendSceneCoreService {
  private readonly logger = new Logger(RecommendSceneCoreService.name);
  constructor(
    private prisma: PrismaService,
    private userProfile: UserProfileStrategy,
    private collaborative: CollaborativeStrategy,
    private vectorRecall: VectorRecallStrategy,
    private tfidf: TfidfVectorProvider,
    private embedding: OpenAIEmbeddingProvider,
    private hunyuan: HunyuanEmbeddingProvider,
    private abTest: AbTestService,
    private selectSvc: RecommendSelectService,
  ) {
    // 向量召回 provider 选择优先级：腾讯混元真语义（enabled） > OpenAI/DeepSeek（enabled） > TF-IDF（字符哈希为各 provider 内部兜底）
    this.vectorRecall.setProvider(
      this.hunyuan.isEnabled ? this.hunyuan
      : this.embedding.isEnabled ? this.embedding
      : this.tfidf,
    );
  }

  async sceneEmptyState(ctx: RecommendContext): Promise<RecommendItem[]> {
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
    const [courses, articles, products, circles, videos, classics] = await Promise.all([
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED", tags: { hasSome: tags } }, select: this.selectSvc.courseSelect(), take: 6, orderBy: { studentCount: "desc" } }),
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED", visibility: "PLATFORM", tags: { hasSome: tags } }, select: this.selectSvc.articleSelect(), take: 6, orderBy: { viewCount: "desc" } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE", tags: { hasSome: tags } }, select: this.selectSvc.productSelect(), take: 6, orderBy: { salesCount: "desc" } }),
      this.prisma.circle.findMany({ where: { status: "ACTIVE", tags: { hasSome: tags } }, select: this.selectSvc.circleSelect(), take: 6, orderBy: { memberCount: "desc" } }),
      this.prisma.video.findMany({ where: { status: "PUBLISHED", tags: { hasSome: tags } }, select: this.selectSvc.videoSelect(), take: 6, orderBy: { viewCount: "desc" } }),
      this.prisma.classicBook.findMany({ where: PUBLIC_CLASSIC_BOOK_WHERE, select: { id: true, title: true, author: true, cover: true, intro: true, viewCount: true, category: true }, take: 6, orderBy: { viewCount: "desc" } }).catch(() => []),
    ]);

    items.push(...courses.map((c) => ({ id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0, reason: "热门课程推荐", strategies: ["hot-trending"], metadata: { price: Number(c.price), studentCount: c.studentCount } })));
    items.push(...articles.map((a) => ({ id: a.id, type: "ARTICLE" as const, title: a.title, cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined, tags: a.tags, score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2, reason: "热门文章推荐", strategies: ["hot-trending"], metadata: { viewCount: a.viewCount, likeCount: a.likeCount } })));
    items.push(...products.map((p) => ({ id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0], excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0, reason: "热销商品推荐", strategies: ["hot-trending"], metadata: { price: Number(p.price), salesCount: p.salesCount } })));
    items.push(...circles.map((c) => ({ id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0, reason: "热门圈子推荐", strategies: ["hot-trending"], metadata: { memberCount: c.memberCount } })));
    items.push(...videos.map((v) => ({ id: v.id, type: "VIDEO" as const, title: v.title ?? "", cover: v.coverUrl ?? undefined, tags: v.tags, score: v.viewCount ?? 0, reason: "热门视频推荐", strategies: ["hot-trending"], metadata: { viewCount: v.viewCount, likeCount: v.likeCount } })));
    items.push(...(Array.isArray(classics) ? classics : []).map((b) => ({ id: b.id, type: "CLASSIC" as const, title: b.title, cover: b.cover ?? undefined, excerpt: toPublicClassicIntro(b.intro, b.title), tags: [b.category].filter(Boolean) as string[], score: b.viewCount ?? 0, reason: "热门古籍推荐", strategies: ["hot-trending"], metadata: { author: b.author, viewCount: b.viewCount } })));

    return items.sort((a, b) => b.score - a.score);
  }

  async sceneGuessLike(ctx: RecommendContext): Promise<RecommendItem[]> {
    // A/B 实验策略覆写
    const overrides = ctx.userId ? await this.abTest.getOverrides(ctx.userId) : [];
    const w = this.applyOverrides({ hot: 0.4, profile: 0.35, collab: 0.25, vector: 0.15 }, overrides);

    // 并行：热度基座 + 用户画像 + 协同过滤 + 向量召回
    const [articles, courses, products, circles, profileItems, collabItems, vectorItems] = await Promise.all([
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED", visibility: "PLATFORM" }, select: this.selectSvc.articleSelect(), take: 8, orderBy: { viewCount: "desc" } }),
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: this.selectSvc.courseSelect(), take: 8, orderBy: { studentCount: "desc" } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE" }, select: this.selectSvc.productSelect(), take: 8, orderBy: { salesCount: "desc" } }),
      this.prisma.circle.findMany({ where: { status: "ACTIVE" }, select: this.selectSvc.circleSelect(), take: 8, orderBy: { memberCount: "desc" } }),
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

  async sceneFallback(ctx: RecommendContext): Promise<RecommendItem[]> {
    return this.sceneGuessLike(ctx);
  }

  async sceneSearchEmpty(_ctx: RecommendContext): Promise<RecommendItem[]> {
    const items: RecommendItem[] = [];

    // 全平台热门内容混排
    const [articles, courses, products, circles, classics] = await Promise.all([
      this.prisma.article.findMany({ where: { auditStatus: "APPROVED", visibility: "PLATFORM" }, select: this.selectSvc.articleSelect(), take: 6, orderBy: { viewCount: "desc" } }),
      this.prisma.course.findMany({ where: { auditStatus: "APPROVED" }, select: this.selectSvc.courseSelect(), take: 6, orderBy: { studentCount: "desc" } }),
      this.prisma.product.findMany({ where: { status: "ON_SALE" }, select: this.selectSvc.productSelect(), take: 6, orderBy: { salesCount: "desc" } }),
      this.prisma.circle.findMany({ where: { status: "ACTIVE" }, select: this.selectSvc.circleSelect(), take: 6, orderBy: { memberCount: "desc" } }),
      this.prisma.classicBook.findMany({ where: PUBLIC_CLASSIC_BOOK_WHERE, select: { id: true, title: true, author: true, cover: true, intro: true, viewCount: true, category: true }, take: 6, orderBy: { viewCount: "desc" } }).catch(() => []),
    ]);

    items.push(...articles.map((a) => ({ id: a.id, type: "ARTICLE" as const, title: a.title, cover: a.cover ?? undefined, excerpt: a.excerpt ?? undefined, tags: a.tags, score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2, reason: "全平台热门", strategies: ["hot-trending"], metadata: { viewCount: a.viewCount, likeCount: a.likeCount } })));
    items.push(...courses.map((c) => ({ id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { price: Number(c.price), studentCount: c.studentCount } })));
    items.push(...products.map((p) => ({ id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0], excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { price: Number(p.price), salesCount: p.salesCount } })));
    items.push(...circles.map((c) => ({ id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { memberCount: c.memberCount } })));
    items.push(...(Array.isArray(classics) ? classics : []).map((b) => ({ id: b.id, type: "CLASSIC" as const, title: b.title, cover: b.cover ?? undefined, excerpt: toPublicClassicIntro(b.intro, b.title), tags: [b.category].filter(Boolean) as string[], score: b.viewCount ?? 0, reason: "全平台热门", strategies: ["hot-trending"], metadata: { author: b.author, viewCount: b.viewCount } })));

    return items.sort((a, b) => b.score - a.score);
  }

  // ───── 新增场景：会话列表底部猜你喜欢 ─────

  async sceneConversationGuess(_ctx: RecommendContext): Promise<RecommendItem[]> {
    // 推荐热门圈子 + 热门课程
    const [circles, courses] = await Promise.all([
      this.prisma.circle.findMany({
        where: { status: "ACTIVE" },
        select: this.selectSvc.circleSelect(),
        take: 6,
        orderBy: { memberCount: "desc" },
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: this.selectSvc.courseSelect(),
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

  async sceneContactsDiscover(_ctx: RecommendContext): Promise<RecommendItem[]> {
    // 推荐热门圈主 + 热门讲师
    const [topCircles, topCourses] = await Promise.all([
      this.prisma.circle.findMany({
        where: { status: "ACTIVE" },
        select: { ...this.selectSvc.circleSelect(), ownerId: true },
        take: 10,
        orderBy: { memberCount: "desc" },
      }),
      this.prisma.course.findMany({
        where: { auditStatus: "APPROVED" },
        select: { ...this.selectSvc.courseSelect() },
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

    const ownerMap = new Map<any, any>(circleOwners.map((u: any) => [u.id, u] as [string, any]));
    const teacherMap = new Map<any, any>(courseTeachers.map((u: any) => [u.id, u] as [string, any]));

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
}
