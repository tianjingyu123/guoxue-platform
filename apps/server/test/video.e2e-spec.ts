import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Video E2E", () => {
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

  // ═══════════════════ 视频列表 ═══════════════════

  describe("GET /api/v1/videos", () => {
    it("分页返回视频列表", async () => {
      prisma.video.findMany.mockResolvedValue([
        { id: "v1", title: "国学讲座", videoUrl: "https://example.com/v.mp4", viewCount: 100 },
      ])
      prisma.video.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/videos?page=1&pageSize=10")
        .expect(200)

      expect(res.body.total).toBe(1)
      expect(res.body.videos).toHaveLength(1)
    })
  })

  describe("GET /api/v1/videos/:id", () => {
    it("返回视频详情", async () => {
      prisma.video.findUnique.mockResolvedValue({
        id: "v1", title: "国学研究", videoUrl: "https://v.example.com/1.mp4",
        user: { id: "u1", nickname: "讲师", avatar: null },
        circle: null, products: [],
      })
      prisma.video.update.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .get("/api/v1/videos/v1")
        .expect(200)

      expect(res.body.title).toBe("国学研究")
    })

    it("视频不存在返回 404", async () => {
      prisma.video.findUnique.mockResolvedValue(null)
      await request(app.getHttpServer())
        .get("/api/v1/videos/nonexistent")
        .expect(404)
    })
  })

  // ═══════════════════ 创建视频 ═══════════════════

  describe("POST /api/v1/videos", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/videos")
        .send({ videoUrl: "https://example.com/v.mp4" })
        .expect(401)
    })

    it("创建视频成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      prisma.video.create.mockResolvedValue({ id: "v1", title: "新课", videoUrl: "https://example.com/v.mp4" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/videos")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "新课", videoUrl: "https://example.com/v.mp4" })
        .expect(201)

      expect(res.body.id).toBe("v1")
    })
  })

  // ═══════════════════ VOD 上传签名 ═══════════════════

  describe("POST /api/v1/videos/vod/upload-signature", () => {
    it("获取上传签名成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })

      const res = await request(app.getHttpServer())
        .post("/api/v1/videos/vod/upload-signature")
        .set("Authorization", `Bearer ${token}`)
        .send({ videoName: "test.mp4", expireSeconds: 3600 })
        .expect(201)

      expect(res.body).toHaveProperty("signature")
    })
  })

  // ═══════════════════ VOD 播放鉴权 ═══════════════════

  describe("GET /api/v1/videos/vod/play-signature/:fileId", () => {
    it("获取播放签名成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      const res = await request(app.getHttpServer())
        .get("/api/v1/videos/vod/play-signature/file123?expire=7200")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body).toHaveProperty("psign")
    })
  })

  // ═══════════════════ VOD URL拉取上传 ═══════════════════

  describe("POST /api/v1/videos/vod/pull-upload", () => {
    it("拉取上传成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })

      const res = await request(app.getHttpServer())
        .post("/api/v1/videos/vod/pull-upload")
        .set("Authorization", `Bearer ${token}`)
        .send({
          urls: [{ url: "https://example.com/video.mp4", fileName: "国学讲座" }],
          procedure: "SimpleHlsEncrypt",
        })
        .expect(201)

      expect(res.body).toHaveProperty("TaskId")
    })
  })

  // ═══════════════════ VOD 媒资处理 ═══════════════════

  describe("POST /api/v1/videos/vod/process/:fileId", () => {
    it("发起转码处理成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })

      const res = await request(app.getHttpServer())
        .post("/api/v1/videos/vod/process/file123")
        .set("Authorization", `Bearer ${token}`)
        .send({ transcodeDefinitions: [10, 20, 30] })
        .expect(201)

      expect(res.body).toHaveProperty("TaskId")
    })
  })

  // ═══════════════════ VOD 视频剪辑 ═══════════════════

  describe("POST /api/v1/videos/vod/clip", () => {
    it("剪辑视频成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })

      const res = await request(app.getHttpServer())
        .post("/api/v1/videos/vod/clip")
        .set("Authorization", `Bearer ${token}`)
        .send({ fileId: "file123", startTimeOffset: 10, endTimeOffset: 60, clipName: "精彩片段" })
        .expect(201)

      expect(res.body).toHaveProperty("TaskId")
    })
  })

  // ═══════════════════ VOD 媒资信息 ═══════════════════

  describe("GET /api/v1/videos/vod/media/:fileId", () => {
    it("获取媒资信息成功", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/videos/vod/media/file123")
        .expect(200)

      expect(res.body).toHaveProperty("MediaInfoSet")
    })
  })

  // ═══════════════════ VOD 回调 ═══════════════════

  describe("POST /api/v1/videos/vod/callback", () => {
    it("回调处理成功", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/videos/vod/callback")
        .send({ EventType: "TranscodeComplete", FileId: "f1", Status: "FINISH" })
        .expect(201)

      expect(res.body.code).toBe(0)
    })
  })

  // ═══════════════════ 播放统计 ═══════════════════

  describe("GET /api/v1/videos/vod/playback-stats/:fileId", () => {
    it("获取播放统计成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })

      const res = await request(app.getHttpServer())
        .get("/api/v1/videos/vod/playback-stats/file123?startDate=2026-05-01&endDate=2026-05-10")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body).toHaveProperty("PlayStatFileSet")
    })
  })

  // ═══════════════════ 视频收藏 ═══════════════════

  describe("POST /api/v1/videos/:id/collect", () => {
    it("收藏视频成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      prisma.collect.findFirst.mockResolvedValue(null)
      prisma.collect.create.mockResolvedValue({ id: "c1" })
      prisma.video.update.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .post("/api/v1/videos/v1/collect")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(res.body.collected).toBe(true)
    })
  })

  // ═══════════════════ 视频分享 ═══════════════════

  describe("POST /api/v1/videos/:id/share", () => {
    it("记录分享成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] })
      prisma.video.update.mockResolvedValue({ id: "v1", shareCount: 5 })

      const res = await request(app.getHttpServer())
        .post("/api/v1/videos/v1/share")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(res.body.shareCount).toBe(5)
    })
  })
})
