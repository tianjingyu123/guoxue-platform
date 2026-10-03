import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { CircleMembershipService } from "../circle/services/circle-membership.service";
import { CircleSharedService } from "../circle/services/circle-shared.service";
import { UnifiedPricingService } from "../pricing/unified-pricing.service";
import { clearCircleMembershipCaches } from "../circle/services/circle-membership-cache.task";
import { ShopPaymentService } from "./shop-payment.service";
import { ShopOrderLifecycleService } from "./shop-order-lifecycle.service";
import { fulfillCircleOrderTx } from "./circle-fulfillment";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55462" ||
    u.username !== "qa_voice" ||
    !u.pathname.startsWith("/entitlement_notice_qa_")
  )
    throw new Error("付费缓存测试仅允许独立合成库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("付费圈子实际履约与持久缓存事实", () => {
  let db: PrismaClient;
  const users: string[] = [],
    circles: string[] = [],
    orders: string[] = [];
  const clear = jest.fn(
    async (_targets: ReadonlyArray<{ circleId: string; userId: string }>) => undefined,
  );
  const redis = {
    clearCircleMembershipShared: clear,
    setNX: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisService;
  const webhook = { fire: jest.fn().mockResolvedValue(undefined) };
  const notice = { sendOnce: jest.fn().mockResolvedValue(undefined) };
  const attribution = { recordOrderCommissionAndFee: jest.fn().mockResolvedValue(undefined) };
  const orderService = {
    invalidateOrderCache: jest.fn().mockResolvedValue(undefined),
    settleGroupBuyIfNeeded: jest.fn().mockResolvedValue(undefined),
  };
  const payment = () =>
    new ShopPaymentService(
      db as unknown as PrismaService,
      redis,
      {} as never,
      {} as never,
      {} as never,
      webhook as never,
      {} as never,
      {} as never,
      attribution as never,
      orderService as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      notice as never,
    );
  const membership = () =>
    new CircleMembershipService(
      db as unknown as PrismaService,
      redis,
      {} as UnifiedPricingService,
      new CircleSharedService(db as unknown as PrismaService),
    );
  const fixture = async (
    kind: "new" | "expired" | "renew" = "new",
    quantity = 1,
    pending = false,
  ) => {
    const owner = await db.user.create({ data: { nickname: "合成付费缓存圈主" } }),
      buyer = await db.user.create({ data: { nickname: "合成付费缓存成员" } });
    users.push(owner.id, buyer.id);
    const circle = await db.circle.create({
      data: {
        name: "合成付费缓存圈",
        intro: "独立库，不真实收费",
        tags: [],
        type: "YEARLY",
        status: "ACTIVE",
        ownerId: owner.id,
        price: 88,
        memberCount: kind === "new" ? 1 : 2,
      },
    });
    circles.push(circle.id);
    await db.circleMember.create({
      data: { circleId: circle.id, userId: owner.id, role: "OWNER" },
    });
    const initialExpiry =
      kind === "renew" ? new Date(Date.now() + 10 * 86400000) : new Date(Date.now() - 86400000);
    if (kind !== "new")
      await db.circleMember.create({
        data: { circleId: circle.id, userId: buyer.id, expireAt: initialExpiry },
      });
    const order = await db.order.create({
      data: {
        userId: buyer.id,
        targetId: circle.id,
        type: kind === "renew" ? "CIRCLE_RENEW" : "CIRCLE_JOIN",
        amount: 88,
        payAmount: 88,
        quantity,
        status: pending ? "PENDING" : "PAID",
        paidAt: pending ? null : new Date(),
        payMethod: "WECHAT",
        payTransactionId: "synthetic-intent-" + randomUUID(),
      },
    });
    orders.push(order.id);
    return {
      circleId: circle.id,
      userId: buyer.id,
      ownerId: owner.id,
      orderId: order.id,
      initialExpiry,
      intent: order.payTransactionId!,
    };
  };
  const rows = (f: { circleId: string }) =>
    db.$queryRaw<
      Array<{ id: string; clearedAt: Date | null }>
    >`SELECT id,"clearedAt" FROM "CircleMembershipCacheInvalidation" WHERE "circleId"=${f.circleId}`;
  const failInsert = async (work: () => Promise<void>) => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_paid_cache_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic paid cache insert failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_paid_cache_fail BEFORE INSERT ON "CircleMembershipCacheInvalidation" FOR EACH ROW EXECUTE FUNCTION synthetic_paid_cache_fail()',
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER synthetic_paid_cache_fail ON "CircleMembershipCacheInvalidation"',
      );
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_paid_cache_fail()");
    }
  };
  const callback = (f: Awaited<ReturnType<typeof fixture>>) => ({
    out_trade_no: f.intent,
    transaction_id: "synthetic-paid-" + f.orderId,
    trade_state: "SUCCESS",
    attach: f.orderId,
    amount: { total: 8800 },
  });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [i] = await db.$queryRaw<
      Array<{ name: string; port: number }>
    >`SELECT current_database() AS name,inet_server_port() AS port`;
    if (!i.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(i.port))
      throw new Error("隔离PG身份不符");
  });
  beforeEach(() => {
    clear.mockReset();
    clear.mockResolvedValue(undefined);
    webhook.fire.mockClear();
    notice.sendOnce.mockClear();
    attribution.recordOrderCommissionAndFee.mockClear();
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.circleRevenueRecord.deleteMany({ where: { circleId: { in: circles } } });
    for (const circleId of circles)
      await db.$executeRaw`DELETE FROM "CircleMembershipCacheInvalidation" WHERE "circleId"=${circleId}`;
    await db.order.deleteMany({ where: { id: { in: orders.splice(0) } } });
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it.each(["new", "expired", "renew"] as const)(
    "%s：实际成员变更、订单认领和缓存事实一次提交；同单不重复",
    async (kind) => {
      const f = await fixture(kind, 2),
        before = Date.now();
      const r = await db.$transaction((tx) => fulfillCircleOrderTx(tx, f.orderId));
      expect(r.outcome).toBe(kind === "renew" ? "extended" : "fulfilled");
      expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe(
        "COMPLETED",
      );
      expect((await db.circle.findUniqueOrThrow({ where: { id: f.circleId } })).memberCount).toBe(
        2,
      );
      if (kind === "renew")
        expect(r.expireAt?.getTime()).toBe(f.initialExpiry.getTime() + 730 * 86400000);
      else expect(r.expireAt!.getTime()).toBeGreaterThanOrEqual(before + 730 * 86400000);
      expect(await rows(f)).toEqual([{ id: expect.any(String), clearedAt: null }]);
      expect((await db.$transaction((tx) => fulfillCircleOrderTx(tx, f.orderId))).outcome).toBe(
        "already",
      );
      expect(await rows(f)).toHaveLength(1);
    },
  );
  it.each(["new", "expired", "renew"] as const)(
    "%s：缓存事实写入失败，订单、成员/期限和人数全部回滚",
    async (kind) => {
      const f = await fixture(kind);
      await failInsert(async () => {
        await expect(db.$transaction((tx) => fulfillCircleOrderTx(tx, f.orderId))).rejects.toThrow(
          "synthetic paid cache insert failure",
        );
      });
      expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe("PAID");
      expect((await db.circle.findUniqueOrThrow({ where: { id: f.circleId } })).memberCount).toBe(
        kind === "new" ? 1 : 2,
      );
      const m = await db.circleMember.findUnique({
        where: { circleId_userId: { circleId: f.circleId, userId: f.userId } },
      });
      if (kind === "new") expect(m).toBeNull();
      else expect(m!.expireAt).toEqual(f.initialExpiry);
      expect(await rows(f)).toHaveLength(0);
    },
  );
  it.each(["REFUNDED", "CANCELLED", "PENDING"] as const)(
    "%s订单不发权益、不造缓存成功事实",
    async (status) => {
      const f = await fixture();
      await db.order.update({ where: { id: f.orderId }, data: { status } });
      expect((await db.$transaction((tx) => fulfillCircleOrderTx(tx, f.orderId))).outcome).toBe(
        "skipped",
      );
      expect(await rows(f)).toHaveLength(0);
    },
  );
  it.each(["active", "renewMissing", "inactive"] as const)(
    "%s待人工保持订单和缓存事实不变",
    async (kind) => {
      const f = await fixture(kind === "active" ? "renew" : "new");
      if (kind === "active")
        await db.order.update({ where: { id: f.orderId }, data: { type: "CIRCLE_JOIN" } });
      if (kind === "renewMissing")
        await db.order.update({ where: { id: f.orderId }, data: { type: "CIRCLE_RENEW" } });
      if (kind === "inactive")
        await db.circle.update({ where: { id: f.circleId }, data: { status: "DISABLED" } });
      expect((await db.$transaction((tx) => fulfillCircleOrderTx(tx, f.orderId))).outcome).toBe(
        "needs_manual",
      );
      expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe("PAID");
      expect(await rows(f)).toHaveLength(0);
    },
  );
  it("两笔续费并发各顺延一次，并分别保留缓存待办", async () => {
    const f = await fixture("renew");
    const second = await db.order.create({
      data: {
        userId: f.userId,
        targetId: f.circleId,
        type: "CIRCLE_RENEW",
        amount: 88,
        quantity: 1,
        status: "PAID",
        paidAt: new Date(),
      },
    });
    orders.push(second.id);
    await Promise.all(
      [f.orderId, second.id].map((id) => db.$transaction((tx) => fulfillCircleOrderTx(tx, id))),
    );
    expect(
      (
        await db.circleMember.findUniqueOrThrow({
          where: { circleId_userId: { circleId: f.circleId, userId: f.userId } },
        })
      ).expireAt!.getTime(),
    ).toBe(f.initialExpiry.getTime() + 730 * 86400000);
    expect(await rows(f)).toHaveLength(2);
  });
  it("真实回调事务成功后Redis故障仍回成功；同单重投不重复履约", async () => {
    const f = await fixture("new", 1, true);
    clear.mockRejectedValueOnce(new Error("synthetic Redis outage"));
    await expect(payment().handlePaymentNotify(callback(f))).resolves.toBe(true);
    expect((await rows(f))[0].clearedAt).toBeNull();
    expect(notice.sendOnce).toHaveBeenCalledWith(
      f.userId,
      `ORDER_PAID:${f.orderId}`,
      expect.anything(),
    );
    await expect(payment().handlePaymentNotify(callback(f))).resolves.toBe(true);
    expect(await rows(f)).toHaveLength(1);
    expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
  });
  it("真实付款入口中缓存事实失败：PENDING状态、权益、待办一起回滚，不能发送成功通知", async () => {
    const f = await fixture("new", 1, true);
    await failInsert(async () => {
      await expect(payment().handlePaymentNotify(callback(f))).rejects.toThrow(
        "synthetic paid cache insert failure",
      );
    });
    expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe("PENDING");
    expect(await rows(f)).toHaveLength(0);
    expect(await db.circleMember.count({ where: { circleId: f.circleId, userId: f.userId } })).toBe(
      0,
    );
    expect(notice.sendOnce).not.toHaveBeenCalled();
    expect(webhook.fire).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
  it.each(["join", "renew"] as const)(
    "客户端%s确认提交后缓存故障仍成功，完成订单重试恢复原待办",
    async (kind) => {
      const f = await fixture(kind === "renew" ? "renew" : "new");
      clear.mockRejectedValueOnce(new Error("synthetic Redis outage"));
      const invoke = () =>
        kind === "join"
          ? membership().confirmJoin(f.circleId, f.userId, { orderId: f.orderId })
          : membership().confirmRenew(f.circleId, f.userId, { orderId: f.orderId });
      await expect(invoke()).resolves.toBeDefined();
      expect((await rows(f))[0].clearedAt).toBeNull();
      await expect(invoke()).resolves.toMatchObject({ alreadyFulfilled: true });
      expect(await rows(f)).toHaveLength(1);
      expect((await rows(f))[0].clearedAt).toBeInstanceOf(Date);
    },
  );
  it("单笔和批量补偿入口共用实际履约待办，Redis故障不误报履约失败", async () => {
    const a = await fixture(),
      b = await fixture();
    clear.mockRejectedValue(new Error("synthetic Redis outage"));
    await expect(payment().retryCircleFulfillmentForOrder(a.orderId)).resolves.toMatchObject({
      outcome: "fulfilled",
    });
    const r = await payment().retryCircleFulfillment(
      new Date(Date.now() - 60000),
      new Date(Date.now() + 60000),
      200,
    );
    expect(r.fulfilled).toBe(1);
    expect(r.failed).toBe(0);
    expect((await rows(a))[0].clearedAt).toBeNull();
    expect((await rows(b))[0].clearedAt).toBeNull();
  });
  it("人工确认入口实际事务也产生待办，Redis故障不阻断已确认付款", async () => {
    const f = await fixture("new", 1, true);
    clear.mockRejectedValueOnce(new Error("synthetic Redis outage"));
    const svc = new ShopOrderLifecycleService(
      db as unknown as PrismaService,
      redis,
      attribution as never,
      orderService as never,
      payment(),
    );
    await expect(
      svc.adminPayOrder(f.orderId, "synthetic-manual-" + randomUUID(), "synthetic-operator"),
    ).resolves.toMatchObject({ success: true });
    expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe(
      "COMPLETED",
    );
    expect((await rows(f))[0].clearedAt).toBeNull();
    expect(notice.sendOnce).toHaveBeenCalled();
  });
  it("人工确认的缓存事实失败：付款状态、权益和成功通知整体不产生", async () => {
    const f = await fixture("new", 1, true);
    const svc = new ShopOrderLifecycleService(
      db as unknown as PrismaService,
      redis,
      attribution as never,
      orderService as never,
      payment(),
    );
    await failInsert(async () => {
      await expect(
        svc.adminPayOrder(f.orderId, "synthetic-manual-" + randomUUID(), "synthetic-operator"),
      ).rejects.toThrow("synthetic paid cache insert failure");
    });
    expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe("PENDING");
    expect(await db.circleMember.count({ where: { circleId: f.circleId, userId: f.userId } })).toBe(
      0,
    );
    expect(await rows(f)).toHaveLength(0);
    expect(notice.sendOnce).not.toHaveBeenCalled();
    expect(webhook.fire).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
  it("缓存与通知同时故障仍保留已提交付款，通知幂等键不变", async () => {
    const f = await fixture("new", 1, true);
    clear.mockRejectedValueOnce(new Error("synthetic Redis outage"));
    notice.sendOnce.mockRejectedValueOnce(new Error("synthetic notice outage"));
    await expect(payment().handlePaymentNotify(callback(f))).resolves.toBe(true);
    expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe(
      "COMPLETED",
    );
    expect((await rows(f))[0].clearedAt).toBeNull();
    await expect(payment().handlePaymentNotify(callback(f))).resolves.toBe(true);
    for (const call of notice.sendOnce.mock.calls) expect(call[1]).toBe("ORDER_PAID:" + f.orderId);
    expect(await rows(f)).toHaveLength(1);
  });
  it("客户端确认拒绝跨用户订单，不能创建权益和缓存事实", async () => {
    const f = await fixture();
    await expect(
      membership().confirmJoin(f.circleId, f.ownerId, { orderId: f.orderId }),
    ).rejects.toThrow();
    expect((await db.order.findUniqueOrThrow({ where: { id: f.orderId } })).status).toBe("PAID");
    expect(await rows(f)).toHaveLength(0);
  });
  it("履约提交后进程中断，待办保留供现有分钟恢复任务处理", async () => {
    const f = await fixture();
    await db.$transaction((tx) => fulfillCircleOrderTx(tx, f.orderId));
    expect(clear).not.toHaveBeenCalled();
    expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
    expect((await rows(f))[0].clearedAt).toBeInstanceOf(Date);
  });
});
