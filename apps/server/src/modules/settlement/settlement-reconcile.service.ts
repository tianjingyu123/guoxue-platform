import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SettlementService } from "./settlement.service";

/** 金额比对容差（元）：分账按分规整，差额超过 1 分即视为错账 */
const TOLERANCE = 0.01;
/** 对账回看窗口（天）：覆盖双写订单的近期全量 */
const RECONCILE_WINDOW_DAYS = 3;

/**
 * 统一结算引擎 — 结算与对账定时任务（T1「每一分钱可解释」的守门员）
 * ① 每小时：过缓冲期的 PENDING 分账批量置为 SETTLED
 * ② 每日 2AM：影子双写对账 —— 逐订单核对统一总账(LedgerEntry) 与实付明细
 *    (StationEarning/OperatorEarning) 的净额一致性，差额超容差即告警（日志 + 通知超管）。
 *    对账连续干净是 P2-c 切换可提现口径的前置条件。
 */
@Injectable()
export class SettlementReconcileService {
  private readonly logger = new Logger(SettlementReconcileService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private settlement: SettlementService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async settlePendingHourly() {
    // 多实例分布式锁：结算批处理涉及资金入账，绝不能两实例并发跑同批 PENDING（重复结算）
    await this.redis.runExclusive("settle_pending_hourly", 3600, async () => {
      try {
        await this.settlement.settlePending();
      } catch (e) {
        this.logger.error("结算批处理失败", e as Error);
      }
    }, { critical: true });
  }

  @Cron("0 2 * * *")
  async reconcileDaily() {
    await this.redis.runExclusive("settle_reconcile_daily", 3600, async () => {
    try {
      const result = await this.reconcileOrders(RECONCILE_WINDOW_DAYS);
      if (result.mismatched.length > 0) {
        this.logger.error(
          `⚠️ 结算对账发现 ${result.mismatched.length}/${result.checked} 笔差异：` +
            result.mismatched.slice(0, 10).map((m) => `${m.refId}(${m.role} 总账${m.ledger}≠实付${m.legacy})`).join("；"),
        );
        await this.notifyAdmins(result.mismatched.length, result.checked);
      } else {
        this.logger.log(`结算对账通过：${result.checked} 笔订单总账与实付一致`);
      }
    } catch (e) {
      this.logger.error("结算对账执行失败", e as Error);
    }
    });
  }

  /**
   * 逐订单对账：以统一总账中出现过的订单为对象（天然只覆盖双写订单），
   * 核对 STATION/OPERATOR 角色的净额（含冲正负项）与旧明细表净额一致。
   */
  async reconcileOrders(days = RECONCILE_WINDOW_DAYS) {
    const since = new Date(Date.now() - days * 86_400_000);

    const ledgerRows = await this.prisma.ledgerEntry.groupBy({
      by: ["refId", "role"],
      where: { refType: "ORDER", role: { in: ["STATION", "OPERATOR"] }, createdAt: { gte: since } },
      _sum: { amount: true },
    });
    const refIds = [...new Set(ledgerRows.map((r) => r.refId))];
    if (refIds.length === 0) return { checked: 0, mismatched: [] as MismatchItem[] };

    const [stationRows, operatorRows] = await Promise.all([
      this.prisma.stationEarning.groupBy({
        by: ["orderId"],
        where: { orderId: { in: refIds } },
        _sum: { earned: true },
      }),
      this.prisma.operatorEarning.groupBy({
        by: ["orderId"],
        where: { orderId: { in: refIds } },
        _sum: { earned: true },
      }),
    ]);
    const legacyStation = new Map(stationRows.map((r) => [r.orderId, Number(r._sum.earned || 0)]));
    const legacyOperator = new Map(operatorRows.map((r) => [r.orderId, Number(r._sum.earned || 0)]));

    const mismatched: MismatchItem[] = [];
    for (const row of ledgerRows) {
      const ledger = Number(row._sum.amount || 0);
      const legacy = (row.role === "STATION" ? legacyStation : legacyOperator).get(row.refId) ?? 0;
      if (Math.abs(ledger - legacy) > TOLERANCE) {
        mismatched.push({ refId: row.refId, role: row.role, ledger, legacy });
      }
    }
    return { checked: refIds.length, mismatched };
  }

  /** 错账通知超管（失败仅记日志） */
  private async notifyAdmins(mismatchCount: number, checkedCount: number) {
    try {
      const admins = await this.prisma.userRole.findMany({
        where: { roleType: { in: ["SUPER_ADMIN", "FINANCE_ADMIN"] } },
        select: { userId: true },
        take: 10,
      });
      if (admins.length === 0) return;
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.userId,
          type: "SYSTEM",
          title: "结算对账告警",
          content: `每日结算对账发现 ${mismatchCount}/${checkedCount} 笔总账与实付差异，请查看服务端日志（SettlementReconcile）核对处理。`,
          targetType: "SETTLEMENT_RECONCILE",
          targetId: new Date().toISOString().slice(0, 10),
        })),
      });
    } catch (e) {
      this.logger.warn("对账告警通知发送失败", e as Error);
    }
  }
}

interface MismatchItem {
  refId: string;
  role: string;
  ledger: number;
  legacy: number;
}
