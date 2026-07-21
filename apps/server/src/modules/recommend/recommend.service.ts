import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import {
  RecommendContext,
  RecommendResponse,
  RecommendLogDto,
} from "./recommend.dto";
import { toRecommendItemVO, RecommendItem } from "./strategies/base.strategy";
import { ColdStartService } from "./services/cold-start.service";
import { ScoringService } from "./services/scoring.service";
import { AbTestService } from "./services/ab-test.service";
import { RecommendSceneService } from "./services/recommend-scene.service";
import { RecommendInsertService } from "./services/recommend-insert.service";
import { RecommendSelectService } from "./services/recommend-select.service";
import { isPublicContentQuarantined, publicQuarantinedIds } from "../../common/public-content-quarantine";
import type { AbTestAssignment } from "./ab-test.dto";

const TRACKING_CONTEXT_TTL = 7 * 86400;

interface RecommendTrackingContext {
  userId?: string;
  scene: string;
  abTests: AbTestAssignment[];
  items: Record<string, {
    strategies: string[];
    position: number;
  }>;
}


/**
 * 推荐服务（facade·2026-07-05 P2-5 按域拆分）
 *
 * ## 拆分结构（facade 委托·纯搬家零行为变化）
 * - RecommendSceneService：13 个场景推荐方法 + dispatch 分发 + 协同/画像/向量融合
 * - RecommendInsertService：运营分区强插 + 站长精选注入
 * - RecommendSelectService：各内容类型 Prisma select 片段（叶子·多域共享）
 * - 本 facade：getRecommendations 主编排 + 去重 getOwnedSet + 旧版兼容
 *   (related/personalized/trending) + 日志 logInteractions + 统计 getRecommendStats
 *   + 工具 applyDiversityInterleave/cacheKey/generateRecommendId + 全量委托。
 *
 * ## ⚠️ 架构评估（2026-06-02）
 * 当前模块共 50+ 文件，包含协同过滤/向量召回/TF-IDF/OpenAI Embedding/
 * AB测试/冷启动/CTR计算等 10+ 策略。这在 **0 用户验证阶段是过度设计**。
 *
 * ## 选型原则对照
 * - "可演进优于完美" → 当前违反。应该在验证阶段用最简单的方案跑通
 * - "借力优先于自建" → 部分违反。Embedding 已借力 OpenAI，但协同过滤等是自建
 *
 * ## 建议演进路径
 * 1. **当前阶段（验证期）**：仅保留 tag-match（标签匹配）+ hot（热门）+ 站长精选，
 *    其余策略标记为 `@deprecated` 或通过 FeatureFlag 关闭
 * 2. **增长期（1 万 DAU+）**：开启 AB 测试 + 基础 scoring，验证策略效果
 * 3. **规模化（10 万 DAU+）**：开启协同过滤/向量召回/冷启动，接入推荐系统专用服务
 *
 * ## 考虑过的方案
 * 1. 保持现状 → 维护成本高，大部分策略无数据喂不产生价值
 * 2. 全部删除重来 → 浪费已有代码
 * 3. FeatureFlag 分级开启（建议）→ ✅ 保留代码，按需激活
 *
 * 当前构造函数中的依赖注入保留完整，但实际调用应由 FeatureFlag 控制。
 */
