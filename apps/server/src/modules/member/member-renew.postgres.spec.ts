import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { MemberGrantService } from "./member-grant.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { RedisService } from "../../redis/redis.service";
import type { MemberBenefitService } from "./member-benefit.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462"
    || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("会员提醒测试只允许专用本机合成库，禁止回退 DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("会员续费提醒 PostgreSQL 持久补发", () => {
  let db: PrismaClient;
  const users: string[] = [];
  const now = new Date("2035-06-01T02:00:00.000Z"); // 北京 10 点
  const expiry = new Date("2035-06-08T15:59:59.123Z"); // 北京自然日 7 天后，超过 7*24 小时
  const forbiddenRedis = { setNX: jest.fn(() => { throw new Error("禁止 Redis 抢占或真实渠道"); }) };
  const service = (client: PrismaClient | Prisma.TransactionClient = db) =>
    new MemberGrantService(client as unknown as PrismaService, forbiddenRedis as unknown as RedisService, {} as MemberBenefitService);
  const member = async (extra: Partial<Prisma.UserCreateInput> = {}) => {
    const u = await db.user.create({ data: {
      nickname: "合成会员提醒用户", memberLevel: "YEARLY", memberAutoRenew: true, memberExpire: expiry, ...extra,
    } });
    users.push(u.id);
    return u;
  };

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_")) throw new Error("合成库身份不符");
  });
  afterEach(async () => {
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => {
    await db?.$disconnect();
    expect(forbiddenRedis.setNX).not.toHaveBeenCalled();
  });

  it("自然日 7 天提前提醒覆盖不同到期时刻，重放仅一条且计数准确", async () => {
    const u = await member();
    expect(await service().runAutoRenewRemind(now)).toBe(1);
    expect(await service().runAutoRenewRemind(new Date(now.getTime() + 60000))).toBe(0);
    const n = await db.notification.findFirstOrThrow({ where: { userId: u.id } });
    expect(n.idempotencyKey).toBe(`${u.id}:MEMBER_RENEW_REMIND:2035-06-08T15:59:59.123Z:7`);
    expect(n.targetType).toBe("MEMBER");
    expect(n.targetId).toBe(u.id);
    expect(n.content).toContain("7 天后");
    expect(n.createdAt.toISOString()).toBe(now.toISOString());
  });

  it("北京 10 点之前不打扰，10 点后可补发", async () => {
    await member();
    expect(await service().runAutoRenewRemind(new Date("2035-06-01T01:59:59.999Z"))).toBe(0);
    expect(await service().runAutoRenewRemind(now)).toBe(1);
  });

  it("今日到期既包含尚未到期也包含今日已到期，早已过期不误报今日", async () => {
    await member({ memberExpire: new Date("2035-06-01T15:59:59Z") });
    await member({ memberExpire: new Date("2035-05-31T16:00:00Z") });
    const yesterday = await member({ memberExpire: new Date("2035-05-31T15:59:59Z") });
    expect(await service().runAutoRenewRemind(now)).toBe(2);
    expect(await db.notification.count({ where: { userId: yesterday.id } })).toBe(0);
    expect(await db.notification.count({ where: { title: "书院会员今日到期" } })).toBe(2);
    expect(await service().runAutoRenewRemind(new Date("2035-06-02T02:00:00Z"))).toBe(0);
  });

  it("取消提醒、撤销等级、长期有效和其他日期不发送", async () => {
    await member({ memberAutoRenew: false });
    await member({ memberLevel: "NONE" });
    await member({ memberExpire: null, memberLevel: "LIFETIME" });
    await member({ memberExpire: new Date("2035-06-02T02:00:00Z") });
    await member({ memberExpire: new Date("2035-06-09T02:00:00Z") });
    expect(await service().runAutoRenewRemind(now)).toBe(0);
  });

  it.each(["UTC", "Asia/Shanghai", "America/Los_Angeles"])("数据库会话时区 %s 不改变到期日、事件键或通知时间", async zone => {
    const u = await member();
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
      expect(await service(tx).runAutoRenewRemind(now)).toBe(1);
    });
    const n = await db.notification.findFirstOrThrow({ where: { userId: u.id } });
    expect(n.createdAt.toISOString()).toBe(now.toISOString());
    expect(n.idempotencyKey).toBe(`${u.id}:MEMBER_RENEW_REMIND:2035-06-08T15:59:59.123Z:7`);
  });

  it("通知 INSERT 实际失败不改变会员，旧 Redis 占位不能阻止新实例恢复", async () => {
    const u = await member();
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_renew_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic renew insert failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_renew_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_renew_fail()`);
    try {
      await expect(service().runAutoRenewRemind(now)).rejects.toThrow();
      const current = await db.user.findUniqueOrThrow({ where: { id: u.id } });
      expect(current.memberExpire).toEqual(expiry);
      expect(current.memberLevel).toBe("YEARLY");
      expect(await db.notification.count({ where: { userId: u.id } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_renew_fail ON "Notification"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_renew_fail()`);
    }
    expect(await service().runAutoRenewRemind(new Date(now.getTime() + 60000))).toBe(1);
    expect(await service().runAutoRenewRemind(now)).toBe(0);
  });

  it("续期的新精确到期时刻不会被旧事件键挡住，改到其他日期不发过时提醒", async () => {
    const u = await member();
    expect(await service().runAutoRenewRemind(now)).toBe(1);
    await db.user.update({ where: { id: u.id }, data: { memberExpire: new Date("2035-06-08T15:59:59.456Z") } });
    expect(await service().runAutoRenewRemind(now)).toBe(1);
    await db.user.update({ where: { id: u.id }, data: { memberExpire: new Date("2035-07-01T15:59:59Z") } });
    expect(await service().runAutoRenewRemind(now)).toBe(0);
    expect(await db.notification.count({ where: { userId: u.id } })).toBe(2);
  });

  it("旧版当日无键提醒不重复打扰，其他日期旧提醒不阻塞", async () => {
    const current = await member();
    const previous = await member();
    for (const [u, createdAt] of [[current, now], [previous, new Date("2035-05-31T02:00:00Z")]] as const) {
      await db.notification.create({ data: { userId: u.id, type: "SYSTEM", title: "书院会员即将到期", content: "合成旧提醒", targetType: "MEMBER", targetId: u.id, createdAt } });
    }
    expect(await service().runAutoRenewRemind(now)).toBe(1);
    expect(await db.notification.count({ where: { userId: current.id } })).toBe(1);
    expect(await db.notification.count({ where: { userId: previous.id } })).toBe(2);
  });

  it("已完成记录不占满批次，下一次补齐超过 200 人的待办", async () => {
    for (let i = 0; i < 201; i++) await member();
    expect(await service().runAutoRenewRemind(now)).toBe(200);
    expect(await service().runAutoRenewRemind(now)).toBe(1);
    expect(await service().runAutoRenewRemind(now)).toBe(0);
  });

  it("两个独立 Node 进程并发执行真实入口，最终只建立一条", async () => {
    const u = await member();
    const code = `require('reflect-metadata');
      const { PrismaClient } = require('@prisma/client');
      const { MemberGrantService } = require(${JSON.stringify(resolve("src/modules/member/member-grant.service.ts"))});
      const db = new PrismaClient({ datasources: { db: { url: process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL } } });
      (async () => { try { console.log(JSON.stringify({ inserted: await new MemberGrantService(db, {}, {}).runAutoRenewRemind(new Date('2035-06-01T02:00:00Z')) })); }
        finally { await db.$disconnect(); } })().catch(() => { process.exitCode = 1; });`;
    const run = () => promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      cwd: process.cwd(), env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
    const results = await Promise.all([run(), run()]);
    const counts = results.map(r => JSON.parse(r.stdout.trim().split("\n").at(-1)!).inserted);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await db.notification.count({ where: { userId: u.id } })).toBe(1);
  });

  it("提醒所在事务失败不会留下通知，下次事务可继续处理", async () => {
    const u = await member();
    await expect(db.$transaction(async tx => {
      expect(await service(tx).runAutoRenewRemind(now)).toBe(1);
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    expect(await db.notification.count({ where: { userId: u.id } })).toBe(0);
    expect(await service().runAutoRenewRemind(now)).toBe(1);
  });

  it("正在续期的用户不阻塞调度，提交新状态后不会发送旧到期提醒", async () => {
    const u = await member();
    await db.$transaction(async tx => {
      await tx.user.update({ where: { id: u.id }, data: { memberExpire: new Date("2035-07-01T02:00:00Z") } });
      expect(await service().runAutoRenewRemind(now)).toBe(0);
    });
    expect(await service().runAutoRenewRemind(now)).toBe(0);
    expect(await db.notification.count({ where: { userId: u.id } })).toBe(0);
  });
});
