import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { FeatureFlagService } from "../src/modules/feature-flag/feature-flag.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { RedisService } from "../src/redis/redis.service";
import { CircleWorkflowLocalPg, localGate } from "./fixtures/circle-workflow-local-pg";
import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { FeatureFlagController } from "../src/modules/feature-flag/feature-flag.controller";
import { JwtAuthGuard } from "../src/common/jwt-auth.guard";
import { RolesGuard } from "../src/common/roles.guard";
import { RedLineGuard } from "../src/common/red-lines";

const localSuite = process.env.RUN_CIRCLE_WORKFLOW_LOCAL_PG === "YES" ? describe : describe.skip;
localSuite("配置发布真实 PostgreSQL 隔离验收", () => {
  const pg = new CircleWorkflowLocalPg();
  const cache = () => ({ del: jest.fn().mockResolvedValue(1) });
  const service = (client: PrismaClient, redis = cache()) => new FeatureFlagService(client as PrismaService, redis as unknown as RedisService);
  beforeAll(() => pg.start(), 120000);
  afterAll(() => pg.stop(), 65000);
  async function setup() {
    const key = `client_qa_${randomUUID().replaceAll("-", "")}`;
    await service(pg.observer).upsert(key, { name: "隔离验收", enabled: false, percentage: 10, targetUserIds: [] }, "QA");
    return key;
  }

  it("新增同名返回409且真实记录与历史保持不变", async () => {
    const key = await setup(); const svc = service(pg.a);
    const preview = await svc.preview(key, {});
    await expect(svc.upsert(key, { name: "不应覆盖", enabled: true, expectedFingerprint: preview.baseFingerprint }, "QA", true))
      .rejects.toMatchObject({ status: 409 });
    expect(await svc.getHistory(key)).toHaveLength(1);
    expect(await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } })).toMatchObject({ name: "隔离验收", enabled: false });
    const newKey = `client_qa_${randomUUID().replaceAll("-", "")}`;
    await svc.upsert(newKey, { name: "确实新增" }, "QA", true);
    expect(await svc.getHistory(newKey)).toHaveLength(1);
  });

  it("真实HTTP到PostgreSQL贯通创建、并发拒绝、删除、发现与恢复，越权零写入", async () => {
    // 身份替身仅提供合成角色；DTO、角色守卫、红线、业务服务和数据库均实际执行。
    const redis = { del: jest.fn().mockResolvedValue(1), getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn() };
    const module = await Test.createTestingModule({ controllers: [FeatureFlagController], providers: [
      { provide: FeatureFlagService, useValue: service(pg.a, redis) }, RolesGuard, RedLineGuard,
    ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const role = ({ admin: "SUPER_ADMIN", operator: "OPERATION_ADMIN", consumer: "USER" } as Record<string, string>)[req.headers["x-local-qa-role"]];
      if (!role) throw new UnauthorizedException();
      req.user = { id: "local-http-qa", roles: [role] }; return true;
    } }).compile();
    const app: INestApplication = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalGuards(module.get(RedLineGuard));
    try {
      await app.init();
      const http = app.getHttpServer(); const base = "/admin/feature-flags";
      const key = `client_http_${randomUUID().replaceAll("-", "")}`; const url = `${base}/${key}`;
      await request(http).post(`${url}/preview`).send({}).expect(401);
      await request(http).post(`${url}/preview`).set("x-local-qa-role", "consumer").send({}).expect(403);
      const draft = await request(http).post(`${url}/preview`).set("x-local-qa-role", "operator").send({ enabled: false }).expect(201);
      expect(await pg.observer.featureFlag.findUnique({ where: { key } })).toBeNull();
      const body = { key, name: "HTTP真实合成配置", enabled: false, expectedFingerprint: draft.body.baseFingerprint };
      await request(http).post(base).set("x-local-qa-role", "admin").set("x-executor-type", "AUTOMATION").send(body).expect(403);
      expect(await service(pg.observer).getHistory(key)).toHaveLength(0);
      await request(http).post(base).set("x-local-qa-role", "admin").send(body).expect(201);
      await request(http).post(base).set("x-local-qa-role", "admin").send(body).expect(409);
      const preview = await request(http).post(`${url}/preview`).set("x-local-qa-role", "admin").send({}).expect(201);
      await request(http).put(url).set("x-local-qa-role", "operator").send({ enabled: true, expectedFingerprint: preview.body.baseFingerprint }).expect(200);
      await request(http).delete(url).set("x-local-qa-role", "admin").send({ expectedFingerprint: preview.body.baseFingerprint }).expect(409);
      const fresh = await request(http).post(`${url}/preview`).set("x-local-qa-role", "admin").send({}).expect(201);
      const confirmation = { expectedFingerprint: fresh.body.baseFingerprint };
      await request(http).delete(url).set("x-local-qa-role", "operator").send(confirmation).expect(403);
      await request(http).delete(url).set("x-local-qa-role", "admin").set("x-executor-type", "AUTOMATION").send(confirmation).expect(403);
      await request(http).delete(url).set("x-local-qa-role", "admin").send({ expectedFingerprint: "bad" }).expect(400);
      expect((await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } })).enabled).toBe(true);
      await request(http).delete(url).set("x-local-qa-role", "admin").send(confirmation).expect(200);
      await request(http).get(`${base}/archived/list`).set("x-local-qa-role", "operator").expect(403);
      const archived = await request(http).get(`${base}/archived/list`).set("x-local-qa-role", "admin").expect(200);
      expect(archived.headers["cache-control"]).toBe("private, no-store");
      expect(archived.body).toContainEqual({ key, name: "HTTP真实合成配置", version: 2 });
      expect(archived.body.some((row: object) => "targetUserIds" in row)).toBe(false);
      const absent = await request(http).post(`${url}/preview`).set("x-local-qa-role", "admin").send({}).expect(201);
      await request(http).post(`${url}/rollback/1`).set("x-local-qa-role", "admin").send({ expectedFingerprint: absent.body.baseFingerprint }).expect(201);
      expect((await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } })).enabled).toBe(false);
      expect(await service(pg.observer).getHistory(key)).toHaveLength(3);
      const restored = await request(http).get(`${base}/archived/list`).set("x-local-qa-role", "admin").expect(200);
      expect(restored.body.some((row: { key: string }) => row.key === key)).toBe(false);
    } finally { await app.close(); }
  });

  it("删除拒绝过期确认；最新确认删除成功并保留可恢复历史", async () => {
    const key = await setup(); const svc = service(pg.a);
    const old = await svc.preview(key, {});
    await service(pg.b).upsert(key, { percentage: 40 }, "QA_B");
    await expect(svc.delete(key, old.baseFingerprint)).rejects.toMatchObject({ status: 409 });
    expect((await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } })).percentage).toBe(40);
    const current = await svc.preview(key, {});
    await svc.delete(key, current.baseFingerprint);
    expect(await pg.observer.featureFlag.findUnique({ where: { key } })).toBeNull();
    expect(await svc.getHistory(key)).toHaveLength(2);
    expect(await svc.listArchived()).toContainEqual({ key, name: "隔离验收", version: 2 });
    const absent = await svc.preview(key, {});
    await svc.rollback(key, 1, "QA", absent.baseFingerprint);
    expect((await svc.listArchived()).some(row => row.key === key)).toBe(false);
    expect((await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } })).percentage).toBe(10);
  });

  it("预览不增加历史；发布与回滚各只追加一个版本", async () => {
    const key = await setup(); const svc = service(pg.a);
    const preview = await svc.preview(key, { enabled: true });
    expect(await svc.getHistory(key)).toHaveLength(1);
    await svc.upsert(key, { enabled: true, expectedFingerprint: preview.baseFingerprint }, "QA");
    expect(await svc.getHistory(key)).toHaveLength(2);
    const latest = await svc.preview(key, {});
    await svc.rollback(key, 1, "QA", latest.baseFingerprint);
    const row = await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } });
    expect(row.enabled).toBe(false);
    expect(row.percentage).toBe(10);
    const history = await svc.getHistory(key);
    expect(history.map(row => row.version)).toEqual([3, 2, 1]);
  });

  it("另一管理员先提交后，旧预览发布及回滚均409且无新增历史", async () => {
    const key = await setup(); const svc = service(pg.a); const old = await svc.preview(key, {});
    await service(pg.b).upsert(key, { percentage: 30, expectedFingerprint: old.baseFingerprint }, "QA_B");
    await expect(svc.upsert(key, { enabled: true, expectedFingerprint: old.baseFingerprint }, "QA_A"))
      .rejects.toMatchObject({ status: 409 });
    await expect(svc.rollback(key, 1, "QA_A", old.baseFingerprint)).rejects.toMatchObject({ status: 409 });
    expect(await svc.getHistory(key)).toHaveLength(2);
    expect((await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } })).percentage).toBe(30);
  });

  it("两真实事务读取同一版本后竞争，仅一方提交且历史无重复", async () => {
    const key = await setup(); const fingerprint = (await service(pg.observer).preview(key, {})).baseFingerprint;
    const gate = localGate(); let readers = 0;
    const concurrent = (client: PrismaClient) => {
      // 只在读取后插入同步屏障，查询、写入、隔离级别和提交仍由真实 Prisma/PostgreSQL 执行。
      const bridge = {
        $transaction: (work: (tx: unknown) => Promise<unknown>, options: { isolationLevel: Prisma.TransactionIsolationLevel }) =>
          client.$transaction(tx => work({
            configVersion: tx.configVersion,
            featureFlag: {
              findUnique: async (args: Prisma.FeatureFlagFindUniqueArgs) => {
                const row = await tx.featureFlag.findUnique(args);
                if (++readers === 2) gate.release();
                await gate.promise; return row;
              },
              upsert: (args: Prisma.FeatureFlagUpsertArgs) => tx.featureFlag.upsert(args),
            },
          }), { ...options, timeout: 10000 }),
      };
      return new FeatureFlagService(bridge as unknown as PrismaService, cache() as unknown as RedisService);
    };
    const results = await Promise.allSettled([
      concurrent(pg.a).upsert(key, { percentage: 20, expectedFingerprint: fingerprint }, "QA_A"),
      concurrent(pg.b).upsert(key, { percentage: 40, expectedFingerprint: fingerprint }, "QA_B"),
    ]);
    expect(readers).toBe(2);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.status).toBe(409);
    expect(await service(pg.observer).getHistory(key)).toHaveLength(2);
    expect([20, 40]).toContain((await pg.observer.featureFlag.findUniqueOrThrow({ where: { key } })).percentage);
  });
});
