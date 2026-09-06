import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const { ref, computed } = createRequire(resolve('apps/mobile/package.json'))('vue')
const compile = source => ts.transpileModule(source.replaceAll('import.meta', '({env:{VITE_API_URL:"https://pre-api.rebugx.cn/api/v1"}})'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText
const plain = value => JSON.parse(JSON.stringify(value))
const snapshot = (overrides = {}) => ({
  schemaVersion: 1, revision: 'rev-1', environment: 'staging', cacheTtlSeconds: 60,
  features: { client_module_live: true, client_share_mini_app: true, live_start: true },
  ui: { home: { bigCardInterval: 8 }, agentCard: { categoryColors: {} } },
  maintenance: { enabled: false }, ...overrides,
})
const defer = () => { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

function runtime() {
  let now = 1_800_000_000_000
  let token = ''
  let handler = () => Promise.resolve(snapshot())
  let calls = 0
  let nextTimer = 0
  const timers = new Map()
  const storage = new Map()
  const addTimer = (fn, delay, interval = false) => { const id = ++nextTimer; timers.set(id, { fn, at: now + delay, delay, interval }); return id }
  const context = {
    exports: {},
    require: id => {
      if (id === 'vue') return { ref }
      if (id === '@/utils/storage') return { getToken: () => token }
      if (id === '@/utils/request') return { apiGetOptionalAuth: () => { calls += 1; return handler() } }
      throw new Error(`未声明依赖 ${id}`)
    },
    Date: class extends Date { static now() { return now } },
    setTimeout: (fn, ms) => addTimer(fn, ms), clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => addTimer(fn, ms, true), clearInterval: id => timers.delete(id),
    uni: { getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, plain(value)) },
  }
  vm.runInNewContext(compile(fs.readFileSync('apps/mobile/src/lib/remote-config.ts', 'utf8')), context)
  const moduleContext = { exports: {}, require: () => context.exports }
  vm.runInNewContext(compile(fs.readFileSync('apps/mobile/src/lib/client-module-policy.ts', 'utf8')), moduleContext)
  return {
    api: context.exports, modules: moduleContext.exports, storage, timers,
    setToken: value => { token = value }, setHandler: value => { handler = value }, calls: () => calls,
    advance(ms) {
      now += ms
      for (const [id, timer] of [...timers]) {
        if (timer.at > now) continue
        if (timer.interval) timer.at = now + timer.delay
        else timers.delete(id)
        timer.fn()
      }
    },
    now: () => now,
  }
}

test('真实Vue计算属性随快照更新和回滚重算，不被独立UI缓存锁死', async () => {
  const r = runtime()
  const interval = computed(() => r.api.getRemoteConfig().ui.home.bigCardInterval)
  assert.equal(interval.value, 6)
  await r.api.hydrateRemoteConfig()
  assert.equal(interval.value, 8)
  r.setHandler(() => Promise.resolve(snapshot({ ui: { home: { bigCardInterval: 4 } } })))
  await r.api.hydrateRemoteConfig(true)
  assert.equal(interval.value, 4)
})

test('配置真正变化/回滚不需要重启或包版本变化', async () => {
  const r = runtime()
  await r.api.hydrateRemoteConfig()
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), true)
  r.setHandler(() => Promise.resolve(snapshot({ revision: 'rev-2', features: { client_module_live: false } })))
  await r.api.hydrateRemoteConfig(true)
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
  r.setHandler(() => Promise.resolve(snapshot({ revision: 'rollback-3' })))
  await r.api.hydrateRemoteConfig(true)
  assert.equal(r.api.getRemoteConfig().revision, 'rollback-3')
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), true)
})

test('服务端长TTL不能阻止敏感开关五分钟后的重新核验', async () => {
  const r = runtime()
  r.setHandler(() => Promise.resolve(snapshot({ cacheTtlSeconds: 3600 })))
  await r.api.hydrateRemoteConfig()
  r.advance(5 * 60 * 1000)
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
  await r.api.hydrateRemoteConfig()
  assert.equal(r.calls(), 2)
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), true)
})

test('并发拉取只请求一次，TTL内复用；强制刷新会读取新配置', async () => {
  const r = runtime(); const d = defer(); r.setHandler(() => d.promise)
  const first = r.api.hydrateRemoteConfig(); const second = r.api.hydrateRemoteConfig(true)
  assert.equal(first, second); assert.equal(r.calls(), 1)
  d.resolve(snapshot()); await first
  await r.api.hydrateRemoteConfig(); assert.equal(r.calls(), 1)
  r.setHandler(() => Promise.resolve(snapshot({ revision: 'rev-2' })))
  await r.api.hydrateRemoteConfig(true); assert.equal(r.calls(), 2)
})

test('长期前台断网五分钟后敏感开启状态失效，普通样式仍可用', async () => {
  const r = runtime(); await r.api.hydrateRemoteConfig()
  r.setHandler(() => Promise.reject(new Error('offline')))
  r.advance(299_999); assert.equal(r.api.isClientFeatureEnabled('client_module_live'), true)
  r.advance(1)
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
  assert.equal(r.api.isClientFeatureEnabled('client_share_mini_app'), false)
  assert.equal(r.api.getRemoteConfig().ui.home.bigCardInterval, 8)
  await r.api.hydrateRemoteConfig()
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
})

