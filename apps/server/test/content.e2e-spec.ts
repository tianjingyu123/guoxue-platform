import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Content E2E", () => {
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

  // ═══════════════════ 内容列表 ═══════════════════

  describe("GET /api/v1/contents", () => {
    it("分页返回内容列表", async () => {
      prisma.content.findMany.mockResolvedValue([
        { id: "c1", title: "论语精选", type: "CLASSIC", viewCount: 100 },
      ])
      prisma.content.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/contents?page=1&pageSize=10")
        .expect(200)

      expect(res.body.total).toBe(1)
      expect(res.body.data).toHaveLength(1)
    })

    it("按类型过滤", async () => {
      prisma.content.findMany.mockResolvedValue([])
      prisma.content.count.mockResolvedValue(0)

      await request(app.getHttpServer())
        .get("/api/v1/contents?type=POEM")
        .expect(200)

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: "POEM" }) }),
      )
    })
  })

  // ═══════════════════ 内容详情 ═══════════════════

  describe("GET /api/v1/contents/:id", () => {
    it("返回内容详情", async () => {
      prisma.content.findUnique.mockResolvedValue({
        id: "c1", title: "论语精选", body: "学而时习之", type: "CLASSIC",
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/contents/c1")
        .expect(200)

      expect(res.body.title).toBe("论语精选")
    })

    it("内容不存在返回 404", async () => {
      prisma.content.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/contents/nonexistent")
        .expect(404)
    })
  })

  // ═══════════════════ 创建内容（需认证） ═══════════════════

  describe("POST /api/v1/contents", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/contents")
        .send({ title: "测试", type: "ARTICLE", body: "内容" })
        .expect(401)
    })

    it("创建成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [{ roleType: "ADMIN" }],
      })
      prisma.content.create.mockResolvedValue({
        id: "new1", title: "新文章", type: "ARTICLE", status: "PUBLISHED",
      })
      prisma.auditLog.create.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .post("/api/v1/contents")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "新文章", type: "ARTICLE", body: "正文内容" })
        .expect(201)

      expect(res.body.id).toBe("new1")
    })
  })

  // ═══════════════════ 更新内容 ═══════════════════

  describe("PUT /api/v1/contents/:id", () => {
    it("更新成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [{ roleType: "ADMIN" }],
      })
      prisma.content.findUnique.mockResolvedValue({ id: "c1" })
      prisma.content.update.mockResolvedValue({
        id: "c1", title: "更新后的标题",
      })
      prisma.auditLog.create.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .put("/api/v1/contents/c1")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "更新后的标题" })
        .expect(200)

      expect(res.body.title).toBe("更新后的标题")
    })
  })

  // ═══════════════════ 删除内容 ═══════════════════

  describe("DELETE /api/v1/contents/:id", () => {
    it("删除成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }],
      })
      prisma.content.findUnique.mockResolvedValue({ id: "c1" })
      prisma.content.delete.mockResolvedValue({ id: "c1" })
      prisma.auditLog.create.mockResolvedValue({})

      await request(app.getHttpServer())
        .delete("/api/v1/contents/c1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
    })
  })
})
