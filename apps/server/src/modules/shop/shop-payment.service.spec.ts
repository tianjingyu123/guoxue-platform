import { Test } from "@nestjs/testing"
import { ShopPaymentService } from "./shop-payment.service"
import { ShopOrderService } from "./shop-order.service"
import { ShopAttributionService } from "./shop-attribution.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { CommissionService } from "../commission/commission.service"
import { WechatPayService } from "./wechat-pay.service"
import { AlipayService } from "./alipay.service"
import { UnionpayService } from "./unionpay.service"
import { HuifuService } from "../huifu/huifu.service"
import { CoinService } from "../coin/coin.service"
import { WebhookService } from "../webhook/webhook.service"
import { MemberBenefitService } from "../member/member-benefit.service"
import { BusinessException } from "../../common/business.exception"
import {
  makeMockPrisma, makeMockRedis, makeMockUnifiedPricing, makeMockCommission,
  makeMockWechatPay, makeMockAlipay, makeMockUnionpay, makeMockCoin, makeMockWebhook, makeMockMemberBenefit, makeMockHuifu,
} from "./shop-test-mocks"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockUnifiedPricing = makeMockUnifiedPricing()
const mockCommission = makeMockCommission()
const mockWechatPay = makeMockWechatPay()
const mockAlipay = makeMockAlipay()
const mockUnionpay = makeMockUnionpay()
const mockCoin = makeMockCoin()
const mockWebhook = makeMockWebhook()
const mockMemberBenefit = makeMockMemberBenefit()
const mockHuifu = makeMockHuifu()

