import { randomUUID } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { ShopPaymentService } from "./shop-payment.service";
import { MemberBenefitService } from "../member/member-benefit.service";
import { EntitlementService } from "../entitlement/entitlement.service";

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
    throw new Error("支付确认验收只允许专用合成库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("支付回滚和并发确认真实PG", () => {
  let db: PrismaClient;
  let config: Awaited<ReturnType<PrismaClient["memberConfig"]["findUnique"]>>;
  let couponId: string;
  const users: string[] = [];
  const redis = {
    setNX: async () => true,
    del: async () => undefined,
    delByPattern: async () => undefined,
    get: async () => null,
  };
  const fire = jest.fn().mockResolvedValue(undefined);
  const sendOnce = jest.fn().mockResolvedValue(undefined);
  const service = (client = db) =>
    new ShopPaymentService(
      client as never,
      redis as never,
      {} as never,
      {} as never,
      {} as never,
      { fire } as never,
      new MemberBenefitService(db as never, redis as never),
      new EntitlementService(db as never),
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
      { sendOnce } as never,
    );
  const user = async () => {
    const u = await db.user.create({
      data: {
        nickname: "合成支付确认验收",
        memberLevel: "MONTHLY",
        memberExpire: new Date(2030, 0, 15),
      },
    });
    users.push(u.id);
    return u.id;
  };
  const order = async (userId: string, channel: string, member = false) =>
    db.order.create({
      data: {
        userId,
        type: member ? "MEMBER" : "PRODUCT",
        targetId: member
          ? (await db.memberConfig.findUniqueOrThrow({ where: { level: "MONTHLY" } })).id
          : "synthetic-product",
        amount: 19,
        payAmount: 19,
        status: "PENDING",
        payMethod: channel,
        payTransactionId: "synthetic-ack-" + randomUUID(),
      },
    });
  type TestOrder = Awaited<ReturnType<typeof order>>;
  const call = async (svc: ShopPaymentService, o: TestOrder, channel: string) => {
    const tradeNo = "synthetic-confirmed-" + o.id;
    if (channel === "WECHAT")
      return svc.handlePaymentNotify({
        out_trade_no: o.payTransactionId,
        transaction_id: tradeNo,
        trade_state: "SUCCESS",
        attach: o.id,
        amount: { total: 1900 },
      });
    if (channel === "ALIPAY")
      return svc.handleAlipayNotify({
        outTradeNo: o.payTransactionId,
        tradeNo,
        tradeStatus: "TRADE_SUCCESS",
        totalAmount: "19.00",
      });
    if (channel === "UNIONPAY")
      return svc.handleUnionpayNotify({
        outTradeNo: o.payTransactionId,
        tradeNo,
        respCode: "00",
        amount: "1900",
      });
    // 汇付适配器将未确认入账转换为异常，由控制器拒绝确认渠道回调。
    try {
      await svc.handleHuifuNotify({
        req_seq_id: o.payTransactionId,
        hf_seq_id: tradeNo,
        trans_stat: "S",
        trans_amt: "19.00",
      });
      return true;
    } catch (e) {
      if (e instanceof Error && e.message === "汇付支付回调尚未完成本地入账") return false;
      throw e;
    }
  };
  // 仅控制入账前的真实读取时序，事务及CAS仍由真实Prisma/PostgreSQL执行。
  const simultaneousReads = (o: TestOrder) => {
    let arrived = 0,
      release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    return new Proxy(db, {
      get(t, key) {
        if (key === "order")
          return new Proxy(t.order, {
            get(model, method) {
              if (method === "findUnique" || method === "findFirst")
                return async (args: never) => {
                  const result =
                    method === "findUnique"
                      ? await model.findUnique(args)
                      : await model.findFirst(args);
                  if (result?.id === o.id && result.status === "PENDING" && arrived < 2) {
                    if (++arrived === 2) release();
                    await gate;
                  }
                  return result;
                };
              const v = Reflect.get(model, method, model);
              return typeof v === "function" ? v.bind(model) : v;
            },
          });
        const v = Reflect.get(t, key, t);
        return typeof v === "function" ? v.bind(t) : v;
      },
    });
  };
  const changeBeforeCas = (o: TestOrder, data: Prisma.OrderUpdateInput) =>
    new Proxy(db, {
      get(t, key) {
        if (key === "$transaction")
          return (work: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
            t.$transaction(async (tx) => {
              await db.order.update({ where: { id: o.id }, data });
              return work(tx);
            });
        const v = Reflect.get(t, key, t);
        return typeof v === "function" ? v.bind(t) : v;
      },
    });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [i] = await db.$queryRaw<
      Array<{ port: number; name: string }>
    >`SELECT inet_server_port() AS port,current_database() AS name`;
    if (![55462, 5432].includes(i.port) || !i.name.startsWith("entitlement_notice_qa_"))
      throw new Error("隔离库不符");
    config = await db.memberConfig.findUnique({ where: { level: "MONTHLY" } });
    const c = await db.couponTemplate.create({
      data: {
        name: "合成旧未用券",
        type: "FIXED",
        faceValue: 1,
        totalCount: 0,
        claimedCount: 0,
        startTime: new Date(Date.now() - 86400000 * 60),
        endTime: new Date(Date.now() + 86400000 * 60),
        status: "ACTIVE",
      },
    });
    couponId = c.id;
    await db.memberConfig.upsert({
      where: { level: "MONTHLY" },
      create: {
        level: "MONTHLY",
        name: "合成套餐",
        price: 19,
        monthlyPoints: 10,
        monthlyCouponId: couponId,
      },
      update: { price: 19, monthlyPoints: 10, monthlyCouponId: couponId },
    });
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    if (!db) return;
    for (const userId of users) {
      await db.order.deleteMany({ where: { userId } });
      await db.user.delete({ where: { id: userId } });
    }
    if (config)
      await db.memberConfig.update({
        where: { level: "MONTHLY" },
        data: {
          price: config.price,
          monthlyPoints: config.monthlyPoints,
          monthlyCouponId: config.monthlyCouponId,
        },
      });
    else await db.memberConfig.delete({ where: { level: "MONTHLY" } });
    if (couponId) await db.couponTemplate.delete({ where: { id: couponId } });
    await db.$disconnect();
  });

  describe.each(["WECHAT", "ALIPAY", "UNIONPAY", "HUIFU"])("%s", (channel) => {
    it("已付款后退款的真实订单重投，不再发送支付成功通知", async () => {
      const o = await order(await user(), channel);
      const svc = service();
      expect(await call(svc, o, channel)).toBe(true);
      await db.order.update({
        where: { id: o.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
      jest.clearAllMocks();
      expect(await call(svc, o, channel)).toBe(true);
      expect(fire).not.toHaveBeenCalled();
      expect(sendOnce).not.toHaveBeenCalled();
    });
    it("旧未用赠券引发真实唯一键回滚，不能确认付款或发送成功", async () => {
      const userId = await user();
      await db.couponRecord.create({
        data: {
          userId,
          couponId,
          status: "UNUSED",
          claimedAt: new Date(Date.now() - 86400000 * 40),
        },
      });
      const o = await order(userId, channel, true);
      const before = await db.user.findUniqueOrThrow({ where: { id: userId } });
      const claimed = (await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } }))
        .claimedCount;
      expect(await call(service(), o, channel)).toBe(false);
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
      expect(await db.memberPurchase.count({ where: { orderId: o.id } })).toBe(0);
      expect(await db.entitlementLedger.count({ where: { sourceId: o.id } })).toBe(0);
      expect(await db.userPoints.count({ where: { userId } })).toBe(0);
      expect(await db.couponRecord.count({ where: { userId, couponId } })).toBe(1);
      expect(
        (await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } })).claimedCount,
      ).toBe(claimed);
      expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).memberExpire).toEqual(
        before.memberExpire,
      );
      expect(fire).not.toHaveBeenCalled();
      expect(sendOnce).not.toHaveBeenCalled();
    });
    it("同订单并发真实CAS，赢家及核实后的重投均确认同笔入账", async () => {
      const o = await order(await user(), channel);
      const svc = service(simultaneousReads(o));
      const result = await Promise.all([call(svc, o, channel), call(svc, o, channel)]);
      expect(result).toEqual([true, true]);
      const actual = await db.order.findUniqueOrThrow({ where: { id: o.id } });
      expect(actual.status).toBe("PAID");
      expect(actual.paidAt).not.toBeNull();
      expect(actual.payMethod).toBe(channel);
      expect(actual.payTransactionId).toBe("synthetic-confirmed-" + o.id);
      expect(fire).toHaveBeenCalledWith("ORDER_PAID", expect.objectContaining({ orderId: o.id }));
      expect(sendOnce).toHaveBeenCalledWith(o.userId, "ORDER_PAID:" + o.id, expect.anything());
    });
    it("读取后取消抢先提交，真实CAS失败不能确认支付", async () => {
      const o = await order(await user(), channel);
      expect(await call(service(changeBeforeCas(o, { status: "CANCELLED" })), o, channel)).toBe(
        false,
      );
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("CANCELLED");
      expect(fire).not.toHaveBeenCalled();
      expect(sendOnce).not.toHaveBeenCalled();
    });
    it("另一笔流水先入账，真实CAS失败不能确认当前扣款", async () => {
      const o = await order(await user(), channel);
      expect(
        await call(
          service(
            changeBeforeCas(o, {
              status: "PAID",
              paidAt: new Date(),
              payTransactionId: "synthetic-other-charge-" + o.id,
            }),
          ),
          o,
          channel,
        ),
      ).toBe(false);
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).payTransactionId).toBe(
        "synthetic-other-charge-" + o.id,
      );
      expect(fire).not.toHaveBeenCalled();
      expect(sendOnce).not.toHaveBeenCalled();
    });
  });
});
