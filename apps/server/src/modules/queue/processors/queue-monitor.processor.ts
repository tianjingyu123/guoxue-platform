import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { QueueService } from "../queue.service";

/**
 * 队列监控 — 每5分钟检查所有队列的积压和失败情况
 * 使用 BullMQ 的 repeatable job 机制定时触发
 * 该 processor 处理名为 __queue_monitor__ 的内部队列
 */
@Processor("__queue_monitor__", {
  // 该 worker 不处理实际任务，仅由 Cron 触发的检查任务
})
export class QueueMonitorProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueMonitorProcessor.name);

  constructor(private readonly queueService: QueueService) {
    super();
  }

  async process(job: Job<{ type: "health_check" }>): Promise<any> {
    if (job.name === "health_check") {
      return this.checkAllQueues();
    }
  }

  private async checkAllQueues() {
    try {
      const stats = await this.queueService.getAllStats();
      const alerts: string[] = [];

      for (const [queueName, s] of Object.entries(stats)) {
        if (s.failed > 200) {
          alerts.push(`[严重] 队列 ${queueName} 失败任务数: ${s.failed}`);
        } else if (s.failed > 50) {
          this.logger.warn(`队列 ${queueName} 失败任务数偏高: ${s.failed}`);
        }
        if (s.waiting > 500) {
          alerts.push(`[严重] 队列 ${queueName} 等待任务积压: ${s.waiting}`);
        } else if (s.waiting > 100) {
          this.logger.warn(`队列 ${queueName} 等待任务偏多: ${s.waiting}`);
        }
      }

      if (alerts.length > 0) {
        this.logger.error(`队列健康告警:\n${alerts.join("\n")}`);
      }
    } catch (err) {
      this.logger.error("队列健康检查失败", err);
    }
  }
}
