import { Test, TestingModule } from "@nestjs/testing";
import { StationDashboardService } from "./station-dashboard.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  stationEarning: { aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  order: { findMany: jest.fn() },
  configSystem: { findFirst: jest.fn() },
};

describe("StationDashboardService", () => {
  let svc: StationDashboardService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [StationDashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(StationDashboardService);
    jest.clearAllMocks();
  });

  it("应被定义", () => expect(svc).toBeDefined());

  describe("getOverview", () => {
    it("返回本月核心指标", async () => {
      mockPrisma.stationEarning.aggregate.mockResolvedValue({
        _sum: { earned: 5000, amount: 10000 }, _count: 25,
      });
      const result = await svc.getOverview("s1");
      expect(result.monthEarned).toBe(5000);
      expect(result.monthOrders).toBe(25);
    });
  });

  describe("getTrends", () => {
    it("返回近30天日聚合趋势", async () => {
      mockPrisma.stationEarning.findMany.mockResolvedValue([
        { earned: 100, createdAt: new Date() },
        { earned: 200, createdAt: new Date() },
      ]);
      const result = await svc.getTrends("s1");
      expect(result.trends.length).toBeGreaterThan(0);
    });
  });

  describe("getLinkRanking", () => {
    it("按类型聚合收益排名", async () => {
      mockPrisma.stationEarning.groupBy.mockResolvedValue([
        { type: "course", _sum: { earned: 3000 }, _count: 10 },
      ]);
      const result = await svc.getLinkRanking("s1");
      expect(result.ranking).toHaveLength(1);
    });
  });

  describe("getSettlementTimer", () => {
    it("返回结算倒计时", async () => {
      mockPrisma.configSystem.findFirst.mockResolvedValue(null);
      mockPrisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 1000 } });

      const result = await svc.getSettlementTimer("s1");
      expect(result.remainingDays).toBeGreaterThan(0);
      expect(result.pendingSettlement).toBe(1000);
    });
  });
});
