import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Data Isolation E2E", () => {
  let app: INestApplication
  let prisma: any
  let jwt: JwtService

  const STATION_A = "station-a-001"
  const STATION_B = "station-b-002"

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

  // ═══════════════════ 内容管理 station 过滤 ═══════════════════

  describe("Content stationId 过滤", () => {
    it("带 stationId 查询仅返回该分站内容", async () => {
      prisma.content.findMany.mockResolvedValue([{ id: "c1", title: "分站A文章", stationId: STATION_A }])
      prisma.content.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get(`/api/v1/contents?stationId=${STATION_A}`)
        .expect(200)

      expect(res.body.data).toHaveLength(1)
      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_A }) }),
      )
    })

    it("匿名查询不带 stationId 只返回各分站已发布内容", async () => {
      prisma.content.findMany.mockResolvedValue([
        { id: "c1", stationId: STATION_A },
        { id: "c2", stationId: STATION_B },
        { id: "c3", stationId: null },
      ])
      prisma.content.count.mockResolvedValue(3)

      const res = await request(app.getHttpServer())
        .get("/api/v1/contents")
        .expect(200)

      expect(res.body.total).toBe(3)
      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PUBLISHED" } }),
      )
    })

    it("不同分站查询结果互不干扰", async () => {
      prisma.content.findMany.mockResolvedValue([{ id: "c2", stationId: STATION_B }])
      prisma.content.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get(`/api/v1/contents?stationId=${STATION_B}`)
        .expect(200)

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_B }) }),
      )
    })
  })

  // ═══════════════════ 商城商品 station 过滤 ═══════════════════

  describe("Product stationId 过滤", () => {
    it("带 stationId 仅返回该分站商品", async () => {
      prisma.product.findMany.mockResolvedValue([{ id: "p1", title: "分站A商品", stationId: STATION_A }])
      prisma.product.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get(`/api/v1/shop/products?stationId=${STATION_A}`)
        .expect(200)

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_A }) }),
      )
    })
  })

  // ═══════════════════ 课程 station 过滤 ═══════════════════

  describe("Course stationId 过滤", () => {
    it("带 stationId 仅返回该分站课程", async () => {
      prisma.course.findMany.mockResolvedValue([{ id: "co1", title: "分站A课程", stationId: STATION_A }])
      prisma.course.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get(`/api/v1/courses?stationId=${STATION_A}`)
        .expect(200)

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_A }) }),
      )
    })
  })

  // ═══════════════════ 文章 station 过滤 ═══════════════════

  describe("Article stationId 过滤", () => {
    it("带 stationId 仅返回该分站文章", async () => {
      prisma.article.findMany.mockResolvedValue([{ id: "a1", title: "分站A文章", stationId: STATION_A }])
      prisma.article.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get(`/api/v1/articles?stationId=${STATION_A}`)
        .expect(200)

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_A }) }),
      )
    })
  })

  // ═══════════════════ 圈子 station 过滤 ═══════════════════

  describe("Circle stationId 过滤", () => {
    it("带 stationId 仅返回该分站圈子", async () => {
      prisma.circle.findMany.mockResolvedValue([{ id: "ci1", name: "分站A圈子", stationId: STATION_A }])
      prisma.circle.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get(`/api/v1/circles?stationId=${STATION_A}`)
        .expect(200)

      expect(prisma.circle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_A }) }),
      )
    })
  })

  // ═══════════════════ 视频 station 过滤 ═══════════════════

  describe("Video stationId 过滤", () => {
    it("带 stationId 仅返回该分站视频", async () => {
      prisma.video.findMany.mockResolvedValue([{ id: "v1", title: "分站A视频", stationId: STATION_A }])
      prisma.video.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get(`/api/v1/videos?stationId=${STATION_A}`)
        .expect(200)

      expect(prisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_A }) }),
      )
    })
  })

  // ═══════════════════ Header x-station-id 优先 ═══════════════════

  describe("Header x-station-id 优先级", () => {
    it("Header 传入时优先于 Query 参数", async () => {
      prisma.article.findMany.mockResolvedValue([{ id: "a1", title: "分站B文章", stationId: STATION_B }])
      prisma.article.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get(`/api/v1/articles?stationId=${STATION_A}`)
        .set("x-station-id", STATION_B)
        .expect(200)

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_B }) }),
      )
    })

    it("仅 Header 传入时直接生效", async () => {
      prisma.video.findMany.mockResolvedValue([{ id: "v1", title: "分站A视频", stationId: STATION_A }])
      prisma.video.count.mockResolvedValue(1)

      await request(app.getHttpServer())
        .get("/api/v1/videos")
        .set("x-station-id", STATION_A)
        .expect(200)

      expect(prisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: STATION_A }) }),
      )
    })
  })

  // ═══════════════════ 创建时绑定 stationId ═══════════════════

  describe("创建内容时绑定 stationId", () => {
    it("创建 content 时可指定 stationId", async () => {
      const token = jwt.sign({ sub: "u1" })

      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [{ roleType: "OPERATION_ADMIN" }],
      })
      prisma.content.create.mockResolvedValue({
        id: "new1", title: "分站内容", stationId: STATION_A,
      })
      prisma.auditLog.create.mockResolvedValue({})

      await request(app.getHttpServer())
        .post("/api/v1/contents")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "分站内容", type: "ARTICLE", body: "正文", stationId: STATION_A })
        .expect(201)

      expect(prisma.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stationId: STATION_A }),
        }),
      )
    })
  })
})
