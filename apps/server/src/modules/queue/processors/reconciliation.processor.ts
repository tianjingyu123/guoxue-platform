import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { FinanceService } from "../../finance/finance.service";

export interface ReconciliationJobData {
  type: "order" | "payment" | "refund";
  batchId: string;
  dateRange: { start: string; end: string };
}

@Processor("reconciliation")
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(private readonly finance: FinanceService) {
    super();
  }

  async process(job: Job<ReconciliationJobData>): Promise<void> {
    const { type, batchId, dateRange } = job.data;
    this.logger.debug(`处理对账任务: job=${job.id} type=${type} batchId=${batchId}`);

    try {
      // 遍历日期范围，逐日对账
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      const results: Array<{ date: string; status: string; orderCount: number }> = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        try {
          const record = await this.finance.triggerReconciliation({
            source: `queue:${type}`,
            billDate: dateStr,
          });
          results.push({
            date: dateStr,
            status: record.status,
            orderCount: (record as any).detail?.orderCount || 0,
          });
        } catch (err: any) {
          results.push({ date: dateStr, status: "ERROR", orderCount: 0 });
          this.logger.error(`对账失败 [${dateStr}]: ${err.message}`);
        }
      }

      this.logger.log(
        `[对账] ${type} batchId=${batchId} 完成: ${results.length}天, ` +
          `成功=${results.filter((r) => r.status !== "ERROR").length}, ` +
          `失败=${results.filter((r) => r.status === "ERROR").length}`,
      );
    } catch (err: any) {
      this.logger.error(`对账任务失败: job=${job.id}`, err?.stack);
      throw err;
    }
  }
}
