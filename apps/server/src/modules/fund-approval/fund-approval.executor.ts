import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { FundApprovalService } from "./fund-approval.service";
import { InstituteService } from "../institute/institute.service";
import { HuifuService } from "../huifu/huifu.service";
import { CoinService } from "../coin/coin.service";
import { CommissionService } from "../commission/commission.service";

/**
 * 资金审批执行器：审批通过时按 type 调用对应模块的「真实执行方法」。
 * 通过 FundApprovalService.claim 的原子状态流转做防重；执行失败回滚为 PENDING。
 * 各执行方法本身已自带事务/幂等（recharge 交互式事务、reverseCommission 同事务等）。
 */
@Injectable()
export class FundApprovalExecutor {
  private readonly logger = new Logger(FundApprovalExecutor.name);

  constructor(
    private approvals: FundApprovalService,
    private institute: InstituteService,
    private huifu: HuifuService,
    private coin: CoinService,
    private commission: CommissionService,
  ) {}

  /** 审批：approve=true → 认领并执行；approve=false → 标记 REJECTED */
  async review(id: string, approve: boolean, note: string | undefined, reviewerId: string) {
    const approval = await this.approvals.findById(id);
    if (approval.status !== "PENDING") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该审批单已处理");
    }

    // 职责分离（防自审自批）：不得审批自己发起的资金操作，否则单人可发起+批准=凭空造币/套现
    if (approval.requestedBy && approval.requestedBy === reviewerId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己发起的资金操作，请由其他审批人处理");
    }

    if (!approve) {
      const ok = await this.approvals.claim(id, "REJECTED", reviewerId, note);
      if (!ok) throw new BusinessException(ErrorCode.BAD_REQUEST, "该审批单已处理");
      return { approved: false, status: "REJECTED", message: "已拒绝" };
    }

    // 原子认领，确保同一审批单只被执行一次
    const claimed = await this.approvals.claim(id, "APPROVED", reviewerId, note);
    if (!claimed) throw new BusinessException(ErrorCode.BAD_REQUEST, "该审批单已处理");

    try {
      const result = await this.execute(approval);
      return { approved: true, status: "APPROVED", message: "已审批通过并执行", result };
    } catch (err) {
      // 执行失败 → 审批单回滚为待审，避免"已通过但未到账"的资金空档
      await this.approvals.revertToPending(id);
      this.logger.error(`资金审批执行失败 id=${id} type=${approval.type}`, (err as Error).message);
      throw err;
    }
  }

  private execute(approval: { type: string; requestedBy: string; payload: any }) {
    const p = approval.payload || {};
    switch (approval.type) {
      case "DIVIDEND":
        // requestedBy 为发起的研究院管理层；createDividend 内部会再次校验管理层身份
        return this.institute.createDividend(approval.requestedBy, p);
      case "RECHARGE":
        return this.coin.recharge(p.userId, {
          amountCoin: p.amountCoin,
          description: p.description,
        });
      case "COMMISSION_CONFIG":
        if (p.method === "updateCommissionConfig") {
          return this.commission.updateCommissionConfig(p.type, p.rate);
        }
        return this.commission.updateConfig(p.key, p.dto ?? {});
      case "REFUND":
        return this.huifu.createRefund(p);
      default:
        throw new BusinessException(ErrorCode.BAD_REQUEST, `未知审批类型: ${approval.type}`);
    }
  }
}
