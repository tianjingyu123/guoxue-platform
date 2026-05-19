import { Test, TestingModule } from "@nestjs/testing";
import { CockpitService } from "./cockpit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

const mockPrisma = {
  order: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  user: { count: jest.fn(), findMany: jest.fn() },
  stationEarning: { aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  giftRecord: { aggregate: jest.fn() },
  riskAlert: { findMany: jest.fn() },
  course: { findMany: jest.fn() },
  circle: { findMany: jest.fn() },
  station: { findMany: jest.fn() },
};

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue("5"),
};

describe("CockpitService", () => {
  let svc: CockpitService;

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        CockpitService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(CockpitService);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe("getOverview", () => {
    it("返回运营总览数据", async () => {
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000 } })  // todayGmv
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }); // monthGmv
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]) // paidUsers
        .mockResolvedValueOnce([{ userId: "u1" }]); // monthPaidUsers
      mockPrisma.user.count.mockResolvedValue(200);
      mockPrisma.stationEarning.aggregate
        .mockResolvedValueOnce({ _sum: { earned: 50000 } })  // total
        .mockResolvedValueOnce({ _sum: { earned: 10000 } }); // month

      const result = await svc.getOverview();

      expect(result.todayGmv).toBe(5000);
      expect(result.monthGmv).toBe(50000);
      expect(result.totalPaidUsers).toBe(2);
      expect(result.monthPaidUsers).toBe(1);
      expect(result.totalUsers).toBe(200);
      expect(result.onlineUsers).toBe(5);
      expect(result.estimatedNetProfit).toBe(40000); // 50000 - 10000
    });

    it("缓存命中直接返回", async () => {
      const cached = { todayGmv: 100, cached: true };
      mockRedis.getJson.mockResolvedValueOnce(cached);

      const result = await svc.getOverview();

      expect(result).toEqual(cached);
      expect(mockPrisma.order.aggregate).not.toHaveBeenCalled();
    });
  });

  describe("getRevenueComposition", () => {
    it("返回收入构成", async () => {
      mockPrisma.order.groupBy.mockResolvedValue([
        { type: "COURSE", _sum: { amount: 30000 }, _count: 150 },
        { type: "MEMBER", _sum: { amount: 15000 }, _count: 50 },
      ]);
      mockPrisma.giftRecord.aggregate.mockResolvedValue({ _sum: { totalCoin: 5000 } });

      const result = await svc.getRevenueComposition();

      expect(result.composition).toHaveLength(2);
      expect(result.composition[0].label).toBe("课程");
      expect(result.composition[0].amount).toBe(30000);
      expect(result.giftRevenue.totalCoin).toBe(5000);
    });
  });

  describe("getUserGrowth", () => {
    it("返回30天用户增长趋势", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      mockPrisma.user.findMany.mockResolvedValue([
        { createdAt: thirtyDaysAgo },
        { createdAt: new Date(thirtyDaysAgo.getTime() + 86400000) },
      ]);
      mockPrisma.stationEarning.findMany.mockResolvedValue([
        { earned: 100, createdAt: thirtyDaysAgo },
      ]);

      const result = await svc.getUserGrowth();

      expect(result.trends).toHaveLength(30);
      expect(result.trends[0].newUsers).toBe(1);
      expect(result.trends[0].acquisitionCost).toBe(100);
    });
  });

  describe("getBusinessTrends", () => {
    it("返回30天各类型收入趋势", async () => {
      const base = new Date("2026-05-01T10:00:00Z");
      mockPrisma.order.findMany.mockResolvedValue([
        { type: "COURSE", amount: 200, createdAt: base },
        { type: "MEMBER", amount: 100, createdAt: base },
      ]);

      const result = await svc.getBusinessTrends();

      expect(result.trends).toHaveLength(30);
      expect(result.trends[0].date).toBeTruthy();
    });
  });

  describe("getAlerts", () => {
    it("无异常时返回空告警", async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(0)  // refunds
        .mockResolvedValueOnce(20) // todayOrders
        .mockResolvedValueOnce(3); // recentFailed
      mockPrisma.riskAlert.findMany.mockResolvedValue([]);

      const result = await svc.getAlerts();

      expect(result.systemAlerts).toHaveLength(0);
      expect(result.riskAlerts).toHaveLength(0);
    });

    it("退款率超过10%触发告警", async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(5)   // refunds
        .mockResolvedValueOnce(20)  // todayOrders → 25%
        .mockResolvedValueOnce(0);
      mockPrisma.riskAlert.findMany.mockResolvedValue([]);

      const result = await svc.getAlerts();

      expect(result.systemAlerts.length).toBeGreaterThan(0);
      expect(result.systemAlerts[0].type).toBe("REFUND_ANOMALY");
      expect(result.systemAlerts[0].level).toBe("DANGER");
    });

    it("支付失败过多触发告警", async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(15); // > 10
      mockPrisma.riskAlert.findMany.mockResolvedValue([
        { id: "r1", type: "FRAUD", level: "DANGER", title: "异常交易", createdAt: new Date() },
      ]);

      const result = await svc.getAlerts();

      expect(result.systemAlerts.some(a => a.type === "PAYMENT_FAILURE")).toBe(true);
      expect(result.riskAlerts).toHaveLength(1);
    });
  });

  describe("getRankings", () => {
    it("返回各维度排行榜", async () => {
      mockPrisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "论语精讲", studentCount: 500, price: 99 },
      ]);
      mockPrisma.circle.findMany.mockResolvedValue([
        { id: "cr1", name: "易经研习社", memberCount: 200, postCount: 50 },
      ]);
      mockPrisma.stationEarning.groupBy.mockResolvedValue([
        { stationId: "s1", _sum: { earned: 10000 } },
      ]);
      mockPrisma.station.findMany
        .mockResolvedValueOnce([{ id: "s1", name: "北京分站" }]) // for map
        .mockResolvedValueOnce([{ id: "s3", name: "新站点", createdAt: new Date() }]); // topNewStations

      const result = await svc.getRankings();

      expect(result.topCourses).toHaveLength(1);
      expect(result.topCourses[0].title).toBe("论语精讲");
      expect(result.topCircles).toHaveLength(1);
      expect(result.topPromoters[0].name).toBe("北京分站");
    });
  });
});
