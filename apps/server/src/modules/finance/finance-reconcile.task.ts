import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { FinanceService } from "./finance.service";

/**
 * 渠道对账定时任务（第一波·仅微信；支付宝/汇付多渠道为第三波）。
 *
 * 背景：triggerReconciliation 逻辑扎实但 finance 模块此前 @Cron 数=0（从没自动跑过）。
 * 本任务照 SettlementReconcileService 范式补齐：
 *   ① 每日 03:00 自动对账前一日(T-1)微信账单（渠道账单次日才出）。
 *   ② 差异(MISMATCHED)/账单缺失(PENDING)/异常时告警超管+财务（Notification）。
 *   ③ 幂等：同一天已生成终态(MATCHED/MISMATCHED)记录则跳过，重复跑不重复生成。
 *   ④ 分布式锁：多实例只有一个执行，绝不并发生成重复对账单。
 */
@Injectable()
export class FinanceReconcileTask {
  private readonly logger = new Logger(FinanceReconcileTask.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private finance: FinanceService,
  ) {}

  @Cron("0 3 * * *")
  async reconcileWechatDaily() {
    await this.redis.runExclusive(
      "finance_reconcile_wechat_daily",
      3600,
      async () => {
        // T-1 日（渠道账单次日出）
        const d = new Date(Date.now() - 86_400_000);
        const y = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const billDate = `${y}-${mm}-${dd}`;
        // triggerReconciliation 单日模式将 billDate 记为本地日零点，故用相同口径查幂等
        const dayStart = new Date(y, d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart.getTime() + 86_400_000);

        // 幂等：已有该日终态对账单则跳过（PENDING=当时账单不可用，允许后续重试补跑）
        const existing = await this.prisma.reconciliationRecord.findFirst({
          where: {
            source: "WECHAT",
            billDate: { gte: dayStart, lt: dayEnd },
            status: { in: ["MATCHED", "MISMATCHED"] },
          },
          select: { id: true, status: true },
        });
        if (existing) {
          this.logger.log(`微信对账跳过（${billDate} 已有 ${existing.status} 记录 ${existing.id}）`);
          return;
        }

        try {
          const record = await this.finance.triggerReconciliation({ source: "WECHAT", billDate });
          if (record.status === "MISMATCHED") {
            // 真差异（钱对不上）→ 必告警超管/财务，这是要人立即处理的
            await this.notifyAdmins(billDate, record.status, record.diffCount);
            this.logger.error(`⚠️ 微信对账 ${billDate} 差异=${record.diffCount}，已告警超管/财务`);
          } else if (record.status === "PENDING") {
            // 账单不可用（微信支付未装配/账单未出/渠道延迟）→ 仅告警日志，不发 Notification
            // 避免"配置缺失/账单延迟"每日刷屏打扰超管财务；PENDING 允许次日 cron 补跑重试。
            this.logger.warn(`微信对账 ${billDate} 账单不可用（PENDING），待次日补跑；如持续请运维查微信支付配置`);
          } else {
            this.logger.log(`微信对账 ${billDate} 通过（MATCHED，${record.diffCount} 差异）`);
          }
        } catch (e) {
          this.logger.error(`微信对账执行失败 ${billDate}`, e as Error);
          await this.notifyAdmins(billDate, "ERROR", 0).catch(() => undefined);
        }
      },
      { critical: true },
    );
  }

  /** 差异/账单缺失/异常告警超管+财务（照 SettlementReconcile.notifyAdmins 范式，失败仅记日志） */
  private async notifyAdmins(billDate: string, status: string, diffCount: number) {
    try {
      const admins = await this.prisma.userRole.findMany({
        where: { roleType: { in: ["SUPER_ADMIN", "FINANCE_ADMIN"] } },
        select: { userId: true },
        take: 10,
      });
      if (admins.length === 0) return;
      const reason =
        status === "MISMATCHED"
          ? `发现 ${diffCount} 笔对账差异`
          : status === "PENDING"
            ? "渠道账单不可用（未下全/缺单/未装配微信支付）"
            : "对账执行异常";
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.userId,
          type: "SYSTEM",
          title: "微信对账告警",
          content: `${billDate} 微信支付对账${reason}（状态 ${status}），请在财务对账中心核对处理。`,
          targetType: "FINANCE_RECONCILE",
          targetId: billDate,
        })),
      });
    } catch (e) {
      this.logger.warn("微信对账告警通知发送失败", e as Error);
    }
  }
}
