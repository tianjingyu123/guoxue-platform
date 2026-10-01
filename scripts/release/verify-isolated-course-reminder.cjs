// 仅在封闭镜像临时 PG/Redis 中调用编译后的实际任务；不访问真实用户或外部通知渠道。
const { createRequire } = require("node:module");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const req = createRequire("/app/apps/server/package.json");
const { PrismaClient } = req("@prisma/client");
const p = new PrismaClient();
const prefix = "linux-course-reminder-";
const rows = [];
const record = (name, detail = {}) => rows.push({ name, passed: true, ...detail });
const worker = `
const {createRequire}=require('node:module');
const {PrismaClient}=createRequire('/app/apps/server/package.json')('@prisma/client');
const {RedisService}=require('/app/apps/server/dist/redis/redis.service');
const {NotificationService}=require('/app/apps/server/dist/modules/notification/notification.service');
const {CourseSchedulerService}=require('/app/apps/server/dist/modules/course/course-scheduler.service');
const p=new PrismaClient();const r=new RedisService();let externalCalls=0;
const push=new Proxy({}, {get:()=>async()=>{externalCalls++;throw new Error('外部渠道禁止调用')}});
(async()=>{try{
 await r.pingShared();
 // 模拟租约失效/Redis降级时两个进程都执行，检验真正的数据库最终防重线。
 if(process.env.COURSE_REMINDER_LOST_LEASE==='1')r.runExclusive=async(_n,_t,fn)=>fn();
 const oldNow=Date.now;Date.now=()=>Number(process.env.COURSE_REMINDER_NOW);
 try{await new CourseSchedulerService(p,r,new NotificationService(p,r,push,{})).checkExpiringCourses();}
 finally{Date.now=oldNow;}
 if(externalCalls!==0)throw new Error('不得调用外部推送');
 console.log('NODE_TEST_RESULT:'+JSON.stringify({passed:true,pid:process.pid,externalCalls,lostLease:process.env.COURSE_REMINDER_LOST_LEASE==='1'}));
}finally{await p.$disconnect();await r.onModuleDestroy();}})().catch(e=>{console.error(e.message);process.exitCode=1});`;
const run = (now, lostLease = false) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["-e", worker], { env: {
    ...process.env, COURSE_REMINDER_NOW: String(now), COURSE_REMINDER_LOST_LEASE: lostLease ? "1" : "0",
  } });
  let output = ""; let errors = "";
  const timer = setTimeout(() => { child.kill(); reject(new Error("课程任务子进程超时")); }, 30000);
  child.stdout.on("data", data => { output += data; });
  child.stderr.on("data", data => { errors += data; });
  child.on("error", error => { clearTimeout(timer); reject(error); });
  child.on("close", code => {
    clearTimeout(timer);
    if (code !== 0) return reject(new Error(errors || "课程任务失败"));
    try { resolve(JSON.parse(output.split("\n").findLast(line => line.startsWith("NODE_TEST_RESULT:")).slice(17))); }
    catch (error) { reject(error); }
  });
});
const count = () => p.notification.count({ where: { targetId: { startsWith: prefix } } });
async function read(name, userId, route, status) {
  const token = userId ? req("jsonwebtoken").sign({ sub: userId, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: "5m" }) : null;
  const response = await fetch("http://127.0.0.1:3000/api/v1" + route, {
    headers: token ? { Authorization: "Bearer " + token } : {}, signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  assert.equal(response.status, status, name);
  record(name, { status });
  return body.data ?? body;
}
(async () => {
  const { RedisService } = require("/app/apps/server/dist/redis/redis.service");
  const r = new RedisService();
  try {
    const now = Date.now();
    const paidAt = new Date(now - 28 * 86400000);
    const users = ["linux-user-a", "linux-user-b"];
    await r.pingShared();
    for (const user of users) await r.setJson("notification:prefs:" + user, { PUSH_ENABLED: false }, 300);
    for (const [name, status, validityDays] of [["one", "APPROVED", 30], ["two", "APPROVED", 30], ["renewed", "APPROVED", 30], ["refunded", "APPROVED", 30], ["expired", "APPROVED", 30], ["draft", "DRAFT", 30], ["permanent", "APPROVED", 0]]) {
      await p.course.create({ data: { id: prefix + name, userId: "linux-super", title: "隔离合成课程", auditStatus: status, validityDays, price: 1, visibility: "PLATFORM" } });
      await p.order.create({ data: { id: prefix + "order-" + name, userId: name === "two" ? users[1] : users[0], type: "COURSE", targetId: prefix + name,
        amount: 1, status: name === "refunded" ? "REFUNDED" : "PAID", paidAt: name === "expired" ? new Date(now - 31 * 86400000) : paidAt } });
    }
    await p.order.create({ data: { id: prefix + "renew-order", userId: users[0], type: "COURSE", targetId: prefix + "renewed", amount: 1, status: "COMPLETED", paidAt: new Date(now) } });
    await p.courseChapter.create({ data: { id: prefix + "chapter", courseId: prefix + "one", title: "隔离收费内容", content: "ISOLATED-COURSE-PAID-CONTENT", freeTrial: false } });
    // 真实 PG 触发器拒绝一门课落库，确认下一门课程仍建立通知。
    await p.$executeRawUnsafe(`CREATE FUNCTION isolated_course_notification_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = '${prefix}one' THEN RAISE EXCEPTION 'isolated course notification failure'; END IF; RETURN NEW; END $$`);
    await p.$executeRawUnsafe('CREATE TRIGGER isolated_course_notification_reject BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION isolated_course_notification_reject()');
    assert((await run(now)).passed);
    assert.equal(await count(), 1);
    assert.equal(await p.notification.count({ where: { targetId: prefix + "two", userId: users[1] } }), 1);
    record("notification-db-failure-does-not-starve-next-course");
    await p.$executeRawUnsafe('DROP TRIGGER isolated_course_notification_reject ON "Notification"');
    await p.$executeRawUnsafe('DROP FUNCTION isolated_course_notification_reject()');
    assert((await run(now)).passed);
    assert.equal(await count(), 2);
    record("same-day-retry-inserts-missing-course-only");
    const sameDay = await Promise.all([run(now), run(now)]);
    assert(sameDay.every(item => item.passed)); assert.notEqual(sameDay[0].pid, sameDay[1].pid);
    assert.equal(await count(), 2);
    record("two-independent-processes-same-day-no-duplicate", { processes: 2, sharedRedis: true });
    const nextDay = await Promise.all([run(now + 86400000, true), run(now + 86400000, true)]);
    assert(nextDay.every(item => item.passed && item.lostLease)); assert.notEqual(nextDay[0].pid, nextDay[1].pid);
    assert.equal(await count(), 4);
    record("next-day-two-processes-lost-lease-database-unique-backstop", { processes: 2, inserted: 2 });
    const notifications = await p.notification.findMany({ where: { targetId: { startsWith: prefix } }, orderBy: { idempotencyKey: "asc" } });
    assert(notifications.every(item => item.idempotencyKey === `${item.userId}:COURSE_EXPIRING:${item.targetId}:${new Date(item.createdAt.getTime()).toISOString().slice(0, 10)}` || item.idempotencyKey.endsWith(new Date(now + 86400000).toISOString().slice(0, 10))));
    assert(notifications.every(item => [prefix + "one", prefix + "two"].includes(item.targetId)));
    record("latest-renewal-refunded-expired-draft-and-permanent-excluded");
    assert(sameDay.concat(nextDay).every(item => item.externalCalls === 0));
    record("push-disabled-no-real-channel-called");
    const notification = notifications.find(item => item.userId === users[0]);
    const owner = await read("notification-recipient-allowed", users[0], "/notifications/" + notification.id, 200);
    assert.equal(owner.targetId, prefix + "one"); assert.equal(owner.targetType, "COURSE");
    await read("notification-cross-user-denied", users[1], "/notifications/" + notification.id, 404);
    await read("notification-anonymous-denied", null, "/notifications/" + notification.id, 401);
    assert.equal((await read("target-owner-access", users[0], "/courses/" + prefix + "one/access", 200)).hasAccess, true);
    assert.equal((await read("target-cross-user-no-access", users[1], "/courses/" + prefix + "one/access", 200)).hasAccess, false);
    const chapter = await read("target-chapter-owner", users[0], "/courses/chapters/" + prefix + "chapter/content", 200);
    assert(JSON.stringify(chapter).includes("ISOLATED-COURSE-PAID-CONTENT"));
    await read("target-chapter-cross-user-denied", users[1], "/courses/chapters/" + prefix + "chapter/content", 403);
    // 只改变临时库合成订单；既有通知不得变成退款后仍可访问课程的凭证。
    await p.order.update({ where: { id: prefix + "order-one" }, data: { status: "REFUNDED" } });
    assert.equal((await read("target-refunded-owner-no-access", users[0], "/courses/" + prefix + "one/access", 200)).hasAccess, false);
    await read("target-refunded-chapter-denied", users[0], "/courses/chapters/" + prefix + "chapter/content", 403);
    console.log("NODE_TEST_RESULT:" + JSON.stringify({ passed: true, scope: "compiled-scheduler-real-pg-redis-independent-processes-and-full-http-target-permissions", cases: rows,
      dayKeyBasis: "UTC-calendar-day", unchangedCronSchedule: true, noRealMoney: true, noExternalDelivery: true, syntheticRefundFixtureOnly: true, crashPushRetryNotCovered: true }));
  } finally {
    await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_course_notification_reject ON "Notification"').catch(() => {});
    await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_course_notification_reject()').catch(() => {});
    await r.onModuleDestroy(); await p.$disconnect();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
