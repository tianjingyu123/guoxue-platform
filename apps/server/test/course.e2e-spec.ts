import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Course E2E", () => {
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

  // ═══════════════════ 课程列表 ═══════════════════

  describe("GET /api/v1/courses", () => {
    it("分页返回课程列表", async () => {
      prisma.course.findMany.mockResolvedValue([
        { id: "c1", title: "论语入门", price: 99, studentCount: 100 },
      ])
      prisma.course.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses?page=1&pageSize=10")
        .expect(200)

      expect(res.body.total).toBe(1)
      expect(res.body.courses).toHaveLength(1)
    })
  })

  // ═══════════════════ 课程详情 ═══════════════════

  describe("GET /api/v1/courses/:id", () => {
    it("返回课程详情含章节", async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: "c1", title: "论语入门", price: 99, intro: "零基础学论语",
        chapters: [{ id: "ch1", title: "学而篇第一", sortOrder: 1 }],
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/c1")
        .expect(200)

      expect(res.body.title).toBe("论语入门")
    })

    it("课程不存在返回 404", async () => {
      prisma.course.findUnique.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/courses/nonexistent")
        .expect(404)
    })
  })

  // ═══════════════════ 创建课程 ═══════════════════

  describe("POST /api/v1/courses", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/courses")
        .send({ title: "新课程", price: 99, intro: "课程详情" })
        .expect(401)
    })

    it("创建成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.course.create.mockResolvedValue({
        id: "new1", title: "新课程", price: 99,
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/courses")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "新课程", price: 99, intro: "课程详情" })
        .expect(201)

      expect(res.body.id).toBe("new1")
    })
  })

  // ═══════════════════ 章节 ═══════════════════

  describe("GET /api/v1/courses/:id/chapters", () => {
    it("返回章节列表", async () => {
      prisma.course.findUnique.mockResolvedValue({ id: "c1" })
      prisma.courseChapter.findMany.mockResolvedValue([
        { id: "ch1", title: "学而篇第一", sortOrder: 1 },
        { id: "ch2", title: "为政篇第二", sortOrder: 2 },
      ])

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/c1/chapters")
        .expect(200)

      expect(res.body).toHaveLength(2)
    })
  })

  // ═══════════════════ 学习进度 ═══════════════════

  describe("PUT /api/v1/courses/chapters/:chapterId/progress", () => {
    it("更新学习进度", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.courseChapter.findUnique.mockResolvedValue({ id: "ch1", courseId: "c1" })
      prisma.courseProgress.upsert.mockResolvedValue({
        id: "p1", userId: "u1", chapterId: "ch1", completed: true, progress: 100,
      })

      const res = await request(app.getHttpServer())
        .put("/api/v1/courses/chapters/ch1/progress")
        .set("Authorization", `Bearer ${token}`)
        .send({ progress: 100 })
        .expect(200)

      expect(res.body.completed).toBe(true)
    })
  })

  // ═══════════════════ 课程购买 ═══════════════════

  describe("POST /api/v1/courses/:id/purchase", () => {
    it("创建课程购买订单", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.course.findUnique.mockResolvedValue({ id: "c1", price: 99, title: "论语入门" })
      prisma.order.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
      prisma.order.create.mockResolvedValue({ id: "o1", status: "PENDING", amount: 99 })

      const res = await request(app.getHttpServer())
        .post("/api/v1/courses/c1/purchase")
        .set("Authorization", `Bearer ${token}`)
        .expect(201)

      expect(res.body.status).toBe("PENDING")
    })

    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/courses/c1/purchase")
        .expect(401)
    })

    it("已购买返回 400", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.course.findUnique.mockResolvedValue({ id: "c1", price: 99, title: "论语入门" })
      prisma.order.findFirst.mockResolvedValue({ id: "o1", status: "PAID" })

      await request(app.getHttpServer())
        .post("/api/v1/courses/c1/purchase")
        .set("Authorization", `Bearer ${token}`)
        .expect(400)
    })
  })

  describe("GET /api/v1/courses/:id/access", () => {
    it("免费课程返回 true", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.course.findUnique.mockResolvedValue({ price: 0, userId: "u2" })

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/c1/access")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.hasAccess).toBe(true)
    })

    it("未购买返回 false", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.course.findUnique.mockResolvedValue({ price: 99, userId: "u2" })
      prisma.order.findFirst.mockResolvedValue(null)

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/c1/access")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.hasAccess).toBe(false)
    })
  })

  // ═══════════════════ 章节内容访问 ═══════════════════

  describe("GET /api/v1/courses/chapters/:chapterId/content", () => {
    it("免费章节返回完整内容", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.courseChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "试看", content: "免费内容", mediaUrl: null, freeTrial: true,
        course: { id: "c1", price: 99, userId: "u2" },
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/chapters/ch1/content")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.content).toBe("免费内容")
    })

    it("未登录返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/courses/chapters/ch1/content")
        .expect(401)
    })

    it("付费章节未购买返回 403", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.courseChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "付费章节", content: "secret", mediaUrl: null, freeTrial: false,
        course: { id: "c1", price: 99, userId: "u2" },
      })
      prisma.course.findUnique.mockResolvedValue({ price: 99, userId: "u2" })
      prisma.order.findFirst.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/courses/chapters/ch1/content")
        .set("Authorization", `Bearer ${token}`)
        .expect(403)
    })
  })

  // ═══════════════════ 我的课程 ═══════════════════

  describe("GET /api/v1/courses/my", () => {
    it("返回已购课程", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.order.findMany.mockResolvedValue([{ id: "o1", targetId: "c1", paidAt: new Date(), amount: 99 }])
      prisma.order.count.mockResolvedValue(1)
      prisma.course.findMany.mockResolvedValue([{ id: "c1", title: "论语", cover: null, type: "VIDEO", user: { id: "u2", nickname: "讲师", avatar: null } }])

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/my")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.total).toBe(1)
    })
  })

  // ═══════════════════ 学习看板 ═══════════════════

  describe("GET /api/v1/courses/dashboard", () => {
    it("返回学习看板", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.order.count.mockResolvedValue(3)
      prisma.courseProgress.count.mockResolvedValueOnce(12).mockResolvedValueOnce(5)
      prisma.courseWork.count.mockResolvedValue(2)
      prisma.courseProgress.findMany.mockResolvedValue([])

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/dashboard")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.enrolledCourses).toBe(3)
    })
  })

  // ═══════════════════ 课程评价 ═══════════════════

  describe("POST /api/v1/courses/:id/reviews", () => {
    it("创建评价成功", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.course.findUnique.mockResolvedValue({ id: "c1", price: 0, userId: "u1" })
      prisma.courseReview.findFirst.mockResolvedValue(null)
      prisma.courseReview.create.mockResolvedValue({
        id: "r1", rating: 5, content: "很棒", user: { id: "u1", nickname: "学生", avatar: null },
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/courses/c1/reviews")
        .set("Authorization", `Bearer ${token}`)
        .send({ rating: 5, content: "很棒" })
        .expect(201)

      expect(res.body.rating).toBe(5)
    })

    it("未登录返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/courses/c1/reviews")
        .send({ rating: 5, content: "很棒" })
        .expect(401)
    })
  })

  describe("GET /api/v1/courses/:id/reviews", () => {
    it("返回评价列表", async () => {
      prisma.courseReview.findMany.mockResolvedValue([{ id: "r1", rating: 5, content: "好", user: {} }])
      prisma.courseReview.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/c1/reviews")
        .expect(200)

      expect(res.body.total).toBe(1)
    })
  })

  describe("GET /api/v1/courses/:id/rating", () => {
    it("返回评分统计", async () => {
      prisma.courseReview.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 10 })

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/c1/rating")
        .expect(200)

      expect(res.body.avgRating).toBe(4.5)
    })
  })

  // ═══════════════════ 讲师统计 ═══════════════════

  describe("GET /api/v1/courses/:id/stats", () => {
    it("返回课程统计", async () => {
      const token = jwt.sign({ sub: "u1" })
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      prisma.course.findUnique.mockResolvedValue({ id: "c1", userId: "u1", title: "测试课" })
      prisma.order.count.mockResolvedValue(50)
      prisma.courseProgress.count.mockResolvedValue(30)
      prisma.courseChapter.count.mockResolvedValue(10)
      prisma.courseReview.aggregate.mockResolvedValue({ _avg: { rating: 4.2 } })
      prisma.courseReview.count.mockResolvedValue(25)
      prisma.courseWork.count.mockResolvedValue(40)

      const res = await request(app.getHttpServer())
        .get("/api/v1/courses/c1/stats")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.enrollmentCount).toBe(50)
    })

    it("未登录返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/courses/c1/stats")
        .expect(401)
    })
  })
})
