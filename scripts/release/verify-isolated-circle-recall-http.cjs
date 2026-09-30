// 仅供封闭临时库：合成财务台账，不出款、不变真实余额、不调用生产接口。
const { createRequire } = require("node:module");
const req = createRequire("/app/apps/server/package.json");
const { PrismaClient } = req("@prisma/client");
const jwt = req("jsonwebtoken");
const assert = require("node:assert/strict");
const p = new PrismaClient();
const rows = [];
const circleId = "linux-adjust-circle";
const note = "隔离核对原订单和收益行，仅合成财务记录，不用于生产结案";
async function fixture(suffix, patch = {}) {
  const id = "linux-adjust-" + suffix;
  await p.order.create({ data: { id, userId: "linux-user-a", type: "CIRCLE_JOIN", targetId: circleId,
    amount: 100, payAmount: 100, status: "REFUNDED", ...patch.order } });
  await p.circleRefundRequest.create({ data: { id: id + "-refund", circleId, userId: "linux-user-a", orderId: id,
    paidAmount: 999, dailyCost: 0, usedDays: 0, refundBase: 40, feeAmount: 0, actualRefund: 40,
    refundStatus: "refunded", ...patch.refund } });
  await p.commissionRecall.create({ data: { id: id + "-recall", refundId: id + "-refund", userId: "linux-user-b",
    userType: "owner", sourceId: id + "-member", amount: 0, balanceAfter: 0, status: "pending_manual", ...patch.recall } });
  await p.circleRevenueRecord.create({ data: { id: id + "-revenue", circleId, type: "circle_join", sourceId: id + "-member",
    orderId: id, amount: 100, platformFee: 40, ownerShare: 60, splitRate: 0.6, ...patch.revenue } });
  return id;
}
async function send(name, id, expected, revenueRecordId = id + "-revenue", user = "linux-finance") {
  const response = await fetch("http://127.0.0.1:3000/api/v1/circle-refund/manual-recalls/" + id + "-recall/resolve", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + jwt.sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: "5m" }) },
    body: JSON.stringify({ decision: "adjust", note, revenueRecordId }), signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  rows.push({ name, status: response.status, expected, passed: response.status === expected });
  assert.equal(response.status, expected, name);
  return body.data || body;
}
async function unchanged(id) {
  assert.equal((await p.commissionRecall.findUnique({ where: { id: id + "-recall" } })).status, "pending_manual");
  assert.equal(await p.circleRevenueRecord.count({ where: { orderId: id, type: "circle_join_refund" } }), 0);
  assert.equal(Number((await p.circleRefundRequest.findUnique({ where: { id: id + "-refund" } })).ownerRecalled), 0);
}
async function drop() {
  await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_adjust_failure ON "CircleRefundRequest"');
  await p.$executeRawUnsafe("DROP FUNCTION IF EXISTS isolated_adjust_failure()");
}
(async () => {
  try {
    await p.circle.create({ data: { id: circleId, ownerId: "linux-user-b", name: "隔离调整核验", intro: "仅合成台账", tags: [] } });
    await p.circle.create({ data: { id: circleId + "-other", ownerId: "linux-user-b", name: "隔离另一圈子", tags: [] } });
    const walletBefore = await p.userWallet.count();
    const scenarios = [
      ["wrong-owner", { recall: { userId: "linux-user-a" } }],
      ["missing-member", { recall: { sourceId: null } }],
      ["wrong-order-user", { order: { userId: "linux-user-b" } }],
      ["wrong-order-circle", { order: { targetId: circleId + "-other" } }],
      ["wrong-order-type", { order: { type: "COURSE" } }],
      ["wrong-revenue-circle", { revenue: { circleId: circleId + "-other" } }],
      ["wrong-revenue-member", { revenue: { sourceId: "wrong-isolated-member" } }],
      ["wrong-revenue-order", { revenue: { orderId: "wrong-isolated-order" } }],
      ["wrong-revenue-type", { revenue: { type: "gift" } }],
      ["negative-revenue", { revenue: { amount: -100 } }],
      ["invalid-owner-share", { revenue: { ownerShare: 101 } }],
      ["refund-over-paid", { refund: { actualRefund: 101 } }],
      ["zero-refund", { refund: { actualRefund: 0 } }],
    ];
    for (const [name, patch] of scenarios) {
      const id = await fixture(name, patch);
      await send("adjust-reject-" + name, id, 400); await unchanged(id);
    }
    const missing = await fixture("missing-revenue");
    await send("adjust-reject-missing-revenue", missing, 400, "linux-absent-revenue"); await unchanged(missing);
    const partial = await fixture("partial");
    const adjusted = await send("adjust-uses-original-paid-amount", partial, 201);
    assert.equal(adjusted.ownerRecalled, 24); assert.equal(adjusted.revenueAmountRecalled, 40); assert.equal(adjusted.refundRatio, 0.4);
    const reversed = await p.circleRevenueRecord.findFirst({ where: { orderId: partial, type: "circle_join_refund" } });
    assert.equal(Number(reversed.ownerShare), -24); assert.equal(Number(reversed.amount), -40);
    const resolved = await p.commissionRecall.findUnique({ where: { id: partial + "-recall" } });
    assert.equal(resolved.resolvedBy, "linux-finance"); assert(resolved.resolvedAt); assert.equal(resolved.resolutionNote, note);
    assert.equal(resolved.resolvedRevenueId, partial + "-revenue"); assert.equal(Number(resolved.amount), -24);
    await send("adjust-reject-repeat", partial, 400);
    await p.commissionRecall.create({ data: { id: partial + "-second-recall", refundId: partial + "-refund", userId: "linux-user-b", userType: "owner",
      sourceId: partial + "-member", amount: 0, balanceAfter: 0, status: "pending_manual" } });
    await send("adjust-reject-already-reversed-order", partial + "-second", 400, partial + "-revenue");
    assert.equal(await p.circleRevenueRecord.count({ where: { orderId: partial, type: "circle_join_refund" } }), 1);
    const failed = await fixture("transaction-fail");
    // 冲正行真实INSERT之后，在后续申请更新处失败，证明整个事务撤回。
    await p.$executeRawUnsafe('CREATE FUNCTION isolated_adjust_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."id" = \'linux-adjust-transaction-fail-refund\' THEN RAISE EXCEPTION \'isolated adjustment failure\'; END IF; RETURN NEW; END $$');
    await p.$executeRawUnsafe('CREATE TRIGGER isolated_adjust_failure AFTER UPDATE ON "CircleRefundRequest" FOR EACH ROW EXECUTE FUNCTION isolated_adjust_failure()');
    await send("adjust-transaction-after-reversal-insert-fails", failed, 500); await unchanged(failed);
    await drop();
    await send("adjust-transaction-retry", failed, 201, failed + "-revenue", "linux-super");
    assert.equal(await p.circleRevenueRecord.count({ where: { orderId: failed, type: "circle_join_refund" } }), 1);
    const concurrent = await fixture("concurrent");
    const token = jwt.sign({ sub: "linux-finance", sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: "5m" });
    const request = () => fetch("http://127.0.0.1:3000/api/v1/circle-refund/manual-recalls/" + concurrent + "-recall/resolve", {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "adjust", note, revenueRecordId: concurrent + "-revenue" }), signal: AbortSignal.timeout(20000),
    });
    const statuses = (await Promise.all([request(), request()])).map(response => response.status).sort();
    assert.deepEqual(statuses, [201, 400]);
    rows.push({ name: "adjust-concurrent-one-success-one-denied", statuses, expected: [201, 400], passed: true });
    assert.equal(await p.circleRevenueRecord.count({ where: { orderId: concurrent, type: "circle_join_refund" } }), 1);
    assert.equal(await p.userWallet.count(), walletBefore);
    console.log("NODE_TEST_RESULT:" + JSON.stringify({ passed: true, cases: rows, originalOrderBasisNotRefundSnapshot: true,
      partialOwnerRecall: 24, originalOwnerShare: 60, bindingRejectionsPreservePending: true,
      repeatedOrderReversalRejected: true, transactionRollbackAfterActualInsert: true, concurrentOneReversal: true,
      walletRecordsUnchanged: true, realTransfers: 0, auditFailureNotCovered: true,
      scope: "synthetic-ledger-http-not-production-funds-or-settlement" }));
  } finally { await drop(); await p.$disconnect(); }
})().catch(error => { console.error("隔离人工冲正 HTTP 断言失败：" + error.message); process.exitCode = 1; });
