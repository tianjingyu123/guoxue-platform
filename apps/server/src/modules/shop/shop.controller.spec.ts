import { Test } from "@nestjs/testing";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";
import { ShopCouponService } from "./shop-coupon.service";
import { AfterSaleSlaService } from "./after-sale-sla.service";
import { LogisticsService } from "./logistics.service";
import { SystemService } from "../system/system.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { ActiveUserGuard } from "../../common/active-user.guard";
import { StationIsolationGuard } from "../../common/station-isolation.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { Logger } from "@nestjs/common";

const mockShopSvc = {
  createProduct: jest.fn().mockResolvedValue({ id: "p1", name: "国学书籍" }),
  listProducts: jest.fn().mockResolvedValue([{ id: "p1", name: "国学书籍" }]),
  getProduct: jest.fn().mockResolvedValue({ id: "p1", name: "国学书籍", price: 99 }),
  updateProduct: jest.fn().mockResolvedValue({ id: "p1", name: "更新商品" }),
  deleteProduct: jest.fn().mockResolvedValue({ success: true }),
  addSku: jest.fn().mockResolvedValue({ id: "sku1", name: "标准版", price: 99 }),
  deleteSku: jest.fn().mockResolvedValue({ success: true }),
  createOrder: jest.fn().mockResolvedValue({ id: "o1", amount: 99 }),
  listOrders: jest.fn().mockResolvedValue([{ id: "o1", amount: 99 }]),
  getUserOrders: jest.fn().mockResolvedValue([{ id: "o1", amount: 99 }]),
  getOrder: jest.fn().mockResolvedValue({ id: "o1", amount: 99, status: "PAID" }),
  createJsapiPayment: jest.fn().mockResolvedValue({ prepayId: "prepay123", paySign: {} }),
  createNativePayment: jest.fn().mockResolvedValue({ codeUrl: "weixin://..." }),
  createH5Payment: jest.fn().mockResolvedValue({ mwebUrl: "https://wx.tenpay.com/h5/pay/xxx", outTradeNo: "GX1" }),
  createCoinRechargeJsapi: jest.fn().mockResolvedValue({ payParams: { paySign: "x" }, orderNo: "RC12345678" }),
  createCoinRechargeH5: jest.fn().mockResolvedValue({ mwebUrl: "https://wx.tenpay.com/h5/pay/recharge", orderNo: "RC12345678" }),
  queryCoinRechargeStatus: jest.fn().mockResolvedValue({ orderNo: "RC12345678", status: "PENDING" }),
  estimateOrder: jest.fn().mockResolvedValue({ goodsAmount: 79, couponDiscount: 10, selfDiscount: 13.8, payableAmount: 55.2 }),
  queryPaymentStatus: jest.fn().mockResolvedValue({ status: "PAID" }),
  shipOrder: jest.fn().mockResolvedValue({ id: "o1", status: "SHIPPED" }),
  adminPayOrder: jest.fn().mockResolvedValue({ id: "o1", status: "PAID" }),
  completeOrder: jest.fn().mockResolvedValue({ id: "o1", status: "COMPLETED" }),
  refundOrder: jest.fn().mockResolvedValue({ id: "o1", status: "REFUNDING" }),
  verifyAndDecryptNotify: jest.fn().mockResolvedValue({ valid: true, data: { outTradeNo: "o1" } }),
  handlePaymentNotify: jest.fn().mockResolvedValue(true),
  verifyAlipayNotify: jest.fn().mockResolvedValue({ valid: true, data: {} }),
  handleAlipayNotify: jest.fn().mockResolvedValue(undefined),
  verifyUnionpayNotify: jest.fn().mockResolvedValue({ valid: true, data: {} }),
  handleUnionpayNotify: jest.fn().mockResolvedValue(undefined),
  handleRefundNotify: jest.fn().mockResolvedValue(undefined),
  alipayQuery: jest.fn().mockResolvedValue({ tradeStatus: "TRADE_SUCCESS" }),
  alipayRefund: jest.fn().mockResolvedValue({ refundStatus: "SUCCESS" }),
  unionpayQuery: jest.fn().mockResolvedValue({ origRespCode: "00" }),
  unionpayRefund: jest.fn().mockResolvedValue({ respCode: "00" }),
  cancelOrder: jest.fn().mockResolvedValue({ id: "o1", status: "CANCELLED" }),
  createCoupon: jest.fn().mockResolvedValue({ id: "cp1", type: "DISCOUNT" }),
  listCoupons: jest.fn().mockResolvedValue([{ id: "cp1", type: "DISCOUNT" }]),
  updateCoupon: jest.fn().mockResolvedValue({ id: "cp1", type: "DISCOUNT" }),
  deleteCoupon: jest.fn().mockResolvedValue({ success: true }),
  claimCoupon: jest.fn().mockResolvedValue({ claimed: true }),
  grantCoupon: jest.fn().mockResolvedValue({ granted: true }),
  getUserCoupons: jest.fn().mockResolvedValue([{ id: "cp1", status: "UNUSED" }]),
  createFreightTemplate: jest.fn().mockResolvedValue({ id: "ft1", name: "全国包邮" }),
  getFreightTemplates: jest.fn().mockResolvedValue([{ id: "ft1", name: "全国包邮" }]),
  getFreightTemplate: jest.fn().mockResolvedValue({ id: "ft1", name: "全国包邮" }),
  updateFreightTemplate: jest.fn().mockResolvedValue({ id: "ft1", name: "更新模板" }),
  deleteFreightTemplate: jest.fn().mockResolvedValue({ success: true }),
  createReview: jest.fn().mockResolvedValue({ id: "rv1", rating: 5 }),
  listReviews: jest.fn().mockResolvedValue([{ id: "rv1", rating: 5 }]),
  replyProductReview: jest.fn().mockResolvedValue({ id: "rv1", reply: "感谢评价" }),
  deleteProductReview: jest.fn().mockResolvedValue({ success: true }),
  getLogistics: jest.fn().mockResolvedValue({ status: "IN_TRANSIT", traces: [] }),
  updateLogistics: jest.fn().mockResolvedValue({ id: "o1", trackingNo: "SF123" }),
};

