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
});
