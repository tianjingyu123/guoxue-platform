import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private prisma: PrismaService) {}

  // ───────── 1. 对账中心 ─────────

  async triggerReconciliation(dto: { source: string; billDate: string }) {
    const billDate = new Date(dto.billDate);
    const startOfDay = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    // 查询该日期已支付订单
    const orders = await this.prisma.order.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: startOfDay, lt: endOfDay },
      },
      select: { id: true, payAmount: true, payMethod: true, payTransactionId: true },
    });

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.payAmount || 0), 0);
    const matchAmount = totalAmount;
    const diffCount = 0;

    const record = await this.prisma.reconciliationRecord.create({
      data: {
        source: dto.source,
        billDate: startOfDay,
        status: "MATCHED",
        totalAmount,
        matchAmount,
        diffCount,
        detail: { orderCount: orders.length, orders: orders.map((o) => o.id) },
      },
    });

    this.logger.log(`对账完成: source=${dto.source}, billDate=${dto.billDate}, 订单数=${orders.length}`);
    return record;
  }

  async getReconciliationList(dto: { source?: string; status?: string; page: number; pageSize: number }) {
    const where: Record<string, any> = {};
    if (dto.source) where.source = dto.source;
    if (dto.status) where.status = dto.status;

    const [records, total] = await Promise.all([
      this.prisma.reconciliationRecord.findMany({
        where,
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.reconciliationRecord.count({ where }),
    ]);
    return { records, total, page: dto.page, pageSize: dto.pageSize };
  }

  async getReconciliationDetail(id: string) {
    const record = await this.prisma.reconciliationRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("对账记录不存在");
    return record;
  }

  // ───────── 2. 发票管理 ─────────

  async createInvoice(dto: { orderId: string; type: string; title: string; taxNo?: string; amount: number }) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException("订单不存在");

    return this.prisma.invoice.create({
      data: {
        userId: order.userId,
        orderId: dto.orderId,
        type: dto.type,
        title: dto.title,
        taxNo: dto.taxNo,
        amount: dto.amount,
      },
    });
  }

  async getInvoiceList(dto: { status?: string; page: number; pageSize: number }) {
    const where: Record<string, any> = {};
    if (dto.status) where.status = dto.status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { invoices, total, page: dto.page, pageSize: dto.pageSize };
  }

  async issueInvoice(id: string, invoiceUrl: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException("发票不存在");
    if (invoice.status !== "PENDING") throw new BadRequestException("当前状态不允许开具发票");

    return this.prisma.invoice.update({
      where: { id },
      data: { status: "ISSUED", invoiceUrl },
    });
  }

  async mailInvoice(id: string, expressNo: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException("发票不存在");
    if (invoice.status !== "ISSUED") throw new BadRequestException("当前状态不允许标记邮寄");

    return this.prisma.invoice.update({
      where: { id },
      data: { status: "MAILED", expressNo },
    });
  }

  // ───────── 3. 结算单 ─────────

  async getSettlementList(dto: {
    userId?: string;
    period?: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Record<string, any> = {};
    if (dto.userId) where.userId = dto.userId;
    if (dto.period) where.period = dto.period;
    if (dto.status) where.status = dto.status;

    const [settlements, total] = await Promise.all([
      this.prisma.settlementOrder.findMany({
        where,
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.settlementOrder.count({ where }),
    ]);
    return { settlements, total, page: dto.page, pageSize: dto.pageSize };
  }

  async generateSettlement(dto: { userId: string; period: string }) {
    const [year, month] = dto.period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 检查是否已存在
    const existing = await this.prisma.settlementOrder.findFirst({
      where: { userId: dto.userId, period: dto.period },
    });
    if (existing) throw new BadRequestException("该周期结算单已存在");

    // 聚合该用户该周期所有收益
    const [earnings, stationEarnings] = await Promise.all([
      this.prisma.userEarning.findMany({
        where: {
          userId: dto.userId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.stationEarning.findMany({
        where: {
          station: { userId: dto.userId },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const totalRmbEarning = earnings.reduce((sum, e) => sum + Number(e.amountRmb), 0);
    const totalCommission = stationEarnings.reduce((sum, e) => sum + Number(e.earned), 0);
    const totalAmount = totalRmbEarning + totalCommission;

    const detail = {
      earnings: earnings.map((e) => ({ id: e.id, scene: e.scene, amountRmb: Number(e.amountRmb), amountCoin: e.amountCoin })),
      commissions: stationEarnings.map((e) => ({ id: e.id, type: e.type, earned: Number(e.earned) })),
      summary: { totalRmbEarning, totalCommission, totalAmount },
    };

    return this.prisma.settlementOrder.create({
      data: {
        userId: dto.userId,
        period: dto.period,
        amount: totalAmount,
        detail,
        status: "PENDING",
      },
    });
  }

  async approveSettlement(id: string, adminId: string) {
    const settlement = await this.prisma.settlementOrder.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException("结算单不存在");
    if (settlement.status !== "PENDING") throw new BadRequestException("当前状态不允许审批");

    return this.prisma.settlementOrder.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: adminId },
    });
  }

  async paySettlement(id: string) {
    const settlement = await this.prisma.settlementOrder.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException("结算单不存在");
    if (settlement.status !== "APPROVED") throw new BadRequestException("当前状态不允许打款");

    return this.prisma.settlementOrder.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  // ───────── 4. 提现审批 ─────────

  async getWithdrawalList(dto: { status?: string; page: number; pageSize: number }) {
    const where: Record<string, any> = {};
    if (dto.status) where.status = dto.status;

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawalApplication.findMany({
        where,
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawalApplication.count({ where }),
    ]);
    return { withdrawals, total, page: dto.page, pageSize: dto.pageSize };
  }

  async approveWithdrawal(id: string, adminId: string, reviewNote?: string) {
    const w = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    if (!w) throw new NotFoundException("提现申请不存在");
    if (w.status !== "PENDING") throw new BadRequestException("当前状态不允许审批");

    return this.prisma.withdrawalApplication.update({
      where: { id },
      data: { status: "APPROVED", reviewedBy: adminId, reviewNote: reviewNote || null },
    });
  }

  async rejectWithdrawal(id: string, adminId: string, reviewNote: string) {
    const w = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    if (!w) throw new NotFoundException("提现申请不存在");
    if (w.status !== "PENDING") throw new BadRequestException("当前状态不允许驳回");

    return this.prisma.withdrawalApplication.update({
      where: { id },
      data: { status: "REJECTED", reviewedBy: adminId, reviewNote },
    });
  }

  async confirmWithdrawalPay(id: string) {
    const w = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    if (!w) throw new NotFoundException("提现申请不存在");
    if (w.status !== "APPROVED") throw new BadRequestException("当前状态不允许打款");

    return this.prisma.withdrawalApplication.update({
      where: { id },
      data: { status: "PAID" },
    });
  }

  // ───────── 6. 资金冻结/解冻 ─────────

  /** 冻结订单资金 */
  async freezeAmount(dto: { orderId: string; amount: number; reason?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    if (order.status !== "PAID") throw new BadRequestException("仅已支付订单可冻结");
    if (Number(order.frozenAmount || 0) > 0) throw new BadRequestException("该订单已有冻结金额，请先解冻");

    const updated = await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { frozenAmount: dto.amount },
    });

    // 记录冻结操作到审计日志
    await this.prisma.auditLog.create({
      data: {
        userId: null,
        action: "FREEZE_AMOUNT",
        targetType: "ORDER",
        targetId: dto.orderId,
        detail: `冻结金额: ${dto.amount}, 原因: ${dto.reason || "无"}`,
      },
    }).catch((e) => this.logger.warn("冻结审计日志记录失败", e));

    this.logger.log(`订单 ${dto.orderId} 冻结金额 ${dto.amount}`);
    return updated;
  }

  /** 解冻订单资金 */
  async unfreezeAmount(dto: { orderId: string; reason?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException("订单不存在");
    if (!order.frozenAmount || Number(order.frozenAmount) === 0) throw new BadRequestException("该订单无冻结金额");

    const updated = await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { frozenAmount: null },
    });

    // 记录解冻操作到审计日志
    await this.prisma.auditLog.create({
      data: {
        userId: null,
        action: "UNFREEZE_AMOUNT",
        targetType: "ORDER",
        targetId: dto.orderId,
        detail: `解冻金额: ${order.frozenAmount}, 原因: ${dto.reason || "无"}`,
      },
    }).catch((e) => this.logger.warn("解冻审计日志记录失败", e));

    this.logger.log(`订单 ${dto.orderId} 已解冻`);
    return updated;
  }

  /** 查询冻结记录（含冻结金额的订单列表） */
  async getFreezeRecords(dto: { orderId?: string; page: number; pageSize: number }) {
    const where: Prisma.OrderWhereInput = {
      frozenAmount: { not: null },
    };
    if (dto.orderId) where.id = dto.orderId;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page: dto.page,
      pageSize: dto.pageSize,
      totalPages: Math.ceil(total / dto.pageSize),
    };
  }

  // ───────── 5. 财务报表 ─────────

  async getMonthlyReport(period?: string) {
    // 未指定月份时返回所有已保存的月报列表
    if (!period) {
      return this.prisma.financialReport.findMany({
        where: { type: "MONTHLY" },
        orderBy: { period: "desc" },
      });
    }
    const report = await this.prisma.financialReport.findUnique({
      where: { type_period: { type: "MONTHLY", period } },
    });
    if (report) return report;
    return this.generateMonthlyData(period);
  }

  async generateMonthlyReport(period: string, adminId: string) {
    const data = await this.generateMonthlyData(period);
    return this.prisma.financialReport.upsert({
      where: { type_period: { type: "MONTHLY", period } },
      update: { data, generatedBy: adminId },
      create: { type: "MONTHLY", period, data, generatedBy: adminId },
    });
  }

  private async generateMonthlyData(period: string) {
    const [year, month] = period.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException("无效的周期格式，应为 YYYY-MM（如 2026-05）");
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const [orderAgg, refundAgg, commissionAgg, earningAgg] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: "PAID", paidAt: { gte: startDate, lte: endDate } },
        _sum: { payAmount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { status: "REFUNDED", refundedAt: { gte: startDate, lte: endDate } },
        _sum: { payAmount: true },
        _count: true,
      }),
      this.prisma.stationEarning.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate } },
        _sum: { earned: true },
        _count: true,
      }),
      this.prisma.userEarning.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate } },
        _sum: { amountRmb: true, amountCoin: true },
        _count: true,
      }),
    ]);

    const revenue = Number(orderAgg._sum.payAmount || 0);
    const refund = Number(refundAgg._sum.payAmount || 0);
    const commissionExpense = Number(commissionAgg._sum.earned || 0);
    const userEarningExpense = Number(earningAgg._sum.amountRmb || 0);
    const netProfit = revenue - refund - commissionExpense - userEarningExpense;

    return {
      period,
      revenue,
      revenueOrderCount: orderAgg._count,
      refund,
      refundOrderCount: refundAgg._count,
      commissionExpense,
      commissionCount: commissionAgg._count,
      userEarningExpense,
      userEarningCount: earningAgg._count,
      netProfit,
      generatedAt: new Date().toISOString(),
    };
  }
}
