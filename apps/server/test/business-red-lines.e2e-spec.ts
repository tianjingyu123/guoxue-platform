import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";
import { InspectionService } from "../src/modules/ops/inspection.service";

describe("关键业务红线 E2E", () => {
  const missingVersionId = "00000000-0000-4000-8000-566093a50000";
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
    ["post", "/api/v1/ai/collaborations/p1/review", { action: "approved" }],
    ["post", "/api/v1/ai/collaborations/p1/execute", undefined],
    ["post", "/api/v1/ai/collaborations/p1/feedback", { rating: 5 }],
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

  it("真人管理员发布不存在的合法 UUID 版本返回 404", async () => {
    prisma.appVersion.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post(`/api/v1/system/version/${missingVersionId}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("真人管理员回退不存在的合法 UUID 版本返回 404", async () => {
    prisma.appVersion.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post(`/api/v1/system/version/${missingVersionId}/rollback`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("真人协作执行和反馈进入业务层，不存在提案返回 404", async () => {
    prisma.aiCollaboration.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer()).post("/api/v1/ai/collaborations/missing/execute")
      .set("Authorization", `Bearer ${token}`).expect(404);
    await request(app.getHttpServer()).post("/api/v1/ai/collaborations/missing/feedback")
      .set("Authorization", `Bearer ${token}`).send({ rating: 4 }).expect(404);
  });

  it("生产模块注册安全巡检处理器，真人执行后保留报告证据", async () => {
    prisma.aiCollaboration.findUnique.mockResolvedValue({
      id: "p1", status: "approved", riskLevel: "low",
      executionPlan: { handlerKey: "ops.run_inspection" },
    });
    const inspection = jest.spyOn(app.get(InspectionService), "runInspection").mockResolvedValue({
      date: "2026-09-02", trigger: "MANUAL", automationEnabled: false,
      anomalies: 0, autoFixed: 0, tasksCreated: 0, reportTaskId: "report-e2e", items: [],
    });
    try {
      const detail = await request(app.getHttpServer()).get("/api/v1/ai/collaborations/p1")
        .set("Authorization", `Bearer ${token}`).expect(200);
      expect(detail.body.executionCapability).toMatchObject({ executionReady: true, rollbackReady: false });
      await request(app.getHttpServer()).post("/api/v1/ai/collaborations/p1/execute")
        .set("Authorization", `Bearer ${token}`).expect(201);
      expect(inspection).toHaveBeenCalledWith("MANUAL", { allowAutoFix: false });
      expect(prisma.aiCollaboration.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "executed", executionResult: expect.objectContaining({
          executor: "admin-red-line", result: expect.objectContaining({ reportTaskId: "report-e2e" }),
        }) }),
      }));
    } finally { inspection.mockRestore(); }
  });

  it("运营管理员可以查看提案，但不能替代超管执行", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: "ops-admin", status: "ACTIVE", roles: [{ roleType: "OPERATION_ADMIN" }] });
    prisma.aiCollaboration.findUnique.mockResolvedValue({ id: "p1", executionPlan: {} });
    await request(app.getHttpServer()).get("/api/v1/ai/collaborations/p1")
      .set("Authorization", `Bearer ${token}`).expect(200);
    await request(app.getHttpServer()).post("/api/v1/ai/collaborations/p1/execute")
      .set("Authorization", `Bearer ${token}`).expect(403);
  });

  it("协作反馈拒绝小数评分，账本入口拒绝绕过协作单独审结", async () => {
    await request(app.getHttpServer()).post("/api/v1/ai/collaborations/p1/feedback")
      .set("Authorization", `Bearer ${token}`).send({ rating: 1.5 }).expect(400);
    prisma.aiCollaboration.findFirst.mockResolvedValueOnce({ id: "p1" });
    await request(app.getHttpServer()).post("/api/v1/ai/decisions/d1/review")
      .set("Authorization", `Bearer ${token}`).send({ action: "approved" }).expect(400);
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
