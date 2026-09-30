// 仅在封闭临时空库中运行；正式候选不包含本故障注入脚本。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { fork } = require('node:child_process');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const { CirclePostService } = require('/app/apps/server/dist/modules/circle/services/circle-post.service.js');
const { CircleSharedService } = require('/app/apps/server/dist/modules/circle/services/circle-shared.service.js');
const { CoinService } = require('/app/apps/server/dist/modules/coin/coin.service.js');
const { NotificationService } = require('/app/apps/server/dist/modules/notification/notification.service.js');
const { RedisService } = require('/app/apps/server/dist/redis/redis.service.js');
assert.match(process.env.REDIS_URL, /^redis:\/\/rebu-reward-redis-/);
assert.match(process.env.DATABASE_URL, /@rebu-reward-db-/);
const db = new PrismaClient();
const redis = new RedisService();
const checks = [], children = [], pending = [];
const payer = 'fixture-payer', author = 'fixture-author', circle = 'fixture-circle', post = 'fixture-post';
const wrap = (delegate, overrides) => new Proxy(delegate, { get(target, key) {
  if (key in overrides) return overrides[key];
  const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
} });
const notify = (prisma = db) => {
  const instance = new NotificationService(prisma, redis, {}, {});
  return wrap(instance, { sendOnce: (...args) => {
    const operation = instance.sendOnce(...args); pending.push(operation); return operation;
  } });
};
const svc = (prisma = db, notification = notify()) => new CirclePostService(prisma, {}, new CircleSharedService(prisma), undefined, new CoinService(prisma, redis), notification);
const reward = async (service = svc(), amount = 8, requestId = 'request-001', postId = post, userId = payer) => {
  const result = await service.rewardPost(circle, postId, userId, amount, undefined, requestId);
  // 正式请求不等待通知；只有验证程序等待异步落库后再核对事实。
  await Promise.allSettled(pending.splice(0)); return result;
};
const check = async (name, action) => { await action(); checks.push({ name, passed: true }); };
const prepareRedis = async () => {
  await redis.setJson(`notification:prefs:${author}`, { PUSH_ENABLED: false }, 3600);
  assert.equal(await redis.getClient().ping(), 'PONG', '本轮不能用内存Redis降级冒充真实并发');
};
const reset = async (balance = 100, absentAuthor = false) => {
  await db.notification.deleteMany(); await db.virtualCoinTransaction.deleteMany(); await db.virtualCoinAccount.deleteMany();
  await db.virtualCoinAccount.create({ data: { userId: payer, balance } });
  if (!absentAuthor) await db.virtualCoinAccount.create({ data: { userId: author } });
  await redis.getClient().flushdb(); await prepareRedis();
};
const balances = async () => Promise.all([payer, author].map(async userId => (await db.virtualCoinAccount.findUnique({ where: { userId } }))?.balance ?? null));
const debit = () => db.virtualCoinTransaction.findFirstOrThrow({ where: { userId: payer, scene: 'POST_REWARD' } });
const faultTransaction = action => wrap(db, { $transaction: (work, options) => db.$transaction(async tx => action(tx, work), options) });
const workers = async args => {
  const entries = args.map(arg => {
    const child = fork(__filename, ['--worker'], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: process.env }); children.push(child);
    const result = new Promise((resolve, reject) => {
      let delivered = false;
      const timer = setTimeout(() => { child.kill(); reject(new Error('隔离并发子进程超时')); }, 30000);
      child.on('message', message => {
        if (message.done) { delivered = true; clearTimeout(timer); resolve(message); }
      });
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('exit', code => { if (!delivered) { clearTimeout(timer); reject(new Error(`隔离子进程提前退出:${code}`)); } });
    });
    const ready = new Promise(resolve => child.on('message', message => { if (message.ready) resolve(); }));
    const locked = new Promise(resolve => child.on('message', message => { if (message.lockHeld) resolve(); }));
    return { child, arg, result, ready, locked };
  });
  await Promise.all(entries.map(entry => entry.ready));
  const holder = entries.find(entry => entry.arg.holdLock);
  let observedWait = false;
  if (holder) {
    holder.child.send(holder.arg);
    await holder.locked;
    for (const entry of entries) if (entry !== holder) entry.child.send(entry.arg);
    for (let attempt = 0; attempt < 100; attempt++) {
      const rows = await db.$queryRaw`SELECT count(*)::int AS count FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`;
      if (rows[0].count > 0) { observedWait = true; break; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    holder.child.send({ release: true });
  } else {
    for (const entry of entries) entry.child.send(entry.arg);
  }
  const results = await Promise.all(entries.map(entry => entry.result));
  if (holder) assert(observedWait, '必须观察到独立进程真实竞争PostgreSQL事务锁');
  for (const result of results) result.databaseLockWaitObserved = observedWait;
  assert.equal(new Set(results.map(result => result.pid)).size, args.length);
  return results;
};

const close = async () => { await redis.onModuleDestroy(); await db.$disconnect(); };
if (process.argv.includes('--worker')) {
  (async () => {
    await prepareRedis(); process.send({ ready: true, pid: process.pid });
    process.once('message', async arg => {
      let result;
      try {
        const prisma = arg.holdLock ? faultTransaction((tx, action) => action(wrap(tx, { $queryRaw: async (...query) => {
          const value = await tx.$queryRaw(...query);
          process.send({ lockHeld: true });
          await new Promise(resolve => process.once('message', message => { assert(message.release); resolve(); }));
          return value;
        } }))) : db;
        result = { ok: true, value: await reward(svc(prisma), arg.amount, arg.requestId) };
      }
      catch (error) { result = { ok: false, error: error.message }; }
      await close(); process.send({ done: true, pid: process.pid, ...result }, () => process.exit(0));
    });
  })().catch(async error => { await close(); console.error(error.message); process.exit(1); });
} else {
  (async () => {
    try {
      for (const id of ['fixture-owner', author, payer, 'fixture-outsider']) await db.user.create({ data: { id, nickname: '隔离合成用户' } });
      await db.circle.create({ data: { id: circle, name: '隔离合成圈子', intro: '非真实业务隔离验证', tags: [], ownerId: 'fixture-owner' } });
      await db.circleMember.create({ data: { circleId: circle, userId: payer } });
      for (const id of [post, 'fixture-another-post']) await db.post.create({ data: { id, circleId: circle, userId: author, title: '合成帖子', content: '非真实业务' } });
      await prepareRedis();

      await check('committed-reward-linked-ledgers-and-real-sendOnce', async () => {
        await reset(); assert.deepEqual(await reward(), { success: true, amount: 8 });
        assert.deepEqual(await balances(), [92, 4]);
        const source = await debit(); assert.equal(source.refId, post); assert.equal(source.description, '打赏帖子: 合成帖子');
        const credits = await db.virtualCoinTransaction.findMany({ where: { refId: source.id } });
        assert.equal(credits.length, 1); assert.equal(credits[0].userId, author); assert.equal(credits[0].amountCoin, 4);
        const notice = await db.notification.findFirstOrThrow(); assert.match(notice.content, /入账 4 币/);
        assert.equal(notice.category, 'TRADE'); assert.equal(notice.circleId, circle);
        assert.equal(notice.idempotencyKey, `${author}:POST_REWARD:${source.id}`);
        assert.equal(await redis.getClient().get(`notification:sent:${author}:POST_REWARD:${source.id}`), '1');
      });

      await check('credit-ledger-failure-rolls-back-payer-and-first-author-account', async () => {
        await reset(100, true);
        const prisma = faultTransaction((tx, action) => action(wrap(tx, { virtualCoinTransaction: wrap(tx.virtualCoinTransaction, {
          create: args => { if (args.data.userId === author) throw new Error('合成作者流水失败'); return tx.virtualCoinTransaction.create(args); },
        }) })));
        await assert.rejects(reward(svc(prisma)), /合成作者流水失败/);
        assert.deepEqual(await balances(), [100, null]);
        assert.equal(await db.virtualCoinTransaction.count(), 0); assert.equal(await db.notification.count(), 0);
        assert.equal((await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId: payer } })).totalSpent, 0);
      });

      await check('database-failure-before-commit-no-funds-or-success-notification', async () => {
        await reset();
        const prisma = faultTransaction(async (tx, action) => { await action(tx); await tx.$queryRaw`SELECT 1 / 0`; });
        await assert.rejects(reward(svc(prisma)));
        assert.deepEqual(await balances(), [100, 0]); assert.equal(await db.virtualCoinTransaction.count(), 0); assert.equal(await db.notification.count(), 0);
      });

      await check('insufficient-balance-no-credit-or-notification', async () => {
        await reset(0); await assert.rejects(reward());
        assert.deepEqual(await balances(), [0, 0]); assert.equal(await db.virtualCoinTransaction.count(), 0); assert.equal(await db.notification.count(), 0);
      });

      await check('sequential-replay-at-zero-remaining-balance-one-payment', async () => {
        await reset(8); await reward(); await reward();
        assert.deepEqual(await balances(), [0, 4]); assert.equal(await db.virtualCoinTransaction.count(), 2); assert.equal(await db.notification.count(), 1);
      });

      await check('two-independent-processes-same-request-at-zero-balance-one-payment', async () => {
        await reset(8); const results = await workers([{ amount: 8, requestId: 'concurrent-001', holdLock: true }, { amount: 8, requestId: 'concurrent-001' }]);
        assert(results.every(result => result.ok), JSON.stringify(results));
        assert.deepEqual(await balances(), [0, 4]); assert.equal(await db.virtualCoinTransaction.count(), 2); assert.equal(await db.notification.count(), 1);
        checks.push({ name: 'independent-process-identities', passed: true, pids: results.map(result => result.pid), postgresLockWaitObserved: results.every(result => result.databaseLockWaitObserved) });
      });

      await check('two-independent-processes-conflicting-amount-only-first-commits', async () => {
        await reset(100); const results = await workers([{ amount: 8, requestId: 'concurrent-002', holdLock: true }, { amount: 9, requestId: 'concurrent-002' }]);
        assert.equal(results.filter(result => result.ok).length, 1); assert.match(results.find(result => !result.ok).error, /请求编号已用于其他内容/);
        const source = await debit(); assert.deepEqual(await balances(), [100 + source.amountCoin, Math.floor(-source.amountCoin / 2)]);
        assert.equal(await db.virtualCoinTransaction.count(), 2); assert.equal(await db.notification.count(), 1);
      });

      await check('request-cannot-switch-post-or-author-credit', async () => {
        await reset(); await reward(); await assert.rejects(reward(svc(), 8, 'request-001', 'fixture-another-post'), /请求编号已用于其他内容/);
        assert.deepEqual(await balances(), [92, 4]); assert.equal(await db.notification.count(), 1);
      });

      await check('missing-credit-receipt-fails-closed-without-compensation', async () => {
        await reset(); await reward(); const source = await debit();
        await db.virtualCoinTransaction.deleteMany({ where: { refId: source.id } });
        await assert.rejects(reward(), /打赏流水不完整/);
        assert.deepEqual(await balances(), [92, 4]); assert.equal(await db.virtualCoinTransaction.count(), 1); assert.equal(await db.notification.count(), 1);
      });

      await check('notification-failure-release-and-retry-keeps-one-payment', async () => {
        await reset();
        const failedDb = wrap(db, { notification: wrap(db.notification, { create: async () => { throw new Error('合成通知落库失败'); } }) });
        await reward(svc(db, notify(failedDb))); const source = await debit();
        assert.deepEqual(await balances(), [92, 4]); assert.equal(await db.notification.count(), 0);
        assert.equal(await redis.getClient().get(`notification:sent:${author}:POST_REWARD:${source.id}`), null);
        await reward(); assert.deepEqual(await balances(), [92, 4]); assert.equal(await db.virtualCoinTransaction.count(), 2); assert.equal(await db.notification.count(), 1);
      });

      await check('database-notification-unique-key-survives-redis-key-loss', async () => {
        await reset(); await reward(); const source = await debit(); await redis.del(`notification:sent:${author}:POST_REWARD:${source.id}`);
        await reward(); assert.equal(await db.notification.count(), 1); assert.deepEqual(await balances(), [92, 4]);
      });

      await check('zero-author-share-and-odd-amount-preserve-existing-policy', async () => {
        await reset(); await reward(svc(), 1); await reward(svc(), 1);
        assert.deepEqual(await balances(), [99, 0]); assert.equal(await db.virtualCoinTransaction.count(), 1);
        await reset(); await reward(svc(), 9); assert.deepEqual(await balances(), [91, 4]);
      });

      await check('actual-membership-and-cross-user-notification-access', async () => {
        await reset(); await assert.rejects(reward(svc(), 8, 'request-001', post, 'fixture-outsider'), /请先加入圈子/);
        assert.equal(await db.virtualCoinTransaction.count(), 0); await reward();
        const notice = await db.notification.findFirstOrThrow(); await assert.rejects(notify().getById(notice.id, payer), /通知不存在/);
        assert.equal((await db.notification.findUniqueOrThrow({ where: { id: notice.id } })).isRead, false);
        assert.equal((await notify().getById(notice.id, author)).userId, author);
      });

      assert.equal(checks.length, 14);
      console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, checks, sourceCommit: process.env.SOURCE_COMMIT, scope: 'compiled-candidate-services-real-postgres-and-redis-independent-processes', httpEntryTested: false, independentProcessesTested: true, realRedisTested: true, realNotifications: 0, rewardFailurePolicy: 'all-or-nothing', existingSplitAndRoundingPreserved: true, historicalCompensationExecuted: false }));
    } finally { for (const child of children) if (!child.killed && child.exitCode === null) child.kill(); await close(); }
  })().catch(error => { console.error(error.message); console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: false, checks, error: error.message })); process.exitCode = 1; });
}
