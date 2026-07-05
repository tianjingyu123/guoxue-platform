import { Test, TestingModule } from "@nestjs/testing";
import { StationDashboardService, computeTeamHealth } from "./station-dashboard.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma = {
  stationEarning: { aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  order: { findMany: jest.fn() },
  configSystem: { findFirst: jest.fn() },
  operator: { findFirst: jest.fn() },
  operatorEarning: { groupBy: jest.fn() },
  station: { findMany: jest.fn() },
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

  describe("getOperatorMgmtReport — 佣-V2-P4 管理奖新口径月报", () => {
    it("口径聚合正确：本月名下站长佣金合计(sum amount)×比率·管理奖合计(sum earned)·按站长分组明细", async () => {
      mockPrisma.operator.findFirst.mockResolvedValue({ id: "op-1", channelType: "ONLINE", mgmtRate: null });
      mockPrisma.operatorEarning.groupBy.mockResolvedValue([
        { sourceStationId: "st-1", _sum: { amount: 100, earned: 10 }, _count: 2 },
        { sourceStationId: "st-2", _sum: { amount: 200, earned: 20 }, _count: 3 },
      ]);
      mockPrisma.station.findMany.mockResolvedValue([
        { id: "st-1", name: "明德分站" },
        { id: "st-2", name: "致远分站" },
      ]);
      const r = await svc.getOperatorMgmtReport("op-user");
      expect(r.channelType).toBe("ONLINE");
      expect(r.isOfflinePremium).toBe(false);
      expect(r.mgmtRate).toBe(0.1); // mgmtRate 空 → ONLINE 默认 10%
      expect(r.monthStationCommission).toBe(300); // 名下站长佣金合计（管理奖基数）
      expect(r.monthMgmtEarned).toBe(30); // 管理奖合计
      expect(r.byStation).toHaveLength(2);
      expect(r.byStation[0]).toEqual({
        stationId: "st-2", stationName: "致远分站", stationCommission: 200, mgmtEarned: 20, orders: 3,
      }); // 按管理奖降序
      // 数据源=OperatorEarning 本月 MGMT_BONUS 按 sourceStationId 分组
      const arg = mockPrisma.operatorEarning.groupBy.mock.calls[0][0];
      expect(arg.by).toEqual(["sourceStationId"]);
      expect(arg.where.operatorId).toBe("op-1");
      expect(arg.where.source).toBe("MGMT_BONUS");
      expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
    });

    it("线下高级运营商：channelType=OFFLINE → isOfflinePremium=true·默认比率 20%", async () => {
      mockPrisma.operator.findFirst.mockResolvedValue({ id: "op-2", channelType: "OFFLINE", mgmtRate: null });
      mockPrisma.operatorEarning.groupBy.mockResolvedValue([]);
      const r = await svc.getOperatorMgmtReport("offline-user");
      expect(r.isOfflinePremium).toBe(true);
      expect(r.mgmtRate).toBe(0.2);
      expect(r.monthStationCommission).toBe(0);
      expect(r.monthMgmtEarned).toBe(0);
      expect(r.byStation).toEqual([]);
      expect(mockPrisma.station.findMany).not.toHaveBeenCalled(); // 无明细不查站名
    });

    it("mgmtRate 覆盖优先于渠道默认：0.15 → 比率 0.15", async () => {
      mockPrisma.operator.findFirst.mockResolvedValue({ id: "op-3", channelType: "OFFLINE", mgmtRate: 0.15 });
      mockPrisma.operatorEarning.groupBy.mockResolvedValue([]);
      const r = await svc.getOperatorMgmtReport("u3");
      expect(r.mgmtRate).toBe(0.15);
    });

    it("非运营商 → ForbiddenException", async () => {
      mockPrisma.operator.findFirst.mockResolvedValue(null);
      await expect(svc.getOperatorMgmtReport("nobody")).rejects.toThrow("当前用户不是运营商");
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

describe("computeTeamHealth（运营商团队健康度·课题二工作台P3）", () => {
  it("无团队(total=0) → 0 分·预警", () => {
    const r = computeTeamHealth({ totalStations: 0, activeStations: 0, monthTeamEarned: 0, monthTeamOrders: 0 });
    expect(r.score).toBe(0);
    expect(r.levelKey).toBe("dormant");
  });

  it("满员活跃+厚业绩+规模大 → 高分·健康", () => {
    const r = computeTeamHealth({ totalStations: 40, activeStations: 40, monthTeamEarned: 40000, monthTeamOrders: 500 });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.levelKey).toBe("healthy");
    expect(r.breakdown.activity).toBe(45); // 全活跃触顶
  });

  it("半数沉寂 → 活跃分腰斩", () => {
    const full = computeTeamHealth({ totalStations: 10, activeStations: 10, monthTeamEarned: 0, monthTeamOrders: 0 });
    const half = computeTeamHealth({ totalStations: 10, activeStations: 5, monthTeamEarned: 0, monthTeamOrders: 0 });
    expect(half.breakdown.activity).toBeLessThan(full.breakdown.activity);
    expect(half.breakdown.activity).toBe(Math.round((5 / 10) * 45));
  });

  it("零业绩全活跃团队 → 有活跃分但无业绩分", () => {
    const r = computeTeamHealth({ totalStations: 5, activeStations: 5, monthTeamEarned: 0, monthTeamOrders: 0 });
    expect(r.breakdown.activity).toBe(45);
    expect(r.breakdown.performance).toBe(0);
    expect(r.breakdown.orders).toBe(0);
  });

  it("异常入参（活跃>总数/负数）稳健归一化，不越界", () => {
    const r = computeTeamHealth({ totalStations: 10, activeStations: 999, monthTeamEarned: -100, monthTeamOrders: -5 });
    expect(r.breakdown.activity).toBe(45); // active 被钳到 total
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(Number.isFinite(r.score)).toBe(true);
  });
});
