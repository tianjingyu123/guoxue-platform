import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { UnifiedPricingService } from "../../pricing/unified-pricing.service";
import { CircleMembershipService } from "./circle-membership.service";
import { CircleSharedService } from "./circle-shared.service";
import { clearCircleMembershipCaches } from "./circle-membership-cache.task";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55462" ||
    u.username !== "qa_voice" ||
    !u.pathname.startsWith("/entitlement_notice_qa_")
  )
    throw new Error("角色测试只允许合成隔离库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("成员角色和圈主转让真实PG原子性", () => {
  let db: PrismaClient;
  const users: string[] = [],
    circles: string[] = [];
  const clear = jest.fn(
    async (_rows: ReadonlyArray<{ circleId: string; userId: string }>) => undefined,
  );
  const redis = { clearCircleMembershipShared: clear } as unknown as RedisService;
  const service = (client = db) =>
    new CircleMembershipService(
      client as unknown as PrismaService,
      redis,
      {} as UnifiedPricingService,
      new CircleSharedService(client as unknown as PrismaService),
    );
  const fixture = async (member = true) => {
    const owner = await db.user.create({ data: { nickname: "合成角色圈主" } }),
      target = await db.user.create({ data: { nickname: "合成角色成员" } }),
      other = await db.user.create({ data: { nickname: "合成角色另一成员" } });
    users.push(owner.id, target.id, other.id);
    const circle = await db.circle.create({
      data: {
        name: "合成角色圈",
        intro: "独立库验证",
        tags: [],
        type: "FREE",
        status: "ACTIVE",
        ownerId: owner.id,
        memberCount: member ? 3 : 2,
      },
    });
    circles.push(circle.id);
    await db.circleMember.create({
      data: { circleId: circle.id, userId: owner.id, role: "OWNER" },
    });
    if (member) await db.circleMember.create({ data: { circleId: circle.id, userId: target.id } });
    await db.circleMember.create({ data: { circleId: circle.id, userId: other.id } });
    return { circleId: circle.id, ownerId: owner.id, userId: target.id, otherId: other.id };
  };
  const rows = (f: { circleId: string }) =>
    db.$queryRaw<
      Array<{ id: string; userId: string; clearedAt: Date | null }>
    >`SELECT id,"userId","clearedAt" FROM "CircleMembershipCacheInvalidation" WHERE "circleId"=${f.circleId}`;
  const state = async (f: Awaited<ReturnType<typeof fixture>>) => ({
    circle: await db.circle.findUniqueOrThrow({ where: { id: f.circleId } }),
    members: await db.circleMember.findMany({
      where: { circleId: f.circleId },
      orderBy: { id: "asc" },
    }),
    queue: await rows(f),
  });
  const failInsert = async (work: () => Promise<void>, onlyUser?: string) => {
    if (onlyUser && !/^[0-9a-f-]{36}$/.test(onlyUser)) throw new Error("仅允许合成UUID");
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_role_cache_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic role cache insert failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_role_cache_fail BEFORE INSERT ON "CircleMembershipCacheInvalidation" FOR EACH ROW ' +
        (onlyUser ? `WHEN (NEW."userId"='${onlyUser}') ` : "") +
        "EXECUTE FUNCTION synthetic_role_cache_fail()",
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER synthetic_role_cache_fail ON "CircleMembershipCacheInvalidation"',
      );
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_role_cache_fail()");
    }
  };
  const withRace = (work: () => Promise<void>) =>
    new Proxy(db, {
      get(original, key) {
        if (key === "$transaction")
          return async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
            await work();
            return original.$transaction(fn);
          };
        const v = Reflect.get(original, key, original);
        return typeof v === "function" ? v.bind(original) : v;
      },
    });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [i] = await db.$queryRaw<
      Array<{ name: string; port: number }>
    >`SELECT current_database() AS name,inet_server_port() AS port`;
    if (!i.name.startsWith("entitlement_notice_qa_") || ![55462, 5432].includes(i.port))
      throw new Error("PG身份不符");
  });
  beforeEach(() => {
    clear.mockReset();
    clear.mockResolvedValue(undefined);
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    for (const circleId of circles)
      await db.$executeRaw`DELETE FROM "CircleMembershipCacheInvalidation" WHERE "circleId"=${circleId}`;
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => db.$disconnect());
  it.each(["ADMIN", "PARTNER", "VOLUNTEER", "GUEST"] as const)(
    "%s角色变更提交后Redis故障仍成功，恢复后才确认",
    async (role) => {
      const f = await fixture();
      clear.mockRejectedValueOnce(new Error("synthetic Redis outage"));
      await expect(
        service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role }),
      ).resolves.toEqual({ success: true });
      expect(
        (
          await db.circleMember.findUniqueOrThrow({
            where: { circleId_userId: { circleId: f.circleId, userId: f.userId } },
          })
        ).role,
      ).toBe(role);
      expect((await rows(f))[0].clearedAt).toBeNull();
      expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
    },
  );
  it("普通角色缓存事实失败，角色和人数不改变", async () => {
    const f = await fixture(),
      before = await state(f);
    await failInsert(async () => {
      await expect(
        service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "ADMIN" }),
      ).rejects.toThrow("synthetic role cache insert failure");
    });
    expect(await state(f)).toEqual(before);
  });
  it("转让双方角色、ownerId和两方待办原子提交；旧圈主立刻失去原权限", async () => {
    const f = await fixture();
    clear.mockRejectedValue(new Error("synthetic Redis outage"));
    await expect(
      service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "OWNER" }),
    ).resolves.toEqual({ success: true });
    const after = await state(f);
    expect(after.circle.ownerId).toBe(f.userId);
    expect(after.circle.memberCount).toBe(3);
    expect(after.members.filter((m) => m.role === "OWNER").map((m) => m.userId)).toEqual([
      f.userId,
    ]);
    expect(after.queue.map((r) => r.userId).sort()).toEqual([f.ownerId, f.userId].sort());
    expect(after.queue.every((r) => r.clearedAt === null)).toBe(true);
    const shared = new CircleSharedService(db as unknown as PrismaService);
    await expect(shared.checkOwnership(f.circleId, f.ownerId)).rejects.toThrow();
    await expect(shared.checkPermission(f.circleId, f.ownerId, "member.remove")).rejects.toThrow();
    await expect(shared.checkOwnership(f.circleId, f.userId)).resolves.toBeUndefined();
  });
  it("转让第二方缓存事实失败，第一方待办和全部角色/ownerId一起回滚", async () => {
    const f = await fixture(),
      before = await state(f);
    await failInsert(async () => {
      await expect(
        service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "OWNER" }),
      ).rejects.toThrow("synthetic role cache insert failure");
    }, f.userId);
    expect(await state(f)).toEqual(before);
  });
  it.each([false, true])("不能直接降当前圈主，平台旁路=%s", async (asAdmin) => {
    const f = await fixture(),
      before = await state(f);
    await expect(
      service().updateMemberRole(f.circleId, f.ownerId, f.ownerId, { role: "MEMBER" }, { asAdmin }),
    ).rejects.toThrow("圈主不能直接降级");
    expect(await state(f)).toEqual(before);
  });
  it("平台管理员可转让；旧圈主成员缺失的原容错保留且不改人数", async () => {
    const f = await fixture();
    await db.circleMember.deleteMany({ where: { circleId: f.circleId, userId: f.ownerId } });
    await db.circle.update({ where: { id: f.circleId }, data: { memberCount: 2 } });
    await expect(
      service().updateMemberRole(
        f.circleId,
        "synthetic-platform-admin",
        f.userId,
        { role: "OWNER" },
        { asAdmin: true },
      ),
    ).resolves.toEqual({ success: true });
    expect((await state(f)).circle.memberCount).toBe(2);
    expect((await state(f)).circle.ownerId).toBe(f.userId);
    expect(await rows(f)).toHaveLength(2);
  });
  it("相同角色或相同圈主幂等，无新待办或重复清理", async () => {
    const f = await fixture();
    await expect(
      service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "MEMBER" }),
    ).resolves.toEqual({ success: true });
    await expect(
      service().updateMemberRole(f.circleId, f.ownerId, f.ownerId, { role: "OWNER" }),
    ).resolves.toEqual({ success: true });
    expect(await rows(f)).toHaveLength(0);
    expect(clear).not.toHaveBeenCalled();
  });
  it("两次旧圈主转让并发只有一个成功，不留下多个OWNER", async () => {
    const f = await fixture();
    let arrivals = 0,
      release!: () => void;
    const ready = new Promise<void>((r) => (release = r));
    const client = withRace(async () => {
      if (++arrivals === 2) release();
      await ready;
    });
    const results = await Promise.allSettled(
      [f.userId, f.otherId].map((target) =>
        service(client).updateMemberRole(f.circleId, f.ownerId, target, { role: "OWNER" }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const after = await state(f);
    expect(after.members.filter((m) => m.role === "OWNER").map((m) => m.userId)).toEqual([
      after.circle.ownerId,
    ]);
    expect(after.queue).toHaveLength(2);
  });
  it.each(["ADMIN", "OWNER"])("目标退圈重入：旧%s请求不能更新新成员行", async (role) => {
    const f = await fixture();
    const client = withRace(async () => {
      await db.circleMember.deleteMany({ where: { circleId: f.circleId, userId: f.userId } });
      await db.circleMember.create({ data: { circleId: f.circleId, userId: f.userId } });
    });
    await expect(
      service(client).updateMemberRole(f.circleId, f.ownerId, f.userId, { role }),
    ).rejects.toThrow("成员状态已变化");
    expect((await state(f)).circle.ownerId).toBe(f.ownerId);
    expect((await state(f)).members.find((m) => m.userId === f.userId)!.role).toBe("MEMBER");
    expect(await rows(f)).toHaveLength(0);
  });
  it("读取后圈主改变：旧圈主普通角色写请求必须失败", async () => {
    const f = await fixture();
    const client = withRace(async () => {
      await db.$transaction(async (tx) => {
        await tx.circleMember.updateMany({
          where: { circleId: f.circleId, userId: f.ownerId },
          data: { role: "MEMBER" },
        });
        await tx.circleMember.updateMany({
          where: { circleId: f.circleId, userId: f.otherId },
          data: { role: "OWNER" },
        });
        await tx.circle.update({ where: { id: f.circleId }, data: { ownerId: f.otherId } });
      });
    });
    await expect(
      service(client).updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "ADMIN" }),
    ).rejects.toThrow("圈主状态已变化");
    expect((await state(f)).members.find((m) => m.userId === f.userId)!.role).toBe("MEMBER");
    expect(await rows(f)).toHaveLength(0);
  });
  it("目标角色并发变化：旧请求不能覆盖较新的角色", async () => {
    const f = await fixture();
    const client = withRace(async () => {
      await db.circleMember.updateMany({
        where: { circleId: f.circleId, userId: f.userId },
        data: { role: "PARTNER" },
      });
    });
    await expect(
      service(client).updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "ADMIN" }),
    ).rejects.toThrow("成员状态已变化");
    expect((await state(f)).members.find((m) => m.userId === f.userId)!.role).toBe("PARTNER");
  });
  it("普通成员无圈主权限；无效role拒绝且不写资金和缓存", async () => {
    const f = await fixture(),
      before = await state(f);
    await expect(
      service().updateMemberRole(f.circleId, f.otherId, f.userId, { role: "ADMIN" }),
    ).rejects.toThrow("仅圈主");
    await expect(
      service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "ROOT" }),
    ).rejects.toThrow("无效");
    expect(await state(f)).toEqual(before);
  });
  it("管理代加ADMIN初始角色、成员人数和缓存待办一起提交，Redis故障不半成功", async () => {
    const f = await fixture(false);
    clear.mockRejectedValueOnce(new Error("synthetic Redis outage"));
    await expect(service().adminAddMember(f.circleId, f.userId, "ADMIN")).resolves.toMatchObject({
      role: "ADMIN",
    });
    expect((await state(f)).circle.memberCount).toBe(3);
    expect((await rows(f))[0].clearedAt).toBeNull();
    await expect(service().adminAddMember(f.circleId, f.userId, "PARTNER")).resolves.toMatchObject({
      role: "ADMIN",
      alreadyMember: true,
    });
    expect(await rows(f)).toHaveLength(1);
  });
  it("管理代加角色待办失败，成员和人数完全回滚", async () => {
    const f = await fixture(false),
      before = await state(f);
    await failInsert(async () => {
      await expect(service().adminAddMember(f.circleId, f.userId, "ADMIN")).rejects.toThrow(
        "synthetic role cache insert failure",
      );
    });
    expect(await state(f)).toEqual(before);
  });
  it("管理代加同用户并发只建一个成员，只加一人数与一待办", async () => {
    const f = await fixture(false);
    clear.mockRejectedValue(new Error("synthetic Redis outage"));
    const r = await Promise.all(
      [1, 2].map(() => service().adminAddMember(f.circleId, f.userId, "ADMIN")),
    );
    expect(r.every((m) => m.role === "ADMIN")).toBe(true);
    expect((await state(f)).circle.memberCount).toBe(3);
    expect(await rows(f)).toHaveLength(1);
  });
  it("转让后两方缓存失败，分钟恢复可分别确认，恢复不重复转让", async () => {
    const f = await fixture();
    clear.mockRejectedValue(new Error("synthetic Redis outage"));
    await service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "OWNER" });
    clear.mockResolvedValue(undefined);
    expect(
      await clearCircleMembershipCaches(db as unknown as PrismaService, redis, {
        circleId: f.circleId,
        userId: f.ownerId,
      }),
    ).toBe(1);
    expect(await clearCircleMembershipCaches(db as unknown as PrismaService, redis, f)).toBe(1);
    expect((await rows(f)).every((r) => r.clearedAt !== null)).toBe(true);
    const before = await state(f);
    await service().updateMemberRole(f.circleId, f.userId, f.userId, { role: "OWNER" });
    expect(await state(f)).toEqual(before);
  });
  it("读取后旧圈主成员重建，旧转让不能降级新成员行", async () => {
    const f = await fixture();
    const client = withRace(async () => {
      await db.circleMember.deleteMany({ where: { circleId: f.circleId, userId: f.ownerId } });
      await db.circleMember.create({
        data: { circleId: f.circleId, userId: f.ownerId, role: "OWNER" },
      });
    });
    await expect(
      service(client).updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "OWNER" }),
    ).rejects.toThrow("原圈主成员状态已变化");
    expect((await state(f)).circle.ownerId).toBe(f.ownerId);
    expect(await rows(f)).toHaveLength(0);
  });
  it("目标只有OWNER角色却不是实际圈主，拒绝把不一致状态当作正常转让", async () => {
    const f = await fixture();
    await db.circleMember.updateMany({
      where: { circleId: f.circleId, userId: f.userId },
      data: { role: "OWNER" },
    });
    const before = await state(f);
    await expect(
      service().updateMemberRole(f.circleId, f.ownerId, f.userId, { role: "OWNER" }),
    ).rejects.toThrow("正在核对");
    expect(await state(f)).toEqual(before);
  });
  it("角色请求的用户不属于指定圈子，不能凭另一圈成员行写入", async () => {
    const f = await fixture(),
      another = await fixture();
    const before = await state(f);
    await expect(
      service().updateMemberRole(f.circleId, f.ownerId, another.userId, { role: "ADMIN" }),
    ).rejects.toThrow("不是圈子成员");
    expect(await state(f)).toEqual(before);
  });
});
