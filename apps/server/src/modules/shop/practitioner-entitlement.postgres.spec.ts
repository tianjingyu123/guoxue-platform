import { randomUUID } from "crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { EntitlementNotificationTask } from "../notification/entitlement-notification.task";
import { NotificationService } from "../notification/notification.service";
import { ShopPaymentService } from "./shop-payment.service";
import { ShopRefundService } from "./shop-refund.service";
import { addCalendarMonthsClamped } from "./membership-period";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55462" ||
    u.username !== "qa_voice" ||
    !u.pathname.startsWith("/entitlement_notice_qa_")
  ) {
    throw new Error("从业权益测试仅允许专用合成库");
  }
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("从业开通续费退款与权益通知真实PG", () => {
  let db: PrismaClient;
  const users: string[] = [],
    orders: string[] = [];
  const channelCall = jest.fn(() => {
    throw new Error("禁止真实渠道调用");
  });
  const redis = {
    setNX: async () => true,
    del: async () => undefined,
    delByPattern: async () => undefined,
    get: async () => JSON.stringify({ PUSH_ENABLED: false }),
  };
  const notice = () =>
    new NotificationService(
      db as unknown as PrismaService,
      redis as unknown as RedisService,
      { send: channelCall } as never,
      {} as never,
    );
  const rights = () => new EntitlementService(db as unknown as PrismaService);
  const task = () => new EntitlementNotificationTask(db as unknown as PrismaService);
  const payment = (client = db) =>
    new ShopPaymentService(
      client as unknown as PrismaService,
      redis as unknown as RedisService,
      {} as never,
      {} as never,
      {} as never,
      { fire: async () => undefined } as never,
      {} as never,
      rights(),
      { recordOrderCommissionAndFee: async () => undefined } as never,
      {
        invalidateOrderCache: async () => undefined,
        settleGroupBuyIfNeeded: async () => undefined,
      } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      notice(),
    );
  const refund = (client = db) =>
    new ShopRefundService(
      client as unknown as PrismaService,
      redis as unknown as RedisService,
      {} as never,
      {} as never,
      {} as never,
      { registerRefundNotifyHandler: () => undefined } as never,
      {} as never,
      { fire: async () => undefined } as never,
      rights(),
      undefined,
      notice(),
    );
  const user = async () => {
    const u = await db.user.create({ data: { nickname: "合成从业验收用户" } });
    users.push(u.id);
    return u.id;
  };
  const order = async (userId: string) => {
    const o = await db.order.create({
      data: {
        userId,
        type: "PRACTITIONER_PRO",
        targetId: "practitioner_pro_monthly",
        amount: 98,
        payAmount: 98,
        status: "PENDING",
        payMethod: "WECHAT",
        payTransactionId: "synthetic-pro-" + randomUUID(),
      },
    });
    orders.push(o.id);
    return o;
  };
  const callback = (o: Awaited<ReturnType<typeof order>>) => ({
    out_trade_no: o.payTransactionId,
    transaction_id: "synthetic-confirmed-" + o.id,
    trade_state: "SUCCESS",
    attach: o.id,
    amount: { total: 9800 },
  });
  const refundBody = (o: Awaited<ReturnType<typeof order>>) => ({
    out_refund_no: "RF" + o.id,
    transaction_id: "synthetic-confirmed-" + o.id,
    refund_status: "SUCCESS",
    refund_id: "synthetic-refund-" + o.id,
    amount: { refund: 9800, total: 9800 },
  });
  const ledger = (o: Awaited<ReturnType<typeof order>>) =>
    db.entitlementLedger.findUniqueOrThrow({
      where: { idempotencyKey: `order:${o.id}:membership.practitioner` },
    });
  const entitlementNoticeCount = (userId: string) =>
    db.notification.count({ where: { userId, type: "ENTITLEMENT" } });
  // 两笔事务均完成订单CAS后才竞争用户锁，保证并发用例真正重叠。
  const competingClient = () => {
    let release!: () => void,
      arrived = 0;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    return new Proxy(db, {
      get(target, key) {
        if (key === "$transaction")
          return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
            target.$transaction(
              (tx) =>
                work(
                  new Proxy(tx, {
                    get(t, k) {
                      if (k === "$queryRaw")
                        return async (...args: Parameters<typeof tx.$queryRaw>) => {
                          if (String(args[0]).includes('"User"') && arrived < 2) {
                            if (++arrived === 2) release();
                            await gate;
                          }
                          return tx.$queryRaw(...args);
                        };
                      const v = Reflect.get(t, k, t);
                      return typeof v === "function" ? v.bind(t) : v;
                    },
                  }),
                ),
              { timeout: 15000 },
            );
        const v = Reflect.get(target, key, target);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
  };
  const failLedgerInsert = async (work: () => Promise<void>) => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_pro_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic pro ledger failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_pro_fail BEFORE INSERT ON "EntitlementLedger" FOR EACH ROW EXECUTE FUNCTION synthetic_pro_fail()',
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_pro_fail ON "EntitlementLedger"');
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_pro_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [i] = await db.$queryRaw<
      Array<{ name: string; port: number }>
    >`SELECT current_database() AS name,inet_server_port() AS port`;
    if (!i.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(i.port))
      throw new Error("隔离库身份不符");
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    expect(await db.memberPurchase.count({ where: { userId: { in: users } } })).toBe(0);
    expect(
      await db.user.count({
        where: {
          id: { in: users },
          OR: [{ memberLevel: { not: "NONE" } }, { memberExpire: { not: null } }],
        },
      }),
    ).toBe(0);
    await db.order.deleteMany({ where: { id: { in: orders.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => {
    await db?.$disconnect();
    expect(channelCall).not.toHaveBeenCalled();
  });

  it("成功回调同事务开通，重投不延长；新任务只补一条权益到账", async () => {
    const id = await user(),
      o = await order(id);
    expect(await payment().handlePaymentNotify(callback(o))).toBe(true);
    const p = await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } });
    expect(p.proExpireAt).toEqual(addCalendarMonthsClamped(p.proFirstAt!, 1));
    const projection = (await rights().getMyEntitlements(id)).items.find(
      (item) => item.entitlementKey === "membership.practitioner",
    );
    expect(projection?.validUntil).toEqual(p.proExpireAt);
    expect((await ledger(o)).metadata).toEqual({ notificationEvent: "PRACTITIONER_GRANTED_V1" });
    expect(await payment().handlePaymentNotify(callback(o))).toBe(true);
    expect(
      (await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } })).proExpireAt,
    ).toEqual(p.proExpireAt);
    expect(await task().deliverPendingGrants()).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
    expect(await entitlementNoticeCount(id)).toBe(1);
    const n = await db.notification.findFirstOrThrow({
      where: { userId: id, type: "ENTITLEMENT" },
    });
    expect(n.idempotencyKey).toBe(`${id}:ENTITLEMENT_GRANTED:${(await ledger(o)).id}`);
    expect(n.targetType).toBe("ENTITLEMENT");
    expect(n.targetId).toBe(id);
  });
  it.each(["first", "renew"] as const)("不同订单并发%s，两笔入账与两个月均不丢", async (kind) => {
    const id = await user(),
      initial = new Date(2030, 0, 31, 12);
    if (kind === "renew")
      await db.practitionerProfile.create({
        data: { userId: id, proExpireAt: initial, proFirstAt: new Date() },
      });
    const a = await order(id),
      b = await order(id),
      client = competingClient();
    expect(
      await Promise.all([
        payment(client).handlePaymentNotify(callback(a)),
        payment(client).handlePaymentNotify(callback(b)),
      ]),
    ).toEqual([true, true]);
    expect(await db.order.count({ where: { id: { in: [a.id, b.id] }, status: "PAID" } })).toBe(2);
    const p = await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } });
    expect(p.proExpireAt).toEqual(
      addCalendarMonthsClamped(
        addCalendarMonthsClamped(kind === "renew" ? initial : p.proFirstAt!, 1),
        1,
      ),
    );
    expect(await db.entitlementLedger.count({ where: { userId: id, action: "GRANT" } })).toBe(2);
    const n = await Promise.all([task().deliverPendingGrants(), task().deliverPendingGrants()]);
    expect(n.reduce((a, b) => a + b, 0)).toBe(2);
    expect(await entitlementNoticeCount(id)).toBe(2);
  });
  it("真实权益流水失败，订单、profile与到账通知均回滚，重试正常", async () => {
    const id = await user(),
      o = await order(id);
    await failLedgerInsert(async () => {
      await expect(payment().handlePaymentNotify(callback(o))).rejects.toThrow();
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
      expect(await db.practitionerProfile.findUnique({ where: { userId: id } })).toBeNull();
      expect(await task().deliverPendingGrants()).toBe(0);
      expect(await db.notification.count({ where: { userId: id } })).toBe(0);
    });
    expect(await payment().handlePaymentNotify(callback(o))).toBe(true);
    expect(await task().deliverPendingGrants()).toBe(1);
  });
  it("退款成功前未投递的旧权益不报到账，重复退款只冲正一次", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    await refund().handleRefundNotify(refundBody(o));
    await refund().handleRefundNotify(refundBody(o));
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("REFUNDED");
    expect(
      (await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } })).proExpireAt,
    ).toBeNull();
    expect(await db.entitlementLedger.count({ where: { userId: id, action: "REVOKE" } })).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
    expect(await entitlementNoticeCount(id)).toBe(0);
    expect(
      (await rights().getMyEntitlements(id)).items.some(
        (item) => item.entitlementKey === "membership.practitioner",
      ),
    ).toBe(false);
    expect(
      await db.notification.count({
        where: { userId: id, idempotencyKey: `${id}:ORDER_REFUNDED:${o.id}` },
      }),
    ).toBe(1);
  });
  it("真实退款冲正失败不提交退款或成功通知，恢复后可重试", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    const original = (await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } }))
      .proExpireAt;
    await failLedgerInsert(async () => {
      await expect(refund().handleRefundNotify(refundBody(o))).rejects.toThrow();
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
      expect(
        (await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } })).proExpireAt,
      ).toEqual(original);
      expect(await db.notification.count({ where: { userId: id, type: "REFUND" } })).toBe(0);
    });
    await refund().handleRefundNotify(refundBody(o));
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("REFUNDED");
  });
  it("一单退款与另一单续费并发无死锁，按剩余订单重建", async () => {
    const id = await user(),
      a = await order(id);
    await payment().handlePaymentNotify(callback(a));
    const b = await order(id),
      client = competingClient();
    await Promise.all([
      refund(client).handleRefundNotify(refundBody(a)),
      payment(client).handlePaymentNotify(callback(b)),
    ]);
    const remaining = await db.order.findUniqueOrThrow({ where: { id: b.id } });
    expect(remaining.status).toBe("PAID");
    expect((await db.order.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("REFUNDED");
    const expiry = (await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } }))
      .proExpireAt!;
    // 若退款先提交，续费以锁内当下起算；若续费先提交，退款按订单paidAt重建。
    const expected = addCalendarMonthsClamped(remaining.paidAt!, 1);
    expect(Math.abs(expiry.getTime() - expected.getTime())).toBeLessThan(1000);
    const projection = (await rights().getMyEntitlements(id)).items.find(
      (item) => item.entitlementKey === "membership.practitioner",
    );
    expect(projection?.validUntil).toEqual(expiry);
    expect(await db.entitlementLedger.count({ where: { userId: id, action: "REVOKE" } })).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(1);
    expect(await entitlementNoticeCount(id)).toBe(1);
  });
  it.each([
    "legacy",
    "wrong-user",
    "wrong-type",
    "not-paid",
    "inactive-profile",
    "expired",
  ] as const)("排除%s来源，不因存在流水就报告成功", async (kind) => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    const l = await ledger(o);
    if (kind === "legacy")
      await db.entitlementLedger.update({ where: { id: l.id }, data: { metadata: {} } });
    if (kind === "wrong-user")
      await db.order.update({ where: { id: o.id }, data: { userId: await user() } });
    if (kind === "wrong-type")
      await db.order.update({ where: { id: o.id }, data: { type: "MEMBER" } });
    if (kind === "not-paid")
      await db.order.update({ where: { id: o.id }, data: { status: "PENDING" } });
    if (kind === "inactive-profile")
      await db.practitionerProfile.update({
        where: { userId: id },
        data: { proExpireAt: new Date(Date.now() - 1000) },
      });
    if (kind === "expired")
      await db.entitlementLedger.update({
        where: { id: l.id },
        data: { validUntil: new Date(Date.now() - 1000) },
      });
    expect(await task().deliverPendingGrants()).toBe(0);
    expect(await entitlementNoticeCount(id)).toBe(0);
  });
  it("权益通知数据库故障不阻断已入账的支付，新任务恢复不重复", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_pro_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'ENTITLEMENT' THEN RAISE EXCEPTION 'synthetic pro notice failure'; END IF; RETURN NEW; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_pro_notice_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_pro_notice_fail()',
    );
    try {
      await task().tick();
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
      expect(await entitlementNoticeCount(id)).toBe(0);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_pro_notice_fail ON "Notification"');
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_pro_notice_fail()");
    }
    expect(await task().deliverPendingGrants()).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
  });

  it("同一订单并发回调，数据库CAS只开通一次并建立一条支付通知", async () => {
    const id = await user(),
      o = await order(id);
    expect(
      await Promise.all([
        payment().handlePaymentNotify(callback(o)),
        payment().handlePaymentNotify(callback(o)),
      ]),
    ).toEqual([true, true]);
    const p = await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } });
    expect(p.proExpireAt).toEqual(addCalendarMonthsClamped(p.proFirstAt!, 1));
    expect(await db.entitlementLedger.count({ where: { userId: id, action: "GRANT" } })).toBe(1);
    expect(
      await db.notification.count({
        where: { userId: id, idempotencyKey: `${id}:ORDER_PAID:${o.id}` },
      }),
    ).toBe(1);
  });

  it("过期续费从当下起算且保留首次开通日", async () => {
    const id = await user(),
      o = await order(id),
      first = new Date(2025, 0, 1);
    await db.practitionerProfile.create({
      data: { userId: id, proFirstAt: first, proExpireAt: new Date(2025, 1, 1) },
    });
    const before = new Date();
    await payment().handlePaymentNotify(callback(o));
    const p = await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } });
    expect(p.proFirstAt).toEqual(first);
    expect(p.proExpireAt!.getTime()).toBeGreaterThanOrEqual(
      addCalendarMonthsClamped(before, 1).getTime(),
    );
    expect(p.proExpireAt!.getTime()).toBeLessThanOrEqual(
      addCalendarMonthsClamped(new Date(), 1).getTime(),
    );
    expect(await task().deliverPendingGrants()).toBe(1);
  });

  it("两笔已支付订单并发退款，最终无从业权益，不互相复活", async () => {
    const id = await user(),
      a = await order(id),
      b = await order(id);
    await payment().handlePaymentNotify(callback(a));
    await payment().handlePaymentNotify(callback(b));
    const client = competingClient();
    await Promise.all([
      refund(client).handleRefundNotify(refundBody(a)),
      refund(client).handleRefundNotify(refundBody(b)),
    ]);
    expect(await db.order.count({ where: { id: { in: [a.id, b.id] }, status: "REFUNDED" } })).toBe(
      2,
    );
    expect(
      (await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } })).proExpireAt,
    ).toBeNull();
    expect(await db.entitlementLedger.count({ where: { userId: id, action: "REVOKE" } })).toBe(2);
    expect(await task().deliverPendingGrants()).toBe(0);
    expect(
      (await rights().getMyEntitlements(id)).items.some(
        (item) => item.entitlementKey === "membership.practitioner",
      ),
    ).toBe(false);
  });

  it("退款通知落库失败不阻断已提交退款，重投补一条", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_pro_refund_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'REFUND' THEN RAISE EXCEPTION 'synthetic refund notice failure'; END IF; RETURN NEW; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_pro_refund_notice_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_pro_refund_notice_fail()',
    );
    try {
      await refund().handleRefundNotify(refundBody(o));
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("REFUNDED");
      expect(
        (await db.practitionerProfile.findUniqueOrThrow({ where: { userId: id } })).proExpireAt,
      ).toBeNull();
      expect(await db.notification.count({ where: { userId: id, type: "REFUND" } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_pro_refund_notice_fail ON "Notification"');
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_pro_refund_notice_fail()");
    }
    await refund().handleRefundNotify(refundBody(o));
    expect(await db.notification.count({ where: { userId: id, type: "REFUND" } })).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
  });

  it("两个独立进程争从业新到账事实，数据库唯一键只允许一条通知", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    const code = `require('reflect-metadata');
      const { PrismaClient } = require('@prisma/client');
      const { EntitlementNotificationTask } = require(${JSON.stringify(resolve("src/modules/notification/entitlement-notification.task.ts"))});
      const db = new PrismaClient({ datasources: { db: { url: process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL } } });
      (async () => { try { console.log(JSON.stringify({ inserted: await new EntitlementNotificationTask(db).deliverPendingGrants() })); }
        finally { await db.$disconnect(); } })().catch(() => { process.exitCode = 1; });`;
    const run = () =>
      promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
        env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") },
        timeout: 20000,
      });
    const results = await Promise.all([run(), run()]);
    expect(
      results.map((r) => JSON.parse(r.stdout.trim()).inserted).reduce((a, b) => a + b, 0),
    ).toBe(1);
    expect(await entitlementNoticeCount(id)).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
  });
});
