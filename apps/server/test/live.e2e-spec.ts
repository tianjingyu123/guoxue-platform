import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Live E2E", () => {
  let app: INestApplication
  let prisma: any
  let jwt: JwtService
  let token: string
  let adminToken: string

  beforeAll(async () => {
    const ctx = await createE2eApp()
    app = ctx.app
    prisma = ctx.prisma
    jwt = app.get(JwtService)
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
    mockRegularUser()
  })

  // ═══════════════════ 直播间 CRUD ═══════════════════

  describe("POST /api/v1/live/rooms", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/live/rooms")
        .send({ title: "直播", hostUserId: "u1" })
        .expect(401)
    })

    it("创建直播间成功", async () => {
      prisma.liveRoom.create.mockResolvedValue({ id: "r1", title: "国学直播", products: [] })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "国学直播", hostUserId: "u1" })
        .expect(201)
      expect(res.body.id).toBe("r1")
    })

    it("关联课程创建直播间", async () => {
      prisma.liveRoom.create.mockResolvedValue({ id: "r2", title: "课程直播", courseId: "co1", products: [] })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "课程直播", hostUserId: "u1", courseId: "co1" })
        .expect(201)
      expect(res.body.courseId).toBe("co1")
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
      prisma.liveRoom.findUnique.mockResolvedValue({ hostUserId: "admin1" })
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
      prisma.liveRoom.findUnique.mockResolvedValueOnce({ id: "r1", status: "WAITING" }).mockResolvedValueOnce({ status: "WAITING" })
      prisma.liveRoom.update.mockResolvedValue({
        id: "r1", status: "LIVING", pushUrl: "rtmp://push.example.com", pullUrl: "{}",
      })
      const res = await request(app.getHttpServer())
        .put("/api/v1/live/rooms/r1/start")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
      expect(res.body.status).toBe("LIVING")
      expect(res.body).toHaveProperty("pushUrl")
    })
  })

  describe("PUT /api/v1/live/rooms/:id/end", () => {
    it("结束直播成功", async () => {
      mockAdminUser()
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", title: "直播", status: "LIVING" })
      prisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "ENDED" })
      const res = await request(app.getHttpServer())
        .put("/api/v1/live/rooms/r1/end")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
      expect(res.body.status).toBe("ENDED")
    })
  })

  describe("PUT /api/v1/live/rooms/:id/replay", () => {
    it("设置直播回放成功", async () => {
      mockAdminUser()
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "LIVING" })
      prisma.liveRoom.update.mockResolvedValue({ id: "r1", status: "REPLAY", replayUrl: "https://replay.example.com/v.mp4" })
      const res = await request(app.getHttpServer())
        .put("/api/v1/live/rooms/r1/replay")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ replayUrl: "https://replay.example.com/v.mp4" })
        .expect(200)
      expect(res.body.replayUrl).toBe("https://replay.example.com/v.mp4")
    })
  })

  // ═══════════════════ 预约 ═══════════════════

  describe("POST /api/v1/live/rooms/:id/book", () => {
    it("预约直播成功", async () => {
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1", status: "WAITING" })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/book")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
      expect(res.body.booked).toBe(true)
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
      prisma.liveRoom.findUnique.mockResolvedValue({ id: "r1" })
      prisma.liveMic.findUnique.mockResolvedValue(null)
      prisma.liveMic.create.mockResolvedValue({ id: "m1", liveRoomId: "r1", userId: "u1", position: 1, status: "OCCUPIED" })
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/rooms/r1/mics")
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: "u1", position: 1 })
        .expect(201)
      expect(res.body.position).toBe(1)
    })
  })

  describe("GET /api/v1/live/rooms/:id/mics", () => {
    it("获取麦位列表", async () => {
      prisma.liveMic.findMany.mockResolvedValue([])
      const res = await request(app.getHttpServer())
        .get("/api/v1/live/rooms/r1/mics")
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
        .send({ stream_param: "room_r1", event_type: 100, video_url: "https://replay.example.com/live.mp4" })
        .expect(201)
      expect(res.body.code).toBe(0)
    })

    it("推流回调处理成功", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/live/callback")
        .send({ stream_param: "room_r1", event_type: 1 })
        .expect(201)
      expect(res.body.code).toBe(0)
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
