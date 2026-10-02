import { Prisma, PrismaClient } from "@prisma/client";
import { CircleMembershipService } from "./circle-membership.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { CircleSharedService } from "./circle-shared.service";
import { UnifiedPricingService } from "../../pricing/unified-pricing.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462" || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("入退圈计数只允许指定合成库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("普通入退圈成员与人数同事务的真实PG边界", () => {
  let db: PrismaClient;
  const users: string[] = [], circles: string[] = [];
  const del = jest.fn(async () => 1);
  const service = (client: unknown = db) => new CircleMembershipService(client as PrismaService,
    { del } as unknown as RedisService, {} as UnifiedPricingService, {} as CircleSharedService);
  const fixture = async (withMember = true) => {
    const owner = await db.user.create({ data: { nickname: "合成计数圈主" } }), target = await db.user.create({ data: { nickname: "合成计数成员" } }); users.push(owner.id, target.id);
    const c = await db.circle.create({ data: { name: "合成入退圈", intro: "仅隔离验证", tags: [], type: "FREE", status: "ACTIVE", ownerId: owner.id, memberCount: withMember ? 2 : 1 } }); circles.push(c.id);
    await db.circleMember.create({ data: { circleId: c.id, userId: owner.id, role: "OWNER" } });
    const member = withMember ? await db.circleMember.create({ data: { circleId: c.id, userId: target.id } }) : null;
    return { circle: c.id, owner: owner.id, target: target.id, member: member?.id };
  };
  const afterRead = (work: () => Promise<void>) => {
    let changed = false;
    return { ...db, circleMember: { ...db.circleMember, findUnique: async (args: Prisma.CircleMemberFindUniqueArgs) => {
      const row = await db.circleMember.findUnique(args); if (!changed) { changed = true; await work(); } return row;
    } }, $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>) => db.$transaction(work) };
  };
  const failCount = async (work: () => Promise<void>) => {
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_join_leave_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic join leave count failure'; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER synthetic_join_leave_fail BEFORE UPDATE ON "Circle" FOR EACH ROW EXECUTE FUNCTION synthetic_join_leave_fail()');
    try { await work(); } finally { await db.$executeRawUnsafe('DROP TRIGGER synthetic_join_leave_fail ON "Circle"'); await db.$executeRawUnsafe('DROP FUNCTION synthetic_join_leave_fail()'); }
  };
  const count = async (circleId: string) => (await db.circle.findUniqueOrThrow({ where: { id: circleId } })).memberCount;
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [identity] = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!identity?.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(identity.port)) throw new Error("专用合成库身份不符");
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    expect(await db.notification.count({ where: { userId: { in: users } } })).toBe(0);
    await db.circleViolation.deleteMany({ where: { circleId: { in: circles } } });
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } }); await db.user.deleteMany({ where: { id: { in: users.splice(0) } } }); del.mockClear();
  });
  afterAll(async () => { await db.$disconnect(); });

  it("免费入圈正常创建且人数只增加一次，重复入圈不增加", async () => {
    const f = await fixture(false);
    await service().join(f.circle, f.target);
    await expect(service().join(f.circle, f.target)).rejects.toThrow("已加入该圈子");
    expect(await count(f.circle)).toBe(2); expect(await db.circleMember.count({ where: { circleId: f.circle } })).toBe(2);
  });
  it("免费入圈人数写入失败时创建回滚，未清缓存", async () => {
    const f = await fixture(false);
    await failCount(async () => { await expect(service().join(f.circle, f.target)).rejects.toThrow(); });
    expect(await db.circleMember.count({ where: { circleId: f.circle, userId: f.target } })).toBe(0);
    expect(await count(f.circle)).toBe(1); expect(del).not.toHaveBeenCalled();
  });
  it("两次并发免费入圈只允许一个新成员和一次加人数", async () => {
    const f = await fixture(false);
    const results = await Promise.allSettled([service().join(f.circle, f.target), service().join(f.circle, f.target)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await count(f.circle)).toBe(2); expect(await db.circleMember.count({ where: { circleId: f.circle, userId: f.target } })).toBe(1);
  });
  it("禁入成员不能通过免费入圈建成员或加人数", async () => {
    const f = await fixture(false);
    await db.circleViolation.create({ data: { circleId: f.circle, userId: f.target, operatorId: f.owner, type: "REMOVE", status: "ACTIVE", reason: "合成禁入" } });
    await expect(service().join(f.circle, f.target)).rejects.toThrow("限制重新加入");
    expect(await count(f.circle)).toBe(1); expect(await db.circleMember.count({ where: { circleId: f.circle, userId: f.target } })).toBe(0);
  });
  it("管理端代加新成员也复用同一创建与人数事务", async () => {
    const f = await fixture(false);
    await failCount(async () => { await expect(service().adminAddMember(f.circle, f.target)).rejects.toThrow(); });
    expect(await db.circleMember.count({ where: { circleId: f.circle, userId: f.target } })).toBe(0); expect(await count(f.circle)).toBe(1);
  });
  it("正常退圈删除成员并减一次人数", async () => {
    const f = await fixture(); await service().leave(f.circle, f.target);
    expect(await count(f.circle)).toBe(1); expect(await db.circleMember.count({ where: { id: f.member! } })).toBe(0);
  });
  it("退圈人数写入失败时删除回滚，未清缓存", async () => {
    const f = await fixture();
    await failCount(async () => { await expect(service().leave(f.circle, f.target)).rejects.toThrow(); });
    expect(await db.circleMember.count({ where: { id: f.member! } })).toBe(1); expect(await count(f.circle)).toBe(2); expect(del).not.toHaveBeenCalled();
  });
  it("异常零人数退圈整笔拒绝，不能删成员或产生负数", async () => {
    const f = await fixture(); await db.circle.update({ where: { id: f.circle }, data: { memberCount: 0 } });
    await expect(service().leave(f.circle, f.target)).rejects.toThrow();
    expect(await db.circleMember.count({ where: { id: f.member! } })).toBe(1); expect(await count(f.circle)).toBe(0);
  });
  it("读取后升为圈主的成员不能被原退圈请求删除", async () => {
    const f = await fixture(); const client = afterRead(async () => { await db.circleMember.update({ where: { id: f.member! }, data: { role: "OWNER" } }); });
    await expect(service(client).leave(f.circle, f.target)).rejects.toThrow();
    expect((await db.circleMember.findUniqueOrThrow({ where: { id: f.member! } })).role).toBe("OWNER"); expect(await count(f.circle)).toBe(2);
  });
  it("读取后圈子实际归属变化也阻止旧退圈请求", async () => {
    const f = await fixture(); const client = afterRead(async () => { await db.circle.update({ where: { id: f.circle }, data: { ownerId: f.target } }); });
    await expect(service(client).leave(f.circle, f.target)).rejects.toThrow();
    expect(await db.circleMember.count({ where: { id: f.member! } })).toBe(1); expect(await count(f.circle)).toBe(2);
  });
  it("退圈重入的新成员行不能被原退圈请求删除", async () => {
    const f = await fixture(); let newId = "";
    const client = afterRead(async () => { await db.circleMember.delete({ where: { id: f.member! } }); newId = (await db.circleMember.create({ data: { circleId: f.circle, userId: f.target } })).id; });
    await expect(service(client).leave(f.circle, f.target)).rejects.toThrow();
    expect(newId).not.toBe(f.member); expect(await db.circleMember.count({ where: { id: newId } })).toBe(1); expect(await count(f.circle)).toBe(2);
  });
  it("并发退圈只删除一次和减一次人数", async () => {
    const f = await fixture(); const results = await Promise.allSettled([service().leave(f.circle, f.target), service().leave(f.circle, f.target)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(await count(f.circle)).toBe(1); expect(await db.circleMember.count({ where: { id: f.member! } })).toBe(0);
  });
});

