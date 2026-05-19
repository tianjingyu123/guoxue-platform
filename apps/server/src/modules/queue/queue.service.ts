import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, Job } from "bullmq";

export type QueueName = "notification" | "ai-callback" | "reconciliation";

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue("notification") private readonly notificationQueue: Queue,
    @InjectQueue("ai-callback") private readonly aiCallbackQueue: Queue,
    @InjectQueue("reconciliation") private readonly reconciliationQueue: Queue,
  ) {}

  private getQueue(name: QueueName): Queue {
    const queues: Record<QueueName, Queue> = {
      notification: this.notificationQueue,
      "ai-callback": this.aiCallbackQueue,
      reconciliation: this.reconciliationQueue,
    };
    return queues[name];
  }

  /** 添加任务到指定队列 */
  async add<T = Record<string, unknown>>(
    queueName: QueueName,
    name: string,
    data: T,
    opts?: { delay?: number; priority?: number; dedupKey?: string; dedupTtl?: number },
  ): Promise<Job<T>> {
    const job = await this.getQueue(queueName).add(name, data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      ...opts,
    });
    this.logger.debug(`[${queueName}] 任务入队: ${name} (job=${job.id})`);
    return job;
  }

  /** 批量添加任务 */
  async addBulk<T = Record<string, unknown>>(
    queueName: QueueName,
    jobs: Array<{ name: string; data: T; opts?: { delay?: number; priority?: number } }>,
  ): Promise<Job<T>[]> {
    return this.getQueue(queueName).addBulk(
      jobs.map((j) => ({
        name: j.name,
        data: j.data,
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          ...j.opts,
        },
      })),
    );
  }

  /** 查询任务状态 */
  async getJob(queueName: QueueName, jobId: string): Promise<Job | undefined> {
    return this.getQueue(queueName).getJob(jobId);
  }

  /** 获取队列统计 */
  async getStats(queueName: QueueName) {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  /** 获取所有队列统计 */
  async getAllStats() {
    const [notification, aiCallback, reconciliation] = await Promise.all([
      this.getStats("notification"),
      this.getStats("ai-callback"),
      this.getStats("reconciliation"),
    ]);
    return { notification, "ai-callback": aiCallback, reconciliation };
  }
}
