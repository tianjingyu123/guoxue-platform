import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination } from "../../common/pagination";

/**
 * RAG Layer 4 — 用户知识画像服务
 *
 * 追踪用户知识交互行为，构建个性化知识画像，
 * 支持自适应难度调节和个性化知识推荐。
 */
@Injectable()
export class UserKnowledgeService {
  private readonly logger = new Logger(UserKnowledgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 记录用户知识交互 */
  async trackInteraction(params: {
    userId: string;
    knowledgeId: string;
    action: "view" | "ask" | "upvote" | "downvote" | "bookmark";
    queryText?: string;
  }): Promise<void> {
    try {
      await this.prisma.userKnowledgeInteraction.create({
        data: {
          userId: params.userId,
          knowledgeId: params.knowledgeId,
          action: params.action,
          queryText: params.queryText,
        },
      });

      // 异步更新用户画像
      await this.updateProfile(params.userId).catch((err) =>
        this.logger.warn(`画像更新失败 [${params.userId}]: ${err.message}`),
      );
    } catch (err: any) {
      this.logger.warn(`交互记录失败: ${err.message}`);
    }
  }

  /** 获取或创建用户画像 */
  async getProfile(userId: string) {
    let profile = await this.prisma.userKnowledgeProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.userKnowledgeProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  /** 更新用户画像（基于最近交互历史） */
  async updateProfile(userId: string): Promise<void> {
    const recent = await this.prisma.userKnowledgeInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (recent.length === 0) return;

    // 统计兴趣分布（按知识ID聚合）
    const interestCounts = new Map<string, number>();
    for (const r of recent) {
      if (r.action === "upvote" || r.action === "ask" || r.action === "bookmark") {
        interestCounts.set(r.knowledgeId, (interestCounts.get(r.knowledgeId) ?? 0) + 1);
      }
    }

    // 获取对应知识的标签/类型
    const knowledgeIds = [...interestCounts.keys()];
    const knowledgeItems = knowledgeIds.length > 0
      ? await this.prisma.circleKnowledge.findMany({
          where: { id: { in: knowledgeIds } },
          select: { id: true, sourceType: true },
        })
      : [];

    const sourceTypeMap = new Map(knowledgeItems.map((k) => [k.id, k.sourceType]));
    const typeCounts = new Map<string, number>();
    for (const [kid, count] of interestCounts) {
      const type = sourceTypeMap.get(kid) ?? "unknown";
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + count);
    }

    // 计算难度水平（基于正负反馈比）
    const upvotes = recent.filter((r) => r.action === "upvote").length;
    const downvotes = recent.filter((r) => r.action === "downvote").length;
    const ratio = upvotes + downvotes > 0 ? upvotes / (upvotes + downvotes) : 0.5;
    const newDifficulty = Math.max(0.1, Math.min(1.0, ratio));

    await this.prisma.userKnowledgeProfile.upsert({
      where: { userId },
      create: {
        userId,
        topInterests: [...typeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t),
        difficultyLevel: newDifficulty,
        totalQueries: recent.length,
        lastActiveAt: new Date(),
      },
      update: {
        topInterests: [...typeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t),
        difficultyLevel: newDifficulty,
        totalQueries: recent.length,
        lastActiveAt: new Date(),
      },
    });
  }

  /** 获取用户最近交互记录 */
  async getInteractions(userId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const [items, total] = await Promise.all([
      this.prisma.userKnowledgeInteraction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.userKnowledgeInteraction.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 根据用户画像推荐难度级别的知识 */
  async getDifficultyAdjustedKnowledge(
    userId: string,
    limit = 5,
  ): Promise<Array<{ id: string; sourceType: string; content: string }>> {
    const profile = await this.getProfile(userId);

    // qualityScore 近似映射难度：入门=低分但基础，专业=高分但深入
    const minScore = profile.difficultyLevel < 0.4 ? 0 : profile.difficultyLevel * 0.6;
    const maxScore = profile.difficultyLevel < 0.4 ? 0.5 : 1.0;

    // 优先按兴趣类型推荐
    const interests = (profile.topInterests as string[]) ?? [];
    const where: any = {
      status: "active",
      qualityScore: { gte: minScore, lte: maxScore },
    };
    if (interests.length > 0) {
      where.sourceType = { in: interests };
    }

    const items = await this.prisma.circleKnowledge.findMany({
      where,
      select: { id: true, sourceType: true, content: true },
      orderBy: { qualityScore: "desc" },
      take: limit,
    });

    // 不够时从全局补充
    if (items.length < limit) {
      const backup = await this.prisma.circleKnowledge.findMany({
        where: { status: "active" },
        select: { id: true, sourceType: true, content: true },
        orderBy: { addedAt: "desc" },
        take: limit - items.length,
      });
      items.push(...backup);
    }

    return items;
  }

  /** 获取全局用户兴趣统计（运营分析） */
  async getGlobalInterestStats(): Promise<Array<{ type: string; count: number }>> {
    const result = await this.prisma.userKnowledgeInteraction.groupBy({
      by: ["action"],
      _count: true,
    });

    return result.map((r) => ({
      type: r.action,
      count: r._count,
    }));
  }
}
