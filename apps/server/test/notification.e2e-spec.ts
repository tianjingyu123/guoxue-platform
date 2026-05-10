import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Notification E2E", () => {
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

  // ═══════════════════ 我的通知列表 ═══════════════════

  describe("GET /api/v1/notifications", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/notifications")
        .expect(401)
    })

    it("返回通知列表和未读数", async () => {
      stubUser("u1")
      prisma.notification.findMany.mockResolvedValue([
        { id: "n1", type: "COMMENT", title: "新评论", content: "有人评论了你的文章", isRead: false, targetType: "ARTICLE", targetId: "a1", createdAt: new Date().toISOString() },
        { id: "n2", type: "LIKE", title: "点赞", content: "张三赞了你的帖子", isRead: true, targetType: "POST", targetId: "p1", createdAt: new Date().toISOString() },
      ])
      prisma.notification.count.mockResolvedValueOnce(2) // total
      prisma.notification.count.mockResolvedValueOnce(1) // unread

      const res = await request(app.getHttpServer())
        .get("/api/v1/notifications?page=1&pageSize=10")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body.notifications).toHaveLength(2)
      expect(res.body.total).toBe(2)
      expect(res.body.unreadCount).toBe(1)
    })
  })

  // ═══════════════════ 未读数量 ═══════════════════

  describe("GET /api/v1/notifications/unread-count", () => {
    it("返回未读数量", async () => {
      stubUser("u1")
      prisma.notification.count.mockResolvedValue(5)

      const res = await request(app.getHttpServer())
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body.unreadCount).toBe(5)
    })
  })

  // ═══════════════════ 标记已读 ═══════════════════

  describe("PUT /api/v1/notifications/:id/read", () => {
    it("标记单条已读", async () => {
      stubUser("u1")
      prisma.notification.findUnique.mockResolvedValue({ userId: "u1" })
      prisma.notification.update.mockResolvedValue({
        id: "n1", isRead: true,
      })

      const res = await request(app.getHttpServer())
        .put("/api/v1/notifications/n1/read")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body.isRead).toBe(true)
    })
  })

  // ═══════════════════ 全部已读 ═══════════════════

  describe("PUT /api/v1/notifications/read-all", () => {
    it("全部标记已读", async () => {
      stubUser("u1")
      prisma.notification.updateMany.mockResolvedValue({ count: 3 })

      const res = await request(app.getHttpServer())
        .put("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })

  // ═══════════════════ 发送通知（管理员） ═══════════════════

  describe("POST /api/v1/notifications", () => {
    it("非管理员返回 403", async () => {
      stubUser("u1")
      await request(app.getHttpServer())
        .post("/api/v1/notifications")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ userId: "u2", type: "SYSTEM", title: "系统通知", content: "测试内容" })
        .expect(403)
    })

    it("管理员发送通知成功", async () => {
      stubUser("admin1", ["SUPER_ADMIN"])
      prisma.notification.create.mockResolvedValue({
        id: "n3", userId: "u2", type: "SYSTEM", title: "系统通知", content: "测试内容",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/notifications")
        .set("Authorization", `Bearer ${authAs("admin1")}`)
        .send({ userId: "u2", type: "SYSTEM", title: "系统通知", content: "测试内容" })
        .expect(201)

      expect(res.body.type).toBe("SYSTEM")
    })
  })
})
