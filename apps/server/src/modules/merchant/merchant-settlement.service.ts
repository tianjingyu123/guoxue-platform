import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SystemService } from "../system/system.service";
import { MERCHANT_CONFIG_KEYS } from "./merchant.types";
import { MERCHANT_GRADE_BENEFITS, type CreditGrade } from "./merchant-credit.service";
import {
  SetCommissionRateDto,
  GenerateSettlementDto,
  SettlementListQueryDto,
  PaySettlementDto,
} from "./merchant.dto";

@Injectable()
export class MerchantSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemService: SystemService,
    private readonly redis: RedisService,
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

  /** 生成结算单：将一个周期内的已完成订单聚合为一条结算记录 */
  async generateSettlement(merchantId: string, dto: GenerateSettlementDto) {
    // 串行化同商家的结算单生成：防并发 TOCTOU(findFirst 查重与 create 之间无原子性)生成重复结算单
    const lockKey = `settlement:gen:${merchantId}`;
    if (!(await this.redis.setNX(lockKey, "1", 15))) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "结算单生成处理中，请稍后再试");
    }
    try {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new BusinessException(ErrorCode.MERCHANT_NOT_FOUND, "商家不存在");

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // 结算周期按信用等级（履-P2 权益挂钩·设计§三）：A 级 T+3 / B·C 级 T+7 / D 级 T+14。
    // T+N 语义 = 周期结束日须早于 now-N 天，订单沉淀 N 天（覆盖退款窗口）后才可入结算单；A 级商家回款提速。
    const grade: CreditGrade = (merchant.creditGrade as CreditGrade) in MERCHANT_GRADE_BENEFITS
      ? (merchant.creditGrade as CreditGrade)
      : "B";
    const cycleDays = MERCHANT_GRADE_BENEFITS[grade].settlementCycleDays;
    if (periodEnd.getTime() > Date.now() - cycleDays * 86_400_000) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `按商家信用等级 ${grade}，结算周期为 T+${cycleDays}：结算周期结束日须早于 ${cycleDays} 天前`,
      );
    }

    // 检查是否有重叠的结算单
    const existing = await this.prisma.merchantSettlement.findFirst({
      where: {
        merchantId,
        status: { not: "CANCELLED" },
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
    });
    if (existing) {
      throw new BusinessException(ErrorCode.MERCHANT_ALREADY_EXISTS, "该时间段内已存在结算单，请勿重复生成");
    }

    // 聚合该周期内已完成订单
    const orderAgg = await this.prisma.order.aggregate({
      where: {
        merchantId,
        status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
      _count: true,
    });

    // 用「分」为单位做整数运算，避免浮点尾数与截整丢分
    const totalCents = Math.round(Number(orderAgg._sum.amount ?? 0) * 100);
    if (totalCents === 0) {
      throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "该时间段内无可结算订单");
    }
    const totalRevenue = totalCents / 100;

    // commissionRate 存储的是商家分成比例（如 0.85 = 85%归商家）
    const merchantRate = Number(merchant.commissionRate ?? 0.85);
    const merchantCents = Math.round(totalCents * merchantRate); // 商家应得（分）
    const commissionCents = totalCents - merchantCents; // 平台抽成（分）= 总额 - 商家，保证两者之和严格等于总额
    const commission = commissionCents / 100;
    const settlementAmount = merchantCents / 100;

    return this.prisma.merchantSettlement.create({
      data: {
        merchantId,
        periodStart,
        periodEnd,
        orderCount: orderAgg._count,
        totalRevenue,
        commission,
        settlementAmount,
        status: "PENDING",
      },
    });
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /** 结算记录列表 */
  async listSettlements(merchantId: string, query: SettlementListQueryDto) {
    const { page = 1, pageSize = 20, status } = query;
    const where: any = { merchantId };
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.merchantSettlement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.merchantSettlement.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /** 结算详情 */
  async getSettlement(id: string) {
    const settlement = await this.prisma.merchantSettlement.findUnique({ where: { id } });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    return settlement;
  }

  /** 标记结算已支付 */
  async paySettlement(id: string, dto: PaySettlementDto, operatorId: string) {
    const settlement = await this.prisma.merchantSettlement.findUnique({
      where: { id },
      include: { merchant: { select: { userId: true } } },
    });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    // 防自审自批：不得给自己名下的商家结算单打款
    if (settlement.merchant?.userId === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的商家结算单打款");
    }
    if (settlement.status !== "PENDING") {
      throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "只能支付待处理状态的结算单");
    }

    // 原子 CAS：仅当仍为 PENDING 时翻转为 PAID，防两个管理员并发确认打款导致对同一结算单重复线下打款
    const res = await this.prisma.merchantSettlement.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidAmount: Math.round(dto.amount * 100) / 100, // 规整到分
        remark: dto.remark,
      },
    });
    if (res.count === 0) {
      throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "结算单状态已变更，请刷新后重试");
    }
    return this.prisma.merchantSettlement.findUnique({ where: { id } });
  }

  /** 取消结算单 */
  async cancelSettlement(id: string) {
    const settlement = await this.prisma.merchantSettlement.findUnique({ where: { id } });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    if (settlement.status === "PAID") {
      throw new BusinessException(ErrorCode.MERCHANT_STATUS_INVALID, "已支付的结算单不能取消");
    }

    return this.prisma.merchantSettlement.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
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
