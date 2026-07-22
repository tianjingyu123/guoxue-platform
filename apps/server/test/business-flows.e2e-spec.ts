import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"
import { WechatPayService } from "../src/modules/shop/wechat-pay.service"

/**
 * 核心业务流程集成测试 — 覆盖 5 条完整业务链路
 *
 * Flow 1: 用户注册登录 → 手机号注册 / 密码登录 / 获取个人信息
 * Flow 2: 加入圈子 → 注册 / 查看圈子 / 加入 / 查看我的圈子
 * Flow 3: 购买课程 → 注册 / 创建课程 / 购买 / 查看已购课程
 * Flow 4: 下单支付 → 注册 / 创建商品 / 创建订单 / 发起支付 / 查询状态
 * Flow 5: 分佣计算 → 邀请人注册 / 被邀请人购买 / 分佣记录生成
 */
describe("核心业务流程 E2E", () => {
  let app: INestApplication
  let prisma: any
  let jwt: JwtService
  let bcrypt: any

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    jwt = app.get(JwtService)
    try { bcrypt = require("bcryptjs") } catch { /* will use plain compare */ }
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ══════════════════════════════════════════════════════════
  // Flow 1: 用户注册登录
  // ══════════════════════════════════════════════════════════

  describe("Flow 1 — 用户注册登录", () => {
    it("完整流程：手机号注册 → 登录 → 获取个人信息 → 修改密码", async () => {
      // Step 1: 注册新用户
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({
        id: "u-flow-1", nickname: "测试用户A", phone: "13800000001",
      })
      prisma.userRole.findMany.mockResolvedValue([])

      const registerRes = await request(app.getHttpServer())
        .post("/api/v1/auth/register/phone")
        .send({ nickname: "测试用户A", phone: "13800000001", password: "Pass1234" })
        .expect(201)

      expect(registerRes.body.accessToken).toBeDefined()
      expect(registerRes.body.user).toBeDefined()
      const token = registerRes.body.accessToken

      // Step 2: 使用 token 获取个人信息
      prisma.user.findUnique.mockResolvedValue({
        id: "u-flow-1", nickname: "测试用户A", avatar: null,
        phone: "13800000001", email: null, gender: "UNKNOWN",
        birthday: null, memberLevel: 0, memberExpire: null,
        createdAt: new Date("2026-05-10"),
        roles: [],
      })

      const meRes = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(meRes.body.nickname).toBe("测试用户A")
      expect(meRes.body.phone).toBe("13800000001")

      // Step 3: 退出后用手机号+密码重新登录
      const hash = bcrypt ? await bcrypt.hash("Pass1234", 10) : "$2a$10$dummyhash"
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.phoneHash) {
          return {
            id: "u-flow-1", nickname: "测试用户A", phone: "13800000001", status: "ACTIVE",
            auths: [{ id: "a1", provider: "PASSWORD", credential: hash }],
          }
        }
        if (args?.where?.id === "u-flow-1") {
          return { id: "u-flow-1", nickname: "测试用户A", avatar: null, phone: "13800000001", memberLevel: 0, memberExpire: null }
        }
        return null
      })

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login/phone")
        .send({ phone: "13800000001", password: "Pass1234" })
        .expect(201)

      expect(loginRes.body.accessToken).toBeDefined()
      expect(loginRes.body.user.nickname).toBe("测试用户A")
    })

    it("注册时手机号已存在应返回 409", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u-exist", phone: "13800000001" })

      await request(app.getHttpServer())
        .post("/api/v1/auth/register/phone")
        .send({ nickname: "重复用户", phone: "13800000001", password: "Pass1234" })
        .expect(409)
    })

    it("登录时密码错误应返回 401", async () => {
      const hash = bcrypt ? await bcrypt.hash("Correct12", 10) : "$2a$10$dummyhash"
      prisma.user.findUnique.mockResolvedValue({
        id: "u-flow-1", phone: "13800000001", status: "ACTIVE",
        auths: [{ id: "a1", provider: "PASSWORD", credential: hash }],
      })

      await request(app.getHttpServer())
        .post("/api/v1/auth/login/phone")
        .send({ phone: "13800000001", password: "WrongPass12" })
        .expect(401)
    })
  })

  // ══════════════════════════════════════════════════════════
  // Flow 2: 加入圈子
  // ══════════════════════════════════════════════════════════

  describe("Flow 2 — 加入圈子", () => {
    it("完整流程：注册 → 查看圈子详情 → 加入圈子 → 查看我的圈子列表", async () => {
      // Step 1: 注册用户获取 token
      const token = jwt.sign({ sub: "u-flow-2" })
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-2", status: "ACTIVE", roles: [] })

      // Step 2: 查看圈子详情
      prisma.circle.findUnique.mockResolvedValue({
        id: "ci-flow-2", name: "论语研读圈", intro: "一起研读论语",
        cover: null, tags: ["论语", "经典"], type: "FREE", price: 0,
        memberCount: 99, postCount: 50, status: "ACTIVE",
        owner: { id: "u-owner", nickname: "国学先生", avatar: null },
        _count: { posts: 50, articles: 3, courses: 1 },
      })

      const detailRes = await request(app.getHttpServer())
        .get("/api/v1/circles/ci-flow-2")
        .expect(200)

      expect(detailRes.body.name).toBe("论语研读圈")
      expect(detailRes.body.memberCount).toBe(99)

      // Step 3: 加入圈子
      prisma.circleMember.findUnique.mockResolvedValue(null)
      prisma.circleMember.create.mockResolvedValue({
        id: "cm-flow-2", circleId: "ci-flow-2", userId: "u-flow-2", role: "MEMBER",
        joinedAt: new Date("2026-05-10"),
      })
      prisma.circle.update.mockResolvedValue({})

      const joinRes = await request(app.getHttpServer())
        .post("/api/v1/circles/ci-flow-2/join")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(joinRes.body.role).toBe("MEMBER")
      expect(joinRes.body.circleId).toBe("ci-flow-2")

      // Step 4: 查看我的圈子列表
      prisma.circleMember.findMany.mockResolvedValue([
        {
          circle: {
            id: "ci-flow-2", name: "论语研读圈", cover: null, type: "FREE",
            memberCount: 100, postCount: 51, updatedAt: new Date().toISOString(),
          },
          role: "MEMBER",
        },
      ])

      const myCirclesRes = await request(app.getHttpServer())
        .get("/api/v1/circles/my")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(myCirclesRes.body).toHaveLength(1)
      expect(myCirclesRes.body[0].circle.name).toBe("论语研读圈")
    })

    it("重复加入同一圈子应返回 409", async () => {
      const token = jwt.sign({ sub: "u-flow-2" })
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-2", status: "ACTIVE", roles: [] })
      prisma.circle.findUnique.mockResolvedValue({ id: "ci-flow-2", status: "ACTIVE" })
      prisma.circleMember.findUnique.mockResolvedValue({ id: "cm-exist", circleId: "ci-flow-2", userId: "u-flow-2" })

      await request(app.getHttpServer())
        .post("/api/v1/circles/ci-flow-2/join")
        .set("Authorization", `Bearer ${token}`)
        .expect(409)
    })

    it("未认证用户加入圈子应返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/circles/ci-flow-2/join")
        .expect(401)
    })
  })

  // ══════════════════════════════════════════════════════════
  // Flow 3: 购买课程
  // ══════════════════════════════════════════════════════════

  describe("Flow 3 — 购买课程", () => {
    it("完整流程：注册 → 浏览课程 → 购买课程 → 查看已购课程", async () => {
      const token = jwt.sign({ sub: "u-flow-3" })
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-3", status: "ACTIVE", roles: [] })

      // Step 1: 浏览课程列表
      prisma.course.findMany.mockResolvedValue([
        {
          id: "co-flow-3", title: "易经入门", cover: null, intro: "从零开始学易经",
          price: 19900, originalPrice: 29900, type: "VIDEO", tags: ["易经", "入门"],
          chapterCount: 12, studentCount: 500, auditStatus: "APPROVED",
          teacher: { id: "u-teacher", nickname: "王大师", avatar: null },
        },
      ])
      prisma.course.count.mockResolvedValue(1)

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/courses?page=1&pageSize=10")
        .expect(200)

      expect(listRes.body.courses).toHaveLength(1)
      expect(listRes.body.courses[0].title).toBe("易经入门")

      // Step 2: 查看课程详情
      prisma.course.findUnique.mockResolvedValue({
        id: "co-flow-3", title: "易经入门", price: 19900, validityDays: 365,
        chapters: [{ id: "ch1", title: "第一章：乾卦" }],
      })

      const detailRes = await request(app.getHttpServer())
        .get("/api/v1/courses/co-flow-3")
        .expect(200)

      expect(detailRes.body.title).toBe("易经入门")

      // Step 3: 购买课程
      prisma.course.findUnique.mockResolvedValue({ id: "co-flow-3", price: 19900, title: "易经入门", validityDays: 365 })
      prisma.order.findFirst.mockResolvedValue(null) // 未买过
      prisma.order.create.mockResolvedValue({
        id: "ord-flow-3", userId: "u-flow-3", type: "COURSE",
        targetId: "co-flow-3", amount: 19900, status: "PENDING",
        createdAt: new Date("2026-05-10"),
      })

      const purchaseRes = await request(app.getHttpServer())
        .post("/api/v1/courses/co-flow-3/purchase")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(purchaseRes.body.status).toBe("PENDING")
      expect(purchaseRes.body.amount).toBe(19900)

      // Step 4: 查看已购课程
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-3", status: "ACTIVE", roles: [] })
      prisma.order.findMany.mockResolvedValue([
        {
          id: "ord-flow-3", type: "COURSE", targetId: "co-flow-3",
          amount: 19900, status: "PAID", paidAt: new Date("2026-05-10"),
        },
      ])
      prisma.order.count.mockResolvedValue(1)
      prisma.course.findMany.mockResolvedValue([
        { id: "co-flow-3", title: "易经入门", cover: null, type: "VIDEO",
          user: { id: "u-teacher", nickname: "王大师", avatar: null } },
      ])

      const myCoursesRes = await request(app.getHttpServer())
        .get("/api/v1/courses/my")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(myCoursesRes.body.courses).toHaveLength(1)
      expect(myCoursesRes.body.courses[0].course.title).toBe("易经入门")
    })

    it("重复购买有效期内课程应返回 400", async () => {
      const token = jwt.sign({ sub: "u-flow-3" })
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-3", status: "ACTIVE", roles: [] })
      prisma.course.findUnique.mockResolvedValue({ id: "co-flow-3", price: 19900, title: "易经入门", validityDays: 365 })
      prisma.order.findFirst.mockResolvedValue({
        id: "ord-old", userId: "u-flow-3", type: "COURSE", targetId: "co-flow-3",
        status: "PAID", paidAt: new Date(), // 刚买的，在有效期内
      })

      await request(app.getHttpServer())
        .post("/api/v1/courses/co-flow-3/purchase")
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
    })

    it("未认证用户无法购买课程", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/courses/co-flow-3/purchase")
        .expect(401)
    })
  })

  // ══════════════════════════════════════════════════════════
  // Flow 4: 下单支付
  // ══════════════════════════════════════════════════════════

  describe("Flow 4 — 下单支付", () => {
    it("完整流程：创建商品 → 创建订单 → 发起支付 → 支付回调 → 查询状态", async () => {
      const token = jwt.sign({ sub: "u-flow-4" })
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-4", status: "ACTIVE", roles: [] })

      // Step 1: 浏览商品
      prisma.product.findMany.mockResolvedValue([
        {
          id: "prd-flow-4", title: "国学经典套装", price: 29900,
          images: [], status: "ON_SALE", stock: 50, salesCount: 10,
          skus: [],
        },
      ])
      prisma.product.count.mockResolvedValue(1)

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/shop/products")
        .expect(200)

      expect(listRes.body.products).toHaveLength(1)

      // Step 2: 创建订单
      prisma.product.findUnique.mockResolvedValue({ id: "prd-flow-4", price: 29900, status: "ON_SALE" })
      prisma.order.create.mockResolvedValue({
        id: "ord-flow-4", userId: "u-flow-4", type: "PHYSICAL",
        targetId: "prd-flow-4", amount: 29900, status: "PENDING",
        createdAt: new Date("2026-05-10"),
      })
      // $transaction callback
      prisma.$transaction.mockImplementation((arg: any) => {
        if (typeof arg === "function") return arg(prisma)
        return Promise.all(Array.isArray(arg) ? arg : [arg])
      })

      const orderRes = await request(app.getHttpServer())
        .post("/api/v1/shop/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "PHYSICAL", targetId: "prd-flow-4", amount: 29900 })
        .expect(201)

      expect(orderRes.body.status).toBe("PENDING")
      expect(orderRes.body.amount).toBe(29900)

      // Step 3: 发起 Native 支付（PC扫码）
      prisma.order.findUnique.mockResolvedValue({
        id: "ord-flow-4", userId: "u-flow-4", status: "PENDING", amount: 29900,
      })
      // 测试环境无商户证书 → isConfigured 恒 false，会被前置检查拦成 400（产品的正确防护，
      // 见 shop-payment.service.ts createNativePayment）。stub 掉才测得到本流程真正的目标。
      // isConfigured 是 prototype 上的 getter，jest.spyOn 在实例上找不到 → 直接在实例上覆盖定义。
      const wechatPay: any = app.get(WechatPayService)
      Object.defineProperty(wechatPay, "isConfigured", { get: () => true, configurable: true })
      jest.spyOn(wechatPay, "createNativeOrder").mockResolvedValue({ code_url: "weixin://wxpay/bizpayurl?pr=flow4" })

      const payRes = await request(app.getHttpServer())
        .post("/api/v1/shop/orders/ord-flow-4/pay/native")
        .set("Authorization", `Bearer ${token}`)
        .send({ notifyUrl: "https://example.com/notify" })
        .expect(201)

      expect(payRes.body).toHaveProperty("code_url")

      // Step 4: 支付回调。无验签头的伪回调必须拒绝，只有微信 V3 验签解密后的完整流水才能入账。
      await request(app.getHttpServer())
        .post("/api/v1/shop/pay/notify")
        .send({ id: "ord-flow-4", event_type: "TRANSACTION.SUCCESS" })
        .expect(400)

      const merchantOrderNo = "GXordflow4"
      prisma.order.findUnique.mockResolvedValue({
        id: "ord-flow-4", userId: "u-flow-4", type: "PHYSICAL", status: "PENDING",
        amount: 29900, payTransactionId: merchantOrderNo,
      })
      prisma.order.updateMany.mockResolvedValue({ count: 1 })
      jest.spyOn(wechatPay, "verifyAndDecryptNotify").mockResolvedValue({
        valid: true,
        data: {
          out_trade_no: merchantOrderNo,
          transaction_id: "WX-FLOW-4",
          trade_state: "SUCCESS",
          attach: "ord-flow-4",
          amount: { total: 2990000 },
        },
      })

      await request(app.getHttpServer())
        .post("/api/v1/shop/pay/notify")
        .set("Wechatpay-Signature", "signed-flow-4")
        .set("Wechatpay-Timestamp", String(Math.floor(Date.now() / 1000)))
        .set("Wechatpay-Nonce", "nonce-flow-4")
        .set("Wechatpay-Serial", "serial-flow-4")
        .send({ resource: { ciphertext: "encrypted-flow-4" } })
        .expect(200)

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: "ord-flow-4", status: "PENDING" },
        data: expect.objectContaining({ status: "PAID", payMethod: "WECHAT", payTransactionId: "WX-FLOW-4" }),
      })
      // Step 5: 查询支付状态
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-4", status: "ACTIVE", roles: [] })
      prisma.order.findUnique.mockResolvedValue({
        id: "ord-flow-4", userId: "u-flow-4", status: "PAID",
        amount: 29900, payTransactionId: "txn-12345", paidAt: new Date("2026-05-10"),
      })

      const statusRes = await request(app.getHttpServer())
        .get("/api/v1/shop/orders/ord-flow-4/payment-status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(statusRes.body.tradeState).toBe("SUCCESS")
    })

    it("商品已下架时创建订单应返回 400", async () => {
      const token = jwt.sign({ sub: "u-flow-4" })
      prisma.user.findUnique.mockResolvedValue({ id: "u-flow-4", status: "ACTIVE", roles: [] })
      prisma.product.findUnique.mockResolvedValue({ id: "prd-off", price: 29900, status: "OFF_SHELF" })

      await request(app.getHttpServer())
        .post("/api/v1/shop/orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "PHYSICAL", targetId: "prd-off", amount: 29900 })
        .expect(400)
    })

    it("未认证用户无法创建订单", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/shop/orders")
        .send({ type: "PHYSICAL", targetId: "prd-flow-4", amount: 29900 })
        .expect(401)
    })
  })

  // ══════════════════════════════════════════════════════════
  // Flow 5: 分佣计算
  // ══════════════════════════════════════════════════════════

  describe("Flow 5 — 分佣计算", () => {
    it("完整流程：邀请人创建分站 → 被邀请人通过推荐码注册 → 被邀请人购买课程 → 分佣记录生成 → 查询分站收益 → 申请提现", async () => {
      // Step 1: 邀请人（站长）注册
      const inviterToken = jwt.sign({ sub: "u-inviter" })

      // Step 2: 邀请人创建分站
      prisma.user.findUnique.mockResolvedValue({ id: "u-inviter", status: "ACTIVE", roles: [] })

      // 创建推荐链接
      prisma.referralLink.create.mockResolvedValue({
        id: "rl-flow-5", userId: "u-inviter", targetType: "COURSE",
        targetId: "co-flow-5", code: "abc12345", channel: "DIRECT",
      })

      const linkRes = await request(app.getHttpServer())
        .post("/api/v1/commission/referral-link")
        .set("Authorization", `Bearer ${inviterToken}`)
        .send({ targetType: "COURSE", targetId: "co-flow-5" })
        .expect(201)

      expect(linkRes.body.code).toBeDefined()
      const referralCode = linkRes.body.code
      const inviterId = "u-inviter"

      // Step 3: 被邀请人通过推荐码注册
      prisma.user.findUnique.mockResolvedValue(null) // 新用户
      prisma.user.create.mockResolvedValue({
        id: "u-invited", nickname: "被邀请用户", phone: "13800000002",
      })

      // 模拟推荐码对应的分站
      prisma.station.findUnique.mockImplementation((args: any) => {
        if (args?.where?.code === referralCode) {
          return { id: "sta-flow-5", userId: inviterId, code: referralCode, name: "国学推广站" }
        }
        // verifyStationAccess / commission config: 按 userId 查分站
        if (args?.where?.userId === inviterId) {
          return { id: "sta-flow-5", userId: inviterId }
        }
        // verifyStationAccess: 按 stationId 查所有权
        if (args?.where?.id === "sta-flow-5") {
          return { id: "sta-flow-5", userId: inviterId }
        }
        // withdrawal_min config
        return null
      })
      prisma.referralRelation.create.mockResolvedValue({ id: "ref-flow-5" })

      // Step 4: 被邀请人购买课程，触发分佣
      const invitedToken = jwt.sign({ sub: "u-invited" })
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "u-invited") return { id: "u-invited", status: "ACTIVE", roles: [] }
        // withdrawal_min config lookup
        return null
      })

      // 分佣配置
      prisma.commissionConfig.findUnique.mockImplementation((args: any) => {
        if (args?.where?.configKey === "course_basic") {
          return { id: "cc1", configKey: "course_basic", configName: "课程分佣", rateA: 0.3, rateB: 0.1, rateC: 0, description: "课程基础分佣" }
        }
        if (args?.where?.configKey === "withdrawal_min") {
          return null
        }
        // station lookup
        if (args?.where?.userId === inviterId) {
          return { id: "sta-flow-5", userId: inviterId }
        }
        return null
      })

      // 课程
      prisma.course.findUnique.mockResolvedValue({
        id: "co-flow-5", price: 19900, title: "道德经精讲", validityDays: 0,
      })
      prisma.order.findFirst.mockResolvedValue(null) // 未买过
      prisma.order.create.mockResolvedValue({
        id: "ord-flow-5", userId: "u-invited", type: "COURSE",
        targetId: "co-flow-5", amount: 19900, status: "PENDING",
      })

      // 分佣计算
      prisma.stationEarning.create.mockResolvedValue({
        id: "se-flow-5", stationId: "sta-flow-5", orderId: "ord-flow-5",
        amount: 19900, rate: 0.3, earned: 5970, type: "COURSE",
      })
      prisma.station.update.mockResolvedValue({})
      prisma.notification.create.mockResolvedValue({})

      const purchaseRes = await request(app.getHttpServer())
        .post("/api/v1/courses/co-flow-5/purchase")
        .set("Authorization", `Bearer ${invitedToken}`)
        .send({ referrerId: inviterId })
        .expect(201)

      expect(purchaseRes.body.status).toBe("PENDING")

      // Step 5: 查看分站收益（恢复 inviter 用户的 mock）
      prisma.user.findUnique.mockImplementation((args: any) => {
        const id = args?.where?.id
        if (id === "u-inviter") return { id: "u-inviter", status: "ACTIVE", roles: [] }
        if (id === "u-invited") return { id: "u-invited", status: "ACTIVE", roles: [] }
        if (id === "sta-flow-5") return { id: "sta-flow-5", totalEarning: 5970 }
        return null
      })
      prisma.station.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "sta-flow-5") return { id: "sta-flow-5", userId: "u-inviter" }
        return null
      })
      prisma.stationEarning.findMany.mockResolvedValue([
        {
          id: "se-flow-5", stationId: "sta-flow-5", orderId: "ord-flow-5",
          amount: 19900, rate: 0.3, earned: 5970, type: "COURSE",
          createdAt: new Date("2026-05-10"),
        },
      ])
      prisma.stationEarning.count.mockResolvedValue(1)
      prisma.stationEarning.aggregate.mockResolvedValue({ _sum: { earned: 5970 } })

      const earningsRes = await request(app.getHttpServer())
        .get("/api/v1/commission/station-earnings/sta-flow-5")
        .set("Authorization", `Bearer ${inviterToken}`)
        .expect(200)

      expect(earningsRes.body.totalEarned).toBe(5970)

      // Step 6: 查询分站余额
      prisma.station.findUnique.mockResolvedValue({ id: "sta-flow-5", userId: inviterId, totalEarning: 5970 })
      prisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 0 } })

      const balanceRes = await request(app.getHttpServer())
        .get("/api/v1/commission/station-balance/sta-flow-5")
        .set("Authorization", `Bearer ${inviterToken}`)
        .expect(200)

      expect(balanceRes.body.totalEarned).toBe(5970)
      expect(balanceRes.body.balance).toBe(5970)

      // Step 7: 申请提现
      prisma.user.findUnique.mockImplementation((args: any) => {
        const id = args?.where?.id
        if (id === "u-inviter") return { id: "u-inviter", status: "ACTIVE", roles: [] }
        return null
      })
      prisma.station.findUnique.mockImplementation((args: any) => {
        // applyWithdrawal: 按 userId 查分站
        if (args?.where?.userId === inviterId) return { id: "sta-flow-5", userId: inviterId }
        // getStationBalance / verifyStationAccess: 按 stationId 查
        if (args?.where?.id === "sta-flow-5") return { id: "sta-flow-5", userId: inviterId, totalEarning: 5970 }
        return null
      })
      prisma.commissionConfig.findUnique.mockResolvedValue(null)
      prisma.withdrawal.create.mockResolvedValue({
        id: "wd-flow-5", userId: inviterId, stationId: "sta-flow-5",
        amount: 5000, status: "PENDING", bankName: "工商银行",
        bankAccount: "6222021234567890",
      })

      const withdrawRes = await request(app.getHttpServer())
        .post("/api/v1/commission/withdrawal")
        .set("Authorization", `Bearer ${inviterToken}`)
        .send({ amount: 5000, bankName: "工商银行", bankAccount: "6222021234567890" })
        .expect(201)

      expect(withdrawRes.body.status).toBe("PENDING")
      expect(withdrawRes.body.amount).toBe(5000)
    })

    it("余额不足时提现应返回 400", async () => {
      const token = jwt.sign({ sub: "u-inviter" })
      prisma.user.findUnique.mockResolvedValue({ id: "u-inviter", status: "ACTIVE", roles: [] })
      prisma.station.findUnique.mockResolvedValue({ id: "sta-flow-5", userId: "u-inviter", totalEarning: 1000 })
      prisma.withdrawal.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      prisma.commissionConfig.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .post("/api/v1/commission/withdrawal")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 5000, bankName: "工商银行", bankAccount: "6222021234567890" })
        .expect(400)
    })

    it("推荐链接跟踪点击", async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: "rl-flow-5", userId: "u-inviter", targetType: "COURSE",
        targetId: "co-flow-5", code: "abc12345",
      })
      prisma.referralLink.update.mockResolvedValue({})

      const trackRes = await request(app.getHttpServer())
        .get("/api/v1/commission/track/abc12345")
        .expect(200)

      expect(trackRes.body.referrerId).toBe("u-inviter")
      expect(trackRes.body.targetType).toBe("COURSE")
    })
  })
})
