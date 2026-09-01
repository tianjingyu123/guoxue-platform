import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AiEventBusService, AiEventRecord } from "./ai-event-bus.service";

/**
 * AI 发现到运营闭环的最小可信桥梁：异常事件只创建幂等待办，不直接做高风险业务写入。
 * 真正处置仍由受控动作处理器或真人完成，并沿用 OpsTask 的审批、证据和接管状态机。
 */
@Injectable()
export class AiOpsBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiOpsBridgeService.name);
  private subscriptions: string[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: AiEventBusService,
  ) {}

  onModuleInit(): void {
    this.subscriptions.push(this.eventBus.subscribe({
      eventType: "anomaly.detected.*",
      options: { consumerId: "ai-ops-bridge:anomaly-detected", priority: 100 },
      handler: (event) => this.createInvestigationTask(event),
    }));
    this.subscriptions.push(this.eventBus.subscribe({
      eventType: "anomaly.report.generated",
      options: { consumerId: "ai-ops-bridge:anomaly-report", priority: 90 },
      handler: (event) => this.createInvestigationTask(event),
    }));
  }

  onModuleDestroy(): void {
    for (const id of this.subscriptions) this.eventBus.unsubscribe(id);
    this.subscriptions = [];
  }

  private async createInvestigationTask(event: AiEventRecord): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const metric = typeof payload.metric === "string" ? payload.metric : "平台异常巡检";
    const title = event.type === "anomaly.report.generated"
      ? "AI 异常巡检报告待复核"
      : `AI 发现异常：${metric}`;

    await this.prisma.opsTask.upsert({
      where: { sourceEventId: event.id },
      create: {
        type: "INSPECT",
        priority: event.severity === "critical" ? "HIGH" : "MEDIUM",
        title: title.slice(0, 200),
        sourceEventId: event.id,
        needsApproval: false,
        approvalStatus: "not_required",
        payload: {
          eventType: event.type,
          severity: event.severity,
          detectedAt: event.createdAt,
          evidence: payload,
          nextStep: "核验指标与影响范围；需要业务写操作时新建受控 FIX/OPS 任务并按风险级别审批",
        } as Prisma.InputJsonValue,
      },
      update: {},
    });
    this.logger.log(`异常事件 ${event.id} 已进入运营任务池`);
  }
}
