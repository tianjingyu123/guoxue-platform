import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { UnifiedPricingService } from "../../pricing/unified-pricing.service";
import { CircleGovernanceService } from "../governance/circle-governance.service";
import { CircleSharedService } from "./circle-shared.service";
import { CircleMembershipService } from "./circle-membership.service";
import {
  clearCircleMembershipCaches,
  enqueueCircleMembershipCache,
} from "./circle-membership-cache.task";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55462" ||
    url.username !== "qa_voice" ||
    !url.pathname.startsWith("/entitlement_notice_qa_")
  )
    throw new Error("缓存恢复只允许指定合成库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("成员变更与缓存待办的真实PG边界", () => {
  let db: PrismaClient;
  const users: string[] = [],
    circles: string[] = [];
  const clear = jest.fn(
    async (_rows: ReadonlyArray<{ circleId: string; userId: string }>) => undefined,
  );
  const redis = { clearCircleMembershipShared: clear } as unknown as RedisService;
  const service = () =>
    new CircleMembershipService(
      db as unknown as PrismaService,
      redis,
      {} as UnifiedPricingService,
      new CircleSharedService(db as unknown as PrismaService),
    );
  const fixture = async (member = true) => {
    const owner = await db.user.create({ data: { nickname: "合成缓存圈主" } }),
      user = await db.user.create({ data: { nickname: "合成缓存成员" } });
    users.push(owner.id, user.id);
    const circle = await db.circle.create({
      data: {
        name: "合成缓存圈",
        intro: "仅隔离验证",
        tags: [],
        type: "FREE",
        status: "ACTIVE",
        ownerId: owner.id,
        memberCount: member ? 2 : 1,
      },
    });
    circles.push(circle.id);
    await db.circleMember.create({
      data: { circleId: circle.id, userId: owner.id, role: "OWNER" },
    });
    if (member) await db.circleMember.create({ data: { circleId: circle.id, userId: user.id } });
    return { circleId: circle.id, userId: user.id, ownerId: owner.id };
  };
  const rows = (f: { circleId: string }) =>
    db.$queryRaw<
      Array<{ id: string; clearedAt: Date | null }>
    >`SELECT id, "clearedAt" FROM "CircleMembershipCacheInvalidation" WHERE "circleId"=${f.circleId}`;
  const action = (kind: string, f: Awaited<ReturnType<typeof fixture>>) => {
    if (kind === "join") return service().join(f.circleId, f.userId);
    if (kind === "leave") return service().leave(f.circleId, f.userId);
    if (kind === "remove") return service().removeMember(f.circleId, f.ownerId, f.userId);
    return new CircleGovernanceService(
      db as unknown as PrismaService,
      redis,
      new CircleSharedService(db as unknown as PrismaService),
    ).sanction(f.circleId, f.ownerId, { type: "REMOVE", userId: f.userId, reason: "合成移出" });
  };
  const failInsert = async (work: () => Promise<void>) => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_cache_insert_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic cache insert failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_cache_insert_fail BEFORE INSERT ON "CircleMembershipCacheInvalidation" FOR EACH ROW EXECUTE FUNCTION synthetic_cache_insert_fail()',
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER synthetic_cache_insert_fail ON "CircleMembershipCacheInvalidation"',
      );
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_cache_insert_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [identity] = await db.$queryRaw<
      Array<{ name: string; port: number }>
    >`SELECT current_database() AS name, inet_server_port() AS port`;
    if (
      !identity.name.startsWith("entitlement_notice_qa_") ||
      ![55462, 5432].includes(identity.port)
    )
      throw new Error("隔离库身份不符");
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.circleViolation.deleteMany({ where: { circleId: { in: circles } } });
    for (const circleId of circles)
      await db.$executeRaw`DELETE FROM "CircleMembershipCacheInvalidation" WHERE "circleId"=${circleId}`;
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    clear.mockReset();
    clear.mockResolvedValue(undefined);
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it.each(["join", "leave", "remove", "governance"])(
    "%s：Redis失败仍返回业务成功，待办恢复后才确认完成",
    async (kind) => {
      const f = await fixture(kind !== "join");
      clear.mockRejectedValueOnce(new Error("synthetic Redis failure"));
      await expect(action(kind, f)).resolves.toBeDefined();
      expect(
        await db.circleMember.count({ where: { circleId: f.circleId, userId: f.userId } }),
      ).toBe(kind === "join" ? 1 : 0);
      expect((await db.circle.findUniqueOrThrow({ where: { id: f.circleId } })).memberCount).toBe(
        kind === "join" ? 2 : 1,
      );
      expect(await rows(f)).toEqual([{ id: expect.any(String), clearedAt: null }]);
      if (kind === "governance")
        expect(await db.circleGovernanceNotice.count({ where: { circleId: f.circleId } })).toBe(1);
      expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
      expect((await rows(f))[0].clearedAt).toBeInstanceOf(Date);
      expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(0);
    },
  );

  it.each(["join", "leave", "remove", "governance"])(
    "%s：待办INSERT失败回滚成员/人数，治理事实也不能提前成功",
    async (kind) => {
      const f = await fixture(kind !== "join");
      await failInsert(async () => {
        await expect(action(kind, f)).rejects.toThrow();
      });
      expect(
        await db.circleMember.count({ where: { circleId: f.circleId, userId: f.userId } }),
      ).toBe(kind === "join" ? 0 : 1);
      expect((await db.circle.findUniqueOrThrow({ where: { id: f.circleId } })).memberCount).toBe(
        kind === "join" ? 1 : 2,
      );
      expect(await rows(f)).toEqual([]);
      expect(clear).not.toHaveBeenCalled();
      expect(await db.circleViolation.count({ where: { circleId: f.circleId } })).toBe(0);
      expect(await db.circleGovernanceNotice.count({ where: { circleId: f.circleId } })).toBe(0);
    },
  );

  it("重复入圈/退圈不产生额外待办或人数变化", async () => {
    const f = await fixture(false);
    await service().join(f.circleId, f.userId);
    await expect(service().join(f.circleId, f.userId)).rejects.toThrow();
    await service().leave(f.circleId, f.userId);
    await expect(service().leave(f.circleId, f.userId)).rejects.toThrow();
    expect(await rows(f)).toHaveLength(2);
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circleId } })).memberCount).toBe(1);
  });

  it("管理端代加复用创建待办，故障不误报创建失败", async () => {
    const f = await fixture(false);
    clear.mockRejectedValue(new Error("synthetic Redis failure"));
    await expect(service().adminAddMember(f.circleId, f.userId)).resolves.toBeDefined();
    expect(await rows(f)).toEqual([{ id: expect.any(String), clearedAt: null }]);
  });

  it("缓存清理期间的新变更保留独立待办，不被旧确认吞掉", async () => {
    const f = await fixture();
    await db.$transaction((tx) => enqueueCircleMembershipCache(tx, f.circleId, f.userId));
    clear.mockImplementationOnce(async () => {
      await db.$transaction((tx) => enqueueCircleMembershipCache(tx, f.circleId, f.userId));
    });
    expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
    expect((await rows(f)).filter((r) => r.clearedAt === null)).toHaveLength(1);
    expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
  });

  it("实际数据库确认失败保留待办，重复清理后恢复", async () => {
    const f = await fixture();
    await db.$transaction((tx) => enqueueCircleMembershipCache(tx, f.circleId, f.userId));
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_cache_ack_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic cache ack failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_cache_ack_fail BEFORE UPDATE ON "CircleMembershipCacheInvalidation" FOR EACH ROW EXECUTE FUNCTION synthetic_cache_ack_fail()',
    );
    try {
      expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(0);
      expect((await rows(f))[0].clearedAt).toBeNull();
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER synthetic_cache_ack_fail ON "CircleMembershipCacheInvalidation"',
      );
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_cache_ack_fail()");
    }
    expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it("两个恢复者重复清缓存可安全并发，只确认一行", async () => {
    const f = await fixture();
    await db.$transaction((tx) => enqueueCircleMembershipCache(tx, f.circleId, f.userId));
    const results = await Promise.all([
      clearCircleMembershipCaches(db as unknown as PrismaService, redis, f),
      clearCircleMembershipCaches(db as unknown as PrismaService, redis, f),
    ]);
    expect(results.reduce((a, b) => a + b, 0)).toBe(1);
    expect((await rows(f))[0].clearedAt).toBeInstanceOf(Date);
  });

  it("220行按100/100/20恢复，已确认行不阻挡后续批", async () => {
    const f = await fixture();
    for (let i = 0; i < 220; i++)
      await db.$transaction((tx) => enqueueCircleMembershipCache(tx, f.circleId, f.userId));
    const restore = () => clearCircleMembershipCaches(db as unknown as PrismaService, redis, f);
    expect([await restore(), await restore(), await restore(), await restore()]).toEqual([
      100, 100, 20, 0,
    ]);
    expect(clear.mock.calls.map((c) => c[0].length)).toEqual([100, 100, 20]);
  });

  it("圈子和成员删除后仍保留原键待办，恢复不依赖当前成员存在", async () => {
    const f = await fixture();
    await db.$transaction((tx) => enqueueCircleMembershipCache(tx, f.circleId, f.userId));
    await db.circle.delete({ where: { id: f.circleId } });
    expect(await rows(f)).toHaveLength(1);
    expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
  });
});
