import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("User E2E", () => {
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

  // ═══════════════════ 获取用户详情 ═══════════════════

  describe("GET /api/v1/users/:id", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/users/u1")
        .expect(401)
    })

    it("返回用户详情", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", nickname: "张三", avatar: null, bio: "国学爱好者",
        gender: 1, phone: "138****0000", memberLevel: "FREE",
        status: "ACTIVE", roles: [],
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/users/u1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.nickname).toBe("张三")
    })

    it("用户不存在返回 404", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValueOnce({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.user.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/users/nonexistent")
        .set("Authorization", `Bearer ${token}`)
        .expect(404)
    })
  })

  // ═══════════════════ 更新个人资料 ═══════════════════

  describe("PUT /api/v1/users/profile", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/users/profile")
        .send({ nickname: "新昵称" })
        .expect(401)
    })

    it("更新昵称成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.user.update.mockResolvedValue({
        id: "u1", nickname: "新昵称", avatar: null, bio: null, gender: null,
      })

      const res = await request(app.getHttpServer())
        .put("/api/v1/users/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ nickname: "新昵称" })
        .expect(200)

      expect(res.body.nickname).toBe("新昵称")
    })
  })

  // ═══════════════════ 管理员获取用户列表 ═══════════════════

  describe("GET /api/v1/users", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/users")
        .expect(401)
    })

    it("非管理员返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })

      await request(app.getHttpServer())
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
    })

    it("管理员获取用户列表", async () => {
      const token = jwt.sign({ sub: "admin1" })
      prisma.user.findUnique.mockResolvedValue({ id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      prisma.user.findMany.mockResolvedValue([
        { id: "u1", nickname: "张三", avatar: null, phone: "138****0000", memberLevel: "FREE", status: "ACTIVE", createdAt: new Date().toISOString(), roles: [] },
      ])
      prisma.user.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/users?page=1&pageSize=20")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.users).toHaveLength(1)
    })
  })

  // ═══════════════════ 更新用户状态 ═══════════════════

  describe("PUT /api/v1/users/:id/status", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/users/u1/status")
        .send({ status: "DISABLED" })
        .expect(401)
    })

    it("非管理员返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })

      await request(app.getHttpServer())
        .put("/api/v1/users/u1/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "DISABLED" })
        .expect(403)
    })

    it("管理员封禁用户", async () => {
      const token = jwt.sign({ sub: "admin1" })
      prisma.user.findUnique.mockResolvedValue({ id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      prisma.user.update.mockResolvedValue({ id: "u1", nickname: "张三", status: "DISABLED" })

      const res = await request(app.getHttpServer())
        .put("/api/v1/users/u1/status")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "DISABLED" })
        .expect(200)

      expect(res.body.status).toBe("DISABLED")
    })
  })

  // ═══════════════════ 分配用户角色 ═══════════════════

  describe("POST /api/v1/users/:id/roles", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/users/u1/roles")
        .send({ roleType: "OPERATION_ADMIN" })
        .expect(401)
    })

    it("非超级管理员返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "OPERATION_ADMIN" }] })

      await request(app.getHttpServer())
        .post("/api/v1/users/u1/roles")
        .set("Authorization", `Bearer ${token}`)
        .send({ roleType: "OPERATION_ADMIN" })
        .expect(403)
    })

    it("超级管理员分配角色", async () => {
      const token = jwt.sign({ sub: "super1" })
      prisma.user.findUnique.mockResolvedValue({ id: "super1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      prisma.userRole.upsert.mockResolvedValue({ userId: "u2", roleType: "OPERATION_ADMIN", bindId: null })

      const res = await request(app.getHttpServer())
        .post("/api/v1/users/u2/roles")
        .set("Authorization", `Bearer ${token}`)
        .send({ roleType: "OPERATION_ADMIN" })
        .expect(201)

      expect(res.body.roleType).toBe("OPERATION_ADMIN")
    })
  })
})
