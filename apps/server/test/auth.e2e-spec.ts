import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Auth E2E", () => {
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

  // ═══════════════════ 注册 ═══════════════════

  describe("POST /api/v1/auth/register/phone", () => {
    it("注册新用户返回 token", async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({
        id: "u1", nickname: "张三", phone: "13800138000",
      })
      prisma.userRole.findMany.mockResolvedValue([])

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register/phone")
        .send({ nickname: "张三", phone: "13800138000", password: "Abc12345" })
        .expect(201)

      expect(res.body.accessToken).toBeDefined()
    })

    it("缺少必填字段返回 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register/phone")
        .send({ nickname: "张" })
        .expect(400)

      expect(res.body.message).toBeDefined()
    })

    it("密码太短返回 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register/phone")
        .send({ nickname: "张三", phone: "13800138000", password: "12" })
        .expect(400)

      expect(res.body.message).toBeDefined()
    })
  })

  // ═══════════════════ 登录 ═══════════════════

  describe("POST /api/v1/auth/login/phone", () => {
    it("登录成功返回 token", async () => {
      const bcrypt = require("bcryptjs")
      const hash = await bcrypt.hash("123456", 10)

      prisma.user.findUnique.mockImplementation((args: any) => {
        // phoneLogin 中的查询：按手机号查用户，include auths
        if (args?.where?.phone === "13800138000") {
          return {
            id: "u1", nickname: "张三", phone: "13800138000", status: "ACTIVE",
            auths: [{ id: "a1", provider: "PASSWORD", credential: hash }],
          }
        }
        // buildLoginResult 中的查询：按 id 查用户
        if (args?.where?.id === "u1") {
          return { id: "u1", nickname: "张三", avatar: null, phone: "13800138000", memberLevel: null, memberExpire: null }
        }
        return null
      })
      prisma.userRole.findMany.mockResolvedValue([])

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login/phone")
        .send({ phone: "13800138000", password: "123456" })
        .expect(201)

      expect(res.body.accessToken).toBeDefined()
    })

    it("密码错误返回 401", async () => {
      const bcrypt = require("bcryptjs")
      const hash = await bcrypt.hash("correct", 10)
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", phone: "13800138000", status: "ACTIVE",
        auths: [{ id: "a1", provider: "PASSWORD", credential: hash }],
      })

      await request(app.getHttpServer())
        .post("/api/v1/auth/login/phone")
        .send({ phone: "13800138000", password: "wrong123456" })
        .expect(401)
    })

    it("缺少必填字段返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/auth/login/phone")
        .send({ phone: "13800138000" })
        .expect(400)
    })
  })

  // ═══════════════════ 当前用户 ═══════════════════

  describe("GET /api/v1/auth/me", () => {
    it("无 token 返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .expect(401)
    })

    it("有效 token 返回用户信息", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", nickname: "张三", phone: "13800138000", avatar: null,
        status: "ACTIVE", roles: [],
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.nickname).toBe("张三")
    })

    it("用户被禁用返回 401", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "DISABLED", roles: [],
      })

      await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(401)
    })
  })
})
