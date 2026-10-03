const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const vm = require('node:vm')
const mobileRequire = createRequire(path.resolve(__dirname, '../../apps/mobile/package.json'))
const ts = mobileRequire('typescript')
function fixture() {
  const values = new Map(), requests = []
  let now = Date.now()
  const timers = new Map()
  let nextTimer = 0
  const FakeDate = class extends Date { static now() { return now } }
  const env = { VITE_APP_CLIENT_KEY: 'test-xiaomi', VITE_APP_APPLICATION_ID: 'rebu', VITE_APP_CHANNEL_ID: 'xiaomi', VITE_APP_RESOURCE_VERSION: '1', VITE_API_URL: 'https://api.rebugx.cn' }
  const sandbox = {
    uni: { getStorageSync: key => values.get(key) || '', setStorageSync: (key, value) => values.set(key, value),
      removeStorageSync: key => values.delete(key), getStorageInfoSync: () => ({ keys: [...values.keys()] }),
      getAppBaseInfo: () => ({ appVersionCode: '253' }) },
    Date: FakeDate, URL, console, __importMeta: { env },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay }); return id },
    clearTimeout: id => timers.delete(id),
  }
  const cache = new Map()
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative)
    const exports = {}
    cache.set(relative, exports)
    const source = readFileSync(path.resolve(__dirname, '../../apps/mobile/src/' + relative + '.ts'), 'utf8').replaceAll('import.meta', '__importMeta')
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
    vm.runInNewContext(compiled, { ...sandbox, exports, require: name => {
      if (name === 'vue') return mobileRequire('vue')
      if (name === '@guoxue/shared') return mobileRequire('@guoxue/shared')
      if (name === '@/utils/request') return { apiGetOptionalAuth: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) }
      if (name === '@/utils/storage') return load('utils/storage')
      if (name === './app-distribution') return load('lib/app-distribution')
      if (name === './operation-request-policy') return load('lib/operation-request-policy')
      throw new Error(name)
    } })
    return exports
  }
  const config = load('lib/remote-config'), storage = load('utils/storage')
  const snapshot = (enabled, scope = { applicationId: 'rebu', channelId: 'xiaomi' }) => ({
    schemaVersion: 1, environment: 'production', revision: 'test-v1', generatedAt: '', cacheTtlSeconds: 60,
    features: { shop_checkout: enabled, live_start: enabled }, operations: { shop_checkout: enabled ? 'OPEN' : 'UNOPENED' }, ui: {}, maintenance: {}, scope,
  })
  return { config, storage, requests, values, snapshot, advance: ms => { now += ms; for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn() } } }
}
test('账户切换立即回安全默认值，旧账号在途配置不能覆盖新账号', async () => {
  const f = fixture()
  const first = f.config.hydrateRemoteConfig(true)
  f.storage.setToken('synthetic-a')
  f.storage.setUserInfo({ id: 'synthetic-user-a' })
  await Promise.resolve()
  const second = f.config.hydrateRemoteConfig(true)
  f.requests[0].resolve(f.snapshot(true))
  await first
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), false)
  f.requests.at(-1).resolve(f.snapshot(true))
  await second
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), true)
  f.storage.clearAuthSession()
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), false)
  await Promise.resolve()
  f.requests.at(-1).resolve(f.snapshot(false))
  await f.config.hydrateRemoteConfig()
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), false)
  assert.ok([...f.values.keys()].filter(key => key.includes('remote-config')).every(key => !key.includes('synthetic-a')))
})
test('过期缓存关闭写业务，网络失败也不恢复旧启用状态', async () => {
  const f = fixture(), pending = f.config.hydrateRemoteConfig(true)
  const visible = mobileRequire('vue').computed(() => f.config.isClientFeatureEnabled('shop_checkout'))
  f.requests[0].resolve(f.snapshot(true)); await pending
  assert.equal(visible.value, true)
  f.advance(61000)
  assert.equal(visible.value, false)
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), false)
  const failed = f.config.hydrateRemoteConfig(true)
  f.requests.at(-1).reject(new Error('断网')); await failed
  assert.equal(f.config.isClientFeatureEnabled('live_start'), false)
})

test('旧账号请求迟到失败不会关闭新账号的有效配置', async () => {
  const f = fixture(), first = f.config.hydrateRemoteConfig(true)
  f.storage.setToken('synthetic-new-account')
  await Promise.resolve()
  const second = f.config.hydrateRemoteConfig(true)
  f.requests.at(-1).resolve(f.snapshot(true)); await second
  f.requests[0].reject(new Error('旧请求迟到失败')); await first
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), true)
})
test('错误渠道配置不能进入当前构建缓存，响应更新触发 Vue 订阅', async () => {
  const f = fixture(), vue = mobileRequire('vue')
  const visible = vue.computed(() => f.config.isClientFeatureEnabled('shop_checkout'))
  assert.equal(visible.value, false)
  let pending = f.config.hydrateRemoteConfig(true)
  f.requests.at(-1).resolve(f.snapshot(true, { applicationId: 'rebu', channelId: 'huawei' })); await pending
  assert.equal(visible.value, false)
  pending = f.config.hydrateRemoteConfig(true)
  f.requests.at(-1).resolve(f.snapshot(true)); await pending
  assert.equal(visible.value, true)
  assert.ok([...f.values.keys()].some(key => key.includes('test-xiaomi:253:1')))
})

test('未知包内组件可省略，错误展示配置回默认且不破坏有效业务开关', async () => {
  const f = fixture(), pending = f.config.hydrateRemoteConfig(true)
  const raw = f.snapshot(true)
  raw.ui.presentation = { schemaVersion: 1, entries: [], navigation: [], pages: { home: [{ id: 'future-block', type: 'future-component' }, { id: 'safe-notice', type: 'notice', title: '仍能显示' }] } }
  f.requests.at(-1).resolve(raw); await pending
  assert.equal(f.config.getRemoteConfig().ui.presentation.pages.home.length, 1)
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), true)
  const next = f.config.hydrateRemoteConfig(true)
  raw.ui.presentation.script = 'alert(1)'
  f.requests.at(-1).resolve(raw); await next
  assert.equal(f.config.getRemoteConfig().ui.presentation.entries.length, 0)
  assert.equal(f.config.isClientFeatureEnabled('shop_checkout'), true)
})

test('错误图像 URL、重复入口、未知展示协议拒绝；不会执行表达式', () => {
  const { parseClientPresentation, EMPTY_PRESENTATION } = mobileRequire('@guoxue/shared')
  for (const imagePath of ['https://evil.invalid/x.png', '/assets/../x.png', '/assets/x.svg', 'javascript:alert(1)'])
    assert.throws(() => parseClientPresentation({ ...EMPTY_PRESENTATION, pages: { home: [{ id: 'banner-bad', type: 'banner', imagePath }] } }))
  assert.throws(() => parseClientPresentation({ ...EMPTY_PRESENTATION, schemaVersion: 2 }))
  assert.throws(() => parseClientPresentation({ ...EMPTY_PRESENTATION, entries: [{ id: 'course', visible: true, order: 0 }, { id: 'course', visible: false, order: 1 }] }))
})
