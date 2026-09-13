import { createHash } from "crypto";
import { PaymentInitializationPolicy } from "./payment-initialization-policy";
import { ShopPaymentService } from "../modules/shop/shop-payment.service";
import { HuifuService } from "../modules/huifu/huifu.service";

const T = "2026-09-13T00:00:00.000Z";
function configure(value: string = T) {
  process.env.PAYMENT_ORDER_CUTOFF_UTC = value;
  process.env.PAYMENT_ORDER_CUTOFF_SHA256 = createHash("sha256").update(value).digest("hex");
}
const original = { cutoff: process.env.PAYMENT_ORDER_CUTOFF_UTC, hash: process.env.PAYMENT_ORDER_CUTOFF_SHA256 };
beforeEach(() => configure());
afterAll(() => {
  for (const [key, value] of [["PAYMENT_ORDER_CUTOFF_UTC", original.cutoff], ["PAYMENT_ORDER_CUTOFF_SHA256", original.hash]]) {
    if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
  }
});

function harness(createdAt = new Date(Date.parse(T) + 1), existing = false) {
  const order: any = { id: "order-1", userId: "user-1", amount: 1, status: "PENDING", type: "PRODUCT", createdAt,
    payMethod: null, payTransactionId: null, shippingInfo: { city: "test" } };
  const record: any = existing ? { id: "record-1", orderId: order.id, outTradeNo: "HF-original", totalAmount: 1,
    createdAt: new Date(), rawRequest: { req_seq_id: "HF-original", trade_type: "A_NATIVE" },
    rawResponse: { resp_code: "00000000", qr_code: "original-code" } } : null;
  if (existing) { order.payMethod = "HUIFU"; order.payTransactionId = "HF-original"; }
  const db: any = { order: { findUnique: jest.fn(async () => ({ ...order })),
    updateMany: jest.fn(async ({ where, data }) => {
      if (where.createdAt && !(order.createdAt > where.createdAt.gt)) return { count: 0 };
      Object.assign(order, data); return { count: 1 };
    }) }, huifuSplitRecord: { findUnique: jest.fn(async () => record),
      create: jest.fn(async ({ data }) => ({ ...data, id: "record-1", createdAt: new Date() })),
      updateMany: jest.fn(async () => ({ count: 1 })) }, auth: { findFirst: jest.fn() },
    virtualCoinRecharge: { findUnique: jest.fn().mockResolvedValue({ userId: "user-1", status: "PAID", amountCoin: 10, amountRmb: 1 }) } };
  db.$transaction = jest.fn(async (fn) => fn(db));
  const gateway: any = { isConfigured: true, isAppConfigured: true,
    createAppOrder: jest.fn().mockResolvedValue({ orderInfo: {} }), createJsapiOrder: jest.fn().mockResolvedValue({ paySign: {} }),
    createNativeOrder: jest.fn().mockResolvedValue({ codeUrl: "new" }), createH5Order: jest.fn().mockResolvedValue({ h5Url: "new" }),
    closeOrder: jest.fn(), queryOrderVerified: jest.fn() };
  const redis: any = { setNX: jest.fn().mockResolvedValue(true), del: jest.fn().mockResolvedValue(undefined),
    getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn(), get: jest.fn(), set: jest.fn() };
  const svc = new ShopPaymentService(db, redis, gateway, {} as any, {} as any, {} as any, {} as any, {} as any,
    {} as any, { getOrder: async () => ({ ...order }) } as any);
  const hf = new HuifuService(db, redis);
  jest.spyOn(hf as any, "getConfig").mockResolvedValue("configured");
  const out = jest.spyOn(hf as any, "callApi").mockResolvedValue({ resp_code: "00000000", qr_code: "new" });
  const start = (kind: string) => kind === "app" ? svc.createAppPayment(order.id, order.userId, "android")
    : kind === "jsapi" ? svc.createJsapiPayment(order.userId, "openid", order.id)
    : kind === "native" ? svc.createNativePayment(order.id, order.userId) : svc.createH5Payment(order.id, order.userId, "127.0.0.1");
  return { order, db, gateway, redis, svc, hf, out, start };
}

describe("可信截止配置", () => {
  it.each([undefined, new Date(NaN), "2026-09-14T00:00:00.000Z"])("非法数据库日期%s不能放行", createdAt => {
    expect(() => new PaymentInitializationPolicy().assertOrder({ createdAt: createdAt as Date })).toThrow("支付核对中");
  });
  it.each(["", "invalid", "2026-02-30T00:00:00.000Z", "2026-09-13T00:00:00Z", "2026-09-13T08:00:00.000+08:00"])("配置%s不阻断构造，只拒绝初始化", raw => {
    configure(raw); const policy = new PaymentInitializationPolicy();
    expect(() => policy.assertOrder({ createdAt: new Date("2030-01-01") })).toThrow("支付核对中");
  });
  it("共享发布摘要不变时，另一节点不同截止值拒绝初始化", () => {
    const a = new PaymentInitializationPolicy(); process.env.PAYMENT_ORDER_CUTOFF_UTC = "2026-09-12T00:00:00.000Z";
    const b = new PaymentInitializationPolicy(); const order = { createdAt: new Date(Date.parse(T) + 1) };
    expect(a.assertOrder(order).toISOString()).toBe(T); expect(() => b.assertOrder(order)).toThrow("支付核对中");
  });
  it("缺少摘要拒绝；有效实例固定截止，运行时环境回退不能放行旧单", () => {
    const policy = new PaymentInitializationPolicy(); delete process.env.PAYMENT_ORDER_CUTOFF_SHA256;
    expect(() => new PaymentInitializationPolicy().assertOrder({ createdAt: new Date() })).toThrow();
    configure("2000-01-01T00:00:00.000Z"); expect(() => policy.assertOrder({ createdAt: new Date(T) })).toThrow();
  });
});

