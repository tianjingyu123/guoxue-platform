import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

describe("Classic E2E", () => {
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

  // ═══════════════════ 书籍列表 ═══════════════════

  describe("GET /api/v1/classic/books", () => {
    it("分页返回书籍列表", async () => {
      prisma.classicBook.findMany.mockResolvedValue([
        { id: "b1", title: "论语", author: "孔子", dynasty: "春秋", category: "儒家", cover: null, intro: "儒学经典", chapterCount: 20, viewCount: 1000, createdAt: new Date().toISOString() },
        { id: "b2", title: "道德经", author: "老子", dynasty: "春秋", category: "道家", cover: null, intro: "道可道非常道", chapterCount: 81, viewCount: 2000, createdAt: new Date().toISOString() },
      ])
      prisma.classicBook.count.mockResolvedValue(2)

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books?page=1&pageSize=10")
        .expect(200)

      expect(res.body.books).toHaveLength(2)
      expect(res.body.total).toBe(2)
    })

    it("按分类筛选", async () => {
      prisma.classicBook.findMany.mockResolvedValue([
        { id: "b1", title: "论语", author: "孔子", dynasty: "春秋", category: "儒家", cover: null, intro: "儒学经典", chapterCount: 20, viewCount: 1000, createdAt: new Date().toISOString() },
      ])
      prisma.classicBook.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books?category=儒家&page=1&pageSize=10")
        .expect(200)

      expect(res.body.books).toHaveLength(1)
    })
  })

  // ═══════════════════ 书籍详情 ═══════════════════

  describe("GET /api/v1/classic/books/:id", () => {
    it("返回书籍详情含章节列表", async () => {
      prisma.classicBook.update.mockResolvedValue({})
      prisma.classicBook.findUnique.mockResolvedValue({
        id: "b1", title: "论语", author: "孔子", dynasty: "春秋", category: "儒家",
        cover: null, intro: "儒学经典", chapterCount: 20,
        chapters: [
          { id: "ch1", title: "学而第一", sortOrder: 1 },
          { id: "ch2", title: "为政第二", sortOrder: 2 },
        ],
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1")
        .expect(200)

      expect(res.body.title).toBe("论语")
      expect(res.body.chapters).toHaveLength(2)
    })

    it("不存在的书籍返回 null", async () => {
      prisma.classicBook.findUnique.mockResolvedValue(null)

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/nonexistent")
        .expect(200)

      expect(res.body.id).toBeUndefined()
    })
  })

  // ═══════════════════ 章节内容 ═══════════════════

  describe("GET /api/v1/classic/chapters/:id", () => {
    it("返回章节内容含书名", async () => {
      prisma.classicChapter.findUnique.mockResolvedValue({
        id: "ch1", title: "学而第一", content: "子曰：学而时习之...",
        translation: "孔子说：...", annotation: null,
        book: { id: "b1", title: "论语" },
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/chapters/ch1")
        .expect(200)

      expect(res.body.title).toBe("学而第一")
      expect(res.body.book.title).toBe("论语")
    })
  })

  // ═══════════════════ 创建书籍（需认证） ═══════════════════

  describe("POST /api/v1/classic/books", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/classic/books")
        .send({ title: "新经典", author: "作者", dynasty: "唐" })
        .expect(401)
    })

    it("创建成功", async () => {
      stubUser("u1")
      prisma.classicBook.create.mockResolvedValue({
        id: "b3", title: "庄子", author: "庄子", dynasty: "战国", category: "道家",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/classic/books")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ title: "庄子", author: "庄子", dynasty: "战国", category: "道家" })
        .expect(201)

      expect(res.body.title).toBe("庄子")
    })
  })

  // ═══════════════════ 更新书籍 ═══════════════════

  describe("PUT /api/v1/classic/books/:id", () => {
    it("更新书籍信息", async () => {
      stubUser("u1")
      prisma.classicBook.update.mockResolvedValue({
        id: "b1", title: "论语修订版", author: "孔子及弟子",
      })

      const res = await request(app.getHttpServer())
        .put("/api/v1/classic/books/b1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ title: "论语修订版", author: "孔子及弟子" })
        .expect(200)

      expect(res.body.title).toBe("论语修订版")
    })
  })

  // ═══════════════════ 删除书籍 ═══════════════════

  describe("DELETE /api/v1/classic/books/:id", () => {
    it("删除成功", async () => {
      stubUser("u1")
      prisma.classicBook.delete.mockResolvedValue({ id: "b1" })

      await request(app.getHttpServer())
        .delete("/api/v1/classic/books/b1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)
    })
  })

  // ═══════════════════ 章节管理 ═══════════════════

  describe("POST /api/v1/classic/books/:bookId/chapters", () => {
    it("创建章节", async () => {
      stubUser("u1")
      prisma.classicChapter.create.mockResolvedValue({
        id: "ch3", title: "公冶长第五", content: "...", bookId: "b1",
      })
      prisma.classicBook.update.mockResolvedValue({})

      const res = await request(app.getHttpServer())
        .post("/api/v1/classic/books/b1/chapters")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ title: "公冶长第五", content: "子谓公冶长：可妻也..." })
        .expect(201)

      expect(res.body.title).toBe("公冶长第五")
    })
  })

  // ═══════════════════ 阅读进度 ═══════════════════

  describe("PUT /api/v1/classic/progress/:bookId", () => {
    it("更新阅读进度", async () => {
      stubUser("u1")
      prisma.readingProgress.upsert.mockResolvedValue({
        userId: "u1", bookId: "b1", chapterId: "ch1", progress: 50,
      })

      const res = await request(app.getHttpServer())
        .put("/api/v1/classic/progress/b1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ chapterId: "ch1", progress: 50 })
        .expect(200)

      expect(res.body.progress).toBe(50)
    })
  })

  // ═══════════════════ 书签 ═══════════════════

  describe("POST /api/v1/classic/bookmarks/:bookId", () => {
    it("创建书签", async () => {
      stubUser("u1")
      prisma.bookmark.create.mockResolvedValue({
        id: "bm1", userId: "u1", bookId: "b1", chapterId: "ch1", position: 120, note: "重点",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/classic/bookmarks/b1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ chapterId: "ch1", position: 120, note: "重点" })
        .expect(201)

      expect(res.body.position).toBe(120)
    })
  })

  describe("GET /api/v1/classic/bookmarks", () => {
    it("返回书签列表", async () => {
      stubUser("u1")
      prisma.bookmark.findMany.mockResolvedValue([
        { id: "bm1", bookId: "b1", chapterId: "ch1", position: 120, note: "重点",
          book: { title: "论语" }, chapter: { title: "学而第一" } },
      ])

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/bookmarks")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body).toHaveLength(1)
    })
  })

  describe("DELETE /api/v1/classic/bookmarks/:id", () => {
    it("删除书签", async () => {
      stubUser("u1")
      prisma.bookmark.delete.mockResolvedValue({ id: "bm1" })

      await request(app.getHttpServer())
        .delete("/api/v1/classic/bookmarks/bm1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)
    })
  })
})
