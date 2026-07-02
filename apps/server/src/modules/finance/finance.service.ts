import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { WechatPayService } from "../shop/wechat-pay.service";
import { maskBankCard, maskName, maskAlipay, maskPhone, maskIdCard } from "../../common/crypto.util";

/** 脱敏提现收款账户(accountInfo Json)——防管理端审批列表批量泄露完整卡号/账户。
 *  管理员打款如需完整账户应走独立的"解密+审计"接口，而非列表明文。 */
function maskAccountInfo(info: unknown): unknown {
  if (!info || typeof info !== "object") return info;
  const out: Record<string, unknown> = { ...(info as Record<string, unknown>) };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v !== "string" || !v) continue;
    const key = k.toLowerCase();
    if (key.includes("alipay")) out[k] = maskAlipay(v);
    else if (key.includes("card") || key.includes("account") || key.includes("bankno") || key.includes("cardno")) out[k] = maskBankCard(v);
    else if (key.includes("idcard") || key.includes("idnum")) out[k] = maskIdCard(v);
    else if (key.includes("holder") || key === "name" || key.includes("realname")) out[k] = maskName(v);
    else if (key.includes("phone") || key.includes("mobile")) out[k] = maskPhone(v);
  }
  return out;
}

/** 账单中解析出的订单记录 */
interface BillEntry {
  orderNo: string;
  amount: number;
  status: string;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private wechatPay?: WechatPayService,
  ) {}

  // ───────── 1. 对账中心 ─────────

  async triggerReconciliation(dto: { period?: string; source?: string; billDate?: string }) {
    // 支持 period 字段（如 "2026-05"），从中推导 source 和 billDate
    const source = dto.source || "WECHAT";
    let billDateStr = dto.billDate;
    if (!billDateStr && dto.period) {
      billDateStr = dto.period + "-01"; // 月初日期
    }
    if (!billDateStr) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供对账月份(period)或账单日期(billDate)");
    }
    const billDate = new Date(billDateStr);
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

    // 下载微信支付交易账单并逐笔比对
    let billEntries: BillEntry[] = [];
    let billStatus = "UNKNOWN";
    const mismatches: { orderNo: string; internalAmount: number; billAmount?: number; reason: string }[] = [];

    if (source === "WECHAT" && this.wechatPay) {
      try {
        const billCsv = await this.wechatPay.downloadTradeBill({ billDate: billDateStr.replace(/-/g, "") });
        billEntries = billCsv ? this.parseBillCsv(billCsv) : [];
        billStatus = "DOWNLOADED";
      } catch (err) {
        this.logger.warn(`微信账单下载失败: ${(err as Error).message}，仅以内部分汇总对账`);
        billStatus = "BILL_UNAVAILABLE";
      }
    }

    // 逐笔比对（内部订单 id = 微信账单中的商户订单号）
    if (billEntries.length > 0) {
      const internalMap = new Map(orders.map((o) => [o.id, o]));
      const billMap = new Map(billEntries.map((b) => [b.orderNo, b]));

      // 检查内部订单是否在账单中
      for (const [orderId, internalOrder] of internalMap) {
        const billEntry = billMap.get(orderId);
        if (!billEntry) {
          mismatches.push({ orderNo: orderId, internalAmount: Number(internalOrder.payAmount || 0), reason: "账单中未找到此订单" });
        } else if (Math.abs(Number(internalOrder.payAmount || 0) - billEntry.amount) > 0.01) {
          mismatches.push({
            orderNo: orderId,
            internalAmount: Number(internalOrder.payAmount || 0),
            billAmount: billEntry.amount,
            reason: "金额不一致",
          });
        }
        billMap.delete(orderId);
      }

      // 检查账单中是否有内部未记录的订单
      for (const [orderNo, billEntry] of billMap) {
        mismatches.push({ orderNo, internalAmount: 0, billAmount: billEntry.amount, reason: "内部系统未找到此订单" });
      }
    }

    const diffCount = mismatches.length;
    const matchAmount = diffCount === 0 && billStatus !== "BILL_UNAVAILABLE"
      ? totalAmount
      : billEntries.reduce((sum, b) => sum + b.amount, 0);

    const record = await this.prisma.reconciliationRecord.create({
      data: {
        source: source,
        billDate: startOfDay,
        status: mismatches.length > 0 ? "MISMATCHED" : billStatus === "BILL_UNAVAILABLE" ? "PENDING" : "MATCHED",
        totalAmount,
        matchAmount,
        diffCount,
        detail: {
          orderCount: orders.length,
          billEntryCount: billEntries.length,
          billStatus,
          mismatches: mismatches.slice(0, 100), // 最多保留100条差异明细
          orders: orders.map((o) => o.id),
        },
      },
    });

    this.logger.log(
      `对账完成: source=${source}, billDate=${billDateStr}, 订单数=${orders.length}, 差异=${mismatches.length}`,
    );
    return record;
  }

  /** 解析微信交易账单CSV */
  private parseBillCsv(csv: string): BillEntry[] {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return [];

    // 微信账单CSV第一行为表头，数据从第二行开始
    // 格式: 交易时间,公众账号ID,商户号,...,微信订单号(第6列),商户订单号(第7列),...,订单金额(第24列),...
    const entries: BillEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 10) continue;
      // 字段位置去引号
      const clean = (s: string) => s.replace(/^`|`$/g, "").trim();

      const orderNo = clean(cols[6] || "");
      const amountStr = clean(cols[23] || cols[22] || "0");
      const amount = parseFloat(amountStr) || 0;

      if (orderNo && amount > 0) {
        entries.push({ orderNo, amount, status: "SUCCESS" });
      }
    }
    return entries;
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
    if (!record) throw new BusinessException(ErrorCode.NOT_FOUND, "对账记录不存在");
    return record;
  }

  // ───────── 2. 发票管理 ─────────

  async createInvoice(dto: { orderId: string; type: string; title: string; taxNo?: string; amount: number }) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");

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

  /** 获取当前用户的发票列表 */
  async getMyInvoices(userId: string, status?: string, page = 1, pageSize = 20) {
    const where: Record<string, any> = { userId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { invoices, total, page, pageSize };
  }

  /** 用户申请开票 */
  async createMyInvoice(userId: string, orderId: string, type: string, title: string, taxNo?: string, _email?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, '订单不存在');
    if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, '无权操作他人订单');

    return this.prisma.invoice.create({
      data: {
        userId,
        orderId,
        type,
        title,
        taxNo: taxNo || null,
        amount: order.payAmount || order.amount,
        status: 'PENDING',
      },
    });
  }

  async issueInvoice(id: string, invoiceUrl: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new BusinessException(ErrorCode.NOT_FOUND, "发票不存在");
    if (invoice.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不允许开具发票");

    return this.prisma.invoice.update({
      where: { id },
      data: { status: "ISSUED", invoiceUrl },
    });
  }

  async mailInvoice(id: string, expressNo: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new BusinessException(ErrorCode.NOT_FOUND, "发票不存在");
    if (invoice.status !== "ISSUED") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不允许标记邮寄");

    return this.prisma.invoice.update({
      where: { id },
      data: { status: "MAILED", expressNo },
    });
  }

  /** 驳回发票申请（仅 PENDING 可驳回） */
  async rejectInvoice(id: string, adminId: string, reason?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new BusinessException(ErrorCode.NOT_FOUND, "发票不存在");
    if (invoice.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不允许驳回");

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    // Invoice 模型暂无 rejectReason 列，驳回原因落审计日志（复用 freezeAmount 同款写法）
    await this.prisma.auditLog.create({
      data: {
        userId: adminId || null,
        action: "REJECT_INVOICE",
        targetType: "INVOICE",
        targetId: id,
        detail: `发票驳回, 原因: ${reason || "无"}`,
      },
    }).catch((e) => this.logger.warn("发票驳回审计日志记录失败", e));

    this.logger.log(`发票 ${id} 已驳回, 原因: ${reason || "无"}`);
    return updated;
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

  async generateSettlement(dto: { userId?: string; period?: string; startDate?: string; endDate?: string }) {
    // 从 startDate/endDate 推导 period
    let period = dto.period;
    let start: Date, end: Date;
    if (dto.startDate && dto.endDate) {
      start = new Date(dto.startDate + "T00:00:00+08:00");
      end = new Date(dto.endDate + "T23:59:59+08:00");
      if (!period) {
        const m = dto.startDate.slice(0, 7);
        period = m;
      }
    } else if (period) {
      const [year, month] = period.split("-").map(Number);
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供结算周期(period)或日期范围(startDate/endDate)");
    }

    const userId = dto.userId;

    // 检查是否已存在（有 userId 时才检查去重）
    if (userId) {
      const existing = await this.prisma.settlementOrder.findFirst({
        where: { userId, period },
      });
      if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该周期结算单已存在");
    }

    // 聚合该周期所有收益
    const earningWhere: any = {
      createdAt: { gte: start, lte: end },
    };
    if (userId) earningWhere.userId = userId;

    const [earnings, stationEarnings] = await Promise.all([
      this.prisma.userEarning.findMany({
        where: earningWhere,
      }),
      this.prisma.stationEarning.findMany({
        where: {
          ...(userId ? { station: { userId } } : {}),
          createdAt: { gte: start, lte: end },
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
        userId: userId || "PLATFORM",
        period: period!,
        amount: totalAmount,
        detail,
        status: "PENDING",
      },
    });
  }

  async approveSettlement(id: string, adminId: string) {
    const settlement = await this.prisma.settlementOrder.findUnique({ where: { id } });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    // 防自审自批：受益人不得审批自己的结算单
    if (settlement.userId === adminId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己的结算单");
    if (settlement.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不允许审批");

    return this.prisma.settlementOrder.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: adminId },
    });
  }

  async paySettlement(id: string, operatorId: string) {
    const settlement = await this.prisma.settlementOrder.findUnique({ where: { id } });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    // 防自审自批：受益人不得给自己的结算单打款
    if (settlement.userId === operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的结算单打款");
    if (settlement.status !== "APPROVED") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不允许打款");

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
    // PII 脱敏：批量列表不返回完整收款账户
    const masked = withdrawals.map((w) => ({ ...w, accountInfo: maskAccountInfo(w.accountInfo) }));
    return { withdrawals: masked, total, page: dto.page, pageSize: dto.pageSize };
  }

  /**
   * 原子推进提现申请状态：仅当当前状态 == fromStatus 时更新为 toStatus。
   * 用条件 updateMany 避免并发下的重复审批 / 重复打款（TOCTOU）。
   */
  private async transitWithdrawal(
    id: string,
    fromStatus: string,
    toStatus: string,
    extra: Record<string, unknown>,
    forbidMsg: string,
  ) {
    const result = await this.prisma.withdrawalApplication.updateMany({
      where: { id, status: fromStatus },
      data: { status: toStatus, ...extra },
    });
    if (result.count === 0) {
      const exists = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
      if (!exists) throw new BusinessException(ErrorCode.NOT_FOUND, "提现申请不存在");
      throw new BusinessException(ErrorCode.BAD_REQUEST, forbidMsg);
    }
    return this.prisma.withdrawalApplication.findUnique({ where: { id } });
  }

  async approveWithdrawal(id: string, adminId: string, reviewNote?: string) {
    // 防自审自批：受益人不得审批自己的提现申请
    const app = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    if (app && app.userId === adminId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己的提现");
    return this.transitWithdrawal(
      id,
      "PENDING",
      "APPROVED",
      { reviewedBy: adminId, reviewNote: reviewNote || null },
      "当前状态不允许审批",
    );
  }

  async rejectWithdrawal(id: string, adminId: string, reviewNote: string) {
    return this.transitWithdrawal(id, "PENDING", "REJECTED", { reviewedBy: adminId, reviewNote }, "当前状态不允许驳回");
  }

  async confirmWithdrawalPay(id: string, adminId: string) {
    // 防自审自批：受益人不得给自己的提现打款
    const app = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    if (app && app.userId === adminId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的提现打款");
    return this.transitWithdrawal(id, "APPROVED", "PAID", {}, "当前状态不允许打款");
  }

  // ───────── 6. 资金冻结/解冻 ─────────

  /** 冻结订单资金 */
  async freezeAmount(dto: { orderId?: string; userId?: string; amount: number; reason?: string }) {
    if (!dto.orderId && dto.userId) {
      // 如果是通过用户ID冻结，则冻结该用户所有已支付订单
      const userOrders = await this.prisma.order.findMany({
        where: { userId: dto.userId, status: "PAID" },
        select: { id: true },
      });
      if (userOrders.length === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该用户无符合条件的已支付订单");
      dto.orderId = userOrders[0].id;
    }
    if (!dto.orderId) throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供订单ID或用户ID");
    // 原子操作：仅在未冻结时更新
    const result = await this.prisma.order.updateMany({
      where: {
        id: dto.orderId,
        status: "PAID",
        OR: [{ frozenAmount: null }, { frozenAmount: 0 }],
      },
      data: { frozenAmount: dto.amount },
    });
    if (result.count === 0) {
      const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      if (order.status !== "PAID") throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已支付订单可冻结");
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单已有冻结金额，请先解冻");
    }

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
    return { success: true, orderId: dto.orderId, frozenAmount: dto.amount };
  }

  /** 解冻订单资金 */
  async unfreezeAmount(dto: { orderId: string; reason?: string }) {
    // 原子操作：仅在有冻结金额时解冻
    const result = await this.prisma.order.updateMany({
      where: {
        id: dto.orderId,
        frozenAmount: { not: null },
      },
      data: { frozenAmount: null },
    });
    if (result.count === 0) {
      const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单无冻结金额");
    }

    // 记录解冻操作到审计日志
    await this.prisma.auditLog.create({
      data: {
        userId: null,
        action: "UNFREEZE_AMOUNT",
        targetType: "ORDER",
        targetId: dto.orderId,
        detail: `解冻, 原因: ${dto.reason || "无"}`,
      },
    }).catch((e) => this.logger.warn("解冻审计日志记录失败", e));

    this.logger.log(`订单 ${dto.orderId} 已解冻`);
    return { success: true, orderId: dto.orderId };
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
      throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的周期格式，应为 YYYY-MM（如 2026-05）");
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
