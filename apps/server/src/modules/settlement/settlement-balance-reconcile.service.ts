import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** 金额比对容差（元）：分账按分规整，差额超过 1 分即视为缺口 */
const TOLERANCE = 0.01;

/**
 * 余额级对账 —— 引擎口径转正（settlement.ledger_withdrawable.enabled=true）的红绿灯。
 *
 * 【为什么不能复用 SettlementReconcileService.reconcileOrders】
 * 那个是「逐订单」对账，且以 LedgerEntry 中出现过的订单为对象（其注释自道：「天然只覆盖双写订单」）。
 * 它检查的是「双写订单两边一不一致」，结构上永远查不出「旧口径有、总账没有」的钱 ——
 * 而那恰恰是转正的致命处：LedgerEntry 从影子双写上线那天才开始记，
 * Station.totalEarning / UserEarning 却是历史累计。开关一开，双写上线前挣的钱全部归零。
 *
 * 本服务改为「逐受益主体」对账，直接回答那个唯一重要的问题：
 *
 *     如果现在打开开关，每个人的可提现余额会凭空变动多少？
 *
 * 【口径说明】
 * - legacy      旧口径余额（提现实际读的值：Station.totalEarning / Operator.totalEarning / UserEarning 汇总）
 * - ledgerTotal 总账全量净额（不分状态）——「钱有没有落进总账」
 * - ledgerAvail 总账可提现净额（status NOT IN PENDING/FROZEN）——「转正后此刻能提多少」
 * - gap = legacy − ledgerTotal
 *     gap > 0 → 转正后此人少这么多钱（落账缺口，必须回填后才能转正）
 *     gap < 0 → 转正后此人多这么多钱（总账多记，必须查明）
 *
 * ledgerTotal 与 ledgerAvail 的差是结算缓冲期（bufferDays）内的 PENDING，属设计内差异，不是缺口。
 * 判断能否转正只看 gap。
 *
 * 只读，无副作用，可在生产安全执行。
 */
@Injectable()
export class SettlementBalanceReconcileService {
  private readonly logger = new Logger(SettlementBalanceReconcileService.name);

  constructor(private prisma: PrismaService) {}

  /** 逐主体对账全量报告（STATION / OPERATOR / USER 三条口径切换线） */
  async reconcileBalances(): Promise<BalanceReconcileReport> {
    const [station, operator, user] = await Promise.all([
      this.reconcileStations(),
      this.reconcileOperators(),
      this.reconcileUsers(),
    ]);

    const all = [...station, ...operator, ...user];
    const gapped = all.filter((r) => Math.abs(r.gap) > TOLERANCE);
    const report: BalanceReconcileReport = {
      canSwitch: gapped.length === 0,
      checked: all.length,
      gappedCount: gapped.length,
      totalGap: round2(gapped.reduce((s, r) => s + r.gap, 0)),
      station,
      operator,
      user,
    };

    if (report.canSwitch) {
      this.logger.log(`余额对账通过：${report.checked} 个受益主体，旧口径与总账全量净额一致，可转正`);
    } else {
      this.logger.warn(
        `⚠️ 余额对账未通过：${report.gappedCount}/${report.checked} 个主体存在缺口，合计 ${report.totalGap} 元。` +
          `此时打开 ledger_withdrawable 开关会直接改变这些人的可提现余额。`,
      );
    }
    return report;
  }

  /** 分站站长：Station.totalEarning（提现读这个）vs LedgerEntry(STATION) */
  private async reconcileStations(): Promise<BalanceRow[]> {
    const [stations, ledger] = await Promise.all([
      this.prisma.station.findMany({ select: { id: true, userId: true, totalEarning: true } }),
      this.groupLedger("STATION"),
    ]);
    return stations.map((s) =>
      this.toRow("STATION", s.id, s.userId, Number(s.totalEarning ?? 0), ledger),
    );
  }

