import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { AiLoggerService } from "../../ai-gateway/ai-logger.service";

export interface AiCallbackJobData {
  provider: "deepseek" | "coze" | "openai";
  requestId: string;
  endpoint: string;
  payload: Record<string, unknown>;
  callbackUrl?: string;
}

@Processor("ai-callback")
export class AiCallbackProcessor extends WorkerHost {
  private readonly logger = new Logger(AiCallbackProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiLogger: AiLoggerService,
  ) {
    super();
  }

  async process(job: Job<AiCallbackJobData>): Promise<void> {
    const { provider, requestId, endpoint, payload } = job.data;
    this.logger.debug(`处理 AI 回调: job=${job.id} provider=${provider} requestId=${requestId}`);

    try {
      // 根据 provider 和 endpoint 分发处理
      switch (endpoint) {
        case "chat.completion":
          await this.handleCompletionCallback(provider, requestId, payload);
          break;
        case "stream.error":
          await this.handleStreamError(provider, requestId, payload);
          break;
        case "bot.message":
          await this.handleBotMessage(provider, requestId, payload);
          break;
        default:
          await this.handleGenericCallback(provider, requestId, endpoint, payload);
      }

      this.logger.log(`[AI回调] ${provider}/${endpoint} requestId=${requestId} 处理完成`);
    } catch (err: any) {
      this.logger.error(`AI 回调失败: job=${job.id}`, err?.stack);
      throw err;
    }
  }

  /** 对话完成回调 — 记录 AI 日志 + 更新 BotChatLog */
  private async handleCompletionCallback(
    provider: string,
    requestId: string,
    payload: Record<string, unknown>,
  ) {
    const error = payload.error as string | undefined;
    const status = error ? "FAILED" : "COMPLETED";

    // 如果有关联的 BotChatLog 记录，更新其响应
    if (payload.conversationId) {
      await this.prisma.botChatLog.updateMany({
        where: { conversationId: payload.conversationId as string },
        data: {
          response: (payload.content as string) || JSON.stringify(payload),
        },
      });
    }

    await this.aiLogger.log({
      scene: `callback.${provider}`,
      model: (payload.model as string) || provider,
      fallbackUsed: !!error,
      latency: (payload.latency as number) || 0,
      promptTokens: (payload.usage as any)?.promptTokens,
      completionTokens: (payload.usage as any)?.completionTokens,
      inputSummary: `[${status}] ${provider}/${requestId}`,
    });

    this.logger.log(`对话完成回调: ${requestId} status=${status}`);
  }

  /** 流式错误回调 */
  private async handleStreamError(
    provider: string,
    requestId: string,
    payload: Record<string, unknown>,
  ) {
    await this.aiLogger.log({
      scene: `callback.${provider}.error`,
      model: (payload.model as string) || provider,
      fallbackUsed: true,
      fallbackModel: (payload.fallbackModel as string),
      latency: (payload.latency as number) || 0,
      inputSummary: `流式错误: ${requestId} - ${(payload.error as string) || "unknown"}`,
    });
  }

  /** Bot 消息回调 — 记录到 BotChatLog */
  private async handleBotMessage(
    provider: string,
    requestId: string,
    payload: Record<string, unknown>,
  ) {
    const conversationId = (payload.conversationId as string) || requestId;

    await this.prisma.botChatLog.upsert({
      where: { id: requestId },
      create: {
        id: requestId,
        userId: (payload.userId as string) || "system",
        botConfigId: (payload.botConfigId as string) || "unknown",
        query: (payload.question as string) || "",
        response: (payload.answer as string) || "",
        conversationId,
      },
      update: {
        response: (payload.answer as string) || "",
      },
    });
  }

  /** 通用回调 */
  private async handleGenericCallback(
    provider: string,
    requestId: string,
    endpoint: string,
    payload: Record<string, unknown>,
  ) {
    await this.aiLogger.log({
      scene: `callback.${provider}.${endpoint}`,
      model: provider,
      fallbackUsed: false,
      latency: 0,
      inputSummary: `回调: ${JSON.stringify(payload).slice(0, 200)}`,
    });

    this.logger.log(`通用 AI 回调: ${provider}/${endpoint} requestId=${requestId}`);
  }
}
