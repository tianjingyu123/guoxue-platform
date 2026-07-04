import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * 事后冻结的 reason 前缀标记（冻结来源）。
 *
 * 模型定夺说明：LedgerEntry 无 meta/note Json 字段，唯一可写的标记位是
 * reason String?（schema 注释即"冻结/冲结原因"）。settle() 创建的 PENDING 行
 * reason 恒为 null，大额审批冻结行 reason = "单笔≥X元，冻结待人工复核"，
 * 因此用本前缀标记"事后冻结"来源可与大额审批冻结严格区分：
 * - unfreeze 只解本接口冻结的行（reason startsWith 本前缀），**不会误解大额审批冻结行**；
 * - unfreeze 将 reason 还原为 null，与 settle() 产出的 PENDING 原始状态一致。
 */
export const FREEZE_REASON_PREFIX = "[RISK_FREEZE]";

/** 可事后冻结的受益主体类型（PLATFORM 留存无冻结语义，不开放） */
export type FreezeBeneficiaryType = "USER" | "STATION" | "OPERATOR" | "MERCHANT";

/**
 * 结算引擎·事后冻结（商-P1 分销风控缺口补齐）
 *
 * 定位：settle() 的 L4 大额冻结是"入账时"冻结；本服务补"入账后"按受益人整体冻结——
 * 风控触发（互刷/秒下单等）后冻结该受益人全部待结算佣金，防止缓冲期到期被
 * settlePending 自动转 SETTLED 计入可提现（P2-c 口径 FROZEN 不计可提现，冻结即扣）。
 *
 * 红线约束（与主引擎五铁律兼容性）：
 * - 只翻状态不改金额不删行；
 * - **不动已 SETTLED**（已结算追回属另一层，不在本接口范围）；
 * - 对 reverse() 冲正零影响：reverse 按 refType/refId + amount>0 + status≠REVERSED
 *   选行，不假设 PENDING，FROZEN 行照常冲正（正向翻 REVERSED + 负向 SETTLED 补偿，净 0）；
 * - settlePending 只动 PENDING，FROZEN 行不会被批处理转正；
 * - 幂等：重复冻结第二次 updateMany count=0，不报错返回行数。
 */
@Injectable()
export class SettlementFreezeService {
  private readonly logger = new Logger(SettlementFreezeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 按受益人事后冻结：该受益人全部 PENDING 台账行 CAS 批量翻 FROZEN。
   * CAS = updateMany where status=PENDING（条件更新，并发下同一行只会被翻一次；
   * 与 settlePending 并发时先到先得，已 SETTLED 的行不受影响——不动已结算）。
   */
  async freezeBeneficiary(
    beneficiaryType: FreezeBeneficiaryType,
    beneficiaryId: string,
    reason: string,
    operatorId: string,
  ): Promise<{ frozen: number }> {
    this.assertParams(beneficiaryType, beneficiaryId, reason);

    const res = await this.prisma.ledgerEntry.updateMany({
      where: { beneficiaryType, beneficiaryId, status: "PENDING" },
      data: { status: "FROZEN", reason: `${FREEZE_REASON_PREFIX} ${reason.trim()}` },
    });

    await this.audit("settlement.freeze", beneficiaryType, beneficiaryId, operatorId, {
      frozen: res.count,
      reason: reason.trim(),
    });
    this.logger.warn(
      `事后冻结：${beneficiaryType}:${beneficiaryId} PENDING→FROZEN ${res.count} 行（${reason.trim()}·操作者 ${operatorId}）`,
    );
    return { frozen: res.count };
  }

  /**
   * 解冻：仅解本接口冻结的行（reason 带 FREEZE_REASON_PREFIX 标记）FROZEN→PENDING，
   * reason 还原 null。**大额审批冻结行（settle L4 产生）不在解冻范围**，仍走人工复核。
   * 注意：解冻后行回到 PENDING，若 availableAt 已过期会被下一轮 settlePending 转 SETTLED（正常语义）。
   */
  async unfreezeBeneficiary(
    beneficiaryType: FreezeBeneficiaryType,
    beneficiaryId: string,
    reason: string,
    operatorId: string,
  ): Promise<{ unfrozen: number }> {
    this.assertParams(beneficiaryType, beneficiaryId, reason);

    const res = await this.prisma.ledgerEntry.updateMany({
      where: {
        beneficiaryType,
        beneficiaryId,
        status: "FROZEN",
        reason: { startsWith: FREEZE_REASON_PREFIX },
      },
      data: { status: "PENDING", reason: null },
    });

    await this.audit("settlement.unfreeze", beneficiaryType, beneficiaryId, operatorId, {
      unfrozen: res.count,
      reason: reason.trim(),
    });
    this.logger.log(
      `解冻：${beneficiaryType}:${beneficiaryId} FROZEN→PENDING ${res.count} 行（${reason.trim()}·操作者 ${operatorId}·大额审批冻结行不含在内）`,
    );
    return { unfrozen: res.count };
  }

  private assertParams(beneficiaryType: string, beneficiaryId: string, reason: string): void {
    const allowed: string[] = ["USER", "STATION", "OPERATOR", "MERCHANT"];
    if (!allowed.includes(beneficiaryType)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `不支持的受益主体类型：${beneficiaryType}`);
    }
    if (!beneficiaryId?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "受益主体 ID 不能为空");
    }
    if (!reason?.trim()) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "冻结/解冻必须提供原因（资金操作审计要求）");
    }
  }

  /** 资金敏感操作审计（audit.service 同款直接写 AuditLog 行·detail 为 JSON 字符串） */
  private async audit(
    action: string,
    beneficiaryType: string,
    beneficiaryId: string,
    operatorId: string,
    detail: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: operatorId,
        executor: operatorId,
        action,
        targetType: "LEDGER_BENEFICIARY",
        targetId: `${beneficiaryType}:${beneficiaryId}`,
        detail: JSON.stringify(detail),
      },
    });
  }
}