  /** 运营商：Operator.totalEarning vs LedgerEntry(OPERATOR) */
  private async reconcileOperators(): Promise<BalanceRow[]> {
    const [operators, ledger] = await Promise.all([
      this.prisma.operator.findMany({ select: { id: true, userId: true, totalEarning: true } }),
      this.groupLedger("OPERATOR"),
    ]);
    return operators.map((o) =>
      this.toRow("OPERATOR", o.id, o.userId, Number(o.totalEarning ?? 0), ledger),
    );
  }

  /**
   * 达人/主播/圈主：UserEarning 汇总（提现读这个）vs LedgerEntry(USER)。
   * 注意 USER 侧总账有两个来源：本批新接的达人/主播场景（QUESTION/PEEK/LIVE_GIFT/AUDIO_CALL/CONSULT_CALL），
   * 以及圈主/驿站主渠道佣金（commission.recordChannelBeneficiaryCommission，只落总账、无 UserEarning 记录）。
   * 后者会让 gap 为负 —— 那不是错账，是「这笔钱在旧口径下本来就取不出来」，转正正是为了解开它。
   */
  private async reconcileUsers(): Promise<BalanceRow[]> {
    const [earnRows, ledger] = await Promise.all([
      this.prisma.userEarning.groupBy({ by: ["userId"], _sum: { amountRmb: true } }),
      this.groupLedger("USER"),
    ]);

    // 并集：旧口径有的 + 总账有的（只在总账里的用户 = 圈主/驿站主渠道佣金）
    const userIds = new Set<string>([...earnRows.map((r) => r.userId), ...ledger.total.keys()]);
    const legacyMap = new Map(earnRows.map((r) => [r.userId, Number(r._sum.amountRmb ?? 0)]));

    return [...userIds].map((uid) =>
      this.toRow("USER", uid, uid, legacyMap.get(uid) ?? 0, ledger),
    );
  }

  /** 按受益主体聚合总账：全量净额 + 可提现净额 */
  private async groupLedger(beneficiaryType: string): Promise<LedgerAgg> {
    const [totalRows, availRows] = await Promise.all([
      this.prisma.ledgerEntry.groupBy({
        by: ["beneficiaryId"],
        where: { beneficiaryType },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.groupBy({
        by: ["beneficiaryId"],
        where: { beneficiaryType, status: { notIn: ["PENDING", "FROZEN"] } },
        _sum: { amount: true },
      }),
    ]);
    return {
      total: new Map(totalRows.map((r) => [r.beneficiaryId, Number(r._sum.amount ?? 0)])),
      avail: new Map(availRows.map((r) => [r.beneficiaryId, Number(r._sum.amount ?? 0)])),
    };
  }

  private toRow(
    type: string,
    beneficiaryId: string,
    userId: string,
    legacy: number,
    ledger: LedgerAgg,
  ): BalanceRow {
    const ledgerTotal = ledger.total.get(beneficiaryId) ?? 0;
    const ledgerAvail = ledger.avail.get(beneficiaryId) ?? 0;
    return {
      beneficiaryType: type,
      beneficiaryId,
      userId,
      legacy: round2(legacy),
      ledgerTotal: round2(ledgerTotal),
      ledgerAvail: round2(ledgerAvail),
      gap: round2(legacy - ledgerTotal),
    };
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface LedgerAgg {
  total: Map<string, number>;
  avail: Map<string, number>;
}

export interface BalanceRow {
  beneficiaryType: string;
  beneficiaryId: string;
  userId: string;
  /** 旧口径余额（提现实际读的值） */
  legacy: number;
  /** 总账全量净额（不分状态） */
  ledgerTotal: number;
  /** 总账可提现净额（排除 PENDING/FROZEN） */
  ledgerAvail: number;
  /** legacy − ledgerTotal：转正后该主体余额的凭空变动额 */
  gap: number;
}

export interface BalanceReconcileReport {
  /** 全部主体 gap 均在容差内 —— 唯一的转正放行条件 */
  canSwitch: boolean;
  checked: number;
  gappedCount: number;
  totalGap: number;
  station: BalanceRow[];
  operator: BalanceRow[];
  user: BalanceRow[];
}