describe("ShopPaymentService", () => {
  let svc: ShopPaymentService
  let registeredHuifuHandler: (payload: Record<string, unknown>) => Promise<void>

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopPaymentService,
        ShopOrderService,
        ShopAttributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        { provide: CommissionService, useValue: mockCommission },
        { provide: WechatPayService, useValue: mockWechatPay },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: CoinService, useValue: mockCoin },
        { provide: WebhookService, useValue: mockWebhook },
        { provide: MemberBenefitService, useValue: mockMemberBenefit },
        { provide: HuifuService, useValue: mockHuifu },
      ],
    }).compile()
    svc = mod.get(ShopPaymentService)
    registeredHuifuHandler = mockHuifu.registerPaymentNotifyHandler.mock.calls[0][0]
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("汇付验签回调接入统一履约", () => {
    it("成功回调应翻转订单、清缓存、记佣金并保存渠道流水", async () => {
      const order = { id: "o-hf-1", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING", payTransactionId: "HF-OUT-1" };
      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      const attribution = jest.spyOn((svc as any).attribution, "recordOrderCommissionAndFee").mockResolvedValue(undefined);
      jest.spyOn((svc as any).orderSvc, "invalidateOrderCache").mockResolvedValue(undefined);
      jest.spyOn((svc as any).orderSvc, "settleGroupBuyIfNeeded").mockResolvedValue(undefined);

      await registeredHuifuHandler({
        req_seq_id: "HF-OUT-1", trans_stat: "S", trans_amt: "88.00", hf_seq_id: "HF-CHANNEL-1",
      });

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "o-hf-1", status: "PENDING" },
        data: expect.objectContaining({ status: "PAID", payMethod: "HUIFU", payTransactionId: "HF-CHANNEL-1" }),
      });
      expect(attribution).toHaveBeenCalledWith(order);
      expect(mockWebhook.fire).toHaveBeenCalledWith("ORDER_PAID", expect.objectContaining({ orderId: "o-hf-1", payMethod: "HUIFU" }));
      expect(mockPrisma.huifuSplitRecord.updateMany).toHaveBeenCalledWith({
        where: { outTradeNo: "HF-OUT-1" },
        data: expect.objectContaining({ huifuOrderId: "HF-CHANNEL-1" }),
      });
    });

    it("金额不符时不得入账", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "o-hf-2", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING", payTransactionId: "HF-OUT-2",
      });
      await expect(registeredHuifuHandler({ req_seq_id: "HF-OUT-2", trans_stat: "S", trans_amt: "8.80" }))
        .rejects.toThrow("汇付支付回调尚未完成本地入账");
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.huifuSplitRecord.updateMany).not.toHaveBeenCalled();
    });

    it("缺失金额时不得入账", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "o-hf-3", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING", payTransactionId: "HF-OUT-3",
      });
      await expect(registeredHuifuHandler({ req_seq_id: "HF-OUT-3", trans_stat: "S", hf_seq_id: "HF-CHANNEL-3" }))
        .rejects.toThrow("汇付支付回调尚未完成本地入账");
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("订单已按渠道流水落库后，重投回调仍可定位并幂等成功", async () => {
      const paidOrder = {
        id: "o-ali-done", userId: "u1", type: "PRODUCT", amount: "88", status: "PAID",
        payMethod: "ALIPAY", payTransactionId: "ALI-CHANNEL-1",
      };
      mockPrisma.order.findFirst.mockResolvedValue(paidOrder);

      const handled = await svc.handleAlipayNotify({
        outTradeNo: "ALI-MERCHANT-1",
        tradeNo: "ALI-CHANNEL-1",
        tradeStatus: "TRADE_SUCCESS",
        totalAmount: "88.00",
      });

      expect(handled).toBe(true);
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { payTransactionId: "ALI-MERCHANT-1" },
            { payMethod: "ALIPAY", payTransactionId: "ALI-CHANNEL-1" },
          ],
        },
      });
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("已取消订单即使商户单号匹配也不得向支付宝确认入账成功", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "o-ali-cancelled", userId: "u1", type: "PRODUCT", amount: "88", status: "CANCELLED",
        payMethod: null, payTransactionId: "ALI-MERCHANT-CANCELLED",
      });

      const handled = await svc.handleAlipayNotify({
        outTradeNo: "ALI-MERCHANT-CANCELLED",
        tradeNo: "ALI-CHANNEL-LATE",
        tradeStatus: "TRADE_SUCCESS",
        totalAmount: "88.00",
      });

      expect(handled).toBe(false);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("终态订单只接受同一支付渠道和同一渠道流水的幂等重投", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "o-ali-duplicate", userId: "u1", type: "PRODUCT", amount: "88", status: "PAID",
        payMethod: "ALIPAY", payTransactionId: "ALI-CHANNEL-ORIGINAL",
      });

      const handled = await svc.handleAlipayNotify({
        outTradeNo: "ALI-MERCHANT-DUPLICATE",
        tradeNo: "ALI-CHANNEL-SECOND",
        tradeStatus: "TRADE_SUCCESS",
        totalAmount: "88.00",
      });

      expect(handled).toBe(false);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
    it("支付宝 TRADE_FINISHED 终态同样必须完成本地入账", async () => {
      const order = {
        id: "o-ali-finished", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING",
        payTransactionId: "ALI-MERCHANT-FINISHED",
      };
      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      const handled = await svc.handleAlipayNotify({
        outTradeNo: "ALI-MERCHANT-FINISHED",
        tradeNo: "ALI-CHANNEL-FINISHED",
        tradeStatus: "TRADE_FINISHED",
        totalAmount: "88.00",
      });

      expect(handled).toBe(true);
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "o-ali-finished", status: "PENDING" },
        data: expect.objectContaining({ status: "PAID", payMethod: "ALIPAY", payTransactionId: "ALI-CHANNEL-FINISHED" }),
      });
    });

    it("支付宝成功回调缺失金额时返回未处理并拒绝入账", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "o-ali-no-amount", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING",
      });
      const handled = await svc.handleAlipayNotify({
        outTradeNo: "ALI-MERCHANT-2",
        tradeNo: "ALI-CHANNEL-2",
        tradeStatus: "TRADE_SUCCESS",
      });
      expect(handled).toBe(false);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("汇付成功回调缺失渠道流水时不得入账", async () => {
      await expect(registeredHuifuHandler({
        req_seq_id: "HF-OUT-NO-CHANNEL", trans_stat: "S", trans_amt: "88.00",
      })).rejects.toThrow("汇付支付回调尚未完成本地入账");
      expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
    });

    it("微信成功回调缺失渠道流水或金额时均返回未处理", async () => {
      const noTransaction = await svc.handlePaymentNotify({
        out_trade_no: "WX-MERCHANT-1",
        trade_state: "SUCCESS",
        attach: "o-wx-pay",
        amount: { total: 8800 },
      });
      expect(noTransaction).toBe(false);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();

      jest.clearAllMocks();
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-wx-pay", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING",
      });
      const noAmount = await svc.handlePaymentNotify({
        out_trade_no: "WX-MERCHANT-1",
        transaction_id: "WX-CHANNEL-1",
        trade_state: "SUCCESS",
        attach: "o-wx-pay",
      });
      expect(noAmount).toBe(false);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("微信成功回调仅在商户单号和金额均匹配时完成统一入账", async () => {
      const order = {
        id: "o-wx-ok", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING",
        payTransactionId: "WX-MERCHANT-OK",
      }
      mockPrisma.order.findUnique.mockResolvedValue(order)
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
      jest.spyOn((svc as any).orderSvc, "invalidateOrderCache").mockResolvedValue(undefined)
      jest.spyOn((svc as any).orderSvc, "settleGroupBuyIfNeeded").mockResolvedValue(undefined)
      const attribution = jest.spyOn((svc as any).attribution, "recordOrderCommissionAndFee").mockResolvedValue(undefined)

      const handled = await svc.handlePaymentNotify({
        out_trade_no: "WX-MERCHANT-OK",
        transaction_id: "WX-CHANNEL-OK",
        trade_state: "SUCCESS",
        attach: "o-wx-ok",
        amount: { total: 8800 },
      })

      expect(handled).toBe(true)
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "o-wx-ok", status: "PENDING" },
        data: expect.objectContaining({ status: "PAID", payMethod: "WECHAT", payTransactionId: "WX-CHANNEL-OK" }),
      })
      expect(attribution).toHaveBeenCalledWith(expect.objectContaining({ id: "o-wx-ok" }))
      expect(mockWebhook.fire).toHaveBeenCalledWith("ORDER_PAID", expect.objectContaining({
        orderId: "o-wx-ok",
        outTradeNo: "WX-MERCHANT-OK",
        payMethod: "WECHAT",
        tradeNo: "WX-CHANNEL-OK",
      }))
    })

    it("微信成功回调的商户单号不属于当前支付意图时拒绝入账", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-wx-stale", userId: "u1", type: "PRODUCT", amount: "88", status: "PENDING",
        payTransactionId: "WX-MERCHANT-CURRENT",
      })

      const handled = await svc.handlePaymentNotify({
        out_trade_no: "WX-MERCHANT-STALE",
        transaction_id: "WX-CHANNEL-STALE",
        trade_state: "SUCCESS",
        attach: "o-wx-stale",
        amount: { total: 8800 },
      })

      expect(handled).toBe(false)
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
    })

    it("终态订单只接受同一微信渠道流水的幂等重投，第二笔流水必须进入对账", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-wx-paid", userId: "u1", type: "PRODUCT", amount: "88", status: "PAID",
        payMethod: "WECHAT", payTransactionId: "WX-CHANNEL-ORIGINAL",
      })

      const replay = await svc.handlePaymentNotify({
        out_trade_no: "WX-MERCHANT-ORIGINAL",
        transaction_id: "WX-CHANNEL-ORIGINAL",
        trade_state: "SUCCESS",
        attach: "o-wx-paid",
        amount: { total: 8800 },
      })
      const duplicate = await svc.handlePaymentNotify({
        out_trade_no: "WX-MERCHANT-DUPLICATE",
        transaction_id: "WX-CHANNEL-DUPLICATE",
        trade_state: "SUCCESS",
        attach: "o-wx-paid",
        amount: { total: 8800 },
      })

      expect(replay).toBe(true)
      expect(duplicate).toBe(false)
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
      expect(mockWebhook.fire).toHaveBeenCalledTimes(1)
      expect(mockWebhook.fire).toHaveBeenCalledWith("ORDER_PAID", expect.objectContaining({
        orderId: "o-wx-paid",
        payMethod: "WECHAT",
        tradeNo: "WX-CHANNEL-ORIGINAL",
      }))
    })

    it("微信充值非成功态不得触发到账", async () => {
      const handled = await svc.handlePaymentNotify({
        out_trade_no: "RC-NOTPAY",
        transaction_id: "WX-CHANNEL-RC",
        trade_state: "NOTPAY",
        attach: JSON.stringify({ type: "COIN_RECHARGE", userId: "u1", amountCoin: 100 }),
      });
      expect(handled).toBe(true);
      expect(mockCoin.handleRechargeCallback).not.toHaveBeenCalled();
    });

    it("国学币充值尚未完成本地入账时必须让微信重投", async () => {
      mockCoin.handleRechargeCallback.mockResolvedValueOnce(false);

      const handled = await svc.handlePaymentNotify({
        out_trade_no: "RC12345676",
        transaction_id: "WX-CHANNEL-RC-PENDING",
        trade_state: "SUCCESS",
        attach: JSON.stringify({
          type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000, amountFen: 10000,
        }),
        amount: { total: 10000 },
      });

      expect(handled).toBe(false);
      expect(mockCoin.handleRechargeCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("createJsapiPayment", () => {
    const mockOrder = { id: "o1", userId: "u1", type: "PRODUCT", amount: "99", status: "PENDING", payTransactionId: null }

    beforeEach(() => {
      mockRedis.getJson.mockReset().mockResolvedValue(null)
      mockRedis.setJson.mockReset().mockResolvedValue(undefined)
      mockRedis.setNX.mockReset().mockResolvedValue(true)
      mockRedis.del.mockReset().mockResolvedValue(undefined)
      mockPrisma.order.updateMany.mockReset().mockResolvedValue({ count: 1 })
      mockPrisma.auth.findFirst.mockReset().mockResolvedValue({ openId: "mini-openid" })
      mockWechatPay.createJsapiOrder.mockReset().mockResolvedValue({
        prepayId: "prepay-1", paySign: { appId: "wx-mini", timeStamp: "1", nonceStr: "n", package: "prepay_id=prepay-1", signType: "RSA", paySign: "signed" },
      })
      mockWechatPay.closeOrder.mockReset().mockResolvedValue({})
      mockWechatPay.queryOrder.mockReset().mockResolvedValue({ trade_state: "NOTPAY" })
      mockWechatPay.isConfigured = true
    })

    it("首次小程序下单使用确定性商户号并以 CAS 保存支付意图", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)

      const result = await svc.createJsapiPayment("u1", undefined, "o1")

      expect(result.paySign).toBe("signed")
      expect(mockWechatPay.createJsapiOrder).toHaveBeenCalledWith(expect.objectContaining({
        outTradeNo: "GXo1",
        payer: { openid: "mini-openid" },
        attach: "o1",
      }))
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "o1", status: "PENDING", payTransactionId: null },
        data: { payTransactionId: "GXo1" },
      })
      expect(mockRedis.setNX).toHaveBeenCalledWith("pay:init:wechat:o1", "1", 60)
    })

    it("同入口重进复用当前支付参数，不重复向微信下单", async () => {
      const currentOrder = { ...mockOrder, payTransactionId: "GXo1" }
      mockPrisma.order.findUnique.mockResolvedValue(currentOrder)
      mockRedis.getJson
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          outTradeNo: "GXo1",
          paySign: { appId: "wx-mini", timeStamp: "1", nonceStr: "n", package: "prepay_id=prepay-1", signType: "RSA", paySign: "cached" },
        })

      const result = await svc.createJsapiPayment("u1", undefined, "o1")

      expect(result.paySign).toBe("cached")
      expect(mockWechatPay.closeOrder).not.toHaveBeenCalled()
      expect(mockWechatPay.createJsapiOrder).not.toHaveBeenCalled()
    })

    it("切换或缓存失效时先关停旧微信单，再创建新单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })

      await svc.createJsapiPayment("u1", "openid-explicit", "o1")

      expect(mockWechatPay.closeOrder).toHaveBeenCalledWith("GX-old")
      expect(mockWechatPay.createJsapiOrder).toHaveBeenCalledTimes(1)
    })

    it("跨入口初始化锁冲突时不得创建第二笔", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockRedis.setNX.mockResolvedValueOnce(false)

      await expect(svc.createJsapiPayment("u1", "openid-explicit", "o1")).rejects.toThrow("支付正在初始化")
      expect(mockWechatPay.createJsapiOrder).not.toHaveBeenCalled()
    })

    it("本地 CAS 失败时立即关闭刚创建的微信单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 0 })

      await expect(svc.createJsapiPayment("u1", "openid-explicit", "o1")).rejects.toThrow("订单状态已变更")
      expect(mockWechatPay.closeOrder).toHaveBeenCalledWith("GXo1")
    })
  })

  describe("createNativePayment", () => {
    const mockOrder = { id: "o1", userId: "u1", type: "PRODUCT", amount: "99", status: "PENDING" }

    beforeEach(() => {
      mockRedis.getJson.mockReset().mockResolvedValue(null)
      mockRedis.setJson.mockReset().mockResolvedValue(undefined)
      mockRedis.setNX.mockReset().mockResolvedValue(true)
      mockRedis.del.mockReset().mockResolvedValue(undefined)
      mockPrisma.order.updateMany.mockReset().mockResolvedValue({ count: 1 })
      mockWechatPay.createNativeOrder.mockReset().mockResolvedValue({ codeUrl: "weixin://wxpay/mock" })
      mockWechatPay.closeOrder.mockReset().mockResolvedValue({})
      mockWechatPay.queryOrder.mockReset().mockResolvedValue({ trade_state: "NOTPAY" })
    })

    it("创建扫码支付成功", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder })
      const result = await svc.createNativePayment("o1", "u1")
      expect(result.codeUrl).toBeDefined()
      expect(mockRedis.del).toHaveBeenCalledWith("shop:order:o1")
    })

    it("重复进入时复用已缓存付款码，不向微信再建一笔", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })
      mockRedis.getJson
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          outTradeNo: "GX-old",
          result: { codeUrl: "weixin://wxpay/existing", raw: { reused: true } },
        })

      const result = await svc.createNativePayment("o1", "u1")

      expect(result.codeUrl).toBe("weixin://wxpay/existing")
      expect(mockWechatPay.createNativeOrder).not.toHaveBeenCalled()
      expect(mockRedis.setNX).toHaveBeenCalledWith("pay:init:wechat:o1", "1", 60)
    })

    it("付款码缓存失效时先关闭旧微信订单，再生成新码", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder })

      const result = await svc.createNativePayment("o1", "u1")

      expect(mockWechatPay.closeOrder).toHaveBeenCalledWith("GX-old")
      expect(mockWechatPay.createNativeOrder).toHaveBeenCalledTimes(1)
      expect(result.codeUrl).toBe("weixin://wxpay/mock")
    })

    it("付款码生成锁冲突时拒绝创建第二笔", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockRedis.setNX.mockResolvedValueOnce(false)

      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow("付款码正在生成")
      expect(mockWechatPay.createNativeOrder).not.toHaveBeenCalled()
    })

    it("旧微信订单无法安全关单时不创建第二笔", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })
      mockWechatPay.closeOrder.mockRejectedValueOnce(new Error("ORDERPAID"))
      mockWechatPay.queryOrder.mockResolvedValueOnce({ trade_state: "USERPAYING" })

      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow("原付款正在处理中")
      expect(mockWechatPay.createNativeOrder).not.toHaveBeenCalled()
    })

    it("旧单关单失败但查单已支付时主动补入账并阻止再下单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })
      mockWechatPay.closeOrder.mockRejectedValueOnce(new Error("ORDERPAID"))
      mockWechatPay.queryOrder.mockResolvedValueOnce({
        trade_state: "SUCCESS", transaction_id: "WX-CHANNEL-1", amount: { total: 9900 },
      })
      const notifySpy = jest.spyOn(svc, "handlePaymentNotify").mockResolvedValueOnce(true)

      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow("订单已支付")
      expect(notifySpy).toHaveBeenCalledWith(expect.objectContaining({
        out_trade_no: "GX-old", transaction_id: "WX-CHANNEL-1", attach: "o1",
      }))
      expect(mockWechatPay.createNativeOrder).not.toHaveBeenCalled()
      notifySpy.mockRestore()
    })

    it("已支付订单不可重复支付", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: "PAID" })
      await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow(BusinessException)
    })

    it("订单不存在", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.createNativePayment("no", "u1")).rejects.toThrow(BusinessException)
    })

    it("无商户证书时返回结构化错误（优雅 400 非 500）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockWechatPay.isConfigured = false
      try {
        await expect(svc.createNativePayment("o1", "u1")).rejects.toThrow("微信支付未配置")
        await expect(svc.createNativePayment("o1", "u1")).rejects.toMatchObject({ status: 400 })
      } finally {
        mockWechatPay.isConfigured = true
      }
    })
  })

  describe("createH5Payment", () => {
    const mockOrder = { id: "o1", userId: "u1", type: "PRODUCT", amount: "99", status: "PENDING", payTransactionId: null }

    beforeEach(() => {
      mockRedis.getJson.mockReset().mockResolvedValue(null)
      mockRedis.setJson.mockReset().mockResolvedValue(undefined)
      mockRedis.setNX.mockReset().mockResolvedValue(true)
      mockRedis.del.mockReset().mockResolvedValue(undefined)
      mockPrisma.order.updateMany.mockReset().mockResolvedValue({ count: 1 })
      mockWechatPay.createH5Order.mockReset().mockResolvedValue({ h5Url: "https://wx.tenpay.com/h5/pay/mock" })
      mockWechatPay.closeOrder.mockReset().mockResolvedValue({})
      mockWechatPay.queryOrder.mockReset().mockResolvedValue({ trade_state: "NOTPAY" })
      mockWechatPay.isConfigured = true
    })

    it("创建 H5 支付成功（返回 mwebUrl）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder })
      const result = await svc.createH5Payment("o1", "u1", "1.2.3.4")
      expect(result.mwebUrl).toBe("https://wx.tenpay.com/h5/pay/mock")
      // 微信 V3 场景信息按客户端 IP 传入
      expect(mockWechatPay.createH5Order).toHaveBeenCalledWith(expect.objectContaining({
        sceneInfo: expect.objectContaining({ payerClientIp: "1.2.3.4" }),
      }))
    })

    it("重复进入复用当前 H5 收银台地址，不生成第二笔", async () => {
      const currentOrder = { ...mockOrder, payTransactionId: "GX-old" }
      mockPrisma.order.findUnique.mockResolvedValue(currentOrder)
      mockRedis.getJson
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ outTradeNo: "GX-old", mwebUrl: "https://wx.tenpay.com/h5/pay/existing" })

      const result = await svc.createH5Payment("o1", "u1", "1.2.3.4")

      expect(result.mwebUrl).toContain("/existing")
      expect(mockWechatPay.closeOrder).not.toHaveBeenCalled()
      expect(mockWechatPay.createH5Order).not.toHaveBeenCalled()
    })

    it("旧 H5 或其他微信入口支付单存在时必须先关单再创建", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, payTransactionId: "GX-old" })

      await svc.createH5Payment("o1", "u1", "1.2.3.4")

      expect(mockWechatPay.closeOrder).toHaveBeenCalledWith("GX-old")
      expect(mockWechatPay.createH5Order).toHaveBeenCalledTimes(1)
      expect(mockRedis.setNX).toHaveBeenCalledWith("pay:init:wechat:o1", "1", 60)
    })

    it("归属校验：别人的订单 403", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: "someone-else" })
      await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 403 })
    })

    it("状态校验：已支付订单 400", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: "PAID" })
      await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 400 })
    })

    it("订单不存在 404", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.createH5Payment("no", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 404 })
    })

    it("无商户证书时返回结构化 400（非 500 裸奔）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
      mockWechatPay.isConfigured = false
      try {
        await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toThrow("微信支付未配置")
        await expect(svc.createH5Payment("o1", "u1", "1.2.3.4")).rejects.toMatchObject({ status: 400 })
      } finally {
        mockWechatPay.isConfigured = true
      }
    })
  })

  describe("国学币充值支付", () => {
    beforeEach(() => {
      mockWechatPay.isConfigured = true
      mockCoin.getCoinRate.mockReset().mockResolvedValue(10)
      mockCoin.getRechargeTiers.mockReset().mockResolvedValue([])
      mockWechatPay.createH5Order.mockReset().mockResolvedValue({ h5Url: "https://wx.tenpay.com/h5/pay/mock" })
      mockWechatPay.createJsapiOrder.mockReset().mockResolvedValue({ paySign: { appId: "wx-mini", paySign: "signed" } })
      mockRedis.set.mockReset().mockResolvedValue(undefined)
      mockRedis.get.mockReset().mockResolvedValue(null)
      mockPrisma.virtualCoinRecharge.findUnique.mockReset().mockResolvedValue(null)
      mockPrisma.auth.findFirst.mockReset().mockResolvedValue({ openId: "mini-openid" })
    })

    it("H5 下单按服务端动态汇率计价，并把应付分快照写入签名回调附加数据", async () => {
      mockCoin.getCoinRate.mockResolvedValueOnce(20)
      const result = await svc.createCoinRechargeH5("u1", 1000, "1.2.3.4")

      expect(result.mwebUrl).toContain("wx.tenpay.com")
      expect(result.amountRmb).toBe(50)
      expect(result.orderNo).toMatch(/^RC/)
      const createArg = mockWechatPay.createH5Order.mock.calls[0][0]
      expect(createArg.amount.total).toBe(5000)
      expect(createArg.sceneInfo.payerClientIp).toBe("1.2.3.4")
      expect(JSON.parse(createArg.attach)).toEqual(expect.objectContaining({
        type: "COIN_RECHARGE", userId: "u1", amountCoin: 1000, amountFen: 5000,
      }))
      expect(mockRedis.set).toHaveBeenCalledWith(`recharge:intent:${result.orderNo}`, "u1", 7200)
    })

    it("精确充值档位以后台档位价格为收款真源，自定义币数才走汇率", async () => {
      mockCoin.getRechargeTiers.mockResolvedValueOnce([{ amountCoin: 1000, amountRmb: 88, bonus: 50 }])
      const result = await svc.createCoinRechargeH5("u1", 1000, "1.2.3.4")
      expect(result.amountRmb).toBe(88)
      expect(mockWechatPay.createH5Order).toHaveBeenCalledWith(expect.objectContaining({
        amount: { total: 8800 },
      }))
      expect(JSON.parse(mockWechatPay.createH5Order.mock.calls[0][0].attach)).toMatchObject({ bonusCoin: 50 })
      expect(mockCoin.getCoinRate).not.toHaveBeenCalled()
    })

    it("公众号 JSAPI 使用公众号 appid 与显式授权 openid，不读取小程序 openid", async () => {
      const old = process.env.WECHAT_OFFICIAL_APPID
      process.env.WECHAT_OFFICIAL_APPID = "wx-official"
      try {
        const result = await svc.createCoinRechargeJsapi("u1", 1000, "oa-openid", "OFFICIAL")
        expect(result.payParams.paySign).toBe("signed")
        expect(mockPrisma.auth.findFirst).not.toHaveBeenCalled()
        expect(mockWechatPay.createJsapiOrder).toHaveBeenCalledWith(expect.objectContaining({
          payer: { openid: "oa-openid" },
          appId: "wx-official",
        }))
      } finally {
        if (old === undefined) delete process.env.WECHAT_OFFICIAL_APPID
        else process.env.WECHAT_OFFICIAL_APPID = old
      }
    })

    it("小程序未显式传 openid 时只从本人微信授权记录读取", async () => {
      await svc.createCoinRechargeJsapi("u1", 1000)
      expect(mockPrisma.auth.findFirst).toHaveBeenCalledWith({
        where: { userId: "u1", provider: "WECHAT" },
        select: { openId: true },
      })
      expect(mockWechatPay.createJsapiOrder).toHaveBeenCalledWith(expect.objectContaining({ payer: { openid: "mini-openid" } }))
    })

    it("充值状态只允许本人查询", async () => {
      mockPrisma.virtualCoinRecharge.findUnique.mockResolvedValueOnce({
        userId: "u1", orderNo: "RC12345678", status: "PAID", amountCoin: 1050, amountRmb: "100", paidAt: new Date(),
      })
      const own = await svc.queryCoinRechargeStatus("u1", "RC12345678")
      expect(own.status).toBe("PAID")
      expect(own.amountRmb).toBe(100)

      mockPrisma.virtualCoinRecharge.findUnique.mockResolvedValueOnce({
        userId: "other", orderNo: "RC12345678", status: "PAID", amountCoin: 1000, amountRmb: "100", paidAt: new Date(),
      })
      await expect(svc.queryCoinRechargeStatus("u1", "RC12345678")).rejects.toThrow("充值订单不存在")
    })

    it("回调未到时由本人支付意图返回 PENDING，其他用户不可探测", async () => {
      mockRedis.get.mockResolvedValue("u1")
      await expect(svc.queryCoinRechargeStatus("u1", "RC12345678")).resolves.toMatchObject({ status: "PENDING" })
      await expect(svc.queryCoinRechargeStatus("u2", "RC12345678")).rejects.toThrow("充值订单不存在")
    })

    it("Redis 暂时不可用时状态查询按 PENDING 降级，不把已调起支付误报失败", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("redis down"))
      await expect(svc.queryCoinRechargeStatus("u1", "RC12345678")).resolves.toMatchObject({ status: "PENDING" })
    })

    it("服务端强制单次上限且未配置支付时返回结构化错误", async () => {
      await expect(svc.createCoinRechargeH5("u1", 500001, "1.2.3.4")).rejects.toThrow("超过上限")
      mockWechatPay.isConfigured = false
      await expect(svc.createCoinRechargeH5("u1", 1000, "1.2.3.4")).rejects.toMatchObject({ status: 400 })
    })
  })

  // ═══════════════════ 加盟费支付后处理（分站年租 / 运营商开通）═══════════════════

  /** 极简 fake tx：只提供两个处理器实际用到的表 */
  const makeTx = (over: any = {}) => ({
    configSystem: { findUnique: jest.fn().mockResolvedValue({ configValue: "12" }) },
    // SILVER 为唯一对外档位：¥4999 / 6 名额（1 自用 + 5 个邀请名额）
    commissionConfig: { findUnique: jest.fn().mockResolvedValue({ rateA: 4999, rateB: 6 }) },
    station: { findUnique: jest.fn(), update: jest.fn() },
    operator: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
    ...over,
  })

  /** 月差（四舍五入到整月），用于断言到期日叠加了正确的周期 */
  const monthsBetween = (from: Date, to: Date) =>
    Math.round(((to.getTime() - from.getTime()) / 86400000) / 30.44)

  describe("processStationMasterPaid（分站年租）", () => {
    it("首次缴费：PENDING → ACTIVE，到期日 = 当下 + 12 个月", async () => {
      const tx = makeTx()
      tx.station.findUnique.mockResolvedValue({ id: "st1", expireAt: null, status: "PENDING" })
      await (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "st1" }, tx)

      const data = tx.station.update.mock.calls[0][0].data
      expect(data.status).toBe("ACTIVE")
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("续期不吞剩余天数：未到期时从原到期日起算叠加", async () => {
      const tx = makeTx()
      // 还剩 6 个月到期 → 续费后应为 6 + 12 = 18 个月后
      const remaining = new Date()
      remaining.setMonth(remaining.getMonth() + 6)
      tx.station.findUnique.mockResolvedValue({ id: "st1", expireAt: remaining, status: "ACTIVE" })

      await (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "st1" }, tx)

      const data = tx.station.update.mock.calls[0][0].data
      expect(monthsBetween(new Date(), data.expireAt)).toBe(18)
    })

    it("支付回调遇到平台停用态只顺延有效期，不解除 DISABLED", async () => {
      const tx = makeTx()
      tx.station.findUnique.mockResolvedValue({ id: "st1", expireAt: null, status: "DISABLED" })

      await (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "st1" }, tx)

      const data = tx.station.update.mock.calls[0][0].data
      expect(data.status).toBe("DISABLED")
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("分站不存在：记录错误但不抛（不阻断已成功的支付记账）", async () => {
      const tx = makeTx()
      tx.station.findUnique.mockResolvedValue(null)
      await expect(
        (svc as any).processStationMasterPaid({ id: "o1", userId: "u1", targetId: "gone" }, tx),
      ).resolves.toBeUndefined()
      expect(tx.station.update).not.toHaveBeenCalled()
    })
  })

  describe("processOperatorPaid（运营商开通）", () => {
    it("首次开通：按档位建号，名额取 rateB，mgmtRate 留空以走 channelType 默认", async () => {
      const tx = makeTx()
      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "SILVER" }, tx)

      const data = tx.operator.create.mock.calls[0][0].data
      expect(data.level).toBe("SILVER")
      expect(data.containQuota).toBe(6) // 1 自用 + 5 可售
      expect(data.channelType).toBe("ONLINE")
      expect(data.status).toBe("ACTIVE")
      // 关键：不得写入 mgmtRate（seed 里的 rateC 是已废止的旧分级费率，读它会与现行口径打架）
      expect(data.mgmtRate).toBeUndefined()
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("等级只升不降：已是 DIAMOND 再买 SILVER，仍保持 DIAMOND 且名额取大者", async () => {
      const tx = makeTx()
      tx.operator.findUnique.mockResolvedValue({
        id: "op1", level: "DIAMOND", containQuota: 100, expireAt: null, status: "ACTIVE",
      })
      // 买的是 SILVER（rateA=4999 / rateB=10）
      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "SILVER" }, tx)

      const data = tx.operator.update.mock.calls[0][0].data
      expect(data.level).toBe("DIAMOND")
      expect(data.containQuota).toBe(100)
    })

    it("升档：已是 SILVER 再买 DIAMOND，升为 DIAMOND 并提升名额", async () => {
      const tx = makeTx({
        commissionConfig: { findUnique: jest.fn().mockResolvedValue({ rateA: 19999, rateB: 100 }) },
      })
      tx.operator.findUnique.mockResolvedValue({
        id: "op1", level: "SILVER", containQuota: 6, expireAt: null, status: "ACTIVE",
      })
      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "DIAMOND" }, tx)

      const data = tx.operator.update.mock.calls[0][0].data
      expect(data.level).toBe("DIAMOND")
      expect(data.containQuota).toBe(100)
    })

    it("支付回调遇到平台停用态只顺延有效期，不解除 DISABLED", async () => {
      const tx = makeTx()
      tx.operator.findUnique.mockResolvedValue({
        id: "op1", level: "SILVER", containQuota: 6, expireAt: null, status: "DISABLED",
      })

      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "SILVER" }, tx)

      const data = tx.operator.update.mock.calls[0][0].data
      expect(data.status).toBe("DISABLED")
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("正常到期态续费后恢复 ACTIVE", async () => {
      const tx = makeTx()
      tx.operator.findUnique.mockResolvedValue({
        id: "op1", level: "SILVER", containQuota: 6, expireAt: new Date(Date.now() - 86400000), status: "EXPIRED",
      })

      await (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "SILVER" }, tx)

      const data = tx.operator.update.mock.calls[0][0].data
      expect(data.status).toBe("ACTIVE")
      expect(monthsBetween(new Date(), data.expireAt)).toBe(12)
    })

    it("非法档位：不建号，记录错误后返回", async () => {
      const tx = makeTx()
      await expect(
        (svc as any).processOperatorPaid({ id: "o1", userId: "u1", targetId: "PLATINUM" }, tx),
      ).resolves.toBeUndefined()
      expect(tx.operator.create).not.toHaveBeenCalled()
      expect(tx.operator.update).not.toHaveBeenCalled()
    })
  })
})