test('退出/切号即时重置灰度，账号快照不落磁盘', async () => {
  const r = runtime(); r.setToken('synthetic-account-a'); await r.api.hydrateRemoteConfig()
  assert.equal(r.storage.size, 0)
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), true)
  r.setToken('synthetic-account-b')
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
  r.setToken(''); assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
})

test('旧账号迟到响应不覆盖新账号，不清除新账号正在进行的请求', async () => {
  const r = runtime(); const a = defer(); const b = defer()
  r.setToken('synthetic-a'); r.setHandler(() => a.promise); const old = r.api.hydrateRemoteConfig()
  r.setToken('synthetic-b'); r.setHandler(() => b.promise); const fresh = r.api.hydrateRemoteConfig()
  a.resolve(snapshot()); await old
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
  assert.equal(r.api.hydrateRemoteConfig(), fresh)
  b.resolve(snapshot({ revision: 'b-1', features: { client_module_live: false } })); await fresh
  assert.equal(r.api.getRemoteConfig().revision, 'b-1')
})

test('缓存环境隔离；v1可能含账号灰度的旧缓存不再复用', () => {
  const r = runtime()
  r.storage.set('client:remote-config:v1:staging', { fetchedAt: r.now(), snapshot: snapshot() })
  r.storage.set('client:remote-config:v3:production:anonymous', { fetchedAt: r.now(), snapshot: snapshot() })
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
})

test('匿名缓存可用但过期敏感值安全关闭；未来时间戳拒绝', () => {
  const r = runtime()
  r.storage.set('client:remote-config:v3:staging:anonymous', { fetchedAt: r.now() - 300_001, snapshot: snapshot() })
  assert.equal(r.api.getRemoteConfig().ui.home.bigCardInterval, 8)
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
  const future = runtime()
  future.storage.set('client:remote-config:v3:staging:anonymous', { fetchedAt: future.now() + 1, snapshot: snapshot() })
  assert.equal(future.api.getRemoteConfig().revision, 'builtin-v1')
})

test('未知协议、环境混用、非布尔开关和任意样式不能开启能力', async () => {
  for (const invalid of [{ schemaVersion: 2 }, { environment: 'production' }]) {
    const r = runtime(); r.setHandler(() => Promise.resolve(snapshot(invalid))); await r.api.hydrateRemoteConfig()
    assert.equal(r.api.getRemoteConfig().revision, 'builtin-v1')
  }
  const r = runtime()
  r.setHandler(() => Promise.resolve(snapshot({ features: { client_module_live: 'true' }, ui: { home: { bigCardInterval: 99 }, agentCard: { categoryColors: { invalid: 'url(javascript:bad)' } } } })))
  await r.api.hydrateRemoteConfig()
  assert.equal(r.api.isClientFeatureEnabled('client_module_live'), false)
  assert.equal(r.api.getRemoteConfig().ui.home.bigCardInterval, 30)
  assert.equal(r.api.getRemoteConfig().ui.agentCard.categoryColors.invalid, undefined)
})

test('前台刷新幂等，进入后台停止周期请求', async () => {
  const r = runtime()
  r.api.startRemoteConfigRefresh(); r.api.startRemoteConfigRefresh()
  assert.equal([...r.timers.values()].filter(t => t.interval).length, 1)
  r.advance(60_000); await r.api.hydrateRemoteConfig(); assert.equal(r.calls(), 1)
  r.api.stopRemoteConfigRefresh(); r.advance(60_000); assert.equal(r.calls(), 1)
})

test('真实旧服务端缺少全部模块键时保留入口，不授予敏感能力', async () => {
  const r = runtime(); r.setHandler(async () => snapshot({ features: {} }))
  await r.api.hydrateRemoteConfig()
  for (const module of ['circle', 'video', 'live', 'ai', 'shop', 'member', 'merchant']) {
    assert.equal(r.modules.isClientModuleEnabled(module), true)
  }
  assert.equal(r.api.isClientFeatureEnabled('client_share_mini_app'), false)
  assert.equal(r.api.isClientFeatureEnabled('client_wechat_app_login'), false)
  assert.equal(r.api.isClientFeatureEnabled('circle_publish'), false)
})

test('模块明确关闭或格式错误仍停用，其他缺失模块不连带关闭', async () => {
  for (const value of [false, 'false', null]) {
    const r = runtime(); r.setHandler(async () => snapshot({ features: { client_module_circle: value } }))
    await r.api.hydrateRemoteConfig()
    assert.equal(r.modules.isClientModuleEnabled('circle'), false)
    assert.equal(r.modules.isClientModuleEnabled('video'), true)
  }
})

test('v2客户端合成的关闭值不遗留到新版本；新版本明确关闭缓存仍生效', () => {
  const r = runtime()
  r.storage.set('client:remote-config:v2:staging:anonymous', { fetchedAt: r.now(), snapshot: snapshot({features:{client_module_circle:false}}) })
  assert.equal(r.modules.isClientModuleEnabled('circle'), true)
  const fresh = runtime()
  fresh.storage.set('client:remote-config:v3:staging:anonymous', { fetchedAt: fresh.now(), snapshot: snapshot({features:{client_module_circle:false}}) })
  assert.equal(fresh.modules.isClientModuleEnabled('circle'), false)
})
