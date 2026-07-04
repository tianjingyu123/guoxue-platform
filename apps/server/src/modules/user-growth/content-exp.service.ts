import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserGrowthService } from "./user-growth.service";

/**
 * 内容学分基础分（创-P1 创作激励重构·设计 §1.1）：
 * 帖子 20 / 长文 50 / 视频 50 —— 签到=5 的量级即拉开；优质长文 50×10=500 = 签到的 100 倍。
 * 评分器（content-quality）当前只扫 ARTICLE/POST，VIDEO 为前瞻保留（接入评分后自动生效）。
 */
export const CONTENT_BASE_EXP: Record<string, number> = {
  POST: 20,
  ARTICLE: 50,
  VIDEO: 50,
};

/** 质量系数表（设计拍板值）：<40 ×0 不发分（防低质刷量），≥90 ×10 */
export function qualityMultiplier(total: number): number {
  if (total >= 90) return 10;
  if (total >= 80) return 6;
  if (total >= 60) return 3;
  if (total >= 40) return 1;
  return 0;
}

/** 同作者内容学分日上限（防刷·设计拍板值 1500） */
export const CONTENT_EXP_DAILY_CAP = 1500;
/** GrowthRecord source 前缀：幂等判重 + 创作榜聚合的统一口径 */
export const CONTENT_EXP_SOURCE_PREFIX = "content_quality";
/** ≥80 分颁发的成就 code（「妙笔生花」·t_wenhao「文豪」称号的前置） */
export const QUALITY_ACHIEVEMENT_CODE = "content_quality_star";
const QUALITY_ACHIEVEMENT_THRESHOLD = 80;

/**
 * 创作激励·内容学分发放（创-P1）：由 ContentQualityService 在评分落库后调用。
 * - 学分 = 基础分 × 质量系数（首发系数 ×1.2 属设计后续项，本批未接——评分批次无「当日主题首发」上下文）
 * - 幂等：GrowthRecord source=content_quality:{contentId} 判重（评分表本身 targetType+targetId 唯一，双保险；
 *   评分批次为单 cron 串行执行，无并发竞态）
 * - 日上限：同作者当日 content_quality 来源合计 ≤ 1500
 * - ≥80 分同时颁「妙笔生花」成就 → 联动触发 t_wenhao「文豪」称号评估（addExp 内惰性评估）
 * 全程自吞异常，绝不阻断评分批次主流程。
 */
@Injectable()
export class ContentExpService {
  private readonly logger = new Logger(ContentExpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly growth: UserGrowthService,
  ) {}

  /** 评分落库钩子：按公式发内容学分（返回实发数与原因，便于测试与排查） */
  async onContentScored(
    targetType: string,
    targetId: string,
    total: number,
  ): Promise<{ awarded: number; reason?: string }> {
    try {
      const base = CONTENT_BASE_EXP[targetType];
      if (!base) return { awarded: 0, reason: "unsupported_type" };

      const userId = await this.resolveAuthor(targetType, targetId);
      if (!userId) return { awarded: 0, reason: "author_not_found" };

      // 幂等：同 contentId 不重复发
      const source = `${CONTENT_EXP_SOURCE_PREFIX}:${targetId}`;
      const dup = await this.prisma.growthRecord.findFirst({ where: { source }, select: { id: true } });
      if (dup) return { awarded: 0, reason: "duplicate" };

      // ≥80 分先颁成就（幂等）：使随后 addExp 内的称号惰性评估能立即看到前置成就 → 颁 t_wenhao
      if (total >= QUALITY_ACHIEVEMENT_THRESHOLD) {
        await this.prisma.userAchievement
          .createMany({ data: [{ userId, code: QUALITY_ACHIEVEMENT_CODE }], skipDuplicates: true })
          .catch(() => undefined);
      }

      const mult = qualityMultiplier(total);
      if (mult === 0) return { awarded: 0, reason: "low_quality" }; // <40 ×0 档不发分

      // 日上限 1500：统计当日 content_quality 来源已发合计
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const sum = await this.prisma.growthRecord.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          source: { startsWith: `${CONTENT_EXP_SOURCE_PREFIX}:` },
          createdAt: { gte: dayStart },
        },
      });
      const used = sum._sum?.amount ?? 0;
      const remaining = CONTENT_EXP_DAILY_CAP - used;
      if (remaining <= 0) return { awarded: 0, reason: "daily_cap" };
      const exp = Math.min(base * mult, remaining);

      // 学分台账（幂等锚点 + 创作榜聚合数据源）
      await this.prisma.growthRecord.create({
        data: { userId, amount: exp, source, description: `内容质量学分（${targetType} ${total}分）` },
      });
      // 计入平台成长体系（UserGrowth.totalExp·等级/成就/称号联动）
      await this.growth.addExp(userId, exp, CONTENT_EXP_SOURCE_PREFIX);
      return { awarded: exp };
    } catch (e) {
      this.logger.warn(`内容学分发放失败(${targetType}:${targetId})`, e as Error);
      return { awarded: 0, reason: "error" };
    }
  }

  /** 解析内容作者（ARTICLE/POST/VIDEO 三型均有 userId 列） */
  private async resolveAuthor(targetType: string, targetId: string): Promise<string | null> {
    if (targetType === "ARTICLE") {
      const a = await this.prisma.article.findUnique({ where: { id: targetId }, select: { userId: true } });
      return a?.userId ?? null;
    }
    if (targetType === "POST") {
      const p = await this.prisma.post.findUnique({ where: { id: targetId }, select: { userId: true } });
      return p?.userId ?? null;
    }
    if (targetType === "VIDEO") {
      const v = await this.prisma.video.findUnique({ where: { id: targetId }, select: { userId: true } });
      return v?.userId ?? null;
    }
    return null;
  }

  /**
   * 创作榜（公开·质量加权内容学分 Top20）：聚合 GrowthRecord source 前缀 content_quality。
   * period=week 近 7 天 / month 近 30 天（滚动窗口·非自然周月，口径简单且无时区边界问题）。
   */
  async getCreationRankings(period: "week" | "month") {
    const days = period === "month" ? 30 : 7;
    const since = new Date(Date.now() - days * 86_400_000);
    const grouped = await this.prisma.growthRecord.groupBy({
      by: ["userId"],
      where: { source: { startsWith: `${CONTENT_EXP_SOURCE_PREFIX}:` }, createdAt: { gte: since } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 20,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      period,
      since: since.toISOString(),
      items: grouped.map((g, i) => ({
        rank: i + 1,
        userId: g.userId,
        nickname: userMap.get(g.userId)?.nickname ?? "国学学友",
        avatar: userMap.get(g.userId)?.avatar ?? "",
        score: g._sum?.amount ?? 0,
      })),
    };
  }
}
