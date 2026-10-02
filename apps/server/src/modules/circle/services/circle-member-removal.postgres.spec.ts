import { Prisma, PrismaClient } from "@prisma/client";
import { CircleGovernanceService } from "../governance/circle-governance.service";
import { CircleMembershipService } from "./circle-membership.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { CircleSharedService } from "./circle-shared.service";
import { UnifiedPricingService } from "../../pricing/unified-pricing.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462" || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("移出测试仅允许指定合成库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("圈子两种移出入口的身份与事务真实PG边界", () => {
  let db: PrismaClient;
  const users: string[] = [], circles: string[] = [];
  const del = jest.fn(async () => 1);
  const shared = { checkPermission: async () => undefined } as unknown as CircleSharedService;
  const redis = { del } as unknown as RedisService;
  const fixture = async () => {
    const owner = await db.user.create({ data: { nickname: "合成移出圈主" } }), target = await db.user.create({ data: { nickname: "合成移出成员" } }); users.push(owner.id, target.id);
    const circle = await db.circle.create({ data: { name: "合成移出圈", intro: "仅隔离验证", tags: [], ownerId: owner.id, memberCount: 2 } }); circles.push(circle.id);
    await db.circleMember.create({ data: { circleId: circle.id, userId: owner.id, role: "OWNER" } });
    const member = await db.circleMember.create({ data: { circleId: circle.id, userId: target.id, role: "MEMBER" } });
    return { owner: owner.id, target: target.id, circle: circle.id, member: member.id };
  };
  const remove = (kind: string, client: unknown, f: Awaited<ReturnType<typeof fixture>>, asAdmin = false) => kind === "governance"
    ? new CircleGovernanceService(client as PrismaService, redis, shared).sanction(f.circle, f.owner, { type: "REMOVE", userId: f.target, reason: "合成移出" })
    : new CircleMembershipService(client as PrismaService, redis, {} as UnifiedPricingService, shared).removeMember(f.circle, asAdmin ? "synthetic-admin" : f.owner, f.target, { asAdmin });
  const afterRead = (work: () => Promise<void>) => ({ ...db, circleMember: { ...db.circleMember, findUnique: async (args: Prisma.CircleMemberFindUniqueArgs) => {
    const row = await db.circleMember.findUnique(args); await work(); return row;
  } }, $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(work) });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [identity] = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!identity?.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(identity.port)) throw new Error("合成库身份不符");
  });
  afterEach(async () => {
    await db.circleViolation.deleteMany({ where: { circleId: { in: circles } } });
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } }); del.mockClear();
  });
  afterAll(async () => { await db.$disconnect(); });

  it.each(["governance", "membership"])("%s读取后目标升为圈主：不删除、不造移出记录或通知", async kind => {
    const f = await fixture();
    const client = afterRead(async () => { await db.$transaction(async tx => {
      await tx.circleMember.update({ where: { id: f.member }, data: { role: "OWNER" } });
      await tx.circleMember.update({ where: { circleId_userId: { circleId: f.circle, userId: f.owner } }, data: { role: "MEMBER" } });
      await tx.circle.update({ where: { id: f.circle }, data: { ownerId: f.target } });
    }); });
    await expect(remove(kind, client, f)).rejects.toThrow();
    expect((await db.circleMember.findUniqueOrThrow({ where: { id: f.member } })).role).toBe("OWNER");
    expect(await db.circleViolation.count({ where: { circleId: f.circle } })).toBe(0); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0); expect(del).not.toHaveBeenCalled();
  });

  it.each(["governance", "membership"])("%s读取后退圈重入：旧请求不能删除新成员行", async kind => {
    const f = await fixture(); let newId = "";
    const client = afterRead(async () => { await db.circleMember.delete({ where: { id: f.member } }); newId = (await db.circleMember.create({ data: { circleId: f.circle, userId: f.target } })).id; });
    await expect(remove(kind, client, f)).rejects.toThrow();
    expect(newId).not.toBe(f.member); expect(await db.circleMember.count({ where: { id: newId } })).toBe(1);
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount).toBe(2); expect(await db.circleViolation.count({ where: { circleId: f.circle } })).toBe(0); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0);
  });

  it.each(["governance", "membership"])("%s人数为零的异常记录：不产生负数、删除和处理一并回滚", async kind => {
    const f = await fixture(); await db.circle.update({ where: { id: f.circle }, data: { memberCount: 0 } });
    await expect(remove(kind, db, f)).rejects.toThrow();
    expect(await db.circleMember.count({ where: { id: f.member } })).toBe(1); expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount).toBe(0);
    expect(await db.circleViolation.count({ where: { circleId: f.circle } })).toBe(0); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0); expect(del).not.toHaveBeenCalled();
  });

  it.each(["governance", "membership"])("%s人数写入故障：成员删除、处理均回滚且不清缓存或通知", async kind => {
    const f = await fixture();
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_remove_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic count failure'; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER synthetic_remove_fail BEFORE UPDATE ON "Circle" FOR EACH ROW EXECUTE FUNCTION synthetic_remove_fail()');
    try { await expect(remove(kind, db, f)).rejects.toThrow(); }
    finally { await db.$executeRawUnsafe('DROP TRIGGER synthetic_remove_fail ON "Circle"'); await db.$executeRawUnsafe('DROP FUNCTION synthetic_remove_fail()'); }
    expect(await db.circleMember.count({ where: { id: f.member } })).toBe(1); expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount).toBe(2);
    expect(await db.circleViolation.count({ where: { circleId: f.circle } })).toBe(0); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0); expect(del).not.toHaveBeenCalled();
  });

  it("两种移出入口争同一成员：只有一个成功，只减一人", async () => {
    const f = await fixture(); let count = 0; let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
    const client = afterRead(async () => { count += 1; if (count === 2) release(); await wait; });
    const results = await Promise.allSettled([remove("governance", client, f), remove("membership", client, f)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(await db.circleMember.count({ where: { id: f.member } })).toBe(0);
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount).toBe(1); expect(await db.circleViolation.count({ where: { circleId: f.circle } })).toBeLessThanOrEqual(1); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBeLessThanOrEqual(1);
  });

  it("管理端已有授权旁路保留，普通成员移出和计数同事务", async () => {
    const f = await fixture(); await expect(remove("membership", db, f, true)).resolves.toEqual({ success: true });
    expect(await db.circleMember.count({ where: { id: f.member } })).toBe(0); expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount).toBe(1);
  });

  it.each(["governance", "membership"])("%s真实数据库权限：普通成员拒绝，现圈主可以移出", async kind => {
    const f = await fixture();
    const realShared = new CircleSharedService(db as PrismaService);
    const governance = new CircleGovernanceService(db as PrismaService, redis, realShared);
    const membership = new CircleMembershipService(db as PrismaService, redis, {} as UnifiedPricingService, realShared);
    const action = (operator: string) => kind === "governance"
      ? governance.sanction(f.circle, operator, { type: "REMOVE", userId: f.target, reason: "合成权限验证" })
      : membership.removeMember(f.circle, operator, f.target);
    await expect(action(f.target)).rejects.toThrow();
    expect(await db.circleMember.count({ where: { id: f.member } })).toBe(1); expect(await db.circleGovernanceNotice.count({where:{circleId:{in:circles}}})).toBe(0);
    await expect(action(f.owner)).resolves.toBeDefined();
    expect(await db.circleMember.count({ where: { id: f.member } })).toBe(0); expect((await db.circle.findUniqueOrThrow({ where: { id: f.circle } })).memberCount).toBe(1);
  });
});
