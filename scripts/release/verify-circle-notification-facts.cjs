// 独立验证分支专用：调用正式镜像服务，所有记录和故障均限于临时空库。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const { CircleGovernanceService } = require('/app/apps/server/dist/modules/circle/governance/circle-governance.service.js');
const { CirclePostService } = require('/app/apps/server/dist/modules/circle/services/circle-post.service.js');
const { CoinService } = require('/app/apps/server/dist/modules/coin/coin.service.js');
const db = new PrismaClient();
const checks = [];
const pending = [];
const check = async (name, action) => { await action(); checks.push({ name, passed: true }); };
const redis = { runExclusive: async (_key, _ttl, action) => action() };
// 记录站内通知事实，刻意不加载任何真实推送渠道；等待服务的异步通知完成后再断言。
const notification = (fail = false) => {
  const send = (userId, dto) => {
  const operation = (async () => {
    if (fail) throw new Error('合成通知写入故障');
    const { type, title, content, targetType, targetId, category, circleId } = dto;
    return db.notification.create({ data: { userId, type, title, content, targetType, targetId, category, circleId } });
  })();
  pending.push(operation);
  return operation;
  };
  return { send, sendOnce: (userId, _eventKey, dto) => send(userId, dto) };
};
const settle = async () => { await Promise.allSettled(pending.splice(0)); };
const facade = (overrides = {}) => new Proxy(db, { get: (target, key) => {
  if (key in overrides) return overrides[key];
  const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
} });
const wrap = (delegate, overrides) => new Proxy(delegate, { get: (target, key) => {
  if (key in overrides) return overrides[key];
  const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
} });
const governance = (prisma = db, failNotification = false) => new CircleGovernanceService(prisma, redis, {}, notification(failNotification));
const appeal = async (name) => {
  await db.circleAppeal.deleteMany(); await db.circleViolation.deleteMany(); await db.notification.deleteMany();
  const violationId = `violation-${name}`;
  await db.circleViolation.create({ data: { id: violationId, circleId: 'fixture-circle', userId: 'fixture-author', type: 'WARNING', operatorId: 'fixture-owner' } });
  return db.circleAppeal.create({ data: { id: `appeal-${name}`, violationId, circleId: 'fixture-circle', userId: 'fixture-author', content: '隔离合成申诉', deadlineAt: new Date(Date.now() - 60000) } });
};
const assertAppeal = async (row, status, violationStatus, count) => {
  await settle();
  assert.equal((await db.circleAppeal.findUniqueOrThrow({ where: { id: row.id } })).status, status);
  assert.equal((await db.circleViolation.findUniqueOrThrow({ where: { id: row.violationId } })).status, violationStatus);
  assert.equal(await db.notification.count(), count);
};
const rewardFixture = async (balance = 100) => {
  await db.notification.deleteMany(); await db.virtualCoinTransaction.deleteMany();
  for (const [userId, amount] of [['fixture-payer', balance], ['fixture-author', 0]])
    await db.virtualCoinAccount.upsert({ where: { userId }, create: { userId, balance: amount }, update: { balance: amount, totalSpent: 0 } });
};
const shared = { ensureMember: async (circleId, userId) => {
  assert(await db.circleMember.findFirst({ where: { circleId, userId } }), '合成付款用户必须为圈子成员');
} };
const postService = (coin = new CoinService(db, {}), failNotification = false, prisma = db) => new CirclePostService(prisma, {}, shared, undefined, coin, notification(failNotification));
const balances = async () => {
  await settle();
  return Promise.all(['fixture-payer', 'fixture-author'].map(async userId => (await db.virtualCoinAccount.findUniqueOrThrow({ where: { userId } })).balance));
};
(async () => {
  try {
    for (const id of ['fixture-owner', 'fixture-author', 'fixture-payer']) await db.user.create({ data: { id, nickname: '隔离合成用户' } });
    await db.circle.create({ data: { id: 'fixture-circle', name: '隔离合成圈子', intro: '非真实业务', tags: [], ownerId: 'fixture-owner' } });
    await db.circleMember.create({ data: { circleId: 'fixture-circle', userId: 'fixture-payer' } });
    await db.post.create({ data: { id: 'fixture-post', circleId: 'fixture-circle', userId: 'fixture-author', title: '合成帖子', content: '隔离验证' } });

    await check('appeal-committed-success-notification', async () => {
      const row = await appeal('success'); await governance().processOverdueAppeals(); await assertAppeal(row, 'UPHELD', 'REVOKED', 1);
    });
    await check('stale-scan-manual-rejection-no-success-notification', async () => {
      const row = await appeal('manual');
      const prisma = facade({ circleAppeal: wrap(db.circleAppeal, { findMany: async args => {
        const rows = await db.circleAppeal.findMany(args);
        await db.circleAppeal.update({ where: { id: row.id }, data: { status: 'REJECTED' } }); return rows;
      } }) });
      await governance(prisma).processOverdueAppeals(); await assertAppeal(row, 'REJECTED', 'ACTIVE', 0);
    });
    await check('stale-scan-extended-deadline-no-success-notification', async () => {
      const row = await appeal('extended');
      const prisma = facade({ circleAppeal: wrap(db.circleAppeal, { findMany: async args => {
        const rows = await db.circleAppeal.findMany(args);
        await db.circleAppeal.update({ where: { id: row.id }, data: { deadlineAt: new Date(Date.now() + 3600000) } }); return rows;
      } }) });
      await governance(prisma).processOverdueAppeals(); await assertAppeal(row, 'PENDING', 'ACTIVE', 0);
    });
    await check('appeal-real-transaction-rollback-no-success-notification', async () => {
      const row = await appeal('rollback');
      const prisma = facade({ $transaction: action => db.$transaction(tx => action(new Proxy(tx, { get: (target, key) => key === 'circleViolation'
        ? wrap(target[key], { update: async () => { throw new Error('合成撤销写入故障'); } }) : target[key] }))) });
      await governance(prisma).processOverdueAppeals(); await assertAppeal(row, 'PENDING', 'ACTIVE', 0);
    });
    await check('two-transactions-stale-scan-postgres-cas-one-notification', async () => {
      const row = await appeal('concurrent'); let arrivals = 0; let release;
      const barrier = new Promise(resolve => { release = resolve; });
      const prisma = facade({ circleAppeal: wrap(db.circleAppeal, { findMany: async args => {
        const rows = await db.circleAppeal.findMany(args); arrivals++; if (arrivals === 2) release(); await barrier; return rows;
      } }) });
      await Promise.all([governance(prisma).processOverdueAppeals(), governance(prisma).processOverdueAppeals()]);
      assert.equal(arrivals, 2); await assertAppeal(row, 'UPHELD', 'REVOKED', 1);
    });
    await check('appeal-notification-failure-keeps-committed-ruling', async () => {
      const row = await appeal('notify-failure'); await governance(db, true).processOverdueAppeals(); await assertAppeal(row, 'UPHELD', 'REVOKED', 0);
    });
    await check('reward-real-ledgers-match-notified-credit', async () => {
      await rewardFixture(); await postService().rewardPost('fixture-circle', 'fixture-post', 'fixture-payer', 8);
      assert.deepEqual(await balances(), [92, 4]); assert.equal(await db.virtualCoinTransaction.count(), 2);
      assert.match((await db.notification.findFirstOrThrow()).content, /入账 4 币/);
    });
    await check('reward-author-ledger-failure-rolls-back-both-balances-and-no-notification', async () => {
      await rewardFixture();
      const failedCreditDb = facade({ $transaction: (action, options) => db.$transaction(tx => action(wrap(tx, {
        virtualCoinTransaction: wrap(tx.virtualCoinTransaction, { create: async args => {
          if (args.data.userId === 'fixture-author') throw new Error('合成作者入账流水故障');
          return tx.virtualCoinTransaction.create(args);
        } }),
      })), options) });
      const failedCreditCoin = new CoinService(failedCreditDb, {});
      await assert.rejects(postService(failedCreditCoin, false, failedCreditDb).rewardPost('fixture-circle', 'fixture-post', 'fixture-payer', 8), /合成作者入账流水故障/);
      assert.deepEqual(await balances(), [100, 0]); assert.equal(await db.virtualCoinTransaction.count(), 0);
      assert.equal(await db.notification.count(), 0);
    });
    await check('reward-spend-failure-no-credit-or-notification', async () => {
      await rewardFixture(0); await assert.rejects(postService().rewardPost('fixture-circle', 'fixture-post', 'fixture-payer', 8));
      assert.deepEqual(await balances(), [0, 0]); assert.equal(await db.virtualCoinTransaction.count(), 0); assert.equal(await db.notification.count(), 0);
    });
    await check('reward-notification-failure-keeps-ledgers-and-success-result', async () => {
      await rewardFixture(); const result = await postService(undefined, true).rewardPost('fixture-circle', 'fixture-post', 'fixture-payer', 8);
      assert.equal(result.success, true); assert.deepEqual(await balances(), [92, 4]); assert.equal(await db.virtualCoinTransaction.count(), 2); assert.equal(await db.notification.count(), 0);
    });
    assert.equal(checks.length, 10);
    console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, checks, scope: 'compiled-services-real-postgres-transactions-synthetic-notification-sink', httpEntryTested: false, realRedisLockTested: false, independentProcessesTested: false, existingRewardSplitPolicyPreserved: true }));
  } finally { await settle(); await db.$disconnect(); }
})().catch(error => { console.error(error.message); console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: false, checks, error: error.message })); process.exitCode = 1; });