const mockLogisticsSvc = {
  queryTrack: jest.fn().mockResolvedValue({ state: "3", traces: [] }),
};

const mockCouponSvc = {
  createCoupon: jest.fn().mockResolvedValue({ id: "cp1", type: "DISCOUNT" }),
  listCoupons: jest.fn().mockResolvedValue([{ id: "cp1", type: "DISCOUNT" }]),
  updateCoupon: jest.fn().mockResolvedValue({ id: "cp1", type: "DISCOUNT" }),
  deleteCoupon: jest.fn().mockResolvedValue({ success: true }),
  claimCoupon: jest.fn().mockResolvedValue({ claimed: true }),
  grantCoupon: jest.fn().mockResolvedValue({ granted: true }),
  getUserCoupons: jest.fn().mockResolvedValue([{ id: "cp1", status: "UNUSED" }]),
  submitReturnLogistics: jest.fn().mockResolvedValue({ id: "as1" }),
  processAfterSale: jest.fn().mockResolvedValue({ id: "as1", status: "APPROVED" }),
};

const mockSystemSvc = {
  logAudit: jest.fn().mockResolvedValue(undefined),
};

describe("ShopController", () => {
  let ctrl: ShopController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        { provide: ShopService, useValue: mockShopSvc },
        { provide: ShopCouponService, useValue: mockCouponSvc },
        { provide: LogisticsService, useValue: mockLogisticsSvc },
        { provide: SystemService, useValue: mockSystemSvc },
        // 合-P2 售后SLA列表的依赖
        { provide: AfterSaleSlaService, useValue: { listWithSla: jest.fn().mockResolvedValue({ items: [], total: 0 }) } },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .overrideGuard(ActiveUserGuard).useValue({ canActivate: () => true })
      .overrideGuard(StationIsolationGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(ShopController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("客服处理售后时后端关闭退款资金权限", async () => {
    const req: any = { user: { id: "cs1", roles: ["CUSTOMER_SERVICE"] } };
    await ctrl.processAfterSale(req, "as1", "approve", "同意申请");
    expect(mockCouponSvc.processAfterSale).toHaveBeenCalledWith("as1", "approve", "同意申请", false);
  });

  it("运营处理售后时保留退款资金权限", async () => {
    const req: any = { user: { id: "op1", roles: ["OPERATION_ADMIN"] } };
    await ctrl.processAfterSale(req, "as1", "approve");
    expect(mockCouponSvc.processAfterSale).toHaveBeenCalledWith("as1", "approve", undefined, true);
  });

  // ─── 商品 ───
  it("POST /shop/products — 创建商品", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "国学书籍", price: 99 };
    const result: any = await ctrl.createProduct(req, dto);
    expect(result.name).toBe("国学书籍");
  });

  it("GET /shop/products — 商品列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.listProducts(q);
    expect(result).toHaveLength(1);
  });

  it("GET /shop/products — 游客传 ALL 仍强制公开在售口径", async () => {
    await ctrl.listProducts({ page: 1, pageSize: 20, status: "ALL" } as any);
    expect(mockShopSvc.listProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  it("GET /shop/products — 管理员保留 ALL 工作队列", async () => {
    const req: any = { user: { id: "admin", roles: ["OPERATION_ADMIN"] } };
    await ctrl.listProducts({ page: 1, pageSize: 20, status: "ALL" } as any, req);
    expect(mockShopSvc.listProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "ALL" }),
    );
  });

  it("GET /shop/products/:id — 商品详情", async () => {
    const result: any = await ctrl.getProduct("p1");
    expect(result.price).toBe(99);
  });

  it("PUT /shop/products/:id — 更新商品", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { name: "更新商品" };
    const result: any = await ctrl.updateProduct(req, "p1", dto);
    expect(result.name).toBe("更新商品");
  });

  it("DELETE /shop/products/:id — 删除商品", async () => {
    const result: any = await ctrl.deleteProduct({ user: { id: "u1", roles: [] } } as any, "p1");
    expect(result.success).toBe(true);
  });

  // ─── SKU ───
  it("POST /shop/products/:id/skus — 添加SKU", async () => {
    const dto: any = { name: "标准版", price: 99, stock: 100 };
    const result: any = await ctrl.addSku({ user: { id: "u1", roles: [] } } as any, "p1", dto);
    expect(result.name).toBe("标准版");
  });

  it("DELETE /shop/skus/:skuId — 删除SKU", async () => {
    const result: any = await ctrl.deleteSku({ user: { id: "u1", roles: [] } } as any, "sku1");
    expect(result.success).toBe(true);
  });

  // ─── 订单 ───
  it("POST /shop/orders — 创建订单", async () => {
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const dto: any = { items: [{ skuId: "sku1", quantity: 1 }] };
    const result: any = await ctrl.createOrder(req, dto);
    expect(result.amount).toBe(99);
  });

  it("GET /shop/orders — 订单列表（管理员）", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.listOrders(q);
    expect(result).toHaveLength(1);
  });

  it("GET /shop/orders/my — 我的订单", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.myOrders(req, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("GET /shop/orders/:id — 订单详情", async () => {
    const result: any = await ctrl.getOrder({ user: { id: "u1", roles: [] } } as any, "o1");
    expect(result.status).toBe("PAID");
  });

  it("POST /shop/orders/:id/pay/jsapi — JSAPI支付", async () => {
    const req: any = { user: { id: "u1" } };
    const body: any = { openid: "openid123" };
    const result: any = await ctrl.jsapiPay(req, "o1", body);
    expect(result.prepayId).toBe("prepay123");
  });

  it("POST /shop/recharge/jsapi — 公众号充值参数完整透传", async () => {
    const req: any = { user: { id: "u1" } };
    const body: any = { amountCoin: 1000, openid: "oa-openid", channel: "OFFICIAL" };
    const result: any = await ctrl.rechargeJsapi(req, body);
    expect(result.orderNo).toBe("RC12345678");
    expect(mockShopSvc.createCoinRechargeJsapi).toHaveBeenCalledWith("u1", 1000, "oa-openid", "OFFICIAL");
  });

  it("POST /shop/recharge/h5 — 透传登录用户与代理首段IP", async () => {
    const req: any = { user: { id: "u1" }, headers: { "x-forwarded-for": "8.8.8.8, 10.0.0.1" }, ip: "10.0.0.1" };
    const result: any = await ctrl.rechargeH5(req, { amountCoin: 1000 } as any);
    expect(result.mwebUrl).toContain("wx.tenpay.com");
    expect(mockShopSvc.createCoinRechargeH5).toHaveBeenCalledWith("u1", 1000, "8.8.8.8");
  });

  it("POST /shop/recharge/h5 — 无代理头回退连接IP", async () => {
    const req: any = { user: { id: "u1" }, headers: {}, ip: "127.0.0.1" };
    await ctrl.rechargeH5(req, { amountCoin: 1000 } as any);
    expect(mockShopSvc.createCoinRechargeH5).toHaveBeenCalledWith("u1", 1000, "127.0.0.1");
  });

  it("GET /shop/recharge/:orderNo/payment-status — 只按当前登录用户查询", async () => {
    const result: any = await ctrl.rechargePaymentStatus({ user: { id: "u1" } } as any, "RC12345678");
    expect(result.status).toBe("PENDING");
    expect(mockShopSvc.queryCoinRechargeStatus).toHaveBeenCalledWith("u1", "RC12345678");
  });

  it("POST /shop/orders/:id/pay/native — Native支付", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.nativePay(req, "o1");
    expect(result.codeUrl).toBeTruthy();
  });

  it("POST /shop/pay/h5 — H5支付（透传当前用户做归属校验 + 代理头取客户端IP）", async () => {
    const req: any = { user: { id: "u1" }, headers: { "x-forwarded-for": "8.8.8.8, 10.0.0.1" }, ip: "10.0.0.1" };
    const result: any = await ctrl.h5Pay(req, { orderId: "o1" } as any);
    expect(result.mwebUrl).toContain("wx.tenpay.com");
    // 归属校验依赖：必须把当前登录用户 id 传给 service；IP 取 x-forwarded-for 首段
    expect(mockShopSvc.createH5Payment).toHaveBeenCalledWith("o1", "u1", "8.8.8.8", undefined);
  });

  it("POST /shop/pay/h5 — 无代理头时回退连接 IP", async () => {
    const req: any = { user: { id: "u1" }, headers: {}, ip: "127.0.0.1" };
    await ctrl.h5Pay(req, { orderId: "o1" } as any);
    expect(mockShopSvc.createH5Payment).toHaveBeenCalledWith("o1", "u1", "127.0.0.1", undefined);
  });

  it("POST /shop/orders/estimate — 订单试算（结算页价格明细）", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.estimateOrder(req, { targetId: "p1", quantity: 1, couponId: "uc1" } as any);
    expect(result.payableAmount).toBe(55.2);
    expect(mockShopSvc.estimateOrder).toHaveBeenCalledWith("u1", expect.objectContaining({ targetId: "p1" }));
  });

  it("GET /shop/orders/:id/payment-status — 支付状态", async () => {
    const result: any = await ctrl.queryPaymentStatus({ user: { id: "u1", roles: [] } } as any, "o1");
    expect(result.status).toBe("PAID");
  });

  it("PUT /shop/orders/:id/ship — 发货", async () => {
    const result: any = await ctrl.shipOrder("o1");
    expect(result.status).toBe("SHIPPED");
  });

  it("PUT /shop/orders/:id/pay — 管理员确认支付（测试通道·必须落审计日志记录谁用了）", async () => {
    const result: any = await ctrl.adminPayOrder({ user: { id: "admin", roles: ["SUPER_ADMIN"], nickname: "管理员" }, ip: "127.0.0.1" } as any, "o1", { payTransactionId: "TXN-001" });
    expect(result.status).toBe("PAID");
    expect(mockSystemSvc.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      userId: "admin",
      action: "ADMIN_MARK_PAID",
      targetId: "o1",
    }));
  });

  it("PUT /shop/orders/:id/complete — 完成订单", async () => {
    const result: any = await ctrl.completeOrder("o1");
    expect(result.status).toBe("COMPLETED");
  });

  it("PUT /shop/orders/:id/refund — 退款", async () => {
    const req: any = { user: { id: "admin1" }, ip: "127.0.0.1" };
    const result: any = await ctrl.refundOrder("o1", req);
    expect(result.status).toBe("REFUNDING");
  });

  // ─── 支付回调 ───
  it("POST /shop/pay/notify — 微信支付回调（验签成功）", async () => {
    const req: any = {
      headers: { "wechatpay-signature": "sig", "wechatpay-timestamp": "123", "wechatpay-nonce": "abc", "wechatpay-serial": "s1" },
      body: JSON.stringify({ outTradeNo: "o1" }),
    };
    const result: any = await ctrl.handlePayNotify(req);
    expect(result.code).toBe("SUCCESS");
  });

  it("POST /shop/pay/notify — 微信支付回调（验签失败）", async () => {
    mockShopSvc.verifyAndDecryptNotify.mockResolvedValueOnce({ valid: false, data: null, error: "签名错误" });
    const req: any = { headers: {}, body: "{}" };
    const result: any = await ctrl.handlePayNotify(req);
    expect(result.code).toBe("FAIL");
  });

  it("POST /shop/pay/notify — 验签用 req.rawBody 原始字节，而非重构的 JSON（微信 V3 对原文验签）", async () => {
    // 原始报文带特定空白/字段序，JSON.stringify(解析后的对象) 无法还原 → 必须用 rawBody
    const rawStr = '{ "outTradeNo":"o1",  "amount":100 }';
    const req: any = {
      headers: { "wechatpay-signature": "sig", "wechatpay-timestamp": "123", "wechatpay-nonce": "abc", "wechatpay-serial": "s1" },
      rawBody: Buffer.from(rawStr, "utf8"),
      body: { outTradeNo: "o1", amount: 100 }, // 解析后的对象，序列化后 ≠ 原文
    };
    await ctrl.handlePayNotify(req);
    const passedBody = mockShopSvc.verifyAndDecryptNotify.mock.calls.at(-1)![1];
    expect(passedBody).toBe(rawStr);
    expect(passedBody).not.toBe(JSON.stringify(req.body));
  });

  it("POST /shop/refund/notify — 验签同样用 req.rawBody 原始字节", async () => {
    const rawStr = '{ "resource":"x" }';
    const req: any = {
      headers: { "wechatpay-signature": "sig", "wechatpay-timestamp": "123", "wechatpay-nonce": "abc", "wechatpay-serial": "s1" },
      rawBody: Buffer.from(rawStr, "utf8"),
      body: { resource: "x" },
    };
    await ctrl.handleRefundNotify(req);
    const passedBody = mockShopSvc.verifyAndDecryptNotify.mock.calls.at(-1)![1];
    expect(passedBody).toBe(rawStr);
  });

  it("POST /shop/alipay/notify — 支付宝回调", async () => {
    const req: any = { body: { outTradeNo: "o1" } };
    const result: any = await ctrl.handleAlipayNotify(req);
    expect(result).toBe("success");
  });

  it("POST /shop/alipay/notify — 支付宝回调（验签失败）", async () => {
    mockShopSvc.verifyAlipayNotify.mockResolvedValueOnce({ valid: false, data: null });
    const req: any = { body: {} };
    const result: any = await ctrl.handleAlipayNotify(req);
    expect(result).toBe("fail");
  });

  it("POST /shop/unionpay/notify — 银联回调", async () => {
    const req: any = { body: {} };
    const result: any = await ctrl.handleUnionpayNotify(req);
    expect(result).toBe("success");
  });

  it("POST /shop/refund/notify — 退款回调", async () => {
    const req: any = {
      headers: { "wechatpay-signature": "sig", "wechatpay-timestamp": "123", "wechatpay-nonce": "abc", "wechatpay-serial": "s1" },
      body: JSON.stringify({}),
    };
    const result: any = await ctrl.handleRefundNotify(req);
    expect(result.code).toBe("SUCCESS");
  });

  // ─── 支付管理 ───
  it("POST /shop/alipay/query — 支付宝查询", async () => {
    const result: any = await ctrl.alipayQuery("o1");
    expect(result.tradeStatus).toBe("TRADE_SUCCESS");
  });

  it("POST /shop/alipay/refund — 支付宝退款", async () => {
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const body = { outTradeNo: "o1", refundAmount: 99, outRefundNo: "rf1" };
    const result: any = await ctrl.alipayRefund(req, body);
    expect(result.refundStatus).toBe("SUCCESS");
    expect(mockSystemSvc.logAudit).toHaveBeenCalled();
  });

  it("POST /shop/unionpay/query — 银联查询", async () => {
    const result: any = await ctrl.unionpayQuery("o1");
    expect(result.origRespCode).toBe("00");
  });

  it("POST /shop/unionpay/refund — 银联退款", async () => {
    const req: any = { user: { id: "u1" }, ip: "127.0.0.1" };
    const body = { outTradeNo: "o1", outRefundNo: "rf1", amount: 99 };
    const result: any = await ctrl.unionpayRefund(req, body);
    expect(result.respCode).toBe("00");
    expect(mockSystemSvc.logAudit).toHaveBeenCalled();
  });

  it("PUT /shop/orders/:id/cancel — 取消订单", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.cancelOrder(req, "o1");
    expect(result.status).toBe("CANCELLED");
  });

  // ─── 优惠券 ───
  it("POST /shop/coupons — 创建优惠券", async () => {
    const dto: any = { type: "DISCOUNT", value: 10 };
    const result: any = await ctrl.createCoupon(dto);
    expect(result.type).toBe("DISCOUNT");
  });

  it("GET /shop/coupons — 优惠券列表", async () => {
    const result: any = await ctrl.listCoupons(1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("PUT /shop/coupons/:id — 更新优惠券", async () => {
    const dto: any = { type: "DISCOUNT", value: 20 };
    const result: any = await ctrl.updateCoupon("cp1", dto);
    expect(result.id).toBe("cp1");
  });

  it("DELETE /shop/coupons/:id — 删除优惠券", async () => {
    const result: any = await ctrl.deleteCoupon("cp1");
    expect(result.success).toBe(true);
  });

  it("POST /shop/coupons/:id/claim — 领取优惠券", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.claimCoupon(req, "cp1");
    expect(result.claimed).toBe(true);
  });

  it("POST /shop/coupons/:id/grant — 发放优惠券", async () => {
    const result: any = await ctrl.grantCoupon("cp1", "u1");
    expect(result.granted).toBe(true);
  });

  it("GET /shop/coupons/my — 我的优惠券", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.myCoupons(req);
    expect(result).toHaveLength(1);
  });

  // ─── 运费模板 ───
  it("POST /shop/freight-templates — 创建运费模板", async () => {
    const dto: any = { name: "全国包邮", default: true };
    const result: any = await ctrl.createFreightTemplate(dto);
    expect(result.name).toBe("全国包邮");
  });

  it("GET /shop/freight-templates — 运费模板列表", async () => {
    const result: any = await ctrl.listFreightTemplates(1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("GET /shop/freight-templates/:id — 运费模板详情", async () => {
    const result: any = await ctrl.getFreightTemplate("ft1");
    expect(result.name).toBe("全国包邮");
  });

  it("PUT /shop/freight-templates/:id — 更新运费模板", async () => {
    const dto: any = { name: "更新模板" };
    const result: any = await ctrl.updateFreightTemplate("ft1", dto);
    expect(result.name).toBe("更新模板");
  });

  it("DELETE /shop/freight-templates/:id — 删除运费模板", async () => {
    const result: any = await ctrl.deleteFreightTemplate("ft1");
    expect(result.success).toBe(true);
  });

  // ─── 商品评价 ───
  it("POST /shop/products/:id/reviews — 创建评价", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { rating: 5, content: "很好" };
    const result: any = await ctrl.createReview(req, "p1", dto);
    expect(result.rating).toBe(5);
  });

  it("GET /shop/products/:id/reviews — 评价列表", async () => {
    const result: any = await ctrl.listReviews("p1", 1 as any, 20 as any);
    expect(result).toHaveLength(1);
  });

  it("POST /shop/reviews/:id/reply — 回复评价", async () => {
    const dto: any = { reply: "感谢评价" };
    const result: any = await ctrl.replyReview("rv1", dto);
    expect(result.reply).toBe("感谢评价");
  });

  it("DELETE /shop/reviews/:id — 删除评价", async () => {
    const result: any = await ctrl.deleteReview("rv1");
    expect(result.success).toBe(true);
  });

  // ─── 物流 ───
  it("GET /shop/orders/:id/logistics — 物流信息（带当前用户做归属校验）", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getLogistics(req, "o1");
    expect(result.status).toBe("IN_TRANSIT");
    // 防越权：必须把当前登录用户 id 传给 service 做归属校验
    expect(mockShopSvc.getLogistics).toHaveBeenCalledWith("o1", "u1");
  });

  it("GET /shop/logistics/track — 快递查询", async () => {
    const result: any = await ctrl.trackLogistics("SF123456", "SF");
    expect(result.state).toBe("3");
  });

  it("PUT /shop/orders/:id/logistics — 更新物流", async () => {
    const dto: any = { trackingNo: "SF123", company: "顺丰" };
    const result: any = await ctrl.updateLogistics("o1", dto);
    expect(result.trackingNo).toBe("SF123");
  });
});
