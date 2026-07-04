import { InspectionService } from "./inspection.service";
import { DashboardDailyService } from "../dashboard/dashboard-daily.service";
import { MerchantMetricService } from "../merchant/merchant-metric.service";

/**
 * 每日巡检 + 分级处置（OS-P2）—
 * 五项巡检各触发路径 / 开关关不自动处置 / 白名单补跑调用断言 / 报告任务落库
 */
describe("InspectionService", () => {
  const mockPrisma = {
    $queryRaw: jest.fn(),
    trackEvent: { count: jest.fn() },
    notification: { count: jest.fn() },
    order: { count: jest.fn() },
    dashboardDaily: { findUnique: jest.fn() },
    merchant: { count: jest.fn() },
    merchantMetric: { count: jest.fn() },
    opsTask: { create: jest.fn() },
  };
  const mockRedis = { set: jest.fn(), get: jest.fn(), runExclusive: jest.fn() };
  const mockSystem = { isAutomationEnabled: jest.fn(), logAudit: jest.fn() };
  const mockOps = { create: jest.fn() };
  const mockDaily = { rebuildDate: jest.fn() };
  const mockMetric = { aggregateDate: jest.fn() };
  const mockModuleRef = { get: jest.fn() };

  let svc: InspectionService;

  /** 五项全绿基线（各测试在其上造单项异常） */
  const allGreen = () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.get.mockResolvedValue("1");
    // 错误突增：Promise.all 数组序 = [近24h, 前24h]
    mockPrisma.trackEvent.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockPrisma.notification.count.mockResolvedValue(0);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.dashboardDaily.findUnique.mockResolvedValue({ id: "d1" });
    mockPrisma.merchant.count.mockResolvedValue(2);
    mockPrisma.merchantMetric.count.mockResolvedValue(2);
    mockPrisma.opsTask.create.mockResolvedValue({ id: "report-1" });
    mockSystem.isAutomationEnabled.mockResolvedValue(true);
    mockSystem.logAudit.mockResolvedValue({});
    mockOps.create.mockResolvedValue({ id: "task-1" });
    mockDaily.rebuildDate.mockResolvedValue({ date: "x", metrics: {} });
    mockMetric.aggregateDate.mockResolvedValue({ date: "x", merchants: 1, upserts: 1 });
    mockModuleRef.get.mockImplementation((token: unknown) => (token === DashboardDailyService ? mockDaily : mockMetric));
    mockRedis.runExclusive.mockImplementation(async (_n: string, _t: number, fn: () => Promise<unknown>) => fn());
  };

  /** 重设错误突增两次 count 的返回（覆盖基线的 0/0） */
  const surgeCounts = (current: number, previous: number) => {
    mockPrisma.trackEvent.count.mockReset();
    mockPrisma.trackEvent.count.mockResolvedValueOnce(current).mockResolvedValueOnce(previous);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    svc = new InspectionService(mockPrisma as any, mockRedis as any, mockSystem as any, mockOps as any, mockModuleRef as any);
    allGreen();
  });

  describe("巡检报告任务落库", () => {
    it("五项全绿 — 不建待办不自动处置，仅落一条 completed 巡检日志（result=五项汇总）", async () => {
      const report = await svc.runInspection("MANUAL");

      expect(report.anomalies).toBe(0);
      expect(report.items).toHaveLength(5);
      expect(report.items.every((i) => i.status === "ok")).toBe(true);
      expect(report.autoFixed).toBe(0);
      expect(report.tasksCreated).toBe(0);
      expect(report.reportTaskId).toBe("report-1");

      // 无待办任务·无白名单补跑
      expect(mockOps.create).not.toHaveBeenCalled();
      expect(mockDaily.rebuildDate).not.toHaveBeenCalled();
      expect(mockMetric.aggregateDate).not.toHaveBeenCalled();

      // 报告任务：completed + executor=CLAUDE + result 含五项
      expect(mockPrisma.opsTask.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.opsTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "INSPECT",
            status: "completed",
            executor: "CLAUDE",
            result: expect.objectContaining({ anomalies: 0, items: expect.any(Array) }),
          }),
        }),
      );
      expect(mockSystem.logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "ops_inspection.report", executor: "CLAUDE" }));
    });
  });

  describe("① 健康检查", () => {
    it("db 失败 → 记异常并建 HIGH 待办（needsApproval=false）", async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error("db down"));
      const report = await svc.runInspection();

      expect(report.items[0]).toMatchObject({ key: "health", status: "anomaly" });
      expect(mockOps.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "INSPECT",
          priority: "HIGH",
          needsApproval: false,
          title: expect.stringContaining("健康检查失败"),
        }),
        "CLAUDE",
      );
      expect(report.tasksCreated).toBe(1);
    });

    it("redis 读写不一致 → 异常", async () => {
      mockRedis.get.mockResolvedValue(null);
      const report = await svc.runInspection();
      expect(report.items[0].status).toBe("anomaly");
      expect((report.items[0].detail.redis as Record<string, unknown>).status).toBe("fail");
    });
  });

  describe("② 错误突增（翻倍且>20）", () => {
    it("近24h 50 vs 前24h 10 → 异常建 HIGH 待办", async () => {
      surgeCounts(50, 10);
      const report = await svc.runInspection();
      expect(report.items[1]).toMatchObject({ key: "error_surge", status: "anomaly", detail: expect.objectContaining({ current: 50, previous: 10 }) });
      expect(mockOps.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "HIGH", title: expect.stringContaining("错误突增") }),
        "CLAUDE",
      );
    });

    it("翻倍但未过 20 下限（18 vs 2）→ 不判异常", async () => {
      surgeCounts(18, 2);
      const report = await svc.runInspection();
      expect(report.items[1].status).toBe("ok");
      expect(mockOps.create).not.toHaveBeenCalled();
    });

    it("超 20 但未翻倍（50 vs 30）→ 不判异常", async () => {
      surgeCounts(50, 30);
      const report = await svc.runInspection();
      expect(report.items[1].status).toBe("ok");
    });
  });

  describe("③ 结算对账告警", () => {
    it("近24h 有 SETTLEMENT_RECONCILE 告警 → 异常建 HIGH 待办", async () => {
      mockPrisma.notification.count.mockResolvedValue(3);
      const report = await svc.runInspection();

      expect(mockPrisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ targetType: "SETTLEMENT_RECONCILE" }) }),
      );
      expect(report.items[2]).toMatchObject({ key: "settlement_reconcile", status: "anomaly", detail: { alerts: 3 } });
      expect(mockOps.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "HIGH", title: expect.stringContaining("结算对账告警") }),
        "CLAUDE",
      );
    });
  });

  describe("④ 超时未发货", () => {
    it("PAID 超48h 未 shipped 有计数 → 异常建 MEDIUM 待办（payload 带详情）", async () => {
      mockPrisma.order.count.mockResolvedValue(4);
      const report = await svc.runInspection();

      expect(mockPrisma.order.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PAID", shippedAt: null }) }),
      );
      expect(report.items[3]).toMatchObject({ key: "overdue_orders", status: "anomaly", detail: expect.objectContaining({ count: 4 }) });
      expect(mockOps.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "MEDIUM",
          title: expect.stringContaining("超时未发货订单 4 笔"),
          payload: expect.objectContaining({ key: "overdue_orders", detail: expect.objectContaining({ count: 4 }) }),
        }),
        "CLAUDE",
      );
    });
  });

  describe("⑤ 关键聚合新鲜度 — 白名单自动处置", () => {
    it("DashboardDaily 昨日缺行+开关开 → rebuildDate 补跑+审计 executor=CLAUDE，不建待办", async () => {
      mockPrisma.dashboardDaily.findUnique.mockResolvedValue(null);
      const report = await svc.runInspection();

      expect(mockDaily.rebuildDate).toHaveBeenCalledTimes(1);
      expect(mockDaily.rebuildDate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
      expect(mockSystem.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ops_inspection.autofix", executor: "CLAUDE", detail: expect.stringContaining("DashboardDaily") }),
      );
      expect(mockOps.create).not.toHaveBeenCalled();
      expect(report.autoFixed).toBe(1);
      expect(report.items[4].actions).toContain("auto_fixed:DashboardDaily");
      // 自动处置了也如实记异常，报告可见
      expect(report.anomalies).toBe(1);
    });

    it("MerchantMetric 昨日缺行+开关开 → aggregateDate 补跑", async () => {
      mockPrisma.merchantMetric.count.mockResolvedValue(0);
      const report = await svc.runInspection();

      expect(mockMetric.aggregateDate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
      expect(mockDaily.rebuildDate).not.toHaveBeenCalled();
      expect(report.autoFixed).toBe(1);
      expect(report.items[4].actions).toContain("auto_fixed:MerchantMetric");
    });

    it("无 ACTIVE 商家时 MerchantMetric 缺行是合法空态 → 不判异常不补跑", async () => {
      mockPrisma.merchant.count.mockResolvedValue(0);
      mockPrisma.merchantMetric.count.mockResolvedValue(0);
      const report = await svc.runInspection();

      expect(report.items[4].status).toBe("ok");
      expect(mockMetric.aggregateDate).not.toHaveBeenCalled();
    });

    it("automation_enabled=false → 一律只建任务不动手（rebuildDate 不调用）", async () => {
      mockSystem.isAutomationEnabled.mockResolvedValue(false);
      mockPrisma.dashboardDaily.findUnique.mockResolvedValue(null);
      const report = await svc.runInspection();

      expect(mockDaily.rebuildDate).not.toHaveBeenCalled();
      expect(mockMetric.aggregateDate).not.toHaveBeenCalled();
      expect(mockOps.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: "INSPECT", title: expect.stringContaining("自动化已暂停") }),
        "CLAUDE",
      );
      expect(report.autoFixed).toBe(0);
      expect(report.tasksCreated).toBe(1);
      expect(report.automationEnabled).toBe(false);
    });

    it("自动补跑失败 → 降级转人工 HIGH 待办", async () => {
      mockPrisma.dashboardDaily.findUnique.mockResolvedValue(null);
      mockDaily.rebuildDate.mockRejectedValue(new Error("聚合超时"));
      const report = await svc.runInspection();

      expect(mockOps.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "HIGH", title: expect.stringContaining("自动补跑失败") }),
        "CLAUDE",
      );
      expect(report.autoFixed).toBe(0);
      expect(report.tasksCreated).toBe(1);
    });
  });

  describe("容错与 cron 入口", () => {
    it("单项检查自身抛错 → check_failed 记录+MEDIUM 待办，不中断其余四项", async () => {
      mockPrisma.notification.count.mockRejectedValue(new Error("查询超时"));
      const report = await svc.runInspection();

      expect(report.items).toHaveLength(5);
      expect(report.items[2].status).toBe("check_failed");
      expect(report.items[4].status).toBe("ok"); // 后续项照常执行
      expect(mockOps.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "MEDIUM", title: expect.stringContaining("巡检项执行失败") }),
        "CLAUDE",
      );
      // 报告仍照常落库
      expect(mockPrisma.opsTask.create).toHaveBeenCalledTimes(1);
    });

    it("cron 入口走 runExclusive('ops-inspection') 多实例互斥并实际执行巡检", async () => {
      await svc.dailyInspectionCron();

      expect(mockRedis.runExclusive).toHaveBeenCalledWith("ops-inspection", expect.any(Number), expect.any(Function));
      // 互斥体内确实跑了一轮：报告任务已落库
      expect(mockPrisma.opsTask.create).toHaveBeenCalledTimes(1);
    });
  });
});
