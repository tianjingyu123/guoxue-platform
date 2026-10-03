import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { PrismaClient, Prisma } from "@prisma/client";
import request from "supertest";
import * as jwt from "jsonwebtoken";
import { FeedbackService } from "./feedback.service";
import { FeedbackController } from "./feedback.controller";
import { FeedbackNotificationTask } from "./feedback-notification.task";
import { encodeFeedbackReply, publicFeedbackReply } from "./feedback-reply";
import { NotificationService } from "../notification/notification.service";
import { NotificationController } from "../notification/notification.controller";
import { PushService } from "../notification/push.service";
import { PushAudienceService } from "./push-audience.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { JwtStrategy } from "../../common/jwt.strategy";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462"
    || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("工单通知测试只允许专用本机合成库，禁止回退 DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("工单持久补发 PostgreSQL 与真实 JWT HTTP", () => {
  let db: PrismaClient;
  let app: INestApplication;
  const users: string[] = [];
  const secret = "synthetic-feedback-http-secret";
  const previousSecret = process.env.JWT_SECRET;
  const channelCall = jest.fn(() => { throw new Error("禁止访问真实推送渠道"); });
  const task = (client: PrismaClient | Prisma.TransactionClient = db) =>
    new FeedbackNotificationTask(client as unknown as PrismaService);
  const service = (client: PrismaClient | Prisma.TransactionClient = db) =>
    new FeedbackService(client as unknown as PrismaService, task(client));
  const user = async () => {
    const u = await db.user.create({ data: { nickname: "合成工单用户" } });
    users.push(u.id);
    return u.id;
  };
  const ticket = async (extra: Partial<Prisma.FeedbackUncheckedCreateInput> = {}) =>
    db.feedback.create({ data: { userId: await user(), type: "bug", content: "内部诊断原文", contact: "13800000000", status: "processing", ...extra } });
  const auth = (id: string) => `Bearer ${jwt.sign({ sub: id }, secret, { expiresIn: "5m" })}`;
  const noImmediate = { deliverPendingReplies: async () => { throw new Error("synthetic interrupted after commit"); } };
  const closeWithoutNotice = async (id: string) => new FeedbackService(db as unknown as PrismaService,
    noImmediate as unknown as FeedbackNotificationTask).adminUpdateStatus(id, { status: "resolved", result: "合成公开处理结果" });

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    // 本机服务监听 55462；官方隔离容器内部 5432 映射到客户端 55462。
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(identity[0].port)) throw new Error("合成库身份不符");
    process.env.JWT_SECRET = secret;
    const mod = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [FeedbackController, NotificationController],
      providers: [
        JwtStrategy, NotificationService, FeedbackService, FeedbackNotificationTask,
        { provide: PrismaService, useValue: db },
        { provide: RedisService, useValue: { get: async () => null } },
        { provide: PushService, useValue: { send: channelCall } },
        { provide: PushAudienceService, useValue: {} },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    expect(channelCall).not.toHaveBeenCalled();
  });

  it("真实结案入口先落状态再建一条站内通知，回复与内部信息不进入通知", async () => {
    const f = await ticket();
    await service().adminUpdateStatus(f.id, { status: "resolved", result: "已修复，联系13800000000" });
    const saved = await db.feedback.findUniqueOrThrow({ where: { id: f.id } });
    expect(publicFeedbackReply(saved.result)).toBe("已修复，联系13800000000");
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.userId } });
    expect(n.idempotencyKey).toMatch(new RegExp(`^${f.userId}:FEEDBACK_RESOLVED:${f.id}:`));
    expect(n.targetId).toBe(f.id);
    expect(n.targetType).toBe("FEEDBACK");
    expect(JSON.stringify(n)).not.toContain("13800000000");
    expect(JSON.stringify(n)).not.toContain("内部诊断原文");
    expect(await task().deliverPendingReplies()).toBe(0);
  });

  it("通知 INSERT 实际失败不回滚结案，新实例恢复后只补一条", async () => {
    const f = await ticket();
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_feedback_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notice failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_feedback_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_feedback_fail()`);
    try {
      await service().adminUpdateStatus(f.id, { status: "resolved", result: "已处理" });
      expect((await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).status).toBe("resolved");
      expect(await db.notification.count({ where: { userId: f.userId } })).toBe(0);
      await expect(task().deliverPendingReplies()).rejects.toThrow();
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_feedback_fail ON "Notification"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_feedback_fail()`);
    }
    expect(await task().deliverPendingReplies()).toBe(1);
    expect(await task().deliverPendingReplies()).toBe(0);
  });

  it("结案后未执行即时发送也有持久待办，新任务无需重做结案", async () => {
    const f = await ticket();
    await closeWithoutNotice(f.id);
    expect(await db.notification.count({ where: { userId: f.userId } })).toBe(0);
    expect(await task().deliverPendingReplies()).toBe(1);
    await expect(service().adminUpdateStatus(f.id, { status: "resolved", result: "重试" })).rejects.toThrow();
    expect(await task().deliverPendingReplies()).toBe(0);
  });

  it("结案 UPDATE 实际失败不留下事件或成功通知", async () => {
    const f = await ticket();
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_feedback_update_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic update failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_feedback_update_fail BEFORE UPDATE ON "Feedback" FOR EACH ROW EXECUTE FUNCTION synthetic_feedback_update_fail()`);
    try { await expect(service().adminUpdateStatus(f.id, { status: "resolved", result: "已处理" })).rejects.toThrow(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_feedback_update_fail ON "Feedback"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_feedback_update_fail()`);
    }
    expect(await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({ status: "processing", result: null });
    expect(await task().deliverPendingReplies()).toBe(0);
  });

  it("结案与通知所在事务回滚，不留下成功通知或待办", async () => {
    const f = await ticket();
    await expect(db.$transaction(async tx => {
      await service(tx).adminUpdateStatus(f.id, { status: "resolved", result: "已处理" });
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    expect((await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).status).toBe("processing");
    expect(await task().deliverPendingReplies()).toBe(0);
    expect(await db.notification.count({ where: { userId: f.userId } })).toBe(0);
  });

  it("两个独立 Node 进程竞争真实待办，仅一条通知", async () => {
    const f = await ticket();
    await closeWithoutNotice(f.id);
    const code = `require('reflect-metadata');
      const { PrismaClient } = require('@prisma/client');
      const { FeedbackNotificationTask } = require(${JSON.stringify(resolve("src/modules/user/feedback-notification.task.ts"))});
      const db = new PrismaClient({ datasources: { db: { url: process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL } } });
      (async () => { try { console.log(JSON.stringify({ inserted: await new FeedbackNotificationTask(db).deliverPendingReplies() })); }
        finally { await db.$disconnect(); } })().catch(() => { process.exitCode = 1; });`;
    const run = () => promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
    const results = await Promise.all([run(), run()]);
    expect(results.map(r => JSON.parse(r.stdout.trim()).inserted).reduce((a, b) => a + b, 0)).toBe(1);
    expect(await db.notification.count({ where: { userId: f.userId } })).toBe(1);
  });

  it("结案提交后进程实际退出，新进程仍能识别待办", async () => {
    const f = await ticket();
    const code = `require('reflect-metadata');
      const { PrismaClient } = require('@prisma/client');
      const { FeedbackService } = require(${JSON.stringify(resolve("src/modules/user/feedback.service.ts"))});
      const db = new PrismaClient({ datasources: { db: { url: process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL } } });
      new FeedbackService(db, { deliverPendingReplies: async () => process.exit(0) })
        .adminUpdateStatus(${JSON.stringify(f.id)}, { status: 'resolved', result: '合成进程退出测试' })
        .catch(() => process.exit(1));`;
    await promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
    expect((await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).status).toBe("resolved");
    expect(await db.notification.count({ where: { userId: f.userId } })).toBe(0);
    expect(await task().deliverPendingReplies()).toBe(1);
    expect(await task().deliverPendingReplies()).toBe(0);
  });

  it("同一旧快照的两个结案请求，CAS 仅允许一个写入与通知", async () => {
    const f = await ticket();
    const original = db.feedback.findUnique.bind(db.feedback);
    let reads = 0;
    let release!: () => void;
    const barrier = new Promise<void>(r => { release = r; });
    jest.spyOn(db.feedback, "findUnique").mockImplementation(async args => {
      const snapshot = await original(args);
      if (++reads === 2) release();
      await barrier;
      return snapshot;
    });
    const results = await Promise.allSettled([
      service().adminUpdateStatus(f.id, { status: "resolved", result: "甲回复" }),
      service().adminUpdateStatus(f.id, { status: "resolved", result: "乙回复" }),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const saved = await original({ where: { id: f.id } });
    expect(saved?.status).toBe("resolved");
    expect(["甲回复", "乙回复"]).toContain(publicFeedbackReply(saved?.result));
    // 败方 CAS 尚未释放行锁时，即时 SQL 的 SKIP LOCKED 可以留下持久待办。
    const immediate = await db.notification.count({ where: { userId: f.userId } });
    expect([0, 1]).toContain(immediate);
    expect(await task().deliverPendingReplies(f.id)).toBe(1 - immediate);
    expect(await db.notification.count({ where: { userId: f.userId } })).toBe(1);
    expect(await task().deliverPendingReplies(f.id)).toBe(0);
  });

  it("结案后的行锁阻挡即时通知，释放后分钟任务补发且不重复", async () => {
    const f = await ticket();
    let release!: () => void;
    let locked!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const ready = new Promise<void>(r => { locked = r; });
    let lockWork: Promise<void> | undefined;
    const immediate = jest.fn(async () => {
      lockWork = db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Feedback" WHERE id = ${f.id} FOR UPDATE`;
        locked();
        await gate;
      });
      await ready;
      try { return await task().deliverPendingReplies(f.id); }
      finally { release(); await lockWork; }
    });
    try {
      await new FeedbackService(db as unknown as PrismaService,
        { deliverPendingReplies: immediate } as unknown as FeedbackNotificationTask)
        .adminUpdateStatus(f.id, { status: "resolved", result: "合成并发结案结果" });
      expect(immediate).toHaveBeenCalledTimes(1);
      expect(await immediate.mock.results[0].value).toBe(0);
      expect((await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).status).toBe("resolved");
      expect(await db.notification.count({ where: { userId: f.userId } })).toBe(0);
      await task().tick();
      expect(await db.notification.count({ where: { userId: f.userId } })).toBe(1);
      expect(await task().deliverPendingReplies(f.id)).toBe(0);
    } finally { release(); await lockWork; }
  });

  it("回退正在持锁时不发送过时结案，重新结案建立新事件", async () => {
    const f = await ticket();
    await closeWithoutNotice(f.id);
    const oldResult = (await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).result;
    await db.$transaction(async tx => {
      await tx.feedback.update({ where: { id: f.id }, data: { status: "processing" } });
      expect(await task().deliverPendingReplies()).toBe(0);
    });
    expect(await task().deliverPendingReplies()).toBe(0);
    await service().adminUpdateStatus(f.id, { status: "resolved", result: "重新处理完成" });
    const saved = await db.feedback.findUniqueOrThrow({ where: { id: f.id } });
    expect(saved.result).not.toBe(oldResult);
    expect(await db.notification.count({ where: { userId: f.userId } })).toBe(1);
  });

  it("已通知后回退再结案，相同回复也不复用原事件键", async () => {
    const f = await ticket();
    await service().adminUpdateStatus(f.id, { status: "resolved", result: "处理完成" });
    await service().adminUpdateStatus(f.id, { status: "pending", result: "需重新处理" });
    await service().adminUpdateStatus(f.id, { status: "resolved", result: "处理完成" });
    const rows = await db.notification.findMany({ where: { userId: f.userId } });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map(n => n.idempotencyKey)).size).toBe(2);
    expect(await task().deliverPendingReplies()).toBe(0);
  });

  it("状态回到同名但版本已变更时，旧快照不能覆盖新的处理结果", async () => {
    const f = await ticket();
    const original = db.feedback.findUnique.bind(db.feedback);
    jest.spyOn(db.feedback, "findUnique").mockImplementationOnce(async args => {
      const snapshot = await original(args);
      await db.feedback.update({ where: { id: f.id }, data: { status: "resolved", result: encodeFeedbackReply("另一人先结案", true) } });
      await db.feedback.update({ where: { id: f.id }, data: {
        status: "processing", result: "重新核查原因", updatedAt: new Date(f.updatedAt.getTime() + 1000),
      } });
      return snapshot;
    });
    await expect(service().adminUpdateStatus(f.id, { status: "resolved", result: "旧请求" })).rejects.toThrow();
    expect(await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({ status: "processing", result: "重新核查原因" });
    expect(await task().deliverPendingReplies()).toBe(0);
    expect(await db.notification.count({ where: { userId: f.userId } })).toBe(0);
  });

  it("历史 V1、内部备注、非工单和损坏标记不补发", async () => {
    for (const result of ["[public-reply:v1]\n旧公开回复", "内部备注13800000000", "[public-reply:v2:错误]\n内部备注"]) {
      await ticket({ status: "resolved", result });
    }
    await ticket({ status: "resolved", type: "feed_dislike", result: encodeFeedbackReply("非工单", true) });
    await ticket({ status: "processing", result: encodeFeedbackReply("处理中", true) });
    expect(await task().deliverPendingReplies()).toBe(0);
  });

  it("已完成记录不占满批次，101 个结案分两次补齐", async () => {
    const owner = await user();
    await db.feedback.createMany({ data: Array.from({ length: 101 }, () => ({
      userId: owner, type: "bug", content: "合成批量反馈", status: "resolved", result: encodeFeedbackReply("已处理", true),
    })) });
    expect(await task().deliverPendingReplies()).toBe(100);
    expect(await task().deliverPendingReplies()).toBe(1);
    expect(await task().deliverPendingReplies()).toBe(0);
    expect(await db.notification.count({ where: { userId: owner } })).toBe(101);
  });

  it.each(["UTC", "Asia/Shanghai", "America/Los_Angeles"])("会话时区 %s 不改变通知时间与事件键", async zone => {
    const f = await ticket();
    await closeWithoutNotice(f.id);
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
      expect(await task(tx).deliverPendingReplies()).toBe(1);
    });
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.userId } });
    expect(Math.abs(n.createdAt.getTime() - Date.now())).toBeLessThan(60000);
    expect(n.idempotencyKey).toContain(":FEEDBACK_RESOLVED:");
  });

  it("真实 JWT HTTP 权限链：客服结案，本人读取，跨用户与未登录拒绝", async () => {
    const f = await ticket();
    const stranger = await user();
    const operator = await user();
    await db.userRole.create({ data: { userId: operator, roleType: "CUSTOMER_SERVICE" } });
    const path = `/users/admin/feedback/${f.id}/status`;
    const dto = { status: "resolved", result: "公开客服回复" };
    await request(app.getHttpServer()).put(path).send(dto).expect(401);
    await request(app.getHttpServer()).put(path).set("Authorization", auth(stranger)).send(dto).expect(403);
    await request(app.getHttpServer()).put(path).set("Authorization", auth(operator)).send(dto).expect(200);
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.userId } });
    await request(app.getHttpServer()).get(`/notifications/${n.id}`).expect(401);
    await request(app.getHttpServer()).get(`/notifications/${n.id}`).set("Authorization", auth(stranger)).expect(404);
    await request(app.getHttpServer()).get(`/notifications/${n.id}`).set("Authorization", auth(f.userId)).expect(200);
    const own = await request(app.getHttpServer()).get("/users/feedback/history").set("Authorization", auth(f.userId)).expect(200);
    expect(own.body[0]).toMatchObject({ id: f.id, reply: "公开客服回复" });
    expect(JSON.stringify(own.body)).not.toContain("public-reply");
    const other = await request(app.getHttpServer()).get(`/users/feedback/history?userId=${f.userId}`).set("Authorization", auth(stranger)).expect(200);
    expect(other.body).toEqual([]);
    await request(app.getHttpServer()).get(`/users/admin/feedback/${f.id}`).set("Authorization", auth(stranger)).expect(403);
  });

  it("真实 HTTP 结案在通知库故障时仍成功，恢复后补发；参数错误不能结案", async () => {
    const f = await ticket();
    const operator = await user();
    await db.userRole.create({ data: { userId: operator, roleType: "CUSTOMER_SERVICE" } });
    const path = `/users/admin/feedback/${f.id}/status`;
    await request(app.getHttpServer()).put(path).set("Authorization", auth(operator)).send({ status: "非法状态" }).expect(400);
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_feedback_http_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic HTTP notice failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_feedback_http_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_feedback_http_fail()`);
    try {
      await request(app.getHttpServer()).put(path).set("Authorization", auth(operator)).send({ status: "resolved", result: "已处理" }).expect(200);
      expect((await db.feedback.findUniqueOrThrow({ where: { id: f.id } })).status).toBe("resolved");
      expect(await db.notification.count({ where: { userId: f.userId } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_feedback_http_fail ON "Notification"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_feedback_http_fail()`);
    }
    expect(await task().deliverPendingReplies()).toBe(1);
    expect(await task().deliverPendingReplies()).toBe(0);
  });
});
