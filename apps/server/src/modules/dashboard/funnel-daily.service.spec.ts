import { Test } from "@nestjs/testing";
import { FunnelDailyService } from "./funnel-daily.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";

/** D-T1 漏斗日聚合单测：四漏斗步骤计数/幂等upsert/序列查询/cron互斥 */

const mockPrisma = {
  user: { findMany: jest.fn() },
  paipanRecord: { findMany: jest.fn() },
  trackEvent: { findMany: jest.fn() },
  memberPurchase: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  teacherCertification: { count: jest.fn() },
  ledgerEntry: { findMany: jest.fn() },
  funnelDaily: { upsert: jest.fn(), findMany: jest.fn() },
};

const mockRedis = {
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

function quietBaseline() {
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.paipanRecord.findMany.mockResolvedValue([]);
  mockPrisma.trackEvent.findMany.mockResolvedValue([]);
  mockPrisma.memberPurchase.findMany.mockResolvedValue([]);
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.teacherCertification.count.mockResolvedValue(0);
  mockPrisma.ledgerEntry.findMany.mockResolvedValue([]);
  mockPrisma.funnelDaily.upsert.mockResolvedValue({});
  mockPrisma.funnelDaily.findMany.mockResolvedValue([]);
}

describe("FunnelDailyService", () => {
  let svc: FunnelDailyService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        FunnelDailyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(FunnelDailyService);
  });

  beforeEach(() => { jest.clearAllMocks(); quietBaseline(); });

  it("aggregateCron 经 runExclusive('funnel-daily') 互斥，且重算昨日+前日两天（F1 次日回访幂等修正）", async () => {
    await svc.aggregateCron();
    expect(mockRedis.runExclusive).toHaveBeenCalledWith("funnel-daily", 600, expect.any(Function));
    // 4 漏斗 × (3+3+3+4)=13 步骤 × 2 天 = 26 次 upsert
    expect(mockPrisma.funnelDaily.upsert).toHaveBeenCalledTimes(26);
  });

  it("非法日期抛业务异常", async () => {
    await expect(svc.rebuildDate("2026/07/05")).rejects.toThrow(BusinessException);
  });

  it("F1 激活：注册 cohort 内数首次排盘与次日回访（distinct 用户口径）", async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }, { id: "u3" }]);
    mockPrisma.paipanRecord.findMany
      .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]) // F1 step2（cohort 内）
      .mockResolvedValueOnce([]); // F4 step1（全量·本用例不关心）
    mockPrisma.trackEvent.findMany
      .mockResolvedValueOnce([{ userId: "u1" }]); // F1 step3 次日回访（其余 trackEvent 查询走 baseline []）

    await svc.rebuildDate("2026-07-01");

    const calls = mockPrisma.funnelDaily.upsert.mock.calls.map((c) => c[0].create);
    const f1 = calls.filter((c) => c.funnel === "F1_activation");
    expect(f1).toEqual([
      expect.objectContaining({ step: 1, stepKey: "register", count: 3 }),
      expect.objectContaining({ step: 2, stepKey: "first_paipan", count: 2 }),
      expect.objectContaining({ step: 3, stepKey: "d1_return", count: 1 }),
    ]);
  });

  it("F1 当日零注册时不查排盘/回访（短路），三步全 0", async () => {
    await svc.rebuildDate("2026-07-01");
    const f1 = mockPrisma.funnelDaily.upsert.mock.calls
      .map((c) => c[0].create).filter((c) => c.funnel === "F1_activation");
    expect(f1.map((c) => c.count)).toEqual([0, 0, 0]);
  });

  it("F2 会员：曝光/点击事件 distinct + MemberPurchase 购买", async () => {
    // trackEvent.findMany 顺序：F1 无（0注册短路）→ F2 member_page_view → F2(distinct 内部同方法) member_pay_click → F3 detail_view → F3 buy_click → F4 b_entry
    mockPrisma.trackEvent.findMany
      .mockResolvedValueOnce([{ userId: "a" }, { userId: "b" }]) // member_page_view
      .mockResolvedValueOnce([{ userId: "a" }]) // member_pay_click
      .mockResolvedValue([]); // 其余
    mockPrisma.memberPurchase.findMany.mockResolvedValue([{ userId: "a" }]);

    await svc.rebuildDate("2026-07-01");

    const f2 = mockPrisma.funnelDaily.upsert.mock.calls
      .map((c) => c[0].create).filter((c) => c.funnel === "F2_member");
    expect(f2.map((c) => [c.stepKey, c.count])).toEqual([
      ["member_page_view", 2], ["member_pay_click", 1], ["member_paid", 1],
    ]);
  });

  it("F3 电商：支付步骤只计 PAID/SHIPPED/COMPLETED 状态", async () => {
    mockPrisma.order.findMany.mockResolvedValue([{ userId: "x" }, { userId: "y" }]);
    await svc.rebuildDate("2026-07-01");
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ["PAID", "SHIPPED", "COMPLETED"] } }),
    }));
    const f3 = mockPrisma.funnelDaily.upsert.mock.calls
      .map((c) => c[0].create).filter((c) => c.funnel === "F3_commerce");
    expect(f3[2]).toEqual(expect.objectContaining({ stepKey: "paid", count: 2 }));
  });

  it("F4 从业者：四步齐（工具/B端曝光/认证/出佣·出佣只计正额）", async () => {
    mockPrisma.teacherCertification.count.mockResolvedValue(2);
    mockPrisma.ledgerEntry.findMany.mockResolvedValue([{ beneficiaryId: "s1" }]);
    await svc.rebuildDate("2026-07-01");
    expect(mockPrisma.ledgerEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ amount: { gt: 0 } }),
    }));
    const f4 = mockPrisma.funnelDaily.upsert.mock.calls
      .map((c) => c[0].create).filter((c) => c.funnel === "F4_practitioner");
    expect(f4.map((c) => c.stepKey)).toEqual(["tool_use", "b_entry_view", "cert_apply", "commission_earned"]);
    expect(f4[2].count).toBe(2);
    expect(f4[3].count).toBe(1);
  });

  it("upsert 幂等键为 date+funnel+step", async () => {
    await svc.rebuildDate("2026-07-01");
    expect(mockPrisma.funnelDaily.upsert.mock.calls[0][0].where).toEqual({
      date_funnel_step: { date: "2026-07-01", funnel: "F1_activation", step: 1 },
    });
  });

  it("series 按日期分组返回步骤序列，days 钳制在 1-90", async () => {
    mockPrisma.funnelDaily.findMany.mockResolvedValue([
      { date: "2026-07-01", funnel: "F2_member", step: 1, stepKey: "member_page_view", count: 10 },
      { date: "2026-07-01", funnel: "F2_member", step: 2, stepKey: "member_pay_click", count: 4 },
    ]);
    const r = await svc.series("F2_member", 9999);
    expect(r).toEqual([
      { date: "2026-07-01", steps: [
        { step: 1, stepKey: "member_page_view", count: 10 },
        { step: 2, stepKey: "member_pay_click", count: 4 },
      ] },
    ]);
  });
});
