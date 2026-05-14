import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

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
}
