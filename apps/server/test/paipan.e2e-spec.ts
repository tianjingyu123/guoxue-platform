import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"
import { PAIPAN_SUITE_MODE_KEY } from "../src/common/paipan-suite-policy"

describe("Paipan E2E", () => {
  const originalMode = process.env.PAIPAN_MODE
  let app: INestApplication
  let prisma: any
  let jwt: JwtService
  let storedMode: "native" | "legacy" = "native"
  let consumerToken: string

  beforeAll(async () => {
    process.env.PAIPAN_MODE = "native"
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    jwt = app.get(JwtService)
  })

  afterAll(async () => {
    await app.close()
    if (originalMode === undefined) delete process.env.PAIPAN_MODE
    else process.env.PAIPAN_MODE = originalMode
  })

  beforeEach(() => {
    jest.clearAllMocks()
    storedMode = "native"
    consumerToken = jwt.sign({ sub: "u1" })
    prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
    // 真实 JWT 与整套守卫保留，只模拟其主库查询；未知 SQL 不默认放行。
    prisma.$queryRaw.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (!Array.isArray(strings) || !strings.join("").includes("WITH mode AS") || values[0] !== PAIPAN_SUITE_MODE_KEY) {
        throw new Error("未声明的排盘测试 SQL")
      }
      return [{ allowed: storedMode === "native" && ["u1", "admin1"].includes(String(values[2])) }]
    })
  })

  it("legacy 模式下普通用户直达自研接口返回 404", async () => {
    storedMode = "legacy"
    await request(app.getHttpServer()).post("/api/v1/paipan/bazi/preview")
      .set("Authorization", `Bearer ${consumerToken}`).send({}).expect(404)
      .expect("Cache-Control", "private, no-store")
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
  })

  it("native 模式匿名预览仍隐藏入口，不查询主库或计算", async () => {
    await request(app.getHttpServer()).post("/api/v1/paipan/bazi/preview").send({}).expect(404)
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })

  // ═══════════════════ 八字预览 ═══════════════════

  describe("POST /api/v1/paipan/bazi/preview", () => {
    it("整套模式允许的登录用户返回排盘结果", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/paipan/bazi/preview")
        .set("Authorization", `Bearer ${consumerToken}`)
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
        .set("Authorization", `Bearer ${consumerToken}`)
        .send({ name: "测试" })
        .expect(400)
    })
  })

  // ═══════════════════ 八字排盘保存 ═══════════════════

  describe("POST /api/v1/paipan/bazi", () => {
    it("未认证时由整套门禁隐藏为 404", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/paipan/bazi")
        .send({ gender: "男", year: 1984, month: 11, day: 15, hour: 8 })
        .expect(404)
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
      prisma.paipanRecord.findFirst.mockResolvedValue({
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
    it("整套模式允许的登录用户返回紫微盘", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/paipan/ziwei/preview")
        .set("Authorization", `Bearer ${consumerToken}`)
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
