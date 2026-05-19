import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";

describe("Commission E2E", () => {
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

  const userAuth = () => {
    prisma.user.findUnique.mockResolvedValue({ id: "u1", status: "ACTIVE", roles: [] });
    return `Bearer ${jwt.sign({ sub: "u1" })}`;
  };

  const adminAuth = () => {
    prisma.user.findUnique.mockResolvedValue({ id: "admin1", status: "ACTIVE", roles: [{ roleType: "SUPER_ADMIN" }] });
    return `Bearer ${jwt.sign({ sub: "admin1" })}`;
  };

  // ═══════════════════ 获取所有分佣配置（管理员） ═══════════════════

  describe("GET /api/v1/commission/configs", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/configs")
        .expect(401);
    });

    it("非管理员返回 403", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/configs")
        .set("Authorization", userAuth())
        .expect(403);
    });

    it("管理员获取配置列表", async () => {
      prisma.commissionConfig.findMany.mockResolvedValue([
        { configKey: "station_rate", configValue: "0.1", description: "分站佣金比例" },
      ]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/commission/configs")
        .set("Authorization", adminAuth())
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ═══════════════════ 分佣配置总览（超级管理员） ═══════════════════

  describe("GET /api/v1/commission/config", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/config")
        .expect(401);
    });

    it("非超级管理员返回 403", async () => {
      const opToken = jwt.sign({ sub: "op1" });
      prisma.user.findUnique.mockResolvedValue({ id: "op1", status: "ACTIVE", roles: [{ roleType: "OPERATION_ADMIN" }] });

      await request(app.getHttpServer())
        .get("/api/v1/commission/config")
        .set("Authorization", `Bearer ${opToken}`)
        .expect(403);
    });

    it("超级管理员获取配置总览", async () => {
      prisma.commissionConfig.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/api/v1/commission/config")
        .set("Authorization", adminAuth())
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // ═══════════════════ 更新分佣配置比例（超级管理员） ═══════════════════

  describe("PUT /api/v1/commission/config", () => {
    it("非超级管理员返回 403", async () => {
      const opToken = jwt.sign({ sub: "op1" });
      prisma.user.findUnique.mockResolvedValue({ id: "op1", status: "ACTIVE", roles: [{ roleType: "OPERATION_ADMIN" }] });

      await request(app.getHttpServer())
        .put("/api/v1/commission/config")
        .set("Authorization", `Bearer ${opToken}`)
        .send({ type: "station", rate: 0.15 })
        .expect(403);
    });
  });

  // ═══════════════════ 分站收益 ═══════════════════

  describe("GET /api/v1/commission/station-earnings/:stationId", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/station-earnings/st1")
        .expect(401);
    });

  });

  // ═══════════════════ 分站余额 ═══════════════════

  describe("GET /api/v1/commission/station-balance/:stationId", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/station-balance/st1")
        .expect(401);
    });
  });

  // ═══════════════════ 申请提现 ═══════════════════

  describe("POST /api/v1/commission/withdrawal", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/commission/withdrawal")
        .send({ amount: 10000, type: "STATION" })
        .expect(401);
    });
  });

  // ═══════════════════ 查看我的提现记录 ═══════════════════

  describe("GET /api/v1/commission/withdrawals", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/withdrawals")
        .expect(401);
    });

    it("获取我的提现记录", async () => {
      prisma.withdrawal.findMany.mockResolvedValue([]);
      prisma.withdrawal.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get("/api/v1/commission/withdrawals")
        .set("Authorization", userAuth())
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // ═══════════════════ 管理员查看所有提现 ═══════════════════

  describe("GET /api/v1/commission/admin/withdrawals", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/admin/withdrawals")
        .expect(401);
    });

    it("管理员获取提现列表", async () => {
      prisma.withdrawal.findMany.mockResolvedValue([]);
      prisma.withdrawal.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer())
        .get("/api/v1/commission/admin/withdrawals")
        .set("Authorization", adminAuth())
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });

  // ═══════════════════ 创建推荐链接 ═══════════════════

  describe("POST /api/v1/commission/referral-link", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/commission/referral-link")
        .send({ type: "STATION", targetId: "st1" })
        .expect(401);
    });
  });

  // ═══════════════════ 获取推荐链接列表 ═══════════════════

  describe("GET /api/v1/commission/referral-links", () => {
    it("未认证返回 401", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/commission/referral-links")
        .expect(401);
    });

  });

  // ═══════════════════ 推荐链接点击跟踪 ═══════════════════

  describe("GET /api/v1/commission/track/:code", () => {
    it("无需认证跟踪点击", async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: "rl1", code: "ABC123", userId: "u1", type: "STATION",
      });
      prisma.referralLink.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .get("/api/v1/commission/track/ABC123")
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
