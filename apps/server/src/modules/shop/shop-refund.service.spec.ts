import { Test } from "@nestjs/testing"
import { ShopRefundService } from "./shop-refund.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { CommissionService } from "../commission/commission.service"
import { AlipayService } from "./alipay.service"
import { UnionpayService } from "./unionpay.service"
import { PaymentProviderFactory } from "./payment-factory"
import { WebhookService } from "../webhook/webhook.service"
import { BusinessException } from "../../common/business.exception"
import {
  makeMockPrisma, makeMockRedis, makeMockCommission,
  makeMockAlipay, makeMockUnionpay, makeMockPaymentFactory, makeMockWebhook,
} from "./shop-test-mocks"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockCommission = makeMockCommission()
const mockAlipay = makeMockAlipay()
const mockUnionpay = makeMockUnionpay()
const mockPaymentFactory = makeMockPaymentFactory()
const mockWebhook = makeMockWebhook()

describe("ShopRefundService", () => {
  let svc: ShopRefundService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopRefundService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: CommissionService, useValue: mockCommission },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: PaymentProviderFactory, useValue: mockPaymentFactory },
        { provide: WebhookService, useValue: mockWebhook },
      ],
    }).compile()
    svc = mod.get(ShopRefundService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
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
  })

  describe("refundOrder", () => {
    it("已支付订单可退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID", amount: "99", payTransactionId: "txn1" })
      mockPrisma.order.update.mockResolvedValue({ id: "o1", status: "REFUNDED" })
      const result = await svc.refundOrder("o1")
      expect(result.status).toBe("SUCCESS")
    })

    it("待付款订单不可退款", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PENDING" })
      await expect(svc.refundOrder("o1")).rejects.toThrow(BusinessException)
    })
  })

  describe("退款金额校验 (C7)", () => {
    beforeEach(() => { jest.clearAllMocks() })

    it("支付宝退款超过订单实付额时拒绝", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await expect(svc.alipayRefund({ outTradeNo: "GX1", refundAmount: 200, outRefundNo: "r1" })).rejects.toThrow(BusinessException)
      expect(mockAlipay.refund).not.toHaveBeenCalled()
    })

    it("支付宝退款金额合法时放行", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await svc.alipayRefund({ outTradeNo: "GX1", refundAmount: 50, outRefundNo: "r1" })
      expect(mockAlipay.refund).toHaveBeenCalled()
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

    it("银联退款(分)合法时放行", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", payAmount: 100, amount: 100, payTransactionId: "GX1" })
      await svc.unionpayRefund({ outTradeNo: "GX1", outRefundNo: "r1", amount: 5000 })
      expect(mockUnionpay.refund).toHaveBeenCalled()
    })
  })
})
