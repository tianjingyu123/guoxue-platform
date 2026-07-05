import { Test } from "@nestjs/testing";
import { SentinelService } from "./sentinel.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/**
 * 业务哨兵单测（O-T1）：规则触发/不触发边界、去重、自动恢复、通知渠道。
 * 巡检经 runExclusive（mock 直通）。磁盘规则在非 linux 平台自动跳过（本测试环境即如此）。
 */

const mockPrisma = {
  configSystem: { findUnique: jest.fn() },
  order: { count: jest.fn() },
  notification: { count: jest.fn(), createMany: jest.fn() },
  trackEvent: { findMany: jest.fn() },
  smsLog: { count: jest.fn() },
  aiAnalysisRecord: { count: jest.fn() },
  sentinelAlert: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), updateMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  userRole: { findMany: jest.fn() },
};

const mockRedis = {
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
  getJson: jest.fn(),
};

/** 让所有规则都"安静"（不触发）的基线 mock */
function quietBaseline() {
  mockPrisma.configSystem.findUnique.mockResolvedValue(null); // 阈值全走默认·webhook 未配
  mockPrisma.order.count.mockResolvedValue(0); // 无订单 → R1/R2/R5 样本不足
  mockPrisma.notification.count.mockResolvedValue(0); // R3 无对账告警
  mockPrisma.trackEvent.findMany.mockResolvedValue([]); // R4 无基线
  mockPrisma.smsLog.count.mockResolvedValue(0); // R6 样本不足
  mockPrisma.aiAnalysisRecord.count.mockResolvedValue(0); // R7 昨日无基线
  mockRedis.getJson.mockResolvedValue(null); // R9 nginx 分析器未运行
  mockPrisma.sentinelAlert.findFirst.mockResolvedValue(null);
  mockPrisma.sentinelAlert.findMany.mockResolvedValue([]);
  mockPrisma.sentinelAlert.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.sentinelAlert.create.mockResolvedValue({ id: "alert-1" });
  mockPrisma.userRole.findMany.mockResolvedValue([{ userId: "admin-1" }]);
  mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });
}

