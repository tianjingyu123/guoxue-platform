import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { SystemService } from "../system/system.service";
import { MERCHANT_CONFIG_KEYS } from "./merchant.types";
import { PaginationDto, SetCommissionRateDto } from "./merchant.dto";

@Injectable()
export class MerchantSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemService: SystemService,
  ) {}

  /** 商家收入概览 */
  async getRevenueOverview(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const salesAgg = await this.prisma.order.aggregate({
      where: { merchantId, status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
      _sum: { amount: true },
      _count: true,
    });

    const totalSales = Number(salesAgg._sum.amount ?? 0);
    const commissionRate = Number(merchant.commissionRate ?? 0.85);
    const merchantShare = totalSales * commissionRate;
    const platformShare = totalSales - merchantShare;

    return {
      totalSales: Math.round(totalSales * 100) / 100,
      totalOrders: salesAgg._count,
      merchantShare: Math.round(merchantShare * 100) / 100,
      platformShare: Math.round(platformShare * 100) / 100,
      commissionRate,
    };
  }

  /** 结算计算 */
  async calculateCommission(orderAmount: number, merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const cfg = await this.systemService.getConfig(MERCHANT_CONFIG_KEYS.COMMISSION_RATE);
    const defaultRate = cfg ? parseFloat(cfg.configValue) : 0.85;
    const merchantRate = Number(merchant.commissionRate ?? defaultRate);
    const platformRate = 1 - merchantRate;

    return {
      merchantShare: Math.round(orderAmount * merchantRate * 100) / 100,
      platformShare: Math.round(orderAmount * platformRate * 100) / 100,
      merchantRate,
      platformRate,
    };
  }

  async listSettlements(merchantId: string, query: PaginationDto) {
    const { page = 1, pageSize = 20 } = query;
    return { list: [], total: 0, page, pageSize };
  }

  /** 管理员设置分佣比例 */
  async setCommissionRate(merchantId: string, dto: SetCommissionRateDto) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { commissionRate: dto.rate },
    });
  }
}
