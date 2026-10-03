// 专用本机合成库验收。接收树须已构建；不允许连接正式库。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const [receiver, sqlPath, out] = process.argv.slice(2);
assert(receiver && sqlPath && out);
const url = new URL(process.env.DATABASE_URL);
assert(url.protocol === 'postgresql:' && url.hostname === '127.0.0.1' && url.port === '55476'
  && url.username === 'qa_voice' && url.pathname === '/entitlement_notice_qa_phase92_coin_audit');
const req = createRequire(path.resolve(receiver, 'apps/server/package.json'));
const { PrismaClient } = req('@prisma/client');
const { CoinService } = req(path.resolve(receiver, 'apps/server/dist/modules/coin/coin.service.js'));
const { FundApprovalService } = req(path.resolve(receiver, 'apps/server/dist/modules/fund-approval/fund-approval.service.js'));
const { FundApprovalExecutor } = req(path.resolve(receiver, 'apps/server/dist/modules/fund-approval/fund-approval.executor.js'));
const db = new PrismaClient();
const common = ['-h', '127.0.0.1', '-p', '55476', '-U', 'qa_voice', '-d', url.pathname.slice(1), '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'];
const psql = 'C:/Program Files/PostgreSQL/16/bin/psql.exe';
const marker = 'SYNTHETIC_PRIVATE_PAYLOAD_MUST_NOT_APPEAR';
const models = ['fundApproval', 'virtualCoinRecharge', 'virtualCoinTransaction', 'virtualCoinAccount', 'userRole', 'user'];
const cases = [], allUsers = [];
const snapshot = async () => JSON.stringify(await Promise.all([
  ...models.map(model => db[model].findMany({ orderBy: { id: 'asc' } })),
  db.appDistribution.findMany({ orderBy: { id: 'asc' } }),
  db.$queryRawUnsafe("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname"),
]));
function audit(file = sqlPath) {
  const result = spawnSync(psql, [...common, '-f', file], { encoding: 'utf8', windowsHide: true,
    env: { ...process.env, PGCLIENTENCODING: 'UTF8' } });
  assert.equal(result.status, 0, '核对SQL执行失败');
  assert(!result.stdout.includes(marker));
  const report = JSON.parse(result.stdout.trim());
  assert.equal(report.transactionReadOnly, true);
  assert.equal(report.isolationLevel, 'repeatable read');
  for (const flag of ['completeLedgerProven', 'historicalDuplicateCreditsExcluded', 'automaticRetryOrCompensationAllowed']) assert.equal(report[flag], false);
  assert.equal(report.unassignedEvidence.legacyOwnershipProven, false);
  return report;
}
async function setup(type, name, classification, extra = {}) {
  const users = await Promise.all(['发起者', '受益人', '其他人', '财务'].map(nickname => db.user.create({ data: { nickname: marker + nickname } })));
  allUsers.push(...users.map(u => u.id));
  const [actor, owner, other, reviewer] = users;
  await db.userRole.create({ data: { userId: reviewer.id, roleType: 'FINANCE_ADMIN' } });
  const service = new FundApprovalService(db), coin = new CoinService(db, {}, undefined, undefined, service);
  const executor = new FundApprovalExecutor(service, undefined, undefined, coin, undefined, undefined, undefined, undefined);
  const submitted = await coin[type === 'RECHARGE' ? 'requestRecharge' : 'requestRefund']({ userId: owner.id, amountCoin: 100, description: marker }, actor.id);
  const approvalId = submitted.approvalId;
  cases.push({ name, approvalId, classification, ...extra });
  return { type, actor, owner, other, reviewer, coin, executor, approvalId };
}
async function credit(s) {
  if (s.type === 'RECHARGE') return s.coin.recharge(s.owner.id, { amountCoin: 100, orderNo: 'FUND_RECHARGE_' + s.approvalId, description: marker });
  return s.coin.refund(s.owner.id, 100, marker, undefined, s.approvalId);
}
async function approve(s) { await s.executor.review(s.approvalId, true, marker, s.reviewer.id); }
async function edit(s, data) { await db.fundApproval.update({ where: { id: s.approvalId }, data }); }
async function changeRecord(s, data) {
  if (s.type === 'RECHARGE') await db.virtualCoinRecharge.updateMany({ where: { orderNo: 'FUND_RECHARGE_' + s.approvalId }, data });
  else await db.virtualCoinTransaction.updateMany({ where: { refId: s.approvalId }, data });
}
(async () => {
  try {
    for (const model of models) assert.equal(await db[model].count(), 0);
    const emptyBefore = await snapshot();
    const empty = audit();
    assert.deepEqual(empty.rows, []); assert.deepEqual(empty.summary, {});
    assert.equal(await snapshot(), emptyBefore);
    for (const type of ['RECHARGE', 'COIN_REFUND']) {
      let s = await setup(type, type + '实际服务审批成功', 'STABLE_RECORD_MATCH', { stableRecordCount: 1, matchingRecordCount: 1 });
      await approve(s);
      s = await setup(type, type + '实际共同事务故障后不误报已到账', 'LINKAGE_UNPROVEN', { stableRecordCount: 0 });
      const method = type === 'RECHARGE' ? 'recharge' : 'refund';
      const failed = new Proxy(s.coin, { get(target, key) {
        const value = Reflect.get(target, key);
        if (key === method) return async (...args) => { await Reflect.apply(value, target, args); throw new Error('合成返回前故障'); };
        return typeof value === 'function' ? value.bind(target) : value;
      } });
      const faultyExecutor = new FundApprovalExecutor(new FundApprovalService(db), undefined, undefined, failed, undefined, undefined, undefined, undefined);
      await assert.rejects(faultyExecutor.review(s.approvalId, true, marker, s.reviewer.id));
      assert.equal(await db.virtualCoinAccount.count({ where: { userId: s.owner.id } }), 0);
      s = await setup(type, type + '已批缺稳定关联不能判未到账', 'LINKAGE_UNPROVEN', { stableRecordCount: 0 }); await edit(s, { status: 'APPROVED' });
      s = await setup(type, type + '待审存在稳定记录', 'REVIEW_PENDING_WITH_REFERENCE'); await credit(s);
      s = await setup(type, type + '已拒存在稳定记录', 'REVIEW_REJECTED_WITH_REFERENCE'); await credit(s); await edit(s, { status: 'REJECTED' });
      s = await setup(type, type + '受益人不一致', 'REVIEW_REFERENCE_MISMATCH', { matchingRecordCount: 0 }); await approve(s); await changeRecord(s, { userId: s.other.id });
      s = await setup(type, type + '币数不一致', 'REVIEW_REFERENCE_MISMATCH', { matchingRecordCount: 0 }); await approve(s); await changeRecord(s, { amountCoin: 99 });
      s = await setup(type, type + '审批金额不一致', 'HOLD_APPROVAL_AMOUNT_MISMATCH'); await approve(s); await edit(s, { amount: 101 });
      s = await setup(type, type + '审批金额为空', 'HOLD_APPROVAL_AMOUNT_MISMATCH'); await edit(s, { amount: null });
      s = await setup(type, type + '未知审批状态不输出原值', 'HOLD_UNKNOWN_STATUS', { status: 'OTHER' }); await edit(s, { status: marker });
      s = await setup(type, type + '相同金额时间旧记录不确定归属', 'LINKAGE_UNPROVEN', { stableRecordCount: 0 });
      const created = (await db.fundApproval.findUniqueOrThrow({ where: { id: s.approvalId } })).createdAt;
      if (type === 'RECHARGE') {
        const result = await s.coin.recharge(s.owner.id, { amountCoin: 100, orderNo: 'ADMIN_' + s.approvalId, description: marker });
        await db.virtualCoinRecharge.update({ where: { id: result.recharge.id }, data: { createdAt: created } });
      } else {
        const result = await s.coin.refund(s.owner.id, 100, marker);
        await db.virtualCoinTransaction.update({ where: { id: result.transaction.id }, data: { createdAt: created } });
      }
      s = await setup(type, type + '关联到错误记录种类', 'REVIEW_UNEXPECTED_REFERENCE_KIND', { unexpectedReferenceCount: 1 });
      if (type === 'RECHARGE') await s.coin.refund(s.owner.id, 100, marker, undefined, s.approvalId);
      else await s.coin.recharge(s.owner.id, { amountCoin: 100, orderNo: 'FUND_RECHARGE_' + s.approvalId });
    }
    for (const [name, data] of [['非已支付记录', { status: 'PENDING' }], ['缺支付时间', { paidAt: null }], ['支付方式不符', { payMethod: 'WECHAT' }]]) {
      const s = await setup('RECHARGE', name, 'REVIEW_REFERENCE_MISMATCH'); await approve(s); await changeRecord(s, data);
    }
    for (const [name, data] of [['退款类型不符', { type: 'RECHARGE' }], ['退款场景不符', { scene: 'RECHARGE' }]]) {
      const s = await setup('COIN_REFUND', name, 'REVIEW_REFERENCE_MISMATCH'); await approve(s); await changeRecord(s, data);
    }
    let s = await setup('COIN_REFUND', '同审批多个退款引用', 'REVIEW_MULTIPLE_STABLE_RECORDS', { stableRecordCount: 2, matchingRecordCount: 2 }); await approve(s); await credit(s);
    // 新稳定引用匹配，仍可能同时存在无法归属的旧到账，不能宣称排除历史重复。
    s = await setup('RECHARGE', '新引用与旧同额到账并存仍只证明引用', 'STABLE_RECORD_MATCH'); await approve(s); await s.coin.recharge(s.owner.id, { amountCoin: 100, orderNo: 'ADMIN_' + s.approvalId });
    const payloads = [null, [], '字符串载荷', {}, { userId: marker, amountCoin: '100' },
      { userId: marker, amountCoin: true }, { userId: marker, amountCoin: [] }, { userId: marker, amountCoin: 0 },
      { userId: marker, amountCoin: -100 }, { userId: marker, amountCoin: 0.5 }, { userId: marker, amountCoin: 2147483648 },
      { userId: marker, amountCoin: 1e100 }, { userId: 123, amountCoin: 100 }, { userId: ' ', amountCoin: 100 }];
    for (let i = 0; i < payloads.length; i++) {
      s = await setup('RECHARGE', '非法载荷边界' + i, 'HOLD_INVALID_PAYLOAD', { payloadValid: false });
      // 原生SQL可写JSON null；Prisma不把它误作数据库NULL。
      await db.$executeRaw`UPDATE fund_approval SET payload=${JSON.stringify(payloads[i])}::jsonb WHERE id=${s.approvalId}`;
    }
    s = await setup('RECHARGE', 'JSON小数零整数不误判', 'LINKAGE_UNPROVEN', { payloadValid: true });
    await db.$executeRaw`UPDATE fund_approval SET payload=jsonb_build_object('userId',${s.owner.id}::text,'amountCoin',100.0) WHERE id=${s.approvalId}`;
    const excluded = await db.fundApproval.create({ data: { type: 'REFUND', status: 'APPROVED', payload: { description: marker }, summary: marker, requestedBy: allUsers[0] } });
    const orphan = await db.virtualCoinRecharge.create({ data: { userId: allUsers[1], amountCoin: 100, amountRmb: 10, orderNo: 'FUND_RECHARGE_synthetic_missing_approval', status: 'PAID', payMethod: 'ADMIN', paidAt: new Date() } });
    const before = await snapshot(), report = audit();
    assert.equal(await snapshot(), before);
    assert.equal(report.rows.length, cases.length); assert(!report.rows.some(r => r.approvalId === excluded.id));
    for (const c of cases) {
      const row = report.rows.find(r => r.approvalId === c.approvalId); assert(row, c.name);
      for (const [key, expected] of Object.entries(c)) if (!['name', 'approvalId'].includes(key)) assert.equal(row[key], expected, c.name + ':' + key);
      assert.deepEqual(Object.keys(row).sort(), ['approvalId', 'type', 'status', 'classification', 'payloadValid', 'approvalAmountConsistent', 'stableRecordCount', 'matchingRecordCount', 'unexpectedReferenceCount'].sort());
    }
    assert.equal(Object.values(report.summary).reduce((a, b) => a + b, 0), cases.length);
    assert.equal(report.unassignedEvidence.legacyAdminRechargeRows, 2);
    assert.equal(report.unassignedEvidence.unreferencedRefundRows, 1);
    assert.equal(report.unassignedEvidence.reservedRechargeOrdersWithoutMatchingApproval, 2);
    // 在本工具的实际只读事务中插入写入，数据库必须原生拒绝。
    const forbidden = path.join(out, 'write-rejected.sql');
    fs.writeFileSync(forbidden, fs.readFileSync(sqlPath, 'utf8').replace('WITH parsed AS', 'UPDATE fund_approval SET status=\'REJECTED\';\nWITH parsed AS'));
    const rejection = spawnSync(psql, [...common, '-f', forbidden], { encoding: 'utf8', windowsHide: true, env: { ...process.env, PGCLIENTENCODING: 'UTF8' } });
    assert.notEqual(rejection.status, 0); assert(rejection.stderr.includes('read-only transaction'));
    assert.equal(await snapshot(), before);
    fs.writeFileSync(path.join(out, 'write-rejected.log'), rejection.stderr);
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ cases: cases.length, results: cases, emptyReportPassed: true,
      otherFundTypeExcluded: true, reservedOrphanCountVerified: true, actualCoinAndApprovalServices: true,
      rowsAndCatalogUnchanged: true, nativeWriteProtectionVerified: true, payloadMarkerAbsent: true,
      syntheticDatabaseOnly: true, productionDatabaseRead: false, productionDatabaseWritten: false }, null, 2));
    await db.virtualCoinRecharge.delete({ where: { id: orphan.id } });
    console.log(JSON.stringify({ cases: cases.length, rowsAndCatalogUnchanged: true, nativeWriteProtectionVerified: true }));
  } finally {
    // 清理只限本次创建的账号及其记录，前置空库检查失败也不触碰已有数据。
    const ownedUsers = { in: allUsers };
    await db.fundApproval.deleteMany({ where: { requestedBy: ownedUsers } });
    await db.virtualCoinRecharge.deleteMany({ where: { userId: ownedUsers } });
    await db.virtualCoinTransaction.deleteMany({ where: { userId: ownedUsers } });
    await db.virtualCoinAccount.deleteMany({ where: { userId: ownedUsers } });
    await db.userRole.deleteMany({ where: { userId: ownedUsers } });
    await db.user.deleteMany({ where: { id: ownedUsers } });
    for (const model of models) assert.equal(await db[model].count(), 0);
    fs.writeFileSync(path.join(out, 'cleanup.json'), JSON.stringify({ modelsEmpty: models.length, fixturesCleaned: true }));
  }
})().catch(e => { console.error(e.stack); process.exitCode = 1; }).finally(() => db.$disconnect());