describe("SentinelService", () => {
  let svc: SentinelService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SentinelService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(SentinelService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    quietBaseline();
  });

  it("patrol 经 runExclusive('sentinel_patrol') 多实例互斥", async () => {
    await svc.patrol();
    expect(mockRedis.runExclusive).toHaveBeenCalledWith("sentinel_patrol", 240, expect.any(Function));
  });

  it("全部安静时零告警零恢复", async () => {
    const r = await svc.runPatrol();
    expect(r).toEqual({ fired: 0, resolved: 0 });
    expect(mockPrisma.sentinelAlert.create).not.toHaveBeenCalled();
  });

  describe("R1 支付成功率", () => {
    it("窗口内 6 单仅 1 单支付（17%<50%）触发 P1", async () => {
      // order.count 调用序：R1 total→R1 paid→R2 created→R2 paid→R5 refunded→R5 paidTotal
      mockPrisma.order.count
        .mockResolvedValueOnce(6).mockResolvedValueOnce(1) // R1: 6 总 1 付
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0) // R2 安静
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0); // R5 安静
      const r = await svc.runPatrol();
      expect(r.fired).toBe(1);
      const created = mockPrisma.sentinelAlert.create.mock.calls[0][0].data;
      expect(created.rule).toBe("pay_success_rate");
      expect(created.level).toBe("P1");
    });

    it("样本不足（<5单）不触发", async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(4).mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      expect((await svc.runPatrol()).fired).toBe(0);
    });

    it("成功率达标（5/6=83%）不触发", async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(6).mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      expect((await svc.runPatrol()).fired).toBe(0);
    });
  });

  describe("R2 回调静默", () => {
    it("近60分钟 3 单创建且零支付 → P1", async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0) // R1 安静
        .mockResolvedValueOnce(3).mockResolvedValueOnce(0) // R2: 3 创建 0 付
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      const r = await svc.runPatrol();
      expect(r.fired).toBe(1);
      expect(mockPrisma.sentinelAlert.create.mock.calls[0][0].data.rule).toBe("pay_callback_silence");
    });

    it("有任一支付成功即不触发", async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0)
        .mockResolvedValueOnce(5).mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      expect((await svc.runPatrol()).fired).toBe(0);
    });
  });

  it("R3 对账告警中继：近10分钟有 SETTLEMENT_RECONCILE 通知 → P1", async () => {
    mockPrisma.notification.count.mockResolvedValue(2);
    const r = await svc.runPatrol();
    expect(r.fired).toBe(1);
    expect(mockPrisma.sentinelAlert.create.mock.calls[0][0].data.rule).toBe("reconcile_alert_relay");
  });

  it("R6 短信失败率：15分钟 6 条中 4 条失败（67%>50%）→ P2", async () => {
    mockPrisma.smsLog.count.mockResolvedValueOnce(6).mockResolvedValueOnce(4);
    const r = await svc.runPatrol();
    expect(r.fired).toBe(1);
    const created = mockPrisma.sentinelAlert.create.mock.calls[0][0].data;
    expect(created.rule).toBe("sms_fail_rate");
    expect(created.level).toBe("P2");
  });

  describe("去重与恢复", () => {
    it("同规则存在未恢复告警时不重发", async () => {
      mockPrisma.notification.count.mockResolvedValue(1); // R3 触发
      mockPrisma.sentinelAlert.findFirst.mockResolvedValue({ id: "open-1" }); // 已有 open
      const r = await svc.runPatrol();
      expect(r.fired).toBe(0);
      expect(mockPrisma.sentinelAlert.create).not.toHaveBeenCalled();
    });

    it("规则不再触发时自动恢复 open 告警并通知（P1/P2）", async () => {
      mockPrisma.sentinelAlert.findMany.mockResolvedValue([
        { id: "a1", rule: "pay_success_rate", level: "P1" },
        { id: "a2", rule: "ai_stall", level: "P3" },
      ]);
      mockPrisma.sentinelAlert.updateMany.mockResolvedValue({ count: 2 });
      const r = await svc.runPatrol();
      expect(r.resolved).toBe(2);
      expect(mockPrisma.sentinelAlert.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["a1", "a2"] } },
        data: { resolvedAt: expect.any(Date) },
      });
      // P1 发恢复通知，P3 不发 → notification.createMany 恰 1 次
      expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.createMany.mock.calls[0][0].data[0].content).toContain("已恢复");
    });
  });

  describe("通知渠道", () => {
    it("告警通知发给 SUPER_ADMIN/OPERATION_ADMIN 站内信（targetType=SENTINEL）", async () => {
      mockPrisma.notification.count.mockResolvedValue(1); // R3 触发
      await svc.runPatrol();
      expect(mockPrisma.userRole.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { roleType: { in: ["SUPER_ADMIN", "OPERATION_ADMIN"] } },
      }));
      const data = mockPrisma.notification.createMany.mock.calls[0][0].data[0];
      expect(data.targetType).toBe("SENTINEL");
      expect(data.content).toContain("【哨兵·P1】");
    });

    it("webhook 未配置时不外发（fetch 不被调用）", async () => {
      const fetchMock = jest.fn();
      (global as Record<string, unknown>).fetch = fetchMock;
      mockPrisma.notification.count.mockResolvedValue(1);
      await svc.runPatrol();
      expect(fetchMock).not.toHaveBeenCalled();
      delete (global as Record<string, unknown>).fetch;
    });

    it("webhook 配置后按企微格式外发", async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      (global as Record<string, unknown>).fetch = fetchMock;
      mockPrisma.notification.count.mockResolvedValue(1); // R3 触发
      // configSystem：阈值查询返回 null，webhook 查询返回 url
      mockPrisma.configSystem.findUnique.mockImplementation(async (args: { where: { configKey: string } }) =>
        args.where.configKey === "sentinel.webhook_url" ? { configValue: "https://qyapi.weixin.qq.com/hook/xx" } : null,
      );
      await svc.runPatrol();
      expect(fetchMock).toHaveBeenCalledWith(
        "https://qyapi.weixin.qq.com/hook/xx",
        expect.objectContaining({ method: "POST" }),
      );
      delete (global as Record<string, unknown>).fetch;
    });
  });

  describe("R9 nginx 5xx 率（T3 接线）", () => {
    it("窗口 100 请求 8 个 5xx（8%>5%）→ P1", async () => {
      mockRedis.getJson.mockResolvedValue({ total: 100, s5xx: 8, at: "2026-07-05T12:00:00Z" });
      const r = await svc.runPatrol();
      expect(r.fired).toBe(1);
      const created = mockPrisma.sentinelAlert.create.mock.calls[0][0].data;
      expect(created.rule).toBe("nginx_5xx_rate");
      expect(created.level).toBe("P1");
    });

    it("样本不足（<50）不触发", async () => {
      mockRedis.getJson.mockResolvedValue({ total: 20, s5xx: 10, at: "x" });
      expect((await svc.runPatrol()).fired).toBe(0);
    });

    it("分析器未运行（键缺失）不告警", async () => {
      mockRedis.getJson.mockResolvedValue(null);
      expect((await svc.runPatrol()).fired).toBe(0);
    });
  });

  describe("admin 告警列表/手动处置", () => {
    it("listAlerts 分页钳制 + status=open 过滤 + 附 openCount", async () => {
      mockPrisma.sentinelAlert.findMany.mockResolvedValue([{ id: "a1", rule: "dau_drop" }]);
      mockPrisma.sentinelAlert.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      const r = await svc.listAlerts({ page: 0, pageSize: 9999, status: "open", level: "P2" });
      expect(r.page).toBe(1);
      expect(r.pageSize).toBe(100);
      expect(r.openCount).toBe(1);
      expect(r.alerts).toHaveLength(1); // 键名 alerts 而非 items：避免被响应拦截器按分页信封吞掉 openCount
      expect(mockPrisma.sentinelAlert.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { resolvedAt: null, level: "P2" },
        orderBy: { firedAt: "desc" },
      }));
    });

    it("resolveAlert 解除未恢复告警", async () => {
      mockPrisma.sentinelAlert.updateMany.mockResolvedValue({ count: 1 });
      const r = await svc.resolveAlert("a1");
      expect(r).toEqual({ ok: true, already: false });
      expect(mockPrisma.sentinelAlert.updateMany).toHaveBeenCalledWith({
        where: { id: "a1", resolvedAt: null },
        data: { resolvedAt: expect.any(Date) },
      });
    });

    it("resolveAlert 幂等：已解除返回 already=true", async () => {
      mockPrisma.sentinelAlert.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.sentinelAlert.findUnique.mockResolvedValue({ id: "a1" });
      expect(await svc.resolveAlert("a1")).toEqual({ ok: true, already: true });
    });

    it("resolveAlert 不存在的告警 404", async () => {
      mockPrisma.sentinelAlert.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.sentinelAlert.findUnique.mockResolvedValue(null);
      await expect(svc.resolveAlert("nope")).rejects.toThrow("告警不存在");
    });

    it("page=abc 时 skip 不为 NaN（防 Prisma 500）", async () => {
      mockPrisma.sentinelAlert.findMany.mockResolvedValue([]);
      mockPrisma.sentinelAlert.count.mockResolvedValue(0);

      await svc.listAlerts({ page: "abc" as any, pageSize: 20 });
      const arg = mockPrisma.sentinelAlert.findMany.mock.calls[0][0];
      expect(Number.isNaN(arg.skip)).toBe(false);
    });
  });

  it("阈值可由 ConfigSystem 覆盖（pay_success_rate 阈值调 0.9 后 5/6 也触发）", async () => {
    mockPrisma.configSystem.findUnique.mockImplementation(async (args: { where: { configKey: string } }) => {
      if (args.where.configKey === "sentinel.pay_success_rate") return { configValue: "0.9" };
      return null;
    });
    mockPrisma.order.count
      .mockResolvedValueOnce(6).mockResolvedValueOnce(5) // 83% < 90%
      .mockResolvedValueOnce(0).mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    expect((await svc.runPatrol()).fired).toBe(1);
  });
});
