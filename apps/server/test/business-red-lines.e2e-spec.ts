import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";

describe("关键业务红线 E2E", () => {
  let app: INestApplication;
  let prisma: any;
  let token: string;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    token = app.get(JwtService).sign({ sub: "admin-red-line" });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: "admin-red-line",
      status: "ACTIVE",
      roles: [{ roleType: "SUPER_ADMIN" }, { roleType: "OPERATION_ADMIN" }],
    });
  });

  const cases = [
    ["post", "/api/v1/shop/products", { title: "自动化商品", price: 1, stock: 1, detail: "QA", images: ["https://example.com/qa.jpg"] }],
    ["put", "/api/v1/shop/products/p1", { title: "自动化改价", price: 2 }],
    ["put", "/api/v1/shop/products/p1/status", { status: "ON_SHELF" }],
    ["delete", "/api/v1/shop/products/p1", undefined],
    ["put", "/api/v1/live/rooms/r1/start", undefined],
    ["put", "/api/v1/live/rooms/r1/start-obs", undefined],
    ["put", "/api/v1/live/rooms/r1/replay", { replayUrl: "https://example.com/replay.mp4" }],
    ["put", "/api/v1/live/rooms/r1/replay/unpublish", undefined],
    ["post", "/api/v1/system/version/v1/publish", undefined],
    ["post", "/api/v1/system/version/v1/rollback", undefined],
    ["post", "/api/v1/system/version/v1/retire", undefined],
    ["delete", "/api/v1/system/version/v1", undefined],
    ["put", "/api/v1/live/rooms/r1/end", undefined],
    ["delete", "/api/v1/live/rooms/r1", undefined],
    ["post", "/api/v1/merchant-backend/products", { title: "自动化商家商品", price: 1, stock: 1 }],
    ["post", "/api/v1/merchant-backend/products/p1/list", undefined],
    ["post", "/api/v1/merchant-backend/orders/o1/refund/approve", { remark: "自动化退款审批" }],
    ["post", "/api/v1/huifu/split", { orderId: "o1" }],
    ["post", "/api/v1/huifu/refund", { orderId: "o1", amount: 1 }],
    ["post", "/api/v1/email/send", { to: "qa@example.com", subject: "QA", html: "QA" }],
    ["post", "/api/v1/email/send-template", { to: "qa@example.com", templateCode: "QA", variables: {} }],
    ["post", "/api/v1/courses/drafts/d1/publish", undefined],
    ["post", "/api/v1/admin/competitions/c1/publish", undefined],
    ["put", "/api/v1/ops/tasks/t1/approval", { approved: true }],
    ["post", "/api/v1/system/automation/toggle", { enabled: true }],
    ["put", "/api/v1/admin/roles/OPERATION_ADMIN/permissions", { permissions: [] }],
    ["post", "/api/v1/identity/admin/approve/i1", { remark: "QA" }],
    ["post", "/api/v1/system/backup/upload-cos", undefined],
  ] as const;

  it.each(cases)("AUTOMATION %s %s 应在进入业务层前返回 403", async (method, path, body) => {
    const call = request(app.getHttpServer())[method](path)
      .set("Authorization", `Bearer ${token}`)
      .set("x-executor-type", "AUTOMATION");
    if (body !== undefined) call.send(body);
    await call.expect(403);
  });

  it("真人管理员创建商品的既有语义保持不变", async () => {
    prisma.product.create.mockResolvedValue({ id: "human-product", title: "人工商品", status: "ON_SHELF", skus: [] });
    const response = await request(app.getHttpServer())
      .post("/api/v1/shop/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "人工商品", price: 1, stock: 1, detail: "人工审核后发布", images: ["https://example.com/human.jpg"] })
      .expect(201);
    expect(response.body.id).toBe("human-product");
  });

  it("真人管理员调用版本发布可越过红线并进入业务校验", async () => {
    prisma.appVersion.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post("/api/v1/system/version/not-found/publish")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it.each([
    ["put", "/api/v1/shop/orders/not-found/refund", "MONEY", { reason: "人工退款校验" }],
    ["delete", "/api/v1/system/version/not-found", "IRREVERSIBLE", undefined],
    ["post", "/api/v1/identity/admin/approve/not-found", "USER_DATA", { remark: "人工实名审核" }],
    ["post", "/api/v1/system/automation/toggle", "COMPLIANCE", { enabled: true }],
  ] as const)("真人 %s %s 可越过 %s 红线并进入既有业务链路", async (method, path, _redLine, body) => {
    const call = request(app.getHttpServer())[method](path)
      .set("Authorization", `Bearer ${token}`);
    if (body !== undefined) call.send(body);
    const response = await call;
    expect(response.status).not.toBe(403);
  });
});
