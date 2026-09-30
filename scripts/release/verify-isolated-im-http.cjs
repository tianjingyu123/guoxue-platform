// 真实 HTTP/JWT/事务入口，仅使用临时空库中的合成账号；无腾讯 IM 凭据和真实消息投递。
const { createRequire } = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const jwt = req('jsonwebtoken');
const assert = require('node:assert/strict');
const p = new PrismaClient();
const cases = []; let httpRequests = 0;
const a = 'linux-im-a', b = 'linux-im-b', c = 'linux-im-c', failUser = 'linux-im-rollback';
const duplexA = 'linux-im-duplex-a', duplexB = 'linux-im-duplex-b';
async function request(user, path, method = 'GET', body) {
  httpRequests++;
  const response = await fetch('http://127.0.0.1:3000/api/v1/im/' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + jwt.sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' }) } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json();
  return { status: response.status, data: payload.data ?? payload };
}
async function send(name, user, path, status, method, body) {
  const result = await request(user, path, method, body);
  assert.equal(result.status, status, name);
  cases.push({ name, status, passed: true });
  return result.data;
}
const sendText = (name, from, to, status, text = '仅用于封闭环境的合成私信') => send(name, from, 'fallback/c2c/send', status, 'POST', { toUserId: to, text });
const counter = (from, to) => p.imC2CCounter.findUnique({ where: { fromUserId_toUserId: { fromUserId: from, toUserId: to } } });
const preference = (user, peer) => p.imFallbackConversationPreference.findUnique({ where: { userId_peerUserId: { userId: user, peerUserId: peer } } });
(async () => {
  try {
    assert(!process.env.IM_SECRET_KEY && !process.env.TRTC_SECRET_KEY, '不得携带真实 IM/通话凭据');
    for (const id of [a, b, c, failUser, duplexA, duplexB]) await p.user.create({ data: { id, nickname: '隔离私信测试账号' } });
    await p.imPolicyConfig.upsert({ where: { id: 'default' }, create: { id: 'default', allowStrangerDM: false, followerDMQuota: 1 }, update: { allowStrangerDM: false, followerDMQuota: 1 } });
    await send('im-capabilities-anonymous-denied', null, 'capabilities', 401);
    const caps = await send('im-fallback-capabilities', a, 'capabilities', 200);
    assert.equal(caps.mode, 'FALLBACK'); assert.equal(caps.c2c, true);
    assert.equal(caps.groups, false); assert.equal(caps.friends, false); assert.equal(caps.calls, false);
    await send('im-history-anonymous-denied', null, 'fallback/c2c/history?toUserId=' + b, 401);
    await sendText('im-self-send-denied', a, a, 403);
    await sendText('im-stranger-policy-denied', a, b, 403);
    assert.equal(await p.imFallbackMessage.count(), 0); assert.equal(await counter(a, b), null);
    await p.imPolicyConfig.update({ where: { id: 'default' }, data: { allowStrangerDM: true } });
    // 两个并发 HTTP 请求走同一真实入口，数据库条件更新只允许占用最后一次额度。
    const concurrent = await Promise.all([request(a, 'fallback/c2c/send', 'POST', { toUserId: b, text: '合成并发一' }), request(a, 'fallback/c2c/send', 'POST', { toUserId: b, text: '合成并发二' })]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [201, 403]);
    assert.equal((await counter(a, b)).sentCount, 1);
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: a, toUserId: b } }), 1);
    cases.push({ name: 'im-last-quota-two-http-requests-one-message', statuses: concurrent.map(r => r.status), passed: true });
    const thirdHistory = await send('im-third-user-cannot-read-pair', c, 'fallback/c2c/history?toUserId=' + b, 200);
    assert.equal(thirdHistory.messages.length, 0);
    const history = await send('im-recipient-history', b, 'fallback/c2c/history?toUserId=' + a, 200);
    assert.equal(history.messages.length, 1); assert.equal(history.messages[0].fromUserId, a); assert.equal(history.messages[0].toUserId, b);
    const unread = await send('im-recipient-unread', b, 'fallback/conversations', 200);
    assert.equal(unread.length, 1); assert.equal(unread[0].unreadCount, 1);
    await send('im-third-user-read-cannot-mark-recipient', c, 'fallback/c2c/read/' + a, 200, 'PUT');
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: a, toUserId: b, readAt: null } }), 1);
    await send('im-recipient-mark-read', b, 'fallback/c2c/read/' + a, 200, 'PUT');
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: a, toUserId: b, readAt: null } }), 0);
    const read = await send('im-recipient-unread-zero', b, 'fallback/conversations', 200);
    assert.equal(read[0].unreadCount, 0);
    await send('im-preference-mass-assignment-rejected-by-whitelist', a, 'fallback/conversations/' + b, 200, 'PUT', { isPinned: true, userId: b, peerUserId: c, hiddenBefore: '2099-01-01T00:00:00Z' });
    const own = await preference(a, b);
    assert.equal(own.isPinned, true); assert.equal(own.hiddenBefore, null); assert.equal(await preference(b, c), null);
    await send('im-preference-invalid-boolean', a, 'fallback/conversations/' + b, 400, 'PUT', { isPinned: 'false' });
    assert.equal((await preference(a, b)).isPinned, true);
    await send('im-preference-valid-mute', a, 'fallback/conversations/' + b, 200, 'PUT', { isMuted: true });
    assert.equal((await preference(a, b)).isMuted, true); assert.equal(await preference(b, a), null);
    await sendText('im-reply-resets-peer-quota', b, a, 201);
    assert.equal((await counter(a, b)).sentCount, 0);
    await sendText('im-send-again-after-reply', a, b, 201);
    const beforeClear = await send('im-recipient-all-three-messages', b, 'fallback/c2c/history?toUserId=' + a, 200);
    assert.equal(beforeClear.messages.length, 3);
    await send('im-clear-only-own-history', a, 'fallback/conversations/' + b, 200, 'DELETE');
    const ownAfterClear = await send('im-cleared-history-empty', a, 'fallback/c2c/history?toUserId=' + b, 200);
    assert.equal(ownAfterClear.messages.length, 0);
    const peerAfterClear = await send('im-peer-history-retained', b, 'fallback/c2c/history?toUserId=' + a, 200);
    assert.equal(peerAfterClear.messages.length, 3);
    await p.$executeRawUnsafe(`CREATE FUNCTION isolated_im_insert_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."fromUserId" = 'linux-im-rollback' THEN RAISE EXCEPTION 'isolated IM insert failure'; END IF; RETURN NEW; END $$`);
    await p.$executeRawUnsafe('CREATE TRIGGER isolated_im_insert_fail BEFORE INSERT ON "ImFallbackMessage" FOR EACH ROW EXECUTE FUNCTION isolated_im_insert_fail()');
    await sendText('im-insert-failure-rolls-back-quota', failUser, b, 500);
    assert.equal(await counter(failUser, b), null);
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: failUser } }), 0);
    await p.$executeRawUnsafe('DROP TRIGGER isolated_im_insert_fail ON "ImFallbackMessage"');
    await p.$executeRawUnsafe('DROP FUNCTION isolated_im_insert_fail()');
    await sendText('im-retry-after-insert-failure', failUser, b, 201);
    assert.equal((await counter(failUser, b)).sentCount, 1);
    await p.blacklist.create({ data: { userId: b, blockedUserId: c } });
    await sendText('im-either-side-blacklist-denied', c, b, 403);
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: c } }), 0);
    const thirdConversations = await send('im-third-user-conversations-isolated', c, 'fallback/conversations', 200);
    assert.equal(thirdConversations.length, 0);
    await p.follow.createMany({ data: [{ userId: duplexA, followedUserId: duplexB }, { userId: duplexB, followedUserId: duplexA }] });
    const duplex = await Promise.all([
      request(duplexA, 'fallback/c2c/send', 'POST', { toUserId: duplexB, text: '合成双向并发一' }),
      request(duplexB, 'fallback/c2c/send', 'POST', { toUserId: duplexA, text: '合成双向并发二' }),
    ]);
    assert.deepEqual(duplex.map(r => r.status), [201, 201]);
    assert.equal(await p.imFallbackMessage.count({ where: { fromUserId: { in: [duplexA, duplexB] }, toUserId: { in: [duplexA, duplexB] } } }), 2);
    assert.equal((await counter(duplexA, duplexB)).sentCount + (await counter(duplexB, duplexA)).sentCount, 1);
    cases.push({ name: 'im-opposite-direction-concurrency-no-deadlock', statuses: duplex.map(r => r.status), passed: true });
    console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, cases, httpRequests, scope: 'synthetic-http-real-jwt-postgresql-transactions-no-external-im', realMessages: 0, socketDeliveryNotCovered: true, twoApplicationProcessesNotCovered: true }));
  } finally {
    await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_im_insert_fail ON "ImFallbackMessage"').catch(() => {});
    await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_im_insert_fail()').catch(() => {});
    await p.$disconnect();
  }
})().catch(error => { console.error('隔离 IM HTTP 验证失败：' + error.message); process.exitCode = 1; });
