import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"
import { AlipayService } from "../src/modules/shop/alipay.service"
import { UnionpayService } from "../src/modules/shop/unionpay.service"

describe("Payment E2E", () => {
  let app: INestApplication
  let prisma: any
  let jwt: JwtService
  let alipay: any
  let unionpay: any

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    jwt = app.get(JwtService)
    alipay = app.get(AlipayService)
    unionpay = app.get(UnionpayService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ═══════════════════ 支付宝回调 ═══════════════════

  describe("POST /api/v1/shop/alipay/notify", () => {
    it("有效通知返回 success", async () => {
      alipay.verifyNotify.mockResolvedValue({
        valid: true,
        data: {
          outTradeNo: "ALI001",
          tradeNo: "TXN001",
          tradeStatus: "TRADE_SUCCESS",
          totalAmount: 99,
        },
      })
      prisma.order.findFirst.mockResolvedValue({
        id: "o-alipay", type: "PRODUCT", userId: "u1", status: "PENDING", amount: "99.00", payTransactionId: "ALI001",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/alipay/notify")
        .send({
          out_trade_no: "ALI001",
          trade_no: "TXN001",
          trade_status: "TRADE_SUCCESS",
          sign: "valid",
          notify_id: "n1",
          total_amount: "99.00",
        })
        .expect(200)

      expect(res.text).toBe("success")
    })

    it("无效签名返回 fail", async () => {
      alipay.verifyNotify.mockResolvedValue({ valid: false, error: "签名验证失败" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/alipay/notify")
        .send({ out_trade_no: "ALI001", sign: "invalid", trade_status: "TRADE_SUCCESS" })
        .expect(200)

      expect(res.text).toBe("fail")
    })
  })

  // ═══════════════════ 银联回调 ═══════════════════

  describe("POST /api/v1/shop/unionpay/notify", () => {
    it("有效通知返回 success", async () => {
      unionpay.verifyNotify.mockResolvedValue({
        valid: true,
        data: {
          outTradeNo: "UNI001",
          tradeNo: "QRY001",
          respCode: "00",
          amount: 19900,
        },
      })
      prisma.order.findFirst.mockResolvedValue({
        id: "o-union", type: "PRODUCT", userId: "u1", status: "PENDING", amount: "199.00", payTransactionId: "UNI001",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/unionpay/notify")
        .send({ orderId: "UNI001", respCode: "00", signature: "valid" })
        .expect(200)

      expect(res.text).toBe("success")
    })

    it("无效签名返回 fail", async () => {
      unionpay.verifyNotify.mockResolvedValue({ valid: false, error: "签名验证失败" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/unionpay/notify")
        .send({ orderId: "UNI001", respCode: "00", signature: "invalid" })
        .expect(200)

      expect(res.text).toBe("fail")
    })
  })

  // ═══════════════════ 领取优惠券 ═══════════════════

  describe("POST /api/v1/shop/coupons/:id/claim", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/shop/coupons/c1/claim")
        .expect(401)
    })

    it("成功领取优惠券", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.coupon.findUnique.mockResolvedValue({
        id: "c1", status: "ACTIVE", validEnd: new Date(Date.now() + 86400000), totalCount: -1, usedCount: 0,
      })
      prisma.userCoupon.findFirst.mockResolvedValue(null)
      prisma.coupon.update.mockResolvedValue({})
      prisma.userCoupon.create.mockResolvedValue({ id: "uc1", userId: "u1", couponId: "c1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/coupons/c1/claim")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(res.body.id).toBe("uc1")
    })
  })

  // ═══════════════════ 管理员发放优惠券 ═══════════════════

  describe("POST /api/v1/shop/coupons/:id/grant", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/shop/coupons/c1/grant")
        .send({ userId: "u-target" })
        .expect(401)
    })

    it("普通用户返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })

      await request(app.getHttpServer())
        .post("/api/v1/shop/coupons/c1/grant")
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: "u-target" })
        .expect(403)
    })

    it("管理员发放成功", async () => {
      const token = jwt.sign({ sub: "admin1" })
      prisma.user.findUnique.mockResolvedValue({ id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      prisma.userCoupon.create.mockResolvedValue({ id: "uc-granted", userId: "u-target", couponId: "c1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/coupons/c1/grant")
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: "u-target" })
        .expect(201)

      expect(res.body.id).toBe("uc-granted")
    })
  })
})
