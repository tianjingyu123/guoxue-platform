import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { CoursePurchaseService } from "./course-purchase.service";
import { FreeCourseNotificationTask } from "../notification/free-course-notification.task";
import { NotificationService } from "../notification/notification.service";

const url = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55462" ||
    u.username !== "qa_voice" ||
    !u.pathname.startsWith("/entitlement_notice_qa_")
  )
    throw new Error("免费订阅测试仅允许专用合成库");
}
jest.setTimeout(30000);
(url ? describe : describe.skip)("免费课程同事务事实与持久通知真实PG", () => {
  let db: PrismaClient;
  const users: string[] = [],
    courses: string[] = [];
  const redis = {
    setNX: async () => true,
    del: async () => undefined,
    get: async () => JSON.stringify({ PUSH_ENABLED: false }),
  };
  const forbiddenChannel = jest.fn(() => {
    throw new Error("禁止真实通知渠道");
  });
  const notify = () =>
    new NotificationService(
      db as never,
      redis as never,
      { send: forbiddenChannel } as never,
      {} as never,
    );
  const task = () => new FreeCourseNotificationTask(db as never);
  const service = (price = 0, notices?: NotificationService) =>
    new CoursePurchaseService(
      db as never,
      redis as never,
      {
        calculateTargetPrice: async () => ({
          effectivePrice: price,
          originalPrice: price,
          appliedPromotion: null,
        }),
      } as never,
      {
        resolveReferrerUserId: async () => null,
        isChannelAttributionEnabled: async () => false,
      } as never,
      notices,
    );
  const user = async () => {
    const u = await db.user.create({ data: { nickname: "合成课程订阅用户" } });
    users.push(u.id);
    return u.id;
  };
  const course = async (price = 0, validityDays = 0) => {
    const c = await db.course.create({
      data: {
        title: "合成课程通知验证",
        userId: await user(),
        price,
        validityDays,
        auditStatus: "APPROVED",
        visibility: "PLATFORM",
      },
    });
    courses.push(c.id);
    return c.id;
  };
  const enrolled = async (price = 0, validityDays = 0) => {
    const userId = await user(),
      courseId = await course(price, validityDays);
    const order = await service().purchase(userId, courseId);
    return { userId, courseId, order };
  };
  const count = (userId: string) => db.notification.count({ where: { userId } });
  const fail = async (
    table: "FreeCourseEnrollmentNotice" | "Notification",
    work: () => Promise<void>,
  ) => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION synthetic_free_notice_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic free notice failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER synthetic_free_notice_fail BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_free_notice_fail()`,
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_free_notice_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_free_notice_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: url! } } });
    const [i] = await db.$queryRaw<
      Array<{ port: number; name: string }>
    >`SELECT inet_server_port() AS port,current_database() AS name`;
    if (
      ![5432, 55462].includes(i.port) ||
      !i.name.startsWith("entitlement_notice_qa_") ||
      (await db.freeCourseEnrollmentNotice.count())
    )
      throw new Error("只允许无旧订阅事实的合成库");
  });
  afterEach(async () => {
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.order.deleteMany({ where: { userId: { in: users } } });
    await db.course.deleteMany({ where: { id: { in: courses.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    expect(forbiddenChannel).not.toHaveBeenCalled();
  });
  afterAll(async () => db?.$disconnect());
  it("真实免费订阅订单与事实一起提交，没有可选通知服务也可补发", async () => {
    const { userId, courseId, order } = await enrolled();
    expect(
      await db.freeCourseEnrollmentNotice.findUniqueOrThrow({ where: { id: order.id } }),
    ).toMatchObject({ userId, courseId });
    expect(await task().deliverPending()).toBe(1);
    const n = await db.notification.findFirstOrThrow({ where: { userId } });
    expect(n).toMatchObject({
      idempotencyKey: `${userId}:COURSE_ENROLLED:${order.id}`,
      type: "COURSE",
      targetType: "COURSE",
      targetId: courseId,
    });
    expect(await task().deliverPending()).toBe(0);
  });
  it("新事实写入失败连同订单回滚，绝不通知成功", async () => {
    const userId = await user(),
      courseId = await course();
    await fail("FreeCourseEnrollmentNotice", async () => {
      await expect(service().purchase(userId, courseId)).rejects.toThrow();
    });
    expect(await db.order.count({ where: { userId } })).toBe(0);
    expect(await db.freeCourseEnrollmentNotice.count()).toBe(0);
    expect(await task().deliverPending()).toBe(0);
  });
  it("外层真实事务回滚，已运行订阅逻辑也不能留下成功事实", async () => {
    const userId = await user(),
      courseId = await course();
    await expect(
      db.$transaction(async (tx) => {
        const o = await tx.order.create({
          data: {
            userId,
            targetId: courseId,
            type: "COURSE",
            amount: 0,
            payAmount: 0,
            payMethod: "FREE",
            status: "PAID",
            paidAt: new Date(),
          },
        });
        await tx.freeCourseEnrollmentNotice.create({ data: { id: o.id, userId, courseId } });
        throw new Error("synthetic parent rollback");
      }),
    ).rejects.toThrow("synthetic parent rollback");
    expect(await task().deliverPending()).toBe(0);
    expect(await db.order.count({ where: { userId } })).toBe(0);
  });
  it("立即通知真实插入失败不回滚订单，分钟任务失败释放后可恢复", async () => {
    const userId = await user(),
      courseId = await course();
    const recovery = task();
    await fail("Notification", async () => {
      await expect(service(0, notify()).purchase(userId, courseId)).resolves.toMatchObject({
        status: "PAID",
      });
      await new Promise((r) => setTimeout(r, 20));
      await recovery.tick();
      expect(await count(userId)).toBe(0);
      expect(await db.freeCourseEnrollmentNotice.count({ where: { userId } })).toBe(1);
    });
    await recovery.tick();
    expect(await count(userId)).toBe(1);
    await expect(service().purchase(userId, courseId)).rejects.toThrow("已购买该课程");
    expect(await task().deliverPending()).toBe(0);
  });
  it("立即通知与独立恢复竞争仍只有一条通知", async () => {
    const userId = await user(),
      courseId = await course();
    await service(0, notify()).purchase(userId, courseId);
    await Promise.all([task().deliverPending(), task().deliverPending()]);
    await new Promise((r) => setTimeout(r, 20));
    expect(await count(userId)).toBe(1);
  });
  it("两个独立进程补发同一订单总共一条通知", async () => {
    const { userId } = await enrolled();
    const code = `require('reflect-metadata');const {PrismaClient}=require('@prisma/client');const {FreeCourseNotificationTask}=require(${JSON.stringify(resolve("src/modules/notification/free-course-notification.task.ts"))});const db=new PrismaClient({datasources:{db:{url:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL}}});(async()=>{try{console.log(JSON.stringify({sent:await new FreeCourseNotificationTask(db).deliverPending()}));}finally{await db.$disconnect();}})().catch(()=>process.exitCode=1);`;
    const run = () =>
      promisify(execFile)(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
        env: { ...process.env, TS_NODE_PROJECT: resolve("tsconfig.jest.json") },
        timeout: 20000,
      });
    const results = await Promise.all([run(), run()]);
    expect(results.reduce((n, r) => n + JSON.parse(r.stdout.trim()).sent, 0)).toBe(1);
    expect(await count(userId)).toBe(1);
  });
  it("收费待支付与复用待支付不产生成功事实", async () => {
    const userId = await user(),
      courseId = await course(12);
    const first = await service(12).purchase(userId, courseId);
    const second = await service(12).purchase(userId, courseId);
    expect(first.status).toBe("PENDING");
    expect(second.id).toBe(first.id);
    expect(await db.freeCourseEnrollmentNotice.count()).toBe(0);
    expect(await task().deliverPending()).toBe(0);
  });
  it("促销到零元保留原价但不改变免费事实与课程目标", async () => {
    const userId = await user(),
      courseId = await course(12);
    const special = new CoursePurchaseService(
      db as never,
      redis as never,
      {
        calculateTargetPrice: async () => ({
          effectivePrice: 0,
          originalPrice: 12,
          appliedPromotion: { type: "LIMITED", id: "synthetic-promotion" },
        }),
      } as never,
      {
        resolveReferrerUserId: async () => null,
        isChannelAttributionEnabled: async () => false,
      } as never,
    );
    const order = await special.purchase(userId, courseId);
    expect(Number(order.originalAmount)).toBe(12);
    expect(await task().deliverPending()).toBe(1);
  });
  it.each(["status", "payMethod", "amount", "payAmount", "paidAt", "userId", "targetId"])(
    "订单的%s与免费事实不符不能通知成功",
    async (field) => {
      const { order } = await enrolled();
      const data =
        field === "status"
          ? { status: "REFUNDED" as const }
          : field === "payMethod"
            ? { payMethod: "ALIPAY" }
            : field === "amount"
              ? { amount: 1 }
              : field === "payAmount"
                ? { payAmount: 1 }
                : field === "paidAt"
                  ? { paidAt: null }
                  : field === "userId"
                    ? { userId: await user() }
                    : { targetId: await course() };
      await db.order.update({ where: { id: order.id }, data });
      expect(await task().deliverPending()).toBe(0);
    },
  );
  it.each(["deleted", "notApproved", "expired"])("课程%s不补成功通知", async (state) => {
    const { courseId, order } = await enrolled();
    await db.course.update({
      where: { id: courseId },
      data:
        state === "deleted"
          ? { deletedAt: new Date() }
          : state === "notApproved"
            ? { auditStatus: "PENDING" }
            : { validityDays: 1 },
    });
    if (state === "expired")
      await db.order.update({
        where: { id: order.id },
        data: { paidAt: new Date(Date.now() - 86400000 * 2) },
      });
    expect(await task().deliverPending()).toBe(0);
  });
  it("旧免费订单不生成新事实或历史通知", async () => {
    const userId = await user(),
      courseId = await course();
    await db.order.create({
      data: {
        userId,
        targetId: courseId,
        type: "COURSE",
        amount: 0,
        payAmount: 0,
        payMethod: "FREE",
        status: "PAID",
        paidAt: new Date(),
      },
    });
    expect(await task().deliverPending()).toBe(0);
    expect(await db.freeCourseEnrollmentNotice.count()).toBe(0);
  });
  it("通知跨用户拒绝，课程目标的原付费访问检查仍然生效", async () => {
    const { userId, courseId } = await enrolled(12);
    const other = await user();
    await task().deliverPending();
    const n = await db.notification.findFirstOrThrow({ where: { userId } });
    await expect(notify().getById(n.id, other)).rejects.toThrow();
    expect((await notify().getById(n.id, userId)).targetId).toBe(courseId);
    expect(await service().checkAccess(userId, courseId)).toBe(true);
    expect(await service().checkAccess(other, courseId)).toBe(false);
  });
});
