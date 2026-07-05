import { Test } from "@nestjs/testing";
import { WeeklyBriefService } from "./weekly-brief.service";
import { DashboardDailyService } from "./dashboard-daily.service";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** D-T4 周报单测：周窗口计算/幂等/AI降级/建议闭环存档/漏斗与告警段 */

const mockPrisma = {
  notification: { findFirst: jest.fn(), createMany: jest.fn() },
  dashboardDaily: { findMany: jest.fn() },
  funnelDaily: { findMany: jest.fn() },
  sentinelAlert: { groupBy: jest.fn() },
  configSystem: { findUnique: jest.fn(), upsert: jest.fn() },
  userRole: { findMany: jest.fn() },
};
const mockRedis = { runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()) };
const mockDaily = { dateStrShanghai: jest.fn() };
const mockGateway = { chat: jest.fn() };

function quietBaseline() {
  mockDaily.dateStrShanghai.mockReturnValue("2026-07-08"); // 周三
  mockPrisma.notification.findFirst.mockResolvedValue(null);
  mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });
  mockPrisma.dashboardDaily.findMany.mockResolvedValue([]);
  mockPrisma.funnelDaily.findMany.mockResolvedValue([]);
  mockPrisma.sentinelAlert.groupBy.mockResolvedValue([]);
  mockPrisma.configSystem.findUnique.mockResolvedValue(null);
  mockPrisma.configSystem.upsert.mockResolvedValue({});
  mockPrisma.userRole.findMany.mockResolvedValue([{ userId: "admin-1" }]);
  mockGateway.chat.mockResolvedValue({ content: "【本周结论】…【异常与假设】…【下周建议】…" });
}

describe("WeeklyBriefService", () => {
  let svc: WeeklyBriefService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        WeeklyBriefService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: DashboardDailyService, useValue: mockDaily },
        { provide: AiGatewayService, useValue: mockGateway },
      ],
    }).compile();
    svc = mod.get(WeeklyBriefService);
  });

  beforeEach(() => { jest.clearAllMocks(); quietBaseline(); });

  it("lastWeekDates：2026-07-08(周三)算出上周一 2026-06-29 起 7 天", () => {
    const dates = svc.lastWeekDates();
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-06-29");
    expect(dates[6]).toBe("2026-07-05");
  });

  it("cron 经 runExclusive('weekly-brief') 互斥", async () => {
    await svc.sendWeeklyCron();
    expect(mockRedis.runExclusive).toHaveBeenCalledWith("weekly-brief", 900, expect.any(Function));
  });

  it("同周已发则幂等跳过", async () => {
    mockPrisma.notification.findFirst.mockResolvedValue({ id: "n1" });
    const r = await svc.sendWeekly();
    expect(r.skipped).toBe(true);
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("正常发送：站内信给管理员·AI 分析段在正文中·建议存档闭环", async () => {
    const r = await svc.sendWeekly();
    expect(r.skipped).toBe(false);
    expect(r.sentTo).toBe(1);
    expect(r.degraded).toBe(false);
    expect(r.text).toContain("AI 周度分析");
    // 建议闭环：AI 成功后存档到 ConfigSystem
    expect(mockPrisma.configSystem.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { configKey: "weekly_brief.last_suggestions" },
    }));
  });

  it("AI 失败降级纯数字版·不存档·周报照发", async () => {
    mockGateway.chat.mockRejectedValue(new Error("AI down"));
    const r = await svc.sendWeekly();
    expect(r.degraded).toBe(true);
    expect(r.sentTo).toBe(1);
    expect(r.text).not.toContain("AI 周度分析");
    expect(mockPrisma.configSystem.upsert).not.toHaveBeenCalled();
  });

  it("上期建议存在时喂给 AI 做执行回顾", async () => {
    mockPrisma.configSystem.findUnique.mockImplementation(async (args: { where: { configKey: string } }) =>
      args.where.configKey === "weekly_brief.last_suggestions" ? { configValue: "上周建议内容XYZ" } : null,
    );
    await svc.sendWeekly();
    const userMsg = mockGateway.chat.mock.calls[0][0].messages[1].content as string;
    expect(userMsg).toContain("上期建议回顾");
    expect(userMsg).toContain("上周建议内容XYZ");
  });

  it("漏斗段：步骤周求和并计算末步/首步转化率", async () => {
    mockPrisma.funnelDaily.findMany.mockResolvedValue([
      { date: "2026-06-29", funnel: "F2_member", step: 1, stepKey: "member_page_view", count: 60 },
      { date: "2026-06-30", funnel: "F2_member", step: 1, stepKey: "member_page_view", count: 40 },
      { date: "2026-06-29", funnel: "F2_member", step: 3, stepKey: "member_paid", count: 5 },
    ]);
    const r = await svc.sendWeekly();
    expect(r.text).toContain("member_page_view 100");
    expect(r.text).toContain("转化率 5.0%");
  });

  it("哨兵段：无告警显示✅·有告警按级别列出", async () => {
    mockPrisma.sentinelAlert.groupBy.mockResolvedValue([
      { rule: "sms_fail_rate", level: "P2", _count: { _all: 3 } },
      { rule: "pay_success_rate", level: "P1", _count: { _all: 1 } },
    ]);
    const r = await svc.sendWeekly();
    expect(r.text).toContain("P1 pay_success_rate ×1");
    expect(r.text).toContain("P2 sms_fail_rate ×3");
  });

  it("webhook 未配置时静默跳过（fetch 不调用）", async () => {
    const fetchMock = jest.fn();
    (global as Record<string, unknown>).fetch = fetchMock;
    await svc.sendWeekly();
    expect(fetchMock).not.toHaveBeenCalled();
    delete (global as Record<string, unknown>).fetch;
  });
});
