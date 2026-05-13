import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

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

  async process(job: Job<AiCallbackJobData>): Promise<void> {
    const { provider, requestId, endpoint } = job.data;
    this.logger.debug(`处理 AI 回调: job=${job.id} provider=${provider} requestId=${requestId}`);

    try {
      // TODO: 注入 AI 服务后实现实际的回调处理
      this.logger.log(`[AI回调] ${provider}/${endpoint} requestId=${requestId}`);
    } catch (err: any) {
      this.logger.error(`AI 回调失败: job=${job.id}`, err?.stack);
      throw err;
    }
  }
}
