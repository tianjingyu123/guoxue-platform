import { Test } from "@nestjs/testing"
import { ShopOrderService } from "./shop-order.service"
import { ShopAttributionService } from "./shop-attribution.service"
import { PrismaService } from "../../prisma/prisma.service"
import { RedisService } from "../../redis/redis.service"
import { UnifiedPricingService } from "../pricing/unified-pricing.service"
import { CommissionService } from "../commission/commission.service"
import { BusinessException } from "../../common/business.exception"
import { makeMockPrisma, makeMockRedis, makeMockUnifiedPricing, makeMockCommission } from "./shop-test-mocks"

const mockPrisma = makeMockPrisma()
const mockRedis = makeMockRedis()
const mockUnifiedPricing = makeMockUnifiedPricing()
const mockCommission = makeMockCommission()

describe("ShopOrderService", () => {
  let svc: ShopOrderService

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ShopOrderService,
        ShopAttributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: UnifiedPricingService, useValue: mockUnifiedPricing },
        { provide: CommissionService, useValue: mockCommission },
      ],
    }).compile()
    svc = mod.get(ShopOrderService)
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.order.findFirst.mockReset()
    mockPrisma.operator.findUnique.mockResolvedValue(null)
  })

  describe("createOrder", () => {
    it("非会员订单验证商品失败", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(
        svc.createOrder("u1", { type: "PRODUCT", targetId: "bad", amount: 99 }),
      ).rejects.toThrow(BusinessException)
    })

    it("创建订单成功", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o1", status: "PENDING" })
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 99 })
      expect(result.id).toBe("o1")
    })

    it("商家商品下单后按原子扣减结果写销售出库流水", async () => {
      mockPrisma.product.findUnique
        .mockResolvedValueOnce({ id: "p1", price: 99, status: "ON_SALE", supplierType: "CERTIFIED_MERCHANT", userId: "seller" })
        .mockResolvedValueOnce({ stock: 7 })
      mockPrisma.merchant.findUnique.mockResolvedValueOnce({ id: "m1" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-ledger", status: "PENDING" })

      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 3 })

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: "p1", stock: { gte: 3 } }, data: { stock: { decrement: 3 } },
      })
      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
        merchantId: "m1", productId: "p1", type: "SALE_OUT", quantity: -3,
        beforeStock: 10, afterStock: 7, idempotencyKey: "order-sale:o-ledger",
      }) })
    })

    it("使用优惠券创建订单", async () => {
      const now = new Date()
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o2" })
      mockPrisma.userCoupon.findFirst.mockResolvedValue({
        id: "c1",
        userId: "u1",
        used: false,
        coupon: {
          status: "ACTIVE",
          type: "FULL_REDUCE",
          value: 10,
          discountAmount: 10,
          discountRate: null,
          minAmount: 0,
          validStart: new Date(now.getTime() - 86400000),
          validEnd: new Date(now.getTime() + 86400000),
          scope: "ALL",
          scopeId: null,
        },
      })
      // C-1：核销改条件更新 updateMany(used:false) 防并发双花
      mockPrisma.userCoupon.updateMany.mockResolvedValue({ count: 1 })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 99, couponId: "c1" })
      expect(mockPrisma.userCoupon.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: "c1", used: false }) }),
      )
    })
  })

  // ═══════════════════ 白标贺卡（供-P2） ═══════════════════

  describe("白标贺卡 giftCardMeta（供-P2）", () => {
    /** 常规实物订单基础 mock（无秒杀·无优惠券） */
    function setupProductOrder() {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 99, originalPrice: 99,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-gift", status: "PENDING" })
    }

    it("归因单自动生成贺卡任务：fromName=归因者昵称·qrRef=其名片页链接（带归因 ref）", async () => {
      setupProductOrder()
      // resolveReferrerUserId 与 buildGiftCardMeta 共用 user.findUnique
      mockPrisma.user.findUnique.mockResolvedValue({ id: "ref1", nickname: "王老师" })
      mockPrisma.configSystem.findUnique.mockResolvedValue(null) // 无配置行=默认开

      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "ref1" })
      expect(result.id).toBe("o-gift")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("ref1")
      expect(data.giftCardMeta).toEqual({
        fromName: "王老师",
        blessing: expect.any(String),
        qrRef: expect.stringContaining("/pkg-creator/teacher-profile/index?userId=ref1&ref=ref1"),
      })
    })

    it("无归因不生成：giftCardMeta 为 undefined 且不触碰贺卡全局开关配置", async () => {
      setupProductOrder()
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(result.id).toBe("o-gift")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.giftCardMeta).toBeUndefined()
      // 佣-V2-P2 后 createOrder 固定会查一次归因灰度开关（commission_v2_attribution），只断言贺卡开关未查
      const giftCardCalls = mockPrisma.configSystem.findUnique.mock.calls
        .filter((c: any) => c[0]?.where?.configKey === "shop.gift_card.enabled")
      expect(giftCardCalls).toHaveLength(0)
    })

    it("全局开关关闭（shop.gift_card.enabled=false）：归因单也不生成贺卡", async () => {
      setupProductOrder()
      mockPrisma.user.findUnique.mockResolvedValue({ id: "ref1", nickname: "王老师" })
      mockPrisma.configSystem.findUnique.mockResolvedValue({ configValue: "false" })

      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "ref1" })
      expect(result.id).toBe("o-gift")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("ref1") // 归因照常保留，只是不附贺卡
      expect(data.giftCardMeta).toBeUndefined()
    })
  })

  // ═══════════════════ 渠道主体临时链接归因（佣-V2-P2） ═══════════════════

  describe("佣-V2-P2 渠道归因（灰度开关 commission_v2_attribution·last-click 7天窗）", () => {
    function setupChannelOrder() {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 100, originalPrice: 100,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 100, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-ch", status: "PENDING" })
    }
    /** 灰度开关 mock：commission_v2_attribution 按 on 返回，其余配置键（贺卡等）返回 null=默认 */
    function setAttributionFlag(on: boolean) {
      mockPrisma.configSystem.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where?.configKey === "commission_v2_attribution" ? { configValue: on ? "true" : "false" } : null),
      )
    }

    // mockImplementation/mockResolvedValue 会跨 clearAllMocks 存活，本组结束后还原默认（开关关·无点击）
    afterEach(() => {
      mockPrisma.configSystem.findUnique.mockReset()
      mockPrisma.channelClick.findFirst.mockReset()
      mockPrisma.channelClick.findFirst.mockResolvedValue(null)
    })

    it("开关关：不查 ChannelClick，完全走旧逻辑（回滚路径·tempRefSubjectType 不写）", async () => {
      setupChannelOrder()
      setAttributionFlag(false)
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(mockPrisma.channelClick.findFirst).not.toHaveBeenCalled()
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBeNull()
      expect(data.tempRefSubjectType).toBeNull()
    })

    it("开关开+精确命中：tempReferrerId=渠道受益人·tempRefSubjectType 落库·查询带过期过滤", async () => {
      setupChannelOrder()
      setAttributionFlag(true)
      mockPrisma.channelClick.findFirst.mockResolvedValueOnce({ beneficiaryUserId: "circle-owner", subjectType: "CIRCLE" })
      mockPrisma.user.findUnique.mockResolvedValue({ id: "circle-owner", nickname: "圈主" }) // 贺卡组装
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("circle-owner")
      expect(data.tempRefSubjectType).toBe("CIRCLE")
      // 7 天窗：查询侧只取未过期记录（expiresAt > now），过期点击天然不生效
      expect(mockPrisma.channelClick.findFirst.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ userId: "u1", targetId: "p1", expiresAt: { gt: expect.any(Date) } }),
      )
    })

    it("开关开+渠道命中优先于前端传入的临时推荐人（服务端受信任来源·last-click 抢佣）", async () => {
      setupChannelOrder()
      setAttributionFlag(true)
      mockPrisma.user.findUnique.mockResolvedValue({ id: "ref1", nickname: "分享者" }) // dto ref 可解析为真实用户
      mockPrisma.channelClick.findFirst.mockResolvedValueOnce({ beneficiaryUserId: "station-master", subjectType: "STATION" })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "ref1" })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("station-master")
      expect(data.tempRefSubjectType).toBe("STATION")
    })

    it("永久归属 B 与临时分站 E 并存落单，临时链接不改永久绑定但作为本单优先归因", async () => {
      setupChannelOrder()
      setAttributionFlag(true)
      mockPrisma.channelClick.findFirst.mockResolvedValueOnce({
        beneficiaryUserId: "station-e-user",
        subjectType: "STATION",
      })
      mockPrisma.referralRelation.findFirst.mockResolvedValueOnce({ referrerId: "station-b-user" })
      await svc.createOrder("buyer-c", { type: "PRODUCT", targetId: "p1", amount: 1 })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.referrerId).toBe("station-b-user")
      expect(data.tempReferrerId).toBe("station-e-user")
      expect(data.tempRefSubjectType).toBe("STATION")
    })

    it("开关开+无精确命中：SHOP_ALL 全店链接兜底", async () => {
      setupChannelOrder()
      setAttributionFlag(true)
      mockPrisma.channelClick.findFirst
        .mockResolvedValueOnce(null) // targetId 精确匹配未命中
        .mockResolvedValueOnce({ beneficiaryUserId: "offline-owner", subjectType: "OFFLINE_STATION" })
      mockPrisma.user.findUnique.mockResolvedValue({ id: "offline-owner", nickname: "驿站主" })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(mockPrisma.channelClick.findFirst).toHaveBeenCalledTimes(2)
      expect(mockPrisma.channelClick.findFirst.mock.calls[1][0].where).toEqual(
        expect.objectContaining({ targetType: "SHOP_ALL" }),
      )
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("offline-owner")
      expect(data.tempRefSubjectType).toBe("OFFLINE_STATION")
    })

    it("开关开+全部无命中：现行归因逻辑不变（dto 传入的临时推荐人照常生效）", async () => {
      setupChannelOrder()
      setAttributionFlag(true)
      mockPrisma.user.findUnique.mockResolvedValue({ id: "ref1", nickname: "分享者" })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "ref1" })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("ref1")
      expect(data.tempRefSubjectType).toBeNull()
    })

    it("开关开+命中但受益人=买家本人：忽略该点击（防御·点击侧已拦自点）", async () => {
      setupChannelOrder()
      setAttributionFlag(true)
      mockPrisma.channelClick.findFirst.mockResolvedValue({ beneficiaryUserId: "u1", subjectType: "CIRCLE" })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBeNull()
      expect(data.tempRefSubjectType).toBeNull()
    })
  })

  // ═══════════════════ 内容场景归因（佣-V2-P3） ═══════════════════

  describe("佣-V2-P3 内容场景归因（Order 来源字段·直播视同圈子渠道点击）", () => {
    function setupSourceOrder() {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 100, originalPrice: 100,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 100, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-src", status: "PENDING" })
      mockPrisma.liveProduct.findUnique.mockResolvedValue({ id: "lp1", liveRoom: { status: "LIVING" } })
    }
    /** 灰度开关 mock：commission_v2_attribution 按 on 返回，其余配置键（贺卡等）返回 null=默认 */
    function setAttributionFlag(on: boolean) {
      mockPrisma.configSystem.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where?.configKey === "commission_v2_attribution" ? { configValue: on ? "true" : "false" } : null),
      )
    }

    afterEach(() => {
      mockPrisma.configSystem.findUnique.mockReset()
      mockPrisma.channelClick.findFirst.mockReset()
      mockPrisma.channelClick.findFirst.mockResolvedValue(null)
      mockPrisma.liveRoom.findUnique.mockReset()
      mockPrisma.liveRoom.findUnique.mockResolvedValue(null)
      mockPrisma.liveProduct.findUnique.mockReset()
      mockPrisma.liveProduct.findUnique.mockResolvedValue(null)
      mockPrisma.circle.findFirst.mockReset()
      mockPrisma.circle.findFirst.mockResolvedValue(null)
    })

    it("带来源下单：sourceContentType/Id 纯记录落库（开关关也落·不影响归因）", async () => {
      setupSourceOrder()
      setAttributionFlag(false)
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "VIDEO", sourceContentId: "v1" })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.sourceContentType).toBe("VIDEO")
      expect(data.sourceContentId).toBe("v1")
      expect(data.tempReferrerId).toBeNull()
    })

    it("来源字段成对校验：只传 type 不传 id → 两者均不落库", async () => {
      setupSourceOrder()
      setAttributionFlag(false)
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "ARTICLE" })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.sourceContentType).toBeNull()
      expect(data.sourceContentId).toBeNull()
    })

    it("开关开+直播来源命中圈子：tempReferrerId=圈主·tempRefSubjectType=CIRCLE（直播视同渠道点击·优先于 ChannelClick）", async () => {
      setupSourceOrder()
      setAttributionFlag(true)
      // ChannelClick 命中站长，但直播更接近成交 → 圈主覆盖
      mockPrisma.channelClick.findFirst.mockResolvedValueOnce({ beneficiaryUserId: "station-master", subjectType: "STATION" })
      mockPrisma.liveRoom.findUnique.mockResolvedValueOnce({ circleId: "c1" })
      mockPrisma.circle.findFirst.mockResolvedValueOnce({ ownerId: "circle-owner" })
      mockPrisma.user.findUnique.mockResolvedValue({ id: "circle-owner", nickname: "圈主" }) // 贺卡组装
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "LIVE", sourceContentId: "live1" })
      // 圈子资格校验：仅 ACTIVE 未删圈生效
      expect(mockPrisma.circle.findFirst.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ id: "c1", status: "ACTIVE", deletedAt: null }),
      )
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBe("circle-owner")
      expect(data.tempRefSubjectType).toBe("CIRCLE")
      expect(data.sourceContentType).toBe("LIVE")
      expect(data.sourceContentId).toBe("live1")
      expect(mockPrisma.liveProduct.findUnique).toHaveBeenCalledWith({
        where: { liveId_productId: { liveId: "live1", productId: "p1" } },
        select: { id: true, liveRoom: { select: { status: true } } },
      })
    })

    it("伪造直播来源：商品未在该直播间挂车时剥离来源且不路由圈主分佣", async () => {
      setupSourceOrder()
      setAttributionFlag(true)
      mockPrisma.liveProduct.findUnique.mockResolvedValueOnce(null)
      mockPrisma.channelClick.findFirst.mockResolvedValueOnce(null)

      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "LIVE", sourceContentId: "forged-live" })

      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.sourceContentType).toBeNull()
      expect(data.sourceContentId).toBeNull()
      expect(data.tempReferrerId).toBeNull()
      expect(data.tempRefSubjectType).toBeNull()
      expect(mockPrisma.liveRoom.findUnique).not.toHaveBeenCalled()
    })

    it("未开播预约场不允许提前形成直播带货归因", async () => {
      setupSourceOrder()
      setAttributionFlag(true)
      mockPrisma.liveProduct.findUnique.mockResolvedValueOnce({ id: "lp1", liveRoom: { status: "WAITING" } })

      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "LIVE", sourceContentId: "waiting-live" })

      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.sourceContentType).toBeNull()
      expect(data.sourceContentId).toBeNull()
    })

    it("开关关：直播来源不做受益人路由（不查 LiveRoom），来源字段照常落库（回滚路径）", async () => {
      setupSourceOrder()
      setAttributionFlag(false)
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "LIVE", sourceContentId: "live1" })
      expect(mockPrisma.liveRoom.findUnique).not.toHaveBeenCalled()
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBeNull()
      expect(data.tempRefSubjectType).toBeNull()
      expect(data.sourceContentType).toBe("LIVE")
    })

    it("开关开+直播间无圈子：静默跳过（不报错·无临时归因·来源仍落库）", async () => {
      setupSourceOrder()
      setAttributionFlag(true)
      mockPrisma.liveRoom.findUnique.mockResolvedValueOnce({ circleId: null })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "LIVE", sourceContentId: "live1" })
      // 无 circleId → 不做圈子受益人查询（circle.findFirst 后续仅被自购资格检查以 ownerId 条件调用，非本查询）
      const circleIdQueries = mockPrisma.circle.findFirst.mock.calls.filter((c: any[]) => c[0]?.where?.id)
      expect(circleIdQueries).toHaveLength(0)
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBeNull()
      expect(data.tempRefSubjectType).toBeNull()
      expect(data.sourceContentType).toBe("LIVE")
    })

    it("开关开+圈主=买家本人：不写临时归因（防自佣）", async () => {
      setupSourceOrder()
      setAttributionFlag(true)
      mockPrisma.liveRoom.findUnique.mockResolvedValueOnce({ circleId: "c1" })
      mockPrisma.circle.findFirst.mockResolvedValueOnce({ ownerId: "u1" })
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, sourceContentType: "LIVE", sourceContentId: "live1" })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.tempReferrerId).toBeNull()
      expect(data.tempRefSubjectType).toBeNull()
    })
  })

  // ═══════════════════ 自购立减泛化（供-P3） ═══════════════════

  describe("自购立减泛化（供-P3·全分销角色）", () => {
    /** 常规实物订单基础 mock（无秒杀·无优惠券·直推佣金比例 25%） */
    function setupSelfPurchaseOrder() {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 100, originalPrice: 100,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 100, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-self", status: "PENDING" })
      mockCommission.getStationRate.mockResolvedValue(0.25)
    }

    // 五角色矩阵：任一角色成立即享自购立减（比例统一 rateA）
    it.each([
      ["站长", "station"],
      ["圈主", "circle"],
      ["驿站运营者", "stationOffline"],
      ["认证从业者", "teacherCertification"],
      ["运营商", "operator"],
    ])("%s 自购：按 rateA 立减且清空推荐关系（不产佣金·不生成贺卡）", async (_role, model) => {
      setupSelfPurchaseOrder()
      ;(mockPrisma as any)[model].findFirst.mockResolvedValueOnce({ id: "r1" })

      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(result.id).toBe("o-self")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.selfDiscount).toBe(25) // 100 × 0.25
      expect(data.amount).toBe(75) // 立减后实付
      expect(data.referrerId).toBeNull() // 防套利：推荐关系清空 → 佣金天然不产生
      expect(data.tempReferrerId).toBeNull()
      expect(data.giftCardMeta).toBeUndefined() // 自购单不生成白标贺卡
    })

    it("防套利：分销角色用自己的 ref 下单（ref=本人）→ 立减且归因清空，不产佣金", async () => {
      setupSelfPurchaseOrder()
      mockPrisma.circle.findFirst.mockResolvedValueOnce({ id: "c1" })

      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "u1" })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.selfDiscount).toBe(25)
      expect(data.amount).toBe(75)
      expect(data.referrerId).toBeNull()
      expect(data.tempReferrerId).toBeNull()
    })

    it("经他人分享购买：不立减·归因保留（佣金归推荐人·与自购互斥）", async () => {
      setupSelfPurchaseOrder()
      // 外部推荐人 → 自购立减分支整体跳过（即便买家自身是分销角色）
      mockPrisma.user.findUnique.mockResolvedValue({ id: "ref9", nickname: "王老师" })
      mockPrisma.configSystem.findUnique.mockResolvedValue(null)

      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, tempReferrerId: "ref9" })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.selfDiscount).toBeNull()
      expect(data.amount).toBe(100)
      expect(data.tempReferrerId).toBe("ref9")
    })

    it("普通用户（无任何分销角色）：不立减按原价", async () => {
      setupSelfPurchaseOrder()
      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.selfDiscount).toBeNull()
      expect(data.amount).toBe(100)
      expect(mockCommission.getStationRate).not.toHaveBeenCalled()
    })

    it("佣金比例未配置（rateA=null）：分销角色也不立减", async () => {
      setupSelfPurchaseOrder()
      mockPrisma.station.findFirst.mockResolvedValueOnce({ id: "s1" })
      mockCommission.getStationRate.mockResolvedValueOnce(null)

      await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.selfDiscount).toBeNull()
      expect(data.amount).toBe(100)
    })

    it("角色查询失败：按原价下单不阻塞交易", async () => {
      setupSelfPurchaseOrder()
      mockPrisma.station.findFirst.mockRejectedValueOnce(new Error("db down"))

      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(result.id).toBe("o-self")
      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.selfDiscount).toBeNull()
      expect(data.amount).toBe(100)
    })
  })

  // ═══════════════════ 秒杀资金链路（两道闸·下单侧） ═══════════════════

  describe("秒杀资金链路（下单）", () => {
    const flashPricing = {
      productId: "p1",
      effectivePrice: 9.9,
      originalPrice: 99,
      appliedPromotion: { type: "FLASH_SALE", id: "fs1", name: "秒杀", priority: 100, price: 9.9 },
      activePromotions: [],
      hasPromotion: true,
    }

    function setupFlashOrder(limitCount = 5) {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue(flashPricing)
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.flashSaleItem.findFirst.mockResolvedValue({ id: "fi1", limitCount })
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { quantity: 0 } })
      mockPrisma.$executeRaw.mockResolvedValue(1)
      mockPrisma.order.create.mockResolvedValue({ id: "o-flash", status: "PENDING" })
    }

    it("秒杀正常成交：秒杀条目量与商品库存双扣", async () => {
      setupFlashOrder()
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 2 })
      expect(result.id).toBe("o-flash")
      // 闸2: 秒杀条目量原子扣减（raw 条件 UPDATE）
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1)
      // 原有商品库存 CAS 扣减不受影响（两道闸并存）
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1", stock: { gte: 2 } },
          data: { stock: { decrement: 2 } },
        }),
      )
      // 订单落库带活动标记与数量
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ promotionType: "FLASH_SALE", promotionId: "fs1", quantity: 2 }),
        }),
      )
    })

    it("秒杀条目量耗尽：拒绝下单且不创建订单", async () => {
      setupFlashOrder()
      mockPrisma.$executeRaw.mockResolvedValue(0) // sold + qty > stock，条件 UPDATE 影响 0 行
      await expect(
        svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 }),
      ).rejects.toThrow("秒杀商品已抢完")
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("超出每人限购：拒绝下单且不扣秒杀量", async () => {
      setupFlashOrder(2)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { quantity: 2 } }) // 已买满 2 件
      await expect(
        svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 }),
      ).rejects.toThrow("超出每人限购 2 件")
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled()
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("limitCount=0 不限购：不统计历史订单直接成交", async () => {
      setupFlashOrder(0)
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 3 })
      expect(result.id).toBe("o-flash")
      expect(mockPrisma.order.aggregate).not.toHaveBeenCalled()
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1)
    })

    it("非秒杀订单：完全不触碰 FlashSaleItem", async () => {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 99, originalPrice: 99,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 99, status: "ON_SALE" })
      mockPrisma.order.create.mockResolvedValue({ id: "o-normal", status: "PENDING" })
      const result = await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1 })
      expect(result.id).toBe("o-normal")
      expect(mockPrisma.flashSaleItem.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled()
      // 常规商品库存扣减照常执行
      expect(mockPrisma.product.updateMany).toHaveBeenCalled()
    })
  })

  describe("getUserOrders", () => {
    it("返回用户订单列表", async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o1" }])
      mockPrisma.order.count.mockResolvedValue(1)
      const result = await svc.getUserOrders("u1")
      expect(result.total).toBe(1)
    })

    it("传合法 status 时按状态过滤", async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: "o2" }])
      mockPrisma.order.count.mockResolvedValue(1)
      await svc.getUserOrders("u1", 1, 20, "PAID")
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", status: "PAID" } }),
      )
    })

    it("传非法 status 时忽略过滤(回退全部)", async () => {
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.count.mockResolvedValue(0)
      await svc.getUserOrders("u1", 1, 20, "NOT_A_STATUS")
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1" } }),
      )
    })
  })

  describe("付费拼团状态机", () => {
    it("createGroupBuyOrder 用拼团价下单并标记 GROUP_BUY/groupId/PENDING", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", status: "ON_SALE", supplierType: "PLATFORM", userId: null })
      mockPrisma.order.create.mockResolvedValue({ id: "gbo1", amount: 279.3, status: "PENDING" })
      const order = await svc.createGroupBuyOrder("u1", { groupBuyId: "gb1", productId: "p1", groupPrice: 279.3, groupId: "g1" })
      expect(order.id).toBe("gbo1")
      const data = mockPrisma.order.create.mock.calls.at(-1)[0].data
      expect(data.amount).toBe(279.3)
      expect(data.promotionType).toBe("GROUP_BUY")
      expect(data.promotionId).toBe("gb1")
      expect(data.groupId).toBe("g1")
      expect(data.status).toBe("PENDING")
    })

    it("createGroupBuyOrder 下架商品不可下单", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", status: "OFF_SALE" })
      await expect(svc.createGroupBuyOrder("u1", { groupBuyId: "gb1", productId: "p1", groupPrice: 279.3, groupId: "g1" }))
        .rejects.toThrow(BusinessException)
    })

    it("settleGroupBuyIfNeeded 跳过非拼团订单", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", promotionType: null })
      mockPrisma.groupBuyParticipant.create.mockClear()
      await svc.settleGroupBuyIfNeeded("o1")
      expect(mockPrisma.groupBuyParticipant.create).not.toHaveBeenCalled()
    })

    it("settleGroupBuyIfNeeded 幂等：订单已有参与者则跳过", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o3", promotionType: "GROUP_BUY", promotionId: "gb1", groupId: "g1" })
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue({ id: "existing" })
      mockPrisma.groupBuyParticipant.create.mockClear()
      await svc.settleGroupBuyIfNeeded("o3")
      expect(mockPrisma.groupBuyParticipant.create).not.toHaveBeenCalled()
    })

    it("settleGroupBuyIfNeeded 未满员仅创建参与者(团长/WAITING)不成团", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o1", userId: "u1", promotionType: "GROUP_BUY", promotionId: "gb1", groupId: "g1" })
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue(null)
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", minMembers: 2 })
      mockPrisma.groupBuyParticipant.count.mockReset()
      mockPrisma.groupBuyParticipant.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1) // 现有0(团长) → 已付1(<2)
      mockPrisma.groupBuyParticipant.create.mockResolvedValue({ id: "part1" })
      mockPrisma.groupBuyParticipant.updateMany.mockClear()
      await svc.settleGroupBuyIfNeeded("o1")
      const cdata = mockPrisma.groupBuyParticipant.create.mock.calls.at(-1)[0].data
      expect(cdata.isLeader).toBe(true)
      expect(cdata.status).toBe("WAITING")
      expect(mockPrisma.groupBuyParticipant.updateMany).not.toHaveBeenCalled()
    })

    it("settleGroupBuyIfNeeded 满员触发全组成团 SUCCESS", async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: "o2", userId: "u2", promotionType: "GROUP_BUY", promotionId: "gb1", groupId: "g1" })
      mockPrisma.groupBuyParticipant.findFirst.mockResolvedValue(null)
      mockPrisma.groupBuy.findUnique.mockResolvedValue({ id: "gb1", minMembers: 2 })
      mockPrisma.groupBuyParticipant.count.mockReset()
      mockPrisma.groupBuyParticipant.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2) // 现有1(非团长) → 已付2(≥2)
      mockPrisma.groupBuyParticipant.create.mockResolvedValue({ id: "part2" })
      mockPrisma.groupBuyParticipant.updateMany.mockClear().mockResolvedValue({ count: 2 })
      await svc.settleGroupBuyIfNeeded("o2")
      expect(mockPrisma.groupBuyParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: "g1", status: "WAITING" }, data: { status: "SUCCESS" } }),
      )
    })
  })

  // ═══════════════════ 订单试算（结算页价格明细·商城收敛 2026-07-11） ═══════════════════

  describe("estimateOrder（与 createOrder 定价同口径·只读不核销）", () => {
    const now = new Date()
    const fullReduce10 = {
      id: "c1", userId: "u1", used: false,
      coupon: {
        status: "ACTIVE", type: "FULL_REDUCE", value: 10, discountAmount: 10, discountRate: null,
        minAmount: 0, validStart: new Date(now.getTime() - 86400000), validEnd: new Date(now.getTime() + 86400000),
        scope: "ALL", scopeId: null,
      },
    }
    function setup79() {
      mockUnifiedPricing.calculateEffectivePrice.mockResolvedValue({
        productId: "p1", effectivePrice: 79, originalPrice: 79,
        appliedPromotion: null, activePromotions: [], hasPromotion: false,
      })
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 79, status: "ON_SALE" })
    }

    it("摸底同款复算：¥79 − 10券 − 分销自购立减20% = 55.20", async () => {
      setup79()
      mockPrisma.userCoupon.findFirst.mockResolvedValue(fullReduce10)
      // 分销身份：eligible=true + rateA=0.2
      const attribution = (svc as any).attribution
      const eligibleSpy = jest.spyOn(attribution, "isDistributorSelfPurchaseEligible").mockResolvedValue(true)
      mockCommission.getStationRate.mockResolvedValue(0.2)
      try {
        const est = await svc.estimateOrder("u1", { targetId: "p1", quantity: 1, couponId: "c1" })
        expect(est.goodsAmount).toBe(79)
        expect(est.couponDiscount).toBe(10)
        expect(est.selfDiscount).toBe(13.8) // (79-10)×20%
        expect(est.payableAmount).toBe(55.2)
        // 只读：绝不核销优惠券、不建单、不扣库存
        expect(mockPrisma.userCoupon.updateMany).not.toHaveBeenCalled()
        expect(mockPrisma.order.create).not.toHaveBeenCalled()
        expect(mockPrisma.product.updateMany).not.toHaveBeenCalled()
      } finally {
        eligibleSpy.mockRestore()
        mockCommission.getStationRate.mockResolvedValue(0.25)
      }
    })

    it("试算=实付：同参数 createOrder 落库金额与试算 payableAmount 一致", async () => {
      setup79()
      mockPrisma.userCoupon.findFirst.mockResolvedValue(fullReduce10)
      const attribution = (svc as any).attribution
      const eligibleSpy = jest.spyOn(attribution, "isDistributorSelfPurchaseEligible").mockResolvedValue(true)
      mockCommission.getStationRate.mockResolvedValue(0.2)
      mockPrisma.userCoupon.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.order.create.mockResolvedValue({ id: "o-est", status: "PENDING" })
      try {
        const est = await svc.estimateOrder("u1", { targetId: "p1", quantity: 1, couponId: "c1" })
        await svc.createOrder("u1", { type: "PRODUCT", targetId: "p1", amount: 1, couponId: "c1" })
        const orderData = mockPrisma.order.create.mock.calls[0][0].data
        expect(orderData.amount).toBe(est.payableAmount) // 展示价与实付必须一致
        expect(orderData.selfDiscount).toBe(est.selfDiscount)
      } finally {
        eligibleSpy.mockRestore()
        mockCommission.getStationRate.mockResolvedValue(0.25)
      }
    })

    it("非分销身份：selfDiscount=0，仅券后价", async () => {
      setup79()
      mockPrisma.userCoupon.findFirst.mockResolvedValue(fullReduce10)
      const est = await svc.estimateOrder("u1", { targetId: "p1", quantity: 1, couponId: "c1" })
      expect(est.selfDiscount).toBe(0)
      expect(est.payableAmount).toBe(69)
    })

    it("商品不可购买（下架/待审）：结构化 400", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "p1", price: 79, status: "PENDING" })
      await expect(svc.estimateOrder("u1", { targetId: "p1" })).rejects.toThrow("商品不可购买")
    })
  })

  // ═══════════════════ 加盟费下单（分站年租 / 运营商开通）═══════════════════

  describe("加盟费下单定价（服务端定价·真源 CommissionConfig.rateA）", () => {
    it("分站年租：价格取自配置，无视前端传入的 amount（防篡改）", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st1", userId: "u1" })
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 999 })
      mockPrisma.order.create.mockResolvedValue({ id: "o1" })

      // 前端谎报 1 元
      await svc.createOrder("u1", { type: "STATION_MASTER", targetId: "st1", amount: 1 })

      expect(mockPrisma.order.create.mock.calls[0][0].data.amount).toBe(999)
    })

    it("分站年租：已有待支付单时复用原单，不重复创建可扣款订单", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st1", userId: "u1", status: "PENDING" })
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 999 })
      mockPrisma.order.findFirst.mockResolvedValue({ id: "o-pending", amount: 999, status: "PENDING" })

      const result = await svc.createOrder("u1", { type: "STATION_MASTER", targetId: "st1", amount: 1 })

      expect(result.id).toBe("o-pending")
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "station-order:u1:st1",
      )
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
      expect(mockRedis.del).toHaveBeenCalledWith("station-order:create:u1:st1")
    })

    it("分站年租：订单创建锁冲突时拒绝并发建单", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st1", userId: "u1", status: "PENDING" })
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 999 })
      mockRedis.setNX.mockResolvedValueOnce(false)

      await expect(
        svc.createOrder("u1", { type: "STATION_MASTER", targetId: "st1", amount: 1 }),
      ).rejects.toThrow("支付订单正在创建")
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("分站年租：只能为自己的分站缴费（越权 403）", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st1", userId: "someone-else" })
      await expect(
        svc.createOrder("u1", { type: "STATION_MASTER", targetId: "st1", amount: 999 }),
      ).rejects.toThrow("只能为自己的分站缴纳年租")
    })

    it("分站年租：分站不存在 → 引导先申请开通", async () => {
      mockPrisma.station.findUnique.mockResolvedValue(null)
      await expect(
        svc.createOrder("u1", { type: "STATION_MASTER", targetId: "gone", amount: 999 }),
      ).rejects.toThrow("请先提交开通申请")
    })

    it("分站年租：平台停用态不可通过续费重新激活", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st1", userId: "u1", status: "DISABLED" })
      await expect(
        svc.createOrder("u1", { type: "STATION_MASTER", targetId: "st1", amount: 999 }),
      ).rejects.toThrow("分站已被平台停用")
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("分站年租：未配置价格 → 结构化报错，绝不按 0 元放行", async () => {
      mockPrisma.station.findUnique.mockResolvedValue({ id: "st1", userId: "u1" })
      mockPrisma.commissionConfig.findUnique.mockResolvedValue(null)
      await expect(
        svc.createOrder("u1", { type: "STATION_MASTER", targetId: "st1", amount: 999 }),
      ).rejects.toThrow("未配置价格")
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("运营商开通：价格按档位取配置", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 4999, rateB: 10 })
      mockPrisma.order.create.mockResolvedValue({ id: "o2" })

      await svc.createOrder("u1", { type: "OPERATOR", targetId: "SILVER", amount: 1 })

      expect(mockPrisma.commissionConfig.findUnique).toHaveBeenCalledWith({
        where: { configKey: "operator_SILVER" },
      })
      expect(mockPrisma.order.create.mock.calls[0][0].data.amount).toBe(4999)
    })

    it("运营商开通：已有待支付单时复用原单，避免资格重复续期", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 4999, rateB: 6 })
      mockPrisma.order.findFirst.mockResolvedValue({ id: "op-pending", amount: 4999, status: "PENDING" })

      const result = await svc.createOrder("u1", { type: "OPERATOR", targetId: "SILVER", amount: 1 })

      expect(result.id).toBe("op-pending")
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        "operator-order:u1:SILVER",
      )
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
      expect(mockRedis.del).toHaveBeenCalledWith("operator-order:create:u1:SILVER")
    })

    it("运营商续费：正常到期态允许创建续费订单", async () => {
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op1", status: "EXPIRED" })
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 4999, rateB: 6 })
      mockPrisma.order.create.mockResolvedValue({ id: "op-renew" })

      const result = await svc.createOrder("u1", { type: "OPERATOR", targetId: "SILVER", amount: 4999 })

      expect(result.id).toBe("op-renew")
    })

    it("运营商续费：平台停用态不可通过付款重新激活", async () => {
      mockPrisma.operator.findUnique.mockResolvedValue({ id: "op1", status: "DISABLED" })
      await expect(
        svc.createOrder("u1", { type: "OPERATOR", targetId: "SILVER", amount: 4999 }),
      ).rejects.toThrow("运营商资格已被平台停用")
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it("运营商开通：非法档位直接拒单", async () => {
      await expect(
        svc.createOrder("u1", { type: "OPERATOR", targetId: "PLATINUM", amount: 4999 }),
      ).rejects.toThrow("运营商档位不存在")
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    // 端到端实测抓到的漏钱 bug：站长本身是分销角色，买运营商资格时命中自购立减 → 4999 被打八折成 3999.2。
    // 加盟费是 B 端资格费，不是商品，不得参与任何促销。
    it("加盟费不参与分销自购立减（站长买运营商仍付全款）", async () => {
      mockPrisma.commissionConfig.findUnique.mockResolvedValue({ rateA: 4999, rateB: 6 })
      mockPrisma.order.create.mockResolvedValue({ id: "o3" })
      // 让该用户命中站长身份（自购立减 20%）
      mockPrisma.station.findFirst.mockResolvedValue({ id: "st1", userId: "u1" })

      await svc.createOrder("u1", { type: "OPERATOR", targetId: "SILVER", amount: 1 })

      const data = mockPrisma.order.create.mock.calls[0][0].data
      expect(data.amount).toBe(4999) // 不是 3999.2
      expect(data.selfDiscount).toBeNull()
    })
  })
})
