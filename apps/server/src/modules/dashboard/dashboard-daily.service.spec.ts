import { Test } from "@nestjs/testing";
import { DashboardDailyService } from "./dashboard-daily.service";
import { DashboardDailyController } from "./dashboard-daily.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { BusinessException } from "../../common/business.exception";
import { ROLES_KEY } from "../../common/roles.decorator";
import { RolesGuard } from "../../common/roles.guard";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

const mockPrisma = {
  trackEvent: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  memberPurchase: {
    count: jest.fn(),
  },
  ledgerEntry: {
    aggregate: jest.fn(),
  },
  dashboardDaily: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
};

// runExclusive 直接执行传入的 fn（单实例测试）
const mockRedis = {
  runExclusive: jest.fn((_name: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
};

/** 装一轮 rebuildDate 所需的全部 mock 返回（Promise.all 内按声明顺序调用） */
function primeRebuildMocks() {
  mockPrisma.trackEvent.findMany
    .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]) // dau distinct
    .mockResolvedValueOnce([{ userId: "n1" }]); // d1 回访
  mockPrisma.trackEvent.count
    .mockResolvedValueOnce(100) // pv
    .mockResolvedValueOnce(3); // errors
  mockPrisma.user.count.mockResolvedValueOnce(5); // newUsers
  mockPrisma.order.findMany.mockResolvedValueOnce([
    { payAmount: "88.00", amount: "100.00" },
    { payAmount: null, amount: "12.50" },
  ]);
  mockPrisma.memberPurchase.count.mockResolvedValueOnce(2);
  mockPrisma.ledgerEntry.aggregate.mockResolvedValueOnce({ _sum: { amount: "66.60" } });
  mockPrisma.trackEvent.groupBy.mockResolvedValueOnce([
    { path: "/pkg-shop/detail", _count: { _all: 60 } },
    { path: "/pkg-shop/list", _count: { _all: 20 } },
    { path: "/pages/index/index", _count: { _all: 20 } },
  ]);
  mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "n1" }, { id: "n2" }]); // 前一日新用户 cohort
  mockPrisma.dashboardDaily.upsert.mockResolvedValueOnce({});
}

