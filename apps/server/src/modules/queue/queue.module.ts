import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";
import { NotificationProcessor } from "./processors/notification.processor";
import { AiCallbackProcessor } from "./processors/ai-callback.processor";
import { ReconciliationProcessor } from "./processors/reconciliation.processor";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const queues = [
  { name: "notification" },
  { name: "ai-callback" },
  { name: "reconciliation" },
];

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: redisUrl,
      },
      defaultJobOptions: {
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
    }),
    BullModule.registerQueue(...queues),
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: ExpressAdapter,
    }),
    ...queues.map((q) =>
      BullBoardModule.forFeature({ name: q.name, adapter: BullMQAdapter })
    ),
  ],
  providers: [QueueService, NotificationProcessor, AiCallbackProcessor, ReconciliationProcessor],
  exports: [QueueService],
})
export class QueueModule {}
