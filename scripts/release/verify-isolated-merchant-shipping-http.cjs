// 仅封闭临时数据库和合成运单：不向真实快递、微信发货或生产订单发起请求。
const { createRequire } = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const jwt = req('jsonwebtoken');
const assert = require('node:assert/strict');
const { RedisService } = require('/app/apps/server/dist/redis/redis.service');
const p = new PrismaClient();
const redis = new RedisService();
const rows = [];
const input = { company: '顺丰', trackingNo: 'QA-ISOLATED-NOT-A-REAL-PARCEL' };
async function send(name, id, status, user = 'linux-user-a', dto = input, method = 'PUT', tail = 'ship') {
  const response = await fetch('http://127.0.0.1:3000/api/v1/merchant-backend/orders/' + id + '/' + tail, {
    method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' }) },
    ...(method === 'GET' ? {} : { body: JSON.stringify(dto) }), signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, status, name);
  const text = await response.text();
  const payload = JSON.parse(text);
  rows.push({ name, status, expected: status, passed: true });
  return payload.data ?? payload;
}
async function fixture(suffix, status = 'PAID') {
  const id = 'linux-ship-' + suffix;
  await p.order.create({ data: { id, userId: 'linux-customer', type: 'PRODUCT', targetId: 'isolated-product', merchantId: 'linux-merchant-a', amount: 100, payAmount: 100, status } });
  return id;
}
async function checkState(id, status, logisticsCount) {
  const order = await p.order.findUnique({ where: { id } });
  assert.equal(order.status, status);
  assert.equal(order.shippedAt !== null, status === 'SHIPPED');
  assert.equal(await p.orderLogistics.count({ where: { orderId: id } }), logisticsCount);
}
async function auditCount(id, action = 'MERCHANT_ORDER_SHIPPED') {
  return p.auditLog.count({ where: { targetId: id, action } });
}
(async () => {
  try {
    for (const key of ['KUAIDI100_API_KEY', 'KUAIDI100_CUSTOMER', 'KUAIDI100_CALLBACK_URL', 'KUAIDI100_SALT']) assert(!process.env[key], '隔离测试不能携带快递服务凭据');
    await redis.pingShared();
    for (const suffix of ['a', 'b']) await p.merchant.create({ data: { id: 'linux-merchant-' + suffix, userId: 'linux-user-' + suffix, shopName: '隔离店铺' + suffix, contactName: '合成测试', contactPhone: '00000000000', idCardNumber: 'SYNTHETIC-NOT-A-PERSON', status: 'ACTIVE' } });
    const id = await fixture('normal');
    await p.featureFlag.upsert({ where: { key: 'merchant_backend' }, create: { key: 'merchant_backend', name: '隔离商家入口', enabled: false }, update: { enabled: false } });
    await redis.del('feature:merchant_backend');
    await send('merchant-feature-disabled', id, 404);
    await checkState(id, 'PAID', 0);
    await p.featureFlag.update({ where: { key: 'merchant_backend' }, data: { enabled: true } });
    await redis.del('feature:merchant_backend');
    await send('merchant-nonmerchant-denied', id, 403, 'linux-customer');
    await send('merchant-cross-shop-denied', id, 400, 'linux-user-b');
    await send('merchant-empty-tracking-denied', id, 400, 'linux-user-a', { company: '顺丰', trackingNo: '' });
    await checkState(id, 'PAID', 0);
    assert.equal(await auditCount(id), 0);
    const first = await send('merchant-ship', id, 200);
    assert.equal(first.success, true); assert.equal(first.replayed, false);
    await checkState(id, 'SHIPPED', 1); assert.equal(await auditCount(id), 1);
    const replay = await send('merchant-identical-replay', id, 200);
    assert.equal(replay.replayed, true); assert.equal(await auditCount(id), 1);
    await send('merchant-reship-different-denied', id, 400, 'linux-user-a', { ...input, trackingNo: 'QA-DIFFERENT' });
    const updated = await send('merchant-update-shipment', id, 200, 'linux-user-a', { ...input, trackingNo: 'QA-CORRECTED' }, 'PUT', 'shipment');
    assert.equal(updated.logistics.trackingNo, 'QA-CORRECTED');
    const queried = await send('merchant-get-shipment', id, 200, 'linux-user-a', null, 'GET', 'shipment');
    assert.equal(queried.logistics.trackingNo, 'QA-CORRECTED');
    assert.equal(await auditCount(id, 'MERCHANT_LOGISTICS_UPDATED'), 1);
    await send('merchant-cross-shop-query-denied', id, 400, 'linux-user-b', null, 'GET', 'shipment');
    const cancelled = await fixture('cancelled', 'CANCELLED');
    await send('merchant-cancelled-order-denied', cancelled, 400);
    await checkState(cancelled, 'CANCELLED', 0);
    const failed = await fixture('rollback');
    await p.$executeRawUnsafe(`CREATE FUNCTION isolated_shipping_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."orderId" = 'linux-ship-rollback' THEN RAISE EXCEPTION 'isolated shipment failure'; END IF; RETURN NEW; END $$`);
    await p.$executeRawUnsafe('CREATE TRIGGER isolated_shipping_fail BEFORE INSERT ON "OrderLogistics" FOR EACH ROW EXECUTE FUNCTION isolated_shipping_fail()');
    await send('merchant-logistics-insert-failure', failed, 500);
    await checkState(failed, 'PAID', 0); assert.equal(await auditCount(failed), 0);
    await p.$executeRawUnsafe('DROP TRIGGER isolated_shipping_fail ON "OrderLogistics"');
    await p.$executeRawUnsafe('DROP FUNCTION isolated_shipping_fail()');
    await send('merchant-retry-after-rollback', failed, 200);
    await checkState(failed, 'SHIPPED', 1); assert.equal(await auditCount(failed), 1);
    const concurrent = await fixture('concurrent');
    const token = jwt.sign({ sub: 'linux-user-a', sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const request = () => fetch('http://127.0.0.1:3000/api/v1/merchant-backend/orders/' + concurrent + '/ship', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(input), signal: AbortSignal.timeout(20000),
    });
    const statuses = (await Promise.all([request(), request()])).map(response => response.status).sort();
    assert.equal(statuses[0], 200); assert([200, 400].includes(statuses[1]));
    await checkState(concurrent, 'SHIPPED', 1); assert.equal(await auditCount(concurrent), 1);
    rows.push({ name: 'merchant-concurrent-single-shipment', statuses, passed: true });
    console.log('NODE_TEST_RESULT:' + JSON.stringify({ passed: true, cases: rows, scope: 'synthetic-http-no-carrier-or-wechat-delivery', realShipments: 0, carrierIntegrationNotCovered: true, virtualDeliveryNotCovered: true }));
  } finally {
    await p.$executeRawUnsafe('DROP TRIGGER IF EXISTS isolated_shipping_fail ON "OrderLogistics"').catch(() => {});
    await p.$executeRawUnsafe('DROP FUNCTION IF EXISTS isolated_shipping_fail()').catch(() => {});
    await p.$disconnect(); await redis.onModuleDestroy();
  }
})().catch(error => { console.error('隔离商家发货HTTP验证失败：' + error.message); process.exitCode = 1; });
