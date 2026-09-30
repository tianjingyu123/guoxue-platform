// 仅使用封闭网络中的两个候选应用进程、合成账号和现有锁文件 SDK。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const jwt = req('jsonwebtoken');
const entries = fs.readdirSync('/app/node_modules/.pnpm').filter(name => /^socket\.io-client@4\./.test(name));
assert.equal(entries.length, 1, '镜像锁定客户端 SDK 必须唯一');
const { io } = require('/app/node_modules/.pnpm/' + entries[0] + '/node_modules/socket.io-client');
const primary = 'http://127.0.0.1:3000';
const secondary = process.env.ISOLATED_SECOND_APP;
assert(/^http:\/\/rebu-app-second-[a-f0-9]+:3000$/.test(secondary || ''), '只允许隔离应用地址');
const p = new PrismaClient();
const sockets = [], cases = []; let httpRequests = 0;
const a = 'linux-ws-a', b = 'linux-ws-b', c = 'linux-ws-c', failed = 'linux-ws-insert-fail', blocked = 'linux-ws-blocked';
const token = (user, expiresIn = '5m') => jwt.sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function socket(base, value) {
  const s = io(base + '/ws', { auth: value ? { token: value } : {}, transports: ['websocket'], forceNew: true, autoConnect: false, reconnection: false, timeout: 5000 });
  s.received = [];
  s.on('im:fallback_message', message => s.received.push(message));
  sockets.push(s); return s;
}
function event(s, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('隔离事件超时：' + name)); }, 5000);
    const done = value => { cleanup(); resolve(value); };
    const failed = () => { cleanup(); reject(new Error('隔离连接失败：' + name)); };
    const cleanup = () => { clearTimeout(timer); s.off(name, done); s.off('connect_error', failed); };
    s.once(name, done); s.once('connect_error', failed);
  });
}
async function ready(s, user) {
  const welcome = event(s, 'welcome'); s.connect();
  assert.equal((await welcome).userId, user);
}
async function denied(name, value) {
  const s = socket(primary, value); const rejected = event(s, 'auth_error'); s.connect();
  await rejected; await pause(80);
  assert.equal(s.connected, false); assert.equal(s.received.length, 0);
  s.disconnect(); cases.push({ name, passed: true });
}
async function request(base, user, path, method = 'GET', body) {
  httpRequests++;
  const response = await fetch(base + '/api/v1/im/' + path, {
    method, headers: { Authorization: 'Bearer ' + token(user), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
  });
  const result = await response.json(); return { status: response.status, data: result.data ?? result };
}
const send = (base, from, to, text) => request(base, from, 'fallback/c2c/send', 'POST', { toUserId: to, text });
async function delivered(s, count) {
  for (let i = 0; i < 100 && s.received.length < count; i++) await pause(30);
  await pause(100); assert.equal(s.received.length, count);
}
(async () => {
  try {
    assert(!process.env.IM_SECRET_KEY && !process.env.TRTC_SECRET_KEY);
    for (const id of [a, b, c, failed, blocked]) await p.user.create({ data: { id, nickname: '隔离消息投递账号', ...(id === blocked ? { status: 'BANNED' } : {}) } });
    await p.imPolicyConfig.update({ where: { id: 'default' }, data: { allowStrangerDM: true, followerDMQuota: 1 } });
    await denied('socket-anonymous-rejected', null);
    await denied('socket-expired-token-rejected', token(a, -60));
    await denied('socket-banned-user-rejected', token(blocked));
    const sender = socket(primary, token(a)), recipient = socket(secondary, token(b)), unrelated = socket(secondary, token(c));
    await ready(sender, a); await ready(recipient, b); await ready(unrelated, c);
    cases.push({ name: 'two-app-processes-three-real-socket-connections', passed: true });
    const race = await Promise.all([send(primary, a, b, '隔离跨进程并发一'), send(secondary, a, b, '隔离跨进程并发二')]);
    assert.deepEqual(race.map(row => row.status).sort(), [201, 403]);
    const saved = race.find(row => row.status === 201).data;
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: a, toUserId: b } }), 1);
    cases.push({ name: 'two-app-processes-last-quota-one-commit', statuses: race.map(row => row.status), passed: true });
    await delivered(sender, 1); await delivered(recipient, 1);
    assert.equal(sender.received[0].id, saved.id); assert.equal(recipient.received[0].id, saved.id);
    assert.equal(recipient.received[0].fromUserId, a); assert.equal(recipient.received[0].toUserId, b);
    assert.equal(unrelated.received.length, 0);
    cases.push({ name: 'committed-message-delivered-once-to-both-users-not-third', passed: true });
    const reply = await send(secondary, b, a, '隔离另一进程回复'); assert.equal(reply.status, 201);
    await delivered(sender, 2); await delivered(recipient, 2);
    assert.equal(sender.received[1].id, reply.data.id); assert.equal(recipient.received[1].id, reply.data.id);
    assert.equal((await p.imC2CCounter.findUnique({ where: { fromUserId_toUserId: { fromUserId: a, toUserId: b } } })).sentCount, 0);
    cases.push({ name: 'cross-process-reply-delivery-and-quota-reset', passed: true });
    await p.$executeRawUnsafe(`CREATE FUNCTION isolated_ws_insert_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."fromUserId" = 'linux-ws-insert-fail' THEN RAISE EXCEPTION 'isolated socket insert failure'; END IF; RETURN NEW; END $$`);
    await p.$executeRawUnsafe('CREATE TRIGGER isolated_ws_insert_fail BEFORE INSERT ON "ImFallbackMessage" FOR EACH ROW EXECUTE FUNCTION isolated_ws_insert_fail()');
    const rejected = await send(primary, failed, b, '隔离事务应回滚'); assert.equal(rejected.status, 500);
    await pause(200); assert.equal(recipient.received.length, 2); assert.equal(unrelated.received.length, 0);
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: failed } }), 0);
    assert.equal(await p.imC2CCounter.count({ where: { fromUserId: failed } }), 0);
    cases.push({ name: 'database-insert-failure-no-message-event-and-no-quota', passed: true });
    await p.$executeRawUnsafe('DROP TRIGGER isolated_ws_insert_fail ON "ImFallbackMessage"');
    await p.$executeRawUnsafe('DROP FUNCTION isolated_ws_insert_fail()');
    const retry = await send(secondary, failed, b, '隔离故障解除重试'); assert.equal(retry.status, 201);
    await delivered(recipient, 3); assert.equal(recipient.received[2].id, retry.data.id);
    cases.push({ name: 'rollback-retry-commits-and-delivers-once', passed: true });
    recipient.disconnect(); await pause(100);
    const offline = await send(primary, a, b, '隔离接收端暂离线'); assert.equal(offline.status, 201);
    await delivered(sender, 3); assert.equal(sender.received[2].id, offline.data.id);
    cases.push({ name: 'offline-recipient-does-not-block-commit', passed: true });
    const reconnected = socket(secondary, token(b)); await ready(reconnected, b);
    const history = await request(secondary, b, 'fallback/c2c/history?toUserId=' + a);
    assert.equal(history.status, 200); assert.equal(history.data.messages.length, 3);
    assert(history.data.messages.some(row => row.id === offline.data.id)); assert.equal(reconnected.received.length, 0);
    cases.push({ name: 'reconnect-history-recovers-offline-message-without-fake-event-replay', passed: true });
    const thirdHistory = await request(primary, c, 'fallback/c2c/history?toUserId=' + b);
    assert.equal(thirdHistory.status, 200); assert.equal(thirdHistory.data.messages.length, 0); assert.equal(unrelated.received.length, 0);
    cases.push({ name: 'third-user-has-neither-events-nor-history', passed: true });
    console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, cases, httpRequests, socketClientVersion: entries[0], appProcesses: 2, realSocketConnections: true, sharedRedisAdapter: true, realMessages: 0, scope: 'isolated-two-app-processes-synthetic-socket-http-no-tencent-no-production', productionNodesNotCovered: true }));
  } finally {
    for (const s of sockets) s.disconnect();
    await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_ws_insert_fail ON "ImFallbackMessage"').catch(() => {});
    await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_ws_insert_fail()').catch(() => {});
    await p.$disconnect();
  }
})().catch(error => { console.error('隔离跨进程消息验证失败：' + error.message); process.exitCode = 1; });
