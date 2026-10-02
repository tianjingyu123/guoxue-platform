import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { ShopPaymentService } from "./shop-payment.service";
import { ShopRefundService } from "./shop-refund.service";
import { MemberBenefitService } from "../member/member-benefit.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { NotificationService } from "../notification/notification.service";
import { PaidCourseNotificationTask } from "../notification/paid-course-notification.task";
import { CoursePurchaseService } from "../course/course-purchase.service";

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
    throw new Error("付费课程通知仅允许专用合成库");
}
jest.setTimeout(30000);
(url ? describe : describe.skip)("付费课程新付款事实与独立通知真实PG", () => {
  let db: PrismaClient;
  const users: string[] = [],
    courses: string[] = [];
  const redis = {
    setNX: async () => true,
    del: async () => undefined,
    delByPattern: async () => undefined,
    get: async () => JSON.stringify({ PUSH_ENABLED: false }),
    getJson: async () => ({ PUSH_ENABLED: false }),
  };
  const forbidden = jest.fn(() => {
    throw new Error("禁止真实通知");
  });
  const rights = () => new EntitlementService(db as never);
  const notices = () =>
    new NotificationService(db as never, redis as never, { send: forbidden } as never, {} as never);
  const task = () => new PaidCourseNotificationTask(db as never);
  const payment = () =>
    new ShopPaymentService(
      db as never,
      redis as never,
      {} as never,
      {} as never,
      {} as never,
      { fire: async () => undefined } as never,
      new MemberBenefitService(db as never, redis as never),
      rights(),
      { recordOrderCommissionAndFee: async () => undefined } as never,
      {
        invalidateOrderCache: async () => undefined,
        settleGroupBuyIfNeeded: async () => undefined,
      } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      notices(),
    );
  const refund = () =>
    new ShopRefundService(
      db as never,
      redis as never,
      {} as never,
      {} as never,
      {} as never,
      { registerRefundNotifyHandler: () => undefined } as never,
      {} as never,
      { fire: async () => undefined } as never,
      rights(),
      undefined,
      notices(),
    );
  const user = async () => {
    const u = await db.user.create({ data: { nickname: "合成付费课程通知用户" } });
    users.push(u.id);
    return u.id;
  };
  const order = async (validityDays = 7) => {
    const userId = await user(),
      teacher = await user();
    const c = await db.course.create({
      data: {
        title: "合成付费课程",
        userId: teacher,
        price: 19,
        validityDays,
        auditStatus: "APPROVED",
        visibility: "PLATFORM",
      },
    });
    courses.push(c.id);
    return db.order.create({
      data: {
        userId,
        type: "COURSE",
        targetId: c.id,
        amount: 19,
        payAmount: 19,
        status: "PENDING",
        payMethod: "WECHAT",
        payTransactionId: "synthetic-course-" + randomUUID(),
      },
    });
  };
  type TestOrder = Awaited<ReturnType<typeof order>>;
  const callback = (o: TestOrder) => ({
    out_trade_no: o.payTransactionId,
    transaction_id: "synthetic-paid-" + o.id,
    trade_state: "SUCCESS",
    attach: o.id,
    amount: { total: 1900 },
  });
  const ledger = (o: TestOrder) =>
    db.entitlementLedger.findUniqueOrThrow({
      where: { idempotencyKey: `order:${o.id}:course.access` },
    });
  const paid = async (validityDays = 7) => {
    const o = await order(validityDays);
    expect(await payment().handlePaymentNotify(callback(o))).toBe(true);
    return o;
  };
  const count = (o: TestOrder) =>
    db.notification.count({ where: { idempotencyKey: `${o.userId}:COURSE_ENROLLED:${o.id}` } });
  const rejectInsert = async (
    table: "EntitlementLedger" | "Notification",
    work: () => Promise<void>,
  ) => {
    const condition =
      table === "Notification"
        ? "IF NEW.type='COURSE' THEN RAISE EXCEPTION 'synthetic paid course failure'; END IF; RETURN NEW;"
        : "RAISE EXCEPTION 'synthetic paid course failure';";
    await db.$executeRawUnsafe(
      `CREATE FUNCTION synthetic_paid_course_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${condition} END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER synthetic_paid_course_fail BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION synthetic_paid_course_fail()`,
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER synthetic_paid_course_fail ON "${table}"`);
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_paid_course_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: url! } } });
    const [i] = await db.$queryRaw<
      Array<{ name: string; port: number }>
    >`SELECT current_database() AS name,inet_server_port() AS port`;
    if (
      !i.name.startsWith("entitlement_notice_qa_") ||
      ![5432, 55462].includes(i.port) ||
      (await db.entitlementLedger.count({ where: { entitlementKey: "course.access" } }))
    )
      throw new Error("隔离库已有课程事实或身份不符");
  });
  afterEach(async () => {
    expect(await db.virtualCoinTransaction.count({ where: { userId: { in: users } } })).toBe(0);
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.order.deleteMany({ where: { userId: { in: users } } });
    await db.course.deleteMany({ where: { id: { in: courses.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
    expect(forbidden).not.toHaveBeenCalled();
  });
  afterAll(async () => db?.$disconnect());
  it("真实付款与新开通标记同事务，订单支付通知保留，课程只补一条", async () => {
    const o = await paid();
    expect((await ledger(o)).metadata).toEqual({
      orderType: "COURSE",
      notificationEvent: "COURSE_PAID_GRANTED_V1",
    });
    expect(await db.notification.count({ where: { userId: o.userId } })).toBe(1);
    expect(await task().deliverPending()).toBe(1);
    const n = await db.notification.findFirstOrThrow({
      where: { userId: o.userId, type: "COURSE" },
    });
    expect(n).toMatchObject({ targetType: "COURSE", targetId: o.targetId, title: "课程开通成功" });
    expect(await payment().handlePaymentNotify(callback(o))).toBe(true);
    expect(await task().deliverPending()).toBe(0);
    expect(await count(o)).toBe(1);
    expect(await db.notification.count({ where: { userId: o.userId } })).toBe(2);
  });
  it("永久有效课程的新开通可以通知", async () => {
    const o = await paid(0);
    expect((await ledger(o)).validUntil).toBeNull();
    expect(await task().deliverPending()).toBe(1);
  });
  it("真实权益流水失败导致付款整笔回滚，不能创建任何成功通知", async () => {
    const o = await order();
    await rejectInsert("EntitlementLedger", async () => {
      await expect(payment().handlePaymentNotify(callback(o))).rejects.toThrow(
        "synthetic paid course failure",
      );
    });
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
    expect(await db.entitlementLedger.count({ where: { userId: o.userId } })).toBe(0);
    expect(await db.notification.count({ where: { userId: o.userId } })).toBe(0);
    expect(await task().deliverPending()).toBe(0);
  });
  it("课程通知真实写入失败不阻断付款，分钟任务失败后释放并恢复", async () => {
    let o!: TestOrder;
    await rejectInsert("Notification", async () => {
      o = await paid();
      const t = task();
      await expect(t.tick()).resolves.toBeUndefined();
      expect(await count(o)).toBe(0);
      expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PAID");
      expect((await ledger(o)).action).toBe("GRANT");
    });
    await task().tick();
    expect(await count(o)).toBe(1);
  });
  it("两个独立进程并发补发只建立一条", async () => {
    const o = await paid(),
      file = resolve("src/modules/notification/paid-course-notification.task.ts");
    const script = `require('reflect-metadata');require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS'}});const{PrismaClient}=require('@prisma/client');const{PaidCourseNotificationTask}=require(${JSON.stringify(file)});const p=new PrismaClient({datasources:{db:{url:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL}}});new PaidCourseNotificationTask(p).deliverPending().then(n=>console.log(n)).finally(()=>p.$disconnect());`;
    const execute = promisify(execFile);
    await Promise.all(
      [1, 2].map(() =>
        execute(process.execPath, ["-e", script], {
          cwd: process.cwd(),
          env: process.env,
          timeout: 20000,
        }),
      ),
    );
    expect(await count(o)).toBe(1);
  });
  it("真实退款冲正完成后不得再补开通成功", async () => {
    const o = await paid();
    await refund().handleRefundNotify({
      out_refund_no: "RF" + o.id,
      transaction_id: "synthetic-paid-" + o.id,
      refund_status: "SUCCESS",
      refund_id: "synthetic-refund-" + o.id,
      amount: { refund: 1900, total: 1900 },
    });
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("REFUNDED");
    expect(
      await db.entitlementLedger.count({
        where: { action: "REVOKE", reversesLedgerId: (await ledger(o)).id },
      }),
    ).toBe(1);
    expect(await task().deliverPending()).toBe(0);
    expect(await count(o)).toBe(0);
  });
  it.each([
    "order-type",
    "order-status",
    "order-paidAt",
    "order-user",
    "order-target",
    "ledger-source",
    "ledger-resource",
    "ledger-key",
    "ledger-scope",
    "ledger-quantity",
    "ledger-unlimited",
    "ledger-marker",
    "ledger-user",
  ])("错事实%s不报告课程成功", async (state) => {
    const o = await paid(),
      l = await ledger(o);
    if (state === "order-type")
      await db.order.update({ where: { id: o.id }, data: { type: "PRODUCT" } });
    if (state === "order-status")
      await db.order.update({ where: { id: o.id }, data: { status: "REFUNDED" } });
    if (state === "order-paidAt")
      await db.order.update({ where: { id: o.id }, data: { paidAt: null } });
    if (state === "order-user")
      await db.order.update({ where: { id: o.id }, data: { userId: await user() } });
    if (state === "order-target")
      await db.order.update({ where: { id: o.id }, data: { targetId: "synthetic-other-course" } });
    if (state === "ledger-source")
      await db.entitlementLedger.update({ where: { id: l.id }, data: { sourceType: "ADMIN" } });
    if (state === "ledger-resource")
      await db.entitlementLedger.update({
        where: { id: l.id },
        data: { resourceId: "synthetic-other-course" },
      });
    if (state === "ledger-key")
      await db.entitlementLedger.update({
        where: { id: l.id },
        data: { idempotencyKey: "synthetic-other-key" },
      });
    if (state === "ledger-scope")
      await db.entitlementLedger.update({ where: { id: l.id }, data: { scope: "CIRCLE" } });
    if (state === "ledger-quantity")
      await db.entitlementLedger.update({ where: { id: l.id }, data: { quantity: 0 } });
    if (state === "ledger-unlimited")
      await db.entitlementLedger.update({ where: { id: l.id }, data: { unlimited: true } });
    if (state === "ledger-marker")
      await db.entitlementLedger.update({
        where: { id: l.id },
        data: { metadata: { orderType: "COURSE" } },
      });
    if (state === "ledger-user")
      await db.entitlementLedger.update({ where: { id: l.id }, data: { userId: await user() } });
    expect(await task().deliverPending()).toBe(0);
    expect(await count(o)).toBe(0);
  });
  it.each(["deleted", "unapproved", "expired"])("课程%s不得补成功", async (state) => {
    const o = await paid();
    await db.course.update({
      where: { id: o.targetId },
      data:
        state === "deleted"
          ? { deletedAt: new Date() }
          : state === "unapproved"
            ? { auditStatus: "PENDING" }
            : { validityDays: 1 },
    });
    if (state === "expired")
      await db.order.update({
        where: { id: o.id },
        data: { paidAt: new Date(Date.now() - 86400000 * 2) },
      });
    expect(await task().deliverPending()).toBe(0);
  });
  it.each(["future", "expired"])("权益流水%s不补成功", async (state) => {
    const o = await paid(),
      l = await ledger(o);
    await db.entitlementLedger.update({
      where: { id: l.id },
      data:
        state === "future"
          ? { validFrom: new Date(Date.now() + 86400000) }
          : { validUntil: new Date(Date.now() - 86400000) },
    });
    expect(await task().deliverPending()).toBe(0);
  });
  it("已完成订单的有效新权益可以补发", async () => {
    const o = await paid();
    await db.order.update({ where: { id: o.id }, data: { status: "COMPLETED" } });
    expect(await task().deliverPending()).toBe(1);
    expect(await count(o)).toBe(1);
  });
  it("通知跨用户拒绝，课程点击后的付费权限继续校验", async () => {
    const o = await paid(),
      other = await user();
    await task().deliverPending();
    const n = await db.notification.findFirstOrThrow({
      where: { userId: o.userId, type: "COURSE" },
    });
    expect((await notices().getById(n.id, o.userId)).targetId).toBe(o.targetId);
    await expect(notices().getById(n.id, other)).rejects.toThrow();
    const c = new CoursePurchaseService(db as never, redis as never, {} as never, {} as never);
    expect(await c.checkAccess(o.userId, o.targetId)).toBe(true);
    expect(await c.checkAccess(other, o.targetId)).toBe(false);
  });
});
