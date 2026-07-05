import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination } from "../../common/pagination";

@Injectable()
export class AdminDedupService {
  private readonly logger = new Logger(AdminDedupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 全局候选列表（跨圈子、按相似度排序） */
  async listCandidates(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    circleId?: string;
    minSimilarity?: number;
  }) {
    const { page, pageSize, skip } = safePagination(query.page, query.pageSize);
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.circleId) where.circleId = query.circleId;
    if (query.minSimilarity != null) where.similarityScore = { gte: query.minSimilarity };

    const [items, total] = await Promise.all([
      this.prisma.circleKnowledgeCandidate.findMany({
        where,
        orderBy: [{ similarityScore: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        skip,
        take: pageSize,
        include: { decisions: { take: 1, orderBy: { decidedAt: "desc" } } },
      }),
      this.prisma.circleKnowledgeCandidate.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 候选详情 */
  async getCandidate(id: string) {
    const candidate = await this.prisma.circleKnowledgeCandidate.findUnique({
      where: { id },
      include: {
        decisions: { orderBy: { decidedAt: "desc" } },
      },
    });
    if (!candidate) throw new BusinessException(ErrorCode.NOT_FOUND, "候选记录不存在");

    // 获取疑似重复目标的详情
    let similarTarget: any = null;
    if (candidate.similarToId) {
      similarTarget = await this.prisma.circleKnowledge.findUnique({
        where: { id: candidate.similarToId },
        select: { id: true, content: true, sourceType: true },
      });
    }

    return { ...candidate, similarTarget };
  }

  /** 单个决策 */
  async decide(candidateId: string, decision: string, decidedBy?: string, reason?: string) {
    const candidate = await this.prisma.circleKnowledgeCandidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new BusinessException(ErrorCode.NOT_FOUND, "候选记录不存在");

    // 创建决策记录
    const record = await this.prisma.circleKnowledgeDedupDecision.create({
      data: { candidateId, decision, decidedBy, reason },
    });

    // 更新候选状态
    await this.prisma.circleKnowledgeCandidate.update({
      where: { id: candidateId },
      data: { status: decision === "override" ? "confirmed" : "rejected" },
    });

    this.logger.log(`去重决策: ${candidateId} → ${decision}`);
    return record;
  }

  /** 批量审核 */
  async batchDecide(dto: { items: Array<{ candidateId: string; decision: string; reason?: string }> }, decidedBy?: string) {
    const results: Array<{ candidateId: string; decision: string; ok: boolean; error?: string }> = [];
    for (const item of dto.items) {
      try {
        await this.decide(item.candidateId, item.decision, decidedBy, item.reason);
        results.push({ candidateId: item.candidateId, decision: item.decision, ok: true });
      } catch (err: any) {
        results.push({ candidateId: item.candidateId, decision: item.decision, ok: false, error: err.message });
      }
    }
    return { processed: results.length, results };
  }

  /** 去重统计 */
  async getStats() {
    const [total, pending, confirmed, rejected] = await Promise.all([
      this.prisma.circleKnowledgeCandidate.count(),
      this.prisma.circleKnowledgeCandidate.count({ where: { status: "pending" } }),
      this.prisma.circleKnowledgeCandidate.count({ where: { status: "confirmed" } }),
      this.prisma.circleKnowledgeCandidate.count({ where: { status: "rejected" } }),
    ]);

    // 相似度分布
    const candidates = await this.prisma.circleKnowledgeCandidate.findMany({
      where: { similarityScore: { not: null } },
      select: { similarityScore: true },
    });

    const scores = candidates.map((c) => c.similarityScore!).filter((s) => s != null);
    const distribution = {
      high: scores.filter((s) => s >= 0.9).length,
      medium: scores.filter((s) => s >= 0.7 && s < 0.9).length,
      low: scores.filter((s) => s < 0.7).length,
    };

    return { total, pending, confirmed, rejected, distribution };
  }
}
