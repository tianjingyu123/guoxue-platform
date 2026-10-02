import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { MemberBenefitService } from "./member-benefit.service";
import { MemberMonthlyNotificationTask } from "../notification/member-monthly-notification.task";
import { NotificationService } from "../notification/notification.service";

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
    throw new Error("月度通知只允许专用合成库");
}
jest.setTimeout(30000);
(testUrl ? describe : describe.skip)("月度实际发放与持久通知真实PG", () => {
  let db: PrismaClient;
  const users: string[] = [],
    coupons: string[] = [];
  const source = () => {
    const d = new Date();
    return `member_monthly_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const benefit = () => new MemberBenefitService(db as never, {} as never);
  const task = () => new MemberMonthlyNotificationTask(db as never);
  const member = async () => {
    const u = await db.user.create({
      data: {
        nickname: "合成月度通知用户",
        memberLevel: "MONTHLY",
        memberExpire: new Date(Date.now() + 86400000 * 5),
      },
    });
    users.push(u.id);
    return u.id;
  };
  const coupon = async (totalCount = 0) => {
    const c = await db.couponTemplate.create({
      data: {
        name: "合成月度通知券",
        type: "FIXED",
        faceValue: 1,
        totalCount,
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 86400000),
        status: "ACTIVE",
      },
    });
    coupons.push(c.id);
    return c.id;
  };
  const configure = async (points = 10, couponId: string | null = null) =>
    db.memberConfig.create({
      data: {
        level: "MONTHLY",
        name: "合成会员方案",
        price: 19,
        monthlyPoints: points,
        monthlyCouponId: couponId,
      },
    });
  const noticeCount = (userId: string) => db.notification.count({ where: { userId } });
  const receipt = (userId: string) =>
    db.memberMonthlyBenefitNotice.findFirstOrThrow({ where: { userId } });
  const fail = async (
    table: "MemberMonthlyBenefitNotice" | "Notification",
    work: () => Promise<void>,
  ) => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION synthetic_monthly_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notice failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER synthetic_monthly_notice_fail BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_monthly_notice_fail()`,
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_monthly_notice_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_monthly_notice_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [i] = await db.$queryRaw<
      Array<{ port: number; name: string }>
    >`SELECT inet_server_port() AS port,current_database() AS name`;
    if (
      ![5432, 55462].includes(i.port) ||
      !i.name.startsWith("entitlement_notice_qa_") ||
      (await db.memberConfig.count())
    )
      throw new Error("仅允许无预置方案的隔离库");
  });
  afterEach(async () => {
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.couponRecord.deleteMany({ where: { userId: { in: users } } });
    await db.pointsRecord.deleteMany({ where: { userId: { in: users } } });
    await db.userPoints.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    await db.memberConfig.deleteMany({ where: { level: "MONTHLY" } });
    await db.couponTemplate.deleteMany({ where: { id: { in: coupons.splice(0) } } });
  });
  afterAll(async () => db?.$disconnect());

  it("积分和券提交后分别到账并直达本人明细，重复调度不再生成", async () => {
    await configure(10, await coupon());
    const id = await member();
    expect(await benefit().grantMonthlyBenefits(id, "MONTHLY")).toBe(true);
    expect(await noticeCount(id)).toBe(0);
    const f = await receipt(id);
    expect(f.points).toBe(10);
    expect(f.couponRecordId).not.toBeNull();
    expect(await task().deliverPending()).toBe(2);
    expect(await task().deliverPending()).toBe(0);
    const rows = await db.notification.findMany({ where: { userId: id } });
    expect(rows.map((r) => r.targetType).sort()).toEqual(["COUPON", "POINTS"]);
    for (const n of rows) {
      expect(n.targetId).toBe(id);
      expect(n.idempotencyKey).toBe(id + ":MEMBER_MONTHLY_" + n.targetType + ":" + source());
      expect(n.content).not.toMatch(/手机号|金额|账号|10/);
    }
  });
  it.each([
    [10, false, 1],
    [0, true, 1],
    [0, false, 0],
  ])("积分%s和赠券%s只通知真实非空权益", async (points, hasCoupon, expected) => {
    await configure(points as number, hasCoupon ? await coupon() : null);
    const id = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    expect(await task().deliverPending()).toBe(expected);
  });
  it("缺券库存只通知真实积分，不能发赠券成功文案", async () => {
    const c = await coupon(1);
    await db.couponTemplate.update({ where: { id: c }, data: { claimedCount: 1 } });
    await configure(10, c);
    const id = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    expect((await receipt(id)).couponRecordId).toBeNull();
    expect(await task().deliverPending()).toBe(1);
    expect((await db.notification.findFirstOrThrow({ where: { userId: id } })).targetType).toBe(
      "POINTS",
    );
  });
  it("父付款事务回滚，没有发放事实或成功通知", async () => {
    await configure(10, await coupon());
    const id = await member();
    await expect(
      db.$transaction(async (tx) => {
        await benefit().grantMonthlyBenefits(id, "MONTHLY", tx);
        throw new Error("synthetic payment rollback");
      }),
    ).rejects.toThrow("synthetic payment rollback");
    expect(await db.pointsRecord.count({ where: { userId: id } })).toBe(0);
    expect(await db.couponRecord.count({ where: { userId: id } })).toBe(0);
    expect(await db.memberMonthlyBenefitNotice.count({ where: { userId: id } })).toBe(0);
    expect(await task().deliverPending()).toBe(0);
  });
  it("发放事实写入失败连同积分券回滚，不留下部分到账", async () => {
    const c = await coupon();
    await configure(10, c);
    const id = await member();
    await fail("MemberMonthlyBenefitNotice", async () => {
      await expect(benefit().grantMonthlyBenefits(id, "MONTHLY")).rejects.toThrow();
    });
    expect(await db.userPoints.findUnique({ where: { userId: id } })).toBeNull();
    expect(await db.couponRecord.count({ where: { userId: id } })).toBe(0);
    expect((await db.couponTemplate.findUniqueOrThrow({ where: { id: c } })).claimedCount).toBe(0);
    expect(await task().deliverPending()).toBe(0);
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    expect(await task().deliverPending()).toBe(2);
  });
  it("通知真实写入失败不改已提交积分券，释放后可补发", async () => {
    await configure(10, await coupon());
    const id = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    const runner = task();
    await fail("Notification", async () => {
      await runner.tick();
      expect(await noticeCount(id)).toBe(0);
    });
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(10);
    expect(await db.couponRecord.count({ where: { userId: id } })).toBe(1);
    await runner.tick();
    expect(await noticeCount(id)).toBe(2);
  });
  it("双实例发放及双实例补发均不重复", async () => {
    await configure(10, await coupon());
    const id = await member();
    const granted = await Promise.all([
      benefit().grantMonthlyBenefits(id, "MONTHLY"),
      benefit().grantMonthlyBenefits(id, "MONTHLY"),
    ]);
    expect(granted.filter(Boolean)).toHaveLength(1);
    expect(
      (await Promise.all([task().deliverPending(), task().deliverPending()])).reduce(
        (a, v) => a + v,
        0,
      ),
    ).toBe(2);
    expect((await db.userPoints.findUniqueOrThrow({ where: { userId: id } })).balance).toBe(10);
    expect(await noticeCount(id)).toBe(2);
  });
  it("两个独立进程补发总共只有两条通知", async () => {
    await configure(10, await coupon());
    const id = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    const code = `require('reflect-metadata');const {PrismaClient}=require('@prisma/client');const {MemberMonthlyNotificationTask}=require(${JSON.stringify(resolve("src/modules/notification/member-monthly-notification.task.ts"))});const db=new PrismaClient({datasources:{db:{url:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL}}});(async()=>{try{console.log(JSON.stringify({sent:await new MemberMonthlyNotificationTask(db).deliverPending()}));}finally{await db.$disconnect();}})().catch(()=>process.exitCode=1);`;
    const run = () =>
      promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
        env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") },
        timeout: 20000,
      });
    const results = await Promise.all([run(), run()]);
    expect(results.reduce((a, r) => a + JSON.parse(r.stdout.trim()).sent, 0)).toBe(2);
    expect(await noticeCount(id)).toBe(2);
  });
  it("旧流水不产生新事实或历史通知", async () => {
    await configure();
    const id = await member();
    await db.pointsRecord.create({
      data: { userId: id, amount: 10, source: source(), type: "EARN" },
    });
    expect(await benefit().grantMonthlyBenefits(id, "MONTHLY")).toBe(false);
    expect(await db.memberMonthlyBenefitNotice.count({ where: { userId: id } })).toBe(0);
    expect(await task().deliverPending()).toBe(0);
  });
  it.each(["source", "points", "userId"])("与真实积分流水的%s不符不报到账", async (field) => {
    await configure();
    const id = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    const f = await receipt(id);
    await db.memberMonthlyBenefitNotice.update({
      where: { id: f.id },
      data:
        field === "source"
          ? { source: "member_monthly_199901" }
          : field === "points"
            ? { points: 20 }
            : { userId: await member() },
    });
    expect(await task().deliverPending()).toBe(0);
  });
  it("其他用户的赠券不被本人的积分事实冒用", async () => {
    const c = await coupon();
    await configure(10, c);
    const id = await member(),
      other = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    const wrong = await db.couponRecord.create({
      data: { userId: other, couponId: c, status: "UNUSED" },
    });
    const f = await receipt(id);
    await db.memberMonthlyBenefitNotice.update({
      where: { id: f.id },
      data: { couponRecordId: wrong.id },
    });
    expect(await task().deliverPending()).toBe(1);
    expect((await db.notification.findFirstOrThrow({ where: { userId: id } })).targetType).toBe(
      "POINTS",
    );
  });
  it.each(["NONE", "EXPIRED"])("当前%s会员不补成功通知", async (state) => {
    await configure();
    const id = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    await db.user.update({
      where: { id },
      data:
        state === "NONE" ? { memberLevel: "NONE" } : { memberExpire: new Date(Date.now() - 1000) },
    });
    expect(await task().deliverPending()).toBe(0);
  });
  it("跨用户不能读取通知，自己的目标不携带另一个用户页面参数", async () => {
    await configure();
    const id = await member(),
      other = await member();
    await benefit().grantMonthlyBenefits(id, "MONTHLY");
    await task().deliverPending();
    const row = await db.notification.findFirstOrThrow({ where: { userId: id } });
    const notification = new NotificationService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(notification.getById(row.id, other)).rejects.toThrow("通知不存在");
    expect((await notification.getById(row.id, id)).targetId).toBe(id);
  });
  it("已完成事实不挤占批次，后面的待办仍能送达", async () => {
    for (let n = 0; n < 101; n++) {
      const id = await member(),
        p = await db.pointsRecord.create({
          data: { userId: id, type: "EARN", amount: 1, source: source() },
        });
      await db.memberMonthlyBenefitNotice.create({
        data: { id: p.id, userId: id, source: source(), points: 1, createdAt: p.createdAt },
      });
      if (n < 100)
        await db.notification.create({
          data: {
            userId: id,
            idempotencyKey: id + ":MEMBER_MONTHLY_POINTS:" + source(),
            type: "ENTITLEMENT",
            title: "合成已发送",
            content: "合成测试",
          },
        });
    }
    expect(await task().deliverPending()).toBe(1);
  });
});
