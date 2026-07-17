import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { WechatPayService } from "../shop/wechat-pay.service";
import { SystemService } from "../system/system.service";

/**
 * 自动代付（提现出款）—— 资金架构批次3。
 * 设计见 docs/design/资金与分账架构-设计文档-20260714.md
 *
 * 【分账 ≠ 代付】
 * 分账必须绑定一笔具体交易（transaction_id）；而佣金是「某人本月推广了 37 单，月底累计结算」——
 * 它不对应任何单笔订单，所以只能走代付。这是两个独立的渠道产品。
 *
 * 【三条代付通道各司其职】
 *   微信零钱 → 微信商家转账（只能打零钱、必须要 openid）
 *   支付宝   → 支付宝单笔转账（不需要 openid，直接覆盖存量口径）
 *   银行卡   → 汇付代付（微信「企业付款到银行卡」已下线，支付宝也打不了银行卡，只有汇付能）
 *
 * 【一个会改变产品流程的硬约束】
 * 新版微信商家转账不是无感到账：发起后状态是 WAIT_USER_CONFIRM，用户要在微信里点
 * 「确认收款」，钱才真正到账（超时未确认自动退回）。所以：
 *   绝不能一发起转账就把提现标成 PAID —— 那是「钱没出去却记成出去了」。
 * 正确流程：APPROVED → 发起转账(TRANSFERRING) → 用户确认 → 渠道回调 → PAID
 *
 * 【幂等】payoutRef = 微信 out_bill_no，DB 唯一约束是防重复打款的最后兜底。
 */
