import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { PayDepositDto, RefundDepositDto, AdjustDepositDto } from "./merchant.dto";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

@Injectable()
export class MerchantDepositService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepositInfo(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const depositAmount = Number(merchant.depositAmount ?? 0);
    return {
      depositAmount,
      depositPaid: depositAmount > 0 && (await this.hasVerifiedPayment(merchant.id, depositAmount)),
      status: merchant.status,
      waived: depositAmount <= 0,
      collectionAvailable: false,
      refundAvailable: false,
    };
  }

  /** 保证金在线收款尚未接入真实支付渠道：必须拒绝，不能伪造成功流水。 */
  async payDeposit(userId: string, _dto: PayDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const amount = Number(merchant.depositAmount ?? 0);
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      amount <= 0
        ? "当前实行免保证金入驻，无需支付，请继续签署协议"
        : "保证金在线收款尚未开放，请联系平台客服处理",
    );
  }

  /** 退款渠道未接入前拒绝写入 SUCCESS，避免账面退款与真实出款脱节。 */
  async refundDeposit(merchantId: string, operatorId: string, dto: RefundDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (merchant.userId === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的商家退还保证金");
    }

    void dto;
    throw new BusinessException(
      ErrorCode.BAD_REQUEST,
      "保证金原路退还渠道尚未接入，已阻止账面退款；请先完成真实财务出款流程",
    );
  }

  /** 当前免保证金，仅允许把未缴的零金额遗留状态推进到待签约。 */
  async adjustDeposit(merchantId: string, dto: AdjustDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");
    if (dto.amount > 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "当前实行免保证金政策，不可设置正金额");
    }
    if (merchant.depositPaid || Number(merchant.depositAmount ?? 0) > 0) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该商家存在保证金账面余额，不可直接调额");
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        depositAmount: 0,
        depositPaid: false,
        ...(merchant.status === "DEPOSIT_PENDING" ? { status: "AGREEMENT_PENDING" } : {}),
      },
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

  private async hasVerifiedPayment(merchantId: string, expectedAmount: number): Promise<boolean> {
    const record = await this.prisma.merchantDepositRecord.findFirst({
      where: { merchantId, type: "PAYMENT", status: "SUCCESS", payTransactionId: { not: null } },
      select: { payTransactionId: true, amount: true },
      orderBy: { createdAt: "desc" },
    });
    return !!record?.payTransactionId
      && !record.payTransactionId.startsWith("SIMULATED-")
      && Number(record.amount) + 1e-6 >= expectedAmount;
  }
}
