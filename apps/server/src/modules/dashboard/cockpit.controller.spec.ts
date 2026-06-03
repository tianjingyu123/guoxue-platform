import { Test } from "@nestjs/testing";
import { CanActivate } from "@nestjs/common";
import { CockpitController } from "./cockpit.controller";
import { CockpitService } from "./cockpit.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockService: Record<string, jest.Mock> = {
  getOverview: jest.fn(),
  getRevenueComposition: jest.fn(),
  getUserGrowth: jest.fn(),
  getBusinessTrends: jest.fn(),
  getAlerts: jest.fn(),
  getRankings: jest.fn(),
};

const mockGuard: CanActivate = { canActivate: () => true };

describe("CockpitController", () => {
  let ctrl: CockpitController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CockpitController],
      providers: [{ provide: CockpitService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockGuard)
      .compile();
    ctrl = mod.get(CockpitController);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(ctrl).toBeDefined());

  it("核心指标概览", async () => {
    mockService.getOverview.mockResolvedValue({ gmv: 50000, activeUsers: 1200, payingUsers: 300 });
    const result: any = await ctrl.getOverview();
    expect(result.gmv).toBe(50000);
  });

  it("收入构成", async () => {
    mockService.getRevenueComposition.mockResolvedValue({ course: 60, shop: 20, member: 15, reward: 5 });
    const result: any = await ctrl.getRevenueComposition();
    expect(result.course).toBe(60);
  });

  it("用户增长数据", async () => {
    mockService.getUserGrowth.mockResolvedValue({ newUsers: [10, 15, 20], cost: [100, 150, 200] });
    const result: any = await ctrl.getUserGrowth();
    expect(result.newUsers).toHaveLength(3);
  });

  it("各业务线收入趋势", async () => {
    mockService.getBusinessTrends.mockResolvedValue({ course: [1000, 1200], shop: [500, 600] });
    const result: any = await ctrl.getBusinessTrends();
    expect(result.course).toHaveLength(2);
  });

  it("异常预警", async () => {
    mockService.getAlerts.mockResolvedValue([{ type: "payment_failure", count: 3 }]);
    const result: any = await ctrl.getAlerts();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("payment_failure");
  });

  it("排行榜", async () => {
    mockService.getRankings.mockResolvedValue({ hotCourses: [], activeCircles: [], topPromoters: [], topStations: [] });
    const result: any = await ctrl.getRankings();
    expect(result.hotCourses).toHaveLength(0);
  });
});
