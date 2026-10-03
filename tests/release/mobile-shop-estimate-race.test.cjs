const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('node:module').createRequire(path.resolve('apps/mobile/package.json'))('typescript')

const page = fs.readFileSync('apps/mobile/src/pkg-shop/checkout/index.vue', 'utf8')
const script = page.split('<script setup lang="ts">')[1].split('</script>')[0]
const source = ts.createSourceFile('checkout.ts', script, ts.ScriptTarget.Latest, true)
function loadPageFunction(name, globals) {
  const node = source.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name)
  if (!node) throw new Error(`缺少结算入口 ${name}`)
  const code = ts.transpileModule(`${node.getText(source)}\nexports.fn = ${name}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { exports: module.exports, estimateSeq: 0, ...globals })
  return module.exports.fn
}

test('切换结算地址后旧报价立即失效，晚到响应不能覆盖新报价', async () => {
  let finishOld, finishNew
  const oldQuote = new Promise((resolve) => { finishOld = resolve })
  const newQuote = new Promise((resolve) => { finishNew = resolve })
  const estimate = { value: { payableAmount: 11 } }
  const estimateLoading = { value: false }
  const currentAddress = { value: { id: 'old' } }
  const refresh = loadPageFunction('refreshEstimate', {
    estimate, estimateLoading, currentAddress,
    items: { value: [{ productId: 'p', quantity: 1 }] }, selectedCoupon: { value: null },
    shopApi: { estimateOrder: ({ addressId }) => addressId === 'old' ? oldQuote : newQuote },
    console: { warn() {} },
  })
  const first = refresh()
  assert.equal(estimate.value, null)
  assert.equal(estimateLoading.value, true)
  currentAddress.value = { id: 'new' }
  const second = refresh()
  finishNew({ goodsAmount: 22, shippingFee: 2, couponDiscount: 0, selfDiscount: 0, payableAmount: 24 })
  await second
  assert.equal(estimate.value.payableAmount, 24)
  assert.equal(estimateLoading.value, false)
  finishOld({ goodsAmount: 11, shippingFee: 0, couponDiscount: 0, selfDiscount: 0, payableAmount: 11 })
  await first
  assert.equal(estimate.value.payableAmount, 24)
})

test('新报价失败时不保留旧实付金额', async () => {
  const estimate = { value: { payableAmount: 11 } }
  const estimateLoading = { value: false }
  const refresh = loadPageFunction('refreshEstimate', {
    estimate, estimateLoading, currentAddress: { value: { id: 'new' } },
    items: { value: [{ productId: 'p', quantity: 1 }] }, selectedCoupon: { value: null },
    shopApi: { estimateOrder: async () => { throw new Error('quote failed') } },
    console: { warn() {} },
  })
  await refresh()
  assert.equal(estimate.value, null)
  assert.equal(estimateLoading.value, false)
})

test('返回结算时更新同 ID 地址，删除后选择有效地址或清空', async () => {
  const currentAddress = { value: { id: 'a', province: '旧省份' } }
  const addresses = { value: [] }
  let returned = [{ id: 'a', province: '新省份' }]
  const refresh = loadPageFunction('refreshAddressesOnReturn', {
    currentAddress, addresses, loading: { value: false }, source: { value: 'product:p' },
    submitting: { value: false }, shopApi: { getCheckout: async () => ({ addresses: returned }) },
  })
  await refresh()
  assert.equal(currentAddress.value, returned[0])
  assert.equal(currentAddress.value.province, '新省份')
  returned = [{ id: 'b', isDefault: true }]
  await refresh()
  assert.equal(currentAddress.value.id, 'b')
  returned = []
  await refresh()
  assert.equal(currentAddress.value, null)
})

test('回页刷新晚到时不改变正在提交的地址', async () => {
  let finish
  const result = new Promise(resolve => { finish = resolve })
  const currentAddress = { value: { id: 'a' } }
  const submitting = { value: false }
  const refresh = loadPageFunction('refreshAddressesOnReturn', {
    currentAddress, addresses: { value: [] }, loading: { value: false }, source: { value: 'product:p' },
    submitting, shopApi: { getCheckout: () => result },
  })
  const pending = refresh()
  submitting.value = true
  finish({ addresses: [{ id: 'b' }] })
  await pending
  assert.equal(currentAddress.value.id, 'a')
})

test('报价重核期间连续点提交只启动一次核算', async () => {
  let finishQuote
  const quote = new Promise((resolve) => { finishQuote = resolve })
  let refreshes = 0
  const submitting = { value: false }
  const toasts = []
  const submit = loadPageFunction('submitOrder', {
    submitting, estimate: { value: null },
    items: { value: [{ productId: 'p', quantity: 1 }] },
    currentAddress: { value: { id: 'address' } },
    selectedCoupon: { value: null }, createdOrders: new Map(), createdOrderSelection: '',
    refreshEstimate: () => { refreshes++; return quote },
    uni: { showToast: ({ title }) => toasts.push(title) },
  })
  const first = submit()
  await submit()
  assert.equal(refreshes, 1)
  assert.equal(submitting.value, true)
  finishQuote()
  await first
  assert.equal(submitting.value, false)
  assert.deepEqual(toasts, ['价格与运费核算失败，请重试'])
})
