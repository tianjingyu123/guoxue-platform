import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(new URL('../package.json', import.meta.url))
const vue = require('vue')
const ts = require('typescript')
const { parse, compileScript } = require('vue/compiler-sfc')
const tick = async () => { await vue.nextTick(); await new Promise(resolve => setImmediate(resolve)); await vue.nextTick() }
const deny = status => ({ response: { status } })
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

// 运行真实 SFC setup/composable；仅替换网络、路由、账号和宿主DOM，禁止连接任何远端。
function moduleFrom(source, stubs) {
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'vue') return vue
    if (Object.hasOwn(stubs, id)) return stubs[id]
    throw new Error(`测试拒绝未声明依赖：${id}`)
  }, module, module.exports)
  return module.exports
}
const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
const topic = moduleFrom(source('utils/topic-screen.ts'), {})
const signals = moduleFrom(source('utils/platform-signals.ts'), {})
const platform = moduleFrom(source('utils/platform-screen.ts'), {})
const renderer = vue.createRenderer({
  createElement: type => ({ type }), createText: text => ({ text }), createComment: text => ({ text }),
  insert() {}, remove() {}, setText(node, text) { node.text = text }, setElementText() {},
  parentNode: () => null, nextSibling: () => null, patchProp() {},
})

function fixture(t, mode = 'platform') {
  const globals = Object.fromEntries(['window', 'document', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const storage = new Map([['token', 'fake-access-A']])
  const hostWindow = new EventTarget(), hostDocument = new EventTarget()
  hostDocument.hidden = false
  const local = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  for (const [key, value] of Object.entries({ window: hostWindow, document: hostDocument, localStorage: local })) Object.defineProperty(globalThis, key, { configurable: true, value })
  const route = vue.reactive({ path: '/bigscreen/platform', query: {} })
  const auth = vue.reactive({ user: { id: 'account-A' }, token: 'fake-access-A', roles: ['SUPER_ADMIN'], isLogin: true, hasRole(...roles) { return this.roles.some(role => roles.includes(role)) } })
  const calls = [], replies = {}
  const request = key => async (token, inlineError) => {
    calls.push({ key, token, inlineError })
    return replies[key] ? replies[key]() : { data: key === 'platform' ? { totalUsers: 15, totalCircles: 1, updatedAt: '2026-09-03T10:00:00Z' } : { marker: `private-${key}` } }
  }
  const stubs = {
    'vue-router': { useRoute: () => route }, '@/store/auth': { useAuthStore: () => auth },
    '@/utils/topic-screen': topic, '@/utils/platform-signals': signals, '@/utils/platform-screen': platform,
    '@/api': { bigscreenApi: { platform: request('platform'), transactions: request('transactions'), contentEco: request('content'), aiCapability: request('ai'), offlineMap: request('offline') }, cockpitApi: { userGrowth: request('growth'), alerts: request('alerts') } },
  }
  stubs['@/composables/useBigscreenContext'] = moduleFrom(source('composables/useBigscreenContext.ts'), stubs)
  stubs['@/composables/usePlatformSignals'] = moduleFrom(source('composables/usePlatformSignals.ts'), stubs)
  stubs['@/components/BigscreenActions.vue'] = {}
  stubs['@/components/PlatformIntelligence.vue'] = {}
  stubs['@/lib/brand'] = { BRAND: { platformName: '隔离测试' } }
  stubs['@element-plus/icons-vue'] = { Box: {}, Collection: {}, Connection: {}, Document: {}, Reading: {} }
  stubs['@/styles/platform-command.css'] = {}
  let setup
  if (mode === 'platform') {
    const { descriptor } = parse(source('views/dashboard/PlatformBigscreen.vue'))
    const script = compileScript(descriptor, { id: 'permission-regression-test' }).content
    setup = moduleFrom(script.replaceAll('import.meta.env.DEV', 'false'), stubs).default.setup
  } else {
    const composable = moduleFrom(source('composables/useTopicSnapshot.ts'), stubs)
    setup = () => composable.useTopicSnapshot(request('topic'))
  }
  let exposed
  const app = renderer.createApp({ setup(props, context) { exposed = setup(props, context); return () => null } })
  app.mount({})
  t.after(() => {
    app.unmount()
    for (const [key, descriptor] of Object.entries(globals)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
  })
  return { exposed, route, auth, replies, calls, app, storage, hostWindow, local }
}

test('平台真实setup在汇总403后清空主卡片、附属指标、选择项和旧更新时间', async t => {
  const f = fixture(t)
  await tick()
  assert.equal(f.exposed.data.value.totalUsers, 15)
  assert.equal(f.exposed.content.value.marker, 'private-content')
  f.exposed.selectedKey.value = 'totalCircles'
  f.replies.platform = async () => { throw deny(403) }
  await f.exposed.load(true)
  assert.deepEqual(f.exposed.data.value, {})
  assert.deepEqual(f.exposed.content.value, {})
  assert.equal(f.exposed.selectedKey.value, null)
  assert.equal(f.exposed.forbidden.value, true)
  assert.equal(f.exposed.syncLabel.value, '访问权限已失效')
  assert.equal(f.exposed.stale.value, false)
})

test('平台真实setup在附属403时清空整体且丢弃较晚的成功汇总', async t => {
  const f = fixture(t)
  await tick()
  const late = deferred()
  f.replies.platform = () => late.promise
  const pending = f.exposed.load(true)
  f.replies.content = async () => { throw deny(403) }
  await f.exposed.refreshSignals(true)
  assert.equal(f.exposed.forbidden.value, true)
  late.resolve({ data: { totalUsers: 999 } })
  await pending
  assert.deepEqual(f.exposed.data.value, {})
  assert.deepEqual(f.exposed.transactions.value, {})
})

test('普通断网保留旧数据但不标权限失效，恢复后重新显示已连接', async t => {
  const f = fixture(t)
  await tick()
  f.replies.platform = async () => { throw new Error('offline') }
  await f.exposed.load()
  assert.equal(f.exposed.data.value.totalUsers, 15)
  assert.equal(f.exposed.stale.value, true)
  assert.equal(f.exposed.forbidden.value, false)
  delete f.replies.platform
  await f.exposed.load()
  assert.equal(f.exposed.syncLabel.value, '平台数据已连接')
})

for (const mode of ['platform', 'topic']) test(`${mode}账号/角色/令牌切换同步清空，并隔离旧响应`, async t => {
  const f = fixture(t, mode)
  await tick()
  const key = mode === 'platform' ? 'platform' : 'topic'
  const late = deferred()
  f.replies[key] = () => late.promise
  const pending = mode === 'platform' ? f.exposed.load() : f.exposed.refresh()
  f.auth.user = { id: 'account-B' }
  assert.deepEqual(f.exposed.data.value, {})
  f.replies[key] = async () => ({ data: { marker: 'account-B' } })
  await tick()
  late.resolve({ data: { marker: 'account-A-late' } })
  await pending
  assert.equal(f.exposed.data.value.marker, 'account-B')
  f.auth.roles = ['FINANCE_ADMIN']
  assert.deepEqual(f.exposed.data.value, {})
  await tick()
  f.route.query = { token: 'fake-topic-token' }
  assert.deepEqual(f.exposed.data.value, {})
  await tick()
  assert.equal(f.calls.at(-1).token, 'fake-topic-token')
})

for (const mode of ['platform', 'topic']) test(`${mode}空值或数组令牌禁止降级登录态访问`, async t => {
  const f = fixture(t, mode)
  await tick()
  for (const token of ['', null, ['a', 'b']]) {
    const before = f.calls.length
    f.route.query = { token }
    assert.deepEqual(f.exposed.data.value, {})
    await tick()
    assert.equal(f.calls.length, before)
    assert.equal(f.exposed.snapshot.value.forbidden, true)
  }
})

test('跨标签会话变化同步失效；同页无感续期不清空同主体快照', async t => {
  const f = fixture(t)
  await tick()
  const before = f.calls.length
  f.local.setItem('token', 'fake-refreshed-same-account')
  await tick()
  assert.equal(f.exposed.data.value.totalUsers, 15)
  assert.equal(f.calls.length, before)
  const event = new Event('storage')
  Object.assign(event, { key: 'token', storageArea: f.local })
  f.hostWindow.dispatchEvent(event)
  assert.deepEqual(f.exposed.data.value, {})
  assert.deepEqual(f.exposed.content.value, {})
  await tick()
  assert.equal(f.exposed.data.value.totalUsers, 15)
})
