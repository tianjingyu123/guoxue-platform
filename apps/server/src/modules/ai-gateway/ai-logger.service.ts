import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { safePagination } from "../../common/pagination";

/**
 * AI 调用日志服务 — 将所有AI网关调用写入 AiAnalysisRecord 表
 */
@Injectable()
export class AiLoggerService {
  private readonly logger = new Logger(AiLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    scene: string;
    model: string;
    provider?: string;
    fallbackUsed: boolean;
    fallbackModel?: string;
    grayReleaseModel?: string;
    costCapped?: boolean;
    latency: number;
    cost?: number;
    inputSummary?: string;
    outputSummary?: string;
    promptTokens?: number;
    completionTokens?: number;
    userAccepted?: boolean;
  }) {
    try {
      await this.prisma.aiAnalysisRecord.create({
        data: {
          userId: params.userId || "system",
          analyzeType: "GENERAL",
          analysisContent: params.outputSummary || "",
          scene: params.scene,
          modelName: params.grayReleaseModel || params.model,
          modelUsed: params.model,
          fallbackUsed: params.fallbackUsed,
          fallbackModel: params.fallbackModel,
          latency: params.latency,
          cost: params.cost,
          inputSummary: params.inputSummary?.slice(0, 200),
          outputSummary: params.outputSummary?.slice(0, 200),
          tokenUsage: {
            promptTokens: params.promptTokens || 0,
            completionTokens: params.completionTokens || 0,
          },
          userAccepted: params.userAccepted,
        },
      });
    } catch (err) {
      this.logger.error("AI日志写入失败", err);
    }
  }

  /** 查询AI调用日志（支持场景筛选、分页） */
  async query(params: {
    page?: number;
    pageSize?: number;
    scenes?: string[];
    status?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }) {
    const { page, pageSize, skip } = safePagination(params.page, params.pageSize);
    const where: any = {};

    if (params.scenes && params.scenes.length > 0) {
      where.scene = { in: params.scenes };
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }
    if (params.keyword) {
      where.OR = [
        { inputSummary: { contains: params.keyword } },
        { outputSummary: { contains: params.keyword } },
        { analysisContent: { contains: params.keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.aiAnalysisRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          scene: true,
          modelName: true,
          modelUsed: true,
          inputSummary: true,
          outputSummary: true,
          analysisContent: true,
          tokenUsage: true,
          latency: true,
          cost: true,
          createdAt: true,
        },
      }),
      this.prisma.aiAnalysisRecord.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }
}
