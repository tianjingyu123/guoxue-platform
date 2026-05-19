import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Comment E2E", () => {
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

  const authAs = (uid: string) => jwt.sign({ sub: uid })
  const stubUser = (id: string, roles: string[] = []) =>
    prisma.user.findUnique.mockResolvedValue({ id, status: "ACTIVE", roles: roles.map(r => ({ roleType: r })) })

  // ═══════════════════ 创建评论 ═══════════════════

  describe("POST /api/v1/comment", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/comment")
        .send({ targetType: "ARTICLE", targetId: "a1", content: "好文章" })
        .expect(401)
    })

    it("创建评论成功", async () => {
      stubUser("u1")
      prisma.comment.create.mockResolvedValue({
        id: "c1", targetType: "ARTICLE", targetId: "a1", content: "好文章", parentId: null,
        user: { id: "u1", nickname: "张三", avatar: null },
      })
      prisma.userBehavior.create.mockRejectedValue(new Error("ignore"))

      const res = await request(app.getHttpServer())
        .post("/api/v1/comment")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ targetType: "ARTICLE", targetId: "a1", content: "好文章" })
        .expect(201)

      expect(res.body.id).toBe("c1")
    })

    it("内容为空返回 400", async () => {
      stubUser("u1")
      await request(app.getHttpServer())
        .post("/api/v1/comment")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ targetType: "ARTICLE", targetId: "a1", content: "" })
        .expect(400)
    })
  })

  // ═══════════════════ 评论列表 ═══════════════════

  describe("GET /api/v1/comment", () => {
    it("返回评论列表", async () => {
      prisma.comment.count.mockResolvedValue(2)
      prisma.comment.findMany.mockResolvedValueOnce([
        { id: "c1", content: "好文章", parentId: null, user: { id: "u1", nickname: "张三", avatar: null } },
        { id: "c2", content: "学到了", parentId: null, user: { id: "u2", nickname: "李四", avatar: null } },
      ])
      prisma.comment.findMany.mockResolvedValue([])

      const res = await request(app.getHttpServer())
        .get("/api/v1/comment?targetType=ARTICLE&targetId=a1&page=1&pageSize=10")
        .expect(200)

      expect(res.body.data).toHaveLength(2)
      expect(res.body.total).toBe(2)
    })
  })

  // ═══════════════════ 编辑评论 ═══════════════════

  describe("PUT /api/v1/comment/:id", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/comment/c1")
        .send({ content: "修改后" })
        .expect(401)
    })

    it("编辑自己的评论成功", async () => {
      stubUser("u1")
      prisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u1" })
      prisma.comment.update.mockResolvedValue({
        id: "c1", content: "修改后", user: { id: "u1", nickname: "张三", avatar: null },
      })

      const res = await request(app.getHttpServer())
        .put("/api/v1/comment/c1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ content: "修改后" })
        .expect(200)

      expect(res.body.content).toBe("修改后")
    })

    it("非作者返回 403", async () => {
      stubUser("u2")
      prisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u1" })

      await request(app.getHttpServer())
        .put("/api/v1/comment/c1")
        .set("Authorization", `Bearer ${authAs("u2")}`)
        .send({ content: "修改后" })
        .expect(403)
    })
  })

  // ═══════════════════ 删除评论 ═══════════════════

  describe("DELETE /api/v1/comment/:id", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .delete("/api/v1/comment/c1")
        .expect(401)
    })

    it("删除自己的评论成功", async () => {
      stubUser("u1")
      prisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u1" })
      prisma.comment.delete.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .delete("/api/v1/comment/c1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })

    it("非作者返回 403", async () => {
      stubUser("u2")
      prisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u1" })

      await request(app.getHttpServer())
        .delete("/api/v1/comment/c1")
        .set("Authorization", `Bearer ${authAs("u2")}`)
        .expect(403)
    })
  })

  // ═══════════════════ 管理员隐藏评论 ═══════════════════

  describe("PUT /api/v1/comment/:id/hide", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/comment/c1/hide")
        .expect(401)
    })

    it("普通用户返回 403", async () => {
      stubUser("u1")
      await request(app.getHttpServer())
        .put("/api/v1/comment/c1/hide")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(403)
    })

    it("SUPER_ADMIN 隐藏成功", async () => {
      stubUser("admin1", ["SUPER_ADMIN"])
      prisma.comment.findUnique.mockResolvedValue({ id: "c1" })
      prisma.comment.update.mockResolvedValue({ id: "c1", status: "HIDDEN" })

      const res = await request(app.getHttpServer())
        .put("/api/v1/comment/c1/hide")
        .set("Authorization", `Bearer ${authAs("admin1")}`)
        .expect(200)

      expect(res.body.status).toBe("HIDDEN")
    })
  })
})
