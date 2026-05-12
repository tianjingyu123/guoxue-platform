import { Test } from "@nestjs/testing";
import { MerchantAdminController } from "./merchant-admin.controller";
import { MerchantService } from "./merchant.service";
import { MerchantDepositService } from "./merchant-deposit.service";
import { MerchantAgreementService } from "./merchant-agreement.service";
import { MerchantSettlementService } from "./merchant-settlement.service";
import { RolesGuard } from "../../common/roles.guard";

const mockMerchantSvc = {
  listMerchants: jest.fn().mockResolvedValue({ list: [{ id: "m1", shopName: "店铺A" }], total: 1, page: 1, pageSize: 20 }),
  getMerchantById: jest.fn().mockResolvedValue({ id: "m1", shopName: "店铺A", user: { nickname: "张三" }, violations: [], depositRecords: [] }),
  getMerchantStats: jest.fn().mockResolvedValue({ totalSales: 5000, totalOrders: 25, violationCount: 0 }),
  approveApplication: jest.fn().mockResolvedValue({ id: "m1", status: "DEPOSIT_PENDING" }),
  rejectApplication: jest.fn().mockResolvedValue({ id: "m1", status: "REVIEW_FAILED", rejectReason: "资质不全" }),
  updateMerchantStatus: jest.fn().mockResolvedValue({ id: "m1", status: "SUSPENDED" }),
  listViolations: jest.fn().mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 }),
  createViolation: jest.fn().mockResolvedValue({ id: "v1", merchantId: "m1", type: "MINOR" }),
  handleViolation: jest.fn().mockResolvedValue({ id: "v1", status: "CONFIRMED" }),
};
const mockDepositSvc = {
  listDepositRecords: jest.fn().mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 }),
  refundDeposit: jest.fn().mockResolvedValue({ id: "dr1", type: "REFUND", amount: 2000, status: "SUCCESS" }),
  adjustDeposit: jest.fn().mockResolvedValue({ id: "m1", depositAmount: 3000 }),
};
const mockAgreementSvc = {
  listAgreements: jest.fn().mockResolvedValue({ list: [], total: 0 }),
  createAgreement: jest.fn().mockResolvedValue({ id: "a1", version: "1.0", title: "协议" }),
  updateAgreement: jest.fn().mockResolvedValue({ id: "a1", title: "新协议" }),
  deleteAgreement: jest.fn().mockResolvedValue(undefined),
};
const mockSettlementSvc = {
  setCommissionRate: jest.fn().mockResolvedValue({ id: "m1", commissionRate: 0.9 }),
  listSettlements: jest.fn().mockResolvedValue({ list: [], total: 0 }),
};

describe("MerchantAdminController", () => {
  let ctrl: MerchantAdminController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [MerchantAdminController],
      providers: [
        { provide: MerchantService, useValue: mockMerchantSvc },
        { provide: MerchantDepositService, useValue: mockDepositSvc },
        { provide: MerchantAgreementService, useValue: mockAgreementSvc },
        { provide: MerchantSettlementService, useValue: mockSettlementSvc },
      ],
    })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(MerchantAdminController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  const mockReq = () => ({ user: { id: "admin1" } } as any);

  it("GET /admin/merchants — 商家列表", async () => {
    const result = await ctrl.listMerchants({});
    expect(result.list).toHaveLength(1);
  });

  it("GET /admin/merchants/:id — 商家详情", async () => {
    const result = await ctrl.getMerchant("m1");
    expect(result.shopName).toBe("店铺A");
  });

  it("GET /admin/merchants/:id/stats — 商家统计", async () => {
    const result = await ctrl.getMerchantStats("m1");
    expect(result.totalSales).toBe(5000);
  });

  it("POST /admin/merchants/:id/approve — 审核通过", async () => {
    const result = await ctrl.approveApplication("m1", mockReq(), { depositAmount: 2000 });
    expect(result.status).toBe("DEPOSIT_PENDING");
  });

  it("POST /admin/merchants/:id/reject — 审核驳回", async () => {
    const result = await ctrl.rejectApplication("m1", mockReq(), { reason: "资质不全" });
    expect(result.status).toBe("REVIEW_FAILED");
  });

  it("PUT /admin/merchants/:id/status — 变更状态", async () => {
    const result = await ctrl.updateStatus("m1", mockReq(), { status: "SUSPENDED", reason: "违规" });
    expect(result.status).toBe("SUSPENDED");
  });

  it("GET /admin/merchants/:id/deposits — 保证金记录", async () => {
    const result = await ctrl.listDeposits("m1", {});
    expect(result.list).toHaveLength(0);
  });

  it("POST /admin/merchants/:id/violations — 创建违规记录", async () => {
    const result = await ctrl.createViolation("m1", mockReq(), { type: "MINOR", title: "测试违规", description: "描述" } as any);
    expect(result.type).toBe("MINOR");
  });

  it("PUT /admin/merchants/:id/commission — 设置分佣比例", async () => {
    const result = await ctrl.setCommissionRate("m1", { rate: 0.9 });
    expect(result.commissionRate).toBe(0.9);
  });

  it("POST /admin/merchants/agreements — 创建协议", async () => {
    const result = await ctrl.createAgreement({ version: "1.0", title: "协议", content: "<p>内容</p>" });
    expect(result.version).toBe("1.0");
  });

  it("DELETE /admin/merchants/agreements/:agreementId — 删除协议", async () => {
    await expect(ctrl.deleteAgreement("a1")).resolves.toBeUndefined();
  });
});
