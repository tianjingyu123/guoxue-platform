import { EntitlementService } from "./entitlement.service";

describe("EntitlementService", () => {
  let service: EntitlementService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      entitlementLedger: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: "ledger-1", createdAt: new Date(), ...data }),
          ),
        count: jest.fn().mockResolvedValue(0),
      },
      entitlementBalance: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest
          .fn()
          .mockImplementation(({ create }) =>
            Promise.resolve({ id: "balance-1", version: 0, ...create }),
          ),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ memberLevel: "NONE", memberExpire: null }),
      },
      practitionerProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      ebookPurchase: { findMany: jest.fn().mockResolvedValue([]) },
      instituteContentPurchase: { findMany: jest.fn().mockResolvedValue([]) },
      virtualCoinAccount: { findUnique: jest.fn().mockResolvedValue(null) },
      userCoupon: { count: jest.fn().mockResolvedValue(0) },
    };
    prisma.$transaction = jest.fn((callback: (tx: any) => unknown) => callback(prisma));
    service = new EntitlementService(prisma);
  });

  it("幂等发放权益并创建当前投影", async () => {
    prisma.entitlementLedger.findMany.mockResolvedValue([
      {
        id: "ledger-1",
        userId: "u1",
        entitlementKey: "course.access",
        kind: "ACCESS",
        resourceType: "COURSE",
        resourceId: "c1",
        scope: "GLOBAL",
        action: "GRANT",
        quantity: 1,
        unlimited: false,
        validFrom: new Date(),
        validUntil: null,
      },
    ]);
    const result = await service.grant({
      userId: "u1",
      entitlementKey: "course.access",
      kind: "ACCESS",
      resourceType: "COURSE",
      resourceId: "c1",
      quantity: 1,
      sourceType: "ORDER",
      sourceId: "o1",
      idempotencyKey: "order:o1:course.access",
    });

    expect(result.id).toBe("balance-1");
    expect(prisma.entitlementLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", sourceId: "o1", quantity: 1 }),
      }),
    );
    expect(prisma.entitlementBalance.upsert).toHaveBeenCalled();
  });

  it("不同订单并发发放同一权益时使用数据库原子增量并按流水收敛", async () => {
    prisma.entitlementLedger.findMany.mockResolvedValue([
      {
        id: "ledger-old",
        userId: "u1",
        entitlementKey: "quota.report",
        kind: "QUOTA",
        resourceType: "",
        resourceId: "",
        scope: "GLOBAL",
        action: "GRANT",
        quantity: 4,
        unlimited: false,
        validFrom: new Date(Date.now() - 1000),
        validUntil: null,
      },
      {
        id: "ledger-new",
        userId: "u1",
        entitlementKey: "quota.report",
        kind: "QUOTA",
        resourceType: "",
        resourceId: "",
        scope: "GLOBAL",
        action: "GRANT",
        quantity: 2,
        unlimited: false,
        validFrom: new Date(),
        validUntil: null,
      },
    ]);

    await service.grant({
      userId: "u1",
      entitlementKey: "quota.report",
      kind: "QUOTA",
      quantity: 2,
      sourceType: "ORDER",
      sourceId: "o2",
      idempotencyKey: "order:o2:quota.report",
    });

    expect(prisma.entitlementBalance.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        update: expect.objectContaining({ quantity: { increment: 2 } }),
      }),
    );
    expect(prisma.entitlementBalance.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ quantity: 6 }),
      }),
    );
  });

  it("重复幂等键直接返回既有投影，不重复写流水", async () => {
    prisma.entitlementLedger.findUnique.mockResolvedValue({ id: "existing-ledger" });
    prisma.entitlementBalance.findUnique.mockResolvedValue({ id: "existing-balance", quantity: 1 });

    const result = await service.grant({
      userId: "u1",
      entitlementKey: "course.access",
      kind: "ACCESS",
      resourceType: "COURSE",
      resourceId: "c1",
      sourceType: "ORDER",
      sourceId: "o1",
      idempotencyKey: "order:o1:course.access",
    });

    expect(result.id).toBe("existing-balance");
    expect(prisma.entitlementLedger.create).not.toHaveBeenCalled();
    expect(prisma.entitlementBalance.upsert).not.toHaveBeenCalled();
  });

  it("有限额度通过 version 和余额条件原子扣减", async () => {
    prisma.entitlementBalance.findUnique
      .mockResolvedValueOnce({
        id: "b1",
        userId: "u1",
        entitlementKey: "quota.report",
        kind: "QUOTA",
        resourceType: "",
        resourceId: "",
        scope: "GLOBAL",
        quantity: 2,
        unlimited: false,
        status: "ACTIVE",
        validUntil: null,
        version: 3,
      })
      .mockResolvedValueOnce({
        id: "b1",
        userId: "u1",
        entitlementKey: "quota.report",
        kind: "QUOTA",
        resourceType: "",
        resourceId: "",
        scope: "GLOBAL",
        quantity: 1,
        unlimited: false,
        status: "ACTIVE",
        validUntil: null,
        version: 4,
      });

    const result = await service.consume({
      userId: "u1",
      entitlementKey: "quota.report",
      quantity: 1,
      sourceType: "REPORT",
      sourceId: "r1",
      idempotencyKey: "report:r1:consume",
    });

    expect(prisma.entitlementBalance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "b1", version: 3, quantity: { gte: 1 } }),
        data: { quantity: { decrement: 1 }, version: { increment: 1 } },
      }),
    );
    expect(result.quantity).toBe(1);
  });

  it("统一读模型兼容迁移前的会员和钱包数据", async () => {
    const expire = new Date(Date.now() + 86400000);
    prisma.user.findUnique.mockResolvedValue({ memberLevel: "YEARLY", memberExpire: expire });
    prisma.virtualCoinAccount.findUnique.mockResolvedValue({ balance: 88, frozen: 3 });
    prisma.userCoupon.count.mockResolvedValue(2);

    const result = await service.getMyEntitlements("u1");

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entitlementKey: "membership.school", effectiveStatus: "ACTIVE" }),
      ]),
    );
    expect(result.wallet).toEqual({ coinBalance: 88, coinFrozen: 3, availableCoupons: 2 });
  });

  it("历史会员迁移快照不能覆盖已经失效的实时会员状态", async () => {
    prisma.user.findUnique.mockResolvedValue({ memberLevel: "NONE", memberExpire: null });
    prisma.entitlementBalance.findMany.mockResolvedValue([
      {
        id: "legacy-member",
        userId: "u1",
        entitlementKey: "membership.school",
        kind: "MEMBERSHIP",
        resourceType: "MEMBER_PLAN",
        resourceId: "",
        scope: "GLOBAL",
        quantity: 1,
        unlimited: true,
        validUntil: null,
        status: "ACTIVE",
      },
    ]);

    const result = await service.getMyEntitlements("u1");

    expect(result.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entitlementKey: "membership.school", effectiveStatus: "ACTIVE" }),
      ]),
    );
  });
});
