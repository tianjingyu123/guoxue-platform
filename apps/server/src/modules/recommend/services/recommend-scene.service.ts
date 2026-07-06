import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  RecommendContext,
  RecommendScene,
} from "../recommend.dto";
import { RecommendItem } from "../strategies/base.strategy";
import { RecommendSelectService } from "./recommend-select.service";
import { RecommendSceneCoreService } from "./recommend-scene-core.service";

/**
 * 推荐-上下文场景域（从 recommend.service 拆出·纯搬家不改逻辑）。
 * 职责：场景分发 dispatch + 有上下文的场景推荐（文章/排盘/同城/课程详情/商品详情/
 * 支付成功/课程学习页）。基础召回场景（猜你喜欢/兜底/热门）委托 SceneCoreService。
 * 依赖方向单向：本域 → 基础召回域（不循环）。
 */
@Injectable()
export class RecommendSceneService {
  constructor(
    private prisma: PrismaService,
    private selectSvc: RecommendSelectService,
    private coreSvc: RecommendSceneCoreService,
  ) {}

  // ═══════════════════════════════════════════
  // 场景分发
  // ═══════════════════════════════════════════

  async dispatch(ctx: RecommendContext): Promise<RecommendItem[]> {
    switch (ctx.scene) {
      case RecommendScene.ARTICLE_DETAIL:
        return ctx.contentId ? await this.sceneArticleDetail(ctx) : await this.coreSvc.sceneFallback(ctx);
      case RecommendScene.EMPTY_STATE:
        return await this.coreSvc.sceneEmptyState(ctx);
      case RecommendScene.GUESS_LIKE:
        return await this.coreSvc.sceneGuessLike(ctx);
      case RecommendScene.PAIPAN_RESULT:
        return await this.scenePaipanResult(ctx);
      case RecommendScene.COURSE_DETAIL:
        return ctx.contentId ? await this.sceneCourseDetail(ctx) : await this.coreSvc.sceneFallback(ctx);
      case RecommendScene.PRODUCT_DETAIL:
        return ctx.contentId ? await this.sceneProductDetail(ctx) : await this.coreSvc.sceneFallback(ctx);
      case RecommendScene.PAYMENT_SUCCESS:
        return await this.scenePaymentSuccess(ctx);
      case RecommendScene.SEARCH_EMPTY:
        return await this.coreSvc.sceneSearchEmpty(ctx);
      case RecommendScene.CONVERSATION_GUESS:
        return await this.coreSvc.sceneConversationGuess(ctx);
      case RecommendScene.CONTACTS_DISCOVER:
        return await this.coreSvc.sceneContactsDiscover(ctx);
      case RecommendScene.COURSE_LEARN:
        return await this.sceneCourseLearn(ctx);
      case RecommendScene.SAME_CITY:
        return await this.sceneSameCity(ctx);
      default:
        return await this.coreSvc.sceneFallback(ctx);
    }
  }

  // ═══════════════════════════════════════════
  // 场景处理（P0：article_detail）
  // ═══════════════════════════════════════════

