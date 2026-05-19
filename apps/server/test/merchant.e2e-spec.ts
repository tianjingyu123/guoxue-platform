import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";

describe("Merchant E2E", () => {
  let app: INestApplication;
  let prisma: any;
  let jwt: JwtService;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] });
    // 功能开关默认启用
    prisma.featureFlag.findUnique.mockResolvedValue({
      key: "onboarding", enabled: true, targetUserIds: [], percentage: 100,
    });
  });

  const auth = (userId = "u1") => `Bearer ${jwt.sign({ sub: userId })}`;

  // ═══════════════════ 提交入驻申请 ═══════════════════

  describe("POST /api/v1/merchant/apply", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/merchant/apply")
        .send({ shopName: "国学书店", categoryIds: ["BOOKS"] })
        .expect(401);
    });

  });

  // ═══════════════════ 获取入驻申请 ═══════════════════

  describe("GET /api/v1/merchant/application", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/merchant/application")
        .expect(401);
    });

    it("获取入驻申请状态", async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", shopName: "国学书店", status: "PENDING_REVIEW",
      });

      const res = await request(app.getHttpServer())
        .get("/api/v1/merchant/application")
        .set("Authorization", auth())
        .expect(200);

      expect(res.body.status).toBe("PENDING_REVIEW");
    });

    it("无申请记录返回 404", async () => {
      prisma.merchant.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get("/api/v1/merchant/application")
        .set("Authorization", auth())
        .expect(404);
    });
  });

  // ═══════════════════ 修改入驻申请 ═══════════════════

  describe("PUT /api/v1/merchant/application", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/merchant/application")
        .send({ shopName: "新店名" })
        .expect(401);
    });

    it("修改申请成功（驳回后重提交）", async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        id: "m1", userId: "u1", shopName: "旧店名", status: "REVIEW_FAILED",
      });
      prisma.merchant.update.mockResolvedValue({
        id: "m1", shopName: "新店名", status: "PENDING_REVIEW",
      });

      const res = await request(app.getHttpServer())
        .put("/api/v1/merchant/application")
        .set("Authorization", auth())
        .send({ shopName: "新店名" })
        .expect(200);

      expect(res.body.shopName).toBe("新店名");
    });
  });

  // ═══════════════════ 提交审核 ═══════════════════

  describe("POST /api/v1/merchant/submit", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/merchant/submit")
        .expect(401);
    });

  });

  // ═══════════════════ 保证金信息 ═══════════════════

  describe("GET /api/v1/merchant/deposit-info", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/merchant/deposit-info")
        .expect(401);
    });
  });

  // ═══════════════════ 协议预览 ═══════════════════

  describe("GET /api/v1/merchant/agreement-preview", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/merchant/agreement-preview")
        .expect(401);
    });

    it("获取协议预览", async () => {
      prisma.merchantAgreement.findFirst.mockResolvedValue({
        id: "ag1", version: 1, content: "协议内容...", createdAt: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .get("/api/v1/merchant/agreement-preview")
        .set("Authorization", auth())
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // ═══════════════════ 签署协议 ═══════════════════

  describe("POST /api/v1/merchant/sign-agreement", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/merchant/sign-agreement")
        .send({ agreementId: "ag1" })
        .expect(401);
    });
  });
});
