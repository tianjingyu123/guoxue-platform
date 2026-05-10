import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Question E2E", () => {
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

  // ═══════════════════ 发起提问 ═══════════════════

  describe("POST /api/v1/question/ask", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/question/ask")
        .send({ circleId: "ci1", answererId: "u2", questionTitle: "测试", question: "内容", priceCoin: 50 })
        .expect(401)
    })

    it("不能向自己提问", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })

      await request(app.getHttpServer())
        .post("/api/v1/question/ask")
        .set("Authorization", `Bearer ${token}`)
        .send({ circleId: "ci1", answererId: "u1", questionTitle: "自问", question: "自问", priceCoin: 50 })
        .expect(409)
    })

    it("发起提问成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "u1") return { id: "u1", status: "ACTIVE", roles: [] }
        return null
      })
      prisma.circle.findUnique.mockResolvedValue({ id: "ci1", name: "国学圈" })
      prisma.circleMember.findFirst.mockResolvedValue({ id: "cm1", circleId: "ci1", userId: "u2" })
      prisma.virtualCoinAccount.findUnique.mockResolvedValue({
        userId: "u1", balance: 500, totalRecharged: 1000, totalSpent: 500,
      })
      prisma.virtualCoinAccount.updateMany.mockResolvedValue({ count: 1 })
      prisma.virtualCoinTransaction.create.mockResolvedValue({})
      prisma.paidQuestion.create.mockResolvedValue({
        id: "q1", circleId: "ci1", askerId: "u1", answererId: "u2",
        questionTitle: "学论语", question: "请问如何学论语？", priceCoin: 50, peekPriceCoin: 10, status: "PENDING",
        asker: { id: "u1", nickname: "张三", avatar: null },
        answerer: { id: "u2", nickname: "李四", avatar: null },
        circle: { id: "ci1", name: "国学圈" },
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/question/ask")
        .set("Authorization", `Bearer ${token}`)
        .send({ circleId: "ci1", answererId: "u2", questionTitle: "学论语", question: "请问如何学论语？", priceCoin: 50, peekPriceCoin: 10 })
        .expect(201)

      expect(res.body.id).toBe("q1")
      expect(res.body.status).toBe("PENDING")
    })
  })

  // ═══════════════════ 回答问题 ═══════════════════

  describe("POST /api/v1/question/:id/answer", () => {
    it("非回答者不能回答", async () => {
      const token = jwt.sign({ sub: "u3" })
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "u3") return { id: "u3", status: "ACTIVE", roles: [] }
        return null
      })
      prisma.paidQuestion.findUnique.mockResolvedValue({
        id: "q1", answererId: "u2", status: "PENDING",
      })

      await request(app.getHttpServer())
        .post("/api/v1/question/q1/answer")
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "我的回答", answerAudioUrl: "", images: [] })
        .expect(403)
    })

    it("回答成功", async () => {
      const token = jwt.sign({ sub: "u2" })
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "u2") return { id: "u2", status: "ACTIVE", roles: [] }
        return null
      })
      prisma.paidQuestion.findUnique.mockResolvedValue({
        id: "q1", answererId: "u2", status: "PENDING", priceCoin: 50,
      })
      prisma.paidQuestion.update.mockResolvedValue({
        id: "q1", answer: "论语以学而篇为首", status: "ANSWERED",
        answeredAt: new Date().toISOString(),
        asker: { id: "u1", nickname: "张三", avatar: null },
        answerer: { id: "u2", nickname: "李四", avatar: null },
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/question/q1/answer")
        .set("Authorization", `Bearer ${token}`)
        .send({ answer: "论语以学而篇为首", answerAudioUrl: "", images: [] })
        .expect(201)

      expect(res.body.status).toBe("ANSWERED")
    })
  })

  // ═══════════════════ 围观答案 ═══════════════════

  describe("POST /api/v1/question/:id/peek", () => {
    it("提问者围观不付费", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "u1") return { id: "u1", status: "ACTIVE", roles: [] }
        return null
      })
      prisma.paidQuestion.findUnique.mockResolvedValue({
        id: "q1", status: "ANSWERED", isPublic: true, peekPriceCoin: 10,
        askerId: "u1", answererId: "u2",
        answer: "论语的内容...",
        asker: { id: "u1", nickname: "张三", avatar: null },
        answerer: { id: "u2", nickname: "李四", avatar: null },
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/question/q1/peek")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(res.body.answer).toBe("论语的内容...")
    })

    it("不能围观未回答的问题", async () => {
      const token = jwt.sign({ sub: "u3" })
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "u3") return { id: "u3", status: "ACTIVE", roles: [] }
        return null
      })
      prisma.paidQuestion.findUnique.mockResolvedValue({
        id: "q1", status: "PENDING", isPublic: true, peekPriceCoin: 10,
      })

      await request(app.getHttpServer())
        .post("/api/v1/question/q1/peek")
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
    })
  })

  // ═══════════════════ 问答列表 ═══════════════════

  describe("GET /api/v1/question", () => {
    it("公开接口分页返回", async () => {
      prisma.paidQuestion.findMany.mockResolvedValue([
        { id: "q1", questionTitle: "学论语", question: "如何学论语？", status: "ANSWERED" },
      ])
      prisma.paidQuestion.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/question?page=1&pageSize=10")
        .expect(200)

      expect(res.body.total).toBe(1)
      expect(res.body.questions).toHaveLength(1)
    })
  })

  // ═══════════════════ 问答详情 ═══════════════════

  describe("GET /api/v1/question/:id", () => {
    it("返回问答详情", async () => {
      prisma.paidQuestion.findUnique.mockResolvedValue({
        id: "q1", questionTitle: "学论语", question: "如何学论语？", status: "ANSWERED",
        answer: "论语以学而篇为首", answerCount: 0, peekCount: 0,
        asker: { id: "u1", nickname: "张三", avatar: null },
        answerer: { id: "u2", nickname: "李四", avatar: null },
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/question/q1")
        .expect(200)

      expect(res.body.question).toBe("如何学论语？")
    })

    it("不存在返回 404", async () => {
      prisma.paidQuestion.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/question/nonexistent")
        .expect(404)
    })
  })

  // ═══════════════════ 超时退款 ═══════════════════

  describe("POST /api/v1/question/admin/refund-expired", () => {
    it("非管理员返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })

      await request(app.getHttpServer())
        .post("/api/v1/question/admin/refund-expired")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
    })

    it("管理员触发退款", async () => {
      const token = jwt.sign({ sub: "admin1" })
      prisma.user.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === "admin1") return { id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] }
        return null
      })
      prisma.paidQuestion.findMany.mockResolvedValue([])

      const res = await request(app.getHttpServer())
        .post("/api/v1/question/admin/refund-expired")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(res.body.refunded).toBe(0)
    })
  })
})
