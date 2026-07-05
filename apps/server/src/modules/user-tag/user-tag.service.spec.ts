import { Test } from "@nestjs/testing";
import { UserTagService } from "./user-tag.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

/** D-T2 用户标签单测：三层标签判定边界/whale阈值/分批游标/幂等落库/查询 */

const mockPrisma = {
  user: { findMany: jest.fn() },
  order: { groupBy: jest.fn() },
  memberPurchase: { findMany: jest.fn() },
  trackEvent: { findMany: jest.fn(), groupBy: jest.fn() },
  paipanRecord: { groupBy: jest.fn() },
  teacherCertification: { findMany: jest.fn() },
  station: { findMany: jest.fn() },
  merchant: { findMany: jest.fn() },
  stationOffline: { findMany: jest.fn() },
  circle: { findMany: jest.fn() },
  userInterest: { findMany: jest.fn() },
  userTag: { deleteMany: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

const mockRedis = {
  runExclusive: jest.fn((_n: string, _t: number, fn: () => Promise<unknown>) => fn()),
};

function quietBaseline() {
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.order.groupBy.mockResolvedValue([]);
  mockPrisma.memberPurchase.findMany.mockResolvedValue([]);
  mockPrisma.trackEvent.findMany.mockResolvedValue([]);
  mockPrisma.trackEvent.groupBy.mockResolvedValue([]);
  mockPrisma.paipanRecord.groupBy.mockResolvedValue([]);
  mockPrisma.teacherCertification.findMany.mockResolvedValue([]);
  mockPrisma.station.findMany.mockResolvedValue([]);
  mockPrisma.merchant.findMany.mockResolvedValue([]);
  mockPrisma.stationOffline.findMany.mockResolvedValue([]);
  mockPrisma.circle.findMany.mockResolvedValue([]);
  mockPrisma.userInterest.findMany.mockResolvedValue([]);
  mockPrisma.userTag.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.userTag.createMany.mockResolvedValue({ count: 0 });
}

/** 提取本轮 createMany 里某用户的标签集合 */
function tagsOf(uid: string): string[] {
  const rows = mockPrisma.userTag.createMany.mock.calls.flatMap((c) => c[0].data as Array<{ userId: string; tag: string }>);
  return rows.filter((r) => r.userId === uid).map((r) => r.tag);
}

describe("UserTagService", () => {
  let svc: UserTagService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        UserTagService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    svc = mod.get(UserTagService);
  });

  beforeEach(() => { jest.clearAllMocks(); quietBaseline(); });

  it("recomputeCron 经 runExclusive('user-tag-recompute') 互斥", async () => {
    await svc.recomputeCron();
    expect(mockRedis.runExclusive).toHaveBeenCalledWith("user-tag-recompute", 1800, expect.any(Function));
  });

  it("零用户直接结束不落库", async () => {
    const r = await svc.recomputeAll();
    expect(r.users).toBe(0);
    expect(mockPrisma.userTag.createMany).not.toHaveBeenCalled();
  });

  it("流失用户：churned_30d + pay_none", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u1" }]).mockResolvedValue([]);
    await svc.recomputeAll();
    expect(tagsOf("u1")).toEqual(expect.arrayContaining(["churned_30d", "pay_none"]));
    expect(tagsOf("u1")).not.toContain("active_7d");
  });

  it("活跃会员复购用户：active_7d + pay_repeat + pay_member", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u2" }]).mockResolvedValue([]);
    // distinctActive 三次调用（d7/d14/d30）都返回 u2 活跃；B端曝光查询走 OR path 的 findMany 也会命中同 mock——
    // 用 mockImplementation 按查询条件区分
    mockPrisma.trackEvent.findMany.mockImplementation(async (args: { where: { action?: string } }) =>
      args.where.action === "page_view" && !("OR" in args.where) ? [{ userId: "u2" }] : [],
    );
    mockPrisma.order.groupBy.mockResolvedValue([
      { userId: "u2", _count: { _all: 3 }, _sum: { payAmount: 500 } },
    ]);
    mockPrisma.memberPurchase.findMany.mockResolvedValue([{ userId: "u2" }]);
    await svc.recomputeAll();
    const tags = tagsOf("u2");
    expect(tags).toEqual(expect.arrayContaining(["active_7d", "pay_repeat", "pay_member"]));
    expect(tags).not.toContain("churn_risk"); // 活跃付费用户无流失风险
  });

  it("价格敏感：30天会员页曝光≥3 且从未购会员", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u3" }]).mockResolvedValue([]);
    mockPrisma.trackEvent.groupBy.mockResolvedValue([{ userId: "u3", _count: { _all: 4 } }]);
    await svc.recomputeAll();
    expect(tagsOf("u3")).toContain("price_sensitive");
  });

  it("高潜从业者：月排盘≥20 + 看过B端页 + 未认证", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u4" }]).mockResolvedValue([]);
    mockPrisma.paipanRecord.groupBy.mockResolvedValue([{ userId: "u4", _count: { _all: 25 } }]);
    mockPrisma.trackEvent.findMany.mockImplementation(async (args: { where: Record<string, unknown> }) =>
      "OR" in args.where ? [{ userId: "u4" }] : [],
    );
    await svc.recomputeAll();
    expect(tagsOf("u4")).toContain("high_potential_practitioner");
  });

  it("已认证讲师不标高潜（已转化）且标 role_creator", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u5" }]).mockResolvedValue([]);
    mockPrisma.paipanRecord.groupBy.mockResolvedValue([{ userId: "u5", _count: { _all: 25 } }]);
    mockPrisma.trackEvent.findMany.mockImplementation(async (args: { where: Record<string, unknown> }) =>
      "OR" in args.where ? [{ userId: "u5" }] : [],
    );
    mockPrisma.teacherCertification.findMany.mockResolvedValue([{ userId: "u5", status: "APPROVED" }]);
    await svc.recomputeAll();
    const tags = tagsOf("u5");
    expect(tags).not.toContain("high_potential_practitioner");
    expect(tags).toContain("role_creator");
  });

  it("流失风险：付过费且近14天零活跃", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u6" }]).mockResolvedValue([]);
    mockPrisma.order.groupBy.mockResolvedValue([{ userId: "u6", _count: { _all: 1 }, _sum: { payAmount: 99 } }]);
    await svc.recomputeAll();
    expect(tagsOf("u6")).toEqual(expect.arrayContaining(["pay_once", "churn_risk"]));
  });

  it("偏好标签取 UserInterest score top1", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u7" }]).mockResolvedValue([]);
    mockPrisma.userInterest.findMany.mockResolvedValue([
      { userId: "u7", tag: "yijing", score: 9 },
      { userId: "u7", tag: "shici", score: 3 },
    ]);
    await svc.recomputeAll();
    const tags = tagsOf("u7");
    expect(tags).toContain("pref_yijing");
    expect(tags).not.toContain("pref_shici");
  });

  it("幂等落库：同批先 deleteMany 后 createMany（单事务）", async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u8" }]).mockResolvedValue([]);
    await svc.recomputeAll();
    expect(mockPrisma.userTag.deleteMany).toHaveBeenCalledWith({ where: { userId: { in: ["u8"] } } });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("usersByTag 分页钳制 pageSize≤100", async () => {
    mockPrisma.userTag.findMany.mockResolvedValue([]);
    mockPrisma.userTag.count.mockResolvedValue(0);
    const r = await svc.usersByTag("whale", 1, 9999);
    expect(r.pageSize).toBe(100);
  });

  it("usersByTag 富化昵称（查不到用户时 nickname=null）", async () => {
    mockPrisma.userTag.findMany.mockResolvedValue([
      { userId: "u1", tag: "whale", type: "DERIVED" },
      { userId: "u-gone", tag: "whale", type: "DERIVED" },
    ]);
    mockPrisma.userTag.count.mockResolvedValue(2);
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: "u1", nickname: "张三" }]);
    const r = await svc.usersByTag("whale");
    expect(r.items[0].nickname).toBe("张三");
    expect(r.items[1].nickname).toBeNull();
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["u1", "u-gone"] } },
      select: { id: true, nickname: true },
    });
  });

  it("distribution 按数量降序", async () => {
    mockPrisma.userTag.groupBy.mockResolvedValue([
      { tag: "pay_none", _count: { _all: 5 } },
      { tag: "active_7d", _count: { _all: 9 } },
    ]);
    const r = await svc.distribution();
    expect(r[0]).toEqual({ tag: "active_7d", count: 9 });
  });
});
