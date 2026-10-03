import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { randomUUID } from "crypto";
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
    /** 跨进程重启保持稳定的消费者标识，用于部分成功后的精准续投。 */
    consumerId?: string;
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
  attemptCount?: number;
  processingStartedAt?: Date | null;
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
 * - 总线自动记录每个消费者的处理结果，并仅重试失败消费者
 */
@Injectable()
export class AiEventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiEventBusService.name);
  private handlers = new Map<string, AiEventHandler>();
  private unsubscribeRedis?: () => Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.unsubscribeRedis = await this.redis.subscribe(REDIS_CHANNEL, async (message) => {
      try {
        const payload = JSON.parse(message) as { id?: string };
        if (!payload.id) return;
        const event = await this.prisma.aiEvent.findUnique({ where: { id: payload.id } });
        if (event) await this.notifyHandlers(event as unknown as AiEventRecord);
      } catch (err) {
        this.logger.error("AI 事件广播消费失败", err);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.unsubscribeRedis?.();
  }

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

    // 广播失败时事件仍保持 published，分钟级补偿任务会重新投递，不能静默丢失。
    await this.redis
      .publish(REDIS_CHANNEL, JSON.stringify({ id: record.id, type: record.type }))
      .catch((err) => this.logger.warn(`Redis 广播失败，等待补偿投递: ${err.message}`));

    return record.id;
  }

  /** 订阅事件类型 */
  subscribe(handler: AiEventHandler): string {
    const id = `${handler.eventType}:${randomUUID()}`;
    if (handler.options?.consumerId) {
      const duplicated = [...this.handlers.values()].some(
        (item) => item.options?.consumerId === handler.options?.consumerId,
      );
      if (duplicated) {
        throw new Error(`AI事件消费者标识重复: ${handler.options.consumerId}`);
      }
    }
    this.handlers.set(id, handler);
    this.logger.log(
      `订阅: ${handler.eventType} (当前 ${this.handlers.size} 个订阅者)`,
    );
    return id;
  }

  /** 取消订阅 */
  unsubscribe(subscriptionId: string): void {
    const before = this.handlers.size;
    this.handlers.delete(subscriptionId);
    this.logger.log(
      `取消订阅: ${subscriptionId} (${before} → ${this.handlers.size})`,
    );
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
    const matching = [...this.handlers.entries()]
      .filter(([, handler]) => this.matchesEventType(handler.eventType, event.type))
      .sort(([, a], [, b]) => (b.options?.priority ?? 0) - (a.options?.priority ?? 0));

    if (matching.length === 0) return;

    const pending = matching.filter(([subscriptionId, handler]) => {
      const consumerId = handler.options?.consumerId || subscriptionId;
      return !event.processedBy.includes(consumerId);
    });
    if (pending.length === 0) {
      await this.prisma.aiEvent.updateMany({
        where: { id: event.id, status: "published" },
        data: {
          status: "processed",
          processedAt: new Date(),
          processingStartedAt: null,
        },
      });
      return;
    }

    // 多节点竞争同一事件：只有把 published 原子改为 processing 的实例可以执行。
    const claimed = await this.prisma.aiEvent.updateMany({
      where: { id: event.id, status: "published" },
      data: { status: "processing", processingStartedAt: new Date(), attemptCount: { increment: 1 } },
    });
    if (claimed.count === 0) return;

    const processedBy = [...event.processedBy];
    const results: Record<string, unknown> =
      event.processResult && typeof event.processResult === "object"
        ? { ...event.processResult }
        : {};
    let failedCount = 0;
    for (const [subscriptionId, sub] of pending) {
      const consumerId = sub.options?.consumerId || subscriptionId;
      try {
        await sub.handler(event);
        if (!processedBy.includes(consumerId)) processedBy.push(consumerId);
        results[consumerId] = { ok: true, processedAt: new Date().toISOString() };
      } catch (err: any) {
        failedCount += 1;
        results[consumerId] = {
          ok: false,
          error: String(err?.message || err).slice(0, 500),
          failedAt: new Date().toISOString(),
        };
        this.logger.error(
          `事件处理失败: ${event.type} → ${sub.eventType}: ${err.message}`,
        );
      }
    }

    const attempt = (event.attemptCount ?? 0) + 1;
    await this.prisma.aiEvent.update({
      where: { id: event.id },
      data: failedCount === 0
        ? {
            status: "processed",
            processedBy,
            processResult: results as any,
            processedAt: new Date(),
            processingStartedAt: null,
          }
        : attempt < 3
          ? {
              status: "published",
              processedBy,
              processResult: results as any,
              processedAt: null,
              processingStartedAt: null,
            }
          : {
              status: "failed",
              processedBy,
              processResult: results as any,
              processedAt: new Date(),
              processingStartedAt: null,
            },
    });
  }

  private matchesEventType(pattern: string, eventType: string): boolean {
    if (pattern === "*" || pattern === eventType) return true;
    return pattern.endsWith("*") && eventType.startsWith(pattern.slice(0, -1));
  }

  /** Pub/Sub 非持久化，分钟级扫描 published 事件并恢复崩溃节点遗留的 processing 事件。 */
  @Cron(CronExpression.EVERY_MINUTE)
  async replayPendingEvents(): Promise<void> {
    await this.redis.runExclusive("ai-event-bus-replay", 50, async () => {
      await this.prisma.aiEvent.updateMany({
        where: {
          status: "processing",
          processingStartedAt: { lt: new Date(Date.now() - 5 * 60_000) },
        },
        data: { status: "published", processingStartedAt: null },
      });
      const pending = await this.prisma.aiEvent.findMany({
        where: { status: "published" },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      for (const event of pending) {
        const record = event as unknown as AiEventRecord;
        const hasHandler = [...this.handlers.values()].some(
          (handler) => this.matchesEventType(handler.eventType, record.type),
        );
        if (!hasHandler && event.createdAt < new Date(Date.now() - 5 * 60_000)) {
          await this.prisma.aiEvent.updateMany({
            where: { id: event.id, status: "published" },
            data: {
              status: "failed",
              processedAt: new Date(),
              processResult: { reason: "NO_REGISTERED_HANDLER", retryable: false },
            },
          });
          continue;
        }
        await this.notifyHandlers(record);
      }
    });
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
