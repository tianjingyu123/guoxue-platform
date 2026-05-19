import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Circle E2E", () => {
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

  // ═══════════════════ 我的圈子 ═══════════════════

  describe("GET /api/v1/circles/my", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/circles/my")
        .expect(401)
    })

    it("返回我的圈子列表", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.circleMember.findMany.mockResolvedValue([
        {
          circle: { id: "ci1", name: "国学论语圈", cover: null, type: "FREE", memberCount: 100, postCount: 10, updatedAt: new Date().toISOString() },
          role: "MEMBER",
        },
      ])

      const res = await request(app.getHttpServer())
        .get("/api/v1/circles/my")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body).toHaveLength(1)
      expect(res.body[0].circle.name).toBe("国学论语圈")
    })
  })

  // ═══════════════════ 圈子详情 ═══════════════════

  describe("GET /api/v1/circles/:id", () => {
    it("返回圈子详情", async () => {
      prisma.circle.findUnique.mockResolvedValue({
        id: "ci1", name: "国学论语圈", intro: "一起学论语", memberCount: 100, tags: ["论语", "经典"],
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/circles/ci1")
        .expect(200)

      expect(res.body.name).toBe("国学论语圈")
    })

    it("圈子不存在返回 404", async () => {
      prisma.circle.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/circles/nonexistent")
        .expect(404)
    })
  })

  // ═══════════════════ 加入圈子 ═══════════════════

  describe("POST /api/v1/circles/:id/join", () => {
    it("加入成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.circle.findUnique.mockResolvedValue({ id: "ci1", name: "国学论语圈", status: "ACTIVE", type: "FREE" })
      prisma.circleMember.findUnique.mockResolvedValue(null)
      prisma.circleMember.create.mockResolvedValue({ id: "cm1", circleId: "ci1", userId: "u1", role: "MEMBER" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/circles/ci1/join")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(res.body.role).toBe("MEMBER")
    })

    it("重复加入返回错误", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.circle.findUnique.mockResolvedValue({ id: "ci1", status: "ACTIVE" })
      prisma.circleMember.findUnique.mockResolvedValue({ id: "cm1", circleId: "ci1", userId: "u1" })

      await request(app.getHttpServer())
        .post("/api/v1/circles/ci1/join")
        .set("Authorization", `Bearer ${token}`)
        .expect(409)
    })
  })

  // ═══════════════════ 退出圈子 ═══════════════════

  describe("POST /api/v1/circles/:id/leave", () => {
    it("退出成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.circleMember.findUnique.mockResolvedValue({ id: "cm1", circleId: "ci1", userId: "u1", role: "MEMBER" })
      prisma.circleMember.delete.mockResolvedValue({})
      prisma.circle.update.mockResolvedValue({})

      await request(app.getHttpServer())
        .post("/api/v1/circles/ci1/leave")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
    })
  })

  // ═══════════════════ 成员列表 ═══════════════════

  describe("GET /api/v1/circles/:id/members", () => {
    it("返回成员列表", async () => {
      prisma.circleMember.findMany.mockResolvedValue([
        { id: "cm1", userId: "u1", role: "OWNER", user: { id: "u1", nickname: "张三", avatar: null } },
        { id: "cm2", userId: "u2", role: "MEMBER", user: { id: "u2", nickname: "李四", avatar: null } },
      ])
      prisma.circleMember.count.mockResolvedValue(2)

      const res = await request(app.getHttpServer())
        .get("/api/v1/circles/ci1/members?page=1&pageSize=20")
        .expect(200)

      expect(res.body.members).toHaveLength(2)
    })
  })

  // ═══════════════════ 帖子列表 ═══════════════════

  describe("GET /api/v1/circles/:id/posts", () => {
    it("返回帖子列表", async () => {
      prisma.post.findMany.mockResolvedValue([
        { id: "p1", title: "论语的学而篇怎么理解？", viewCount: 50, user: { id: "u1", nickname: "张三" } },
      ])
      prisma.post.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/circles/ci1/posts?page=1&pageSize=10")
        .expect(200)

      expect(res.body.posts).toHaveLength(1)
    })
  })
})
