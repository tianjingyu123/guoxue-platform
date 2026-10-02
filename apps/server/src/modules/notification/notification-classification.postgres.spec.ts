import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { PushService } from "./push.service";
import { PushAudienceService } from "../user/push-audience.service";
import { JwtStrategy } from "../../common/jwt.strategy";
import { SendNotificationDto } from "./notification.dto";
import { ShopPaymentService } from "../shop/shop-payment.service";
import { ShopRefundService } from "../shop/shop-refund.service";
import { EntitlementService } from "../entitlement/entitlement.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462"
    || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("通知分类测试仅允许指定合成库，不读取DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("通知分类同次持久化与真实JWT筛选", () => {
  let db: PrismaClient;
  let app: INestApplication;
  let svc: NotificationService;
  const users: string[] = [];
  const orders: string[] = [];
  const forbidden = jest.fn(() => { throw new Error("禁止真实推送"); });
  const del = jest.fn(async () => 1);
  const secret = "synthetic-notification-category-jwt";
  const oldSecret = process.env.JWT_SECRET;
  const user = async () => {
    const row = await db.user.create({ data: { nickname: "合成分类用户" } });
    users.push(row.id); return row.id;
  };
  const dto = { type: "POST_REWARD", title: "合成打赏通知", content: "合成站内验证", category: "TRADE" as const, circleId: "synthetic-circle-a", targetType: "CIRCLE", targetId: "synthetic-target" };
  const auth = (id: string) => `Bearer ${jwt.sign({ sub: id }, secret, { expiresIn: "5m" })}`;
  const rejectClassifiedInsert = async (work: () => Promise<void>) => {
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_notice_category_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic category insertion failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_notice_category_fail BEFORE INSERT ON "Notification" FOR EACH ROW WHEN (NEW.category = 'TRADE') EXECUTE FUNCTION synthetic_notice_category_fail()`);
    try { await work(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_notice_category_fail ON "Notification"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_notice_category_fail()`);
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(identity[0].port)) throw new Error("合成库身份不符");
    process.env.JWT_SECRET = secret;
    const mod = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })], controllers: [NotificationController],
      providers: [NotificationService, JwtStrategy,
        { provide: PrismaService, useValue: db },
        { provide: RedisService, useValue: { get: async () => null, getJson: async () => ({ PUSH_ENABLED: false }), setNX: async () => true, del } },
        { provide: PushService, useValue: { sendMiniSubscribeMsg: forbidden, sendMpTemplateMsg: forbidden } },
        { provide: PushAudienceService, useValue: {} },
      ],
    }).compile();
    svc = mod.get(NotificationService); app = mod.createNestApplication(); await app.init();
  });
  afterEach(async () => {
    jest.restoreAllMocks(); del.mockClear();
    await db.entitlementLedger.deleteMany({ where: { userId: { in: users } } });
    await db.entitlementBalance.deleteMany({ where: { userId: { in: users } } });
    await db.order.deleteMany({ where: { id: { in: orders.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => {
    await app?.close(); await db?.$disconnect(); expect(forbidden).not.toHaveBeenCalled();
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  });

  it("带分类通知首次INSERT即携带圈子字段，实际JWT列表本人可见他人不可见", async () => {
    const owner = await user(), stranger = await user();
    const result = await svc.send(owner, dto);
    expect(result).toEqual(expect.objectContaining({ category: "TRADE", circleId: dto.circleId }));
    const own = await request(app.getHttpServer()).get("/notifications/circle?category=TRADE").set("Authorization", auth(owner)).expect(200);
    expect(own.body.items.map((row: { id: string }) => row.id)).toEqual([result.id]);
    expect(own.body.unread.TRADE).toBe(1);
    const other = await request(app.getHttpServer()).get("/notifications/circle?category=TRADE").set("Authorization", auth(stranger)).expect(200);
    expect(other.body.items).toEqual([]); expect(other.body.unread.ALL).toBe(0);
    await request(app.getHttpServer()).get(`/notifications/${result.id}`).set("Authorization", auth(stranger)).expect(404);
    await request(app.getHttpServer()).get("/notifications/circle").expect(401);
  });

  it("分类写入失败时不留下无分类通知，sendOnce释放认领后可完整重试", async () => {
    const owner = await user();
    await rejectClassifiedInsert(async () => {
      await expect(svc.sendOnce(owner, "POST_REWARD:synthetic-failure", dto)).rejects.toThrow();
      expect(await db.notification.count({ where: { userId: owner } })).toBe(0);
      expect(del).toHaveBeenCalledWith(`notification:sent:${owner}:POST_REWARD:synthetic-failure`);
    });
    const row = await svc.sendOnce(owner, "POST_REWARD:synthetic-failure", dto);
    expect(row).toEqual(expect.objectContaining({ category: "TRADE", circleId: dto.circleId }));
    expect(await db.notification.count({ where: { userId: owner } })).toBe(1);
  });

  it("sendOnce重投由数据库唯一键保留首个事件分类和圈子", async () => {
    const owner = await user();
    const row = await svc.sendOnce(owner, "POST_REWARD:synthetic-duplicate", dto);
    await expect(svc.sendOnce(owner, "POST_REWARD:synthetic-duplicate", { ...dto, category: "GOVERN", circleId: "synthetic-circle-b" })).resolves.toBeNull();
    expect(await db.notification.findUniqueOrThrow({ where: { id: row!.id } })).toEqual(expect.objectContaining({ category: "TRADE", circleId: dto.circleId }));
    expect(await db.notification.count({ where: { userId: owner } })).toBe(1);
  });

  it("无键批量通知不误标同用户同目标的其他未分类通知", async () => {
    const owner = await user();
    const old = await db.notification.create({ data: { userId: owner, type: dto.type, title: "合成其他事件", content: "不能被批量补标", targetId: dto.targetId } });
    await svc.batchSend({ ...dto, userIds: [owner] });
    const rows = await db.notification.findMany({ where: { userId: owner } });
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.id === old.id)).toEqual(expect.objectContaining({ category: null, circleId: null }));
    expect(rows.find(row => row.id !== old.id)).toEqual(expect.objectContaining({ category: "TRADE", circleId: dto.circleId }));
  });

  it("不同圈子同用户同目标并发批量不会串分类", async () => {
    const owner = await user();
    await Promise.all([
      svc.batchSend({ ...dto, userIds: [owner], title: "合成交易A" }),
      svc.batchSend({ ...dto, userIds: [owner], title: "合成圈务B", category: "GOVERN", circleId: "synthetic-circle-b" }),
    ]);
    const rows = await db.notification.findMany({ where: { userId: owner } });
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.title === "合成交易A")).toEqual(expect.objectContaining({ category: "TRADE", circleId: dto.circleId }));
    expect(rows.find(row => row.title === "合成圈务B")).toEqual(expect.objectContaining({ category: "GOVERN", circleId: "synthetic-circle-b" }));
  });

  it("带事件键批量失败全批不入库，修复后重投一次且不改首个分类", async () => {
    const first = await user(), second = await user();
    const batch = { ...dto, userIds: [first, first, second] };
    await rejectClassifiedInsert(async () => {
      await expect(svc.batchSend(batch, "synthetic-classified-batch")).rejects.toThrow();
      expect(await db.notification.count({ where: { userId: { in: [first, second] } } })).toBe(0);
    });
    expect((await svc.batchSend(batch, "synthetic-classified-batch")).count).toBe(2);
    expect((await svc.batchSend({ ...batch, category: "LIVE", circleId: "synthetic-circle-b" }, "synthetic-classified-batch")).count).toBe(0);
    const rows = await db.notification.findMany({ where: { userId: { in: [first, second] } } });
    expect(rows).toHaveLength(2); expect(rows.every(row => row.category === "TRADE" && row.circleId === dto.circleId)).toBe(true);
  });

  it("普通批量收件人不存在时整次INSERT失败而不遗留部分通知", async () => {
    const owner = await user();
    await expect(svc.batchSend({ ...dto, userIds: [owner, "synthetic-not-existing-user"] })).rejects.toThrow();
    expect(await db.notification.count({ where: { userId: owner } })).toBe(0);
  });

  it("不带分类或运行时非法分类保持非圈内通知，不采用单独circleId", async () => {
    const owner = await user();
    const normal = await svc.send(owner, { type: "SYSTEM", title: "合成普通通知", content: "普通内容", circleId: "synthetic-unused" });
    const invalid = await svc.send(owner, { ...dto, category: "INVALID" } as unknown as SendNotificationDto);
    expect(normal).toEqual(expect.objectContaining({ category: null, circleId: null }));
    expect(invalid).toEqual(expect.objectContaining({ category: null, circleId: null }));
    expect((await svc.getCircleNotifications(owner)).items).toEqual([]);
  });

  const shopFixture = async () => {
    const owner = await user();
    const order = await db.order.create({ data: { userId: owner, type: "COURSE", targetId: "synthetic-course", amount: 15, status: "PENDING", payMethod: "WECHAT", payTransactionId: `synthetic-intent-${owner}` } });
    orders.push(order.id);
    const entitlement = new EntitlementService(db as unknown as PrismaService);
    const redis = { setNX: async () => true, del: async () => undefined, delByPattern: async () => undefined } as unknown as RedisService;
    const webhook = { fire: async () => undefined };
    const payment = new ShopPaymentService(db as unknown as PrismaService, redis,
      {} as never, {} as never, {} as never, webhook as never, {} as never, entitlement,
      { recordOrderCommissionAndFee: async () => undefined } as never,
      { invalidateOrderCache: async () => undefined, settleGroupBuyIfNeeded: async () => undefined } as never,
      undefined, undefined, undefined, undefined, undefined, svc);
    const refund = new ShopRefundService(db as unknown as PrismaService, redis, {} as never, {} as never,
      {} as never, { registerRefundNotifyHandler: () => undefined } as never, {} as never, webhook as never, entitlement, undefined, svc);
    const callback = { out_trade_no: order.payTransactionId!, transaction_id: `synthetic-txn-${order.id}`, trade_state: "SUCCESS", attach: order.id, amount: { total: 1500 } };
    return { owner, order, entitlement, payment, refund, callback };
  };

  it("实际支付退款服务使用真实通知：通知INSERT失败不回滚资金权益，重投仅一份通知", async () => {
    const f = await shopFixture();
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_notice_payment_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notification insertion failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_notice_payment_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_notice_payment_fail()`);
    try { await expect(f.payment.handlePaymentNotify(f.callback)).resolves.toBe(true); }
    finally { await db.$executeRawUnsafe(`DROP TRIGGER synthetic_notice_payment_fail ON "Notification"`); }
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("PAID");
    expect(await db.notification.count({ where: { userId: f.owner } })).toBe(0);
    await f.payment.handlePaymentNotify(f.callback); await f.payment.handlePaymentNotify(f.callback);
    expect(await db.entitlementLedger.count({ where: { userId: f.owner, action: "GRANT" } })).toBe(1);
    expect(await db.notification.count({ where: { idempotencyKey: `${f.owner}:ORDER_PAID:${f.order.id}` } })).toBe(1);
    const refund = { out_refund_no: `RF${f.order.id}`, refund_status: "SUCCESS", transaction_id: f.callback.transaction_id, refund_id: "synthetic-refund-id", amount: { refund: 1500, total: 1500 } };
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_notice_payment_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_notice_payment_fail()`);
    try { await expect(f.refund.handleRefundNotify(refund)).resolves.toBeUndefined(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_notice_payment_fail ON "Notification"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_notice_payment_fail()`);
    }
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("REFUNDED");
    expect(await db.notification.count({ where: { idempotencyKey: `${f.owner}:ORDER_REFUNDED:${f.order.id}` } })).toBe(0);
    await f.refund.handleRefundNotify(refund); await f.refund.handleRefundNotify(refund);
    expect(await db.entitlementLedger.count({ where: { userId: f.owner, action: "REVOKE" } })).toBe(1);
    expect(await db.notification.count({ where: { idempotencyKey: `${f.owner}:ORDER_REFUNDED:${f.order.id}` } })).toBe(1);
  });

  it("实际权益事务失败时真实通知服务不会生成支付或退款成功通知", async () => {
    const f = await shopFixture();
    const grant = f.entitlement.grantWithTx.bind(f.entitlement);
    const failGrant = jest.spyOn(f.entitlement, "grantWithTx").mockImplementationOnce(async (...args) => { await grant(...args); throw new Error("synthetic grant transaction rollback"); });
    await expect(f.payment.handlePaymentNotify(f.callback)).rejects.toThrow("synthetic grant transaction rollback");
    failGrant.mockRestore();
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("PENDING");
    expect(await db.entitlementLedger.count({ where: { userId: f.owner } })).toBe(0);
    expect(await db.notification.count({ where: { userId: f.owner } })).toBe(0);
    await f.payment.handlePaymentNotify(f.callback);
    const revoke = f.entitlement.revokeSourceWithTx.bind(f.entitlement);
    jest.spyOn(f.entitlement, "revokeSourceWithTx").mockImplementationOnce(async (...args) => { await revoke(...args); throw new Error("synthetic revoke transaction rollback"); });
    await expect(f.refund.handleRefundNotify({ out_refund_no: `RF${f.order.id}`, refund_status: "SUCCESS", transaction_id: f.callback.transaction_id, refund_id: "synthetic-refund-id", amount: { refund: 1500, total: 1500 } })).rejects.toThrow("synthetic revoke transaction rollback");
    expect((await db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("PAID");
    expect(await db.entitlementLedger.count({ where: { userId: f.owner, action: "REVOKE" } })).toBe(0);
    expect(await db.notification.count({ where: { idempotencyKey: `${f.owner}:ORDER_REFUNDED:${f.order.id}` } })).toBe(0);
  });
});