@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  /** 允许发起自动代付的状态 —— 必须先经审核 */
  private static readonly PAYABLE_STATUS = "APPROVED";

  constructor(
    private prisma: PrismaService,
    private wechat: WechatPayService,
    private system: SystemService,
  ) {}

  /**
   * 对一笔已审核通过的用户提现发起自动代付。
   * 目前只实现微信零钱（渠道已开通）；支付宝/银行卡走人工兜底，见 unsupportedChannel。
   */
  async autoPayout(applicationId: string, operatorId: string) {
    const app = await this.prisma.withdrawalApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new BusinessException(ErrorCode.NOT_FOUND, "提现申请不存在");
    if (app.status !== PayoutService.PAYABLE_STATUS) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `当前状态 ${app.status} 不可发起打款（须先审核通过）`);
    }
    // 🔴 防自审自批：受益人不得给自己的提现发起代付
    if (app.userId === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的提现发起打款");
    }
    // 🔴 四眼原则（与 finance.confirmWithdrawalPay 同款）：审批人与打款人必须是两个人，
    //    否则单个财务可一手审批一手放款给同伙账户套现。自动代付是真金出款，同样必须拦。
    if (app.reviewedBy && app.reviewedBy === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "审批人不能同时发起打款，需由另一名财务操作");
    }
    // 🔴 风控冻结拦截：用户名下有被冻结资金时暂停出款（冻结语义见 finance.freezeAmount）
    const frozenAgg = await this.prisma.order.aggregate({
      where: { userId: app.userId, frozenAmount: { not: null } },
      _sum: { frozenAmount: true },
    });
    const frozenTotal = Number(frozenAgg._sum.frozenAmount || 0);
    if (frozenTotal > 0) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `该用户有 ¥${frozenTotal.toFixed(2)} 资金处于风控冻结中，冻结期间不可打款`,
      );
    }
    // toUpperCase：存量行是前端直传的小写 'alipay'/'bank'，新行已在 submitWithdraw 统一大写
    if (String(app.payMethod).toUpperCase() !== "WECHAT") {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `${app.payMethod} 暂不支持自动代付，请走人工打款（银行卡待接汇付代付，支付宝待接支付宝转账）`,
      );
    }

    const openid = await this.resolveWechatOpenid(app.userId);
    const amountFen = Math.round(Number(app.actualAmount) * 100);
    if (amountFen <= 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "实际到账金额为 0，无法发起转账");
    }

    // 幂等键：一笔提现只对应一个 out_bill_no。重复发起时微信返回同一笔单，不会重复打款。
    const outBillNo = app.payoutRef || `WD${app.id.replace(/-/g, "").slice(0, 26)}`;

    // CAS 抢占：防两个管理员同时点打款 → 两笔转账
    const claimed = await this.prisma.withdrawalApplication.updateMany({
      where: { id: applicationId, status: PayoutService.PAYABLE_STATUS },
      data: { status: "TRANSFERRING", payoutRef: outBillNo },
    });
    if (claimed.count === 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该提现已在处理中，请刷新后重试");
    }

    try {
      // ≥2000 元微信要求提交收款人真实姓名（加密）
      const userName = amountFen >= 200_000 ? this.extractHolderName(app.accountInfo) : undefined;

      const res = await this.wechat.transferToBalance({
        outBillNo,
        openid,
        amountFen,
        remark: "推广佣金提现",
        userName,
      });

      const updated = await this.prisma.withdrawalApplication.update({
        where: { id: applicationId },
        data: {
          transferBillNo: res.transferBillNo,
          transferState: res.state,
          packageInfo: res.packageInfo,
          // 渠道直接成功（少数场景）才标 PAID；否则维持 TRANSFERRING 等回调。
          // 绝不能因为「接口调用成功」就标 PAID —— 那只代表微信受理了，钱还没到用户手上。
          ...(res.state === "SUCCESS" ? { status: "PAID", packageInfo: null } : {}),
        },
      });

      await this.audit(operatorId, applicationId, `发起微信转账 ${outBillNo}，渠道状态 ${res.state}`);
      this.logger.log(
        `提现自动代付已发起：app=${applicationId} outBillNo=${outBillNo} state=${res.state}` +
          (res.packageInfo ? "（待用户在微信内确认收款）" : ""),
      );

      return {
        status: updated.status,
        transferState: res.state,
        /** 待用户确认收款时非空 —— 用户端凭它调起微信确认页 */
        needUserConfirm: res.state === "WAIT_USER_CONFIRM",
      };
    } catch (e) {
      // 发起失败必须把状态放回 APPROVED，否则永久卡在 TRANSFERRING（既提不了款、额度还被占着）
      await this.prisma.withdrawalApplication.updateMany({
        where: { id: applicationId, status: "TRANSFERRING" },
        data: {
          status: PayoutService.PAYABLE_STATUS,
          transferFailReason: (e as Error).message?.slice(0, 200) ?? "渠道调用异常",
        },
      });
      this.logger.error(`提现自动代付失败：app=${applicationId}`, e as Error);
      throw e;
    }
  }

  /**
   * 提现人查询自己的待确认转账（拿 packageInfo 调起微信确认页）。
   * packageInfo 能唤起转账确认，属敏感凭据 —— 只返回给本人。
   */
  async getMyTransferConfirm(userId: string, applicationId: string) {
    const app = await this.prisma.withdrawalApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new BusinessException(ErrorCode.NOT_FOUND, "提现申请不存在");
    if (app.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "只能查看自己的提现");
    if (app.status !== "TRANSFERRING" || !app.packageInfo) {
      return { needConfirm: false, packageInfo: null, status: app.status };
    }
    return {
      needConfirm: true,
      packageInfo: app.packageInfo,
      status: app.status,
      transferState: app.transferState,
      amount: Number(app.actualAmount),
    };
  }

  /**
   * 渠道转账结果回调 / 主动查询后的状态落地。
   * 只有真正 SUCCESS 才标 PAID —— 钱到用户手上了，这笔提现才算完成。
   */
  async syncTransferState(outBillNo: string) {
    const app = await this.prisma.withdrawalApplication.findUnique({ where: { payoutRef: outBillNo } });
    if (!app) {
      this.logger.warn(`转账状态同步：找不到 payoutRef=${outBillNo} 的提现申请`);
      return null;
    }
    if (app.status === "PAID") return app; // 幂等

    const res = await this.wechat.queryTransferByOutBillNo(outBillNo);

    if (res.state === "SUCCESS") {
      const done = await this.prisma.withdrawalApplication.updateMany({
        where: { id: app.id, status: "TRANSFERRING" },
        data: { status: "PAID", transferState: res.state, packageInfo: null },
      });
      if (done.count > 0) this.logger.log(`提现已到账：app=${app.id} outBillNo=${outBillNo}`);
      return this.prisma.withdrawalApplication.findUnique({ where: { id: app.id } });
    }

    // 失败/撤销：放回 APPROVED 可重新打款；额度随之释放，用户的钱没丢
    if (["FAIL", "CANCELLED", "CLOSED"].includes(res.state)) {
      await this.prisma.withdrawalApplication.updateMany({
        where: { id: app.id, status: "TRANSFERRING" },
        data: {
          status: PayoutService.PAYABLE_STATUS,
          transferState: res.state,
          packageInfo: null,
          transferFailReason: res.failReason || res.state,
        },
      });
      this.logger.warn(`提现转账失败/撤销：app=${app.id} state=${res.state} reason=${res.failReason}`);
      return this.prisma.withdrawalApplication.findUnique({ where: { id: app.id } });
    }

    // 仍在途（WAIT_USER_CONFIRM / PROCESSING / TRANSFERING）：只更新渠道状态，不动业务状态
    await this.prisma.withdrawalApplication.update({
      where: { id: app.id },
      data: { transferState: res.state },
    });
    return this.prisma.withdrawalApplication.findUnique({ where: { id: app.id } });
  }

  /**
   * 取提现人的微信 openid。
   * ⚠️ 微信商家转账要求 openid 属于【本商户号绑定的 appid】。Auth.openId 存的是登录时的 openid，
   *    若登录用的 appid 与支付商户号绑定的 appid 不是同一个，这里拿到的 openid 转账会被拒。
   *    接入沙箱时必须实测确认（这是最容易踩的坑）。
   */
  private async resolveWechatOpenid(userId: string): Promise<string> {
    const auth = await this.prisma.auth.findFirst({
      where: { userId, provider: "WECHAT", openId: { not: null } },
      select: { openId: true },
    });
    if (!auth?.openId) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "该用户未绑定微信，无法转账到零钱。请改用其他收款方式或引导用户绑定微信。",
      );
    }
    return auth.openId;
  }

  /** 从 accountInfo 里取收款人姓名（≥2000 元微信要求提交，用于姓名校验） */
  private extractHolderName(accountInfo: unknown): string | undefined {
    if (!accountInfo || typeof accountInfo !== "object") return undefined;
    const info = accountInfo as Record<string, unknown>;
    const name = info.name ?? info.holder ?? info.bankHolder ?? info.realName;
    return typeof name === "string" && name.trim() ? name.trim() : undefined;
  }

  private async audit(operatorId: string, targetId: string, action: string) {
    try {
      await this.system?.logAudit?.({
        userId: operatorId,
        action,
        targetType: "WITHDRAWAL_PAYOUT",
        targetId,
      } as never);
    } catch (e) {
      this.logger.warn("代付审计留痕失败", e as Error);
    }
  }
}
