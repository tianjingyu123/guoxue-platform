import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { WechatPayService } from "../shop/wechat-pay.service";
import { maskBankCard, maskName, maskAlipay, maskPhone, maskIdCard, resolveAccountInfo } from "../../common/crypto.util";
import { safePagination, NO_PAGE_LIMIT } from "../../common/pagination";

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
    const source = dto.source || "WECHAT";

    // 🔴 两种口径（此前 period 模式只对月初"一天"却号称月对账 → 月内其余 27~30 天的掉单/差额全被漏掉）：
    //   billDate → 单日对账（原有行为不变）
    //   period   → 整月对账：订单窗口 = [月初, 次月初)，账单 = 逐日下载后合并
    let rangeStart: Date;
    let rangeEnd: Date;
    let billDatesToFetch: string[];
    if (dto.billDate) {
      const billDate = new Date(dto.billDate);
      rangeStart = new Date(billDate.getFullYear(), billDate.getMonth(), billDate.getDate());
      rangeEnd = new Date(rangeStart.getTime() + 86400000);
      billDatesToFetch = [dto.billDate];
    } else if (dto.period) {
      const [year, month] = dto.period.split("-").map(Number);
      if (!year || !month || month < 1 || month > 12) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "无效的对账月份格式，应为 YYYY-MM（如 2026-05）");
      }
      rangeStart = new Date(year, month - 1, 1);
      rangeEnd = new Date(year, month, 1);
      // 逐日账单：只取已过去的日期（渠道当日账单要次日才出）
      billDatesToFetch = [];
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      for (let d = new Date(rangeStart); d < rangeEnd && d < todayStart; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        billDatesToFetch.push(`${y}-${m}-${day}`);
      }
    } else {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "请提供对账月份(period)或账单日期(billDate)");
    }
    const billDateStr = dto.billDate || dto.period + "-01";

    // 交易账单记录的是支付发生时的原始交易，订单后续发货、完成或退款后仍必须参与对账。
    // 同时按支付渠道隔离，避免把支付宝/银联订单拿去与微信账单比较。
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ["PAID", "SHIPPED", "COMPLETED", "REFUNDED"] },
        payMethod: source,
        paidAt: { gte: rangeStart, lt: rangeEnd },
      },
      select: { id: true, payAmount: true, payMethod: true, payTransactionId: true },
    });

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.payAmount || 0), 0);

    // 下载微信支付交易账单并逐笔比对
    let billEntries: BillEntry[] = [];
    let billStatus = "UNKNOWN";
    const mismatches: { orderNo: string; internalAmount: number; billAmount?: number; reason: string }[] = [];

    if (source === "WECHAT" && this.wechatPay) {
      // 逐日下载并合并（单日模式即单个日期）。任何一天拉不到都不能算 DOWNLOADED ——
      // 🔴 downloadTradeBill 失败/无账单时返回 null（其内部吞掉了异常）。
      //    绝不能把「没拉到账单」标成 DOWNLOADED —— 否则下面 billEntries 为空/不全、
      //    逐笔比对被跳过或漏比、diffCount 偏小，最终生成「对账通过·全额匹配」的假绿灯，
      //    把渠道掉单/金额差全部隐藏。缺任何一天都标不可用，判为 PENDING 待人工核。
      let anyDayUnavailable = billDatesToFetch.length === 0;
      for (const dayStr of billDatesToFetch) {
        try {
          // 交易对账只下载支付成功账单；ALL 还会混入同一订单的退款行，不能与原支付金额一一映射。
          const billCsv = await this.wechatPay.downloadTradeBill({
            billDate: dayStr,
            billType: "SUCCESS",
          });
          // 空字符串表示微信明确返回 NO_STATEMENT_EXIST，即当天没有成功交易，是有效空账单。
          if (billCsv !== null) {
            billEntries = billEntries.concat(this.parseBillCsv(billCsv));
          } else {
            anyDayUnavailable = true;
          }
        } catch (err) {
          this.logger.warn(`微信账单下载失败(${dayStr}): ${(err as Error).message}`);
          anyDayUnavailable = true;
        }
      }
      billStatus = anyDayUnavailable ? "BILL_UNAVAILABLE" : "DOWNLOADED";
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
    // 🔴 账单「可用」的严格定义：成功下载(DOWNLOADED) 且 不存在「内部有订单却拿到空账单」。
    //    内部有单但账单空，说明账单没下全或渠道确实缺单 —— 属未完成对账，绝不能判匹配。
    const billUsable = billStatus === "DOWNLOADED" && (orders.length === 0 || billEntries.length > 0);
    const matchAmount = diffCount === 0 && billUsable
      ? totalAmount
      : billEntries.reduce((sum, b) => sum + b.amount, 0);

    const record = await this.prisma.reconciliationRecord.create({
      data: {
        source: source,
        billDate: rangeStart,
        // 只有「账单可用 + 逐笔零差异」才算对账通过；账单不可用/内部有单账单空 → PENDING 待人工核
        // 状态口径统一为 MISMATCHED（前端同步统一，勿再出现 MISMATCH 变体）
        status: mismatches.length > 0 ? "MISMATCHED" : billUsable ? "MATCHED" : "PENDING",
        totalAmount,
        matchAmount,
        diffCount,
        detail: {
          orderCount: orders.length,
          billEntryCount: billEntries.length,
          billStatus,
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
          billDates: billDatesToFetch,
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
    const lines = csv.split(/\r?\n/u).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const clean = (value: string) => value
      .replace(/^\uFEFF/u, "")
      .replace(/^`/u, "")
      .replace(/`$/u, "")
      .trim();
    const headers = this.splitCsvLine(lines[0]).map(clean);
    const orderNoIndex = headers.indexOf("商户订单号");
    const amountIndex = ["订单金额", "应结订单金额", "总金额"]
      .map((name) => headers.indexOf(name))
      .find((index) => index >= 0) ?? -1;
    if (orderNoIndex < 0 || amountIndex < 0) {
      this.logger.warn("微信交易账单缺少商户订单号或订单金额表头，拒绝按固定列号猜测");
      return [];
    }

    const entries: BillEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i]);
      if (cols.length <= Math.max(orderNoIndex, amountIndex)) continue;
      const orderNo = clean(cols[orderNoIndex] || "");
      const amountStr = clean(cols[amountIndex] || "0");
      const amount = parseFloat(amountStr) || 0;

      if (orderNo && amount > 0) {
        entries.push({ orderNo, amount, status: "SUCCESS" });
      }
    }
    return entries;
  }

  /** 按 RFC 4180 的双引号规则切分单行，避免商品名或商户数据包中的逗号错位金额列。 */
  private splitCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  async getReconciliationList(dto: { source?: string; status?: string; page: number; pageSize: number }) {
    const where: Record<string, any> = {};
    if (dto.source) where.source = dto.source;
    if (dto.status) where.status = dto.status;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const [records, total] = await Promise.all([
      this.prisma.reconciliationRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.reconciliationRecord.count({ where }),
    ]);
    return { records, total, page, pageSize };
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
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { invoices, total, page, pageSize };
  }

  /** 获取当前用户的发票列表 */
  async getMyInvoices(userId: string, status?: string, rawPage = 1, rawPageSize = 20) {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize, NO_PAGE_LIMIT);
    const where: Record<string, any> = { userId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { invoices, total, page, pageSize };
  }

  /** 用户申请开票 */
  async createMyInvoice(userId: string, orderId: string, type: string, title: string, taxNo?: string) {
    const normalizedTitle = title.trim();
    const normalizedTaxNo = taxNo?.trim() || null;
    if (type === "COMPANY" && !normalizedTaxNo) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "企业发票必须填写纳税人识别号");
    }

    return this.prisma.$transaction(async (tx) => {
      // 同一订单申请串行化；无需新增唯一索引和生产 DDL，也能阻断双击/并发重复开票。
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `invoice:${orderId}`);
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
      if (order.userId !== userId) throw new BusinessException(ErrorCode.FORBIDDEN, "无权操作他人订单");
      if (order.status !== "COMPLETED") {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "仅交易已完成的订单可以申请发票");
      }
      const amount = Number(order.payAmount ?? order.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "实付金额为 0 的订单无需开票");
      }
      const existing = await tx.invoice.findFirst({
        where: { orderId, userId, status: { in: ["PENDING", "ISSUED", "MAILED"] } },
        select: { id: true },
      });
      if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该订单已申请过发票");

      return tx.invoice.create({
        data: {
          userId,
          orderId,
          type,
          title: normalizedTitle,
          taxNo: normalizedTaxNo,
          amount,
          status: "PENDING",
        },
      });
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
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const [settlements, total] = await Promise.all([
      this.prisma.settlementOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.settlementOrder.count({ where }),
    ]);
    return { settlements, total, page, pageSize };
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

    // 防重复生成：无 userId 时落库为 "PLATFORM"，同样按 period 去重 ——
    // 此前平台级不查重，重复点击会生成多张同周期总账结算单，审批打款一旦各批一张即重复出款
    const dedupeUserId = userId || "PLATFORM";
    const existing = await this.prisma.settlementOrder.findFirst({
      where: { userId: dedupeUserId, period },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "该周期结算单已存在");

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

    // CAS：仅 PENDING 可翻 APPROVED，防两个管理员并发双双通过（TOCTOU）
    const flipped = await this.prisma.settlementOrder.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "APPROVED", approvedBy: adminId },
    });
    if (flipped.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该结算单已被处理，请刷新后重试");
    return this.prisma.settlementOrder.findUnique({ where: { id } });
  }

  async paySettlement(id: string, operatorId: string, payoutRef?: string) {
    // 🔴 payoutRef 必填（同提现打款范式）：结算打款必须能对上一条真实转账流水
    const ref = (payoutRef || "").trim();
    if (!ref) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "必须提供打款流水号（银行/支付宝转账凭证号）");
    }

    const settlement = await this.prisma.settlementOrder.findUnique({ where: { id } });
    if (!settlement) throw new BusinessException(ErrorCode.NOT_FOUND, "结算单不存在");
    // 防自审自批：受益人不得给自己的结算单打款
    if (settlement.userId === operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的结算单打款");
    // 🔴 四眼原则：审批人与打款人必须是两个人（同提现 confirmWithdrawalPay 范式）
    if (settlement.approvedBy && settlement.approvedBy === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "审批人不能同时打款，需由另一名财务操作");
    }
    if (settlement.status !== "APPROVED") throw new BusinessException(ErrorCode.BAD_REQUEST, "当前状态不允许打款");

    // 查重：SettlementOrder 无独立流水号列（不加迁移），payoutRef 存入 detail JSON 并按 JSON 路径查重
    const dup = await this.prisma.settlementOrder.findFirst({
      where: { detail: { path: ["payoutRef"], equals: ref } },
    });
    if (dup && dup.id !== id) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `流水号 ${ref} 已用于另一张结算单（${dup.id}），疑似重复打款`);
    }

    const mergedDetail = {
      ...((settlement.detail as Record<string, unknown>) || {}),
      payoutRef: ref,
      paidBy: operatorId,
    } as Prisma.InputJsonValue;

    // CAS：仅 APPROVED 可翻 PAID，并发/重复点击只会成功一次
    const flipped = await this.prisma.settlementOrder.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "PAID", paidAt: new Date(), detail: mergedDetail },
    });
    if (flipped.count === 0) throw new BusinessException(ErrorCode.BAD_REQUEST, "该结算单已被处理，请刷新后重试");
    return this.prisma.settlementOrder.findUnique({ where: { id } });
  }

  // ───────── 4. 提现审批 ─────────

  async getWithdrawalList(dto: { status?: string; page: number; pageSize: number }) {
    const where: Record<string, any> = {};
    if (dto.status) where.status = dto.status;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawalApplication.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawalApplication.count({ where }),
    ]);
    // PII 脱敏：批量列表不返回完整收款账户。切读=先解密密文列(回退明文)再脱敏；密文列不外泄。
    const masked = withdrawals.map(({ accountInfoEnc, ...w }) => ({
      ...w,
      accountInfo: maskAccountInfo(resolveAccountInfo(accountInfoEnc, w.accountInfo)),
    }));
    return { withdrawals: masked, total, page, pageSize };
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

  /**
   * 🔴 让"冻结"真的生效：Order.frozenAmount 此前全后端零消费（假冻结）。
   * 语义定为「风控暂停出款」：用户名下存在任何被冻结订单资金时，其提现不允许通过审批/打款。
   * 选择拦在审批+打款两道闸而非"扣减可提额度"——额度计算在 wallet 模块（本次禁改），
   * 且冻结是风控动作（涉诉/涉诈调查），全额暂停出款比按额度部分放行更符合冻结本意、改动也最小。
   */
  private async assertNoFrozenFunds(userId: string, action: string) {
    const agg = await this.prisma.order.aggregate({
      where: { userId, frozenAmount: { not: null } },
      _sum: { frozenAmount: true },
    });
    const frozen = Number(agg._sum.frozenAmount || 0);
    if (frozen > 0) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        `该用户有 ¥${frozen.toFixed(2)} 资金处于风控冻结中，冻结期间不可${action}`,
      );
    }
  }

  async approveWithdrawal(id: string, adminId: string, reviewNote?: string) {
    // 防自审自批：受益人不得审批自己的提现申请
    const app = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    if (app && app.userId === adminId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能审批自己的提现");
    // 风控冻结拦截：冻结中的用户提现不予通过
    if (app) await this.assertNoFrozenFunds(app.userId, "通过提现审批");
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

  async confirmWithdrawalPay(id: string, adminId: string, payoutRef?: string) {
    // 🔴 payoutRef 必填（照 commission.confirmPayout 标杆·替代此前 MANUAL-占位）：
    //    每一笔 PAID 必须对上一条真实银行/微信/支付宝流水，占位符会让"记了打款却没真打"无从对账。
    const ref = (payoutRef || "").trim();
    if (!ref) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "必须提供打款流水号（银行/微信/支付宝转账凭证号）");
    }

    const app = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    // 防自审自批：受益人不得给自己的提现打款
    if (app && app.userId === adminId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能给自己的提现打款");
    // 🔴 四眼原则：审批人与打款人必须是两个人，否则单个财务可一手审批一手放款给同伙账户套现
    if (app && app.reviewedBy === adminId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "审批人不能同时打款，需由另一名财务操作");
    }
    // 风控冻结拦截：冻结中的用户不出款
    if (app) await this.assertNoFrozenFunds(app.userId, "打款");

    // 查重：同一流水号只能对应一笔出款（DB @unique 是最后兜底，这里先给出明确错误）
    const dup = await this.prisma.withdrawalApplication.findUnique({ where: { payoutRef: ref } });
    if (dup && dup.id !== id) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `流水号 ${ref} 已用于另一笔提现（${dup.id}），疑似重复打款`);
    }

    return this.transitWithdrawal(id, "APPROVED", "PAID", { payoutRef: ref }, "当前状态不允许打款");
  }

  /**
   * 【打款专用】取提现完整收款账户 —— 唯一返回明文 accountInfo 的通道（照 commission.revealPayoutAccount 标杆）。
   * 安全约束：仅 APPROVED 可取（最小化明文暴露面）；防自取；**先写审计成功才返回明文** ——
   * 审计写失败即拒绝，宁可打不了款，也不允许出现"有人看了收款账户但查不到是谁"。
   */
  async revealWithdrawalPayoutAccount(id: string, operatorId: string, ip?: string) {
    const app = await this.prisma.withdrawalApplication.findUnique({ where: { id } });
    if (!app) throw new BusinessException(ErrorCode.NOT_FOUND, "提现申请不存在");
    if (app.userId === operatorId) {
      throw new BusinessException(ErrorCode.FORBIDDEN, "不能查看自己提现申请的收款账户");
    }
    if (app.status !== "APPROVED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已审核通过（APPROVED）的提现可查看收款账户");
    }

    // 先留痕再返回：不 catch —— 审计失败直接抛错，不给明文
    await this.prisma.auditLog.create({
      data: {
        userId: operatorId,
        action: "REVEAL_PAYOUT_ACCOUNT",
        targetType: "WITHDRAWAL_APPLICATION",
        targetId: id,
        detail: `查看提现收款账户（打款用）: application=${id}, 受益人=${app.userId}, 实付=¥${Number(app.actualAmount)}${ip ? `, ip=${ip}` : ""}`,
      },
    });

    return {
      id: app.id,
      userId: app.userId,
      amount: Number(app.amount),
      actualAmount: Number(app.actualAmount),
      payMethod: app.payMethod,
      // 切读：解密密文列(回退明文兼容存量)返回完整明文（列表接口一律脱敏，勿放宽那边）
      accountInfo: resolveAccountInfo(app.accountInfoEnc, app.accountInfo),
    };
  }

  // ───────── 6. 资金冻结/解冻 ─────────

  /** 冻结订单资金（adminId=操作人·审计必留痕） */
  async freezeAmount(dto: { orderId?: string; userId?: string; amount: number; reason?: string }, adminId: string) {
    if (!(dto.amount > 0)) throw new BusinessException(ErrorCode.BAD_REQUEST, "冻结金额必须大于0");
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

    // 🔴 冻结上限=订单金额：冻结额超实付会虚增"被冻资金"，解冻/追偿时对不上账
    const target = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { payAmount: true, amount: true },
    });
    if (!target) throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
    const orderPaid = Number(target.payAmount ?? target.amount ?? 0);
    if (dto.amount > orderPaid + 1e-6) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `冻结金额 ¥${dto.amount} 超过订单实付 ¥${orderPaid.toFixed(2)}`,
      );
    }

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

    // 记录冻结操作到审计日志（userId=操作人，资金动作必须可追责到人）
    await this.prisma.auditLog.create({
      data: {
        userId: adminId || null,
        action: "FREEZE_AMOUNT",
        targetType: "ORDER",
        targetId: dto.orderId,
        detail: `冻结金额: ${dto.amount}, 原因: ${dto.reason || "无"}`,
      },
    }).catch((e) => this.logger.warn("冻结审计日志记录失败", e));

    this.logger.log(`订单 ${dto.orderId} 冻结金额 ${dto.amount}（操作人 ${adminId}）`);
    return { success: true, orderId: dto.orderId, frozenAmount: dto.amount };
  }

  /** 解冻订单资金（adminId=操作人·审计必留痕） */
  async unfreezeAmount(dto: { orderId: string; reason?: string }, adminId: string) {
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

    // 记录解冻操作到审计日志（userId=操作人，资金动作必须可追责到人）
    await this.prisma.auditLog.create({
      data: {
        userId: adminId || null,
        action: "UNFREEZE_AMOUNT",
        targetType: "ORDER",
        targetId: dto.orderId,
        detail: `解冻, 原因: ${dto.reason || "无"}`,
      },
    }).catch((e) => this.logger.warn("解冻审计日志记录失败", e));

    this.logger.log(`订单 ${dto.orderId} 已解冻（操作人 ${adminId}）`);
    return { success: true, orderId: dto.orderId };
  }

  /** 查询冻结记录（含冻结金额的订单列表） */
  async getFreezeRecords(dto: { orderId?: string; page: number; pageSize: number }) {
    const where: Prisma.OrderWhereInput = {
      frozenAmount: { not: null },
    };
    if (dto.orderId) where.id = dto.orderId;
    const { page, pageSize, skip } = safePagination(dto.page, dto.pageSize, NO_PAGE_LIMIT);
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
