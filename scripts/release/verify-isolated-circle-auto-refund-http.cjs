// 仅封闭临时库合成订单：不对真实用户退钱，不调用真实支付和通知渠道。
const { createRequire } = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const jwt = req('jsonwebtoken');
const assert = require('node:assert/strict');
const p = new PrismaClient();
const rows = [];
async function fixture(suffix, ownerShare, amount = 100) {
  const id = 'linux-auto-' + suffix;
  await p.circle.create({ data: { id, ownerId: 'linux-user-b', name: '隔离自动退款', intro: '合成边界验证', tags: [], memberCount: 1 } });
  await p.circleMember.create({ data: { id: id + '-member', circleId: id, userId: 'linux-user-a' } });
  await p.order.create({ data: { id, userId: 'linux-user-a', type: 'CIRCLE_JOIN', targetId: id, amount: 100, payAmount: 100, status: 'PAID' } });
  await p.circleRevenueRecord.create({ data: { id: id + '-revenue', circleId: id, sourceId: id + '-member', orderId: id,
    type: 'circle_join', amount, ownerShare, platformFee: 0, splitRate: 0.6 } });
  await p.circleRefundRequest.create({ data: { id: id + '-refund', circleId: id, userId: 'linux-user-a', orderId: id,
    paidAmount: 100, dailyCost: 0, usedDays: 0, refundBase: 40, feeAmount: 0, actualRefund: 40, ownerStatus: 'approved' } });
  return id;
}
async function send(name, id, expected, user = 'linux-super') {
  const response = await fetch('http://127.0.0.1:3000/api/v1/circle-refund/' + id + '-refund/admin-review', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' }) },
    body: JSON.stringify({ approve: true }), signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, expected, name);
  rows.push({ name, status: response.status, expected, passed: true });
}
async function balance() { return Number((await p.userWallet.findUnique({ where: { userId: 'linux-user-a' } }))?.balance || 0); }
async function verify(id, ownerRecalled, reason, before) {
  const refund = await p.circleRefundRequest.findUnique({ where: { id: id + '-refund' } });
  assert.equal(refund.refundStatus, 'refunded'); assert.equal(Number(refund.ownerRecalled), ownerRecalled);
  assert.equal(await balance(), before + 40);
  assert.equal(await p.userBalanceTransaction.count({ where: { refId: id + '-refund' } }), 1);
  assert.equal(await p.circleMember.count({ where: { circleId: id } }), 0);
  assert.equal((await p.circle.findUnique({ where: { id } })).memberCount, 0);
  const recalls = await p.commissionRecall.findMany({ where: { refundId: id + '-refund', userType: 'owner' } });
  assert.equal(recalls.length, 1);
  const revenues = await p.circleRevenueRecord.findMany({ where: { orderId: id, type: 'circle_join_refund' } });
  if (reason) {
    assert.equal(recalls[0].status, 'pending_manual'); assert.equal(recalls[0].reason, reason);
    assert.equal(Number(recalls[0].amount), 0); assert.equal(revenues.length, 0);
  } else {
    const negativeShare = ownerRecalled === 0 ? 0 : -ownerRecalled;
    assert.equal(recalls[0].status, 'completed'); assert.equal(Number(recalls[0].amount), negativeShare);
    assert.equal(revenues.length, 1); assert.equal(Number(revenues[0].amount), -40);
    assert.equal(Number(revenues[0].ownerShare), negativeShare);
  }
}
(async () => {
  try {
    for (const [name, ownerShare, amount, expectedRecall, reason] of [
      ['over-share', 600, 100, 0, 'revenue_share_invalid'],
      ['negative-share', -1, 100, 0, 'revenue_share_invalid'],
      ['amount-mismatch', 60, 1000, 0, 'revenue_amount_mismatch'],
      ['normal-partial', 60, 100, 24, null],
      ['zero-share', 0, 100, 0, null],
    ]) {
      const id = await fixture(name, ownerShare, amount); const before = await balance();
      await send('auto-' + name, id, 201); await verify(id, expectedRecall, reason, before);
      await send('auto-replay-' + name, id, 400); await verify(id, expectedRecall, reason, before);
    }
    const denied = await fixture('role-denied', 60); const before = await balance();
    await send('auto-ordinary-user-denied', denied, 403, 'linux-user-a');
    assert.equal(await balance(), before); assert.equal((await p.circleRefundRequest.findUnique({ where: { id: denied + '-refund' } })).adminStatus, 'pending');
    const id = await fixture('concurrent', 60); const prior = await balance();
    const token = jwt.sign({ sub: 'linux-super', sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const request = () => fetch('http://127.0.0.1:3000/api/v1/circle-refund/' + id + '-refund/admin-review', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ approve: true }), signal: AbortSignal.timeout(20000),
    });
    const statuses = (await Promise.all([request(), request()])).map(r => r.status).sort();
    assert.deepEqual(statuses, [201, 400]); await verify(id, 24, null, prior);
    rows.push({ name: 'auto-concurrent-single-credit', statuses, expected: [201, 400], passed: true });
    console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, cases: rows, partialOwnerRecall: 24, refundEach: 40,
      anomalousSharePendingManualWithoutOwnerDeduction: true, zeroOwnerShareRefunded: true, oneWalletCreditPerRefund: true,
      scope: 'synthetic-http-not-real-provider-or-settlement', realTransfers: 0, withdrawnBalanceRecoveryNotCovered: true }));
  } finally { await p.$disconnect(); }
})().catch(error => { console.error('隔离自动退款HTTP验证失败：' + error.message); process.exitCode = 1; });
