import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"
import { LiveStreamService } from "../src/modules/live/live-stream.service"
import { quotaFixture } from "./fixtures/circle-capability-quota"

describe("Live E2E", () => {
  let app: INestApplication
  let prisma: any
  let redis: any
  let jwt: JwtService
  let token: string
  let adminToken: string

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    redis = ctx.redis
    jwt = app.get(JwtService)
    app.get(LiveStreamService).callbackScope = jest.fn().mockReturnValue({ domain: "push.example.com", appName: "live" })
    token = jwt.sign({ sub: "u1" })
    adminToken = jwt.sign({ sub: "admin1" })
    prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
  })

  afterAll(async () => {
    await app.close()
  })

  function mockAdminUser() {
    prisma.user.findUnique.mockResolvedValue({ id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
  }

  function mockRegularUser() {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.$queryRaw.mockReset().mockResolvedValue([{ 1: 1 }])
    prisma.$executeRaw = jest.fn().mockRejectedValue(new Error("未声明的原生 SQL 测试写入"))
    prisma.liveRoom.updateMany.mockReset().mockResolvedValue({ count: 1 })
    prisma.liveRoom.findUniqueOrThrow.mockReset()
    mockRegularUser()
  })

  // HTTP 层仅模拟明确的锁与无历史媒体记录；事务/并发语义另由真实 PG 集成测试验证。
  function mockEmptyMediaHistory(actorId?: string, platformRoles: string[] = []) {
    prisma.$executeRaw.mockImplementation(async (parts: TemplateStringsArray) => {
      const sql = parts.join("?")
      if (/^SELECT pg_advisory_xact_lock\(/.test(sql)
        || /^SELECT id FROM "LiveRoom" WHERE id=\? FOR UPDATE$/.test(sql)) return 1
      throw new Error("测试未声明的媒体 SQL 写入")
    })
    prisma.$queryRaw.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
      const sql = parts.join("?")
      if (actorId && values[0] === actorId && /FROM "User" WHERE id=\? FOR SHARE$/.test(sql))
        return [{ id: actorId, status: "ACTIVE", deletedAt: null }]
      if (actorId && values[0] === actorId && /FROM "UserRole"\s+WHERE "userId"=\? ORDER BY id FOR SHARE$/.test(sql))
        return platformRoles.map(roleType => ({ roleType, bindId: null }))
      if (/^SELECT \* FROM "LiveMedia(Evidence|CredentialBoundary)"/.test(sql)) return []
      throw new Error("测试未声明的媒体 SQL 查询")
    })
  }

  function mockOwnerLiveAuthorization(enabled = true) {
    mockEmptyMediaHistory()
    const policy = quotaFixture().authorization.policy
    if (!policy.ok) throw new Error("测试规则不完整")
    prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", deletedAt: null, identityLevel: "L1", roles: [] })
    prisma.circle.findUnique.mockResolvedValue({ id: "c1", ownerId: "u1", status: "ACTIVE", deletedAt: null })
    prisma.circleMember.findFirst.mockResolvedValue({ id: "cm1" })
    prisma.userRole.findMany.mockResolvedValue([])
    prisma.configSystem.findUnique.mockResolvedValue({ id: "config1", configValue: { version: 1, rules: { LIVE: policy.rule } } })
    prisma.$queryRaw.mockImplementation(async (query: TemplateStringsArray | { strings: string[] }) => {
      const sql = ("strings" in query ? query.strings : query).join("?")
      if (/FROM "ConfigSystem"/.test(sql)) return [{ id: "config1" }]
      if (/FROM "Circle"/.test(sql)) return [{ id: "c1" }]
      if (/FROM "User"/.test(sql)) return [{ id: "u1" }]
      if (/FROM "CircleMember"/.test(sql)) return [{ id: "cm1" }]
      if (/FROM "UserRole"/.test(sql)) return []
      if (/FROM "CircleCapabilityGrant"/.test(sql)) return [{ ...quotaFixture().authorization.circleGrant,
        circleId: "c1", ownerId: "u1", applicantId: "u1", enabled, expiresAt: new Date(Date.now() + 3600000) }]
      throw new Error("测试未声明的授权 SQL 查询")
    })
  }

  // ═══════════════════ 直播间 CRUD ═══════════════════

  describe("POST /api/v1/live/rooms", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/live/rooms")
        .send({ title: "直播", hostUserId: "u1" })
        .expect(401)
    })

    it("创建直播间成功", async () => {
      mockOwnerLiveAuthorization()
      prisma.liveRoom.create.mockResolvedValue({ id: "r1", title: "国学直播", products: [] })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "国学直播", hostUserId: "u1", circleId: "c1" })
        .expect(201)
      expect(res.body.id).toBe("r1")
    })

    it("关联课程创建直播间", async () => {
      mockOwnerLiveAuthorization()
      prisma.liveRoom.create.mockResolvedValue({ id: "r2", title: "课程直播", courseId: "co1", products: [] })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "课程直播", hostUserId: "u1", courseId: "co1", circleId: "c1" })
        .expect(201)
      expect(res.body.courseId).toBe("co1")
    })

    it("已停用的圈主发布授权不能创建直播间", async () => {
      mockOwnerLiveAuthorization(false)
      await request(app.getHttpServer()).post("/api/v1/live/rooms")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "拒绝停用授权", hostUserId: "u1", circleId: "c1" }).expect(403)
      expect(prisma.liveRoom.create).not.toHaveBeenCalled()
    })
  })

  describe("GET /api/v1/live/rooms", () => {
    it("获取直播间列表", async () => {
      prisma.liveRoom.findMany.mockResolvedValue([])
      prisma.liveRoom.count.mockResolvedValue(0)
      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms")
        .expect(200)
      expect(res.body.total).toBe(0)
    })

    it("按课程ID过滤直播间", async () => {
      prisma.liveRoom.findMany.mockResolvedValue([{ id: "r1", title: "课程直播", courseId: "co1" }])
      prisma.liveRoom.count.mockResolvedValue(1)
      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms?courseId=co1")
        .expect(200)
      expect(res.body.total).toBe(1)
    })
  })

  describe("GET /api/v1/live/rooms/:id", () => {
    it("获取直播间详情", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", title: "国学直播", user: {}, circle: {}, products: [],
      })
      prisma.liveRoom.update.mockResolvedValue({})
      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms/r1")
        .expect(200)
      expect(res.body.title).toBe("国学直播")
    })

    it("直播间不存在返回 404", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue(null)
      await request(app.getHttpServer())
        .get("/api/v1/live/rooms/nonexistent")
        .expect(404)
    })
  })

  describe("GET /api/v1/live/rooms/:id/comments", () => {
    const circleRoom = {
      id: "r1", hostUserId: "host1", userId: "creator1", circleId: "c1",
      visibility: "CIRCLE_ONLY", auditStatus: "APPROVED", status: "LIVING",
    }

    it("匿名和圈外用户不能读取圈内直播公屏", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue(circleRoom)
      await request(app.getHttpServer()).get("/api/v1/live/rooms/r1/comments").expect(404)

      prisma.circleMember.findFirst.mockResolvedValue(null)
      await request(app.getHttpServer())
        .get("/api/v1/live/rooms/r1/comments")
        .set("Authorization", `Bearer ${token}`)
        .expect(404)
      expect(prisma.comment.findMany).not.toHaveBeenCalled()
    })

    it("圈成员只能读取公开且未软删除评论，页大小最多20", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue(circleRoom)
      prisma.circleMember.findFirst.mockResolvedValue({ id: "cm1" })
      prisma.comment.findMany.mockResolvedValue([{ id: "comment1", status: "PUBLISHED", deletedAt: null }])
      prisma.comment.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms/r1/comments?pageSize=100")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      expect(res.body.pageSize).toBe(20)
      expect(prisma.comment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          targetType: "LIVESTREAM", targetId: "r1", parentId: null,
          status: "PUBLISHED", deletedAt: null,
        },
        include: expect.objectContaining({
          replies: expect.objectContaining({ where: { status: "PUBLISHED", deletedAt: null } }),
        }),
        take: 20,
      }))
    })

    it("watch-context 返回服务端能力布尔且在线头像固定为空", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue(circleRoom)
      prisma.circleMember.findFirst.mockResolvedValue({ id: "cm1" })
      prisma.liveMutedUser.findUnique.mockResolvedValue(null)

      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms/r1/watch-context")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      expect(res.body.viewer).toEqual(expect.objectContaining({
        canComment: true, canLike: true, canGift: true,
      }))
      expect(res.body.interaction.allowGift).toBe(true)
      expect(res.body.online.avatars).toEqual([])
    })
  })

  describe("POST /api/v1/live/rooms/:id/comment|like", () => {
    const circleRoom = {
      id: "r1", hostUserId: "host1", userId: "creator1", circleId: "c1",
      visibility: "CIRCLE_ONLY", auditStatus: "APPROVED", status: "LIVING",
      imGroupId: null,
    }

    it("圈外用户不能写入评论或点赞", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue(circleRoom)
      prisma.circleMember.findFirst.mockResolvedValue(null)

      await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/comment")
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "绕过评论" })
        .expect(404)
      await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/like")
        .set("Authorization", `Bearer ${token}`)
        .expect(404)
      expect(prisma.comment.create).not.toHaveBeenCalled()
      expect(prisma.like.upsert).not.toHaveBeenCalled()
    })

    it("有效圈成员可通过专属端点评论和点赞", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue(circleRoom)
      prisma.circleMember.findFirst.mockResolvedValue({ id: "cm1" })
      prisma.liveMutedUser.findUnique.mockResolvedValue(null)
      prisma.comment.create.mockResolvedValue({ id: "comment1", content: "讲得好" })
      prisma.like.upsert.mockResolvedValue({ id: "like1" })
      prisma.like.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/comment")
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "讲得好" })
        .expect(201)
      const likeRes = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/like")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
      expect(likeRes.body.likeCount).toBe(1)
    })
  })

  describe("PUT /api/v1/live/rooms/:id", () => {
    it("更新直播间成功", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "u1" })
      prisma.liveRoom.update.mockResolvedValue({ id: "r1", title: "新标题" })
      const res = await request(app.getHttpServer())
        .put("/api/v1/live/rooms/r1")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "新标题" })
        .expect(200)
      expect(res.body.title).toBe("新标题")
    })
  })

  describe("DELETE /api/v1/live/rooms/:id", () => {
    it("删除直播间成功", async () => {
      mockAdminUser()
      mockEmptyMediaHistory()
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", hostUserId: "admin1", status: "ENDED" })
      prisma.liveRoom.delete.mockResolvedValue({})
      const res = await request(app.getHttpServer())
        .delete("/api/v1/live/rooms/r1")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ═══════════════════ 直播控制 ═══════════════════

  describe("PUT /api/v1/live/rooms/:id/start", () => {
    it("开始直播成功", async () => {
      mockAdminUser()
      mockEmptyMediaHistory("admin1", ["SUPER_ADMIN"])
      const roomId = "00000000-0000-4000-8000-000000000002"
      const room = { id: roomId, title: "直播", hostUserId: "admin1", circleId: null, orientation: "portrait",
        auditStatus: "APPROVED", status: "WAITING", pushUrl: "", pullUrl: "" }
      const pushUrl = `rtmp://push.example.com/live/room_${roomId}?txTime=${Math.floor(Date.now() / 1000 + 3600).toString(16)}&txSecret=synthetic`
      ;(app.get(LiveStreamService).genPushUrl as jest.Mock).mockReturnValue(pushUrl)
      prisma.liveRoom.findUnique.mockImplementation(async () => ({ ...room }))
      prisma.liveRoom.updateMany.mockImplementation(async ({ data }: { data: object }) => { Object.assign(room, data); return { count: 1 } })
      prisma.liveRoom.findUniqueOrThrow.mockImplementation(async () => ({ ...room }))
      const lockSql = prisma.$executeRaw.getMockImplementation()
      const boundaries: unknown[][] = []
      prisma.$executeRaw.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
        if (parts.join("?").startsWith('INSERT INTO "LiveMediaCredentialBoundary"')) { boundaries.push(values); return 1 }
        return lockSql(parts, ...values)
      })
      const res = await request(app.getHttpServer())
        .put(`/api/v1/live/rooms/${roomId}/start`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
      expect(res.body.status).toBe("LIVING")
      expect(res.body).toHaveProperty("pushUrl")
      expect(boundaries).toHaveLength(1)
      expect(boundaries[0][0]).toBe(roomId)
      expect(JSON.parse(String(boundaries[0][2]))).toEqual({ provider: "CSS", domain: "push.example.com", appName: "live", streamName: `room_${roomId}` })
      expect(JSON.stringify(boundaries)).not.toContain("synthetic")
    })
  })

  describe("PUT /api/v1/live/rooms/:id/end", () => {
    it("结束直播成功", async () => {
      const actorId = "00000000-0000-4000-8000-000000000001"
      prisma.user.findUnique.mockResolvedValue({ id: actorId, status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      mockEmptyMediaHistory(actorId, ["SUPER_ADMIN"])
      const room = { id: "r1", title: "直播", hostUserId: actorId, circleId: null, status: "LIVING" }
      prisma.liveRoom.findUnique.mockImplementation(async () => ({ ...room }))
      prisma.liveRoom.updateMany.mockImplementation(async () => { room.status = "ENDED"; return { count: 1 } })
      prisma.liveRoom.findUniqueOrThrow.mockImplementation(async () => ({ ...room }))
      const res = await request(app.getHttpServer())
        .put("/api/v1/live/rooms/r1/end")
        .set("Authorization", `Bearer ${jwt.sign({ sub: actorId })}`)
        .expect(200)
      expect(res.body.status).toBe("ENDED")
      expect(prisma.liveRoom.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "r1", status: "LIVING", hostUserId: actorId, circleId: null },
        data: expect.objectContaining({ status: "ENDED" }),
      }))
      expect(prisma.liveRoom.update).not.toHaveBeenCalled()
      expect(prisma.$executeRaw.mock.calls.some(([parts]: [TemplateStringsArray]) => parts.join("").includes("INSERT"))).toBe(false)
    })

    it("下播状态抢占失败返回409，不继续生成停流待办", async () => {
      mockAdminUser()
      mockEmptyMediaHistory("admin1", ["SUPER_ADMIN"])
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING", hostUserId: "admin1", circleId: null })
      prisma.liveRoom.updateMany.mockResolvedValue({ count: 0 })
      await request(app.getHttpServer()).put("/api/v1/live/rooms/r1/end")
        .set("Authorization", `Bearer ${adminToken}`).expect(409)
      expect(prisma.liveRoom.findUniqueOrThrow).not.toHaveBeenCalled()
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2)
      expect(prisma.$queryRaw.mock.calls.every(([parts]: [TemplateStringsArray]) =>
        /FROM "User(Role)?"/.test(parts.join("?")))).toBe(true)
    })

    it("登录后管理员被撤权不能下播，也不产生停流请求", async () => {
      mockAdminUser()
      mockEmptyMediaHistory("admin1", [])
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING", hostUserId: "admin1", circleId: null })
      await request(app.getHttpServer()).put("/api/v1/live/rooms/r1/end")
        .set("Authorization", `Bearer ${adminToken}`).expect(403)
      expect(prisma.liveRoom.updateMany).not.toHaveBeenCalled()
      expect(prisma.$executeRaw.mock.calls.some(([parts]: [TemplateStringsArray]) => parts.join("").includes("INSERT"))).toBe(false)
    })
  })

  describe("PUT /api/v1/live/rooms/:id/replay", () => {
    it("设置直播回放成功", async () => {
      mockAdminUser()
      prisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", status: "ENDED", userId: "host1", circleId: null, courseId: null, title: "直播",
      })
      prisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "REPLAY", replayUrl: "https://replay.example.com/v.mp4" })
      const res = await request(app.getHttpServer())
        .put("/api/v1/live/rooms/r1/replay")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ replayUrl: "https://replay.example.com/v.mp4" })
        .expect(200)
      expect(res.body.replayUrl).toBe("https://replay.example.com/v.mp4")
      expect(prisma.liveRoom.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ replayStatus: "PUBLISHED", replayPublishedBy: "admin1" }),
      }))
    })

    it("直播未结束不能发布回放", async () => {
      mockAdminUser()
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING" })
      await request(app.getHttpServer())
        .put("/api/v1/live/rooms/r1/replay")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ replayUrl: "https://replay.example.com/v.mp4" })
        .expect(400)
      expect(prisma.liveRoom.update).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════ 预约 ═══════════════════

  describe("POST /api/v1/live/rooms/:id/book", () => {
    it("预约直播成功", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", status: "WAITING", startTime: new Date(Date.now() + 60 * 60 * 1000),
      })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/book")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
      expect(res.body.booked).toBe(true)
      expect(prisma.liveBooking.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { roomId_userId: { roomId: "r1", userId: "u1" } },
      }))
    })

    it("未配置开播时间不能预约", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "WAITING", startTime: null })
      await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/book")
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
      expect(prisma.liveBooking.upsert).not.toHaveBeenCalled()
    })
  })

  describe("DELETE /api/v1/live/rooms/:id/book", () => {
    it("取消预约成功", async () => {
      const res = await request(app.getHttpServer())
        .delete("/api/v1/live/rooms/r1/book")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      expect(res.body.booked).toBe(false)
    })
  })

  describe("GET /api/v1/live/rooms/:id/bookings", () => {
    it("获取预约人数", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms/r1/bookings")
        .expect(200)
      expect(res.body).toHaveProperty("bookingCount")
    })
  })

  // ═══════════════════ 麦位 ═══════════════════

  describe("POST /api/v1/live/rooms/:id/mics", () => {
    it("上麦成功", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING", hostUserId: "host1" })
      prisma.liveMic.findFirst.mockResolvedValue(null)
      prisma.liveMic.findUnique.mockResolvedValue(null)
      prisma.liveMic.create.mockResolvedValue({ id: "m1", liveRoomId: "r1", userId: "u1", position: 1, status: "OCCUPIED" })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/mics")
        .set("Authorization", `Bearer ${token}`)
        .send({ position: 1 })
        .expect(201)
      expect(res.body.position).toBe(1)
    })
  })

  describe("GET /api/v1/live/rooms/:id/mics", () => {
    it("获取麦位列表", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", hostUserId: "host1" })
      prisma.liveMic.findMany.mockResolvedValue([])
      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms/r1/mics")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  // ═══════════════════ 禁言 ═══════════════════

  describe("POST /api/v1/live/rooms/:id/mute", () => {
    it("禁言用户成功", async () => {
      mockAdminUser()
      prisma.liveMutedUser.upsert.mockResolvedValue({ id: "mu1", liveRoomId: "r1", userId: "u2" })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/mute")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: "u2", durationMinutes: 30 })
        .expect(201)
      expect(res.body.userId).toBe("u2")
    })
  })

  describe("DELETE /api/v1/live/rooms/:id/mute/:userId", () => {
    it("解除禁言成功", async () => {
      mockAdminUser()
      prisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "admin1" })
      prisma.liveMutedUser.deleteMany.mockResolvedValue({})
      const res = await request(app.getHttpServer())
        .delete("/api/v1/live/rooms/r1/mute/u2")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ═══════════════════ 课件 ═══════════════════

  describe("POST /api/v1/live/rooms/:id/slides", () => {
    it("上传课件成功", async () => {
      mockAdminUser()
      prisma.liveSlide.create.mockResolvedValue({ id: "s1", title: "引言", url: "https://cos.example.com/slide.png", type: "IMAGE" })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/slides")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "引言", url: "https://cos.example.com/slide.png" })
        .expect(201)
      expect(res.body.title).toBe("引言")
    })
  })

  // ═══════════════════ 秒杀 ═══════════════════

  describe("POST /api/v1/live/rooms/:id/flash-sales", () => {
    it("创建秒杀活动成功", async () => {
      mockAdminUser()
      prisma.liveFlashSale.create.mockResolvedValue({
        id: "fs1", liveRoomId: "r1", productId: "p1", flashPrice: 99, stock: 10, status: "WAITING",
      })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/flash-sales")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ productId: "p1", flashPrice: 99, stock: 10, startTime: "2026-05-10T10:00:00Z", endTime: "2026-05-10T12:00:00Z" })
        .expect(201)
      expect(res.body.flashPrice).toBe(99)
    })
  })

  // ═══════════════════ 腾讯云回调 ═══════════════════

  describe("POST /api/v1/live/callback", () => {
    it("录制回调处理成功", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({
        id: "r1", courseId: null, title: "直播",
      })
      prisma.liveRoom.update.mockResolvedValue({})
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/callback")
        .send({ stream_id: "room_r1", event_type: 100, video_url: "https://replay.example.com/live.mp4" })
        .expect(200)
      expect(res.body.code).toBe(0)
      expect(prisma.liveRoom.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "r1" },
        data: expect.objectContaining({ replayStatus: "DRAFT", replayUrl: "https://replay.example.com/live.mp4" }),
      }))
    })

    it("按腾讯云 stream_id 识别推流，并忽略 stream_param 中的鉴权参数", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1" })
      redis.getJson.mockResolvedValue(null)
      mockEmptyMediaHistory()
      const lockSql = prisma.$executeRaw.getMockImplementation()
      const snapshots: unknown[] = []
      prisma.$executeRaw.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
        if (parts.join("?").startsWith('INSERT INTO "LiveMediaEvidence"')) {
          snapshots.push(JSON.parse(String(values[1])))
          return 1
        }
        return lockSql(parts, ...values)
      })
      const eventTime = Math.floor(Date.now() / 1000)
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/callback")
        .send({
          stream_id: "room_r1",
          stream_param: "txSecret=secret&txTime=12345678",
          event_type: 1,
          app: "push.example.com", appname: "live", sequence: "synthetic-session-1", event_time: eventTime,
        })
        .expect(200)
      expect(res.body.code).toBe(0)
      expect(prisma.liveRoom.findUnique).toHaveBeenCalledWith({
        where: { id: "r1" },
        select: { id: true },
      })
      expect(snapshots).toEqual([{ version: 1, domain: "push.example.com", appName: "live",
        evidence: { uncertain: false, sessions: [{ sessionHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          beganAtMs: eventTime * 1000, endedAtMs: null }] } }])
      expect(JSON.stringify(snapshots)).not.toMatch(/txSecret|txTime|synthetic-session-1/)
      expect(redis.setJson).toHaveBeenCalledWith("live:css-metrics:r1", expect.objectContaining({ metrics: expect.any(Object) }), expect.any(Number))
      expect(redis.setJson.mock.calls.some(([key]: [string]) => key === "live:stream-status:r1")).toBe(false)
    })
  })

  // ═══════════════════ 课程联动 ═══════════════════

  describe("GET /api/v1/courses/:id/live-rooms", () => {
    it("获取课程关联的直播间列表", async () => {
      prisma.liveRoom.findMany.mockResolvedValue([{ id: "r1", title: "课程直播", courseId: "co1" }])
      prisma.liveRoom.count.mockResolvedValue(1)
      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/co1/live-rooms")
        .expect(200)
      expect(res.body.total).toBe(1)
      expect(res.body.rooms).toHaveLength(1)
    })
  })
})
