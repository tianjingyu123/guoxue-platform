import { randomUUID } from "crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { MemberBenefitService } from "../member/member-benefit.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { EntitlementNotificationTask } from "../notification/entitlement-notification.task";
import { NotificationService } from "../notification/notification.service";
import { ShopPaymentService } from "./shop-payment.service";
import { ShopRefundService } from "./shop-refund.service";

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
    throw new Error("书院权益测试仅允许专用合成库");
  }
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("书院开通续费退款与持久到账真实PG", () => {
  let db: PrismaClient;
  const users: string[] = [];
  const configs = new Map<string, Awaited<ReturnType<PrismaClient["memberConfig"]["findUnique"]>>>();
  const channelCall = jest.fn(() => {
    throw new Error("禁止真实渠道调用");
  });
  const redis = {
    setNX: async () => true,
    del: async () => undefined,
    delByPattern: async () => undefined,
    get: async () => JSON.stringify({ PUSH_ENABLED: false }),
    getJson: async () => ({ PUSH_ENABLED: false }),
  };
  const rights = () => new EntitlementService(db as unknown as PrismaService);
  const notice = () =>
    new NotificationService(
      db as unknown as PrismaService,
      redis as unknown as RedisService,
      { send: channelCall } as never,
      {} as never,
    );
  const task = () => new EntitlementNotificationTask(db as unknown as PrismaService);
  const payment = (client = db) =>
    new ShopPaymentService(
      client as unknown as PrismaService,
      redis as unknown as RedisService,
      {} as never,
      {} as never,
      {} as never,
      { fire: async () => undefined } as never,
      new MemberBenefitService(db as unknown as PrismaService, redis as unknown as RedisService),
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
  const user = async (data: Pick<Prisma.UserCreateInput, "memberLevel" | "memberExpire"> = {}) => {
    const u = await db.user.create({ data: { nickname: "合成书院验收用户", ...data } });
    users.push(u.id);
    return u.id;
  };
  const order = async (userId: string, level = "MONTHLY") => {
    const config = await db.memberConfig.findUniqueOrThrow({ where: { level } });
    return db.order.create({
      data: {
        userId,
        type: "MEMBER",
        targetId: config.id,
        amount: config.price,
        payAmount: config.price,
        status: "PENDING",
        payMethod: "WECHAT",
        payTransactionId: "synthetic-school-" + randomUUID(),
      },
    });
  };
  type TestOrder = Awaited<ReturnType<typeof order>>;
  const callback = (o: TestOrder) => ({
    out_trade_no: o.payTransactionId,
    transaction_id: "synthetic-confirmed-" + o.id,
    trade_state: "SUCCESS",
    attach: o.id,
    amount: { total: Math.round(Number(o.amount) * 100) },
  });
  const refundBody = (o: TestOrder) => ({
    out_refund_no: "RF" + o.id,
    transaction_id: "synthetic-confirmed-" + o.id,
    refund_status: "SUCCESS",
    refund_id: "synthetic-refund-" + o.id,
    amount: {
      refund: Math.round(Number(o.amount) * 100),
      total: Math.round(Number(o.amount) * 100),
    },
  });
  const ledger = (o: TestOrder) =>
    db.entitlementLedger.findUniqueOrThrow({
      where: { idempotencyKey: `order:${o.id}:membership.school` },
    });
  const count = (userId: string) =>
    db.notification.count({ where: { userId, type: "ENTITLEMENT" } });
  const month = (base: Date, n = 1) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + n);
    return d;
  };
  // 两笔订单CAS完成后才争用户锁；不在持锁之后等另一个请求，避免人为死锁。
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
  const failInsert = async (
    table: "EntitlementLedger" | "PointsRecord" | "Notification",
    work: () => Promise<void>,
    type?: string,
  ) => {
    const condition = type
      ? `IF NEW.type = '${type}' THEN RAISE EXCEPTION 'synthetic school failure'; END IF; RETURN NEW;`
      : "RAISE EXCEPTION 'synthetic school failure';";
    await db.$executeRawUnsafe(
      `CREATE FUNCTION synthetic_school_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${condition} END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER synthetic_school_fail BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_school_fail()`,
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_school_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_school_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [i] = await db.$queryRaw<Array<{ name: string; port: number }>>`
      SELECT current_database() AS name,inet_server_port() AS port`;
    if (!i.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(i.port))
      throw new Error("隔离库身份不符");
    for (const level of ["MONTHLY", "YEARLY_AUTO", "LIFETIME"]) {
      configs.set(level, await db.memberConfig.findUnique({ where: { level } }));
      await db.memberConfig.upsert({
        where: { level },
        create: { level, name: "合成套餐", price: 19, monthlyPoints: 10 },
        update: { price: 19, monthlyPoints: 10, monthlyCouponId: null },
      });
    }
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    expect(await db.practitionerProfile.count({ where: { userId: { in: users } } })).toBe(0);
    await db.order.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => {
    for (const [level, old] of configs) {
      if (old) await db.memberConfig.update({ where: { level }, data: {
        price: old.price, monthlyPoints: old.monthlyPoints, monthlyCouponId: old.monthlyCouponId,
      } });
      else await db.memberConfig.delete({ where: { level } });
    }
    await db?.$disconnect();
    expect(channelCall).not.toHaveBeenCalled();
  });

  it("付款同事务到账，重投不续费或重复发积分，分钟任务只补一条通知", async () => {
    const id = await user(),
      o = await order(id);
    expect(await payment().handlePaymentNotify(callback(o))).toBe(true);
    const first = await db.user.findUniqueOrThrow({ where: { id } });
    await payment().handlePaymentNotify(callback(o));
    expect((await db.user.findUniqueOrThrow({ where: { id } })).memberExpire).toEqual(
      first.memberExpire,
    );
    expect(await db.memberPurchase.count({ where: { userId: id } })).toBe(1);
    expect(await db.pointsRecord.count({ where: { userId: id, type: "EARN" } })).toBe(1);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(10);
    expect((await ledger(o)).metadata).toEqual({
      planLevel: "MONTHLY",
      memberLevel: "MONTHLY",
      autoRenew: false,
      notificationEvent: "MEMBER_PAID_GRANTED_V1",
    });
    expect(await task().deliverPendingGrants()).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
    const n = await db.notification.findFirstOrThrow({
      where: { userId: id, type: "ENTITLEMENT" },
    });
    expect(n.idempotencyKey).toBe(`${id}:ENTITLEMENT_GRANTED:${(await ledger(o)).id}`);
    expect(n.targetType).toBe("ENTITLEMENT");
    expect(n.targetId).toBe(id);
  });
  it.each(["first", "renew"] as const)(
    "两笔不同订单并发%s，两期不丢且积分本月仅一次",
    async (kind) => {
      const initial = new Date(2030, 0, 15, 12);
      const id = await user(
        kind === "renew" ? { memberLevel: "MONTHLY", memberExpire: initial } : {},
      );
      const a = await order(id),
        b = await order(id),
        client = competingClient();
      expect(
        await Promise.all([
          payment(client).handlePaymentNotify(callback(a)),
          payment(client).handlePaymentNotify(callback(b)),
        ]),
      ).toEqual([true, true]);
      expect(await db.order.count({ where: { userId: id, status: "PAID" } })).toBe(2);
      expect(await db.memberPurchase.count({ where: { userId: id } })).toBe(2);
      const earliest = await db.memberPurchase.findFirstOrThrow({
        where: { userId: id },
        orderBy: { paidAt: "asc" },
      });
      const expiry = (await db.user.findUniqueOrThrow({ where: { id } })).memberExpire!;
      expect(
        Math.abs(
          expiry.getTime() - month(kind === "renew" ? initial : earliest.paidAt, 2).getTime(),
        ),
      ).toBeLessThan(1000);
      expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(10);
      const inserted = await Promise.all([
        task().deliverPendingGrants(),
        task().deliverPendingGrants(),
      ]);
      expect(inserted.reduce((a, b) => a + b, 0)).toBe(2);
      expect(await count(id)).toBe(2);
    },
  );
  it("同一订单并发成功回调，仅一个购买记录及一期", async () => {
    const id = await user(),
      o = await order(id);
    expect(
      await Promise.all([
        payment().handlePaymentNotify(callback(o)),
        payment().handlePaymentNotify(callback(o)),
      ]),
    ).toEqual([true, true]);
    expect(await db.memberPurchase.count({ where: { userId: id } })).toBe(1);
    expect(await db.entitlementLedger.count({ where: { userId: id, action: "GRANT" } })).toBe(1);
    expect(
      await db.notification.count({
        where: { userId: id, idempotencyKey: `${id}:ORDER_PAID:${o.id}` },
      }),
    ).toBe(1);
  });
  it.each(["EntitlementLedger", "PointsRecord"] as const)(
    "真实%s失败，付款和全部权益回滚，无成功通知，重投可恢复",
    async (table) => {
      const id = await user(),
        o = await order(id);
      await failInsert(table, async () => {
        await expect(payment().handlePaymentNotify(callback(o))).rejects.toThrow();
        expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
        expect((await db.user.findUniqueOrThrow({ where: { id } })).memberLevel).toBe("NONE");
        expect(await db.memberPurchase.count({ where: { userId: id } })).toBe(0);
        expect(await db.pointsRecord.count({ where: { userId: id } })).toBe(0);
        expect(await db.userPoints.findUnique({ where: { userId: id } })).toBeNull();
        expect(await task().deliverPendingGrants()).toBe(0);
        expect(await db.notification.count({ where: { userId: id } })).toBe(0);
      });
      await payment().handlePaymentNotify(callback(o));
      expect(await task().deliverPendingGrants()).toBe(1);
    },
  );
  it("退款完成排除未投递到账，重复退款不重复冲正或通知", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    await refund().handleRefundNotify(refundBody(o));
    await refund().handleRefundNotify(refundBody(o));
    expect((await db.user.findUniqueOrThrow({ where: { id } })).memberLevel).toBe("NONE");
    expect(
      (await db.memberPurchase.findUniqueOrThrow({ where: { orderId: o.id } })).refundedAt,
    ).not.toBeNull();
    expect(await db.entitlementLedger.count({ where: { userId: id, action: "REVOKE" } })).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
    expect(await count(id)).toBe(0);
    expect(
      await db.notification.count({
        where: { userId: id, idempotencyKey: `${id}:ORDER_REFUNDED:${o.id}` },
      }),
    ).toBe(1);
  });
  it("冲正事务失败不提交退款、购买退款标记或退款成功通知", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    const before = (await db.user.findUniqueOrThrow({ where: { id } })).memberExpire;
    await failInsert("EntitlementLedger", async () => {
      await expect(refund().handleRefundNotify(refundBody(o))).rejects.toThrow();
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
      expect(
        (await db.memberPurchase.findUniqueOrThrow({ where: { orderId: o.id } })).refundedAt,
      ).toBeNull();
      expect((await db.user.findUniqueOrThrow({ where: { id } })).memberExpire).toEqual(before);
      expect(await db.notification.count({ where: { userId: id, type: "REFUND" } })).toBe(0);
    });
    await refund().handleRefundNotify(refundBody(o));
    expect(await task().deliverPendingGrants()).toBe(0);
  });
  it("退款与另一单续费并发，保留剩余一期且无死锁", async () => {
    const id = await user(),
      a = await order(id);
    await payment().handlePaymentNotify(callback(a));
    const b = await order(id),
      client = competingClient();
    await Promise.all([
      refund(client).handleRefundNotify(refundBody(a)),
      payment(client).handlePaymentNotify(callback(b)),
    ]);
    expect((await db.order.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("REFUNDED");
    const remaining = await db.memberPurchase.findUniqueOrThrow({ where: { orderId: b.id } });
    expect(remaining.refundedAt).toBeNull();
    const expiry = (await db.user.findUniqueOrThrow({ where: { id } })).memberExpire!;
    expect(Math.abs(expiry.getTime() - month(remaining.paidAt).getTime())).toBeLessThan(1000);
    expect(await task().deliverPendingGrants()).toBe(1);
    expect(await count(id)).toBe(1);
  });
  it("两单并发退款不会互相复活会员", async () => {
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
    expect(await db.order.count({ where: { userId: id, status: "REFUNDED" } })).toBe(2);
    expect((await db.user.findUniqueOrThrow({ where: { id } })).memberLevel).toBe("NONE");
    expect((await db.user.findUniqueOrThrow({ where: { id } })).memberExpire).toBeNull();
    expect(await task().deliverPendingGrants()).toBe(0);
  });
  it.each(["LIFETIME", "YEARLY_AUTO"] as const)(
    "保留%s既有套餐语义，允许真实到账通知",
    async (level) => {
      const id = await user(),
        o = await order(id, level);
      await payment().handlePaymentNotify(callback(o));
      const u = await db.user.findUniqueOrThrow({ where: { id } });
      expect(u.memberLevel).toBe(level === "YEARLY_AUTO" ? "YEARLY" : level);
      if (level === "LIFETIME") expect(u.memberExpire).toBeNull();
      else expect(u.memberAutoRenew).toBe(true);
      expect(await task().deliverPendingGrants()).toBe(1);
    },
  );
  it("已有终身会员付款低档仍为终身，不丢新付款事实", async () => {
    const id = await user({ memberLevel: "LIFETIME" }),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    expect((await db.user.findUniqueOrThrow({ where: { id } })).memberLevel).toBe("LIFETIME");
    expect((await ledger(o)).validUntil).toBeNull();
    expect(await task().deliverPendingGrants()).toBe(1);
  });
  it.each([
    "legacy",
    "wrong-user",
    "wrong-type",
    "not-paid",
    "purchase-refunded",
    "purchase-missing",
    "purchase-wrong-user",
    "purchase-amount",
    "purchase-plan",
    "purchase-expiry",
    "inactive-user",
    "expired-user",
    "invalid-lifetime",
    "expired-ledger",
    "wrong-key",
  ] as const)("排除%s，不凭人工流水报告到账", async (kind) => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    const l = await ledger(o);
    if (kind === "legacy")
      await db.entitlementLedger.update({ where: { id: l.id }, data: { metadata: {} } });
    if (kind === "wrong-user")
      await db.order.update({ where: { id: o.id }, data: { userId: await user() } });
    if (kind === "wrong-type")
      await db.order.update({ where: { id: o.id }, data: { type: "COURSE" } });
    if (kind === "not-paid")
      await db.order.update({ where: { id: o.id }, data: { status: "PENDING" } });
    if (kind === "purchase-refunded")
      await db.memberPurchase.update({
        where: { orderId: o.id },
        data: { refundedAt: new Date() },
      });
    if (kind === "purchase-missing") await db.memberPurchase.delete({ where: { orderId: o.id } });
    if (kind === "purchase-wrong-user")
      await db.memberPurchase.update({ where: { orderId: o.id }, data: { userId: await user() } });
    if (kind === "purchase-amount")
      await db.memberPurchase.update({ where: { orderId: o.id }, data: { amount: 1 } });
    if (kind === "purchase-plan")
      await db.memberPurchase.update({ where: { orderId: o.id }, data: { memberType: "YEARLY" } });
    if (kind === "purchase-expiry")
      await db.memberPurchase.update({ where: { orderId: o.id }, data: { expireAt: null } });
    if (kind === "inactive-user")
      await db.user.update({ where: { id }, data: { memberLevel: "NONE", memberExpire: null } });
    if (kind === "expired-user")
      await db.user.update({ where: { id }, data: { memberExpire: new Date(Date.now() - 1000) } });
    if (kind === "invalid-lifetime")
      await db.user.update({
        where: { id },
        data: { memberLevel: "LIFETIME", memberExpire: new Date() },
      });
    if (kind === "expired-ledger")
      await db.entitlementLedger.update({
        where: { id: l.id },
        data: { validUntil: new Date(Date.now() - 1000) },
      });
    if (kind === "wrong-key")
      await db.entitlementLedger.update({
        where: { id: l.id },
        data: { idempotencyKey: "synthetic-invalid-" + randomUUID() },
      });
    expect(await task().deliverPendingGrants()).toBe(0);
    expect(await count(id)).toBe(0);
  });
  it("支付通知落库失败不阻断真实付款，权益通知独立恢复", async () => {
    const id = await user(),
      o = await order(id);
    await failInsert(
      "Notification",
      async () => {
        expect(await payment().handlePaymentNotify(callback(o))).toBe(true);
        expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
        expect(await db.memberPurchase.count({ where: { userId: id } })).toBe(1);
        expect(await db.notification.count({ where: { userId: id } })).toBe(0);
      },
      "PURCHASE",
    );
    expect(await task().deliverPendingGrants()).toBe(1);
    await payment().handlePaymentNotify(callback(o));
    expect(await db.notification.count({ where: { userId: id, type: "PURCHASE" } })).toBe(1);
  });
  it("权益通知故障保留持久待办，恢复后一次补发", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    await failInsert(
      "Notification",
      async () => {
        await task().tick();
        expect(await count(id)).toBe(0);
        expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
      },
      "ENTITLEMENT",
    );
    expect(await task().deliverPendingGrants()).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
  });
  it("退款通知故障不阻断已提交退款，重投恢复一条", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    await failInsert(
      "Notification",
      async () => {
        await refund().handleRefundNotify(refundBody(o));
        expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("REFUNDED");
        expect((await db.user.findUniqueOrThrow({ where: { id } })).memberLevel).toBe("NONE");
        expect(await db.notification.count({ where: { userId: id, type: "REFUND" } })).toBe(0);
      },
      "REFUND",
    );
    await refund().handleRefundNotify(refundBody(o));
    expect(await db.notification.count({ where: { userId: id, type: "REFUND" } })).toBe(1);
    expect(await task().deliverPendingGrants()).toBe(0);
  });
  it("本人可查看到账通知与权益，其他用户不能读详情或改变已读状态", async () => {
    const id = await user(),
      other = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    await task().deliverPendingGrants();
    const n = await db.notification.findFirstOrThrow({
      where: { userId: id, type: "ENTITLEMENT" },
    });
    await expect(notice().getById(n.id, other)).rejects.toThrow("通知不存在");
    expect((await db.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(false);
    expect((await notice().getById(n.id, id)).targetId).toBe(id);
    expect(
      (await rights().getMyEntitlements(id)).items.some(
        (i) => i.entitlementKey === "membership.school",
      ),
    ).toBe(true);
    expect(
      (await rights().getMyEntitlements(other)).items.some(
        (i) => i.entitlementKey === "membership.school",
      ),
    ).toBe(false);
  });
  it("两个独立进程补同一到账事实，数据库唯一键只建一条", async () => {
    const id = await user(),
      o = await order(id);
    await payment().handlePaymentNotify(callback(o));
    const code = `require('reflect-metadata'); const { PrismaClient }=require('@prisma/client');
      const { EntitlementNotificationTask }=require(${JSON.stringify(resolve("src/modules/notification/entitlement-notification.task.ts"))});
      const db=new PrismaClient({datasources:{db:{url:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL}}});
      (async()=>{try{console.log(JSON.stringify({inserted:await new EntitlementNotificationTask(db).deliverPendingGrants()}));}
      finally{await db.$disconnect();}})().catch(()=>{process.exitCode=1;});`;
    const run = () =>
      promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
        env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") },
        timeout: 20000,
      });
    const results = await Promise.all([run(), run()]);
    expect(
      results.map((r) => JSON.parse(r.stdout.trim()).inserted).reduce((a, b) => a + b, 0),
    ).toBe(1);
    expect(await count(id)).toBe(1);
  });
});
