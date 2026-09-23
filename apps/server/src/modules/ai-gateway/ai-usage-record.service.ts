import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * AI 用量记录服务：记录所有 AI 调用的 token 消耗和费用
 *
 * 解决交接书指出的问题：
 * - 无专用 AI 计量表，token 塞在 AiAnalysisRecord.tokenUsage 的 JSON 里
 * - 流式 chatStream 完全不记 token（ai-gateway.service.ts:210-224）
 * - 圈主助理走流式 → 这部分消耗账外
 */

export interface UsageRecordRequest {
  userId?: string;
  scene: string;
  relatedType?: string;
  relatedId?: string;
  provider: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  cost?: number;
  requestId?: string;
  /** 幂等键：同一笔用量（如供应商回调单号）重复到达时只记一次 */
  idempotencyKey?: string;
  isStreaming?: boolean;
  durationMs?: number;
  errorMessage?: string;
}

@Injectable()
export class AiUsageRecordService {
  private readonly logger = new Logger(AiUsageRecordService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 记录 AI 用量
   */
  async record(req: UsageRecordRequest): Promise<void> {
    try {
      await this.prisma.aiUsageRecord.create({
        data: {
          userId: req.userId || null,
          scene: req.scene,
          relatedType: req.relatedType || null,
          relatedId: req.relatedId || null,
          provider: req.provider,
          model: req.model || null,
          promptTokens: req.promptTokens || 0,
          completionTokens: req.completionTokens || 0,
          totalTokens: req.totalTokens || 0,
          cachedTokens: req.cachedTokens || 0,
          cost: req.cost ? new Decimal(req.cost) : new Decimal(0),
          requestId: req.requestId || null,
          idempotencyKey: req.idempotencyKey || null,
          isStreaming: req.isStreaming || false,
          durationMs: req.durationMs || null,
          errorMessage: req.errorMessage || null,
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002" && req.idempotencyKey) {
        this.logger.log(`重复用量已忽略: ${req.idempotencyKey}`);
        return;
      }
      this.logger.error(`AI 用量记录失败: ${error?.message || error}`);
    }
  }

  /**
   * 批量记录 AI 用量（用于流式调用结束后批量写入）
   */
  async recordBatch(records: UsageRecordRequest[]): Promise<void> {
    if (records.length === 0) return;

    try {
      await this.prisma.aiUsageRecord.createMany({
        data: records.map((req) => ({
          userId: req.userId || null,
          scene: req.scene,
          relatedType: req.relatedType || null,
          relatedId: req.relatedId || null,
          provider: req.provider,
          model: req.model || null,
          promptTokens: req.promptTokens || 0,
          completionTokens: req.completionTokens || 0,
          totalTokens: req.totalTokens || 0,
          cachedTokens: req.cachedTokens || 0,
          cost: req.cost ? new Decimal(req.cost) : new Decimal(0),
          requestId: req.requestId || null,
          idempotencyKey: req.idempotencyKey || null,
          isStreaming: req.isStreaming || false,
          durationMs: req.durationMs || null,
          errorMessage: req.errorMessage || null,
        })),
        skipDuplicates: true,
      });
    } catch (error: any) {
      this.logger.error(`AI 用量批量记录失败: ${error?.message || error}`);
    }
  }
}
