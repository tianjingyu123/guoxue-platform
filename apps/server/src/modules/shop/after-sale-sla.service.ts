import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AfterSale, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 售后/投诉 SLA 服务（F5 投诉-快速退款 SLA · 合-P2）
 *
 * 载体结论：「消费者投诉商家/订单」的真实载体 = AfterSale（移动端 pkg-order/dispute 与售后
 * 均走 POST /shop/orders/:id/after-sale 落 AfterSale 表）。不动 schema（另一线在用），
 * SLA 全部按 createdAt + 24h 推导：
 * - slaDueAt      首响截止时间（仅 PENDING 单）
 * - slaOverdue    是否已超 24h 未首响
 * - fastRefundEligible 订单资金仍在结算缓冲期内（LedgerEntry PENDING/FROZEN 存在，
 *   或无总账记录的旧订单按 paidAt < T+7 兜底）→ admin 处置时标注「可快速退款」。
 *   仅标注提示，不做任何自动退款（资金动作人工）。
 * - 每小时 cron：扫超 24h 未首响 → Notification 升级给 SUPER_ADMIN（按单去重只升一次）。
 */

/** 投诉 24h 首响承诺（设计文档 §三.3） */
export const AFTER_SALE_SLA_HOURS = 24;
/** 升级通知去重标识（Notification.targetType） */
export const SLA_ESCALATION_TARGET_TYPE = "AFTER_SALE_SLA";
/** 无总账记录旧订单的快速退款兜底窗口（对齐结算引擎最大缓冲期 T+7） */
const FALLBACK_BUFFER_DAYS = 7;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** 列表行 SLA 增强字段 */
export interface AfterSaleSlaFields {
  slaDueAt: Date | null;
  slaOverdue: boolean;
  fastRefundEligible: boolean;
}

@Injectable()
export class AfterSaleSlaService {
  private readonly logger = new Logger(AfterSaleSlaService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** admin 售后列表（含 SLA 推导字段与快速退款标注·纯读不改数据） */
  async listWithSla(page = 1, pageSize = 20, status?: string) {
    const where: Prisma.AfterSaleWhereInput = {};
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.afterSale.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.afterSale.count({ where }),
    ]);
    const enriched = await this.enrich(items);
    return { items: enriched, total, page, pageSize };
  }

  /** 给售后单批量补 SLA 推导字段 + 快速退款标注 */
  async enrich(items: AfterSale[]): Promise<Array<AfterSale & AfterSaleSlaFields>> {
    const now = Date.now();
    const pendingOrderIds = [...new Set(items.filter((it) => it.status === "PENDING").map((it) => it.orderId))];

    // 1) 结算总账：该订单存在 PENDING/FROZEN 分账记录 = 钱还在平台（缓冲期内可快速退款）
    const ledgerRows = pendingOrderIds.length
      ? await this.prisma.ledgerEntry.findMany({
          where: { refType: "ORDER", refId: { in: pendingOrderIds } },
          select: { refId: true, status: true },
        })
      : [];
    const hasAnyLedger = new Set(ledgerRows.map((r) => r.refId));
    const inBuffer = new Set(
      ledgerRows.filter((r) => r.status === "PENDING" || r.status === "FROZEN").map((r) => r.refId),
    );

    // 2) 兜底：无总账记录的旧订单，按支付时间 T+7 判断
    const noLedgerIds = pendingOrderIds.filter((id) => !hasAnyLedger.has(id));
    const orders = noLedgerIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: noLedgerIds } },
          select: { id: true, paidAt: true },
        })
      : [];
    const fallbackOk = new Set(
      orders
        .filter((o) => o.paidAt && now - o.paidAt.getTime() < FALLBACK_BUFFER_DAYS * DAY_MS)
        .map((o) => o.id),
    );

    return items.map((it) => {
      const isPending = it.status === "PENDING";
      const dueAt = new Date(it.createdAt.getTime() + AFTER_SALE_SLA_HOURS * HOUR_MS);
      return {
        ...it,
        slaDueAt: isPending ? dueAt : null,
        slaOverdue: isPending && dueAt.getTime() < now,
        fastRefundEligible: isPending && (inBuffer.has(it.orderId) || fallbackOk.has(it.orderId)),
      };
    });
  }

  /** 每小时扫超 24h 未首响的售后/投诉单 → 升级通知 SUPER_ADMIN（分布式锁防多实例并发） */
  @Cron(CronExpression.EVERY_HOUR)
  async slaEscalationCron() {
    await this.redis.runExclusive("after_sale_sla_escalation", 3300, async () => {
      try {
        const n = await this.escalateOverdue(new Date());
        if (n > 0) this.logger.log(`售后 SLA 超时升级：${n} 单已通知超管`);
      } catch (err) {
        this.logger.error(`售后 SLA 升级扫描异常: ${(err as Error).message}`);
      }
    });
  }

  /**
   * 升级实现：PENDING 且 createdAt 超 24h → 给全部 SUPER_ADMIN 发站内信。
   * 去重：同一售后单只升级一次（按 Notification targetType=AFTER_SALE_SLA + targetId 判存）。
   */
  async escalateOverdue(now: Date): Promise<number> {
    const deadline = new Date(now.getTime() - AFTER_SALE_SLA_HOURS * HOUR_MS);
    const overdue = await this.prisma.afterSale.findMany({
      where: { status: "PENDING", createdAt: { lt: deadline } },
      select: { id: true, orderId: true, type: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 200, // 单轮上限，防极端积压打爆通知
    });
    if (overdue.length === 0) return 0;

    const sent = await this.prisma.notification.findMany({
      where: { targetType: SLA_ESCALATION_TARGET_TYPE, targetId: { in: overdue.map((o) => o.id) } },
      select: { targetId: true },
    });
    const sentSet = new Set(sent.map((s) => s.targetId));
    const todo = overdue.filter((o) => !sentSet.has(o.id));
    if (todo.length === 0) return 0;

    const admins = await this.prisma.userRole.findMany({
      where: { roleType: "SUPER_ADMIN" },
      select: { userId: true },
    });
    const adminIds = [...new Set(admins.map((a) => a.userId))];
    if (adminIds.length === 0) {
      this.logger.warn("售后 SLA 升级：未找到 SUPER_ADMIN，本轮跳过（未写去重，下轮重试）");
      return 0;
    }

    const typeLabel: Record<string, string> = { refund: "退款", return: "退货", exchange: "换货" };
    const data: Prisma.NotificationCreateManyInput[] = [];
    for (const o of todo) {
      const hours = Math.floor((now.getTime() - o.createdAt.getTime()) / HOUR_MS);
      for (const userId of adminIds) {
        data.push({
          userId,
          type: "SYSTEM",
          title: "投诉工单 SLA 超时升级",
          content: `售后/投诉单（${typeLabel[o.type] || o.type}·订单 ${o.orderId}）已超 ${hours} 小时未首响（承诺 24h 首响），请立即处理。`,
          targetType: SLA_ESCALATION_TARGET_TYPE,
          targetId: o.id,
        });
      }
    }
    await this.prisma.notification.createMany({ data });
    return todo.length;
  }
}
