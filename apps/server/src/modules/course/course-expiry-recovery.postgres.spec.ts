import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { CourseSchedulerService } from "./course-scheduler.service";
import { NotificationService } from "../notification/notification.service";
import { CoursePurchaseService } from "./course-purchase.service";

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
    throw new Error("课程提醒恢复仅允许专用合成库");
}
jest.setTimeout(30000);
(url ? describe : describe.skip)("课程到期提醒真实PG与故障恢复", () => {
  let db: PrismaClient;
  const users: string[] = [],
    courses: string[] = [];
  const forbidden = jest.fn(() => {
    throw new Error("禁止外部推送");
  });
  const redis = {
    runExclusive: async (_k: string, _t: number, fn: () => Promise<unknown>) => fn(),
    getJson: async () => ({ PUSH_ENABLED: false }),
  };
  const notices = () =>
    new NotificationService(db as never, redis as never, { send: forbidden } as never, {} as never);
  const task = () => new CourseSchedulerService(db as never, redis as never, notices());
  const now = Date.parse("2026-10-02T09:00:00.000Z");
  let clock: jest.SpyInstance;
  const user = async () => {
    const u = await db.user.create({ data: { nickname: "合成课程到期验收" } });
    users.push(u.id);
    return u.id;
  };
  const fixture = async (remainingDays = 2, validityDays = 30) => {
    const uid = await user(),
      teacher = await user(),
      c = await db.course.create({
        data: {
          userId: teacher,
          title: "合成临期课程",
          price: 19,
          validityDays,
          auditStatus: "APPROVED",
          visibility: "PLATFORM",
        },
      });
    courses.push(c.id);
    const o = await db.order.create({
      data: {
        userId: uid,
        type: "COURSE",
        targetId: c.id,
        amount: 19,
        payAmount: 19,
        status: "PAID",
        paidAt: new Date(now - (validityDays - remainingDays) * 86400000),
      },
    });
    return { userId: uid, courseId: c.id, orderId: o.id };
  };
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const count = (f: Fixture) =>
    db.notification.count({ where: { userId: f.userId, targetId: f.courseId, type: "SYSTEM" } });
  const fail = async (courseId: string, work: () => Promise<void>) => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION synthetic_expiry_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId"='${courseId}' THEN RAISE EXCEPTION 'synthetic expiry failure'; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_expiry_fail BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION synthetic_expiry_fail()',
    );
    try {
      await work();
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_expiry_fail ON "Notification"');
      await db.$executeRawUnsafe("DROP FUNCTION synthetic_expiry_fail()");
    }
  };
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    const [i] = await db.$queryRaw<
      Array<{ port: number; database: string; owner: string }>
    >`SELECT inet_server_port() AS port, current_database() AS database, current_user AS owner`;
    // 宿主专用端口固定55462；Linux隔离容器内部5432，经55462映射访问。
    expect([55462, 5432]).toContain(i.port);
    expect(i.database).toBe(new URL(url!).pathname.slice(1));
    expect(i.owner).toBe("qa_voice");
    expect(await db.course.count()).toBe(0);
  });
  beforeEach(() => {
    clock = jest.spyOn(Date, "now").mockReturnValue(now);
    forbidden.mockClear();
  });
  afterEach(async () => {
    clock?.mockRestore();
    if (users.length) {
      await db.notification.deleteMany({ where: { userId: { in: users } } });
      await db.order.deleteMany({ where: { userId: { in: users } } });
      await db.course.deleteMany({ where: { id: { in: courses } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    }
    users.length = 0;
    courses.length = 0;
    expect(forbidden).not.toHaveBeenCalled();
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it("9点实际通知写入失败，10点新实例恢复，当天再跑只有一条", async () => {
    const f = await fixture();
    await fail(f.courseId, async () => {
      await task().checkExpiringCourses();
      expect(await count(f)).toBe(0);
    });
    clock.mockReturnValue(now + 3600000);
    await task().retryExpiringCourses();
    await task().retryExpiringCourses();
    expect(await count(f)).toBe(1);
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.userId } });
    expect(n.idempotencyKey).toBe(`${f.userId}:COURSE_EXPIRING:${f.courseId}:2026-10-02`);
    expect(n.targetType).toBe("COURSE");
    expect(n.targetId).toBe(f.courseId);
  });
  it("一门课程失败不阻断另一门，恢复时只补遗漏", async () => {
    const a = await fixture(),
      b = await fixture();
    await fail(a.courseId, async () => {
      await task().checkExpiringCourses();
      expect(await count(a)).toBe(0);
      expect(await count(b)).toBe(1);
    });
    await task().retryExpiringCourses();
    expect(await count(a)).toBe(1);
    expect(await count(b)).toBe(1);
  });
  it.each(["PENDING", "CANCELLED", "REFUNDED"] as const)(
    "失败后订单变为%s，不补过期提醒",
    async (status) => {
      const f = await fixture();
      await fail(f.courseId, async () => {
        await task().checkExpiringCourses();
      });
      await db.order.update({ where: { id: f.orderId }, data: { status } });
      await task().retryExpiringCourses();
      expect(await count(f)).toBe(0);
    },
  );
  it("失败后已续购，按最新付款期限重新判断，不再误报旧单", async () => {
    const f = await fixture();
    await fail(f.courseId, async () => {
      await task().checkExpiringCourses();
    });
    await db.order.create({
      data: {
        userId: f.userId,
        type: "COURSE",
        targetId: f.courseId,
        amount: 19,
        payAmount: 19,
        status: "PAID",
        paidAt: new Date(now),
      },
    });
    await task().retryExpiringCourses();
    expect(await count(f)).toBe(0);
  });
  it.each(["deleted", "unapproved", "permanent"])("失败后课程%s，不补提醒", async (kind) => {
    const f = await fixture();
    await fail(f.courseId, async () => {
      await task().checkExpiringCourses();
    });
    await db.course.update({
      where: { id: f.courseId },
      data:
        kind === "deleted"
          ? { deletedAt: new Date(now) }
          : kind === "unapproved"
            ? { auditStatus: "DRAFT" }
            : { validityDays: 0 },
    });
    await task().retryExpiringCourses();
    expect(await count(f)).toBe(0);
  });
  it.each([0, -1, 4])("剩余%s天不提醒", async (days) => {
    const f = await fixture(days);
    await task().retryExpiringCourses();
    expect(await count(f)).toBe(0);
  });
  it("恰好3天提醒，同用户同课程重复已付订单仍只一条", async () => {
    const f = await fixture(3);
    await db.order.create({
      data: {
        userId: f.userId,
        type: "COURSE",
        targetId: f.courseId,
        amount: 19,
        payAmount: 19,
        status: "COMPLETED",
        paidAt: new Date(now - 27 * 86400000),
      },
    });
    await task().retryExpiringCourses();
    expect(await count(f)).toBe(1);
  });
  it("不同用户独立提醒，跨用户不能读详情或获得课程访问权限", async () => {
    const f = await fixture(),
      other = await user();
    await task().retryExpiringCourses();
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.userId } });
    await expect(notices().getById(n.id, other)).rejects.toThrow();
    const purchase = new CoursePurchaseService(db as never, {} as never, {} as never, {} as never);
    expect(await purchase.checkAccess(other, f.courseId)).toBe(false);
    expect(await purchase.checkAccess(f.userId, f.courseId)).toBe(true);
  });
  it("次日新键继续原每日提醒，不补之前遗漏日期", async () => {
    const f = await fixture();
    clock.mockReturnValue(now + 86400000);
    await task().retryExpiringCourses();
    expect(await count(f)).toBe(1);
    const n = await db.notification.findFirstOrThrow({ where: { userId: f.userId } });
    expect(n.idempotencyKey).toBe(`${f.userId}:COURSE_EXPIRING:${f.courseId}:2026-10-03`);
  });
  it("两个独立进程实际调度只建一条站内通知", async () => {
    const f = await fixture();
    const code = `const {PrismaClient}=require('@prisma/client');const {CourseSchedulerService}=require(${JSON.stringify(resolve("src/modules/course/course-scheduler.service.ts"))});const {NotificationService}=require(${JSON.stringify(resolve("src/modules/notification/notification.service.ts"))});Date.now=()=>${now};const db=new PrismaClient({datasources:{db:{url:process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL}}});const redis={runExclusive:async(k,t,fn)=>fn(),getJson:async()=>({PUSH_ENABLED:false})};const n=new NotificationService(db,redis,{send:()=>{throw Error('禁止推送')}},{});new CourseSchedulerService(db,redis,n).retryExpiringCourses().finally(()=>db.$disconnect()).catch(()=>{process.exitCode=1});`;
    const run = promisify(execFile);
    await Promise.all(
      [1, 2].map(() =>
        run(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", code], {
          env: {
            ...process.env,
            ENTITLEMENT_NOTICE_TEST_DATABASE_URL: url,
            TS_NODE_PROJECT: resolve("tsconfig.jest.json"),
          },
          timeout: 20000,
        }),
      ),
    );
    expect(await count(f)).toBe(1);
  });
});
