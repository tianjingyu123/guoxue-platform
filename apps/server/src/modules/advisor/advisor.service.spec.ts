import { Test } from "@nestjs/testing";
import { AdvisorService } from "./advisor.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  advisorRule: { findMany: jest.fn() },
  advisorInsight: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  station: { findMany: jest.fn(), findUnique: jest.fn() },
  stationOffline: { findMany: jest.fn(), findFirst: jest.fn() },
  stationEarning: { aggregate: jest.fn(), count: jest.fn() },
  stationOrder: { aggregate: jest.fn() },
  stationProduct: { count: jest.fn() },
  stationTeacherBooking: { count: jest.fn() },
  referralRelation: { findMany: jest.fn() },
  order: { groupBy: jest.fn() },
};

const DROP_RULE = {
  ruleKey: "station_earning_wow_drop",
  roleType: "STATION_MASTER",
  metric: "station_earning_wow_drop",
  condition: { thresholdPct: 30 },
  severity: "WARN",
  suggestion: "近7天 ¥{{last7}}，环比下降 {{dropPct}}%",
  actions: [{ label: "去选素材", type: "NAVIGATE", target: "/x" }],
  enabled: true,
};

describe("AdvisorService", () => {
  let svc: AdvisorService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [AdvisorService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(AdvisorService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.advisorInsight.findFirst.mockResolvedValue(null); // 默认无冷却
    mockPrisma.advisorInsight.count.mockResolvedValue(0); // 默认未达每日限额
    mockPrisma.advisorInsight.create.mockResolvedValue({ id: "i1" });
  });

  describe("evaluateAll — 探针命中与建议生成", () => {
    it("佣金环比下滑命中：生成建议且模板正确渲染事实", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([DROP_RULE]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st-1" }]);
      mockPrisma.stationEarning.aggregate
        .mockResolvedValueOnce({ _sum: { earned: 30 } }) // 近7天
        .mockResolvedValueOnce({ _sum: { earned: 100 } }); // 前7天 → 降70%
      const result = await svc.evaluateAll();
      expect(result).toEqual({ evaluated: 1, generated: 1 });
      const created = mockPrisma.advisorInsight.create.mock.calls[0][0].data;
      expect(created.subjectId).toBe("st-1");
      expect(created.content).toBe("近7天 ¥30，环比下降 70%");
      expect(created.facts.dropPct).toBe(70);
    });

    it("未达阈值不生成建议", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([DROP_RULE]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st-1" }]);
      mockPrisma.stationEarning.aggregate
        .mockResolvedValueOnce({ _sum: { earned: 90 } })
        .mockResolvedValueOnce({ _sum: { earned: 100 } }); // 仅降10%
      const result = await svc.evaluateAll();
      expect(result.generated).toBe(0);
      expect(mockPrisma.advisorInsight.create).not.toHaveBeenCalled();
    });

    it("7天冷却期内不重复生成", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([DROP_RULE]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st-1" }]);
      mockPrisma.advisorInsight.findFirst.mockResolvedValue({ id: "existing" }); // 冷却命中
      const result = await svc.evaluateAll();
      expect(result.generated).toBe(0);
      expect(mockPrisma.stationEarning.aggregate).not.toHaveBeenCalled(); // 冷却先于探针，省查询
    });

    it("每日限额（3条）达到后不再生成", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([DROP_RULE]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st-1" }]);
      mockPrisma.advisorInsight.count.mockResolvedValue(3);
      const result = await svc.evaluateAll();
      expect(result.generated).toBe(0);
    });

    it("驿站库存探针：有低库存商品即命中", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([
        {
          ...DROP_RULE,
          ruleKey: "offline_stock_low",
          roleType: "STATION_OFFLINE_OWNER",
          metric: "offline_stock_low",
          condition: { threshold: 5 },
          suggestion: "有 {{count}} 件商品库存不足",
        },
      ]);
      mockPrisma.stationOffline.findMany.mockResolvedValue([{ id: "off-1" }]);
      mockPrisma.stationProduct.count.mockResolvedValue(2);
      const result = await svc.evaluateAll();
      expect(result.generated).toBe(1);
      expect(mockPrisma.advisorInsight.create.mock.calls[0][0].data.content).toBe("有 2 件商品库存不足");
    });

    it("未知探针的规则跳过不抛错", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([{ ...DROP_RULE, metric: "no_such_probe" }]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st-1" }]);
      const result = await svc.evaluateAll();
      expect(result.generated).toBe(0);
    });
  });

  describe("listInsights / transition — 归属安全", () => {
    it("按当前用户解析主体拉取建议", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st-1" });
      mockPrisma.advisorInsight.findMany.mockResolvedValue([{ id: "i1" }]);
      const result = await svc.listInsights("u-1", "STATION_MASTER");
      expect(result.insights).toHaveLength(1);
      const where = mockPrisma.advisorInsight.findMany.mock.calls[0][0].where;
      expect(where.subjectId).toBe("st-1");
      expect(where.status.in).toEqual(["OPEN", "READ"]);
    });

    it("非本人主体的建议禁止状态流转", async () => {
      mockPrisma.advisorInsight.findUnique.mockResolvedValue({
        id: "i1", roleType: "STATION_MASTER", subjectId: "st-other",
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st-mine" });
      await expect(svc.transition("u-1", "i1", "dismiss")).rejects.toThrow(BusinessException);
      expect(mockPrisma.advisorInsight.update).not.toHaveBeenCalled();
    });

    it("采纳建议记录 actedAt", async () => {
      mockPrisma.advisorInsight.findUnique.mockResolvedValue({
        id: "i1", roleType: "STATION_MASTER", subjectId: "st-1",
      });
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st-1" });
      mockPrisma.advisorInsight.update.mockResolvedValue({ id: "i1", status: "ACTED" });
      await svc.transition("u-1", "i1", "act");
      const arg = mockPrisma.advisorInsight.update.mock.calls[0][0];
      expect(arg.data.status).toBe("ACTED");
      expect(arg.data.actedAt).toBeInstanceOf(Date);
    });
  });
});
