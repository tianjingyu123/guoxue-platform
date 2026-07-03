import { Test } from "@nestjs/testing";
import { AdvisorService } from "./advisor.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

const mockPrisma = {
  advisorRule: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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
  stationEarning: { aggregate: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
  stationOrder: { aggregate: jest.fn() },
  stationProduct: { count: jest.fn() },
  stationTeacherBooking: { count: jest.fn() },
  referralRelation: { findMany: jest.fn() },
  order: { groupBy: jest.fn(), count: jest.fn() },
  circle: { findMany: jest.fn(), findUnique: jest.fn() },
  circleMember: { count: jest.fn(), findMany: jest.fn() },
  post: { count: jest.fn() },
  course: { findMany: jest.fn(), count: jest.fn() },
  courseReview: { count: jest.fn() },
  userRole: { findMany: jest.fn() },
  operator: { findMany: jest.fn(), findFirst: jest.fn() },
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

    it("圈主活跃度探针 + 动作 {{subjectId}} 占位渲染", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([
        {
          ...DROP_RULE,
          ruleKey: "circle_activity_drop",
          roleType: "CIRCLE_OWNER",
          metric: "circle_activity_drop",
          condition: { thresholdPct: 40 },
          suggestion: "发帖下降 {{dropPct}}%",
          actions: [{ label: "去发起话题", type: "NAVIGATE", target: "/pkg-circle/circles/editor?circleId={{subjectId}}" }],
        },
      ]);
      mockPrisma.circle.findMany.mockResolvedValue([{ id: "c-1" }]);
      mockPrisma.post.count
        .mockResolvedValueOnce(2) // 近7天
        .mockResolvedValueOnce(10); // 前7天 → 降80%
      const result = await svc.evaluateAll();
      expect(result.generated).toBe(1);
      const created = mockPrisma.advisorInsight.create.mock.calls[0][0].data;
      expect(created.content).toBe("发帖下降 80%");
      expect(created.actions[0].target).toBe("/pkg-circle/circles/editor?circleId=c-1");
    });

    it("未知探针的规则跳过不抛错", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([{ ...DROP_RULE, metric: "no_such_probe" }]);
      mockPrisma.station.findMany.mockResolvedValue([{ id: "st-1" }]);
      const result = await svc.evaluateAll();
      expect(result.generated).toBe(0);
    });
  });

  describe("collectFeedback — 效果回访", () => {
    it("采纳7天后复跑探针：不再命中即回填 resolved=true", async () => {
      mockPrisma.advisorInsight.findMany.mockResolvedValue([
        { id: "i1", ruleKey: "station_earning_wow_drop", subjectId: "st-1", feedback: null },
      ]);
      mockPrisma.advisorRule.findMany.mockResolvedValue([DROP_RULE]);
      mockPrisma.stationEarning.aggregate
        .mockResolvedValueOnce({ _sum: { earned: 120 } }) // 近7天已回升
        .mockResolvedValueOnce({ _sum: { earned: 100 } });
      mockPrisma.advisorInsight.update.mockResolvedValue({});
      const result = await svc.collectFeedback();
      expect(result.updated).toBe(1);
      const fb = mockPrisma.advisorInsight.update.mock.calls[0][0].data.feedback;
      expect(fb.resolved).toBe(true);
    });

    it("已回填过的建议跳过", async () => {
      mockPrisma.advisorInsight.findMany.mockResolvedValue([
        { id: "i1", ruleKey: "station_earning_wow_drop", subjectId: "st-1", feedback: { resolved: true } },
      ]);
      const result = await svc.collectFeedback();
      expect(result.updated).toBe(0);
      expect(mockPrisma.advisorInsight.update).not.toHaveBeenCalled();
    });
  });

  describe("listInsights / transition — 归属安全", () => {
    it("按当前用户解析主体拉取建议", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st-1" });
      mockPrisma.advisorInsight.findMany.mockResolvedValue([{ id: "i1" }]);
      const result = await svc.listInsights("u-1", "STATION_MASTER");
      expect(result.insights).toHaveLength(1);
      const where = mockPrisma.advisorInsight.findMany.mock.calls[0][0].where;
      expect(where.subjectId).toEqual({ in: ["st-1"] });
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

  describe("规则后台管理（C7）", () => {
    const createDto = (overrides: Record<string, unknown> = {}) =>
      ({
        roleType: "STATION_MASTER",
        ruleKey: "test_rule",
        metric: "station_earning_wow_drop",
        condition: { thresholdPct: 30 },
        severity: "WARN",
        suggestion: "近7天下降 {{dropPct}}%",
        actions: [{ label: "去看数据", type: "NAVIGATE", target: "/x" }],
        ...overrides,
      }) as any;

    it("listRules：按 roleType, ruleKey 排序返回 { items }", async () => {
      mockPrisma.advisorRule.findMany.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
      const result = await svc.listRules();
      expect(result.items).toHaveLength(2);
      expect(mockPrisma.advisorRule.findMany).toHaveBeenCalledWith({
        orderBy: [{ roleType: "asc" }, { ruleKey: "asc" }],
      });
    });

    it("创建成功：updatedBy 写入管理员 userId，severity 缺省 INFO", async () => {
      mockPrisma.advisorRule.findUnique.mockResolvedValue(null);
      mockPrisma.advisorRule.create.mockResolvedValue({ id: "r1", ruleKey: "test_rule" });
      const result = await svc.createRule(createDto({ severity: undefined }), "admin-1");
      expect(result.id).toBe("r1");
      const data = mockPrisma.advisorRule.create.mock.calls[0][0].data;
      expect(data.updatedBy).toBe("admin-1");
      expect(data.severity).toBe("INFO");
      expect(data.metric).toBe("station_earning_wow_drop");
    });

    it("ruleKey 冲突抛业务异常，不落库", async () => {
      mockPrisma.advisorRule.findUnique.mockResolvedValue({ id: "exists", ruleKey: "test_rule" });
      await expect(svc.createRule(createDto(), "admin-1")).rejects.toThrow(/已存在/);
      expect(mockPrisma.advisorRule.create).not.toHaveBeenCalled();
    });

    it("metric 不是合法探针（PROBES 无此 key）拒绝创建", async () => {
      await expect(svc.createRule(createDto({ metric: "no_such_probe" }), "admin-1")).rejects.toThrow(
        /探针 no_such_probe 不存在/,
      );
      expect(mockPrisma.advisorRule.create).not.toHaveBeenCalled();
    });

    it("severity 非法（非 INFO/WARN/CRITICAL）拒绝", async () => {
      await expect(svc.createRule(createDto({ severity: "FATAL" }), "admin-1")).rejects.toThrow(
        /severity 只允许/,
      );
      mockPrisma.advisorRule.findUnique.mockResolvedValue({ id: "r1", ruleKey: "test_rule" });
      await expect(svc.updateRule("r1", { severity: "URGENT" } as any, "admin-1")).rejects.toThrow(
        /severity 只允许/,
      );
      expect(mockPrisma.advisorRule.create).not.toHaveBeenCalled();
      expect(mockPrisma.advisorRule.update).not.toHaveBeenCalled();
    });

    it("actions 结构非法（元素缺 label/type）拒绝", async () => {
      await expect(
        svc.createRule(createDto({ actions: [{ type: "NAVIGATE" }] }), "admin-1"),
      ).rejects.toThrow(/label/);
      await expect(svc.createRule(createDto({ actions: ["not-object"] }), "admin-1")).rejects.toThrow(
        /必须是对象/,
      );
      expect(mockPrisma.advisorRule.create).not.toHaveBeenCalled();
    });

    it("更新禁止修改 ruleKey", async () => {
      await expect(
        svc.updateRule("r1", { ruleKey: "another_key", enabled: false } as any, "admin-1"),
      ).rejects.toThrow(/禁止修改/);
      expect(mockPrisma.advisorRule.update).not.toHaveBeenCalled();
    });

    it("更新成功：仅更新传入字段且 updatedBy 写管理员 userId；非法 metric 拒绝", async () => {
      mockPrisma.advisorRule.findUnique.mockResolvedValue({ id: "r1", ruleKey: "test_rule" });
      mockPrisma.advisorRule.update.mockResolvedValue({ id: "r1", enabled: false });
      await svc.updateRule("r1", { enabled: false, severity: "CRITICAL" } as any, "admin-2");
      const arg = mockPrisma.advisorRule.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: "r1" });
      expect(arg.data).toEqual({ updatedBy: "admin-2", enabled: false, severity: "CRITICAL" });

      await expect(svc.updateRule("r1", { metric: "bad_probe" } as any, "admin-2")).rejects.toThrow(
        /不存在/,
      );
    });

    it("更新不存在的规则抛业务异常", async () => {
      mockPrisma.advisorRule.findUnique.mockResolvedValue(null);
      await expect(svc.updateRule("no-such", { enabled: false } as any, "admin-1")).rejects.toThrow(
        BusinessException,
      );
    });
  });
});
