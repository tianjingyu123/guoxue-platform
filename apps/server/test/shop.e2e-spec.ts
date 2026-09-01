import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"
import { WechatPayService } from "../src/modules/shop/wechat-pay.service"

describe("Shop E2E", () => {
  let app: INestApplication
  let prisma: any
  let jwt: JwtService

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    jwt = app.get(JwtService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ═══════════════════ 商品列表 ═══════════════════

  describe("GET /api/v1/shop/products", () => {
    it("分页返回商品列表", async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: "p1", title: "国学书籍", price: 99, status: "ON_SALE" },
      ])
      prisma.product.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/shop/products?page=1&pageSize=10")
        .expect(200)

      expect(res.body.total).toBe(1)
      expect(res.body.products).toHaveLength(1)
    })
  })

  // ═══════════════════ 商品详情 ═══════════════════

  describe("GET /api/v1/shop/products/:id", () => {
    it("返回商品详情含SKU", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: "p1", title: "书法套装", price: 199,
        skus: [{ id: "s1", specs: { size: "大" }, price: 199, stock: 5 }],
        circle: null,
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/shop/products/p1")
        .expect(200)

      expect(res.body.title).toBe("书法套装")
      expect(res.body.skus).toHaveLength(1)
    })

    it("商品不存在返回 404", async () => {
      prisma.product.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/shop/products/nonexistent")
        .expect(404)
    })
  })

  // ═══════════════════ 创建商品 ═══════════════════

  describe("POST /api/v1/shop/products", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/shop/products")
        .send({ title: "测试商品", price: 99 })
        .expect(401)
    })

    it("创建成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [],
      })
      prisma.product.create.mockResolvedValue({
        id: "p1", title: "国学书籍", price: 99, skus: [],
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/products")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "国学书籍", price: 99, stock: 10, detail: "详情" })
        .expect(201)

      expect(res.body.id).toBe("p1")
    })
  })

  // ═══════════════════ 下单 ═══════════════════

  describe("POST /api/v1/shop/orders", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/shop/orders")
        .send({ type: "PRODUCT", targetId: "p1", amount: 99 })
        .expect(401)
    })

    it("下单成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [],
      })
      prisma.product.findUnique.mockResolvedValue({
        id: "p1", price: 99, stock: 10, status: "ON_SALE", deletedAt: null,
        supplierType: null, userId: "seller1", skus: [], freightTemplateId: null,
      })
      prisma.shippingAddress.findFirst.mockResolvedValue({
        name: "测试收货人", phone: "13800000000", province: "广东省",
        city: "深圳市", district: "南山区", detail: "预发布隔离地址",
      })
      prisma.order.create.mockResolvedValue({
        id: "o1", status: "PENDING", amount: "99",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "PRODUCT", targetId: "p1", amount: 1, addressId: "addr1" })
        .expect(201)

      expect(res.body.id).toBe("o1")
    })
  })

  // ═══════════════════ 用户订单 ═══════════════════

  describe("GET /api/v1/shop/orders/my", () => {
    it("返回用户订单列表", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [],
      })
      prisma.order.findMany.mockResolvedValue([
        { id: "o1", status: "PAID", amount: "99" },
      ])
      prisma.order.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/shop/orders/my")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.total).toBe(1)
    })
  })

  // ═══════════════════ 新增：Native支付下单 ═══════════════════

  describe("POST /api/v1/shop/orders/:id/pay/native", () => {
    it("返回支付二维码链接", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [],
      })
      prisma.order.findUnique.mockResolvedValue({
        id: "o1", userId: "u1", status: "PENDING", amount: "99",
      })
      // 测试环境无商户证书 → isConfigured 恒 false，会被前置检查拦成 400（这是产品的正确防护，
      // 见 shop-payment.service.ts createNativePayment）。此处 stub 掉配置与下单，才测得到本用例真正的目标：
      // 已配置时 Native 支付返回二维码链接。
      const wechatPay: any = app.get(WechatPayService)
      // isConfigured 是 prototype 上的 getter，jest.spyOn 在实例上找不到 → 直接在实例上覆盖定义
      Object.defineProperty(wechatPay, "isConfigured", { get: () => true, configurable: true })
      jest.spyOn(wechatPay, "createNativeOrder").mockResolvedValue({ code_url: "weixin://wxpay/bizpayurl?pr=test" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/shop/orders/o1/pay/native")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(201)

      expect(res.body.code_url).toContain("weixin://")
    })
  })
})
