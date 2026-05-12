import { Test } from "@nestjs/testing";
import { RevenueController } from "./revenue.controller";
import { RevenueService } from "./revenue.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";

const mockRevenueSvc = {
  getUserSummary: jest.fn().mockResolvedValue({ total: 5000, pending: 200 }),
  getUserEarnings: jest.fn().mockResolvedValue([{ id: "e1", amount: 100 }]),
  getPlatformOverview: jest.fn().mockResolvedValue({ totalRevenue: 50000, totalOrders: 200 }),
  getRevenueTrends: jest.fn().mockResolvedValue([{ date: "2025-06-01", amount: 2000 }]),
  getRevenueStats: jest.fn().mockResolvedValue({ total: 5000, course: 3000, consultation: 2000 }),
  getRevenueBreakdown: jest.fn().mockResolvedValue([{ type: "course", amount: 3000 }]),
};

describe("RevenueController", () => {
  let ctrl: RevenueController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [RevenueController],
      providers: [{ provide: RevenueService, useValue: mockRevenueSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(RevenueController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("GET /revenue/summary — 我的收益汇总", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.summary(req);
    expect(result.total).toBe(5000);
    expect(mockRevenueSvc.getUserSummary).toHaveBeenCalledWith("u1");
  });

  it("GET /revenue/earnings — 收益明细", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.earnings(req, "1" as any, "20" as any);
    expect(result).toHaveLength(1);
    expect(mockRevenueSvc.getUserEarnings).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("GET /revenue/platform/overview — 平台营收总览", async () => {
    const result: any = await ctrl.platformOverview();
    expect(result.totalRevenue).toBe(50000);
    expect(mockRevenueSvc.getPlatformOverview).toHaveBeenCalled();
  });

  it("GET /revenue/platform/trends — 营收趋势", async () => {
    const result: any = await ctrl.platformTrends("7" as any);
    expect(result).toHaveLength(1);
    expect(mockRevenueSvc.getRevenueTrends).toHaveBeenCalledWith(7);
  });

  it("GET /revenue/stats — 收入统计", async () => {
    const result: any = await ctrl.revenueStats("u1", "2026-05");
    expect(result.total).toBe(5000);
    expect(mockRevenueSvc.getRevenueStats).toHaveBeenCalledWith("u1", "2026-05");
  });

  it("GET /revenue/breakdown — 收入分类明细", async () => {
    const result: any = await ctrl.revenueBreakdown("u1", "2026-05");
    expect(result).toHaveLength(1);
    expect(mockRevenueSvc.getRevenueBreakdown).toHaveBeenCalledWith("u1", "2026-05");
  });
});
