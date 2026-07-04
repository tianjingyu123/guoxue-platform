import { Test } from "@nestjs/testing";
import { InsightService, buildAdvicePrompt, nextLichun, InsightSnapshot } from "./insight.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";

// 与 crm.service.spec 同源：32 字节 key（本 spec 不做加解密，仅保持环境一致）
process.env.ENCRYPTION_KEY = "abcdefghijklmnopqrstuvwxyz123456";

const mockGateway = { chat: jest.fn() };

const mockPrisma = {
  clientBook: { findMany: jest.fn() },
  clientServeLog: { groupBy: jest.fn(), findMany: jest.fn() },
  clientReminder: { count: jest.fn() },
};

const OWNER = "owner-1";
const DAY_MS = 86_400_000;
/** 固定"当前时间"：2026-07-10（非立春窗口·距下一立春>30天） */
const NOW = new Date(2026, 6, 10, 9, 0, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY_MS);

/** RFM 聚合行（洞察只取这三列·无个体字段） */
function rfmRow(over: Partial<{ lastServeAt: Date | null; serveCount: number; totalSpend: number }> = {}) {
  return { lastServeAt: daysAgo(5), serveCount: 1, totalSpend: 100, ...over };
}

describe("InsightService（课-P4 经营洞察·R3 统计聚合）", () => {
  let svc: InsightService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        InsightService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiGatewayService, useValue: mockGateway },
      ],
    }).compile();
    svc = mod.get(InsightService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.clientBook.findMany.mockResolvedValue([rfmRow()]);
    mockPrisma.clientServeLog.groupBy.mockResolvedValue([]);
    mockPrisma.clientServeLog.findMany.mockResolvedValue([]);
    mockPrisma.clientReminder.count.mockResolvedValue(0);
  });

  // ───────── 聚合口径 ─────────

  describe("服务结构（近90天按 serveType 聚合）", () => {
    it("次数/金额占比正确，按次数降序，查询窗口=近90天且带 ownerId", async () => {
      mockPrisma.clientServeLog.groupBy.mockResolvedValue([
        { type: "consult", _count: { _all: 3 }, _sum: { amount: 300 } },
        { type: "course", _count: { _all: 6 }, _sum: { amount: 100 } },
        { type: "product", _count: { _all: 1 }, _sum: { amount: null } }, // 免费服务金额可空
      ]);
      const res = await svc.getInsights(OWNER, NOW);

      expect(res.serve90.totalCount).toBe(10);
      expect(res.serve90.totalAmount).toBe(400);
      // 按次数降序
      expect(res.serve90.items.map((i) => i.type)).toEqual(["course", "consult", "product"]);
      const course = res.serve90.items[0];
      expect(course).toMatchObject({ label: "课程", count: 6, amount: 100, countPct: 60, amountPct: 25 });
      const product = res.serve90.items[2];
      expect(product).toMatchObject({ count: 1, amount: 0, countPct: 10, amountPct: 0 });

      const where = mockPrisma.clientServeLog.groupBy.mock.calls[0][0].where;
      expect(where.ownerId).toBe(OWNER);
      expect(where.servedAt.gte).toEqual(new Date(NOW.getTime() - 90 * DAY_MS));
    });
  });

  describe("客群节律（月度趋势+复购间隔）", () => {
    it("月度趋势：近6个自然月0补齐·记录落入对应月份桶", async () => {
      mockPrisma.clientServeLog.findMany.mockResolvedValue([
        { clientId: "c-1", servedAt: new Date(2026, 2, 15), amount: 100 }, // 2026-03
        { clientId: "c-1", servedAt: new Date(2026, 6, 1), amount: 50 }, // 2026-07（当月）
        { clientId: "c-2", servedAt: new Date(2026, 6, 5), amount: null },
      ]);
      const res = await svc.getInsights(OWNER, NOW);

      expect(res.monthlyTrend).toHaveLength(6);
      expect(res.monthlyTrend.map((m) => m.month)).toEqual([
        "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07",
      ]);
      expect(res.monthlyTrend[1]).toEqual({ month: "2026-03", count: 1, amount: 100 });
      expect(res.monthlyTrend[4]).toEqual({ month: "2026-06", count: 0, amount: 0 }); // 0补齐
      expect(res.monthlyTrend[5]).toEqual({ month: "2026-07", count: 2, amount: 50 });
      // 趋势查询窗口=近6个自然月起点（2026-02-01）且带 ownerId
      const where = mockPrisma.clientServeLog.findMany.mock.calls[0][0].where;
      expect(where.ownerId).toBe(OWNER);
      expect(where.servedAt.gte).toEqual(new Date(2026, 1, 1));
    });

    it("复购间隔：同客户不同日期的间隔（同日多条只算一天）·平均/中位·单次客户不计入样本", async () => {
      mockPrisma.clientServeLog.findMany.mockResolvedValue([
        // c-1：2/1、2/11、3/3 → 间隔 10、20
        { clientId: "c-1", servedAt: new Date(2026, 1, 1, 10), amount: null },
        { clientId: "c-1", servedAt: new Date(2026, 1, 11, 15), amount: null },
        { clientId: "c-1", servedAt: new Date(2026, 2, 3, 9), amount: null },
        // c-2：同日两条 → 只算一天，无间隔，不入样本
        { clientId: "c-2", servedAt: new Date(2026, 5, 1, 9), amount: null },
        { clientId: "c-2", servedAt: new Date(2026, 5, 1, 18), amount: null },
        // c-3：单次 → 不入样本
        { clientId: "c-3", servedAt: new Date(2026, 5, 20), amount: null },
      ]);
      const res = await svc.getInsights(OWNER, NOW);
      expect(res.repurchase).toEqual({ avgDays: 15, medianDays: 15, sampledClients: 1 });
    });

    it("复购间隔样本不足（无客户有两个不同服务日）→ null", async () => {
      mockPrisma.clientServeLog.findMany.mockResolvedValue([
        { clientId: "c-1", servedAt: new Date(2026, 5, 20), amount: 10 },
      ]);
      const res = await svc.getInsights(OWNER, NOW);
      expect(res.repurchase).toBeNull();
    });
  });

  describe("商机雷达（只给数量·R3 不列个体名单）", () => {
    it("RFM 沉睡/流失预警层计数正确", async () => {
      mockPrisma.clientBook.findMany.mockResolvedValue([
        rfmRow({ lastServeAt: daysAgo(5) }), // ACTIVE
        rfmRow({ lastServeAt: daysAgo(60) }), // AT_RISK
        rfmRow({ lastServeAt: daysAgo(120) }), // DORMANT
        rfmRow({ lastServeAt: null, serveCount: 0, totalSpend: 0 }), // 从未服务 → DORMANT
        rfmRow({ lastServeAt: daysAgo(10), totalSpend: 5000 }), // HIGH_VALUE
      ]);
      const res = await svc.getInsights(OWNER, NOW);
      expect(res.totalClients).toBe(5);
      expect(res.radar.dormant).toBe(2);
      expect(res.radar.atRisk).toBe(1);
    });

    it("本月生日客户数：提醒表按 dueAt 当月窗口聚合（带 ownerId+kind=BIRTHDAY）", async () => {
      mockPrisma.clientReminder.count.mockResolvedValue(3);
      const res = await svc.getInsights(OWNER, NOW);
      expect(res.radar.birthdayThisMonth).toBe(3);
      const where = mockPrisma.clientReminder.count.mock.calls[0][0].where;
      expect(where).toMatchObject({ ownerId: OWNER, kind: "BIRTHDAY" });
      expect(where.dueAt.gte).toEqual(new Date(2026, 6, 1));
      expect(where.dueAt.lt).toEqual(new Date(2026, 7, 1));
    });

    it("立春静态日历：7月→下一立春=次年2月4日（不临近）；1月中→当年2月4日（临近）", async () => {
      const res = await svc.getInsights(OWNER, NOW);
      expect(res.radar.lichun).toMatchObject({ date: "2027-02-04", isNear: false });
      expect(res.radar.lichun.daysUntil).toBe(
        Math.round((new Date(2027, 1, 4).getTime() - new Date(2026, 6, 10).getTime()) / DAY_MS),
      );
      // 纯函数口径
      expect(nextLichun(new Date(2026, 0, 20))).toEqual({ date: "2026-02-04", daysUntil: 15, isNear: true });
      expect(nextLichun(new Date(2026, 1, 4))).toEqual({ date: "2026-02-04", daysUntil: 0, isNear: true });
    });
  });

  // ───────── 空数据空态 ─────────

  describe("空数据空态", () => {
    it("无客户：零快照+引导模板建议·不发起服务记录查询也不打 AI", async () => {
      mockPrisma.clientBook.findMany.mockResolvedValue([]);
      const res = await svc.getInsights(OWNER, NOW);
      expect(res.totalClients).toBe(0);
      expect(res.serve90).toEqual({ totalCount: 0, totalAmount: 0, items: [] });
      expect(res.monthlyTrend).toHaveLength(6);
      expect(res.monthlyTrend.every((m) => m.count === 0 && m.amount === 0)).toBe(true);
      expect(res.repurchase).toBeNull();
      expect(res.radar).toMatchObject({ dormant: 0, atRisk: 0, birthdayThisMonth: 0 });
      expect(res.advice.source).toBe("template");
      expect(res.advice.text).toContain("还没有客户档案");
      expect(mockPrisma.clientServeLog.groupBy).not.toHaveBeenCalled();
      expect(mockPrisma.clientServeLog.findMany).not.toHaveBeenCalled();
      expect(mockGateway.chat).not.toHaveBeenCalled();
    });
  });

  // ───────── R3：AI prompt 只含聚合数字，无任何个体字段 ─────────

  describe("R3 合规：AI 建议输入不含个体字段", () => {
    it("buildAdvicePrompt 输出只由聚合数值构成（结构上无姓名/生辰/手机号字段可注入）", () => {
      const snapshot: InsightSnapshot = {
        totalClients: 12,
        serve90: {
          totalCount: 10,
          totalAmount: 400,
          items: [{ type: "consult", label: "咨询", count: 10, amount: 400, countPct: 100, amountPct: 100 }],
        },
        monthlyTrend: [{ month: "2026-07", count: 10, amount: 400 }],
        repurchase: { avgDays: 15, medianDays: 15, sampledClients: 3 },
        radar: { dormant: 6, atRisk: 1, birthdayThisMonth: 2, lichun: { date: "2027-02-04", daysUntil: 209, isNear: false } },
      };
      const prompt = buildAdvicePrompt(snapshot);
      expect(prompt).toContain("客户总数 12 人");
      expect(prompt).toContain("沉睡客户 6 人");
      // 不含任何形如手机号/生辰的串（快照类型里根本没有这些字段）
      expect(prompt).not.toMatch(/1[3-9]\d{9}/);
      expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    });

    it("非测试环境走 AI 时：发给网关的 messages 不含客户姓名/手机号/生辰（端到端断言）", async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      try {
        // 数据库里存在名叫「王姐」的客户及其服务记录——洞察查询只取聚合列，个体字段进不了 prompt
        mockPrisma.clientBook.findMany.mockResolvedValue([
          rfmRow({ lastServeAt: daysAgo(120) }),
          rfmRow({ lastServeAt: daysAgo(5) }),
        ]);
        mockPrisma.clientServeLog.groupBy.mockResolvedValue([
          { type: "consult", _count: { _all: 2 }, _sum: { amount: 200 } },
        ]);
        mockGateway.chat.mockResolvedValue({ content: "建议本周优先回访沉睡客户，并提前准备生日关怀话术，保持服务节奏。" });

        const res = await svc.getInsights(OWNER, NOW);

        expect(mockGateway.chat).toHaveBeenCalledTimes(1);
        const req = mockGateway.chat.mock.calls[0][0];
        expect(req.scene).toBe("crm_insight_advice");
        const serialized = JSON.stringify(req.messages);
        expect(serialized).not.toContain("王姐");
        expect(serialized).not.toMatch(/1[3-9]\d{9}/); // 无手机号
        expect(serialized).not.toMatch(/19\d{2}-\d{2}-\d{2}/); // 无生辰
        expect(serialized).toContain("沉睡客户 1 人"); // 只有聚合数字
        expect(res.advice.source).toBe("ai");
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it("AI 失败 → 降级规则模板：沉睡占比超40%给回访建议", async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      try {
        mockPrisma.clientBook.findMany.mockResolvedValue([
          rfmRow({ lastServeAt: daysAgo(120) }),
          rfmRow({ lastServeAt: daysAgo(200) }),
          rfmRow({ lastServeAt: daysAgo(5) }),
        ]); // 沉睡 2/3 ≈ 67% > 40%
        mockGateway.chat.mockRejectedValue(new Error("网关不可用"));
        const res = await svc.getInsights(OWNER, NOW);
        expect(res.advice.source).toBe("template");
        expect(res.advice.text).toContain("沉睡客户占比超40%");
        expect(res.advice.text).toContain("回访");
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it("测试环境（默认）不打 AI，直接模板建议", async () => {
      const res = await svc.getInsights(OWNER, NOW);
      expect(mockGateway.chat).not.toHaveBeenCalled();
      expect(res.advice.source).toBe("template");
    });
  });

  // ───────── ownerId 数据隔离 ─────────

  describe("ownerId 数据隔离（R3：聚合仅限本人客户池）", () => {
    it("全部四路查询均带 ownerId 条件", async () => {
      mockPrisma.clientServeLog.groupBy.mockResolvedValue([
        { type: "consult", _count: { _all: 1 }, _sum: { amount: 10 } },
      ]);
      await svc.getInsights(OWNER, NOW);
      expect(mockPrisma.clientBook.findMany.mock.calls[0][0].where).toEqual({ ownerId: OWNER });
      expect(mockPrisma.clientServeLog.groupBy.mock.calls[0][0].where.ownerId).toBe(OWNER);
      expect(mockPrisma.clientServeLog.findMany.mock.calls[0][0].where.ownerId).toBe(OWNER);
      expect(mockPrisma.clientReminder.count.mock.calls[0][0].where.ownerId).toBe(OWNER);
    });

    it("clientBook 只取 RFM 聚合三列，不取姓名/生辰/手机号（个体字段从源头进不了洞察）", async () => {
      await svc.getInsights(OWNER, NOW);
      const select = mockPrisma.clientBook.findMany.mock.calls[0][0].select;
      expect(select).toEqual({ lastServeAt: true, serveCount: true, totalSpend: true });
      expect(select.name).toBeUndefined();
      expect(select.phoneEnc).toBeUndefined();
      expect(select.birthEnc).toBeUndefined();
    });
  });
});
