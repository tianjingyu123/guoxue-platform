import { ExecutionContext, INestApplication, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { CircleCapabilityController } from "../src/modules/circle/circle-capability.controller";
import { CircleCapabilityService } from "../src/modules/circle/circle-capability.service";
import { JwtAuthGuard } from "../src/common/jwt-auth.guard";
import { RolesGuard } from "../src/common/roles.guard";
import { RedLineGuard } from "../src/common/red-lines";

// 真 HTTP / ValidationPipe / 角色和红线守卫；鉴权身份及业务服务为模拟，不作为线上 JWT/DB 证据。
describe("圈内能力 HTTP 边界", () => {
  const circle = "00000000-0000-4000-8000-000000000001";
  const grant = "00000000-0000-4000-8000-000000000002";
  const prefix = "/api/v1/circle-capabilities";
  const applyPath = `${prefix}/circles/${circle}/applications`;
  const reviewPath = `${prefix}/admin/grants/${grant}/review`;
  const directPath = `${prefix}/admin/circles/${circle}/direct-grants`;
  const contextPath = `${prefix}/admin/circles/${circle}/direct-grant-context`;
  const enabledPath = `${prefix}/grants/${grant}/enabled`;
  const eligibilityPath = `${prefix}/circles/${circle}/eligibility`;
  const ownPath = `${prefix}/circles/${circle}/grants`;
  const adminPath = `${prefix}/admin/grants`;
  const usePath = `${prefix}/circles/${circle}/use-status`;
  const currentPath = `${prefix}/circles/${circle}/current`;
  const applicationContextPath = `${prefix}/circles/${circle}/application-context`;
  const approval = { action: "APPROVE", expectedRevision: 1, reason: "人工核验",
    expiresAt: "2026-09-10T00:00:00Z", maxUnits: 50, maxConcurrent: 2 };
  const api = { applicationContext: jest.fn(), currentOwn: jest.fn(), getPublishUseStatus: jest.fn(), apply: jest.fn(), directGrantContext: jest.fn(), directGrant: jest.fn(), review: jest.fn(), setEnabled: jest.fn(), getEligibility: jest.fn(), listOwn: jest.fn(), listAdmin: jest.fn() };
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [CircleCapabilityController],
      providers: [{ provide: CircleCapabilityService, useValue: api }, RolesGuard, RedLineGuard] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const identity = req.headers.authorization;
        if (identity !== "Bearer test-owner" && identity !== "Bearer test-reviewer") throw new UnauthorizedException();
        req.user = identity === "Bearer test-reviewer" ? { id: "reviewer", roles: ["OPERATION_ADMIN"] } : { id: "owner", roles: ["CIRCLE_OWNER"] };
        return true;
      } }).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix("api/v1"); await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    api.apply.mockResolvedValue({ id: grant, state: "PENDING", enabled: false });
    api.directGrant.mockResolvedValue({ id: grant, source: "PLATFORM_DIRECT", state: "APPROVED", enabled: true });
    api.directGrantContext.mockResolvedValue({ circleId: circle, capability: "SHORT_VIDEO", subjectUserId: grant,
      scope: "PERSONAL", expectedLatestId: null, expectedLatestRevision: 0 });
    api.review.mockResolvedValue({ id: grant, state: "APPROVED", enabled: false });
    api.setEnabled.mockResolvedValue({ id: grant, enabled: true });
    api.getEligibility.mockResolvedValue({ eligibility: { eligible: true, reason: "ELIGIBLE_TO_APPLY" } });
    api.listOwn.mockResolvedValue({ items: [], total: 0 }); api.listAdmin.mockResolvedValue({ items: [], total: 0 });
  });

  it.each([applyPath, reviewPath, enabledPath, directPath])("匿名写入 %s 为401", async url => {
    await request(app.getHttpServer()).post(url).send({}).expect(401);
  });
  it.each([eligibilityPath, ownPath, adminPath, contextPath, usePath, currentPath, applicationContextPath])("匿名读取 %s 为401", async url => {
    await request(app.getHttpServer()).get(url).expect(401);
  });
  it("圈主申请预检绑定真实身份和指定服务者，仅返回只读状态", async () => {
    api.applicationContext.mockResolvedValue({ circleId: circle, capability: "AUDIO_QUESTION", subjectUserId: grant, canApply: false, reason: "CIRCLE_GRANT_UNAVAILABLE" });
    await request(app.getHttpServer()).get(applicationContextPath).set("Authorization", "Bearer test-owner")
      .query({ capability: "AUDIO_QUESTION", subjectUserId: grant }).expect("Cache-Control", "private, no-store").expect(200);
    expect(api.applicationContext).toHaveBeenCalledWith(circle, { userId: "owner", executor: "HUMAN" }, "AUDIO_QUESTION", grant);
    expect(api.apply).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get(applicationContextPath).set("Authorization", "Bearer test-owner")
      .query({ capability: "AUDIO_QUESTION", subjectUserId: "bad" }).expect(400);
    expect(api.applicationContext).toHaveBeenCalledTimes(1);
  });
  it("当前授权查询身份不可伪造且不缓存", async () => {
    api.currentOwn.mockResolvedValue({ circleId: circle, capability: "LIVE", grant: null });
    await request(app.getHttpServer()).get(currentPath).set("Authorization", "Bearer test-owner")
      .query({ capability: "LIVE" }).expect("Cache-Control", "private, no-store").expect(200);
    expect(api.currentOwn).toHaveBeenCalledWith(circle, { userId: "owner", executor: "HUMAN" }, "LIVE");
    await request(app.getHttpServer()).get(currentPath).set("Authorization", "Bearer test-owner")
      .query({ capability: "LIVE", subjectUserId: grant }).expect(400);
    expect(api.currentOwn).toHaveBeenCalledTimes(1);
  });
  it("发布状态禁止缓存且身份只能来自登录态", async () => {
    api.getPublishUseStatus.mockResolvedValue({ circleId: circle, capability: "SHORT_VIDEO", canPublish: true });
    await request(app.getHttpServer()).get(usePath).set("Authorization", "Bearer test-owner")
      .query({ capability: "SHORT_VIDEO" }).expect("Cache-Control", "private, no-store").expect(200);
    expect(api.getPublishUseStatus).toHaveBeenCalledWith(circle, { userId: "owner", executor: "HUMAN" }, "SHORT_VIDEO");
    await request(app.getHttpServer()).get(usePath).set("Authorization", "Bearer test-owner")
      .query({ capability: "SHORT_VIDEO", subjectUserId: grant }).expect(400);
    expect(api.getPublishUseStatus).toHaveBeenCalledTimes(1);
  });
  it("圈主不能读取管理员直授确认信息", async () => {
    await request(app.getHttpServer()).get(contextPath).set("Authorization", "Bearer test-owner").query({ capability: "SHORT_VIDEO" }).expect(403);
    expect(api.directGrantContext).not.toHaveBeenCalled();
  });
  it("确认对象查询不缓存且精确传递范围，不触发授权写入", async () => {
    const response = await request(app.getHttpServer()).get(contextPath).set("Authorization", "Bearer test-reviewer")
      .query({ capability: "SHORT_VIDEO", subjectUserId: grant }).expect("Cache-Control", "private, no-store").expect(200);
    expect(response.body).toMatchObject({ circleId: circle, subjectUserId: grant, expectedLatestRevision: 0 });
    expect(api.directGrantContext).toHaveBeenCalledWith(circle, { userId: "reviewer", executor: "HUMAN" }, "SHORT_VIDEO", grant);
    expect(api.directGrant).not.toHaveBeenCalled();
  });
  it.each([{ capability: "COURSE" }, { capability: "SHORT_VIDEO", subjectUserId: "bad" },
    { capability: "SHORT_VIDEO", expectedLatestRevision: 99 }, {}])("直授确认拒绝无效参数：%j", async query => {
    await request(app.getHttpServer()).get(contextPath).set("Authorization", "Bearer test-reviewer").query(query).expect(400);
    expect(api.directGrantContext).not.toHaveBeenCalled();
  });
  it.each(["AUTOMATION", "CLAUDE", "BOT"])("%s 不能申请、审核或启用", async executor => {
    for (const url of [applyPath, reviewPath, enabledPath, directPath]) {
      await request(app.getHttpServer()).post(url).set("Authorization", "Bearer test-reviewer").set("x-executor-type", executor).send(approval).expect(403);
    }
    expect(api.apply).not.toHaveBeenCalled(); expect(api.review).not.toHaveBeenCalled(); expect(api.setEnabled).not.toHaveBeenCalled();
    expect(api.directGrant).not.toHaveBeenCalled();
  });
  it("圈主不能调用平台审核或列表", async () => {
    await request(app.getHttpServer()).post(directPath).set("Authorization", "Bearer test-owner").send({}).expect(403);
    await request(app.getHttpServer()).post(reviewPath).set("Authorization", "Bearer test-owner").send(approval).expect(403);
    await request(app.getHttpServer()).get(adminPath).set("Authorization", "Bearer test-owner").expect(403);
    expect(api.review).not.toHaveBeenCalled(); expect(api.listAdmin).not.toHaveBeenCalled();
  });
  it("合法申请只使用鉴权身份，不接收客户端授权状态", async () => {
    const response = await request(app.getHttpServer()).post(applyPath).set("Authorization", "Bearer test-owner")
      .send({ capability: "LIVE", reason: "申请" }).expect(201);
    expect(response.body).toMatchObject({ state: "PENDING", enabled: false });
    expect(api.apply).toHaveBeenCalledWith(circle, { userId: "owner", executor: "HUMAN" }, { capability: "LIVE", reason: "申请" });
  });
  it.each([{ source: "PLATFORM_DIRECT" }, { enabled: true }, { state: "APPROVED" }, { policyRevision: 1 }, { applicantId: "other" }, { roles: ["SUPER_ADMIN"] }])("申请越权字段拒绝：%j", async extra => {
    await request(app.getHttpServer()).post(applyPath).set("Authorization", "Bearer test-owner")
      .send({ capability: "LIVE", reason: "申请", ...extra }).expect(400);
    expect(api.apply).not.toHaveBeenCalled();
  });
  it.each([{ capability: "COURSE" }, { subjectUserId: "not-uuid" }, { reason: "x".repeat(501) }])("申请参数非法拒绝：%#", async change => {
    await request(app.getHttpServer()).post(applyPath).set("Authorization", "Bearer test-owner")
      .send({ capability: "LIVE", reason: "申请", ...change }).expect(400);
  });
  it("真实审核路由传入版本及额度，结果不自动启用", async () => {
    const response = await request(app.getHttpServer()).post(reviewPath).set("Authorization", "Bearer test-reviewer").send(approval).expect(201);
    expect(response.body.enabled).toBe(false);
    expect(api.review).toHaveBeenCalledWith(grant, { userId: "reviewer", executor: "HUMAN" }, approval);
  });
  const direct = { capability: "LIVE", subjectUserId: grant, reason: "名师合作", expectedLatestRevision: 0,
    expiresAt: "2026-10-01T00:00:00Z", maxUnits: 500, maxConcurrent: 20 };
  it("管理员定向直授只接收明确范围期限额度，不接收角色或来源伪造", async () => {
    const response = await request(app.getHttpServer()).post(directPath).set("Authorization", "Bearer test-reviewer").send(direct).expect(201);
    expect(response.body).toMatchObject({ source: "PLATFORM_DIRECT", enabled: true });
    expect(api.directGrant).toHaveBeenCalledWith(circle, { userId: "reviewer", executor: "HUMAN" }, direct);
  });
  it.each([{ source: "PLATFORM_DIRECT" }, { expectedLatestRevision: "0" }, { expectedLatestRevision: -1 }, { expectedLatestId: "bad" },
    { maxUnits: 0 }, { maxConcurrent: "20" }, { expiresAt: "2026-10-01T00:00:00" }, { capability: "COURSE" }, { subjectUserId: "bad" }])("非法直授 DTO 拒绝：%j", async extra => {
    await request(app.getHttpServer()).post(directPath).set("Authorization", "Bearer test-reviewer").send({ ...direct, ...extra }).expect(400);
    expect(api.directGrant).not.toHaveBeenCalled();
  });
  it.each([{ expectedRevision: "1" }, { expectedRevision: 0 }, { expectedRevision: 2147483647 }, { maxUnits: "50" },
    { maxUnits: 2147483648 }, { maxConcurrent: 0 }, { expiresAt: "2026-09-10T00:00:00" }, { expiresAt: "2026-02-31T00:00:00Z" },
    { action: "PUBLISH" }, { enabled: true }])("非法审核参数拒绝：%j", async change => {
    await request(app.getHttpServer()).post(reviewPath).set("Authorization", "Bearer test-reviewer").send({ ...approval, ...change }).expect(400);
    expect(api.review).not.toHaveBeenCalled();
  });
  it("启用必须为布尔值，不把字符串false当true", async () => {
    await request(app.getHttpServer()).post(enabledPath).set("Authorization", "Bearer test-owner")
      .send({ expectedRevision: 2, enabled: "false", reason: "停用" }).expect(400);
    await request(app.getHttpServer()).post(enabledPath).set("Authorization", "Bearer test-owner")
      .send({ expectedRevision: 2, enabled: false, reason: "停用" }).expect(201);
    expect(api.setEnabled.mock.calls[0][2].enabled).toBe(false);
  });
  it("资格与列表不缓存，分页HTTP字符串显式转整数", async () => {
    await request(app.getHttpServer()).get(eligibilityPath).set("Authorization", "Bearer test-owner").query({ capability: "LIVE" })
      .expect("Cache-Control", "private, no-store").expect(200);
    await request(app.getHttpServer()).get(ownPath).set("Authorization", "Bearer test-owner").query({ page: "2", pageSize: "10" })
      .expect("Cache-Control", "private, no-store").expect(200);
    expect(api.listOwn.mock.calls[0][2]).toMatchObject({ page: 2, pageSize: 10 });
    await request(app.getHttpServer()).get(adminPath).set("Authorization", "Bearer test-reviewer")
      .expect("Cache-Control", "private, no-store").expect(200);
  });
  it.each([{ page: "1.5" }, { pageSize: "51" }, { page: "0" }, { state: "UNKNOWN" }, { subjectUserId: "foreign" }])("非法列表过滤拒绝：%j", async query => {
    await request(app.getHttpServer()).get(ownPath).set("Authorization", "Bearer test-owner").query(query).expect(400);
    expect(api.listOwn).not.toHaveBeenCalled();
  });
  it("路径UUID与缺失能力参数失败即停", async () => {
    await request(app.getHttpServer()).get(eligibilityPath).set("Authorization", "Bearer test-owner").expect(400);
    await request(app.getHttpServer()).post(`${prefix}/grants/bad/enabled`).set("Authorization", "Bearer test-owner")
      .send({ expectedRevision: 1, enabled: true, reason: "启用" }).expect(400);
  });
});
