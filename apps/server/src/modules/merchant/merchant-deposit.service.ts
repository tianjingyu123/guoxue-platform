import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { MerchantService } from "./merchant.service";
import { PayDepositDto, RefundDepositDto, AdjustDepositDto } from "./merchant.dto";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class MerchantDepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantService: MerchantService,
  ) {}

  async getDepositInfo(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    return {
      depositAmount: Number(merchant.depositAmount ?? 0),
      depositPaid: merchant.depositPaid,
      status: merchant.status,
    };
  }

  /** 发起保证金支付（返回支付记录，实际支付参数由前端调起） */
  async payDeposit(userId: string, dto: PayDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (merchant.status !== "DEPOSIT_PENDING") throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "当前状态不可缴纳保证金");
    if (!merchant.depositAmount || Number(merchant.depositAmount) <= 0) throw new BusinessException(ErrorCode.MERCHANT_DEPOSIT_NOT_PAID, "保证金金额未设置");

    const record = await this.prisma.merchantDepositRecord.create({
      data: {
        merchantId: merchant.id,
        amount: merchant.depositAmount,
        type: "PAYMENT",
        status: "PENDING",
        payMethod: dto.payMethod,
      },
    });

    // 开发/演示环境：模拟第三方支付即时到账，推进状态机至「待签署协议」。
    // 真实微信/支付宝支付接入后，此处改为返回支付参数、由异步支付回调驱动 handleDepositPaid。
    await this.prisma.merchantDepositRecord.update({
      where: { id: record.id },
      data: { status: "SUCCESS", payTransactionId: `SIMULATED-${record.id}` },
    });
    await this.merchantService.handleDepositPaid(merchant.id);

    return {
      depositRecordId: record.id,
      amount: Number(merchant.depositAmount),
      payMethod: dto.payMethod,
      paid: true,
      status: "AGREEMENT_PENDING",
    };
  }

  /** 管理员退还保证金 */
  async refundDeposit(merchantId: string, operatorId: string, dto: RefundDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    // 防自审自批：不得给自己名下的商家退还保证金
    if (merchant.userId === operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的商家退还保证金");

    // 加固(后端审计P1-5)：未缴纳不可退 + 退款额不得超过已缴，防凭空/超额退还。
    // 注：真实退款渠道回款、退还后 depositPaid/状态机回退属流程+架构决策，此处仅补账面防御守卫，未改动。
    const paidAmount = Number(merchant.depositAmount ?? 0);
    if (!merchant.depositPaid || paidAmount <= 0) {
      throw new BusinessException(ErrorCode.MERCHANT_DEPOSIT_NOT_PAID, "该商家未缴纳保证金，无可退还");
    }
    const refundAmount = dto.amount ?? paidAmount;
    if (refundAmount <= 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "退款金额须大于0");
    if (refundAmount > paidAmount + 1e-6) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `退款额 ¥${refundAmount.toFixed(2)} 超过已缴保证金 ¥${paidAmount.toFixed(2)}`,
      );
    }

    return this.prisma.merchantDepositRecord.create({
      data: {
        merchantId,
        amount: refundAmount,
        type: "REFUND",
        status: "SUCCESS",
        remark: dto.remark,
      },
    });
  }

  /** 管理员调整保证金金额 */
  async adjustDeposit(merchantId: string, dto: AdjustDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { depositAmount: dto.amount },
    });
  }

  async listDepositRecords(merchantId: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const [list, total] = await Promise.all([
      this.prisma.merchantDepositRecord.findMany({
        where: { merchantId },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.merchantDepositRecord.count({ where: { merchantId } }),
    ]);
    return { list, total, page, pageSize };
  }
}
