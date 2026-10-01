// 验证脚本只进入临时隔离容器，不属于业务发布包，不调用真实渠道。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const p = new PrismaClient();
const { RedisService } = require('/app/apps/server/dist/redis/redis.service');
const { NotificationService } = require('/app/apps/server/dist/modules/notification/notification.service');
const r = new RedisService();
const prefix = 'linux-free-course-';
const rows = [];
const record = (name, detail = {}) => rows.push({ name, passed: true, ...detail });
const wait = async (predicate) => {
  const deadline = Date.now() + 8000;
  while (!(await predicate())) {
    assert(Date.now() < deadline, '隔离异步通知等待超时');
    await new Promise(resolve => setTimeout(resolve, 30));
  }
};
async function request(name, user, route, expected, method = 'GET') {
  const token = user ? req('jsonwebtoken').sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' }) : null;
  const response = await fetch('http://127.0.0.1:3000/api/v1' + route, {
    method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: '{}' } : {}), signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  assert.equal(response.status, expected, name);
  record(name, { status: response.status });
  return body.data ?? body;
}
(async () => {
  assert.match(process.env.RELEASE_ID, /^isolated-/);
  assert.match(process.env.DATABASE_URL, /@rebu-db-[a-f0-9]+:5432\/guoxue$/);
  const a = 'linux-user-a', b = 'linux-user-b';
  await r.pingShared();
  await r.setJson('notification:prefs:' + a, { PUSH_ENABLED: false }, 300);
  for (const name of ['success', 'notice-fail', 'order-fail', 'notice-hold', 'paid-pending']) {
    await p.course.create({ data: { id: prefix + name, userId: 'linux-super', title: '隔离订阅课程',
      price: name === 'paid-pending' ? 8 : 0, validityDays: 0, visibility: 'PLATFORM', auditStatus: 'APPROVED' } });
  }
  const route = name => '/courses/' + prefix + name + '/purchase';
  await request('anonymous-subscribe-denied', null, route('success'), 401, 'POST');
  const order = await request('free-subscription-http-committed', a, route('success'), 201, 'POST');
  assert.equal(order.status, 'PAID'); assert.equal(order.payMethod, 'FREE');
  const stored = await p.order.findUnique({ where: { id: order.id } });
  assert.equal(stored.userId, a); assert(stored.paidAt); assert.equal(Number(stored.amount), 0);
  await wait(async () => await p.notification.count({ where: { userId: a, targetId: prefix + 'success' } }) === 1);
  const notice = await p.notification.findFirst({ where: { userId: a, targetId: prefix + 'success' } });
  assert.equal(notice.idempotencyKey, `${a}:COURSE_ENROLLED:${order.id}`);
  assert.equal(notice.type, 'COURSE'); assert.equal(notice.targetType, 'COURSE');
  assert.equal(notice.title, '课程订阅成功');
  record('real-di-notification-after-committed-free-order');
  await request('duplicate-subscribe-rejected', a, route('success'), 400, 'POST');
  assert.equal(await p.order.count({ where: { userId: a, targetId: prefix + 'success' } }), 1);
  assert.equal(await p.notification.count({ where: { targetId: prefix + 'success' } }), 1);
  record('duplicate-subscription-no-extra-order-or-notification');
  await request('notification-owner-details', a, '/notifications/' + notice.id, 200);
  await request('notification-cross-user-details-denied', b, '/notifications/' + notice.id, 404);
  await request('notification-anonymous-details-denied', null, '/notifications/' + notice.id, 401);
  assert.equal((await request('free-course-target-access', a, '/courses/' + prefix + 'success' + '/access', 200)).hasAccess, true);

  await p.$executeRawUnsafe(`CREATE FUNCTION isolated_free_order_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = '${prefix}order-fail' THEN RAISE EXCEPTION 'isolated free order failure'; END IF; RETURN NEW; END $$`);
  await p.$executeRawUnsafe('CREATE TRIGGER isolated_free_order_reject BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION isolated_free_order_reject()');
  await request('order-write-failure-http', a, route('order-fail'), 500, 'POST');
  assert.equal(await p.order.count({ where: { targetId: prefix + 'order-fail' } }), 0);
  assert.equal(await p.notification.count({ where: { targetId: prefix + 'order-fail' } }), 0);
  assert.equal(await r.get(`purchase:lock:${a}:${prefix}order-fail`), null);
  record('real-order-failure-no-success-notification-and-lock-released');
  await p.$executeRawUnsafe('DROP TRIGGER isolated_free_order_reject ON "Order"');
  await p.$executeRawUnsafe('DROP FUNCTION isolated_free_order_reject()');

  await p.$executeRawUnsafe('CREATE SEQUENCE isolated_free_notice_attempt');
  await p.$executeRawUnsafe(`CREATE FUNCTION isolated_free_notice_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = '${prefix}notice-fail' THEN PERFORM nextval('isolated_free_notice_attempt'); RAISE EXCEPTION 'isolated free notice failure'; END IF; RETURN NEW; END $$`);
  await p.$executeRawUnsafe('CREATE TRIGGER isolated_free_notice_reject BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION isolated_free_notice_reject()');
  const failedNoticeOrder = await request('notification-write-failure-subscription-still-success', a, route('notice-fail'), 201, 'POST');
  await wait(async () => (await p.$queryRawUnsafe('SELECT is_called FROM isolated_free_notice_attempt'))[0].is_called);
  await wait(async () => await r.get(`notification:sent:${a}:COURSE_ENROLLED:${failedNoticeOrder.id}`) === null);
  assert.equal(await p.order.count({ where: { id: failedNoticeOrder.id, status: 'PAID' } }), 1);
  assert.equal(await p.notification.count({ where: { targetId: prefix + 'notice-fail' } }), 0);
  record('real-notification-failure-keeps-free-order-and-releases-idempotency-lock');
  await p.$executeRawUnsafe('DROP TRIGGER isolated_free_notice_reject ON "Notification"');
  await p.$executeRawUnsafe('DROP FUNCTION isolated_free_notice_reject()');
  await p.$executeRawUnsafe('DROP SEQUENCE isolated_free_notice_attempt');

  // 真正阻塞通知数据库写入，验证请求已成功返回并且订单提交，随后释放。
  await p.$executeRawUnsafe(`CREATE FUNCTION isolated_free_notice_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = '${prefix}notice-hold' THEN PERFORM pg_advisory_xact_lock(774801); END IF; RETURN NEW; END $$`);
  await p.$executeRawUnsafe('CREATE TRIGGER isolated_free_notice_hold BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION isolated_free_notice_hold()');
  let release; let held;
  const releaseSignal = new Promise(resolve => { release = resolve; });
  const heldSignal = new Promise(resolve => { held = resolve; });
  const lock = p.$transaction(async tx => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(774801)'); held(); await releaseSignal;
  }, { timeout: 15000 });
  let heldOrder;
  try {
    await heldSignal;
    heldOrder = await request('notification-database-block-does-not-block-subscribe-http', a, route('notice-hold'), 201, 'POST');
    await wait(async () => (await p.$queryRawUnsafe("SELECT count(*)::int AS n FROM pg_locks WHERE locktype='advisory' AND objid=774801 AND NOT granted"))[0].n === 1);
    assert.equal(await p.order.count({ where: { id: heldOrder.id, status: 'PAID' } }), 1);
    assert.equal(await p.notification.count({ where: { targetId: prefix + 'notice-hold' } }), 0);
    record('http-returned-before-real-notification-db-lock-release');
  } finally { release(); await lock; }
  await wait(async () => await p.notification.count({ where: { targetId: prefix + 'notice-hold' } }) === 1);
  record('delayed-notification-persisted-after-lock-release');
  await p.$executeRawUnsafe('DROP TRIGGER isolated_free_notice_hold ON "Notification"');
  await p.$executeRawUnsafe('DROP FUNCTION isolated_free_notice_hold()');
  const paidPending = await request('paid-pending-order-only', a, route('paid-pending'), 201, 'POST');
  assert.equal(paidPending.status, 'PENDING');
  assert.equal(await p.notification.count({ where: { targetId: prefix + 'paid-pending' } }), 0);
  record('paid-pending-no-enrollment-success-notification');
  let externalCalls = 0;
  const push = new Proxy({}, { get: () => async () => { externalCalls++; throw new Error('禁止真实推送'); } });
  const service = new NotificationService(p, r, push, {});
  await r.del(`notification:sent:${a}:COURSE_ENROLLED:${order.id}`);
  await Promise.all([1, 2].map(() => service.sendOnce(a, `COURSE_ENROLLED:${order.id}`, {
    type: 'COURSE', title: '课程订阅成功', content: '课程已加入我的课程，可查看并开始学习。', targetType: 'COURSE', targetId: prefix + 'success',
  })));
  assert.equal(await p.notification.count({ where: { idempotencyKey: `${a}:COURSE_ENROLLED:${order.id}` } }), 1);
  assert.equal(externalCalls, 0);
  record('same-event-replay-after-redis-key-loss-database-deduplicates');
  console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, cases: rows, scope: 'full-http-real-di-postcommit-pg-failure-and-lock-redis-permissions',
    noRealMoney: true, noExternalDelivery: true, crashDurableRetryNotImplemented: true, paidCourseSeparateEnrollmentNotAdded: true }));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  for (const [table, name] of [['Order', 'isolated_free_order_reject'], ['Notification', 'isolated_free_notice_reject'], ['Notification', 'isolated_free_notice_hold']]) {
    await p.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON "${table}"`).catch(() => {});
    await p.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${name}()`).catch(() => {});
  }
  await p.$executeRawUnsafe('DROP SEQUENCE IF EXISTS isolated_free_notice_attempt').catch(() => {});
  await r.onModuleDestroy(); await p.$disconnect();
});
