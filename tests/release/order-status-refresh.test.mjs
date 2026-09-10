import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const mobileRequire = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))
const ts = mobileRequire('typescript')
const vue = mobileRequire('vue')
const root = new URL('../../apps/mobile/src/', import.meta.url)
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function load(file, dependencies = {}, globals = {}, expose = '') {
  let source = readFileSync(new URL(file, root), 'utf8')
  if (file.endsWith('.vue')) source = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  source += expose ? `\nexport { ${expose} };` : ''
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require: name => dependencies[name] ?? (name === 'vue' ? vue : {}), ...globals })
  return module.exports
}
const { useList } = load('composables/useList.ts')

function polling() {
  const hooks = {}; const timers = new Map(); let next = 0; let visibility
  const document = { hidden: false, addEventListener: (_n, fn) => { visibility = fn }, removeEventListener: () => { visibility = undefined } }
  const deps = {
    vue: { onUnmounted: fn => { hooks.unmount = fn } },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(k => [k, fn => { hooks[k] = fn }])),
  }
  const { usePageRefresh } = load('composables/usePageRefresh.ts', deps, { document, setTimeout: fn => { timers.set(++next, fn); return next }, clearTimeout: id => timers.delete(id) })
  return { usePageRefresh, hooks, timers, document, changeVisibility: () => visibility?.() }
}

test('显示与返回页面立即同步，隐藏和卸载后停止，慢请求不重叠', async () => {
  const p = polling(); const request = deferred(); let calls = 0
  p.usePageRefresh(() => { calls++; return calls === 1 ? request.promise : Promise.resolve() })
  p.hooks.onShow(); p.hooks.onHide(); p.hooks.onShow()
  assert.equal(calls, 1)
  request.resolve(); await settle()
  assert.equal(calls, 2)
  assert.equal(p.timers.size, 1)
  p.hooks.onHide(); assert.equal(p.timers.size, 0)
  p.hooks.onShow(); await settle(); assert.equal(calls, 3)
  p.hooks.onUnload(); assert.equal(p.timers.size, 0)
  p.hooks.onShow(); assert.equal(calls, 3)
})

test('微信切后台停止轮询，回前台立即同步；失败仍可恢复', async () => {
  const p = polling(); let calls = 0
  p.usePageRefresh(async () => { calls++; if (calls === 1) throw new Error('离线') })
  p.hooks.onShow(); await settle(); assert.equal(p.timers.size, 1)
  p.document.hidden = true; p.changeVisibility(); assert.equal(p.timers.size, 0)
  p.document.hidden = false; p.changeVisibility(); await settle(); assert.equal(calls, 2)
  p.hooks.unmount(); assert.equal(p.timers.size, 0)
})

test('静默同步移除已退款订单，同时保留已加载分页与继续加载能力', async () => {
  let rows = ['a', 'b', 'c', 'd']
  const list = useList({ pageSize: 2, fetcher: async ({ page, pageSize }) => ({ items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length }) })
  await list.refresh(); await list.loadMore()
  rows = ['b', 'c', 'd']; const syncing = list.revalidate()
  assert.equal(list.loading.value, false)
  await syncing
  assert.deepEqual([...list.list.value], ['b', 'c', 'd']); assert.equal(list.page.value, 2)
  rows = ['b', 'c', 'd', 'e', 'f']; await list.revalidate(); await list.loadMore()
  assert.deepEqual([...list.list.value], rows)
})

test('后台同步失败保留订单，不把旧筛选的迟到响应写入新标签', async () => {
  let response = async () => ({ items: ['旧订单'], total: 1 })
  const list = useList({ fetcher: () => response() }); await list.refresh()
  response = async () => { throw new Error('断网') }; await list.revalidate()
  assert.deepEqual([...list.list.value], ['旧订单']); assert.equal(list.error.value, '')
  const old = deferred(); response = () => old.promise; const syncing = list.revalidate()
  response = async () => ({ items: ['新标签订单'], total: 1 }); await list.refresh()
  old.resolve({ items: ['迟到的已退款订单'], total: 1 }); await syncing
  assert.deepEqual([...list.list.value], ['新标签订单'])
})

test('快速切换标签时新请求胜出，旧请求失败不能清空新列表', async () => {
  const old = deferred(); let response = () => old.promise
  const list = useList({ fetcher: () => response() }); const first = list.refresh()
  response = async () => ({ items: ['待发货'], total: 1 }); await list.refresh()
  old.reject(new Error('旧标签错误')); await first
  assert.deepEqual([...list.list.value], ['待发货']); assert.equal(list.error.value, '')
})

test('真实售后详情页面在后台审核完成后静默显示完成', async () => {
  let show, init; let status = 'pending'
  const page = load('pkg-account/after-sale-detail/index.vue', {
    '@dcloudio/uni-app': { onLoad: fn => { init = fn } },
    '@/composables/usePageRefresh': { usePageRefresh: fn => { show = fn } },
    '@/pkg-account/lib/account-data': { accountApi: { afterSaleDetail: async () => ({ id: 'as1', status }) } },
  }, { uni: { getSystemInfoSync: () => ({}) } }, 'detail, loading')
  init({ id: 'as1' }); await show(); assert.equal(page.detail.value.status, 'pending')
  status = 'completed'; const update = show(); assert.equal(page.loading.value, false)
  await update; assert.equal(page.detail.value.status, 'completed')
})

test('真实待发货列表与角标在同一次刷新中移除已退款订单', async () => {
  let show, init; let refunded = false
  const page = load('pkg-order/list/index.vue', {
    '@dcloudio/uni-app': { onLoad: fn => { init = fn }, onReachBottom() {}, onPullDownRefresh() {} },
    '@/composables/usePageRefresh': { usePageRefresh: fn => { show = fn } },
    '@/composables/useList': { useList },
    '@/pkg-order/lib/order-data': { orderStatusTabs: [{ key: 'pending_ship' }], orderApi: {
      list: async () => ({ items: refunded ? [] : [{ id: 'o1', status: 'pending_ship' }], total: refunded ? 0 : 1 }),
      statusCounts: async () => ({ pending_ship: refunded ? 0 : 1 }),
    } },
  }, {}, 'orders, counts')
  init({ tab: 'pending_ship' }); await show(); assert.equal(page.orders.value.length, 1)
  refunded = true; await show(); assert.equal(page.orders.value.length, 0); assert.equal(page.counts.value.pending_ship, 0)
})
