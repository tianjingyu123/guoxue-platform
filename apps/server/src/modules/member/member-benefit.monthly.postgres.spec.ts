import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { MemberBenefitService } from "./member-benefit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { MemberGrantService } from "./member-grant.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "55462"
    || url.username !== "qa_voice" || !url.pathname.startsWith("/entitlement_notice_qa_")) {
    throw new Error("月度权益测试只允许专用本机合成库，禁止回退 DATABASE_URL");
  }
}

jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("月度积分与券 PostgreSQL 原子性", () => {
  let db: PrismaClient;
  const users: string[] = [];
  const coupons: string[] = [];
  const configs: string[] = [];
  const service = () => new MemberBenefitService(db as unknown as PrismaService, {} as RedisService);
  const member = async (extra: Partial<Prisma.UserCreateInput> = {}) => {
    const u = await db.user.create({ data: { nickname: "合成月度权益用户", memberLevel: "MONTHLY", memberExpire: new Date(Date.now() + 86400000), ...extra } });
    users.push(u.id);
    return u.id;
  };
  const config = async (points = 100, couponId: string | null = null, level = "MONTHLY") => {
    const c = await db.memberConfig.create({ data: { level, name: "合成月度方案", price: 1, monthlyPoints: points, monthlyCouponId: couponId } });
    configs.push(c.id);
    return c;
  };
  const coupon = async (totalCount = 0) => {
    const c = await db.couponTemplate.create({ data: { name: "合成月度券", type: "FIXED", faceValue: 1, totalCount,
      startTime: new Date(Date.now() - 86400000), endTime: new Date(Date.now() + 86400000), status: "ACTIVE" } });
    coupons.push(c.id);
    return c.id;
  };
  const failDuring = async (table: "PointsRecord" | "CouponRecord", operation: () => Promise<unknown>) => {
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_monthly_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic monthly write failure'; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_monthly_fail BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_monthly_fail()`);
    try { await expect(operation()).rejects.toThrow(); }
    finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_monthly_fail ON "${table}"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_monthly_fail()`);
    }
  };
  const noPartial = async (userId: string) => {
    expect(await db.userPoints.findUnique({ where: { userId } })).toBeNull();
    expect(await db.pointsRecord.count({ where: { userId } })).toBe(0);
    expect(await db.couponRecord.count({ where: { userId } })).toBe(0);
  };

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const identity = await db.$queryRaw<Array<{ name: string; port: number }>>`SELECT current_database() AS name, inet_server_port() AS port`;
    if (!identity[0]?.name.startsWith("entitlement_notice_qa_") || identity[0].port !== 55462) throw new Error("合成库身份不符");
    if (await db.memberConfig.count()) throw new Error("月度方案测试必须使用无预置方案的专用库");
  });
  afterEach(async () => {
    await db.couponRecord.deleteMany({ where: { userId: { in: users } } });
    await db.pointsRecord.deleteMany({ where: { userId: { in: users } } });
    await db.userPoints.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    await db.memberConfig.deleteMany({ where: { id: { in: configs.splice(0) } } });
    await db.couponTemplate.deleteMany({ where: { id: { in: coupons.splice(0) } } });
  });
  afterAll(async () => db?.$disconnect());

  it("积分流水失败不能先增加余额，恢复后仅发一次", async () => {
    await config();
    const id = await member();
    await failDuring("PointsRecord", () => service().grantMonthlyBenefits(id, "MONTHLY"));
    await noPartial(id);
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(true);
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(false);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
  });

  it("券记录失败时积分、积分流水和库存一起回滚，恢复后可重试", async () => {
    const couponId = await coupon();
    await config(100, couponId);
    const id = await member();
    await failDuring("CouponRecord", () => service().grantMonthlyBenefits(id, "MONTHLY"));
    await noPartial(id);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } })).claimedCount).toBe(0);
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(true);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
    expect(await db.couponRecord.count({ where: { userId: id } })).toBe(1);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } })).claimedCount).toBe(1);
  });

  it("仅赠券的方案也保存零积分防重记录，重放不增库存", async () => {
    const couponId = await coupon();
    await config(0, couponId);
    const id = await member();
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(true);
    expect(await db.pointsRecord.count({ where: { userId: id, amount: 0, type: "EARN" } })).toBe(1);
    expect(await db.userPoints.findUnique({ where: { userId: id } })).toBeNull();
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(false);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } })).claimedCount).toBe(1);
  });

  it("双实例发同一用户的当月权益仅一次", async () => {
    const couponId = await coupon();
    await config(100, couponId);
    const id = await member();
    const results = await Promise.all([service().grantMonthlyBenefits(id, "MONTHLY"), service().grantMonthlyBenefits(id, "MONTHLY")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
    expect(await db.pointsRecord.count({ where: { userId: id } })).toBe(1);
    expect(await db.couponRecord.count({ where: { userId: id } })).toBe(1);
  });

  it("两个独立 Node 进程发同一用户仅一次", async () => {
    await config();
    const id = await member();
    const code = `require('reflect-metadata');
      const { PrismaClient } = require('@prisma/client');
      const { MemberBenefitService } = require(${JSON.stringify(resolve("src/modules/member/member-benefit.service.ts"))});
      const db = new PrismaClient({ datasources: { db: { url: process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL } } });
      (async () => { try { console.log(JSON.stringify({ granted: await new MemberBenefitService(db, {}).grantMonthlyBenefits(${JSON.stringify(id)}, 'MONTHLY') })); }
        finally { await db.$disconnect(); } })().catch(() => { process.exitCode = 1; });`;
    const run = () => promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
      env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") }, timeout: 20000,
    });
    const results = await Promise.all([run(), run()]);
    expect(results.map(r => JSON.parse(r.stdout.trim()).granted).filter(Boolean)).toHaveLength(1);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(100);
  });

  it("不同用户竞争最后一张券不会超发，积分仍按原缺券政策发放", async () => {
    const couponId = await coupon(1);
    await config(100, couponId);
    const ids = await Promise.all([member(), member()]);
    expect(await Promise.all(ids.map(id => service().grantMonthlyBenefits(id, "MONTHLY")))).toEqual([true, true]);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } })).claimedCount).toBe(1);
    expect(await db.couponRecord.count({ where: { couponId } })).toBe(1);
    for (const userId of ids) expect((await db.userPoints.findUniqueOrThrow({ where: { userId } })).balance).toBe(100);
  });

  it("购买场景传入事务不另行提交，父事务失败全部回滚", async () => {
    const couponId = await coupon();
    await config(100, couponId);
    const id = await member();
    await expect(db.$transaction(async tx => {
      expect(await service().grantMonthlyBenefits(id, "MONTHLY", tx)).toBe(true);
      throw new Error("synthetic payment rollback");
    })).rejects.toThrow("synthetic payment rollback");
    await noPartial(id);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } })).claimedCount).toBe(0);
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(true);
  });

  it("旧正积分流水仍防重复，不历史补发可能漏发的券", async () => {
    const couponId = await coupon();
    await config(100, couponId);
    const id = await member();
    const now = new Date();
    const source = `member_monthly_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    await db.pointsRecord.create({ data: { userId: id, amount: 100, type: "EARN", source } });
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(false);
    expect(await db.couponRecord.count({ where: { userId: id } })).toBe(0);
  });

  it("撤销、过期和不存在的用户不被旧 cron 快照继续发放", async () => {
    await config();
    const cancelled = await member({ memberLevel: "NONE" });
    const expired = await member({ memberExpire: new Date(Date.now() - 1000) });
    for (const id of [cancelled, expired, "synthetic-nonexistent-user"]) {
      expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(false);
      await noPartial(id);
    }
  });

  it("cron 旧等级快照使用锁内最新等级，购买事务保留明确方案参数", async () => {
    await config(100, null, "MONTHLY");
    await config(200, null, "YEARLY");
    const latest = await member({ memberLevel: "YEARLY" });
    expect(await service().grantMonthlyBenefits(latest, "MONTHLY")).toBe(true);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: latest } })).balance).toBe(200);
    const purchase = await member({ memberLevel: "YEARLY" });
    await db.$transaction(tx => service().grantMonthlyBenefits(purchase, "MONTHLY", tx));
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: purchase } })).balance).toBe(100);
  });

  it("库存不足与模板不存在保留既有跳过赠券语义，不凭空增加库存", async () => {
    const couponId = await coupon(1);
    await db.couponTemplate.update({ where: { id: couponId }, data: { claimedCount: 1 } });
    const c = await config(100, couponId);
    const first = await member();
    expect(await service().grantMonthlyBenefits(first, "MONTHLY")).toBe(true);
    expect(await db.couponRecord.count({ where: { userId: first } })).toBe(0);
    await db.memberConfig.update({ where: { id: c.id }, data: { monthlyCouponId: "synthetic-missing-template" } });
    const second = await member();
    expect(await service().grantMonthlyBenefits(second, "MONTHLY")).toBe(true);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: second } })).balance).toBe(100);
  });

  it("已有未用同模板券触发既有唯一约束时，积分和库存安全回滚", async () => {
    const couponId = await coupon();
    await config(100, couponId);
    const id = await member();
    await db.couponRecord.create({ data: { userId: id, couponId, status: "UNUSED" } });
    await db.couponTemplate.update({ where: { id: couponId }, data: { claimedCount: 1 } });
    await expect(service().grantMonthlyBenefits(id, "MONTHLY")).rejects.toThrow();
    expect(await db.userPoints.findUnique({ where: { userId: id } })).toBeNull();
    expect(await db.pointsRecord.count({ where: { userId: id } })).toBe(0);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: couponId } })).claimedCount).toBe(1);
    expect(await db.couponRecord.count({ where: { userId: id } })).toBe(1);
  });

  it("真实月度发放批次的单个失败不拖累其他用户，重跑只补失败者", async () => {
    await config();
    const failed = await member();
    const other = await member();
    const grant = () => new MemberGrantService(db as unknown as PrismaService, {} as RedisService, service()).runMonthlyGrant();
    // 用户 id 为本测试库生成的 UUID，不接受外部输入。
    await db.$executeRawUnsafe(`CREATE FUNCTION synthetic_monthly_batch_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId" = '${failed}' THEN RAISE EXCEPTION 'synthetic single member failure'; END IF; RETURN NEW; END $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER synthetic_monthly_batch_fail BEFORE INSERT ON "PointsRecord" FOR EACH ROW EXECUTE FUNCTION synthetic_monthly_batch_fail()`);
    try {
      expect(await grant()).toEqual({ granted: 1, skipped: 1 });
      await noPartial(failed);
      expect((await db.userPoints.findUniqueOrThrow({ where: { userId: other } })).balance).toBe(100);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_monthly_batch_fail ON "PointsRecord"`);
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_monthly_batch_fail()`);
    }
    expect(await grant()).toEqual({ granted: 1, skipped: 1 });
    for (const userId of [failed, other]) expect((await db.userPoints.findUniqueOrThrow({ where: { userId } })).balance).toBe(100);
  });

  it("不存在方案不发放，负积分配置不能悄悄发券或写完成记录", async () => {
    const id = await member();
    expect(await service().grantMonthlyBenefits(id, "MONTHLY")).toBe(false);
    await config(-1);
    await expect(service().grantMonthlyBenefits(id, "MONTHLY")).rejects.toThrow("会员月度权益配置无效");
    await noPartial(id);
  });
});
