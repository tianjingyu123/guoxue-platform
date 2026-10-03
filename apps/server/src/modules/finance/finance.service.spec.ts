import { Test } from "@nestjs/testing";
import { FinanceService } from "./finance.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma: any = {
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  reconciliationRecord: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  invoice: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  settlementOrder: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  withdrawalApplication: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  financialReport: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  userEarning: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  stationEarning: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
};
mockPrisma.$queryRawUnsafe = jest.fn().mockResolvedValue([]);
mockPrisma.$transaction = jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(mockPrisma));

describe("FinanceService", () => {
  let svc: FinanceService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(FinanceService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 冻结拦截默认放行（无冻结资金）；具体用例可覆盖
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: { frozenAmount: null } });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  // ─── 1. 对账中心 ───

  describe("triggerReconciliation", () => {
    it("月度对账使用微信 V3 要求的 YYYY-MM-DD 账单日期", async () => {
      const mockWechatPay = {
        downloadTradeBill: jest.fn().mockResolvedValue("header\n"),
      };
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRecord.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ id: "r-date", ...data }));
      const service = new FinanceService(mockPrisma, mockWechatPay as any);

      await service.triggerReconciliation({ source: "WECHAT", period: "2026-05" });

      expect(mockWechatPay.downloadTradeBill).toHaveBeenCalledWith({
        billDate: "2026-05-01",
        billType: "SUCCESS",
      });
    });

    it("微信交易对账包含已退款订单并隔离其他支付渠道", async () => {
      const headers = [
        "交易时间", "公众账号ID", "商户号", "特约商户号", "设备号", "微信订单号",
        "商户订单号", "用户标识", "交易类型", "交易状态", "付款银行", "货币种类",
        "应结订单金额", "代金券金额", "商品名称", "商户数据包", "手续费", "费率",
        "订单金额", "费率备注",
      ];
      const columns = Array(headers.length).fill("");
      columns[6] = "order-refunded";
      columns[12] = "0.01";
      columns[14] = '"含,逗号的商品"';
      columns[17] = "0.54%";
      columns[18] = "0.01";
      const mockWechatPay = {
        downloadTradeBill: jest.fn().mockResolvedValue(
          `${headers.join(",")}\n${columns.join(",")}\n总交易单数,应结订单总金额,手续费总金额,订单总金额\n1,0.01,0.00,0.01`,
        ),
      };
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: "order-refunded",
          payAmount: 0.01,
          payMethod: "WECHAT",
          payTransactionId: "wx-transaction-refunded",
          status: "REFUNDED",
        },
      ]);
      mockPrisma.reconciliationRecord.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({ id: "r-refunded", ...data }),
      );
      const service = new FinanceService(mockPrisma, mockWechatPay as any);

      const result = await service.triggerReconciliation({
        source: "WECHAT",
        billDate: "2026-08-09",
      });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ["PAID", "SHIPPED", "COMPLETED", "REFUNDED"] },
            payMethod: "WECHAT",
          }),
        }),
      );
      expect(mockWechatPay.downloadTradeBill).toHaveBeenCalledWith({
        billDate: "2026-08-09",
        billType: "SUCCESS",
      });
      expect(result).toEqual(expect.objectContaining({
        status: "MATCHED",
        totalAmount: 0.01,
        diffCount: 0,
      }));
    });

    it("按 GX 商户订单号匹配 UUID 订单并在 payAmount 为空时回退订单金额", async () => {
      const orderId = "0bfeca3b-1d0e-459b-980a-b70e46d1ab3e";
      const outTradeNo = "GX0bfeca3b1d0e459b980ab70e46d1ab";
      const mockWechatPay = {
        downloadTradeBill: jest.fn().mockResolvedValue(
          `商户订单号,订单金额\n${outTradeNo},0.01`,
        ),
      };
      mockPrisma.order.findMany.mockResolvedValue([{
        id: orderId,
        amount: 0.01,
        payAmount: null,
        payMethod: "WECHAT",
        payTransactionId: "wx-channel-transaction-id",
        status: "REFUNDED",
      }]);
      mockPrisma.reconciliationRecord.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({ id: "r-gx", ...data }),
      );
      const service = new FinanceService(mockPrisma, mockWechatPay as any);

      const result = await service.triggerReconciliation({
        source: "WECHAT",
        billDate: "2026-08-09",
      });

      expect(result).toEqual(expect.objectContaining({
        status: "MATCHED",
        totalAmount: 0.01,
        matchAmount: 0.01,
        diffCount: 0,
      }));
    });

    it("北京时间次日上午十点前不提前拉取尚未生成的前一日账单", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-08-11T01:00:00.000Z"));
      try {
        const mockWechatPay = {
          downloadTradeBill: jest.fn().mockResolvedValue("商户订单号,订单金额\n"),
        };
        mockPrisma.order.findMany.mockResolvedValue([]);
        mockPrisma.reconciliationRecord.create.mockImplementation(
          ({ data }: { data: Record<string, unknown> }) => ({ id: "r-cutoff", ...data }),
        );
        const service = new FinanceService(mockPrisma, mockWechatPay as any);

        await service.triggerReconciliation({ source: "WECHAT", period: "2026-08" });

        expect(mockWechatPay.downloadTradeBill).toHaveBeenCalledTimes(9);
        expect(mockWechatPay.downloadTradeBill).toHaveBeenLastCalledWith({
          billDate: "2026-08-09",
          billType: "SUCCESS",
        });
      } finally {
        jest.useRealTimers();
      }
    });

    // 🔴 假绿灯回归防护：有内部订单却拿不到渠道账单（此处未注入 wechatPay → billStatus 非 DOWNLOADED）
    //    时，绝不能判 MATCHED，必须 PENDING 待人工核。回显 create 的 data 才能断言真实计算的 status。
    it("有内部订单但无账单可比对时判 PENDING（不生成假绿灯 MATCHED）", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: "o1", payAmount: 99, payMethod: "WECHAT", payTransactionId: "tx1" },
        { id: "o2", payAmount: 49, payMethod: "WECHAT", payTransactionId: "tx2" },
      ]);
      mockPrisma.reconciliationRecord.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ id: "r1", ...data }));
      const result = await svc.triggerReconciliation({ source: "WECHAT", billDate: "2026-05-10" });
      expect(result.status).toBe("PENDING");
    });

    // 内部当天零订单、也无账单 → 无可对内容，不算异常，判 PENDING（billUsable=false）
    it("零订单且无账单时判 PENDING", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRecord.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ id: "r2", ...data }));
      const result = await svc.triggerReconciliation({ source: "WECHAT", billDate: "2026-05-10" });
      expect(result.status).toBe("PENDING");
    });
  });

  describe("getReconciliationList", () => {
    it("分页查询对账记录", async () => {
      mockPrisma.reconciliationRecord.findMany.mockResolvedValue([{ id: "r1", source: "WECHAT" }]);
      mockPrisma.reconciliationRecord.count.mockResolvedValue(1);
      const result = await svc.getReconciliationList({ page: 1, pageSize: 20 });
      expect(result.records).toHaveLength(1);
    });

    it("按渠道和状态筛选", async () => {
      mockPrisma.reconciliationRecord.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRecord.count.mockResolvedValue(0);
      const result = await svc.getReconciliationList({ source: "WECHAT", status: "MATCHED", page: 1, pageSize: 20 });
      expect(result.total).toBe(0);
    });
  });

  describe("getReconciliationDetail", () => {
    it("返回对账详情", async () => {
      mockPrisma.reconciliationRecord.findUnique.mockResolvedValue({ id: "r1", source: "WECHAT", detail: {} });
      const result = await svc.getReconciliationDetail("r1");
      expect(result.id).toBe("r1");
    });

    it("对账记录不存在抛出异常", async () => {
      mockPrisma.reconciliationRecord.findUnique.mockResolvedValue(null);
      await expect(svc.getReconciliationDetail("invalid")).rejects.toThrow(BusinessException);
    });
  });

  // ─── 2. 发票管理 ───

  describe("createInvoice", () => {
    it("创建发票申请成功", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1" });
      mockPrisma.invoice.create.mockResolvedValue({ id: "inv1", orderId: "o1", type: "PERSONAL" });
      const result = await svc.createInvoice({ orderId: "o1", type: "PERSONAL", title: "张三", amount: 99 });
      expect(result.type).toBe("PERSONAL");
    });

    it("订单不存在抛出异常", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(svc.createInvoice({ orderId: "invalid", type: "PERSONAL", title: "x", amount: 99 })).rejects.toThrow(BusinessException);
    });
  });

  describe("createMyInvoice", () => {
    beforeEach(() => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({ id: "inv-user-1", status: "PENDING" });
    });

    it("仅按服务端实付金额创建用户发票", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "COMPLETED", amount: 120, payAmount: 99,
      });
      await svc.createMyInvoice("u1", "o1", "PERSONAL", " 张三 ");
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", orderId: "o1", title: "张三", amount: 99 }),
      }));
    });

    it("拒绝给他人订单申请发票", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "other", status: "COMPLETED", amount: 99, payAmount: 99,
      });
      await expect(svc.createMyInvoice("u1", "o1", "PERSONAL", "张三")).rejects.toThrow(BusinessException);
    });

    it("拒绝未完成订单申请发票", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "PAID", amount: 99, payAmount: 99,
      });
      await expect(svc.createMyInvoice("u1", "o1", "PERSONAL", "张三")).rejects.toThrow(BusinessException);
    });

    it("拒绝同一订单重复申请有效发票", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "COMPLETED", amount: 99, payAmount: 99,
      });
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: "existing" });
      await expect(svc.createMyInvoice("u1", "o1", "PERSONAL", "张三")).rejects.toThrow(BusinessException);
    });

    it("企业发票缺少税号时拒绝", async () => {
      await expect(svc.createMyInvoice("u1", "o1", "COMPANY", "某某公司")).rejects.toThrow(BusinessException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("issueInvoice", () => {
    it("开具发票成功", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({ id: "inv1", status: "PENDING" });
      mockPrisma.invoice.update.mockResolvedValue({ id: "inv1", status: "ISSUED", invoiceUrl: "https://..." });
      const result = await svc.issueInvoice("inv1", "https://...");
      expect(result.status).toBe("ISSUED");
    });

    it("发票不存在抛出异常", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(null);
      await expect(svc.issueInvoice("invalid", "url")).rejects.toThrow(BusinessException);
    });

    it("非PENDING状态无法开具", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({ id: "inv1", status: "ISSUED" });
      await expect(svc.issueInvoice("inv1", "url")).rejects.toThrow(BusinessException);
    });
  });

  describe("mailInvoice", () => {
    it("标记邮寄成功", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({ id: "inv1", status: "ISSUED" });
      mockPrisma.invoice.update.mockResolvedValue({ id: "inv1", status: "MAILED", expressNo: "SF123" });
      const result = await svc.mailInvoice("inv1", "SF123");
      expect(result.status).toBe("MAILED");
    });

    it("非ISSUED状态无法邮寄", async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue({ id: "inv1", status: "PENDING" });
      await expect(svc.mailInvoice("inv1", "SF123")).rejects.toThrow(BusinessException);
    });
  });

  // ─── 3. 结算单 ───

  describe("generateSettlement", () => {
    it("生成结算单成功", async () => {
      mockPrisma.settlementOrder.findFirst.mockResolvedValue(null);
      mockPrisma.userEarning.findMany.mockResolvedValue([
        { id: "e1", scene: "ARTICLE_READ", amountRmb: 100, amountCoin: 0 },
      ]);
      mockPrisma.stationEarning.findMany.mockResolvedValue([
        { id: "se1", type: "STATION_SHARE", earned: 50 },
      ]);
      mockPrisma.settlementOrder.create.mockResolvedValue({
        id: "s1", userId: "u1", period: "2026-05", amount: 150, status: "PENDING",
      });
      const result = await svc.generateSettlement({ userId: "u1", period: "2026-05" });
      expect(result.status).toBe("PENDING");
    });

    it("结算单已存在抛出异常", async () => {
      mockPrisma.settlementOrder.findFirst.mockResolvedValue({ id: "s1" });
      await expect(svc.generateSettlement({ userId: "u1", period: "2026-05" })).rejects.toThrow(BusinessException);
    });
  });

  describe("approveSettlement", () => {
    it("审批结算单成功（CAS 翻转）", async () => {
      mockPrisma.settlementOrder.findUnique
        .mockResolvedValueOnce({ id: "s1", userId: "u1", status: "PENDING" })
        .mockResolvedValueOnce({ id: "s1", userId: "u1", status: "APPROVED", approvedBy: "admin1" });
      mockPrisma.settlementOrder.updateMany.mockResolvedValue({ count: 1 });
      const result: any = await svc.approveSettlement("s1", "admin1");
      expect(result.status).toBe("APPROVED");
      expect(mockPrisma.settlementOrder.updateMany.mock.calls[0][0].where.status).toBe("PENDING");
    });

    it("非PENDING状态无法审批", async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({ id: "s1", userId: "u1", status: "APPROVED" });
      await expect(svc.approveSettlement("s1", "admin1")).rejects.toThrow(BusinessException);
    });

    it("并发下 CAS 抢占失败抛错（TOCTOU 防护）", async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({ id: "s1", userId: "u1", status: "PENDING" });
      mockPrisma.settlementOrder.updateMany.mockResolvedValue({ count: 0 });
      await expect(svc.approveSettlement("s1", "admin1")).rejects.toThrow(BusinessException);
    });

    it("不能审批自己的结算单（防自审自批）", async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({ id: "s1", userId: "u1", status: "PENDING" });
      await expect(svc.approveSettlement("s1", "u1")).rejects.toThrow(BusinessException);
    });
  });

  describe("paySettlement", () => {
    it("打款成功（payoutRef 必填·四眼通过·流水号写入 detail）", async () => {
      mockPrisma.settlementOrder.findUnique
        .mockResolvedValueOnce({ id: "s1", userId: "u1", status: "APPROVED", approvedBy: "admin2", detail: { summary: {} } })
        .mockResolvedValueOnce({ id: "s1", status: "PAID" });
      mockPrisma.settlementOrder.findFirst.mockResolvedValue(null); // 流水号查重
      mockPrisma.settlementOrder.updateMany.mockResolvedValue({ count: 1 });
      const result: any = await svc.paySettlement("s1", "admin1", "BANK20260717001");
      expect(result.status).toBe("PAID");
      const call = mockPrisma.settlementOrder.updateMany.mock.calls[0][0];
      expect(call.where.status).toBe("APPROVED");
      expect(call.data.detail.payoutRef).toBe("BANK20260717001");
      expect(call.data.detail.paidBy).toBe("admin1");
    });

    it("缺打款流水号直接拒绝（不再允许 MANUAL 占位）", async () => {
      await expect(svc.paySettlement("s1", "admin1")).rejects.toThrow("流水号");
    });

    it("审批人不能同时打款（四眼原则）", async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({ id: "s1", userId: "u1", status: "APPROVED", approvedBy: "admin1" });
      await expect(svc.paySettlement("s1", "admin1", "BANK1")).rejects.toThrow(BusinessException);
    });

    it("同一流水号不可用于两张结算单（防重复打款）", async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({ id: "s1", userId: "u1", status: "APPROVED", approvedBy: "admin2", detail: {} });
      mockPrisma.settlementOrder.findFirst.mockResolvedValue({ id: "s-other" });
      await expect(svc.paySettlement("s1", "admin1", "BANK-DUP")).rejects.toThrow("疑似重复打款");
    });

    it("非APPROVED状态无法打款", async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({ id: "s1", userId: "u1", status: "PENDING" });
      await expect(svc.paySettlement("s1", "admin1", "BANK1")).rejects.toThrow(BusinessException);
    });

    it("不能给自己的结算单打款（防自审自批）", async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({ id: "s1", userId: "u1", status: "APPROVED" });
      await expect(svc.paySettlement("s1", "u1", "BANK1")).rejects.toThrow(BusinessException);
    });
  });

  // ─── 4. 提现审批 ───

  describe("approveWithdrawal", () => {
    it("批准提现成功", async () => {
      mockPrisma.withdrawalApplication.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", status: "APPROVED" });
      const result = await svc.approveWithdrawal("w1", "admin1");
      expect(result?.status).toBe("APPROVED");
    });

    it("非PENDING状态无法批准（原子拦截）", async () => {
      mockPrisma.withdrawalApplication.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", status: "APPROVED" });
      await expect(svc.approveWithdrawal("w1", "admin1")).rejects.toThrow(BusinessException);
    });

    it("不能审批自己的提现（防自审自批）", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", status: "PENDING" });
      await expect(svc.approveWithdrawal("w1", "u1")).rejects.toThrow(BusinessException);
    });

    // 🔴 假冻结修复：Order.frozenAmount 此前零消费；现在冻结中的用户提现不予通过
    it("用户有风控冻结资金时不予通过审批", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", status: "PENDING" });
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { frozenAmount: 500 } });
      await expect(svc.approveWithdrawal("w1", "admin1")).rejects.toThrow("冻结");
      expect(mockPrisma.withdrawalApplication.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("rejectWithdrawal", () => {
    it("驳回提现成功", async () => {
      mockPrisma.withdrawalApplication.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", status: "REJECTED", reviewNote: "资料不全" });
      const result = await svc.rejectWithdrawal("w1", "admin1", "资料不全");
      expect(result?.status).toBe("REJECTED");
    });
  });

  describe("confirmWithdrawalPay", () => {
    it("确认打款成功（payoutRef 必填）", async () => {
      mockPrisma.withdrawalApplication.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", reviewedBy: "admin2", status: "PAID" });
      const result = await svc.confirmWithdrawalPay("w1", "admin1", "WX20260717001");
      expect(result?.status).toBe("PAID");
    });

    it("缺打款流水号直接拒绝（不再允许 MANUAL 占位）", async () => {
      await expect(svc.confirmWithdrawalPay("w1", "admin1")).rejects.toThrow("流水号");
      expect(mockPrisma.withdrawalApplication.updateMany).not.toHaveBeenCalled();
    });

    it("同一流水号不可用于两笔提现（防重复打款）", async () => {
      // 第一次 findUnique(by id) 返回本单，第二次 findUnique(by payoutRef) 命中另一笔
      mockPrisma.withdrawalApplication.findUnique
        .mockResolvedValueOnce({ id: "w1", userId: "u1", reviewedBy: "admin2", status: "APPROVED" })
        .mockResolvedValueOnce({ id: "w-other" });
      await expect(svc.confirmWithdrawalPay("w1", "admin1", "REF-DUP")).rejects.toThrow("疑似重复打款");
    });

    it("非APPROVED状态无法打款（原子拦截）", async () => {
      mockPrisma.withdrawalApplication.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", reviewedBy: "admin2", status: "PENDING" });
      await expect(svc.confirmWithdrawalPay("w1", "admin1", "REF1")).rejects.toThrow(BusinessException);
    });

    it("不能给自己的提现打款（防自审自批）", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", status: "APPROVED" });
      await expect(svc.confirmWithdrawalPay("w1", "u1", "REF1")).rejects.toThrow(BusinessException);
    });

    // 🔴 四眼原则：审批人不得同时打款，防单人一手审批一手放款套现
    it("审批人不能同时打款（四眼原则）", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", reviewedBy: "admin1", status: "APPROVED" });
      await expect(svc.confirmWithdrawalPay("w1", "admin1", "REF1")).rejects.toThrow(BusinessException);
    });

    it("用户有风控冻结资金时不予打款", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", reviewedBy: "admin2", status: "APPROVED" });
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { frozenAmount: 100 } });
      await expect(svc.confirmWithdrawalPay("w1", "admin1", "REF1")).rejects.toThrow("冻结");
      expect(mockPrisma.withdrawalApplication.updateMany).not.toHaveBeenCalled();
    });

    it("手动打款写入 payoutRef 便于对账追溯", async () => {
      mockPrisma.withdrawalApplication.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", reviewedBy: "admin2", status: "PAID" });
      await svc.confirmWithdrawalPay("w1", "admin1", "ALIPAY-XYZ");
      const call = mockPrisma.withdrawalApplication.updateMany.mock.calls[0][0];
      expect(call.data.payoutRef).toBe("ALIPAY-XYZ");
    });
  });

  describe("revealWithdrawalPayoutAccount", () => {
    it("APPROVED 状态先写审计成功后返回明文账户", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({
        id: "w1", userId: "u1", status: "APPROVED", amount: 100, actualAmount: 97,
        payMethod: "BANK", accountInfo: { bankNo: "6222000011112222", holder: "张三" },
      });
      const result = await svc.revealWithdrawalPayoutAccount("w1", "admin1");
      expect((result.accountInfo as any).bankNo).toBe("6222000011112222");
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.auditLog.create.mock.calls[0][0].data.action).toBe("REVEAL_PAYOUT_ACCOUNT");
    });

    it("审计写入失败则拒绝返回明文（宁可打不了款）", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({
        id: "w1", userId: "u1", status: "APPROVED", amount: 100, actualAmount: 97, accountInfo: {},
      });
      mockPrisma.auditLog.create.mockRejectedValue(new Error("db down"));
      await expect(svc.revealWithdrawalPayoutAccount("w1", "admin1")).rejects.toThrow("db down");
    });

    it("不能查看自己提现的收款账户（防自取）", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", status: "APPROVED" });
      await expect(svc.revealWithdrawalPayoutAccount("w1", "u1")).rejects.toThrow(BusinessException);
    });

    it("非 APPROVED 状态不暴露账户", async () => {
      mockPrisma.withdrawalApplication.findUnique.mockResolvedValue({ id: "w1", userId: "u1", status: "PENDING" });
      await expect(svc.revealWithdrawalPayoutAccount("w1", "admin1")).rejects.toThrow(BusinessException);
    });
  });

  // ─── 5. 资金冻结/解冻 ───

  describe("freezeAmount", () => {
    it("冻结订单资金成功（审计记录操作人）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 200, amount: 200 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      const result = await svc.freezeAmount({ orderId: "o1", amount: 99, reason: "可疑交易" }, "admin1");
      expect(result.frozenAmount).toBe(99);
      expect(mockPrisma.auditLog.create.mock.calls[0][0].data.userId).toBe("admin1");
    });

    it("冻结金额不得超过订单实付（上限校验）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 50, amount: 50 });
      await expect(svc.freezeAmount({ orderId: "o1", amount: 99 }, "admin1")).rejects.toThrow("超过订单实付");
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("冻结金额必须大于0", async () => {
      await expect(svc.freezeAmount({ orderId: "o1", amount: 0 }, "admin1")).rejects.toThrow(BusinessException);
    });

    it("订单不存在抛出异常", async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(svc.freezeAmount({ orderId: "invalid", amount: 99 }, "admin1")).rejects.toThrow(BusinessException);
    });

    it("非PAID状态无法冻结", async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PENDING", frozenAmount: null, payAmount: 200 });
      await expect(svc.freezeAmount({ orderId: "o1", amount: 99 }, "admin1")).rejects.toThrow(BusinessException);
    });

    it("已有冻结金额无法重复冻结", async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID", frozenAmount: 50, payAmount: 200 });
      await expect(svc.freezeAmount({ orderId: "o1", amount: 99 }, "admin1")).rejects.toThrow(BusinessException);
    });
  });

  describe("unfreezeAmount", () => {
    it("解冻订单资金成功（审计记录操作人）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", frozenAmount: 99 });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      const result = await svc.unfreezeAmount({ orderId: "o1" }, "admin1");
      expect(result.success).toBe(true);
      expect(mockPrisma.auditLog.create.mock.calls[0][0].data.userId).toBe("admin1");
    });

    it("无冻结金额无法解冻", async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", frozenAmount: null });
      await expect(svc.unfreezeAmount({ orderId: "o1" }, "admin1")).rejects.toThrow(BusinessException);
    });
  });

  describe("getFreezeRecords", () => {
    it("查询冻结记录列表", async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o1", frozenAmount: 99 }]);
      mockPrisma.order.count.mockResolvedValue(1);
      const result = await svc.getFreezeRecords({ page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(1);
    });
  });

  describe("分页入参加固（P2-4 NaN 防护）", () => {
    it("getReconciliationList 传 page='abc' 时 skip 不为 NaN", async () => {
      mockPrisma.reconciliationRecord.findMany.mockResolvedValue([]);
      mockPrisma.reconciliationRecord.count.mockResolvedValue(0);
      await svc.getReconciliationList({ page: "abc" as any, pageSize: 20 });
      expect(Number.isNaN(mockPrisma.reconciliationRecord.findMany.mock.calls[0][0].skip)).toBe(false);
    });
  });

  // ─── 6. 财务报表 ───

  describe("getMonthlyReport", () => {
    it("返回已有月报", async () => {
      mockPrisma.financialReport.findUnique.mockResolvedValue({
        id: "r1", type: "MONTHLY", period: "2026-05", data: { revenue: 10000 },
      });
      const result: any = await svc.getMonthlyReport("2026-05");
      expect(result.data.revenue).toBe(10000);
    });

    it("无月报时实时生成", async () => {
      mockPrisma.financialReport.findUnique.mockResolvedValue(null);
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { payAmount: 5000 }, _count: 10 })
        .mockResolvedValueOnce({ _sum: { payAmount: 200 }, _count: 1 });
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 300 }, _count: 5 });
      mockPrisma.userEarning.aggregate.mockResolvedValue({ _sum: { amountRmb: 100, amountCoin: 50 }, _count: 3 });
      const result: any = await svc.getMonthlyReport("2026-05");
      expect(result.revenue).toBe(5000);
      expect(result.netProfit).toBe(5000 - 200 - 300 - 100);
    });
  });
});
