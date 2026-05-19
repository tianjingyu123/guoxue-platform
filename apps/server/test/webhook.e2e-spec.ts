import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";

describe("Webhook E2E", () => {
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
  });

  const adminAuth = () => {
    prisma.user.findUnique.mockResolvedValue({ id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] });
    return `Bearer ${jwt.sign({ sub: "admin1" })}`;
  };

  const userAuth = () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] });
    return `Bearer ${jwt.sign({ sub: "u1" })}`;
  };

  // ═══════════════════ 注册 Webhook ═══════════════════

  describe("POST /api/v1/webhooks", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/webhooks")
        .send({ event: "ORDER_PAID", url: "https://example.com/hook" })
        .expect(401);
    });

    it("非管理员返回 403", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/webhooks")
        .set("Authorization", userAuth())
        .send({ event: "ORDER_PAID", url: "https://example.com/hook" })
        .expect(403);
    });

    it("管理员注册 Webhook", async () => {
      prisma.webhookSubscription.create.mockResolvedValue({
        id: "wh1", event: "ORDER_PAID", url: "https://example.com/hook", secret: null, isActive: true,
      });

      const res = await request(app.getHttpServer())
        .post("/api/v1/webhooks")
        .set("Authorization", adminAuth())
        .send({ event: "ORDER_PAID", url: "https://example.com/hook" })
        .expect(201);

      expect(res.body.id).toBe("wh1");
    });
  });

  // ═══════════════════ 查询 Webhook 列表 ═══════════════════

  describe("GET /api/v1/webhooks", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/webhooks")
        .expect(401);
    });

    it("非管理员返回 403", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/webhooks")
        .set("Authorization", userAuth())
        .expect(403);
    });

    it("管理员获取列表", async () => {
      prisma.webhookSubscription.findMany.mockResolvedValue([
        { id: "wh1", event: "ORDER_PAID", url: "https://example.com/hook", isActive: true },
      ]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/webhooks")
        .set("Authorization", adminAuth())
        .expect(200);

      expect(res.body).toHaveLength(1);
    });
  });

  // ═══════════════════ 编辑 Webhook ═══════════════════

  describe("PUT /api/v1/webhooks/:id", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/webhooks/wh1")
        .send({ url: "https://new.example.com/hook" })
        .expect(401);
    });

    it("管理员编辑 Webhook", async () => {
      prisma.webhookSubscription.update.mockResolvedValue({
        id: "wh1", event: "ORDER_PAID", url: "https://new.example.com/hook", isActive: true,
      });

      const res = await request(app.getHttpServer())
        .put("/api/v1/webhooks/wh1")
        .set("Authorization", adminAuth())
        .send({ url: "https://new.example.com/hook" })
        .expect(200);

      expect(res.body.url).toBe("https://new.example.com/hook");
    });
  });

  // ═══════════════════ 启用/禁用 Webhook ═══════════════════

  describe("POST /api/v1/webhooks/:id/toggle", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/webhooks/wh1/toggle")
        .send({ isActive: false })
        .expect(401);
    });

    it("管理员禁用 Webhook", async () => {
      prisma.webhookSubscription.update.mockResolvedValue({
        id: "wh1", event: "ORDER_PAID", url: "https://example.com/hook", isActive: false,
      });

      const res = await request(app.getHttpServer())
        .post("/api/v1/webhooks/wh1/toggle")
        .set("Authorization", adminAuth())
        .send({ isActive: false })
        .expect(201);

      expect(res.body.isActive).toBe(false);
    });
  });

  // ═══════════════════ 删除 Webhook ═══════════════════

  describe("DELETE /api/v1/webhooks/:id", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .delete("/api/v1/webhooks/wh1")
        .expect(401);
    });

    it("管理员删除 Webhook", async () => {
      prisma.webhookSubscription.delete.mockResolvedValue({ id: "wh1" });

      await request(app.getHttpServer())
        .delete("/api/v1/webhooks/wh1")
        .set("Authorization", adminAuth())
        .expect(200);
    });
  });
});
