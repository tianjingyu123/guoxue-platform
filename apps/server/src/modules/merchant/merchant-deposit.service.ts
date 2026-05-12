import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MerchantService } from "./merchant.service";
import { PayDepositDto, RefundDepositDto, AdjustDepositDto } from "./merchant.dto";
import { DEPOSIT_OUT_TRADE_NO_PREFIX } from "./merchant.types";

@Injectable()
export class MerchantDepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantService: MerchantService,
  ) {}

  async getDepositInfo(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new NotFoundException("商家不存在");

    return {
      depositAmount: Number(merchant.depositAmount ?? 0),
      depositPaid: merchant.depositPaid,
      status: merchant.status,
    };
  }

  /** 发起保证金支付（返回支付记录，实际支付参数由前端调起） */
  async payDeposit(userId: string, dto: PayDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new NotFoundException("商家不存在");
    if (merchant.status !== "DEPOSIT_PENDING") throw new BadRequestException("当前状态不可缴纳保证金");
    if (!merchant.depositAmount || Number(merchant.depositAmount) <= 0) throw new BadRequestException("保证金金额未设置");

    const record = await this.prisma.merchantDepositRecord.create({
      data: {
        merchantId: merchant.id,
        amount: merchant.depositAmount,
        type: "PAYMENT",
        status: "PENDING",
        payMethod: dto.payMethod,
      },
    });

    return { depositRecordId: record.id, amount: Number(merchant.depositAmount), payMethod: dto.payMethod };
  }

  /** 管理员退还保证金 */
  async refundDeposit(merchantId: string, operatorId: string, dto: RefundDepositDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException("商家不存在");

    const refundAmount = dto.amount ?? Number(merchant.depositAmount ?? 0);

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
    if (!merchant) throw new NotFoundException("商家不存在");

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { depositAmount: dto.amount },
    });
  }

  async listDepositRecords(merchantId: string, page = 1, pageSize = 20) {
    const [list, total] = await Promise.all([
      this.prisma.merchantDepositRecord.findMany({
        where: { merchantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.merchantDepositRecord.count({ where: { merchantId } }),
    ]);
    return { list, total, page, pageSize };
  }
}
