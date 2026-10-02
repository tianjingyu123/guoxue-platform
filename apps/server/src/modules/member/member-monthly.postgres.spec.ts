import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { MemberBenefitService } from "./member-benefit.service";
import type { PrismaService } from "../../prisma/prisma.service";
import type { RedisService } from "../../redis/redis.service";

const testUrl = process.env.MEMBER_MONTHLY_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55476"
    || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("月度权益测试只允许专用本机合成库，禁止回退 DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("月度会员权益 PostgreSQL 原子发放", () => {
  let db: PrismaClient;
  const users: string[] = [];
  const levels: string[] = [];
  const coupons: string[] = [];
  const service = () => new MemberBenefitService(db as unknown as PrismaService, {} as RedisService);
  const source = () => {
    const now = new Date();
    return `member_monthly_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  };
  const fixture = async (points = 10, stock = 0) => {
    const user = await db.user.create({ data: { nickname: "合成月度权益用户" } });
    users.push(user.id);
    const coupon = await db.couponTemplate.create({ data: {
      name: "合成月度赠券", type: "FIXED", faceValue: 1, totalCount: stock, status: "ACTIVE",
      startTime: new Date(Date.now() - 86400000), endTime: new Date(Date.now() + 30 * 86400000),
    } });
    coupons.push(coupon.id);
    const level = `qa-monthly-${randomUUID()}`;
    levels.push(level);
    await db.memberConfig.create({ data: { level, name: "合成会员", price: 1, monthlyPoints: points, monthlyCouponId: coupon.id } });
    return { userId: user.id, level, couponId: coupon.id };
  };
  const state = async (f: { userId: string; couponId: string }) => ({
    balance: (await db.userPoints.findUnique({ where: { userId: f.userId } }))?.balance ?? 0,
    earned: (await db.userPoints.findUnique({ where: { userId: f.userId } }))?.totalEarned ?? 0,
    ledger: await db.pointsRecord.count({ where: { userId: f.userId } }),
    claimed: (await db.couponTemplate.findUniqueOrThrow({ where: { id: f.couponId } })).claimedCount,
    coupons: await db.couponRecord.count({ where: { userId: f.userId } }),
  });
  const empty = { balance: 0, earned: 0, ledger: 0, claimed: 0, coupons: 0 };
  const once = { balance: 10, earned: 10, ledger: 1, claimed: 1, coupons: 1 };
  const failInsert = async (table: "PointsRecord" | "CouponRecord" | "MemberMonthlyGrant", action: () => Promise<void>) => {
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_monthly_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic monthly insert failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_monthly_fail BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_monthly_fail()`);
    try { await action(); } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_monthly_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_monthly_fail()");
    }
  };

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_")) throw new Error("合成库身份不符");
  });
  afterEach(async () => {
    for (const userId of users) await db.$executeRaw`DELETE FROM "MemberMonthlyGrant" WHERE "userId" = ${userId}`;
    // 积分与券记录没有用户外键，必须显式清理本用例生成的记录。
    await db.pointsRecord.deleteMany({ where: { userId: { in: users } } });
    await db.userPoints.deleteMany({ where: { userId: { in: users } } });
    await db.couponRecord.deleteMany({ where: { userId: { in: users } } });
    await db.memberConfig.deleteMany({ where: { level: { in: levels.splice(0) } } });
    await db.couponTemplate.deleteMany({ where: { id: { in: coupons.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db?.$disconnect(); });

  it("积分流水 INSERT 失败回滚余额，重试仅发一份", async () => {
    const f = await fixture();
    await failInsert("PointsRecord", async () => {
      await expect(service().grantMonthlyBenefits(f.userId, f.level)).rejects.toThrow();
      expect(await state(f)).toEqual(empty);
    });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    expect(await state(f)).toEqual(once);
  });

  it("赠券 INSERT 失败回滚积分流水、余额和库存，重试仅发一份", async () => {
    const f = await fixture();
    await failInsert("CouponRecord", async () => {
      await expect(service().grantMonthlyBenefits(f.userId, f.level)).rejects.toThrow();
      expect(await state(f)).toEqual(empty);
    });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    expect(await state(f)).toEqual(once);
  });

  it("调用者支付事务回滚时全部权益回滚，提交后重放跳过", async () => {
    const f = await fixture();
    await expect(db.$transaction(async tx => {
      expect(await service().grantMonthlyBenefits(f.userId, f.level, tx)).toBe(true);
      throw new Error("synthetic payment rollback");
    })).rejects.toThrow("synthetic payment rollback");
    expect(await state(f)).toEqual(empty);
    expect(await db.$transaction(tx => service().grantMonthlyBenefits(f.userId, f.level, tx))).toBe(true);
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(false);
    expect(await state(f)).toEqual(once);
  });

  it.each([0, 10])("两个独立 Node 进程同月并发只发一份，积分 %i", async points => {
    const f = await fixture(points);
    const code = `require('reflect-metadata');
      const { PrismaClient } = require('@prisma/client');
      const { MemberBenefitService } = require(${JSON.stringify(resolve("src/modules/member/member-benefit.service.ts"))});
      const db = new PrismaClient({ datasources: { db: { url: process.env.MEMBER_MONTHLY_TEST_DATABASE_URL } } });
      (async () => { try { console.log(JSON.stringify({ granted: await new MemberBenefitService(db, {}).grantMonthlyBenefits(${JSON.stringify(f.userId)}, ${JSON.stringify(f.level)}) })); }
        finally { await db.$disconnect(); } })().catch(() => { process.exitCode = 1; });`;
    const run = () => promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      cwd: process.cwd(), env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
    const results = await Promise.all([run(), run()]);
    expect(results.map(r => JSON.parse(r.stdout.trim().split("\n").at(-1)!).granted).sort()).toEqual([false, true]);
    expect(await state(f)).toEqual(points > 0 ? once : { ...empty, claimed: 1, coupons: 1 });
  });

  it("不同用户并发争领最后一张券不超库存，积分各自发放", async () => {
    const f = await fixture(10, 1);
    const second = await db.user.create({ data: { nickname: "合成最后一张券用户" } });
    users.push(second.id);
    expect(await Promise.all([service().grantMonthlyBenefits(f.userId, f.level), service().grantMonthlyBenefits(second.id, f.level)])).toEqual([true, true]);
    expect(await db.couponRecord.count({ where: { couponId: f.couponId } })).toBe(1);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: f.couponId } })).claimedCount).toBe(1);
    expect(await db.pointsRecord.count({ where: { userId: { in: [f.userId, second.id] } } })).toBe(2);
  });

  it("仅赠券配置失败回滚库存，修复后可重试且不伪造积分流水", async () => {
    const f = await fixture(0);
    await failInsert("CouponRecord", async () => {
      await expect(service().grantMonthlyBenefits(f.userId, f.level)).rejects.toThrow();
      expect(await state(f)).toEqual(empty);
    });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    expect(await state(f)).toEqual({ ...empty, claimed: 1, coupons: 1 });
  });

  it("仅赠券消费后重放仍跳过，同月不能再次领取", async () => {
    const f = await fixture(0);
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    await db.couponRecord.updateMany({ where: { userId: f.userId }, data: { status: "USED", usedAt: new Date() } });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(false);
    expect(await state(f)).toEqual({ ...empty, claimed: 1, coupons: 1 });
    const records = await db.$queryRaw<Array<{ points: number; couponId: string }>>`SELECT points, "couponId" FROM "MemberMonthlyGrant" WHERE "userId" = ${f.userId}`;
    expect(records).toEqual([{ points: 0, couponId: f.couponId }]);
  });

  it("月度凭据 INSERT 失败回滚全部权益，修复后仅发一次", async () => {
    const f = await fixture();
    await failInsert("MemberMonthlyGrant", async () => {
      await expect(service().grantMonthlyBenefits(f.userId, f.level)).rejects.toThrow();
      expect(await state(f)).toEqual(empty);
    });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(false);
    expect(await state(f)).toEqual(once);
  });

  it("上月已消费赠券与旧凭据不阻挡本月发放", async () => {
    const f = await fixture(0);
    const previous = new Date();
    previous.setDate(1); previous.setMonth(previous.getMonth() - 1);
    const oldSource = `member_monthly_${previous.getFullYear()}${String(previous.getMonth() + 1).padStart(2, "0")}`;
    await db.couponRecord.create({ data: { couponId: f.couponId, userId: f.userId, status: "USED", claimedAt: previous, usedAt: previous } });
    await db.couponTemplate.update({ where: { id: f.couponId }, data: { claimedCount: 1 } });
    await db.$executeRaw`INSERT INTO "MemberMonthlyGrant" (id, "userId", source, level, points, "couponId", "createdAt") VALUES (${randomUUID()}, ${f.userId}, ${oldSource}, ${f.level}, 0, ${f.couponId}, ${previous})`;
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(false);
    expect(await state(f)).toEqual({ ...empty, claimed: 2, coupons: 2 });
  });

  it("仅赠券库存耗尽不写成功凭据，补库存后可发放", async () => {
    const f = await fixture(0, 1);
    await db.couponTemplate.update({ where: { id: f.couponId }, data: { claimedCount: 1 } });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    expect(await db.$queryRaw`SELECT id FROM "MemberMonthlyGrant" WHERE "userId" = ${f.userId}`).toEqual([]);
    await db.couponTemplate.update({ where: { id: f.couponId }, data: { totalCount: 2 } });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(true);
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(false);
    expect(await state(f)).toEqual({ ...empty, claimed: 2, coupons: 1 });
  });

  it("没有会员配置不写入权益", async () => {
    const f = await fixture();
    expect(await service().grantMonthlyBenefits(f.userId, `missing-${randomUUID()}`)).toBe(false);
    expect(await state(f)).toEqual(empty);
  });

  it("既有当月积分流水保持跳过，不重复发放或自动修历史残缺", async () => {
    const f = await fixture();
    await db.pointsRecord.create({ data: { userId: f.userId, amount: 10, type: "EARN", source: source() } });
    expect(await service().grantMonthlyBenefits(f.userId, f.level)).toBe(false);
    expect(await state(f)).toEqual({ ...empty, ledger: 1 });
  });

  it("上月尚未使用的同券冲突时本月积分与库存全部回滚", async () => {
    const f = await fixture();
    await db.couponRecord.create({ data: { couponId: f.couponId, userId: f.userId, status: "UNUSED", claimedAt: new Date(Date.now() - 32 * 86400000) } });
    await db.couponTemplate.update({ where: { id: f.couponId }, data: { claimedCount: 1 } });
    await expect(service().grantMonthlyBenefits(f.userId, f.level)).rejects.toThrow();
    expect(await state(f)).toEqual({ ...empty, claimed: 1, coupons: 1 });
  });
});
