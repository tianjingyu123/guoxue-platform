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

  describe("咨询预约准入 HTTP", () => {
    let token: string
    const expertId = "00000000-0000-4000-8000-000000000001"
    const provider = { id: "cm1", circleId: "ci1", userId: expertId, role: "GUEST", callPricePerMinuteCoin: 5, callAvailableHours: [{ start: "09:00", end: "11:00", interval: 60 }] }
    const booking = { circleId: "ci1", slotDate: "2026-09-06", slotStart: "09:00", slotEnd: "10:00" }
    let grantEnabled: boolean
    let serviceAvailable: boolean
    beforeEach(() => {
      grantEnabled = true
      serviceAvailable = true
      token = jwt.sign({ sub: "buyer" })
      const members = [
        { ...provider, expireAt: null, user: { status: "ACTIVE", deletedAt: null } },
        { id: "owner-membership", circleId: "ci1", userId: "owner", role: "OWNER", expireAt: null, user: { status: "ACTIVE", deletedAt: null } },
        { id: "buyer-membership", circleId: "ci1", userId: "buyer", role: "MEMBER", expireAt: null, user: { status: "ACTIVE", deletedAt: null } },
      ]
      const circle = { id: "ci1", ownerId: "owner", status: "ACTIVE", deletedAt: null, owner: { status: "ACTIVE", deletedAt: null, identityLevel: "NONE" } }
      prisma.circle.findMany.mockResolvedValue([circle])
      prisma.circle.findUnique.mockResolvedValue(circle)
      prisma.user.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, status: "ACTIVE", deletedAt: null, roles: [], identityLevel: "NONE" }))
      prisma.userRole.findMany.mockResolvedValue([])
      prisma.configSystem.findUnique.mockResolvedValue(null)
      prisma.circleMember.findMany.mockImplementation(async ({ take }) => take === 1 ? [provider] : members)
      prisma.circleMember.findFirst.mockImplementation(async ({ where }) => {
        if (where.id === provider.id && !serviceAvailable) return null
        return members.find(member => member.userId === where.userId) ?? null
      })
      // 保留真实投影、能力策略和事务授权服务，仅为确切的参数化读库提供夹具。
      prisma.$queryRaw.mockImplementation(async (query, ...args) => {
        const sql = Array.isArray(query) ? query.join("?") : query.sql
        const values = Array.isArray(query) ? args : query.values
        if (sql.includes('FROM "CircleCapabilityGrant"')) {
          const grant = { id: "grant1", circleId: "ci1", ownerId: "owner", applicantId: "admin", subjectUserId: expertId,
            subjectKey: `user:${expertId}`, capability: "AUDIO_QUESTION", source: "PLATFORM_DIRECT", state: "APPROVED",
            enabled: grantEnabled, revision: 1, policyRevision: 1, sequence: 1, maxUnits: 60, maxConcurrent: 1,
            expiresAt: new Date(Date.now() + 3600000) }
          return sql.includes("DISTINCT ON") || values.includes(`user:${expertId}`) ? [grant] : []
        }
        if (sql.includes('FROM "ConfigSystem"') || sql.includes('FROM "UserRole"')) return []
        if (sql.includes('FROM "Circle"')) return [{ id: "ci1" }]
        if (sql.includes('FROM "CircleMember"')) return members.filter(member => values.includes(member.userId)).map(({ id }) => ({ id }))
        if (sql.includes('FROM "User"')) return members.filter(member => values.includes(member.userId)).map(({ userId }) => ({ id: userId }))
        throw new Error("未声明的咨询预约测试 SQL")
      })
      prisma.circleMember.findUnique.mockResolvedValue({ id: "buyer-membership", circleId: "ci1", userId: "buyer", role: "MEMBER" })
      prisma.circleExpertBooking.findMany.mockResolvedValue([])
      prisma.circleExpertBooking.findFirst.mockResolvedValue(null)
      prisma.circleExpertBooking.create.mockResolvedValue({ id: "booking1" })
      prisma.$executeRaw = jest.fn().mockResolvedValue(1)
    })

    it("时段接口真实返回配置时段并禁止共享缓存", async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/circles/expert/${expertId}/slots?date=2026-09-06&circleId=ci1`)
        .set("Authorization", `Bearer ${token}`).expect(200).expect("Cache-Control", "private, no-store")
      expect(res.body.expertId).toBe(expertId)
      expect(res.body.slots).toEqual([
        { start: "09:00", end: "10:00", available: true }, { start: "10:00", end: "11:00", available: true },
      ])
    })

    it("有效时段可创建预约", async () => {
      await request(app.getHttpServer()).post(`/api/v1/circles/expert/${expertId}/bookings`)
        .set("Authorization", `Bearer ${token}`).send(booking).expect(201)
      expect(prisma.circleExpertBooking.create).toHaveBeenCalledWith({ data: expect.objectContaining({ circleId: "ci1", bookerUserId: "buyer" }) })
    })

    it("直接提交未开放时段400且无新预约", async () => {
      await request(app.getHttpServer()).post(`/api/v1/circles/expert/${expertId}/bookings`)
        .set("Authorization", `Bearer ${token}`).send({ ...booking, slotStart: "20:00", slotEnd: "21:00" }).expect(400)
      expect(prisma.circleExpertBooking.create).not.toHaveBeenCalled()
    })

    it("事务重读发现服务不可用403且无新预约", async () => {
      serviceAvailable = false
      await request(app.getHttpServer()).post(`/api/v1/circles/expert/${expertId}/bookings`)
        .set("Authorization", `Bearer ${token}`).send(booking).expect(403)
      expect(prisma.circleExpertBooking.create).not.toHaveBeenCalled()
    })

    it("缺失日期时间400而不是属性访问500", async () => {
      await request(app.getHttpServer()).post(`/api/v1/circles/expert/${expertId}/bookings`)
        .set("Authorization", `Bearer ${token}`).send({}).expect(400)
      expect(prisma.circleExpertBooking.create).not.toHaveBeenCalled()
    })

    it("平台直授停用后时段和预约均隐藏，不能继续新建", async () => {
      grantEnabled = false
      await request(app.getHttpServer()).get(`/api/v1/circles/expert/${expertId}/slots?circleId=ci1`)
        .set("Authorization", `Bearer ${token}`).expect(404)
      await request(app.getHttpServer()).post(`/api/v1/circles/expert/${expertId}/bookings`)
        .set("Authorization", `Bearer ${token}`).send(booking).expect(404)
      expect(prisma.circleExpertBooking.create).not.toHaveBeenCalled()
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
