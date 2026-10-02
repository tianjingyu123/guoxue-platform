import { Prisma, PrismaClient } from "@prisma/client";
import { MemberGrantService } from "./member-grant.service";
import { MemberBenefitService } from "./member-benefit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

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
    throw new Error("仅允许专用合成月度库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("当前月恢复真实PG事务", () => {
  let db: PrismaClient;
  const users: string[] = [],
    configs: string[] = [],
    coupons: string[] = [];
  const clock = (date = new Date(2026, 9, 2, 12)) => {
    jest.useFakeTimers({
      doNotFake: [
        "hrtime",
        "nextTick",
        "performance",
        "queueMicrotask",
        "setImmediate",
        "clearImmediate",
        "setInterval",
        "clearInterval",
        "setTimeout",
        "clearTimeout",
      ],
    });
    jest.setSystemTime(date);
  };
  const benefit = (client = db) =>
    new MemberBenefitService(client as unknown as PrismaService, {} as RedisService);
  const job = () =>
    new MemberGrantService(
      db as unknown as PrismaService,
      {
        runExclusive: async (_key: string, _ttl: number, work: () => Promise<unknown>) => work(),
      } as unknown as RedisService,
      benefit(),
    );
  const member = async (extra: Partial<Prisma.UserCreateInput> = {}) => {
    const user = await db.user.create({
      data: {
        nickname: "合成当月恢复用户",
        memberLevel: "MONTHLY",
        memberExpire: new Date(2026, 11, 31),
        ...extra,
      },
    });
    users.push(user.id);
    return user.id;
  };
  const config = async (points = 100, couponId: string | null = null) => {
    const c = await db.memberConfig.create({
      data: {
        level: "MONTHLY",
        name: "合成当月方案",
        price: 1,
        monthlyPoints: points,
        monthlyCouponId: couponId,
      },
    });
    configs.push(c.id);
  };
  const source = "member_monthly_202610";
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [i] = await db.$queryRaw<
      Array<{ name: string; port: number }>
    >`SELECT current_database() AS name,inet_server_port() AS port`;
    if (
      !i.name.startsWith("entitlement_notice_qa_") ||
      ![55462, 5432].includes(i.port) ||
      (await db.memberConfig.count()) ||
      (await db.user.count({ where: { memberLevel: { not: "NONE" } } }))
    )
      throw new Error("需要无会员预置的合成库");
  });
  beforeEach(() => clock());
  afterEach(async () => {
    jest.useRealTimers();
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.couponRecord.deleteMany({ where: { userId: { in: users } } });
    await db.pointsRecord.deleteMany({ where: { userId: { in: users } } });
    await db.userPoints.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    await db.memberConfig.deleteMany({ where: { id: { in: configs.splice(0) } } });
    await db.couponTemplate.deleteMany({ where: { id: { in: coupons.splice(0) } } });
  });
  afterAll(async () => db.$disconnect());
  it("错过月初原调度，当月恢复自动发一次，重复调度不重复加余额", async () => {
    await config();
    const id = await member();
    await job().monthlyGrantRecoveryCron();
    await job().monthlyGrantRecoveryCron();
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
    expect(await db.pointsRecord.count({ where: { userId: id, source } })).toBe(1);
  });
  it("原cron与恢复并发，逐用户锁仍只发一次", async () => {
    await config();
    const id = await member();
    await Promise.all([job().monthlyGrantCron(), job().monthlyGrantRecoveryCron()]);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
    expect(await db.pointsRecord.count({ where: { userId: id, source } })).toBe(1);
  });
  it("真实流水写入故障，恢复前无部分到账，下一次调度恢复", async () => {
    await config();
    const id = await member();
    await db.$executeRawUnsafe(
      "CREATE FUNCTION synthetic_restore_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic monthly restore failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_restore_fail BEFORE INSERT ON "PointsRecord" FOR EACH ROW EXECUTE FUNCTION synthetic_restore_fail()',
    );
    try {
      await job().monthlyGrantRecoveryCron();
      expect(await db.userPoints.findUnique({ where: { userId: id } })).toBeNull();
      expect(await db.pointsRecord.count({ where: { userId: id } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_restore_fail ON "PointsRecord"');
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_restore_fail()");
    }
    await job().monthlyGrantRecoveryCron();
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
  });
  it("仅当月标记；过去月份已有记录不被重发", async () => {
    await config();
    const id = await member();
    await db.pointsRecord.create({
      data: { userId: id, source: "member_monthly_202609", amount: 100, type: "EARN" },
    });
    await job().monthlyGrantRecoveryCron();
    expect(
      await db.pointsRecord.count({ where: { userId: id, source: "member_monthly_202609" } }),
    ).toBe(1);
    expect(await db.pointsRecord.count({ where: { userId: id, source } })).toBe(1);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
  });
  it("预期月份已过去，不能借当前月调用补历史权益", async () => {
    await config();
    const id = await member();
    expect(
      await benefit().grantMonthlyBenefits(id, "MONTHLY", undefined, "member_monthly_202609"),
    ).toBe(false);
    expect(await db.pointsRecord.count({ where: { userId: id } })).toBe(0);
  });
  it("等待用户锁跨月，旧批次不能在锁内继续写入", async () => {
    clock(new Date(2026, 9, 31, 23, 59));
    await config();
    const id = await member();
    const client = new Proxy(db, {
      get(original, key) {
        if (key === "$transaction")
          return async (
            work: (tx: Prisma.TransactionClient) => Promise<unknown>,
            options?: {
              maxWait?: number;
              timeout?: number;
              isolationLevel?: Prisma.TransactionIsolationLevel;
            },
          ) =>
            original.$transaction(async (tx) => {
              const proxy = new Proxy(tx, {
                get(target, k) {
                  if (k === "$queryRaw")
                    return async (...args: Parameters<typeof tx.$queryRaw>) => {
                      const result = await tx.$queryRaw(...args);
                      jest.setSystemTime(new Date(2026, 10, 1, 0));
                      return result;
                    };
                  const v = Reflect.get(target, k, target);
                  return typeof v === "function" ? v.bind(target) : v;
                },
              });
              return work(proxy);
            }, options);
        const v = Reflect.get(original, key, original);
        return typeof v === "function" ? v.bind(original) : v;
      },
    });
    expect(await benefit(client).grantMonthlyBenefits(id, "MONTHLY", undefined, source)).toBe(
      false,
    );
    expect(await db.pointsRecord.count({ where: { userId: id } })).toBe(0);
  });
  it("过期与已撤销会员不恢复，零积分方案只写防重标记", async () => {
    await config(0);
    await member({ memberExpire: new Date(2026, 8, 30) });
    await member({ memberLevel: "NONE" });
    const id = await member();
    await job().monthlyGrantRecoveryCron();
    await job().monthlyGrantRecoveryCron();
    expect(await db.pointsRecord.count({ where: { userId: { in: users } } })).toBe(1);
    expect(await db.pointsRecord.count({ where: { userId: id, amount: 0, source } })).toBe(1);
    expect(await db.userPoints.count({ where: { userId: { in: users } } })).toBe(0);
  });
  it("同模板已有未用券仍安全回滚，不擅自改为仅赠积分或多发券", async () => {
    const c = await db.couponTemplate.create({
      data: {
        name: "合成当月券",
        type: "FIXED",
        faceValue: 1,
        totalCount: 0,
        claimedCount: 1,
        startTime: new Date(2026, 8, 1),
        endTime: new Date(2026, 11, 31),
        status: "ACTIVE",
      },
    });
    coupons.push(c.id);
    await config(100, c.id);
    const id = await member();
    await db.couponRecord.create({ data: { couponId: c.id, userId: id, status: "UNUSED" } });
    await job().monthlyGrantRecoveryCron();
    expect(await db.userPoints.findUnique({ where: { userId: id } })).toBeNull();
    expect(await db.pointsRecord.count({ where: { userId: id, source } })).toBe(0);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: c.id } })).claimedCount).toBe(
      1,
    );
  });
});
