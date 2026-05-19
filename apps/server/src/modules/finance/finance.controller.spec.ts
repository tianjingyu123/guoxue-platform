import { Test } from "@nestjs/testing";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { RolesGuard } from "../../common/roles.guard";

const mockSvc = {
  triggerReconciliation: jest.fn().mockResolvedValue({ id: "r1", source: "WECHAT", status: "MATCHED" }),
  getReconciliationList: jest.fn().mockResolvedValue({ records: [], total: 0, page: 1, pageSize: 20 }),
  getReconciliationDetail: jest.fn().mockResolvedValue({ id: "r1", source: "WECHAT" }),

  createInvoice: jest.fn().mockResolvedValue({ id: "inv1", type: "PERSONAL" }),
  getInvoiceList: jest.fn().mockResolvedValue({ invoices: [], total: 0, page: 1, pageSize: 20 }),
  issueInvoice: jest.fn().mockResolvedValue({ id: "inv1", status: "ISSUED" }),
  mailInvoice: jest.fn().mockResolvedValue({ id: "inv1", status: "MAILED" }),

  getSettlementList: jest.fn().mockResolvedValue({ settlements: [], total: 0, page: 1, pageSize: 20 }),
  generateSettlement: jest.fn().mockResolvedValue({ id: "s1", userId: "u1", period: "2026-05", status: "PENDING" }),
  approveSettlement: jest.fn().mockResolvedValue({ id: "s1", status: "APPROVED" }),
  paySettlement: jest.fn().mockResolvedValue({ id: "s1", status: "PAID" }),

  getWithdrawalList: jest.fn().mockResolvedValue({ withdrawals: [], total: 0, page: 1, pageSize: 20 }),
  approveWithdrawal: jest.fn().mockResolvedValue({ id: "w1", status: "APPROVED" }),
  rejectWithdrawal: jest.fn().mockResolvedValue({ id: "w1", status: "REJECTED" }),
  confirmWithdrawalPay: jest.fn().mockResolvedValue({ id: "w1", status: "PAID" }),

  freezeAmount: jest.fn().mockResolvedValue({ success: true, orderId: "o1", frozenAmount: 99 }),
  unfreezeAmount: jest.fn().mockResolvedValue({ success: true, orderId: "o1" }),
  getFreezeRecords: jest.fn().mockResolvedValue({ items: [], total: 0 }),

  getMonthlyReport: jest.fn().mockResolvedValue({ data: { revenue: 10000 }, period: "2026-05" } as any),
  generateMonthlyReport: jest.fn().mockResolvedValue({ id: "fr1", type: "MONTHLY", period: "2026-05" }),
};

describe("FinanceController", () => {
  let ctrl: FinanceController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        { provide: FinanceService, useValue: mockSvc },
      ],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(FinanceController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const mockReq = () => ({ user: { id: "admin1" } } as any);

  // ─── 对账 ───

  it("POST /finance/reconciliation — 触发对账", async () => {
    const result = await ctrl.triggerReconciliation({ source: "WECHAT", billDate: "2026-05-10" });
    expect(result.status).toBe("MATCHED");
  });

  it("GET /finance/reconciliation — 对账列表", async () => {
    const result = await ctrl.getReconciliationList();
    expect(result.records).toHaveLength(0);
  });

  it("GET /finance/reconciliation/:id — 对账详情", async () => {
    const result = await ctrl.getReconciliationDetail("r1");
    expect(result.source).toBe("WECHAT");
  });

  // ─── 发票 ───

  it("POST /finance/invoices — 创建发票", async () => {
    const result = await ctrl.createInvoice({ orderId: "o1", type: "PERSONAL", title: "张三", amount: 99 });
    expect(result.type).toBe("PERSONAL");
  });

  it("GET /finance/invoices — 发票列表", async () => {
    const result = await ctrl.getInvoiceList();
    expect(result.invoices).toHaveLength(0);
  });

  it("PUT /finance/invoices/:id/issue — 开具发票", async () => {
    const result = await ctrl.issueInvoice("inv1", { invoiceUrl: "https://..." });
    expect(result.status).toBe("ISSUED");
  });

  it("PUT /finance/invoices/:id/mail — 标记邮寄", async () => {
    const result = await ctrl.mailInvoice("inv1", { expressNo: "SF123" });
    expect(result.status).toBe("MAILED");
  });

  // ─── 结算 ───

  it("GET /finance/settlements — 结算列表", async () => {
    const result = await ctrl.getSettlementList();
    expect(result.settlements).toHaveLength(0);
  });

  it("POST /finance/settlements/generate — 生成结算单", async () => {
    const result = await ctrl.generateSettlement({ userId: "u1", period: "2026-05" });
    expect(result.period).toBe("2026-05");
  });

  it("PUT /finance/settlements/:id/approve — 审批结算", async () => {
    const result = await ctrl.approveSettlement("s1", mockReq());
    expect(result.status).toBe("APPROVED");
  });

  it("PUT /finance/settlements/:id/pay — 打款结算", async () => {
    const result = await ctrl.paySettlement("s1");
    expect(result.status).toBe("PAID");
  });

  // ─── 提现 ───

  it("GET /finance/withdrawals — 提现列表", async () => {
    const result = await ctrl.getWithdrawalList();
    expect(result.withdrawals).toHaveLength(0);
  });

  it("PUT /finance/withdrawals/:id/approve — 批准提现", async () => {
    const result = await ctrl.approveWithdrawal("w1", {}, mockReq());
    expect(result.status).toBe("APPROVED");
  });

  it("PUT /finance/withdrawals/:id/reject — 驳回提现", async () => {
    const result = await ctrl.rejectWithdrawal("w1", { reviewNote: "资料不全" }, mockReq());
    expect(result.status).toBe("REJECTED");
  });

  it("POST /finance/withdrawals/:id/pay — 确认打款", async () => {
    const result = await ctrl.confirmWithdrawalPay("w1");
    expect(result.status).toBe("PAID");
  });

  // ─── 冻结/解冻 ───

  it("POST /finance/freeze — 冻结资金", async () => {
    const result = await ctrl.freezeAmount({ orderId: "o1", amount: 99 });
    expect(result.frozenAmount).toBe(99);
  });

  it("POST /finance/unfreeze — 解冻资金", async () => {
    const result = await ctrl.unfreezeAmount({ orderId: "o1" });
    expect(result.success).toBe(true);
  });

  it("GET /finance/freeze-records — 冻结记录", async () => {
    const result = await ctrl.getFreezeRecords();
    expect(result.items).toHaveLength(0);
  });

  // ─── 报表 ───

  it("GET /finance/reports/monthly — 月报数据", async () => {
    const result = await ctrl.getMonthlyReport("2026-05");
    expect((result as any).data.revenue).toBe(10000);
  });

  it("POST /finance/reports/monthly/generate — 生成月报", async () => {
    const result = await ctrl.generateMonthlyReport("2026-05", mockReq());
    expect(result.id).toBe("fr1");
  });
});