describe("DashboardDailyService（看-P1）", () => {
  let svc: DashboardDailyService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        DashboardDailyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(DashboardDailyService);
  });

  beforeEach(() => jest.clearAllMocks());

  // 1. 聚合正确性 + 落表走 upsert
  it("rebuildDate：按契约聚合各指标并以 date 为键 upsert", async () => {
    primeRebuildMocks();

    const res = await svc.rebuildDate("2026-07-02");

    expect(res.date).toBe("2026-07-02");
    expect(res.metrics.dau).toBe(2);
    expect(res.metrics.pv).toBe(100);
    expect(res.metrics.newUsers).toBe(5);
    expect(res.metrics.gmv).toBe(100.5); // 88 + 12.5（payAmount 缺省回退 amount）
    expect(res.metrics.ordersPaid).toBe(2);
    expect(res.metrics.memberNew).toBe(2);
    expect(res.metrics.commissionSum).toBe(66.6);
    expect(res.metrics.errors24h).toBe(3);
    // moduleHeat 按首段前缀归并：/pkg-shop 60+20=80 居首
    expect(res.metrics.moduleHeat[0]).toEqual({ path: "/pkg-shop", pv: 80 });
    expect(res.metrics.moduleHeat[1]).toEqual({ path: "/pages", pv: 20 });
    // d1Retention：前日 2 新用户 1 人回访
    expect(res.metrics.d1Retention).toBe(0.5);

    expect(mockPrisma.dashboardDaily.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.dashboardDaily.upsert.mock.calls[0][0].where).toEqual({ date: "2026-07-02" });
  });

  // 2. 幂等：同日重跑仍走 upsert（date 唯一键），不产生第二行
  it("rebuildDate：同日重跑幂等（两次均 upsert 同一 date，无 create 直插）", async () => {
    primeRebuildMocks();
    await svc.rebuildDate("2026-07-02");
    primeRebuildMocks();
    await svc.rebuildDate("2026-07-02");

    expect(mockPrisma.dashboardDaily.upsert).toHaveBeenCalledTimes(2);
    for (const call of mockPrisma.dashboardDaily.upsert.mock.calls) {
      expect(call[0].where).toEqual({ date: "2026-07-02" });
      expect(call[0].update).toBeDefined(); // 已存在时走 update，不重复插行
    }
  });

  // 3. 前一日无新用户 → d1Retention 诚实省略
  it("rebuildDate：前一日无新用户时省略 d1Retention", async () => {
    mockPrisma.trackEvent.findMany.mockResolvedValueOnce([]); // dau
    mockPrisma.trackEvent.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockPrisma.user.count.mockResolvedValueOnce(0);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);
    mockPrisma.memberPurchase.count.mockResolvedValueOnce(0);
    mockPrisma.ledgerEntry.aggregate.mockResolvedValueOnce({ _sum: { amount: null } });
    mockPrisma.trackEvent.groupBy.mockResolvedValueOnce([]);
    mockPrisma.user.findMany.mockResolvedValueOnce([]); // cohort 空
    mockPrisma.dashboardDaily.upsert.mockResolvedValueOnce({});

    const res = await svc.rebuildDate("2026-07-02");

    expect(res.metrics.d1Retention).toBeUndefined();
    expect(res.metrics.gmv).toBe(0);
  });

  // 4. 非法日期拒绝
  it("rebuildDate：非法日期抛 BusinessException", async () => {
    await expect(svc.rebuildDate("20260702")).rejects.toBeInstanceOf(BusinessException);
    await expect(svc.rebuildDate("not-a-date")).rejects.toBeInstanceOf(BusinessException);
    expect(mockPrisma.dashboardDaily.upsert).not.toHaveBeenCalled();
  });

  // 5. cron 走 runExclusive 互斥锁
  it("aggregateYesterday：经 redis.runExclusive('dashboard-daily') 互斥执行", async () => {
    primeRebuildMocks();
    await svc.aggregateYesterday();
    expect(mockRedis.runExclusive).toHaveBeenCalledWith("dashboard-daily", 600, expect.any(Function));
    expect(mockPrisma.dashboardDaily.upsert).toHaveBeenCalledTimes(1);
  });

  // 6. 序列查询只打聚合表 + days 上限钳制
  it("getDaily：只查 DashboardDaily 聚合表，days 钳制在 1~90", async () => {
    mockPrisma.dashboardDaily.findMany.mockResolvedValueOnce([
      { date: "2026-07-01", metrics: { dau: 1 } },
    ]);
    const rows = await svc.getDaily(9999);
    expect(rows).toHaveLength(1);
    expect(mockPrisma.dashboardDaily.findMany).toHaveBeenCalledTimes(1);
    // 不打原始大表
    expect(mockPrisma.trackEvent.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  // 7. 今日实时轻查
  it("getToday：返回今日 dau/pv/ordersPaid（直查不落表）", async () => {
    mockPrisma.trackEvent.findMany.mockResolvedValueOnce([{ userId: "u1" }]);
    mockPrisma.trackEvent.count.mockResolvedValueOnce(42);
    mockPrisma.order.count.mockResolvedValueOnce(7);

    const res = await svc.getToday();

    expect(res.dau).toBe(1);
    expect(res.pv).toBe(42);
    expect(res.ordersPaid).toBe(7);
    expect(res.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mockPrisma.dashboardDaily.upsert).not.toHaveBeenCalled();
  });
});

describe("DashboardDailyController 权限守卫（看-P1）", () => {
  it("控制器挂载 JwtAuthGuard + RolesGuard", () => {
    const guards: unknown[] = Reflect.getMetadata("__guards__", DashboardDailyController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it.each(["getDaily", "getToday", "rebuild"] as const)("%s 端点声明 SUPER_ADMIN/OPERATION_ADMIN/FINANCE_ADMIN 角色", (method) => {
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, DashboardDailyController.prototype[method]) ?? [];
    expect(roles).toEqual(expect.arrayContaining(["SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN"]));
  });
});