@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private coldStart: ColdStartService,
    private scoring: ScoringService,
    private abTest: AbTestService,
    private sceneSvc: RecommendSceneService,
    private insertSvc: RecommendInsertService,
    private selectSvc: RecommendSelectService,
  ) {}

  // ═══════════════════════════════════════════
  // 统一推荐入口
  // ═══════════════════════════════════════════

  async getRecommendations(ctx: RecommendContext): Promise<RecommendResponse> {
    // 构建缓存键
    const cacheKey = this.cacheKey(ctx);

    // 读缓存
    const cached = await this.redis.getJson<RecommendResponse>(cacheKey);
    if (cached) {
      await this.rememberTrackingContext(cached, ctx).catch((err) =>
        this.logger.warn(`推荐追踪上下文补写失败: ${(err as Error).message}`),
      );
      return cached;
    }

    // P3: 冷启动检测
    const isColdStart = ctx.userId ? await this.coldStart.isColdStart(ctx.userId).catch((err: Error) => { this.logger.warn("冷启动检测失败", err.message); return false; }) : false;

    // 按场景分发
    const items: RecommendItem[] = await this.sceneSvc.dispatch(ctx);

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

    // P3: 评分流水线（新鲜度 + 会员加权 + 归一化）
    filtered = await this.scoring.score(filtered, ctx.userId);

    // P3: 多样性交错 — 防止同类型内容连续霸占前排
    filtered = this.applyDiversityInterleave(filtered, 3);

    // P2: 分区强插 — 运营插入指定内容到指定位置
    try {
      filtered = await this.insertSvc.applyInsertRules(ctx.scene, filtered);
    } catch (e) {
      this.logger.warn(`分区强插失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    // P2: 站长精选注入 — 分站站长配置的精选内容按固定位插入
    try {
      filtered = await this.insertSvc.applyStationPicks(ctx, filtered);
    } catch (e) {
      this.logger.warn(`站长精选注入失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 公开内容卫生兜底：覆盖召回、冷启动、运营强插和站长精选四条来源。
    filtered = filtered.filter((item) => !isPublicContentQuarantined(item.type, item.id));

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
    await this.rememberTrackingContext(response, ctx).catch((err) =>
      this.logger.warn(`推荐追踪上下文写入失败: ${(err as Error).message}`),
    );

    return response;
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
      this.prisma.order.findMany({ where: { userId, status: { in: ["PAID", "COMPLETED"] } }, select: { type: true, targetId: true }, take: 1000 }),
      this.prisma.collect.findMany({ where: { userId }, select: { targetType: true, targetId: true }, take: 500 }),
      this.prisma.like.findMany({ where: { userId }, select: { targetType: true, targetId: true }, take: 500 }),
      this.prisma.circleMember.findMany({ where: { userId }, select: { circleId: true }, take: 200 }),
      this.prisma.courseProgress.findMany({ where: { userId, completed: true }, select: { courseId: true }, take: 500 }),
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

  async logInteractions(dto: RecommendLogDto, userId?: string) {
    const context = await this.redis
      .getJson<RecommendTrackingContext>(this.trackingKey(dto.recommendId))
      .catch(() => null);
    if (!context) return { success: true, accepted: 0, ignored: "CONTEXT_EXPIRED" };
    if (context.userId && context.userId !== userId) {
      return { success: true, accepted: 0, ignored: "CONTEXT_MISMATCH" };
    }

    const abTokens = context.abTests.map((assignment) =>
      `ab:${assignment.experimentId}:${assignment.group}`,
    );
    const seen = new Set<string>();
    const logs = dto.interactions.flatMap((interaction) => {
      const itemKey = `${interaction.itemType}:${interaction.itemId}`;
      const tracked = context.items[itemKey];
      const eventKey = `${itemKey}:${interaction.action}`;
      if (!tracked || seen.has(eventKey)) return [];
      seen.add(eventKey);
      const strategy = [...new Set([...tracked.strategies, ...abTokens])].join("|");
      return [{
        userId: context.userId ?? userId ?? null,
        recommendId: dto.recommendId,
        itemType: interaction.itemType,
        itemId: interaction.itemId,
        position: tracked.position,
        isClick: interaction.action === "CLICK",
        staySeconds: interaction.staySeconds,
        strategy,
        scene: context.scene,
      }];
    });

    if (logs.length === 0) return { success: true, accepted: 0 };
    try {
      await this.prisma.recommendLog.createMany({ data: logs });
      return { success: true, accepted: logs.length };
    } catch (err) {
      this.logger.warn("推荐日志写入失败", err);
      return { success: false, accepted: 0 };
    }
  }

  // ═══════════════════════════════════════════
  // 分区强插管理（委托 InsertService）
  // ═══════════════════════════════════════════

  async insertContent(position: number, contentId: string, contentType: string) {
    return this.insertSvc.insertContent(position, contentId, contentType);
  }

  async removeInsertedContent(position: number) {
    return this.insertSvc.removeInsertedContent(position);
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
      where: { id: { not: contentId, notIn: publicQuarantinedIds("article") }, auditStatus: "APPROVED", tags: { hasSome: tags } },
      select: this.selectSvc.articleSelect(),
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
      where: { id: { notIn: [...interactedIds, ...publicQuarantinedIds("article")] }, auditStatus: "APPROVED", tags: { hasSome: tags } },
      select: this.selectSvc.articleSelect(),
      take: 5,
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
    });
  }

  async trending() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const byViews = await this.prisma.article.findMany({
      where: { id: { notIn: publicQuarantinedIds("article") }, createdAt: { gte: sevenDaysAgo }, auditStatus: "APPROVED" },
      select: this.selectSvc.articleSelect(),
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
          where: { id: { in: sortedIds, notIn: publicQuarantinedIds("article") }, auditStatus: "APPROVED" },
          select: this.selectSvc.articleSelect(),
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

  /** P3: 多样性交错 — 每类内容最多连续 maxConsecutive 个，保证推荐流类型丰富 */
  applyDiversityInterleave(items: RecommendItem[], maxConsecutive = 3): RecommendItem[] {
    if (items.length <= maxConsecutive) return items;

    // 按类型分组保持内部排序
    const grouped: Record<string, RecommendItem[]> = {};
    for (const item of items) {
      (grouped[item.type] ??= []).push(item);
    }

    const typeKeys = Object.keys(grouped);
    if (typeKeys.length <= 1) return items;

    const result: RecommendItem[] = [];
    const counters: Record<string, number> = Object.fromEntries(typeKeys.map((k) => [k, 0]));

    while (result.length < items.length) {
      let added = false;
      // 每个类型轮流取一个，直到列表填满
      for (const type of typeKeys) {
        if (result.length >= items.length) break;
        const group = grouped[type];
        if (counters[type] < group.length) {
          // 检查该类型是否已连续出现 maxConsecutive 次
          let consecutive = 0;
          for (let i = result.length - 1; i >= 0; i--) {
            if (result[i].type === type) consecutive++;
            else break;
          }
          if (consecutive < maxConsecutive) {
            result.push(group[counters[type]++]);
            added = true;
          }
        }
      }
      // 所有类型都已达上限，放宽约束取剩余
      if (!added) {
        for (const type of typeKeys) {
          const group = grouped[type];
          while (counters[type] < group.length && result.length < items.length) {
            result.push(group[counters[type]++]);
          }
        }
      }
    }

    return result;
  }

  private cacheKey(ctx: RecommendContext): string {
    const params = [ctx.contentId, ctx.paipanType, ctx.listType, ctx.page, ctx.pageSize].join(":");
    return `recommend:${ctx.scene}:${ctx.userId ?? "anonymous"}:${params}:v2`;
  }

  private generateRecommendId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  private trackingKey(recommendId: string): string {
    return `recommend:tracking:${recommendId}`;
  }

  private async rememberTrackingContext(
    response: RecommendResponse,
    ctx: RecommendContext,
  ): Promise<void> {
    const rawAssignments = response.extra?.abTests;
    const abTests = Array.isArray(rawAssignments)
      ? rawAssignments.filter((value): value is AbTestAssignment => {
          if (!value || typeof value !== "object") return false;
          const assignment = value as Partial<AbTestAssignment>;
          return typeof assignment.experimentId === "string"
            && (assignment.group === "control" || assignment.group === "experiment")
            && typeof assignment.bucket === "number";
        })
      : [];
    const items = Object.fromEntries(response.items.map((item, position) => [
      `${item.type}:${item.id}`,
      { strategies: Array.isArray(item.strategies) ? item.strategies : [], position },
    ]));
    const context: RecommendTrackingContext = {
      userId: ctx.userId,
      scene: ctx.scene,
      abTests,
      items,
    };
    await this.redis.setJson(
      this.trackingKey(response.recommendId),
      context,
      TRACKING_CONTEXT_TTL,
    );
  }


  async getRecommendStats(params: { startDate?: string; endDate?: string; scene?: string }) {
    const where: any = {};
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }
    if (params.scene) where.scene = params.scene;
    const impressionWhere = { ...where, isClick: false };
    const clickWhere = { ...where, isClick: true };

    const [totalImpressions, totalClicks, byScene, bySceneClicks, byStrategy, byStrategyClicks] = await Promise.all([
      this.prisma.recommendLog.count({ where: impressionWhere }),
      this.prisma.recommendLog.count({ where: clickWhere }),
      this.prisma.recommendLog.groupBy({ by: ["scene"], where: impressionWhere, _count: { id: true } }),
      this.prisma.recommendLog.groupBy({ by: ["scene"], where: clickWhere, _count: { id: true } }),
      this.prisma.recommendLog.groupBy({ by: ["strategy"], where: impressionWhere, _count: { id: true } }),
      this.prisma.recommendLog.groupBy({ by: ["strategy"], where: clickWhere, _count: { id: true } }),
    ]);

    const clickMap = Object.fromEntries(bySceneClicks.map(s => [s.scene, s._count.id]));
    const strategyClickMap = Object.fromEntries(byStrategyClicks.map(s => [s.strategy, s._count.id]));

    const days = 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const requestedCreatedAt = where.createdAt ?? {};
    const trendCreatedAt = { ...requestedCreatedAt };
    if (!(trendCreatedAt.gte instanceof Date) || trendCreatedAt.gte < since) {
      trendCreatedAt.gte = since;
    }
    const recentLogs = await this.prisma.recommendLog.findMany({
      where: { ...where, createdAt: trendCreatedAt },
      select: { createdAt: true, isClick: true },
    });

    const dailyMap: Record<string, { impressions: number; clicks: number }> = {};
    for (const log of recentLogs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { impressions: 0, clicks: 0 };
      if (log.isClick) dailyMap[day].clicks++;
      else dailyMap[day].impressions++;
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
