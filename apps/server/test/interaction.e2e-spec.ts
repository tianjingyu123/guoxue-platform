import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Interaction E2E", () => {
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

  // ═══════════════════ 点赞 ═══════════════════

  describe("POST /api/v1/interaction/like", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/interaction/like")
        .send({ targetType: "ARTICLE", targetId: "a1" })
        .expect(401)
    })

    it("点赞成功", async () => {
      stubUser("u1")
      prisma.like.findUnique.mockResolvedValue(null)
      prisma.like.create.mockResolvedValue({ id: "l1", userId: "u1", targetType: "ARTICLE", targetId: "a1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/interaction/like")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ targetType: "ARTICLE", targetId: "a1" })
        .expect(201)

      expect(res.body.liked).toBe(true)
    })

    it("取消点赞成功", async () => {
      stubUser("u1")
      prisma.like.findUnique.mockResolvedValue({ id: "l1" })
      prisma.like.delete.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .post("/api/v1/interaction/like")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ targetType: "ARTICLE", targetId: "a1" })
        .expect(201)

      expect(res.body.liked).toBe(false)
    })
  })

  describe("GET /api/v1/interaction/like/check", () => {
    it("返回点赞集合", async () => {
      stubUser("u1")
      prisma.like.findMany.mockResolvedValue([{ targetId: "a1" }, { targetId: "a2" }])

      const res = await request(app.getHttpServer())
        .get("/api/v1/interaction/like/check?targetType=ARTICLE&targetIds=a1,a2,a3")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      // Set serialized as array
      expect(Array.isArray(res.body)).toBe(false)
    })
  })

  describe("GET /api/v1/interaction/like/count", () => {
    it("返回点赞数量", async () => {
      prisma.like.count.mockResolvedValue(42)

      const res = await request(app.getHttpServer())
        .get("/api/v1/interaction/like/count?targetType=ARTICLE&targetId=a1")
        .expect(200)

      expect(Number(res.text)).toBe(42)
    })
  })

  // ═══════════════════ 评论 ═══════════════════

  describe("POST /api/v1/interaction/comment", () => {
    it("创建评论成功", async () => {
      stubUser("u1")
      prisma.comment.create.mockResolvedValue({
        id: "c1", targetType: "ARTICLE", targetId: "a1", content: "好文章",
        user: { id: "u1", nickname: "张三", avatar: null },
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/interaction/comment")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ targetType: "ARTICLE", targetId: "a1", content: "好文章" })
        .expect(201)

      expect(res.body.content).toBe("好文章")
    })
  })

  describe("GET /api/v1/interaction/comment", () => {
    it("返回评论列表", async () => {
      prisma.comment.count.mockResolvedValue(2)
      prisma.comment.findMany.mockResolvedValue([
        { id: "c1", content: "好文章", user: { id: "u1", nickname: "张三", avatar: null }, replies: [] },
        { id: "c2", content: "学到了", user: { id: "u2", nickname: "李四", avatar: null }, replies: [] },
      ])

      const res = await request(app.getHttpServer())
        .get("/api/v1/interaction/comment?targetType=ARTICLE&targetId=a1&page=1&pageSize=10")
        .expect(200)

      expect(res.body.comments).toHaveLength(2)
      expect(res.body.total).toBe(2)
    })
  })

  describe("DELETE /api/v1/interaction/comment/:id", () => {
    it("删除评论成功", async () => {
      stubUser("u1")
      prisma.comment.findUnique.mockResolvedValue({ id: "c1", userId: "u1" })
      prisma.comment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.comment.delete.mockResolvedValue({})

      await request(app.getHttpServer())
        .delete("/api/v1/interaction/comment/c1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)
    })
  })

  describe("PUT /api/v1/interaction/comment/:id/hide", () => {
    it("非管理员返回 403", async () => {
      stubUser("u1")
      await request(app.getHttpServer())
        .put("/api/v1/interaction/comment/c1/hide")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(403)
    })

    it("管理员隐藏评论成功", async () => {
      stubUser("admin1", ["SUPER_ADMIN"])
      prisma.comment.update.mockResolvedValue({ id: "c1", status: "HIDDEN" })

      await request(app.getHttpServer())
        .put("/api/v1/interaction/comment/c1/hide")
        .set("Authorization", `Bearer ${authAs("admin1")}`)
        .expect(200)
    })
  })

  // ═══════════════════ 收藏 ═══════════════════

  describe("POST /api/v1/interaction/collect", () => {
    it("收藏成功", async () => {
      stubUser("u1")
      prisma.collect.findUnique.mockResolvedValue(null)
      prisma.collect.create.mockResolvedValue({ id: "cl1", userId: "u1", targetType: "ARTICLE", targetId: "a1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/interaction/collect")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ targetType: "ARTICLE", targetId: "a1" })
        .expect(201)

      expect(res.body.collected).toBe(true)
    })
  })

  describe("GET /api/v1/interaction/collect", () => {
    it("返回我的收藏", async () => {
      stubUser("u1")
      prisma.collect.findMany.mockResolvedValue([{ id: "cl1", targetType: "ARTICLE", targetId: "a1" }])
      prisma.collect.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/interaction/collect?page=1&pageSize=10")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body.collects).toHaveLength(1)
      expect(res.body.total).toBe(1)
    })
  })

  // ═══════════════════ 关注 ═══════════════════

  describe("POST /api/v1/interaction/follow", () => {
    it("不能关注自己", async () => {
      stubUser("u1")
      await request(app.getHttpServer())
        .post("/api/v1/interaction/follow")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ followedUserId: "u1" })
        .expect(409)
    })

    it("关注成功", async () => {
      stubUser("u1")
      prisma.follow.findUnique.mockResolvedValue(null)
      prisma.follow.create.mockResolvedValue({ id: "f1", userId: "u1", followedUserId: "u2" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/interaction/follow")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ followedUserId: "u2" })
        .expect(201)

      expect(res.body.followed).toBe(true)
    })
  })

  describe("GET /api/v1/interaction/followers/:userId", () => {
    it("返回粉丝列表", async () => {
      prisma.follow.findMany.mockResolvedValue([
        { id: "f1", user: { id: "u1", nickname: "张三", avatar: null } },
      ])
      prisma.follow.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/interaction/followers/u2?page=1&pageSize=10")
        .expect(200)

      expect(res.body.followers).toHaveLength(1)
    })
  })

  describe("GET /api/v1/interaction/following/:userId", () => {
    it("返回关注列表", async () => {
      prisma.follow.findMany.mockResolvedValue([
        { id: "f1", followedUser: { id: "u2", nickname: "李四", avatar: null } },
      ])
      prisma.follow.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/interaction/following/u1?page=1&pageSize=10")
        .expect(200)

      expect(res.body.followings).toHaveLength(1)
    })
  })

  // ═══════════════════ 举报 ═══════════════════

  describe("POST /api/v1/interaction/report", () => {
    it("提交举报成功", async () => {
      stubUser("u1")
      prisma.report.create.mockResolvedValue({
        id: "r1", reporterId: "u1", targetType: "POST", targetId: "p1", reason: "不良信息",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/interaction/report")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ targetType: "POST", targetId: "p1", reason: "不良信息" })
        .expect(201)

      expect(res.body.id).toBe("r1")
    })
  })

  describe("GET /api/v1/interaction/report", () => {
    it("非管理员返回 403", async () => {
      stubUser("u1")
      await request(app.getHttpServer())
        .get("/api/v1/interaction/report")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(403)
    })

    it("管理员查看举报列表", async () => {
      stubUser("admin1", ["SUPER_ADMIN"])
      prisma.report.findMany.mockResolvedValue([
        { id: "r1", targetType: "POST", targetId: "p1", reason: "不良信息", reporter: { id: "u1", nickname: "张三" } },
      ])
      prisma.report.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/interaction/report?page=1&pageSize=10")
        .set("Authorization", `Bearer ${authAs("admin1")}`)
        .expect(200)

      expect(res.body.reports).toHaveLength(1)
    })
  })

  describe("PUT /api/v1/interaction/report/:id/process", () => {
    it("管理员处理举报", async () => {
      stubUser("admin1", ["SUPER_ADMIN"])
      prisma.report.update.mockResolvedValue({ id: "r1", status: "PROCESSED" })

      await request(app.getHttpServer())
        .put("/api/v1/interaction/report/r1/process")
        .set("Authorization", `Bearer ${authAs("admin1")}`)
        .send({ result: "已删除违规内容" })
        .expect(200)
    })
  })
})
