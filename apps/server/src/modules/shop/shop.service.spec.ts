import { Test } from "@nestjs/testing"
import { ShopService } from "./shop.service"
import { ShopAttributionService } from "./shop-attribution.service"
import { ShopProductService } from "./shop-product.service"
import { ShopOrderService } from "./shop-order.service"
import { ShopOrderLifecycleService } from "./shop-order-lifecycle.service"
import { ShopPaymentService } from "./shop-payment.service"
import { ShopRefundService } from "./shop-refund.service"
import { PrismaService } from "../../prisma/prisma.service"
import { CommissionService } from "../commission/commission.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { PaymentProviderFactory } from "./payment-factory"
import { WechatPayService } from "./wechat-pay.service"
import { AlipayService } from "./alipay.service"
import { UnionpayService } from "./unionpay.service"
import { HuifuService } from "../huifu/huifu.service"
import { CoinService } from "../coin/coin.service"
import { WebhookService } from "../webhook/webhook.service"
import { RedisService } from "../../redis/redis.service"
import { AuditService } from "../audit/audit.service"
import { MemberBenefitService } from "../member/member-benefit.service"
import { BusinessException } from "../../common/business.exception"
import { EntitlementService } from "../entitlement/entitlement.service"
import {
  makeMockPrisma, makeMockRedis, makeMockCommission, makeMockUnifiedPricing,
  makeMockWechatPay, makeMockAlipay, makeMockUnionpay, makeMockCoin, makeMockWebhook,
  makeMockPaymentFactory, makeMockMemberBenefit, makeMockAudit, makeMockHuifu, makeMockEntitlement,
} from "./shop-test-mocks"

// ShopService 拆分后为 facade + 目录/履约辅助（评价/物流/运费/购物车）。
// 商品/订单/支付/退款/归因各域测试已随迁至对应 *.service.spec.ts；本文件聚焦 facade 自身承载的 residual 方法。
const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockCommission = makeMockCommission()
const mockUnifiedPricing = makeMockUnifiedPricing()
const mockWechatPay = makeMockWechatPay()
const mockAlipay = makeMockAlipay()
const mockUnionpay = makeMockUnionpay()
const mockCoin = makeMockCoin()
const mockWebhook = makeMockWebhook()
const mockPaymentFactory = makeMockPaymentFactory()
const mockMemberBenefit = makeMockMemberBenefit()
const mockAudit = makeMockAudit()
const mockHuifu = makeMockHuifu()
const mockEntitlement = makeMockEntitlement()

