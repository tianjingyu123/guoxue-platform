// 仅在封闭镜像临时 PG/Redis 中调用正式编译任务和 HTTP 入口，不接通媒体或真实渠道。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const { RedisService } = require('/app/apps/server/dist/redis/redis.service');
const p = new PrismaClient();
const r = new RedisService();
const prefix = 'linux-live-booking-';
const rows = [];
const record = (name, detail = {}) => rows.push({ name, passed: true, ...detail });
const worker = `
const {createRequire}=require('node:module');
const {PrismaClient}=createRequire('/app/apps/server/package.json')('@prisma/client');
const {RedisService}=require('/app/apps/server/dist/redis/redis.service');
const {NotificationService}=require('/app/apps/server/dist/modules/notification/notification.service');
const {LiveService}=require('/app/apps/server/dist/modules/live/live.service');
const p=new PrismaClient();const r=new RedisService();let externalCalls=0;
const push=new Proxy({}, {get:()=>async()=>{externalCalls++;throw Error('外部通知渠道禁止调用')}});
(async()=>{try {
 await r.pingShared();
 if(process.env.LIVE_BOOKING_LOST_LEASE==='1')r.runExclusive=async(_n,_t,fn)=>fn();
 const oldNow=Date.now;Date.now=()=>Number(process.env.LIVE_BOOKING_NOW);
 try {
  const svc=new LiveService(p,r,null,null,null,null,undefined,undefined,new NotificationService(p,r,push,{}));
  await svc[process.env.LIVE_BOOKING_METHOD]();
 }finally{Date.now=oldNow;}
 if(externalCalls)throw Error('不得调用外部通知渠道');
 console.log('NODE_TEST_RESULT:'+JSON.stringify({passed:true,pid:process.pid,externalCalls,lostLease:process.env.LIVE_BOOKING_LOST_LEASE==='1'}));
}finally{await r.onModuleDestroy();await p.$disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1});`;
const run = (method, now, lostLease = false) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['-e', worker], { env: { ...process.env,
    LIVE_BOOKING_METHOD: method, LIVE_BOOKING_NOW: String(now), LIVE_BOOKING_LOST_LEASE: lostLease ? '1' : '0',
  } });
  let output = '', errors = '';
  const timer = setTimeout(() => { child.kill(); reject(Error('直播预约任务子进程超时')); }, 30000);
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { errors += data; });
  child.on('error', error => { clearTimeout(timer); reject(error); });
  child.on('close', code => {
    clearTimeout(timer);
    if (code !== 0) return reject(Error(errors || '直播预约任务失败'));
    try { resolve(JSON.parse(output.split('\n').findLast(line => line.startsWith('NODE_TEST_RESULT:')).slice(17))); }
    catch (error) { reject(error); }
  });
});
async function request(name, user, route, expected, method = 'GET') {
  const token = user ? req('jsonwebtoken').sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' }) : null;
  const response = await fetch('http://127.0.0.1:3000/api/v1' + route, {
    method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: '{}' } : {}), signal: AbortSignal.timeout(10000),
  });
  const body = await response.json(); assert.equal(response.status, expected, name);
  record(name, { status: response.status }); return body.data ?? body;
}
const noticeCount = (room, event) => p.notification.count({ where: { targetId: prefix + room, type: event } });
(async () => {
  assert.match(process.env.RELEASE_ID, /^isolated-/);
  assert.match(process.env.DATABASE_URL, /@rebu-db-[a-f0-9]+:5432\/guoxue$/);
  // 固定远期窗口：应用的真实分钟任务不会抢先处理开播前提醒。
  const now = Date.parse('2045-01-01T08:00:00Z');
  const a = 'linux-user-a', b = 'linux-user-b';
  await r.pingShared();
  for (const user of [a, b]) await r.setJson('notification:prefs:' + user, { PUSH_ENABLED: false }, 600);
  for (const [name, minutes, status] of [['one', 5, 'WAITING'], ['two', 6, 'WAITING'], ['outside', 18, 'WAITING'], ['overdue', -1, 'WAITING'], ['ended', 7, 'ENDED']]) {
    await p.liveRoom.create({ data: { id: prefix + name, userId: 'linux-super', hostUserId: 'linux-super',
      title: '隔离合成直播', visibility: 'PLATFORM', auditStatus: 'APPROVED', status, startTime: new Date(now + minutes * 60000) } });
  }
  const bookingRoute = name => '/live/rooms/' + prefix + name + '/book';
  await request('anonymous-booking-denied', null, bookingRoute('one'), 401, 'POST');
  for (const name of ['one', 'two']) {
    await request('real-http-booking-' + name, a, bookingRoute(name), 201, 'POST');
  }
  await request('real-http-booking-cancel-fixture', b, bookingRoute('two'), 201, 'POST');
  await request('real-http-cancel-own-booking', b, bookingRoute('two'), 200, 'DELETE');
  for (const name of ['outside', 'overdue', 'ended']) await p.liveBooking.create({ data: { roomId: prefix + name, userId: a } });

  // 真实通知 INSERT 失败：第一场保留待提醒状态，第二场必须继续。
  await p.$executeRawUnsafe(`CREATE FUNCTION isolated_live_notice_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = '${prefix}one' THEN RAISE EXCEPTION 'isolated live notice failure'; END IF; RETURN NEW; END $$`);
  await p.$executeRawUnsafe('CREATE TRIGGER isolated_live_notice_reject BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION isolated_live_notice_reject()');
  assert((await run('remindUpcomingBookings', now)).passed);
  assert.equal(await noticeCount('one', 'LIVE_REMINDER'), 0); assert.equal(await noticeCount('two', 'LIVE_REMINDER'), 1);
  assert.equal((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'one', userId: a } } })).remindedAt, null);
  assert((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'two', userId: a } } })).remindedAt);
  assert.equal(await r.get('cron:lock:live-booking-reminder'), null);
  record('real-reminder-notification-write-failure-continues-next-room-with-failed-marker-null');
  await p.$executeRawUnsafe('DROP TRIGGER isolated_live_notice_reject ON "Notification"');
  await p.$executeRawUnsafe('DROP FUNCTION isolated_live_notice_reject()');
  const retry = await Promise.all([run('remindUpcomingBookings', now), run('remindUpcomingBookings', now)]);
  assert(retry.every(item => item.passed && item.externalCalls === 0)); assert.notEqual(retry[0].pid, retry[1].pid);
  assert.equal(await noticeCount('one', 'LIVE_REMINDER'), 1); assert.equal(await noticeCount('two', 'LIVE_REMINDER'), 1);
  record('real-redis-two-process-reminder-retry-inserts-only-missing-notice', { processes: 2 });

  // 通知已落库而预约 UPDATE 失败：不能影响下一场，重投依赖原数据库唯一键。
  await p.liveBooking.updateMany({ where: { roomId: { in: [prefix + 'one', prefix + 'two'] }, status: 'BOOKED' }, data: { remindedAt: null } });
  await p.$executeRawUnsafe(`CREATE FUNCTION isolated_live_marker_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."roomId" = '${prefix}one' AND NEW."remindedAt" IS NOT NULL THEN RAISE EXCEPTION 'isolated live marker failure'; END IF; RETURN NEW; END $$`);
  await p.$executeRawUnsafe('CREATE TRIGGER isolated_live_marker_reject BEFORE UPDATE ON "LiveBooking" FOR EACH ROW EXECUTE FUNCTION isolated_live_marker_reject()');
  assert((await run('remindUpcomingBookings', now)).passed);
  assert.equal((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'one', userId: a } } })).remindedAt, null);
  assert((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'two', userId: a } } })).remindedAt);
  record('real-reminder-marker-failure-continues-next-room');
  await p.$executeRawUnsafe('DROP TRIGGER isolated_live_marker_reject ON "LiveBooking"');
  await p.$executeRawUnsafe('DROP FUNCTION isolated_live_marker_reject()');
  const lostLease = await Promise.all([run('remindUpcomingBookings', now, true), run('remindUpcomingBookings', now, true)]);
  assert(lostLease.every(item => item.passed && item.lostLease && item.externalCalls === 0)); assert.notEqual(lostLease[0].pid, lostLease[1].pid);
  assert.equal(await noticeCount('one', 'LIVE_REMINDER'), 1); assert.equal(await noticeCount('two', 'LIVE_REMINDER'), 1);
  assert((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'one', userId: a } } })).remindedAt);
  record('marker-retry-after-lost-lease-database-unique-prevents-duplicate', { processes: 2, lostLeaseSimulated: true });
  assert.equal(await p.notification.count({ where: { targetId: { in: ['outside', 'overdue', 'ended'].map(name => prefix + name) } } }), 0);
  assert.equal(await p.notification.count({ where: { targetId: prefix + 'two', userId: b } }), 0);
  record('cancelled-booking-ended-outside-window-and-overdue-not-reminded');

  // 同样的真实失败路径核对开播补偿。仅修改临时房间状态，不连接推流或真实直播间。
  await p.$executeRawUnsafe(`CREATE FUNCTION isolated_live_notice_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."targetId" = '${prefix}one' AND NEW."type" = 'LIVE_STARTED' THEN RAISE EXCEPTION 'isolated live started notice failure'; END IF; RETURN NEW; END $$`);
  await p.$executeRawUnsafe('CREATE TRIGGER isolated_live_notice_reject BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION isolated_live_notice_reject()');
  await p.liveRoom.updateMany({ where: { id: { in: [prefix + 'one', prefix + 'two'] } }, data: { status: 'LIVING' } });
  assert((await run('reconcileStartedBookingNotifications', now)).passed);
  assert.equal(await noticeCount('one', 'LIVE_STARTED'), 0); assert.equal(await noticeCount('two', 'LIVE_STARTED'), 1);
  assert.equal((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'one', userId: a } } })).notifiedAt, null);
  record('real-started-notification-write-failure-continues-next-room');
  await p.$executeRawUnsafe('DROP TRIGGER isolated_live_notice_reject ON "Notification"');
  await p.$executeRawUnsafe('DROP FUNCTION isolated_live_notice_reject()');
  const startedRetry = await Promise.all([run('reconcileStartedBookingNotifications', now), run('reconcileStartedBookingNotifications', now)]);
  assert(startedRetry.every(item => item.passed && item.externalCalls === 0)); assert.notEqual(startedRetry[0].pid, startedRetry[1].pid);
  assert.equal(await noticeCount('one', 'LIVE_STARTED'), 1); assert.equal(await noticeCount('two', 'LIVE_STARTED'), 1);
  record('real-two-process-started-retry-no-duplicate', { processes: 2 });
  await p.liveBooking.updateMany({ where: { roomId: { in: [prefix + 'one', prefix + 'two'] }, status: 'BOOKED' }, data: { notifiedAt: null } });
  await p.$executeRawUnsafe(`CREATE FUNCTION isolated_live_marker_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."roomId" = '${prefix}one' AND NEW."notifiedAt" IS NOT NULL THEN RAISE EXCEPTION 'isolated started marker failure'; END IF; RETURN NEW; END $$`);
  await p.$executeRawUnsafe('CREATE TRIGGER isolated_live_marker_reject BEFORE UPDATE ON "LiveBooking" FOR EACH ROW EXECUTE FUNCTION isolated_live_marker_reject()');
  assert((await run('reconcileStartedBookingNotifications', now)).passed);
  assert.equal((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'one', userId: a } } })).notifiedAt, null);
  assert((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'two', userId: a } } })).notifiedAt);
  record('real-started-marker-failure-continues-next-room');
  await p.$executeRawUnsafe('DROP TRIGGER isolated_live_marker_reject ON "LiveBooking"');
  await p.$executeRawUnsafe('DROP FUNCTION isolated_live_marker_reject()');
  assert((await run('reconcileStartedBookingNotifications', now)).passed);
  assert((await p.liveBooking.findUnique({ where: { roomId_userId: { roomId: prefix + 'one', userId: a } } })).notifiedAt);
  assert.equal(await noticeCount('one', 'LIVE_STARTED'), 1); assert.equal(await noticeCount('two', 'LIVE_STARTED'), 1);
  assert.equal(await p.notification.count({ where: { targetId: prefix + 'two', userId: b } }), 0);
  record('started-marker-retry-preserves-event-key-and-cancelled-user-exclusion');
  const notices = await p.notification.findMany({ where: { targetId: { in: [prefix + 'one', prefix + 'two'] } } });
  assert.equal(notices.length, 4);
  assert(notices.every(n => n.idempotencyKey === `${n.userId}:${n.type}:${n.targetId}` && n.targetType === 'LIVE_ROOM'));
  record('four-persisted-notices-have-original-user-event-room-unique-keys');
  const notice = notices.find(n => n.targetId === prefix + 'one');
  await request('notification-recipient-detail', a, '/notifications/' + notice.id, 200);
  await request('notification-cross-user-detail-denied', b, '/notifications/' + notice.id, 404);
  await request('notification-anonymous-detail-denied', null, '/notifications/' + notice.id, 401);
  await request('notification-public-live-target-access', a, '/live/rooms/' + notice.targetId, 200);
  await p.liveRoom.update({ where: { id: notice.targetId }, data: { visibility: 'SELF_ONLY' } });
  await request('old-notification-does-not-grant-hidden-live-room-access', a, '/live/rooms/' + notice.targetId, 404);
  console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, scope: 'compiled-live-schedulers-real-pg-redis-two-processes-booking-http-and-target-permissions', cases: rows,
    realPushes: 0, realStreams: 0, noRealMoney: true, unchangedCronAndEventKeys: true,
    schedulerCalledDirectlyNotRealCronTiming: true, lostLeaseSimulated: true, cancellationAfterSelectionRaceNotCovered: true,
    schedulerConstructedWithRealPrismaRedisNotifications: true, schedulerFullNestDiNotCovered: true, mediaAndMatchingNativeBaseNotCovered: true }));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_live_notice_reject ON "Notification"').catch(() => {});
  await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_live_notice_reject()').catch(() => {});
  await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_live_marker_reject ON "LiveBooking"').catch(() => {});
  await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_live_marker_reject()').catch(() => {});
  await r.onModuleDestroy(); await p.$disconnect();
});
