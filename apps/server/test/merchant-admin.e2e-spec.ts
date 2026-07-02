import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { createE2eApp } from "./e2e-setup";

/**
 * 后台商家管理端「写端点行为」e2e。
 *
 * 目标：对每个基于 id 的写端点，用不存在的 id 打一发，断言返回 404 而非 500。
 * 这是「端点行为正确性」唯一可靠的网 —— 编译器保证方法存在，e2e 保证 not-found 语义。
 *
 * Prisma 被 mock：默认 findUnique 返回 undefined（即"资源不存在"），
 * 因此不显式 mock 目标资源的 findUnique，即模拟 not-found 场景。
 */
describe("Merchant Admin Write Endpoints E2E (not-found → 404)", () => {
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
    // JWT 策略从 DB 取 user 并 include roles → 需要管理员角色通过 RolesGuard
    prisma.user.findUnique.mockResolvedValue({
      id: "admin1",
      status: "ACTIVE",
      roles: [{ roleType: "SUPER_ADMIN" }],
    });
    // 目标资源（merchant/agreement/violation/settlement）的 findUnique 保持默认 undefined
    // 即"不存在"，各 service 的存在性检查应抛 404
  });

  const auth = () => `Bearer ${jwt.sign({ sub: "admin1" })}`;
  const NOPE = "nonexistent-id";
  const srv = () => app.getHttpServer();

  it("未认证访问后台写端点返回 401", async () => {
    await request(srv())
      .delete(`/api/v1/admin/merchants/agreements/${NOPE}`)
      .expect(401);
  });

  it("PUT 更新不存在的入驻协议 → 404", async () => {
    await request(srv())
      .put(`/api/v1/admin/merchants/agreements/${NOPE}`)
      .set("Authorization", auth())
      .send({ title: "新标题" })
      .expect(404);
  });

  it("DELETE 删除不存在的入驻协议 → 404（本次修复）", async () => {
    await request(srv())
      .delete(`/api/v1/admin/merchants/agreements/${NOPE}`)
      .set("Authorization", auth())
      .expect(404);
  });

  it("PUT 变更不存在商家的状态 → 404", async () => {
    await request(srv())
      .put(`/api/v1/admin/merchants/${NOPE}/status`)
      .set("Authorization", auth())
      .send({ status: "ACTIVE" })
      .expect(404);
  });

  it("POST 为不存在的商家创建违规记录 → 404（本次修复）", async () => {
    await request(srv())
      .post(`/api/v1/admin/merchants/${NOPE}/violations`)
      .set("Authorization", auth())
      .send({ type: "MINOR", title: "违规标题", description: "违规描述" })
      .expect(404);
  });

  it("PUT 处理不存在的违规记录 → 404（本次修复）", async () => {
    await request(srv())
      .put(`/api/v1/admin/merchants/${NOPE}/violations/${NOPE}`)
      .set("Authorization", auth())
      .send({ status: "CONFIRMED" })
      .expect(404);
  });

  it("PUT 设置不存在商家的分佣比例 → 404", async () => {
    await request(srv())
      .put(`/api/v1/admin/merchants/${NOPE}/commission`)
      .set("Authorization", auth())
      .send({ rate: 0.1 })
      .expect(404);
  });

  it("POST 支付不存在的结算单 → 404", async () => {
    await request(srv())
      .post(`/api/v1/admin/merchants/${NOPE}/settlements/${NOPE}/pay`)
      .set("Authorization", auth())
      .send({ amount: 100 })
      .expect(404);
  });

  it("POST 取消不存在的结算单 → 404", async () => {
    await request(srv())
      .post(`/api/v1/admin/merchants/${NOPE}/settlements/${NOPE}/cancel`)
      .set("Authorization", auth())
      .expect(404);
  });
});
