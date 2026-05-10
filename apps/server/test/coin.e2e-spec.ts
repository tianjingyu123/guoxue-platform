import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Coin E2E", () => {
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

  // ═══════════════════ 余额 ═══════════════════

  describe("GET /api/v1/coin/balance", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/coin/balance")
        .expect(401)
    })

    it("返回余额信息", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.virtualCoinAccount.findUnique.mockResolvedValue({
        userId: "u1", balance: 500, totalRecharged: 1000, totalSpent: 500,
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/coin/balance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.balance).toBe(500)
      expect(res.body.totalRecharged).toBe(1000)
    })

    it("账户不存在时自动创建", async () => {
      const token = jwt.sign({ sub: "u2" })
      prisma.user.findUnique.mockResolvedValue({ id: "u2", status: "ACTIVE", roles: [] })
      prisma.virtualCoinAccount.findUnique.mockResolvedValue(null)
      prisma.virtualCoinAccount.create.mockResolvedValue({
        userId: "u2", balance: 0, totalRecharged: 0, totalSpent: 0,
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/coin/balance")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.balance).toBe(0)
    })
  })

  // ═══════════════════ 消费 ═══════════════════

  describe("POST /api/v1/coin/spend", () => {
    it("余额不足返回业务错误", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.virtualCoinAccount.findUnique.mockResolvedValue({
        userId: "u1", balance: 10, totalRecharged: 100, totalSpent: 90,
      })

      prisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 0 })

      await request(app.getHttpServer())
        .post("/api/v1/coin/spend")
        .set("Authorization", `Bearer ${token}`)
        .send({ amountCoin: 100, scene: "PAID_QUESTION", description: "付费提问" })
        .expect(400)
    })

    it("消费成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.virtualCoinAccount.findUnique.mockResolvedValue({
        userId: "u1", balance: 500, totalRecharged: 1000, totalSpent: 500,
      })
      prisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 1 })
      prisma.virtualCoinTransaction.create.mockResolvedValue({
        id: "tx1", amountCoin: -100, scene: "PAID_QUESTION",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/coin/spend")
        .set("Authorization", `Bearer ${token}`)
        .send({ amountCoin: 100, scene: "PAID_QUESTION", description: "付费提问" })
        .expect(201)

      expect(res.body.transaction).toBeDefined()
    })
  })

  // ═══════════════════ 充值档位 ═══════════════════

  describe("GET /api/v1/coin/tiers", () => {
    it("返回充值档位列表", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/coin/tiers")
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })
  })

  // ═══════════════════ 管理员充值 ═══════════════════

  describe("POST /api/v1/coin/admin/recharge", () => {
    it("非管理员返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })

      await request(app.getHttpServer())
        .post("/api/v1/coin/admin/recharge")
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: "u2", amountCoin: 100, description: "活动赠送" })
        .expect(403)
    })

    it("管理员充值成功", async () => {
      const token = jwt.sign({ sub: "admin1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }],
      })
      prisma.virtualCoinAccount.findUnique.mockResolvedValue({
        userId: "u2", balance: 0, totalRecharged: 0, totalSpent: 0,
      })
      prisma.virtualCoinAccount.update.mockResolvedValue({
        userId: "u2", balance: 100, totalRecharged: 100, totalSpent: 0,
      })
      prisma.virtualCoinRecharge.create.mockResolvedValue({
        id: "r1", userId: "u2", amountCoin: 100, payMethod: "ADMIN",
      })
      prisma.virtualCoinTransaction.create.mockResolvedValue({
        id: "tx2", amountCoin: 100, scene: "RECHARGE",
      })
      prisma.$transaction.mockImplementation((arg: any) => {
        if (typeof arg === "function") {
          return arg({
            virtualCoinAccount: {
              update: prisma.virtualCoinAccount.update,
              updateMany: prisma.virtualCoinAccount.updateMany,
              findUnique: prisma.virtualCoinAccount.findUnique,
            },
            virtualCoinRecharge: { create: prisma.virtualCoinRecharge.create },
            virtualCoinTransaction: { create: prisma.virtualCoinTransaction.create },
          })
        }
        return Promise.all(arg)
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/coin/admin/recharge")
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: "u2", amountCoin: 100, description: "活动赠送" })
        .expect(201)

      expect(res.body.recharge.id).toBe("r1")
    })
  })

  // ═══════════════════ 礼物 ═══════════════════

  describe("GET /api/v1/coin/gifts", () => {
    it("返回礼物列表", async () => {
      prisma.gift.findMany.mockResolvedValue([
        { id: "g1", name: "鲜花", priceCoin: 10, icon: "🌸" },
        { id: "g2", name: "跑车", priceCoin: 100, icon: "🏎️" },
      ])

      const res = await request(app.getHttpServer())
        .get("/api/v1/coin/gifts")
        .expect(200)

      expect(res.body).toHaveLength(2)
    })
  })

  // ═══════════════════ 送礼物 ═══════════════════

  describe("POST /api/v1/coin/gifts/send", () => {
    it("送礼成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.gift.findUnique.mockResolvedValue({ id: "g1", name: "鲜花", priceCoin: 10 })
      prisma.virtualCoinAccount.findUnique.mockResolvedValue({
        userId: "u1", balance: 100, totalRecharged: 100, totalSpent: 0,
      })
      prisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 1 })
      prisma.virtualCoinTransaction.create.mockResolvedValue({})
      prisma.giftRecord.create.mockResolvedValue({ id: "gr1", giftId: "g1", senderId: "u1", receiverId: "u2", liveRoomId: "lr1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/coin/gifts/send")
        .set("Authorization", `Bearer ${token}`)
        .send({ giftId: "g1", toUserId: "u2", liveRoomId: "lr1", quantity: 1 })
        .expect(201)

      expect(res.body.id).toBeDefined()
    })
  })
})
