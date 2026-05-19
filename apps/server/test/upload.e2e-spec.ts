import { INestApplication } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import request from "supertest"
import { createE2eApp } from "./e2e-setup"

const JPEG_BUF = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00])
const PNG_BUF = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52])
const MP3_BUF = Buffer.from([0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

describe("Upload E2E", () => {
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

  // ═══════════════════ 单图上传 ═══════════════════

  describe("POST /api/v1/upload/image", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/upload/image")
        .attach("file", JPEG_BUF, { filename: "test.jpg", contentType: "image/jpeg" })
        .expect(401)
    })

    it("上传单张图片成功", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      const token = jwt.sign({ sub: "u1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", JPEG_BUF, { filename: "test.jpg", contentType: "image/jpeg" })
        .expect(201)

      expect(res.body).toHaveProperty("url")
    })
  })

  // ═══════════════════ 批量图片上传 ═══════════════════

  describe("POST /api/v1/upload/images", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/upload/images")
        .attach("files", JPEG_BUF, { filename: "1.jpg", contentType: "image/jpeg" })
        .expect(401)
    })

    it("批量上传多张图片成功", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      const token = jwt.sign({ sub: "u1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${token}`)
        .attach("files", JPEG_BUF, { filename: "1.jpg", contentType: "image/jpeg" })
        .attach("files", PNG_BUF, { filename: "2.png", contentType: "image/png" })
        .expect(201)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body).toHaveLength(2)
    })
  })

  // ═══════════════════ 音频上传 ═══════════════════

  describe("POST /api/v1/upload/audio", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/upload/audio")
        .attach("file", MP3_BUF, { filename: "test.mp3", contentType: "audio/mpeg" })
        .expect(401)
    })

    it("上传音频成功", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] })
      const token = jwt.sign({ sub: "u1" })

      const res = await request(app.getHttpServer())
        .post("/api/v1/upload/audio")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", MP3_BUF, { filename: "test.mp3", contentType: "audio/mpeg" })
        .expect(201)

      expect(res.body).toHaveProperty("url")
    })
  })

  // ═══════════════════ 删除文件 ═══════════════════

  describe("DELETE /api/v1/upload/:key", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .delete("/api/v1/upload/test-key.jpg")
        .expect(401)
    })

    it("管理员删除文件成功", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }],
      })
      const token = jwt.sign({ sub: "u1" })

      const res = await request(app.getHttpServer())
        .delete("/api/v1/upload/test-key.jpg")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)

      expect(res.body.success).toBe(true)
    })
  })
})
