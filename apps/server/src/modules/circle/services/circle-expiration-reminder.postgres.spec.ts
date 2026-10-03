import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { CircleMembershipService } from "./circle-membership.service";
import type { CircleSharedService } from "./circle-shared.service";
import type { PrismaService } from "../../../prisma/prisma.service";
import type { RedisService } from "../../../redis/redis.service";
import type { UnifiedPricingService } from "../../pricing/unified-pricing.service";
import type { NotificationService } from "../../notification/notification.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462"
    || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("圈子提醒测试只允许明确的本机合成库，不回退DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("圈子到期提醒 PostgreSQL 持久恢复", () => {
  let db: PrismaClient;
  const users: string[] = [];
  const circles: string[] = [];
  const now = new Date("2035-06-01T02:00:00Z");
  const expiry = new Date("2035-06-08T15:59:59.123Z");
  const forbidden = jest.fn(() => { throw new Error("禁止Redis认领或真实推送"); });
  const service = (client: PrismaClient | Prisma.TransactionClient = db) => new CircleMembershipService(
    client as unknown as PrismaService, { runExclusive: forbidden } as unknown as RedisService,
    {} as UnifiedPricingService, {} as CircleSharedService, undefined, undefined,
    { send: forbidden } as unknown as NotificationService,
  );
  const user = async () => {
    const row = await db.user.create({ data: { nickname: "合成圈子提醒用户" } });
    users.push(row.id);
    return row.id;
  };
  const circle = async (extra: Partial<Prisma.CircleUncheckedCreateInput> = {}) => {
    const row = await db.circle.create({ data: {
      name: "合成提醒圈", intro: "仅隔离数据库验证", tags: [], ownerId: await user(), status: "ACTIVE", ...extra,
    } });
    circles.push(row.id);
    return row;
  };
  const member = async (extra: Partial<Prisma.CircleMemberUncheckedCreateInput> = {}) => {
    const circleId = extra.circleId ?? (await circle()).id;
    return db.circleMember.create({ data: { circleId, userId: await user(), expireAt: expiry, ...extra } });
  };

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(identity[0].port)) {
      throw new Error("专用合成库身份不符");
    }
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db?.$disconnect(); expect(forbidden).not.toHaveBeenCalled(); });

  it("7/3/1北京自然日提醒准确，类别和目标一并落库，重复只建一条", async () => {
    for (const days of [7, 3, 1]) await member({ expireAt: new Date(`2035-06-0${days + 1}T15:59:59.123Z`) });
    expect(await service().runExpirationReminders(now)).toBe(3);
    expect(await service().runExpirationReminders(now)).toBe(0);
    const notices = await db.notification.findMany({ where: { userId: { in: users } } });
    expect(notices).toHaveLength(3);
    for (const n of notices) {
      expect(n.category).toBe("GOVERN"); expect(n.type).toBe("CIRCLE_EXPIRING");
      expect(n.targetType).toBe("CIRCLE"); expect(n.targetId).toBe(n.circleId);
      expect(n.createdAt).toEqual(now); expect(n.content).toMatch(/ [137] 天后/);
      expect(n.idempotencyKey).toMatch(/:CIRCLE_EXPIRING:.*:2035-06-0[248]T15:59:59.123Z:[137]$/);
    }
  });

  it("北京10点前不打扰，10点后可以补发", async () => {
    await member();
    expect(await service().runExpirationReminders(new Date("2035-06-01T01:59:59.999Z"))).toBe(0);
    expect(await service().runExpirationReminders(now)).toBe(1);
  });

  it("圈主、永久、非提醒日期、下架和软删除圈子不发提醒", async () => {
    await member({ role: "OWNER" }); await member({ expireAt: null });
    await member({ expireAt: new Date("2035-06-01T15:59:59Z") });
    await member({ expireAt: new Date("2035-06-03T15:59:59Z") });
    await member({ circleId: (await circle({ status: "PENDING" })).id });
    await member({ circleId: (await circle({ deletedAt: now })).id });
    const c = await circle(); await member({ circleId: c.id, userId: c.ownerId });
    expect(await service().runExpirationReminders(now)).toBe(0);
  });

  it.each(["UTC", "Asia/Shanghai", "America/Los_Angeles"])("会话时区%s不改变自然日、通知时间或事件键", async zone => {
    const m = await member();
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${zone}'`);
      expect(await service(tx).runExpirationReminders(now)).toBe(1);
    });
    const n = await db.notification.findFirstOrThrow({ where: { userId: m.userId } });
    expect(n.createdAt).toEqual(now);
    expect(n.idempotencyKey).toBe(`${m.userId}:CIRCLE_EXPIRING:${m.id}:2035-06-08T15:59:59.123Z:7`);
  });

  it("真实INSERT失败不改变成员或圈子，下一实例只补一条", async () => {
    const m = await member();
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_circle_remind_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notification failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_circle_remind_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_circle_remind_fail()`);
    try {
      await expect(service().runExpirationReminders(now)).rejects.toThrow();
      expect((await db.circleMember.findUniqueOrThrow({ where: { id: m.id } })).expireAt).toEqual(expiry);
      expect(await db.notification.count({ where: { userId: m.userId } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_circle_remind_fail ON "Notification"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_circle_remind_fail()`);
    }
    expect(await service().runExpirationReminders(new Date(now.getTime() + 60000))).toBe(1);
    expect(await service().runExpirationReminders(now)).toBe(0);
  });

  it("两实例同时发送仅有一条，计数相加为一", async () => {
    const m = await member();
    const counts = await Promise.all([service().runExpirationReminders(now), service().runExpirationReminders(now)]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await db.notification.count({ where: { userId: m.userId } })).toBe(1);
  });

  it("两个独立Node进程调用真实入口仅建立一条", async () => {
    const m = await member();
    const code = `require('reflect-metadata');const {PrismaClient}=require('@prisma/client');
      const {CircleMembershipService}=require(${JSON.stringify(resolve("src/modules/circle/services/circle-membership.service.ts"))});
      const db=new PrismaClient({datasources:{db:{url:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL}}});
      (async()=>{try{console.log(JSON.stringify({inserted:await new CircleMembershipService(db,{},{},{}).runExpirationReminders(new Date('2035-06-01T02:00:00Z'))}));}
      finally{await db.$disconnect();}})().catch(()=>{process.exitCode=1;});`;
    const run = () => promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      cwd: process.cwd(), env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
    const outputs = await Promise.all([run(), run()]);
    expect(outputs.map(r => JSON.parse(r.stdout.trim().split("\n").at(-1)!).inserted).reduce((a, b) => a + b, 0)).toBe(1);
    expect(await db.notification.count({ where: { userId: m.userId } })).toBe(1);
  });

  it("调用所在事务回滚不会留下通知，下次仍可发送", async () => {
    const m = await member();
    await expect(db.$transaction(async tx => {
      expect(await service(tx).runExpirationReminders(now)).toBe(1); throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    expect(await db.notification.count({ where: { userId: m.userId } })).toBe(0);
    expect(await service().runExpirationReminders(now)).toBe(1);
  });

  it("正在续期时跳过，提交新到期日后不发旧提醒", async () => {
    const m = await member();
    await db.$transaction(async tx => {
      await tx.circleMember.update({ where: { id: m.id }, data: { expireAt: new Date("2035-07-01T02:00:00Z") } });
      expect(await service().runExpirationReminders(now)).toBe(0);
    });
    expect(await service().runExpirationReminders(now)).toBe(0);
    expect(await db.notification.count({ where: { userId: m.userId } })).toBe(0);
  });

  it("正在退圈时跳过，删除提交后不发不存在成员的提醒", async () => {
    const m = await member();
    await db.$transaction(async tx => {
      await tx.circleMember.delete({ where: { id: m.id } });
      expect(await service().runExpirationReminders(now)).toBe(0);
    });
    expect(await service().runExpirationReminders(now)).toBe(0);
  });

  it("正在下架圈子时跳过，下架提交后不发续费提醒", async () => {
    const m = await member();
    await db.$transaction(async tx => {
      await tx.circle.update({ where: { id: m.circleId }, data: { status: "PENDING" } });
      expect(await service().runExpirationReminders(now)).toBe(0);
    });
    expect(await service().runExpirationReminders(now)).toBe(0);
  });

  it("超过原500上限的501名成员分批全部完成，已发送不占批次", async () => {
    const c = await circle();
    const ids = Array.from({ length: 501 }, () => randomUUID()); users.push(...ids);
    await db.user.createMany({ data: ids.map(id => ({ id, nickname: "合成批次成员" })) });
    await db.circleMember.createMany({ data: ids.map(userId => ({ circleId: c.id, userId, expireAt: expiry })) });
    expect(await service().runExpirationReminders(now)).toBe(200);
    expect(await service().runExpirationReminders(now)).toBe(200);
    expect(await service().runExpirationReminders(now)).toBe(101);
    expect(await service().runExpirationReminders(now)).toBe(0);
    expect(await db.notification.count({ where: { circleId: c.id } })).toBe(501);
  });

  it("升级当日旧无键同圈同天数提醒不重发，其他旧日期不挡住", async () => {
    const a = await member(); const b = await member();
    for (const [m, createdAt] of [[a, now], [b, new Date("2035-05-31T02:00:00Z")]] as const) {
      await db.notification.create({ data: { userId: m.userId, type: "CIRCLE_EXPIRING", title: "圈子即将到期",
        content: "您的圈子会员将于 7 天后到期，请及时续费", targetType: "CIRCLE", targetId: m.circleId, createdAt } });
    }
    expect(await service().runExpirationReminders(now)).toBe(1);
    expect(await db.notification.count({ where: { userId: a.userId } })).toBe(1);
    expect(await db.notification.count({ where: { userId: b.userId } })).toBe(2);
  });

  it("续期后的精确新到期时间不被旧键挡住，跨日不补旧7天文案", async () => {
    const m = await member();
    expect(await service().runExpirationReminders(now)).toBe(1);
    await db.circleMember.update({ where: { id: m.id }, data: { expireAt: new Date("2035-06-08T15:59:59.456Z") } });
    expect(await service().runExpirationReminders(now)).toBe(1);
    expect(await service().runExpirationReminders(new Date("2035-06-02T02:00:00Z"))).toBe(0);
  });

  it("同用户两个圈子的提醒各自建立，不跨圈去重", async () => {
    const a = await member(); await member({ userId: a.userId });
    expect(await service().runExpirationReminders(now)).toBe(2);
    expect(await db.notification.count({ where: { userId: a.userId } })).toBe(2);
  });
});
