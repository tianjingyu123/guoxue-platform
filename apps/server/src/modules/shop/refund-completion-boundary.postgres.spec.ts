import { PrismaClient } from "@prisma/client";
import { ShopRefundService } from "./shop-refund.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { NotificationService } from "../notification/notification.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55462"
    || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("退款最终收口验收只允许专用合成库，不使用DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("退款成功通知最终收口真实PG", () => {
  let db: PrismaClient;
  let entitlement: EntitlementService;
  let notification: NotificationService;
  let svc: ShopRefundService;
  const users: string[] = [];
  const orders: string[] = [];
  const reverseCommission = jest.fn();
  const fire = jest.fn();
  const redis = {
    setNX: async () => true,
    del: async () => undefined,
    delByPattern: async () => undefined,
    getJson: async () => ({ PUSH_ENABLED: false }),
  };
  const forbidden = jest.fn(() => { throw new Error("禁止真实外发"); });
  const fixture = async () => {
    const user = await db.user.create({ data: { nickname: "合成退款收口用户" } });
    users.push(user.id);
    const order = await db.order.create({ data: {
      userId: user.id, type: "COURSE", targetId: "synthetic-refund-course", amount: 15,
      status: "PAID", payMethod: "WECHAT", payTransactionId: "synthetic-refund-" + user.id,
    } });
    orders.push(order.id);
    const after = await db.afterSale.create({ data: {
      orderId: order.id, userId: user.id, type: "refund_only", reason: "隔离退款收口验收", status: "PROCESSING", amount: 15,
    } });
    await entitlement.grant({ userId: user.id, entitlementKey: "synthetic.final.course", kind: "ACCESS",
      resourceType: "COURSE", resourceId: order.targetId, sourceType: "ORDER", sourceId: order.id,
      quantity: 1, idempotencyKey: "grant:" + order.id });
    const callback = { out_refund_no: "RF" + order.id, refund_status: "SUCCESS", transaction_id: order.payTransactionId,
      refund_id: "synthetic-refund-id", amount: { refund: 1500, total: 1500 } };
    return { user, order, after, callback };
  };
  const count = (id: string) => db.notification.count({ where: { targetType: "ORDER", targetId: id, title: "退款完成" } });
  const trigger = async (table: "AfterSale" | "Notification", body: () => Promise<void>) => {
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_final_refund_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic final refund database failure'; END $$");
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_final_refund_fail BEFORE ${table === "AfterSale" ? "UPDATE" : "INSERT"} ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_final_refund_fail()`);
    try { await body(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_final_refund_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_final_refund_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    await db.$connect();
    entitlement = new EntitlementService(db as never);
    notification = new NotificationService(db as never, redis as never, { send: forbidden } as never, {} as never);
    svc = new ShopRefundService(db as never, redis as never, {} as never, {} as never, {} as never,
      { registerRefundNotifyHandler: () => undefined } as never, {} as never, { fire } as never,
      entitlement, { reverseCommission } as never, notification);
  });
  beforeEach(() => {
    reverseCommission.mockReset().mockResolvedValue(undefined);
    fire.mockReset().mockResolvedValue(undefined);
    forbidden.mockClear();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    expect(forbidden).not.toHaveBeenCalled();
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.afterSale.deleteMany({ where: { orderId: { in: orders } } });
    await db.entitlementLedger.deleteMany({ where: { userId: { in: users } } });
    await db.entitlementBalance.deleteMany({ where: { userId: { in: users } } });
    await db.order.deleteMany({ where: { id: { in: orders.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });

  it("分佣冲正失败不提前发成功通知或成功Webhook，保留PROCESSING恢复锚点", async () => {
    const f = await fixture();
    reverseCommission.mockRejectedValueOnce(new Error("synthetic commission failure"));
    await expect(svc.handleRefundNotify(f.callback)).rejects.toThrow("synthetic commission failure");
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("REFUNDED");
    expect((await db.afterSale.findUniqueOrThrow({ where: { id: f.after.id } })).status).toBe("PROCESSING");
    expect(await count(f.order.id)).toBe(0);
    expect(fire).not.toHaveBeenCalled();
  });
  it("分佣故障重投后先收敛售后再发通知，重复回调只有一条通知且权益不重复冲正", async () => {
    const f = await fixture();
    reverseCommission.mockRejectedValueOnce(new Error("synthetic commission failure"));
    await expect(svc.handleRefundNotify(f.callback)).rejects.toThrow();
    expect(await count(f.order.id)).toBe(0);
    const send = jest.spyOn(notification, "sendOnce").mockImplementation(async (...args) => {
      expect((await db.afterSale.findUniqueOrThrow({ where: { id: f.after.id } })).status).toBe("COMPLETED");
      return NotificationService.prototype.sendOnce.apply(notification, args);
    });
    await svc.handleRefundNotify(f.callback);
    await svc.handleRefundNotify(f.callback);
    expect(await count(f.order.id)).toBe(1);
    expect(send).toHaveBeenCalledWith(f.user.id, "ORDER_REFUNDED:" + f.order.id, expect.any(Object));
    expect(await db.entitlementLedger.count({ where: { userId: f.user.id, action: "REVOKE" } })).toBe(1);
  });
  it("售后终态实际数据库写入失败不发送成功，失败解除后重投可收敛", async () => {
    const f = await fixture();
    await trigger("AfterSale", async () => {
      await expect(svc.handleRefundNotify(f.callback)).rejects.toThrow("synthetic final refund database failure");
      expect(await count(f.order.id)).toBe(0);
      expect(fire).not.toHaveBeenCalled();
      expect((await db.afterSale.findUniqueOrThrow({ where: { id: f.after.id } })).status).toBe("PROCESSING");
    });
    await svc.handleRefundNotify(f.callback);
    expect(await count(f.order.id)).toBe(1);
  });
  it("最终站内通知真实INSERT失败不阻断已完成退款，重投仍同键并数据库防重", async () => {
    const f = await fixture();
    await trigger("Notification", async () => {
      await expect(svc.handleRefundNotify(f.callback)).resolves.toBeUndefined();
      expect(await count(f.order.id)).toBe(0);
      expect((await db.afterSale.findUniqueOrThrow({ where: { id: f.after.id } })).status).toBe("COMPLETED");
    });
    await svc.handleRefundNotify(f.callback);
    await svc.handleRefundNotify(f.callback);
    expect(await count(f.order.id)).toBe(1);
  });
  it("权益冲正后事务故障仍一起回滚订单与权益，财务和成功通知均未执行", async () => {
    const f = await fixture();
    const original = entitlement.revokeSourceWithTx.bind(entitlement);
    jest.spyOn(entitlement, "revokeSourceWithTx").mockImplementationOnce(async (...args) => {
      await original(...args); throw new Error("synthetic entitlement rollback");
    });
    await expect(svc.handleRefundNotify(f.callback)).rejects.toThrow("synthetic entitlement rollback");
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("PAID");
    expect(await db.entitlementLedger.count({ where: { userId: f.user.id, action: "REVOKE" } })).toBe(0);
    expect(reverseCommission).not.toHaveBeenCalled(); expect(fire).not.toHaveBeenCalled(); expect(await count(f.order.id)).toBe(0);
  });
  it.each(["PROCESSING", "CLOSED", "ABNORMAL"])("渠道%s不发送完成通知，不把订单标成退款成功", async status => {
    const f = await fixture();
    await svc.handleRefundNotify({ ...f.callback, refund_status: status });
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("PAID");
    expect(reverseCommission).not.toHaveBeenCalled(); expect(fire).not.toHaveBeenCalled(); expect(await count(f.order.id)).toBe(0);
  });
});
