import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const REDIS_CHANNEL = "ai:events";
const EVENT_RETENTION_DAYS = 30;

export interface AiEventPayload {
  type: string;
  source: "user" | "admin" | "marketing" | "ops" | "dev";
  severity?: "info" | "warning" | "critical";
  payload: Record<string, unknown>;
  context?: {
    userId?: string;
    stationId?: string;
    traceId?: string;
    relatedEvents?: string[];
    metrics?: Record<string, number>;
  };
}

export interface AiEventHandler {
  eventType: string;
  handler: (event: AiEventRecord) => Promise<void>;
  options?: {
    priority?: number;
    dedupWindowMs?: number;
    rateLimit?: number;
  };
}

export interface AiEventRecord {
  id: string;
  type: string;
  source: string;
  severity: string;
  payload: Record<string, unknown>;
  context: Record<string, unknown> | null;
  status: string;
  processedBy: string[];
  processResult: Record<string, unknown> | null;
  createdAt: Date;
  processedAt: Date | null;
}

/**
 * AI 事件总线
 *
 * 系统事件 → Redis Pub/Sub 实时广播 → AI Agent 响应
 * 所有事件持久化到 PostgreSQL，支持回溯和审计。
 *
 * 使用方式：
 * - 任何模块注入 AiEventBusService，调用 publish() 发布事件
 * - AI Agent 调用 subscribe() 注册感兴趣的事件类型
 * - 事件被处理后调用 markProcessed() 标记完成
 */
@Injectable()
export class AiEventBusService {
  private readonly logger = new Logger(AiEventBusService.name);
  private handlers: AiEventHandler[] = [];
  private subInitialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 发布事件 — 持久化到DB + 广播到Redis */
  async publish(event: AiEventPayload): Promise<string> {
    const record = await this.prisma.aiEvent.create({
      data: {
        type: event.type,
        source: event.source,
        severity: event.severity || "info",
        payload: event.payload as any,
        context: (event.context as any) || undefined,
      },
    });

    // 广播到 Redis（fire-and-forget，不影响主流程）
    this.redis
      .publish(REDIS_CHANNEL, JSON.stringify({ id: record.id, type: record.type }))
      .catch((err) => this.logger.warn(`Redis 广播失败: ${err.message}`));

    // 异步触发本地订阅者
    this.notifyHandlers(record as any as AiEventRecord).catch((err) =>
      this.logger.error(`事件处理异常: ${event.type}`, err),
    );

    return record.id;
  }

  /** 订阅事件类型 */
  subscribe(handler: AiEventHandler): string {
    this.handlers.push(handler);
    this.logger.log(
      `订阅: ${handler.eventType} (当前 ${this.handlers.length} 个订阅者)`,
    );
    return `${handler.eventType}:${Date.now()}`;
  }

  /** 取消订阅 */
  unsubscribe(subscriptionId: string): void {
    const before = this.handlers.length;
    this.handlers = this.handlers.filter(
      (h) => `${h.eventType}:${Date.now()}` !== subscriptionId,
    );
    this.logger.log(
      `取消订阅: ${subscriptionId} (${before} → ${this.handlers.length})`,
    );
  }

  /** 标记事件已处理 */
  async markProcessed(
    eventId: string,
    agentId: string,
    result?: Record<string, unknown>,
  ): Promise<void> {
    const event = await this.prisma.aiEvent.findUnique({
      where: { id: eventId },
      select: { processedBy: true },
    });
    if (!event) return;

    const processedBy = [...new Set([...event.processedBy, agentId])];

    await this.prisma.aiEvent.update({
      where: { id: eventId },
      data: {
        status: "processed",
        processedBy,
        processResult: (result as any) || undefined,
        processedAt: new Date(),
      },
    });
  }

  /** 查询事件历史 */
  async query(filters: {
    type?: string;
    source?: string;
    severity?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: AiEventRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filters.type) where.type = filters.type;
    if (filters.source) where.source = filters.source;
    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate)
        (where.createdAt as Record<string, unknown>).gte = filters.startDate;
      if (filters.endDate)
        (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.aiEvent.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.aiEvent.count({ where: where as any }),
    ]);

    return { events: events as any as AiEventRecord[], total };
  }

  /** 获取待处理事件数 */
  async getPendingCount(): Promise<number> {
    return this.prisma.aiEvent.count({ where: { status: "published" } });
  }

  /** 获取事件统计 */
  async getStats(): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    const [total, pending, processed, failed, typeRows] = await Promise.all([
      this.prisma.aiEvent.count(),
      this.prisma.aiEvent.count({ where: { status: "published" } }),
      this.prisma.aiEvent.count({ where: { status: "processed" } }),
      this.prisma.aiEvent.count({ where: { status: "failed" } }),
      this.prisma.aiEvent.groupBy({
        by: ["type"],
        _count: true,
        orderBy: { _count: { type: "desc" } },
        take: 20,
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const row of typeRows) {
      byType[row.type] = row._count;
    }

    return { total, pending, processed, failed, byType };
  }

  /** 通知所有匹配的订阅者 */
  private async notifyHandlers(event: AiEventRecord): Promise<void> {
    const matching = this.handlers.filter(
      (h) =>
        h.eventType === event.type || h.eventType === "*" || event.type.startsWith(h.eventType.replace("*", "")),
    );

    if (matching.length === 0) return;

    for (const sub of matching) {
      try {
        await sub.handler(event);
        await this.markProcessed(event.id, `handler:${sub.eventType}`);
      } catch (err: any) {
        this.logger.error(
          `事件处理失败: ${event.type} → ${sub.eventType}: ${err.message}`,
        );
      }
    }
  }

  /** 每日清理过期事件（分布式锁防多实例重复执行） */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupExpiredEvents(): Promise<void> {
    await this.redis.runExclusive("ai_event_bus_cleanup_expired_events", 600, async () => {
      try {
        const cutoff = new Date(
          Date.now() - EVENT_RETENTION_DAYS * 24 * 3600_000,
        );
        const result = await this.prisma.aiEvent.deleteMany({
          where: { createdAt: { lt: cutoff } },
        });
        if (result.count > 0) {
          this.logger.log(`清理过期事件: ${result.count} 条`);
        }
      } catch (err: any) {
        this.logger.warn(`过期事件清理失败: ${err.message}`);
      }
    });
  }

  /** 统计最近24小时事件数量 */
  async get24hEventCount(): Promise<number> {
    return this.prisma.aiEvent.count({
      where: { createdAt: { gte: new Date(Date.now() - 86400_000) } },
    });
  }
}
