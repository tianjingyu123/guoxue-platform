const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../apps/server/node_modules/typescript');
const root = path.resolve(__dirname, '../..');
function transpile(s) { return ts.transpileModule(s, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText; }
const helper = {};
vm.runInNewContext(transpile(fs.readFileSync(path.join(root, 'apps/mobile/src/utils/payment-initialization-error.ts'), 'utf8')), { exports: helper });
function functions(file, names, platform) {
  let source = fs.readFileSync(path.join(root, file), 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0];
  const enabled = [true];
  source = source.split('\n').filter(line => {
    const m = line.match(/\/\/\s*#(ifdef|ifndef)\s+(.+)/);
    if (m) { const hit = m[2].split(/\s*\|\|\s*/).includes(platform); enabled.push(enabled.at(-1) && (m[1] === 'ifdef' ? hit : !hit)); return false; }
    if (/\/\/\s*#endif/.test(line)) { enabled.pop(); return false; }
    return enabled.at(-1);
  }).join('\n');
  const ast = ts.createSourceFile('component.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return transpile(ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name.text)).map(n => n.getText(ast)).join('\n'));
}
const blocked = () => Object.assign(new Error('支付核对中：该订单暂不能再次发起付款，请在原订单查看进度或联系平台'), { status: 409, errorCode: 301001 });
test('结构化及旧请求层仅保留消息时都能识别，普通网络错误不误判', () => {
  assert.equal(helper.isPaymentInitializationBlocked(blocked()), true);
  assert.equal(helper.isPaymentInitializationBlocked(new Error('充值暂未开放：已有充值请查询')), true);
  assert.equal(helper.isPaymentInitializationBlocked(new Error('网络连接失败')), false);
});
for (const platform of ['MP-WEIXIN', 'H5', 'APP-PLUS']) {
  test(`${platform}核对错误停止初始化及轮询，不走外部浏览器降级，重复按钮不能再发起`, async () => {
    const calls = []; const ref = value => ({ value });
    const ctx = { ...helper, console, submitting: ref(false), status: ref('loading'), countdown: ref(0), pollCount: 0,
      failReason: ref(''), oauthAuthorizeUrl: ref(''), initializationBlocked: ref(false), isRecharge: ref(false), orderId: ref('old'),
      rechargeOrderNo: ref(''), amountCoin: ref(100), amount: ref('1'), payMethod: ref('wechat'),
      clearTimers: () => calls.push('clear'), startCountdown: () => calls.push('countdown'), startPolling: () => calls.push('poll'),
      ensureOaOpenid: async () => 'openid', navigator: { userAgent: 'micromessenger' },
      shopApi: { payOrderJsapi: async () => { calls.push('initialize'); throw blocked(); }, payOrderApp: async () => { calls.push('initialize'); throw blocked(); } },
      uni: { showToast: () => calls.push('toast'), getProvider: ({ success }) => success({ provider: ['wxpay'] }),
        getSystemInfoSync: () => ({ platform: 'android' }), requestPayment: () => calls.push('cashier') } };
    vm.createContext(ctx); vm.runInContext(functions('apps/mobile/src/pkg-shop/paying/index.vue', ['startPaying', 'handleRetry'], platform), ctx);
    await ctx.startPaying(); assert.equal(ctx.initializationBlocked.value, true); assert.equal(ctx.status.value, 'failed');
    assert.match(ctx.failReason.value, /^支付核对中：/); assert.equal(ctx.submitting.value, false);
    await ctx.handleRetry(); assert.equal(calls.filter(x => x === 'initialize').length, 1);
    for (const forbidden of ['poll', 'toast', 'cashier']) assert.equal(calls.includes(forbidden), false);
  });
}
test('汇付购买弹窗不吞截止错误并引导再次完成支付', async () => {
  const calls = []; const ref = value => ({ value }); const messages = [];
  const ctx = { ...helper, paying: ref(false), props: { product: { id: 'product' }, bizType: 'PRODUCT', allowQty: false },
    iosDigitalPurchaseUnavailable: ref(false), hasSku: ref(false), selectedSku: ref(''), payMethod: ref('alipay'), quantity: ref(1),
    purchaseApi: { createOrder: async () => { calls.push('create'); return { id: 'old' }; }, payByChannel: async () => { throw blocked(); } },
    onClose: () => calls.push('close'), uni: { showToast: ({ title }) => messages.push(title) } };
  vm.createContext(ctx); vm.runInContext(functions('apps/mobile/src/components/common/purchase-sheet.vue', ['onPay'], 'H5'), ctx);
  await ctx.onPay(); assert.deepEqual(calls, ['create', 'close']); assert.equal(messages.length, 1);
  assert.match(messages[0], /^支付核对中：/); assert.equal(messages[0].includes('完成支付'), false);
});
