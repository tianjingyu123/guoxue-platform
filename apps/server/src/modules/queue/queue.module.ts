import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";
import { NotificationProcessor } from "./processors/notification.processor";
import { AiCallbackProcessor } from "./processors/ai-callback.processor";
import { ReconciliationProcessor } from "./processors/reconciliation.processor";
import { QueueMonitorProcessor } from "./processors/queue-monitor.processor";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { NotificationModule } from "../notification/notification.module";
import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { FinanceModule } from "../finance/finance.module";

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
    BullModule.registerQueue({ name: "__queue_monitor__" }),
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: ExpressAdapter,
    }),
    ...queues.map((q) =>
      BullBoardModule.forFeature({ name: q.name, adapter: BullMQAdapter })
    ),
    NotificationModule,
    EmailModule,
    PrismaModule,
    AiGatewayModule,
    FinanceModule,
  ],
  providers: [QueueService, NotificationProcessor, AiCallbackProcessor, ReconciliationProcessor, QueueMonitorProcessor],
  exports: [QueueService],
})
export class QueueModule {}
