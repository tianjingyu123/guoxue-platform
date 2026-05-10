import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Paipan E2E", () => {
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

  // ═══════════════════ 八字预览 ═══════════════════

  describe("POST /api/v1/paipan/bazi/preview", () => {
    it("无需认证，返回排盘结果", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/paipan/bazi/preview")
        .send({
          gender: "男",
          year: 1984, month: 11, day: 15, hour: 8,
        })
        .expect(201)

      expect(res.body).toBeDefined()
    })

    it("缺少必填字段返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/paipan/bazi/preview")
        .send({ name: "测试" })
        .expect(400)
    })
  })

  // ═══════════════════ 八字排盘保存 ═══════════════════

  describe("POST /api/v1/paipan/bazi", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/paipan/bazi")
        .send({ gender: "男", year: 1984, month: 11, day: 15, hour: 8 })
        .expect(401)
    })

    it("保存排盘记录成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.paipanRecord.create.mockResolvedValue({
        id: "pp1", userId: "u1", paipanType: "BAZI", clientName: "测试",
        inputParams: { year: 1984, month: 11, day: 15, hour: 8 },
        resultData: { bazi: "甲子 乙亥 丙子 丁卯" },
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/paipan/bazi")
        .set("Authorization", `Bearer ${token}`)
        .send({ gender: "男", year: 1984, month: 11, day: 15, hour: 8 })
        .expect(201)

      expect(res.body.id).toBeDefined()
    })
  })

  // ═══════════════════ 排盘历史 ═══════════════════

  describe("GET /api/v1/paipan/bazi", () => {
    it("返回我的排盘历史", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.paipanRecord.findMany.mockResolvedValue([
        { id: "pp1", paipanType: "BAZI", clientName: "测试", createdAt: new Date().toISOString() },
      ])
      prisma.paipanRecord.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/paipan/bazi?page=1&pageSize=20")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.records).toHaveLength(1)
    })
  })

  // ═══════════════════ 排盘详情 ═══════════════════

  describe("GET /api/v1/paipan/bazi/:id", () => {
    it("返回排盘记录详情", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.paipanRecord.findUnique.mockResolvedValue({
        id: "pp1", userId: "u1", paipanType: "BAZI", clientName: "测试",
        inputParams: { year: 1984, month: 11, day: 15, hour: 8 },
        resultData: { bazi: "甲子 乙亥 丙子 丁卯" },
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/paipan/bazi/pp1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.clientName).toBe("测试")
    })
  })

  // ═══════════════════ 紫微斗数预览 ═══════════════════

  describe("POST /api/v1/paipan/ziwei/preview", () => {
    it("无需认证，返回紫微盘", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/paipan/ziwei/preview")
        .send({
          name: "测试",
          gender: "女",
          year: 1990, month: 6, day: 1, hour: 12,
          lunarMonth: 5, lunarDay: 9,
          lunarHour: "午", lunarYearGan: "庚", lunarYearZhi: "午",
        })
        .expect(201)

      expect(res.body).toBeDefined()
    })
  })

  // ═══════════════════ 管理员 ═══════════════════

  describe("GET /api/v1/paipan/admin/records", () => {
    it("非管理员返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })

      await request(app.getHttpServer())
        .get("/api/v1/paipan/admin/records")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
    })

    it("管理员查看所有记录", async () => {
      const token = jwt.sign({ sub: "admin1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }],
      })
      prisma.paipanRecord.findMany.mockResolvedValue([
        { id: "pp1", paipanType: "BAZI", clientName: "张三" },
      ])
      prisma.paipanRecord.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/paipan/admin/records?page=1&pageSize=20")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.records).toHaveLength(1)
    })
  })
})
