import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * P2-c 可提现口径（统一结算引擎真源·2026-07-04 用户拍板「零流量窗口直接转正」）
 *
 * 口径定义：某受益主体的引擎净结算额 = sum(LedgerEntry.amount) WHERE status NOT IN (PENDING, FROZEN)。
 * 语义推导（与 reverse() 的冲正对语义严格对齐，勿改成 status='SETTLED'——那会双重扣除冲正）：
 *   - 正常已结算正向：SETTLED 计入 ✓
 *   - 缓冲期内 PENDING / 大额 FROZEN：不计（不可提）✓
 *   - 冲正对：正向被翻为 REVERSED(+X 计入) + 负向补偿 SETTLED(-X 计入) → 净 0 ✓
 *     （无论冲正发生在结算前还是结算后，该凭据净贡献恒为 0）
 *
 * 灰度开关：ConfigSystem key = settlement.ledger_withdrawable.enabled（"true" 启用引擎口径）。
 * 关闭时各调用方走旧口径（UserEarning/Station.totalEarning/Operator.totalEarning），随时可回切。
 */
export const LEDGER_WITHDRAWABLE_FLAG = "settlement.ledger_withdrawable.enabled";

/** 不计入可提现净额的状态（PENDING=缓冲期内，FROZEN=大额待复核） */
const NON_COUNTING_STATUSES = ["PENDING", "FROZEN"];

@Injectable()
export class LedgerBalanceService {
  private readonly logger = new Logger(LedgerBalanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 引擎口径是否已转正（灰度开关） */
  async isAuthoritative(): Promise<boolean> {
    const row = await this.prisma.configSystem.findUnique({
      where: { configKey: LEDGER_WITHDRAWABLE_FLAG },
      select: { configValue: true },
    });
    return row?.configValue === "true";
  }

  /** 受益主体的引擎净结算额（元·可能为 0，不会因冲正为负——凭据级净额恒 ≥0，防御性不钳制以暴露异常） */
  async getNetSettled(beneficiaryType: "USER" | "STATION" | "OPERATOR" | "MERCHANT" | "PLATFORM", beneficiaryId: string): Promise<number> {
    const agg = await this.prisma.ledgerEntry.aggregate({
      where: {
        beneficiaryType,
        beneficiaryId,
        status: { notIn: NON_COUNTING_STATUSES },
      },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  }
}
