import { Test } from "@nestjs/testing";
import { CommissionController } from "./commission.controller";
import { CommissionService } from "./commission.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockCommissionSvc = {
  getAllConfigs: jest.fn().mockResolvedValue([{ key: "course", rate: 0.3 }]),
  updateConfig: jest.fn().mockResolvedValue({ key: "course", rate: 0.4 }),
  getStationEarnings: jest.fn().mockResolvedValue([{ amount: 100 }]),
  getStationBalance: jest.fn().mockResolvedValue({ available: 5000, frozen: 200 }),
  applyWithdrawal: jest.fn().mockResolvedValue({ id: "w1", amount: 1000 }),
  getUserWithdrawals: jest.fn().mockResolvedValue([{ id: "w1", amount: 1000 }]),
  listWithdrawals: jest.fn().mockResolvedValue([{ id: "w1", amount: 1000, status: "PENDING" }]),
  auditWithdrawal: jest.fn().mockResolvedValue({ id: "w1", status: "APPROVED" }),
  createReferralLink: jest.fn().mockResolvedValue({ code: "REF001", url: "https://..." }),
  getReferralLinks: jest.fn().mockResolvedValue([{ code: "REF001", clicks: 50 }]),
  trackClick: jest.fn().mockResolvedValue({ tracked: true }),
  getCommissionConfig: jest.fn().mockResolvedValue({ course: 0.3, product: 0.1 }),
  updateCommissionConfig: jest.fn().mockResolvedValue({ type: "course", rate: 0.4 }),
};

describe("CommissionController", () => {
  let ctrl: CommissionController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CommissionController],
      providers: [{ provide: CommissionService, useValue: mockCommissionSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(CommissionController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /commission/configs — 所有分佣配置", async () => {
    const result: any = await ctrl.getAllConfigs();
    expect(result).toHaveLength(1);
  });

  it("PUT /commission/configs/:key — 更新配置", async () => {
    const dto: any = { rate: 0.4 };
    const result: any = await ctrl.updateConfig("course", dto);
    expect(result.rate).toBe(0.4);
  });

  it("GET /commission/station-earnings/:stationId — 分站收益", async () => {
    const result: any = await ctrl.getStationEarnings("s1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("GET /commission/station-balance/:stationId — 分站余额", async () => {
    const result: any = await ctrl.getStationBalance("s1");
    expect(result.available).toBe(5000);
  });

  it("POST /commission/withdrawal — 申请提现", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { amount: 1000 };
    const result: any = await ctrl.applyWithdrawal(req, dto);
    expect(result.amount).toBe(1000);
  });

  it("GET /commission/withdrawals — 我的提现记录", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listMyWithdrawals(req, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("GET /commission/admin/withdrawals — 所有提现记录", async () => {
    const result: any = await ctrl.listAllWithdrawals(1 as any, 20 as any, "PENDING");
    expect(result).toHaveLength(1);
  });

  it("PUT /commission/admin/withdrawals/:id — 审核提现", async () => {
    const dto: any = { status: "APPROVED", remark: "已打款" };
    const result: any = await ctrl.auditWithdrawal("w1", dto);
    expect(result.status).toBe("APPROVED");
  });

  it("POST /commission/referral-link — 创建推荐链接", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "推广A" };
    const result: any = await ctrl.createReferralLink(req, dto);
    expect(result.code).toBe("REF001");
  });

  it("GET /commission/referral-links — 推荐链接列表", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getReferralLinks(req);
    expect(result).toHaveLength(1);
  });

  it("GET /commission/track/:code — 跟踪点击", async () => {
    const result: any = await ctrl.trackClick("REF001");
    expect(result.tracked).toBe(true);
  });

  it("GET /commission/config — 分佣配置总览", async () => {
    const result: any = await ctrl.getCommissionConfig();
    expect(result.course).toBe(0.3);
  });

  it("PUT /commission/config — 更新分佣比例", async () => {
    const dto = { type: "course", rate: 0.4 };
    const result: any = await ctrl.updateCommissionConfig(dto);
    expect(result.rate).toBe(0.4);
  });
});
