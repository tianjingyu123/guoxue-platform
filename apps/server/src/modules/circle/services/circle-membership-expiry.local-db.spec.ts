import { Prisma, PrismaClient } from "@prisma/client";
import { CircleMembershipService } from "./circle-membership.service";
import { CircleMembershipExpiryNotificationTask, clearCircleExpiryCaches } from "./circle-membership-expiry-notification.task";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { CircleSharedService } from "./circle-shared.service";
import { UnifiedPricingService } from "../../pricing/unified-pricing.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55462" || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("到期恢复只允许指定合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("过期删除事实同事务与站内恢复的真实数据库", () => {
  let db: PrismaClient;
  const users: string[] = [], circles: string[] = [];
  const expiry = new Date("2020-01-01T00:00:00Z");
  const del = jest.fn(async () => 1), delByPattern = jest.fn(async () => 1);
  const pingShared = jest.fn(async () => undefined);
  const redis = { del, delByPattern, pingShared, runExclusive: async (_k: string, _t: number, fn: () => Promise<void>) => fn() } as unknown as RedisService;
  const service = (client: unknown = db) => new CircleMembershipService(client as PrismaService, redis, {} as UnifiedPricingService, {} as CircleSharedService);
  const fixture = async () => {
    const owner = await db.user.create({ data: { nickname: "合成圈主" } }), user = await db.user.create({ data: { nickname: "合成到期成员" } }); users.push(owner.id, user.id);
    const c = await db.circle.create({ data: { name: "合成到期圈", intro: "只验证隔离事实", tags: [], ownerId: owner.id, memberCount: 2, status: "ACTIVE" } }); circles.push(c.id);
    await db.circleMember.create({ data: { circleId: c.id, userId: owner.id, role: "OWNER" } });
    const m = await db.circleMember.create({ data: { circleId: c.id, userId: user.id, expireAt: expiry } });
    return { circle: c.id, user: user.id, member: m.id };
  };
  type F = Awaited<ReturnType<typeof fixture>>;
  const fact = (f: F) => db.circleMembershipExpiryNotice.findUnique({ where: { memberId: f.member } });
  const notice = (f: F) => db.notification.findUnique({ where: { idempotencyKey: f.user + ":CIRCLE_EXPIRED:" + f.member + ":" + expiry.toISOString() } });
  const count = async (f: F) => (await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount;
  const scan = (work: () => Promise<void>) => ({ circleMember: { findMany: async (args: Prisma.CircleMemberFindManyArgs) => { const rows = await db.circleMember.findMany(args); await work(); return rows; } }, $transaction: (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(fn), $queryRaw: db.$queryRaw.bind(db), $executeRaw: db.$executeRaw.bind(db) });
  const fail = async (table: string, op: string, work: () => Promise<void>) => {
    if (!["Circle", "Notification", "CircleMembershipExpiryNotice"].includes(table) || !["INSERT", "UPDATE"].includes(op)) throw new Error("故障目标不合法");
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_expiry_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic expiry failure'; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER synthetic_expiry_failure BEFORE ' + op + ' ON "' + table + '" FOR EACH ROW EXECUTE FUNCTION synthetic_expiry_failure()');
    try { await work(); } finally { await db.$executeRawUnsafe('DROP TRIGGER synthetic_expiry_failure ON "' + table + '"'); await db.$executeRawUnsafe('DROP FUNCTION synthetic_expiry_failure()'); }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [id] = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!id.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(id.port)) throw new Error("隔离库身份不符");
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.notification.deleteMany({ where: { userId: { in: users } } }); await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } }); await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    del.mockReset().mockResolvedValue(1); delByPattern.mockReset().mockResolvedValue(1);
    pingShared.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await db.$disconnect(); });
  it("删除、人数、真实UTC到期事实共同提交；首次分类目标正确且不重复", async () => {
    const f = await fixture(); await service().cleanupExpiredMembers(); await service().cleanupExpiredMembers();
    expect(await count(f)).toBe(1); expect(await db.circleMember.findUnique({ where: { id: f.member } })).toBeNull(); expect((await fact(f))?.expiredAt.toISOString()).toBe(expiry.toISOString()); expect((await fact(f))?.cacheClearedAt).not.toBeNull();
    const n = await notice(f); expect(n).toMatchObject({ userId: f.user, category: "GOVERN", circleId: f.circle, targetType: "CIRCLE", targetId: f.circle }); expect(n?.content).toContain("2020-01-01 08:00"); expect(n?.content).toContain("当前权益"); expect(await db.notification.count({ where: { userId: f.user } })).toBe(1);
  });
  it.each(["renewed", "changedPast", "promoted", "owner", "rejoined"])("扫描后%s不删除、不创建旧事实", async (change) => {
    const f = await fixture(); let replacement = f.member;
    await service(scan(async () => {
      if (change === "renewed" || change === "changedPast") await db.circleMember.update({ where: { id: f.member }, data: { expireAt: new Date(change === "renewed" ? "2040-01-01T00:00:00Z" : "2021-01-01T00:00:00Z") } });
      if (change === "promoted") await db.circleMember.update({ where: { id: f.member }, data: { role: "OWNER" } });
      if (change === "owner") await db.circle.update({ where: { id: f.circle }, data: { ownerId: f.user } });
      if (change === "rejoined") { await db.circleMember.delete({ where: { id: f.member } }); replacement = (await db.circleMember.create({ data: { circleId: f.circle, userId: f.user, expireAt: expiry } })).id; }
    })).cleanupExpiredMembers();
    expect(await fact(f)).toBeNull(); expect(await notice(f)).toBeNull(); expect(await count(f)).toBe(2); expect(await db.circleMember.findUnique({ where: { id: replacement } })).not.toBeNull();
  });
  it.each([["CircleMembershipExpiryNotice", "INSERT"], ["Circle", "UPDATE"]])("真实%s写入失败删除/人数/事实回滚，不能通知成功", async (table, op) => {
    const f = await fixture(); await fail(table, op, async () => { await expect(service().cleanupExpiredMembers()).rejects.toThrow(); });
    expect(await count(f)).toBe(2); expect(await db.circleMember.findUnique({ where: { id: f.member } })).not.toBeNull(); expect(await fact(f)).toBeNull(); expect(await notice(f)).toBeNull(); expect(del).not.toHaveBeenCalled();
  });
  it("异常零人数拒绝整批，不变负数、不改历史计数", async () => {
    const f = await fixture(); await db.circle.update({ where: { id: f.circle }, data: { memberCount: 0 } }); await expect(service().cleanupExpiredMembers()).rejects.toThrow("正在核对"); expect(await count(f)).toBe(0); expect(await fact(f)).toBeNull(); expect(await db.circleMember.findUnique({ where: { id: f.member } })).not.toBeNull();
  });
  it("通知INSERT失败不回滚删除、不挡缓存；调度恢复后只发一次", async () => {
    const f = await fixture(); await fail("Notification", "INSERT", async () => { await service().cleanupExpiredMembers(); expect(await notice(f)).toBeNull(); }); expect(await count(f)).toBe(1); expect((await fact(f))?.cacheClearedAt).not.toBeNull();
    const task = new CircleMembershipExpiryNotificationTask(db as PrismaService, redis); await task.tick(); await task.tick(); expect(await notice(f)).not.toBeNull(); expect(await db.notification.count({ where: { userId: f.user } })).toBe(1);
  });
  it("缓存失败不挡通知，恢复不修改已重新加入的权益", async () => {
    const f = await fixture(); del.mockRejectedValue(new Error("合成缓存失败")); await service().cleanupExpiredMembers(); expect(await notice(f)).not.toBeNull(); expect((await fact(f))?.cacheClearedAt).toBeNull();
    const renewed = await db.circleMember.create({ data: { circleId: f.circle, userId: f.user, expireAt: new Date("2040-01-01T00:00:00Z") } }); del.mockResolvedValue(1); await new CircleMembershipExpiryNotificationTask(db as PrismaService, redis).tick(); expect((await fact(f))?.cacheClearedAt).not.toBeNull(); expect((await db.circleMember.findUniqueOrThrow({ where: { id: renewed.id } })).expireAt?.toISOString()).toBe("2040-01-01T00:00:00.000Z");
  });
  it("公共缓存失败留下待办，后续没有过期成员仍能恢复", async () => {
    const f = await fixture(); delByPattern.mockRejectedValueOnce(new Error("合成列表缓存失败")); await service().cleanupExpiredMembers(); expect((await fact(f))?.cacheClearedAt).toBeNull(); await service().cleanupExpiredMembers(); expect((await fact(f))?.cacheClearedAt).not.toBeNull();
  });
  it("共享Redis不可用时不把进程内降级当作已完成，通知仍独立完成", async () => {
    const f = await fixture(); pingShared.mockRejectedValue(new Error("共享 Redis 不可用"));
    await service().cleanupExpiredMembers();
    expect(await notice(f)).not.toBeNull(); expect((await fact(f))?.cacheClearedAt).toBeNull();
    expect(del).not.toHaveBeenCalled(); expect(delByPattern).not.toHaveBeenCalled();
    pingShared.mockResolvedValue(undefined); await new CircleMembershipExpiryNotificationTask(db as PrismaService, redis).tick();
    expect((await fact(f))?.cacheClearedAt).not.toBeNull();
  });
  it("220个真实删除跨批继续；通知/缓存恢复无饥饿或重复", async () => {
    const f = await fixture(), added = await db.user.createManyAndReturn({ data: Array.from({ length: 219 }, () => ({ nickname: "合成多批成员" })) }); users.push(...added.map(u => u.id)); await db.circleMember.createMany({ data: added.map(u => ({ circleId: f.circle, userId: u.id, expireAt: expiry })) }); await db.circle.update({ where: { id: f.circle }, data: { memberCount: 221 } });
    del.mockRejectedValue(new Error("合成缓存失败")); await service().cleanupExpiredMembers(); expect(await count(f)).toBe(1); expect(await db.circleMembershipExpiryNotice.count({ where: { circleId: f.circle } })).toBe(220); expect(await db.notification.count({ where: { circleId: f.circle } })).toBe(220);
    del.mockResolvedValue(1); expect(await clearCircleExpiryCaches(db as PrismaService, redis)).toBe(100); expect(await clearCircleExpiryCaches(db as PrismaService, redis)).toBe(100); expect(await clearCircleExpiryCaches(db as PrismaService, redis)).toBe(20);
  });
  it("两个独立连接并发清理只删除、计数、通知一次", async () => {
    const f = await fixture(), other = new PrismaClient({ datasources: { db: { url: testUrl! } } }); try { await Promise.all([service().cleanupExpiredMembers(), service(other).cleanupExpiredMembers()]); } finally { await other.$disconnect(); }
    expect(await count(f)).toBe(1); expect(await db.circleMembershipExpiryNotice.count({ where: { memberId: f.member } })).toBe(1); expect(await db.notification.count({ where: { userId: f.user } })).toBe(1);
  });
  it("归属在删除事务内锁定，独立连接不能中途改变圈主", async () => {
    const f = await fixture(), other = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    let blocked = false;
    const facade = { circleMember: db.circleMember, $queryRaw: db.$queryRaw.bind(db), $executeRaw: db.$executeRaw.bind(db),
      $transaction: (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(tx => fn({ ...tx,
        circleMember: { ...tx.circleMember, deleteMany: async (args: Prisma.CircleMemberDeleteManyArgs) => {
          try {
            await other.$transaction(async competing => {
              await competing.$executeRawUnsafe("SET LOCAL lock_timeout = '100ms'");
              await competing.circle.update({ where: { id: f.circle }, data: { ownerId: f.user } });
            });
          } catch { blocked = true; }
          return tx.circleMember.deleteMany(args);
        } },
      } as Prisma.TransactionClient)) };
    try { await service(facade).cleanupExpiredMembers(); } finally { await other.$disconnect(); }
    expect(blocked).toBe(true); expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).ownerId).not.toBe(f.user);
    expect(await count(f)).toBe(1); expect(await fact(f)).not.toBeNull();
  });
  it("分钟调度失败释放标记，通知异常不挡缓存恢复", async () => {
    const f = await fixture(); del.mockRejectedValue(new Error("合成缓存失败")); await service().cleanupExpiredMembers(); await db.notification.deleteMany({ where: { userId: f.user } }); const task = new CircleMembershipExpiryNotificationTask(db as PrismaService, redis);
    await fail("Notification", "INSERT", async () => { del.mockResolvedValue(1); await task.tick(); expect((await fact(f))?.cacheClearedAt).not.toBeNull(); expect(await notice(f)).toBeNull(); }); await task.tick(); expect(await notice(f)).not.toBeNull();
  });
});
