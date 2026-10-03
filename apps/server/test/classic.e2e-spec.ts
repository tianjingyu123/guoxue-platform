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
      prisma.classicBook.findFirst.mockResolvedValue({
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

    it("不存在的书籍返回 404", async () => {
      prisma.classicBook.findFirst.mockResolvedValue(null)

      await request(app.getHttpServer())
        .get("/api/v1/classic/books/nonexistent")
        .expect(404)
    })
  })

  // ═══════════════════ 章节内容 ═══════════════════

  describe("GET /api/v1/classic/chapters/:id", () => {
    it("返回章节内容含书名", async () => {
      prisma.classicChapter.findFirst.mockResolvedValue({
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
      stubUser("u1", ["SUPER_ADMIN"])
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
      stubUser("u1", ["SUPER_ADMIN"])
      prisma.classicBook.findUnique.mockResolvedValue({ id: "b1", title: "论语" })
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
      stubUser("u1", ["SUPER_ADMIN"])
      prisma.classicBook.findUnique.mockResolvedValue({ id: "b1", title: "论语" })
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
      stubUser("u1", ["SUPER_ADMIN"])
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
    it("返回书签列表（分页）", async () => {
      stubUser("u1")
      prisma.bookmark.findMany.mockResolvedValue([
        { id: "bm1", bookId: "b1", chapterId: "ch1", position: 120, note: "重点",
          book: { title: "论语", cover: null }, chapter: { title: "学而第一", sortOrder: 1 } },
      ])
      prisma.bookmark.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/bookmarks")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.total).toBe(1)
    })
  })

  describe("DELETE /api/v1/classic/bookmarks/:id", () => {
    it("删除书签", async () => {
      stubUser("u1")
      prisma.bookmark.findFirst.mockResolvedValue({ id: "bm1", userId: "u1" })
      prisma.bookmark.delete.mockResolvedValue({ id: "bm1" })

      await request(app.getHttpServer())
        .delete("/api/v1/classic/bookmarks/bm1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)
    })
  })

  // ═══════════════════ 原图对照 ═══════════════════

  describe("GET /api/v1/classic/books/:id/images", () => {
    it("返回书籍所有页面图像（分页）", async () => {
      prisma.classicBook.findFirst.mockResolvedValue({ id: "b1" })
      prisma.classicImage.findMany.mockResolvedValue([
        { id: "img1", pageNumber: 1, label: "第1页", iiifUrl: "http://iiif.example.com/1", width: 2400, height: 3200, source: "harvard" },
      ])
      prisma.classicImage.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1/images")
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].pageNumber).toBe(1)
      expect(res.body.total).toBe(1)
    })
  })

  describe("GET /api/v1/classic/books/:id/images/:page", () => {
    it("返回单页图像含OCR坐标", async () => {
      prisma.classicBook.findFirst.mockResolvedValue({ id: "b1" })
      prisma.classicImage.findUnique.mockResolvedValue({
        id: "img1", pageNumber: 1, iiifUrl: "http://iiif.example.com/1",
        ocrTexts: [{ content: "子曰", x: 100, y: 50, w: 200, h: 30, lineNumber: 1, charIndex: 1 }],
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1/images/1")
        .expect(200)

      expect(res.body.ocrTexts).toHaveLength(1)
    })
  })

  describe("GET /api/v1/classic/books/:id/manifest", () => {
    it("返回 IIIF Manifest", async () => {
      prisma.classicImage.findMany.mockResolvedValue([
        { id: "img1", pageNumber: 1, label: "第1页", iiifUrl: "http://iiif.example.com/1", width: 2400, height: 3200 },
      ])
      prisma.classicBook.findFirst.mockResolvedValue({ id: "b1", title: "论语", author: "孔子" })

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1/manifest")
        .expect(200)

      expect(res.body.type).toBe("Manifest")
      expect(res.body.label.none[0]).toBe("论语")
    })
  })

  // ═══════════════════ 注疏标记 ═══════════════════

  describe("GET /api/v1/classic/books/:id/annotations", () => {
    it("返回书籍注疏列表", async () => {
      prisma.classicAnnotation.findMany.mockResolvedValue([
        { id: "a1", bookId: "b1", chapterId: null, type: "注疏", startPos: 0, endPos: 5, content: "注疏内容", author: "朱熹", dynasty: "宋", createdAt: new Date().toISOString() },
      ])
      prisma.classicAnnotation.count.mockResolvedValue(1)

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1/annotations")
        .expect(200)

      expect(res.body.items).toHaveLength(1)
      expect(res.body.total).toBe(1)
    })
  })

  describe("POST /api/v1/classic/annotations", () => {
    it("创建注疏标记（需管理员权限）", async () => {
      stubUser("u1", ["SUPER_ADMIN"])
      prisma.classicAnnotation.create.mockResolvedValue({
        id: "a1", bookId: "b1", type: "注疏", startPos: 0, endPos: 10, content: "古注原文",
      })

      const res = await request(app.getHttpServer())
        .post("/api/v1/classic/annotations")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .send({ bookId: "b1", startPos: 0, endPos: 10, content: "古注原文", author: "郑玄" })
        .expect(201)

      expect(res.body.content).toBe("古注原文")
    })
  })

  describe("DELETE /api/v1/classic/annotations/:id", () => {
    it("删除注疏标记（需管理员权限）", async () => {
      stubUser("u1", ["SUPER_ADMIN"])
      prisma.classicAnnotation.findUnique.mockResolvedValue({ id: "a1" })
      prisma.classicAnnotation.delete.mockResolvedValue({ id: "a1" })

      await request(app.getHttpServer())
        .delete("/api/v1/classic/annotations/a1")
        .set("Authorization", `Bearer ${authAs("u1")}`)
        .expect(200)
    })
  })

  describe("GET /api/v1/classic/books/:id/versions", () => {
    it("返回同书其他版本", async () => {
      prisma.classicBook.findFirst.mockResolvedValue({ title: "论语", author: "孔子", dynasty: "春秋" })
      prisma.classicBook.findMany.mockResolvedValue([
        { id: "b2", title: "论语集注", author: "朱熹", dynasty: "宋", category: "经", cover: null, source: "宋刻本" },
      ])

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1/versions")
        .expect(200)

      expect(res.body.current.title).toBe("论语")
      expect(res.body.versions).toHaveLength(1)
    })
  })

  // ═══════════════════ 图文对照 ═══════════════════

  describe("GET /api/v1/classic/chapters/:id/image-locations", () => {
    it("返回文字→图像位置映射", async () => {
      prisma.classicChapter.findFirst.mockResolvedValue({
        id: "ch1", bookId: "b1", title: "学而篇", content: "子曰学而时习之",
      })
      prisma.classicImage.findMany.mockResolvedValue([
        {
          id: "img1", pageNumber: 1, label: "第1页", iiifUrl: null, width: 2400, height: 3200,
          ocrTexts: [{ content: "子", x: 100, y: 50, w: 80, h: 40, lineNumber: 1, charIndex: 1 }],
        },
      ])

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/chapters/ch1/image-locations")
        .expect(200)

      expect(res.body.mappingType).toBe("ocr")
      expect(res.body.pages).toHaveLength(1)
    })
  })

  describe("GET /api/v1/classic/books/:id/manifest?textOverlay=true", () => {
    it("返回含文字叠加层的 IIIF Manifest", async () => {
      prisma.classicImage.findMany.mockResolvedValue([
        {
          id: "img1", pageNumber: 1, label: "第1页", iiifUrl: "http://iiif.example.com/1", width: 2400, height: 3200,
          ocrTexts: [{ content: "子", x: 100, y: 50, w: 80, h: 40, lineNumber: 1, charIndex: 1 }],
        },
      ])
      prisma.classicBook.findFirst.mockResolvedValue({ id: "b1", title: "论语", author: "孔子" })

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1/manifest?textOverlay=true")
        .expect(200)

      expect(Array.isArray(res.body["@context"])).toBe(true)
      expect(res.body.items[0].items[0].items.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("GET /api/v1/classic/books/:id/cite", () => {
    it("生成 GB/T 7714 引用", async () => {
      prisma.classicBook.findFirst.mockResolvedValue({
        id: "b1", title: "论语", author: "孔子", dynasty: "春秋", source: "宋刻本",
      })

      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/books/b1/cite?style=gbt7714")
        .expect(200)

      expect(res.body.citations.gbt7714).toContain("论语")
    })
  })

  // ═══════════════════ 字体服务 ═══════════════════

  describe("GET /api/v1/classic/fonts/config", () => {
    it("返回字体分层配置", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/fonts/config")
        .expect(200)

      expect(res.body.layers.length).toBeGreaterThanOrEqual(3)
      expect(res.body.fallbackChain).toBeDefined()
    })
  })

  describe("GET /api/v1/classic/fonts/vertical.css", () => {
    it("返回竖排 CSS", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/classic/fonts/vertical.css")
        .expect(200)

      expect(res.text).toContain("writing-mode: vertical-rl")
    })
  })
})
