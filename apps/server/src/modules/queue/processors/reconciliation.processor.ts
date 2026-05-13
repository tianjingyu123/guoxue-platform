import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

export interface ReconciliationJobData {
  type: "order" | "payment" | "refund";
  batchId: string;
  dateRange: { start: string; end: string };
}

@Processor("reconciliation")
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  async process(job: Job<ReconciliationJobData>): Promise<void> {
    const { type, batchId, dateRange } = job.data;
    this.logger.debug(`处理对账任务: job=${job.id} type=${type} batchId=${batchId}`);

    try {
      // TODO: 注入对账服务后实现实际的对账逻辑
      this.logger.log(`[对账] ${type} batchId=${batchId} ${dateRange.start}~${dateRange.end}`);
    } catch (err: any) {
      this.logger.error(`对账任务失败: job=${job.id}`, err?.stack);
      throw err;
    }
  }
}
