import { Test } from "@nestjs/testing"
import { ShopRefundService } from "./shop-refund.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { CommissionService } from "../commission/commission.service"
import { AlipayService } from "./alipay.service"
import { WechatPayService } from "./wechat-pay.service"
import { UnionpayService } from "./unionpay.service"
import { HuifuService } from "../huifu/huifu.service"
import { PaymentProviderFactory } from "./payment-factory"
import { WebhookService } from "../webhook/webhook.service"
import { BusinessException } from "../../common/business.exception"
import {
  makeMockPrisma, makeMockRedis, makeMockCommission,
  makeMockAlipay, makeMockUnionpay, makeMockPaymentFactory, makeMockWebhook, makeMockHuifu, makeMockWechatPay,
} from "./shop-test-mocks"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockCommission = makeMockCommission()
const mockAlipay = makeMockAlipay()
const mockWechatPay = makeMockWechatPay()
const mockUnionpay = makeMockUnionpay()
const mockPaymentFactory = makeMockPaymentFactory()
const mockWebhook = makeMockWebhook()
const mockHuifu = makeMockHuifu()
const refundRequestedAt = new Date("2026-07-22T07:00:00.000Z")

describe("ShopRefundService", () => {
  let svc: ShopRefundService
  let registeredHuifuRefundHandler: (payload: Record<string, unknown>) => Promise<void>

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopRefundService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: CommissionService, useValue: mockCommission },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: WechatPayService, useValue: mockWechatPay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: HuifuService, useValue: mockHuifu },
        { provide: PaymentProviderFactory, useValue: mockPaymentFactory },
        { provide: WebhookService, useValue: mockWebhook },
      ],
    }).compile()
    svc = mod.get(ShopRefundService)
    registeredHuifuRefundHandler = mockHuifu.registerRefundNotifyHandler.mock.calls[0][0]
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPaymentFactory.isConfigured.mockReturnValue(true)
    mockPaymentFactory.refund.mockResolvedValue({ status: "SUCCESS" })
    mockPrisma.order.findFirst = mockPrisma.order.findFirst || jest.fn()
    mockPrisma.afterSale.findFirst.mockResolvedValue(null)
    mockPrisma.afterSale.findMany.mockResolvedValue([])
    mockPrisma.afterSale.create.mockResolvedValue({ id: "as-created", updatedAt: refundRequestedAt })
    mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 })
    mockHuifu.createRefund.mockResolvedValue({ outRefundNo: "RForder1", refundStatus: "PROCESSING", raw: {} })
    mockWechatPay.queryRefund.mockResolvedValue({ status: "PROCESSING" })
  })

  describe("refundExpiredGroupBuysCron (P1-3)", () => {
    it("经 redis.runExclusive 互斥执行拼团超时退款扫描", async () => {
      mockPrisma.groupBuyParticipant.findMany.mockResolvedValue([]);
      await svc.refundExpiredGroupBuysCron();
      expect(mockRedis.runExclusive).toHaveBeenCalledWith(
        "shop_refund_expired_groupbuys", 300, expect.any(Function),
      );
      expect(mockPrisma.groupBuyParticipant.findMany).toHaveBeenCalled();
    });
    it("渠道仅 PROCESSING 时不提前把拼团参与者标成已退款", async () => {
      mockPrisma.groupBuyParticipant.findMany.mockResolvedValue([{
        id: "gp-processing", orderId: "o-gp-processing",
        groupBuy: { expireMinutes: 60 },
      }])
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-gp-processing", userId: "u1", status: "PAID", amount: 88,
        payMethod: "WECHAT", payTransactionId: "wx-gp-processing",
        paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      })
      mockPaymentFactory.refund.mockResolvedValueOnce({ status: "PROCESSING" })

      const result = await svc.refundExpiredGroupBuys()

      expect(result).toEqual({ scanned: 1, refunded: 0 })
      expect(mockPrisma.groupBuyParticipant.update).not.toHaveBeenCalled()
    })

    it("订单已由异步回调收敛为 REFUNDED 时只补齐拼团参与者终态", async () => {
      mockPrisma.groupBuyParticipant.findMany.mockResolvedValue([{
        id: "gp-done", orderId: "o-gp-done",
        groupBuy: { expireMinutes: 60 },
      }])
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-gp-done", status: "REFUNDED",
        paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      })

      const result = await svc.refundExpiredGroupBuys()

      expect(result).toEqual({ scanned: 1, refunded: 1 })
      expect(mockPrisma.groupBuyParticipant.update).toHaveBeenCalledWith({
        where: { id: "gp-done" }, data: { status: "REFUNDED" },
      })
      expect(mockPaymentFactory.refund).not.toHaveBeenCalled()
    })
  })

  describe("refundOrder", () => {
    it("已支付订单按实付金额而非标价退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PAID", amount: "99", payAmount: "88", payMethod: "WECHAT", payTransactionId: "txn1" })
      mockPrisma.order.update.mockResolvedValue({ id: "o1", status: "REFUNDED" })
      const result = await svc.refundOrder("o1")
      expect(result.status).toBe("SUCCESS")
      expect(mockPaymentFactory.refund).toHaveBeenCalledWith("WECHAT", expect.objectContaining({ totalYuan: 88, totalFen: 8800 }))
      expect(mockPrisma.afterSale.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ orderId: "o1", status: "PROCESSING" }),
        select: { updatedAt: true },
      }))
    })

    it("订单缺失原支付渠道时失败关闭，绝不默认走微信", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-no-channel", userId: "u1", status: "PAID", amount: "99", payTransactionId: "txn1",
      })

      await expect(svc.refundOrder("o-no-channel")).rejects.toThrow("缺少原支付渠道")
      expect(mockPaymentFactory.isConfigured).not.toHaveBeenCalled()
      expect(mockPaymentFactory.refund).not.toHaveBeenCalled()
      expect(mockPrisma.afterSale.create).not.toHaveBeenCalled()
    })

    it("待付款订单不可退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PENDING" })
      await expect(svc.refundOrder("o1")).rejects.toThrow(BusinessException)
    })

    it("商家未发货订单退款：回补库存并写 REFUND_RETURN 流水", async () => {
      const order = { id: "o2", userId: "buyer", merchantId: "m1", type: "PRODUCT", targetId: "p1", skuId: null, quantity: 2, status: "PAID", amount: 99, payTransactionId: "txn2" }
      mockPrisma.order.findUnique.mockResolvedValue(order)
      mockPrisma.product.findUnique.mockResolvedValue({ stock: 10 })
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
      await (svc as any).applyRefundedBookkeeping("o2", 99, "退款")
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({ where: { id: "p1" }, data: { stock: { increment: 2 } } })
      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
        merchantId: "m1", type: "REFUND_RETURN", quantity: 2, beforeStock: 8, afterStock: 10,
        idempotencyKey: "order-refund:o2",
      }) })
    })

    it("平台自营未发货订单退款：同样回补库存但不伪造商家流水", async () => {
      const order = {
        id: "o-platform", userId: "buyer", merchantId: null, type: "PRODUCT",
        targetId: "p-platform", skuId: null, quantity: 3, status: "PAID", amount: 129,
      }
      mockPrisma.order.findUnique.mockResolvedValue(order)
      mockPrisma.product.findUnique.mockResolvedValue({ stock: 12 })
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })

      await (svc as any).applyRefundedBookkeeping("o-platform", 129, "未发货退款")

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: "p-platform" },
        data: { stock: { increment: 3 } },
      })
      expect(mockPrisma.inventoryMovement.create).not.toHaveBeenCalled()
    })

    it("已发货订单退款：只退钱不自动回补库存", async () => {
      const order = { id: "o3", userId: "buyer", merchantId: "m1", type: "PRODUCT", targetId: "p1", skuId: null, quantity: 1, status: "SHIPPED", amount: 99 }
      mockPrisma.order.findUnique.mockResolvedValue(order)
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
      await (svc as any).applyRefundedBookkeeping("o3", 99, "退款退货")
      expect(mockPrisma.product.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.inventoryMovement.create).not.toHaveBeenCalled()
    })

    it("支付通道未配置时失败关闭，不伪造已退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID", amount: "99", payMethod: "WECHAT", payTransactionId: "txn1" })
      mockPaymentFactory.isConfigured.mockReturnValueOnce(false)

      await expect(svc.refundOrder("o1")).rejects.toThrow("原支付渠道暂不可退款")
      expect(mockPaymentFactory.refund).not.toHaveBeenCalled()
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
    })

    it("渠道返回 PROCESSING 时保持订单原状态，等待成功回调", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PAID", amount: "99", payMethod: "WECHAT", payTransactionId: "txn1" })
      mockPaymentFactory.refund.mockResolvedValueOnce({ status: "PROCESSING" })

      const result = await svc.refundOrder("o1")

      expect(result.status).toBe("PROCESSING")
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.afterSale.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ orderId: "o1", type: "refund_only", status: "PROCESSING" }),
        select: { updatedAt: true },
      }))
    })

    it("渠道未受理时抛错并把预持久化售后退回可重试状态", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", status: "PAID", amount: "99", payMethod: "WECHAT", payTransactionId: "txn1" })
      mockPrisma.afterSale.findMany.mockResolvedValue([{ id: "as-failed", type: "refund_only" }])
      mockPaymentFactory.refund.mockResolvedValueOnce({ status: "FAILED" })

      await expect(svc.refundOrder("o1")).rejects.toThrow("退款通道未受理")
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith({
        where: { id: "as-failed", status: "PROCESSING" },
        data: { status: "PENDING", logistics: "退款通道未受理，请核对后重试" },
      })
    })

    it("网关超时结果不确定时保留 PROCESSING 锚点，绝不退回后换单重试", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-timeout", userId: "u1", status: "PAID", amount: 99,
        payMethod: "WECHAT", payTransactionId: "wx-timeout",
      })
      mockPaymentFactory.refund.mockRejectedValueOnce(new Error("gateway timeout"))

      const result = await svc.refundOrder("o-timeout")
      expect(result).toEqual({ status: "PROCESSING", pendingReason: "GATEWAY_RESULT_UNKNOWN" })

      expect(mockPrisma.afterSale.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ orderId: "o-timeout", status: "PROCESSING" }),
      }))
      expect(mockPrisma.afterSale.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalled()
    })

    it("渠道同步成功但本地 CAS 未收敛时返回 PROCESSING，保留补偿锚点", async () => {
      const order = {
        id: "o-local-pending", userId: "u1", status: "PAID", amount: 99,
        payMethod: "WECHAT", payTransactionId: "wx-local-pending",
      }
      mockPrisma.order.findUnique.mockResolvedValue(order)
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 })

      const result = await svc.refundOrder("o-local-pending")

      expect(result).toEqual({ status: "PROCESSING", pendingReason: "LOCAL_BOOKKEEPING_PENDING" })
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({
        data: { status: "COMPLETED" },
      }))
    })

    it("成功回调按 RF{orderId} 定位订单、校验金额并仅同步退款类售后", async () => {
      const order = { id: "o1", userId: "u1", status: "PAID", amount: "99", payAmount: "88", merchantId: null, payMethod: "WECHAT", payTransactionId: "wx-transaction-id" }
      mockPrisma.order.findUnique.mockResolvedValue(order)
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 })

      await svc.handleRefundNotify({
        out_refund_no: "RFo1",
        out_trade_no: "merchant-order-no",
        transaction_id: "wx-transaction-id",
        refund_id: "wx-refund-id",
        refund_status: "SUCCESS",
        amount: { refund: 8800, total: 8800 },
      })

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "o1" } }))
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "o1" }) }))
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          orderId: "o1",
          type: { in: ["refund", "return", "refund_only", "refund_with_return"] },
          status: "PROCESSING",
        }),
        data: { status: "COMPLETED" },
      }))
    })

    it("成功回调缺失金额时拒绝本地退款记账", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o-no-amount", status: "PAID", amount: "88", payAmount: "88", payMethod: "WECHAT", payTransactionId: "wx-no-amount" })
      await expect(svc.handleRefundNotify({
        out_refund_no: "RFo-no-amount",
        out_trade_no: "merchant-order-no",
        transaction_id: "wx-no-amount",
        refund_id: "wx-refund-no-amount",
        refund_status: "SUCCESS",
      })).rejects.toThrow("金额与订单实付金额不一致")
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
    })

    it("微信退款回调渠道流水不符必须拒绝，订单未收敛不得完成售后", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-wx-mismatch", status: "PAID", amount: 88, payAmount: 88,
        payMethod: "WECHAT", payTransactionId: "wx-right",
      })
      await expect(svc.handleRefundNotify({
        out_refund_no: "RFo-wx-mismatch",
        transaction_id: "wx-wrong",
        refund_id: "wx-refund-mismatch",
        refund_status: "SUCCESS",
        amount: { refund: 8800, total: 8800 },
      })).rejects.toThrow("交易标识与订单不一致")
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalled()
    })

    it("渠道已确认但本地订单不可退款时保留 PROCESSING，不伪造 COMPLETED", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-wx-cancelled", status: "CANCELLED", amount: 88, payAmount: 88,
        payMethod: "WECHAT", payTransactionId: "wx-cancelled",
      })
      await expect(svc.handleRefundNotify({
        out_refund_no: "RFo-wx-cancelled",
        transaction_id: "wx-cancelled",
        refund_id: "wx-refund-cancelled",
        refund_status: "SUCCESS",
        amount: { refund: 8800, total: 8800 },
      })).rejects.toThrow("本地订单状态尚未收敛")
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalled()
    })

    it("回调锁冲突时抛错让微信重试", async () => {
      mockRedis.setNX.mockResolvedValueOnce(false)
      await expect(svc.handleRefundNotify({
        out_refund_no: "RFo-lock",
        out_trade_no: "merchant-order-no",
        refund_status: "SUCCESS",
        amount: { refund: 8800 },
      })).rejects.toThrow("退款回调正在处理中")
      expect(mockRedis.del).not.toHaveBeenCalledWith("refund:cb:RFo-lock")
    })

    it("失败回调不改订单资金状态并把售后退回 PENDING", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID", amount: 88, payAmount: 88, payMethod: "WECHAT", payTransactionId: "wx-fail" })
      mockPrisma.afterSale.findMany.mockResolvedValue([{ id: "as1", type: "refund_only" }])
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 })

      await svc.handleRefundNotify({
        out_refund_no: "RFo1",
        out_trade_no: "merchant-order-no",
        transaction_id: "wx-fail",
        refund_status: "FAIL",
      })

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.afterSale.findMany).toHaveBeenCalledWith({
        where: {
          orderId: "o1",
          type: { in: ["refund", "return", "refund_only", "refund_with_return"] },
          status: "PROCESSING",
        },
        select: { id: true, type: true },
      })
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith({
        where: { id: "as1", status: "PROCESSING" },
        data: { status: "PENDING", logistics: "退款通道失败，请核对后重试" },
      })
    })

    it("退货退款失败回调保留验收入库结果并退回 APPROVED", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o2", status: "SHIPPED", amount: 88, payAmount: 88, payMethod: "WECHAT", payTransactionId: "wx-closed" })
      mockPrisma.afterSale.findMany.mockResolvedValue([{ id: "as2", type: "refund_with_return" }])
      mockPrisma.afterSale.updateMany.mockResolvedValue({ count: 1 })

      await svc.handleRefundNotify({
        out_refund_no: "RFo2",
        out_trade_no: "merchant-order-no",
        transaction_id: "wx-closed",
        refund_status: "CLOSED",
      })

      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith({
        where: { id: "as2", status: "PROCESSING" },
        data: { status: "APPROVED" },
      })
    })
  })
  describe("多渠道异步退款收敛", () => {
    it("汇付退款应按平台订单号路由，并持久化 PROCESSING 售后", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-hf", userId: "u1", status: "PAID", amount: 88, payAmount: 88,
        payMethod: "HUIFU", payTransactionId: "HF-OUT-1",
      });
      mockPaymentFactory.refund.mockResolvedValueOnce({ status: "PROCESSING" });
      const result = await svc.refundOrder("o-hf", "用户退款");
      expect(result.status).toBe("PROCESSING");
      expect(mockPaymentFactory.refund).toHaveBeenCalledWith("HUIFU", expect.objectContaining({
        orderId: "o-hf", outTradeNo: "o-hf", transactionId: "HF-OUT-1", totalYuan: 88,
      }));
      expect(mockPrisma.afterSale.create).toHaveBeenCalled();
    });

    it("微信退款回调丢失时，对账查询 SUCCESS 后完成退款", async () => {
      const order = { id: "o-wx", userId: "u1", status: "PAID", amount: 58, payAmount: 58, payMethod: "WECHAT", payTransactionId: "WX-T1", merchantId: null };
      mockPrisma.afterSale.findMany.mockResolvedValue([{ orderId: "o-wx", updatedAt: refundRequestedAt }]);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockWechatPay.queryRefund.mockResolvedValueOnce({ status: "SUCCESS" });
      await svc.reconcileProcessingRefundsCron();
      expect(mockWechatPay.queryRefund).toHaveBeenCalledWith("RFo-wx");
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) }));
    });

    it("微信退款对账返回 CLOSED 时只退回退款类售后，不改订单资金状态", async () => {
      const order = { id: "o-wx-closed", userId: "u1", status: "PAID", amount: 58, payAmount: 58, payMethod: "WECHAT", payTransactionId: "WX-T2" };
      mockPrisma.afterSale.findMany
        .mockResolvedValueOnce([{ orderId: "o-wx-closed", updatedAt: refundRequestedAt }])
        .mockResolvedValueOnce([{ id: "as-wx-closed", type: "refund_only" }]);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockWechatPay.queryRefund.mockResolvedValueOnce({ status: "CLOSED" });
      await svc.reconcileProcessingRefundsCron();
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith({
        where: { id: "as-wx-closed", status: "PROCESSING" },
        data: { status: "PENDING", logistics: "微信退款已关闭，请核对后重试" },
      });
    });

    it("支付宝对账查询确认成功后才落 REFUNDED 并完成售后", async () => {
      const order = { id: "o-ali", userId: "u1", status: "PAID", amount: 88, payAmount: 88, payMethod: "ALIPAY", payTransactionId: "ALI-T1", merchantId: null };
      mockPrisma.afterSale.findMany.mockResolvedValue([{ orderId: "o-ali", updatedAt: refundRequestedAt }]);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockAlipay.queryRefund.mockResolvedValueOnce({ status: "SUCCESS", raw: {} });
      await svc.reconcileProcessingRefundsCron();
      expect(mockAlipay.queryRefund).toHaveBeenCalledWith({ outTradeNo: "o-ali", tradeNo: "ALI-T1", outRefundNo: "RFo-ali" });
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "o-ali", status: "PAID" }, data: expect.objectContaining({ status: "REFUNDED" }),
      }));
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "COMPLETED" } }));
    });

    it("银联回调丢失或请求超时时，按同一持久时间重放稳定退款键", async () => {
      const order = {
        id: "o-un-retry", userId: "u1", status: "PAID", amount: 88, payAmount: 88,
        payMethod: "UNIONPAY", payTransactionId: "union-query-retry",
      };
      mockPrisma.afterSale.findMany.mockResolvedValue([{ orderId: "o-un-retry", updatedAt: refundRequestedAt }]);
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPaymentFactory.refund.mockResolvedValueOnce({ status: "PROCESSING" });

      await svc.reconcileProcessingRefundsCron();

      expect(mockPaymentFactory.refund).toHaveBeenCalledWith("UNIONPAY", expect.objectContaining({
        orderId: "o-un-retry",
        transactionId: "union-query-retry",
        outRefundNo: "RFo-un-retry",
        refundRequestedAt,
      }));
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("本地订单已是 REFUNDED 时，对账任务补齐佣金与总账后再完成售后", async () => {
      mockPrisma.afterSale.findMany.mockResolvedValue([{ orderId: "o-done", updatedAt: refundRequestedAt }]);
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o-done", status: "REFUNDED" });
      await svc.reconcileProcessingRefundsCron();
      expect(mockPaymentFactory.refund).not.toHaveBeenCalled();
      expect(mockCommission.reverseCommission).toHaveBeenCalledWith("o-done");
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ orderId: "o-done", status: "PROCESSING" }),
        data: { status: "COMPLETED" },
      });
    });

    it("退款已落订单但佣金冲正失败时保留 PROCESSING，等待下轮自动补偿", async () => {
      mockPrisma.afterSale.findMany.mockResolvedValue([{ orderId: "o-reverse-pending", updatedAt: refundRequestedAt }]);
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o-reverse-pending", status: "REFUNDED" });
      mockCommission.reverseCommission.mockRejectedValueOnce(new Error("commission unavailable"));

      await svc.reconcileProcessingRefundsCron();

      expect(mockCommission.reverseCommission).toHaveBeenCalledWith("o-reverse-pending");
      expect(mockPrisma.afterSale.updateMany).not.toHaveBeenCalled();
    });

    it("银联成功回调交易身份和金额一致才完成退款，失败回调退回可重试状态", async () => {
      const order = {
        id: "o-un", userId: "u1", status: "PAID", amount: 88, payAmount: 88, merchantId: null,
        payMethod: "UNIONPAY", payTransactionId: "union-query-1",
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      await svc.handleUnionpayRefundNotify({
        merchantOrderId: "o-un", outTradeNo: "RFoun", origQryId: "union-query-1", respCode: "00", amount: 8800,
      });
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) }));

      jest.clearAllMocks();
      mockPrisma.afterSale.findMany.mockResolvedValue([{ id: "as-un", type: "refund_only" }]);
      await svc.handleUnionpayRefundNotify({
        merchantOrderId: "o-un", outTradeNo: "RFoun", origQryId: "union-query-1", respCode: "34", amount: 8800,
      });
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.afterSale.updateMany).toHaveBeenCalledWith({
        where: { id: "as-un", status: "PROCESSING" },
        data: { status: "PENDING", logistics: "银联退款失败(34)" },
      });
    });

    it("银联回调交易标识不符或金额缺失必须拒绝本地记账", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o-un-bad", status: "PAID", amount: 88, payAmount: 88,
        payMethod: "UNIONPAY", payTransactionId: "union-query-bad",
      });
      await expect(svc.handleUnionpayRefundNotify({
        merchantOrderId: "o-un-bad", outTradeNo: "RFwrong", origQryId: "union-query-bad", respCode: "00", amount: 8800,
      })).rejects.toThrow("交易标识与订单不一致");
      await expect(svc.handleUnionpayRefundNotify({
        merchantOrderId: "o-un-bad", outTradeNo: "RFounbad", origQryId: "union-query-bad", respCode: "00",
      })).rejects.toThrow("金额与订单实付金额不一致");
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it("汇付验签退款回调应按原支付记录定位订单并完成资金状态", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({ orderId: "o-hf-cb", totalAmount: 66 });
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o-hf-cb", userId: "u1", status: "PAID", amount: 66, payAmount: 66, merchantId: null });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      await registeredHuifuRefundHandler({ req_seq_id: "RFohfcb", org_req_seq_id: "HF-ORIGINAL", trans_stat: "S", ord_amt: "66.00" });
      expect(mockPrisma.huifuSplitRecord.findUnique).toHaveBeenCalledWith({ where: { outTradeNo: "HF-ORIGINAL" } });
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) }));
    });

    it("汇付回调金额不符或缺失必须拒绝本地记账", async () => {
      mockPrisma.huifuSplitRecord.findUnique.mockResolvedValue({ orderId: "o-hf-bad", totalAmount: 66 });
      await expect(registeredHuifuRefundHandler({
        req_seq_id: "RFohfbad", org_req_seq_id: "HF-BAD", trans_stat: "S", ord_amt: "6.60",
      })).rejects.toThrow("金额与订单实付金额不一致");
      await expect(registeredHuifuRefundHandler({
        req_seq_id: "RFohfbad", org_req_seq_id: "HF-BAD", trans_stat: "S",
      })).rejects.toThrow("金额与订单实付金额不一致");
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("退款金额校验 (C7)", () => {
    beforeEach(() => { jest.clearAllMocks() })

    it("支付宝退款超过订单实付额时拒绝", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await expect(svc.alipayRefund({ outTradeNo: "GX1", refundAmount: 200, outRefundNo: "r1" })).rejects.toThrow(BusinessException)
      expect(mockAlipay.refund).not.toHaveBeenCalled()
    })

    it("支付宝整单全额退款时进入统一带锁补偿主链", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "PAID", payAmount: 100, amount: 100,
        payMethod: "ALIPAY", payTransactionId: "GX1",
      })
      await svc.alipayRefund({ outTradeNo: "GX1", refundAmount: 100, outRefundNo: "r1" })
      expect(mockPaymentFactory.refund).toHaveBeenCalledWith("ALIPAY", expect.objectContaining({
        orderId: "o1", transactionId: "GX1", outRefundNo: "RFo1", refundRequestedAt,
      }))
    })

    it("支付宝部分退款被拒绝，避免整单记账和分佣冲正", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 120, payTransactionId: "GX1" })
      await expect(svc.alipayRefund({ outTradeNo: "GX1", refundAmount: 50, outRefundNo: "r1" }))
        .rejects.toThrow("仅支持整单全额退款")
      expect(mockAlipay.refund).not.toHaveBeenCalled()
    })

    it("订单不存在时拒绝退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.alipayRefund({ outTradeNo: "NOPE", refundAmount: 50, outRefundNo: "r1" })).rejects.toThrow(BusinessException)
    })

    it("银联退款(分)超过实付额时拒绝", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await expect(svc.unionpayRefund({ outTradeNo: "GX1", outRefundNo: "r1", amount: 20000 })).rejects.toThrow(BusinessException)
      expect(mockUnionpay.refund).not.toHaveBeenCalled()
    })

    it("银联整单全额退款(分)时进入统一带锁补偿主链", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "PAID", payAmount: 100, amount: 100,
        payMethod: "UNIONPAY", payTransactionId: "GX1",
      })
      await svc.unionpayRefund({ outTradeNo: "GX1", outRefundNo: "r1", amount: 10000 })
      expect(mockPaymentFactory.refund).toHaveBeenCalledWith("UNIONPAY", expect.objectContaining({
        orderId: "o1", transactionId: "GX1", outRefundNo: "RFo1", refundRequestedAt,
      }))
    })
  })
})