describe("ShopService（facade·目录/履约辅助）", () => {
  let svc: ShopService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopService,
        ShopAttributionService,
        ShopProductService,
        ShopOrderService,
        ShopOrderLifecycleService,
        ShopPaymentService,
        ShopRefundService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommissionService, useValue: mockCommission },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        { provide: WechatPayService, useValue: mockWechatPay },
        { provide: AlipayService, useValue: mockAlipay },
        { provide: UnionpayService, useValue: mockUnionpay },
        { provide: RedisService, useValue: mockRedis },
        { provide: PaymentProviderFactory, useValue: mockPaymentFactory },
        { provide: CoinService, useValue: mockCoin },
        { provide: WebhookService, useValue: mockWebhook },
        { provide: AuditService, useValue: mockAudit },
        { provide: MemberBenefitService, useValue: mockMemberBenefit },
        { provide: HuifuService, useValue: mockHuifu },
        { provide: EntitlementService, useValue: mockEntitlement },
      ],
    }).compile()
    svc = mod.get(ShopService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("银联 txnType=04 回调应路由退款主链并返回已处理", async () => {
    const refundSvc = (svc as any).refundSvc;
    const spy = jest.spyOn(refundSvc, "handleUnionpayRefundNotify").mockResolvedValue(undefined);
    await expect(svc.handleUnionpayNotify({ txnType: "04", merchantOrderId: "o1", respCode: "00" }))
      .resolves.toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  // ═══════════════════ 商品评价 ═══════════════════

  describe("createReview", () => {
    it("创建评价成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1" })
      mockPrisma.productReview.create.mockResolvedValue({ id: "r1", rating: 5 })
      const result = await svc.createReview("u1", "p1", { rating: 5, content: "很好" })
      expect(result.rating).toBe(5)
    })

    it("评分超出范围", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1" })
      await expect(svc.createReview("u1", "p1", { rating: 6, content: "x" })).rejects.toThrow(BusinessException)
    })

    it("商品不存在", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(svc.createReview("u1", "no", { rating: 4, content: "x" })).rejects.toThrow(BusinessException)
    })
  })

  describe("listReviews", () => {
    it("返回商品评价列表", async () => {
      mockPrisma.productReview.findMany.mockResolvedValue([{ id: "r1" }])
      mockPrisma.productReview.count.mockResolvedValue(1)
      const result = await svc.listReviews("p1")
      expect(result.total).toBe(1)
    })

    // 评分多维过滤下沉：列表 where 带 rating/images 过滤，stats 始终全量（tab 计数准确）
    describe("filter 评分多维过滤", () => {
      beforeEach(() => {
        mockPrisma.productReview.findMany.mockResolvedValue([]) // 空列表 → enrichReviews 提前返回，聚焦过滤逻辑
        mockPrisma.productReview.count.mockResolvedValue(0)
        mockPrisma.productReview.groupBy.mockResolvedValue([])
      })

      it("good=好评只过滤列表(rating>=4)，stats 不受筛选影响", async () => {
        await svc.listReviews("p1", 1, 20, undefined, "good")
        const listWhere = mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where
        expect(listWhere.rating).toEqual({ gte: 4 })
        // stats(groupBy) 的 where 不带 rating，保证「全部/好评/中评/差评」tab 计数为全量
        const statsWhere = mockPrisma.productReview.groupBy.mock.calls.at(-1)![0].where
        expect(statsWhere.rating).toBeUndefined()
      })

      it("medium=中评(rating==3) / bad=差评(rating<=2)", async () => {
        await svc.listReviews("p1", 1, 20, undefined, "medium")
        expect(mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where.rating).toBe(3)
        await svc.listReviews("p1", 1, 20, undefined, "bad")
        expect(mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where.rating).toEqual({ lte: 2 })
      })

      it("images=有图(images 非空)", async () => {
        await svc.listReviews("p1", 1, 20, undefined, "images")
        expect(mockPrisma.productReview.findMany.mock.calls.at(-1)![0].where.images).toEqual({ isEmpty: false })
      })

      it("stats 返回全量 withImages 计数(供有图 tab)", async () => {
        mockPrisma.productReview.count.mockResolvedValue(7)
        const result = await svc.listReviews("p1")
        expect(result.stats.withImages).toBe(7)
      })
    })
  })

  // ═══════════════════ 物流追踪 ═══════════════════

  describe("getLogistics", () => {
    it("返回物流信息（本人订单）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "SHIPPED", userId: "u1" })
      mockPrisma.orderLogistics.findUnique.mockResolvedValue({ orderId: "o1", logisticsNo: "SF123" })
      const result = await svc.getLogistics("o1", "u1")
      expect(result.logistics?.logisticsNo).toBe("SF123")
    })

    it("订单不存在", async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null)
      await expect(svc.getLogistics("no", "u1")).rejects.toThrow(BusinessException)
    })

    it("拒绝查看他人订单物流（防越权）", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "SHIPPED", userId: "u1" })
      await expect(svc.getLogistics("o1", "u2")).rejects.toThrow(BusinessException)
    })
  })

  describe("updateLogistics", () => {
    it("更新物流并自动发货", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PAID" })
      mockPrisma.orderLogistics.upsert.mockResolvedValue({ orderId: "o1", logisticsNo: "SF456" })
      mockPrisma.order.update.mockResolvedValue({ status: "SHIPPED" })
      const result = await svc.updateLogistics("o1", { logisticsNo: "SF456" })
      expect(result.logisticsNo).toBe("SF456")
    })

    it("待付款订单不可更新物流", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", status: "PENDING" })
      await expect(svc.updateLogistics("o1", { logisticsNo: "SF456" })).rejects.toThrow(BusinessException)
    })
  })
})
