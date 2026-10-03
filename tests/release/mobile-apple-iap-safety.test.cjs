const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('../../apps/server/node_modules/typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../../apps/mobile/src/lib/apple-iap.ts'), 'utf8');
function load({ user = '123e4567-e89b-42d3-a456-426614174000', verified = true, state = '1' } = {}) {
  const calls = [];
  const transaction = { transactionIdentifier: 't1', productIdentifier: 'p1', transactionState: state };
  const channel = { id: 'appleiap', finishTransaction: (_t, success) => { calls.push('finish'); success(); },
    restoreCompletedTransactions: (_options, success) => success([transaction]) };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    require: (name) => name.includes('storage') ? { getUserInfo: () => ({ id: user }) } : {
      apiPost: async () => { calls.push('verify'); if (!verified) throw Error('验票拒绝'); return { success: true }; },
      apiGet: async () => ({}),
    },
    uni: { getProvider: ({ success }) => success({ providers: [channel] }),
      requestPayment: ({ success }) => { calls.push('purchase'); success(transaction); } },
  });
  return { api: exports, calls };
}
test('验票成功后才关闭苹果交易', async () => {
  const { api, calls } = load();
  await api.purchaseAppleIap('p1');
  assert.deepEqual(calls, ['purchase', 'verify', 'finish']);
});
test('验票失败保留交易，不提前finish', async () => {
  const { api, calls } = load({ verified: false });
  await assert.rejects(api.purchaseAppleIap('p1'), /验票拒绝/);
  assert.deepEqual(calls, ['purchase', 'verify']);
});
test('无效账号在扣款前阻止拉起', async () => {
  const { api, calls } = load({ user: 'not-a-uuid' });
  await assert.rejects(api.purchaseAppleIap('p1'), /暂不支持/);
  assert.deepEqual(calls, []);
});
test('恢复状态3也先交服务端验票', async () => {
  const { api, calls } = load({ state: '3' });
  assert.equal(await api.recoverPendingAppleIapTransactions(), 1);
  assert.deepEqual(calls, ['verify', 'finish']);
});
test('iOS 旧待付单只允许有收货信息的实物从现金收银入口继续', () => {
  const guardFile = fs.readFileSync(path.resolve(__dirname, '../../apps/mobile/src/utils/ios-cash-payment-boundary.ts'), 'utf8');
  const guard = {};
  vm.runInNewContext(ts.transpileModule(guardFile, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: guard });
  assert.equal(guard.iosCashPaymentBlocked('ios', 'MEMBER', false), true);
  assert.equal(guard.iosCashPaymentBlocked('ios', 'COURSE', false), true);
  assert.equal(guard.iosCashPaymentBlocked('ios', 'PRODUCT', false), true);
  assert.equal(guard.iosCashPaymentBlocked('ios', 'PRODUCT', true), false);
  assert.equal(guard.iosCashPaymentBlocked('android', 'COURSE', false), false);
  const paying = fs.readFileSync(path.resolve(__dirname, '../../apps/mobile/src/pkg-shop/paying/index.vue'), 'utf8');
  assert.match(paying, /if \(iosCashOrderBlocked\(st\)\)/);
  assert.match(paying, /if \(iosCashOrderBlocked\(order\)\)/);
  const shop = fs.readFileSync(path.resolve(__dirname, '../../apps/mobile/src/lib/shop-data.ts'), 'utf8');
  assert.match(shop, /iosCashPaymentBlocked\(uni\.getSystemInfoSync\(\)\.platform, orderType, Boolean\(payload\.addressId\)\)/);
  const vip = fs.readFileSync(path.resolve(__dirname, '../../apps/mobile/src/pkg-profile/vip/index.vue'), 'utf8');
  assert.match(vip, /if \(uni\.getSystemInfoSync\(\)\.platform === 'ios'\)/);
});
