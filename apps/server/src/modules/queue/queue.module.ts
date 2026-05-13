import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";
import { NotificationProcessor } from "./processors/notification.processor";
import { AiCallbackProcessor } from "./processors/ai-callback.processor";
import { ReconciliationProcessor } from "./processors/reconciliation.processor";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: redisUrl,
      },
      defaultJobOptions: {
        removeOnComplete: { age: 3600 * 24 }, // 完成 24h 后清理
        removeOnFail: { age: 3600 * 24 * 7 }, // 失败 7 天后清理
      },
    }),
    BullModule.registerQueue(
      { name: "notification" },
      { name: "ai-callback" },
      { name: "reconciliation" },
    ),
  ],
  providers: [QueueService, NotificationProcessor, AiCallbackProcessor, ReconciliationProcessor],
  exports: [QueueService],
})
export class QueueModule {}