  private async sceneArticleDetail(ctx: RecommendContext): Promise<RecommendItem[]> {
    const article = await this.prisma.article.findUnique({
      where: { id: ctx.contentId },
      select: { id: true, tags: true, circleId: true },
    });
    if (!article) return await this.coreSvc.sceneFallback(ctx);

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
        select: this.selectSvc.articleSelect(),
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

  // ───── P1 新增场景 ─────

  private async scenePaipanResult(ctx: RecommendContext): Promise<RecommendItem[]> {
    const tagMap: Record<string, string[]> = {
      BAZI: ["八字", "命理", "四柱"],
      ZIWEI: ["紫微斗数", "紫微", "命盘"],
      FENGSHUI: ["风水", "家居风水", "办公风水"],
      NAME: ["命名", "取名", "姓名学"],
      LIUYAO: ["六爻", "卦象", "预测"],
      LIUREN: ["大六壬", "六壬", "天星"],
      QIMEN: ["奇门遁甲", "奇门", "遁甲"],
    };
    const matchTags = tagMap[ctx.paipanType ?? ""] ?? ["国学", "易学"];

    const items: RecommendItem[] = [];

    // 并行查询：课程 + 圈子 + 文章 + 商品 + 视频 + 古籍
    const [courses, circles, articles, products, videos] = await Promise.all([
      this.prisma.course.findMany({
        where: { tags: { hasSome: matchTags }, auditStatus: "APPROVED" },
        select: this.selectSvc.courseSelect(), take: 4, orderBy: { studentCount: "desc" },
      }),
      this.prisma.circle.findMany({
        where: { tags: { hasSome: matchTags }, status: "ACTIVE" },
        select: this.selectSvc.circleSelect(), take: 4, orderBy: { memberCount: "desc" },
      }),
      this.prisma.article.findMany({
        where: { tags: { hasSome: matchTags }, auditStatus: "APPROVED" },
        select: this.selectSvc.articleSelect(), take: 4, orderBy: { viewCount: "desc" },
      }),
      this.prisma.product.findMany({
        where: { tags: { hasSome: matchTags }, status: "ON_SALE" },
        select: this.selectSvc.productSelect(), take: 4, orderBy: { salesCount: "desc" },
      }),
      this.prisma.video.findMany({
        where: { tags: { hasSome: matchTags }, status: "PUBLISHED" },
        select: this.selectSvc.videoSelect(), take: 4, orderBy: { viewCount: "desc" },
      }),
    ]);

    items.push(...courses.map((c) => ({
      id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined,
      excerpt: c.intro ?? undefined, tags: c.tags, score: (c.studentCount ?? 0) * 2,
      reason: "排盘结果相关课程", strategies: ["tag-match", "paipan-slot"],
      metadata: { price: Number(c.price), studentCount: c.studentCount },
    })));

    items.push(...articles.map((a) => ({
      id: a.id, type: "ARTICLE" as const, title: a.title, cover: a.cover ?? undefined,
      excerpt: a.excerpt ?? undefined, tags: a.tags,
      score: (a.viewCount ?? 0) * 0.3 + (a.likeCount ?? 0) * 2,
      reason: "排盘结果相关文章", strategies: ["tag-match", "paipan-slot"],
      metadata: { viewCount: a.viewCount, likeCount: a.likeCount },
    })));

    items.push(...circles.map((c) => ({
      id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined,
      excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0,
      reason: "排盘结果相关圈子", strategies: ["tag-match", "paipan-slot"],
      metadata: { memberCount: c.memberCount },
    })));

    items.push(...products.map((p) => ({
      id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0],
      excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0,
      reason: "排盘结果相关商品", strategies: ["tag-match", "paipan-slot"],
      metadata: { price: Number(p.price), salesCount: p.salesCount },
    })));

    items.push(...videos.map((v) => ({
      id: v.id, type: "VIDEO" as const, title: v.title ?? "", cover: v.coverUrl ?? undefined,
      tags: v.tags, score: v.viewCount ?? 0,
      reason: "排盘结果相关视频", strategies: ["tag-match", "paipan-slot"],
      metadata: { viewCount: v.viewCount, likeCount: v.likeCount },
    })));

    // 底部综合推荐
    const fallback = await this.coreSvc.sceneGuessLike(ctx);
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

    if (stations.length === 0) return this.coreSvc.sceneFallback(ctx);

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

    if (items.length === 0) return this.coreSvc.sceneFallback(ctx);
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
    if (!course) return this.coreSvc.sceneFallback(ctx);

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
          select: this.selectSvc.courseSelect(),
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
        select: this.selectSvc.productSelect(),
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
        select: this.selectSvc.circleSelect(),
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
        select: this.selectSvc.circleSelect(),
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
    if (!product) return this.coreSvc.sceneFallback(ctx);

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
          select: this.selectSvc.productSelect(),
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
        select: this.selectSvc.courseSelect(),
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

    if (orderIds.length === 0) return this.coreSvc.sceneGuessLike(ctx);

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
        this.prisma.course.findMany({ where: { tags: { hasSome: uniqueTags }, auditStatus: "APPROVED", id: { notIn: [...purchasedIds] } }, select: this.selectSvc.courseSelect(), take: 4, orderBy: { studentCount: "desc" } }),
        this.prisma.product.findMany({ where: { tags: { hasSome: uniqueTags }, status: "ON_SALE", id: { notIn: [...purchasedIds] } }, select: this.selectSvc.productSelect(), take: 4, orderBy: { salesCount: "desc" } }),
        this.prisma.circle.findMany({ where: { tags: { hasSome: uniqueTags }, status: "ACTIVE" }, select: this.selectSvc.circleSelect(), take: 3, orderBy: { memberCount: "desc" } }),
      ]);

      items.push(...courses.map((c) => ({ id: c.id, type: "COURSE" as const, title: c.title, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.studentCount ?? 0, reason: "购买此课程的人也喜欢", strategies: ["tag-match"], metadata: { price: Number(c.price), studentCount: c.studentCount } })));
      items.push(...products.map((p) => ({ id: p.id, type: "PRODUCT" as const, title: p.title, cover: p.images?.[0], excerpt: p.intro ?? undefined, tags: p.tags, score: p.salesCount ?? 0, reason: "根据购买记录推荐", strategies: ["tag-match"], metadata: { price: Number(p.price), salesCount: p.salesCount } })));
      items.push(...circles.map((c) => ({ id: c.id, type: "CIRCLE" as const, title: c.name, cover: c.cover ?? undefined, excerpt: c.intro ?? undefined, tags: c.tags, score: c.memberCount ?? 0, reason: "相关圈子推荐", strategies: ["tag-match"], metadata: { memberCount: c.memberCount } })));
    }

    if (items.length === 0) return this.coreSvc.sceneGuessLike(ctx);
    return items;
  }

  // ───── 新增场景：课程学习页推荐 ─────

  private async sceneCourseLearn(ctx: RecommendContext): Promise<RecommendItem[]> {
    if (!ctx.contentId) return this.coreSvc.sceneFallback(ctx);

    const course = await this.prisma.course.findUnique({
      where: { id: ctx.contentId },
      select: { id: true, tags: true, circleId: true },
    });
    if (!course) return this.coreSvc.sceneFallback(ctx);

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
        select: this.selectSvc.courseSelect(),
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
      select: this.selectSvc.courseSelect(),
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
        select: this.selectSvc.circleSelect(),
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
        select: this.selectSvc.circleSelect(),
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
}