describe("初始化与查询隔离", () => {
  it.each(["app", "jsapi", "native", "h5"].flatMap(kind => [-1, 0].map(delta => [kind, delta] as const)))("%s截止偏移%s的旧单在缓存与恢复前拒绝", async (kind, delta) => {
    const h = harness(new Date(Date.parse(T) + delta)); h.order.payMethod = "WECHAT_INIT"; h.order.payTransactionId = "old";
    h.redis.getJson.mockResolvedValue({ outTradeNo: "old", orderInfo: {}, paySign: {}, result: { codeUrl: "old" }, mwebUrl: "old" });
    await expect(h.start(kind)).rejects.toMatchObject({ errorCode: 301001, status: 409 });
    expect(h.redis.getJson).not.toHaveBeenCalled(); expect(h.gateway.closeOrder).not.toHaveBeenCalled();
    expect(h.gateway.queryOrderVerified).not.toHaveBeenCalled(); expect(h.db.order.updateMany).not.toHaveBeenCalled();
    for (const key of ["createAppOrder", "createJsapiOrder", "createNativeOrder", "createH5Order"]) expect(h.gateway[key]).not.toHaveBeenCalled();
  });
  it.each(["app", "jsapi", "native", "h5"])("%s新单仍先CAS再出站", async kind => {
    const h = harness(); await h.start(kind);
    expect(h.db.order.updateMany.mock.calls[0][0].where.createdAt).toEqual({ gt: new Date(T) });
    expect(h.order.payMethod).toBe("WECHAT");
  });
  it("进入事务后订单变旧，即使外层校验过也拒绝", async () => {
    const h = harness(); h.db.order.findUnique.mockResolvedValue({ ...h.order, createdAt: new Date(T) });
    await expect((h.svc as any).reserveWechatPaymentIntent(h.order, "new")).rejects.toThrow("支付核对中");
    expect(h.db.order.updateMany).not.toHaveBeenCalled();
  });
  it("Redis清理失败不覆盖截止错误", async () => {
    const h = harness(new Date(T)); h.redis.del.mockRejectedValue(new Error("redis down"));
    await expect(h.start("native")).rejects.toMatchObject({ status: 409, errorCode: 301001 });
  });
  it.each([false, true])("旧汇付单existing=%s不返回凭据或新建渠道单", async existing => {
    const h = harness(new Date(T), existing);
    await expect(h.hf.createPayment("user-1", { orderId: "order-1", payType: "ALIPAY" })).rejects.toMatchObject({ status: 409 });
    expect(h.db.huifuSplitRecord.findUnique).not.toHaveBeenCalled(); expect(h.db.order.updateMany).not.toHaveBeenCalled(); expect(h.out).not.toHaveBeenCalled();
  });
  it("新汇付单事务CAS包含截止限制", async () => {
    const h = harness(); await h.hf.createPayment("user-1", { orderId: "order-1", payType: "ALIPAY" });
    expect(h.db.order.updateMany.mock.calls[0][0].where.createdAt).toEqual({ gt: new Date(T) }); expect(h.out).toHaveBeenCalledTimes(1);
  });
  it.each(["wechat", "huifu"])("%s事务条件更新失败时不得出站", async kind => {
    const h = harness(); h.db.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(kind === "wechat" ? h.start("native") : h.hf.createPayment("user-1", { orderId: "order-1", payType: "ALIPAY" })).rejects.toThrow();
    expect(h.gateway.createNativeOrder).not.toHaveBeenCalled(); expect(h.out).not.toHaveBeenCalled();
    expect(h.db.huifuSplitRecord.create).not.toHaveBeenCalled();
  });
  it.each(["h5", "jsapi", "direct"])("充值%s真实入口拒绝，不读授权、不出站、不记意图", async kind => {
    const h = harness();
    const result = kind === "h5" ? h.svc.createCoinRechargeH5("user-1", 100, "ip")
      : kind === "jsapi" ? h.svc.createCoinRechargeJsapi("user-1", 100) : h.svc.createRechargePayment("user-1", "openid", 100);
    await expect(result).rejects.toMatchObject({ status: 409 });
    expect(h.db.auth.findFirst).not.toHaveBeenCalled(); expect(h.gateway.createJsapiOrder).not.toHaveBeenCalled();
    expect(h.gateway.createH5Order).not.toHaveBeenCalled(); expect(h.redis.set).not.toHaveBeenCalled();
  });
  it("非法截止不影响已有充值查询和旧订单查询入口", async () => {
    configure(""); const h = harness(new Date(T)); h.order.status = "PAID";
    await expect(h.svc.queryCoinRechargeStatus("user-1", "RC12345678")).resolves.toMatchObject({ status: "PAID" });
    await expect(h.svc.queryPaymentStatus("order-1", "user-1")).resolves.toBeDefined();
  });
});
