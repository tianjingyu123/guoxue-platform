import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import vm from 'node:vm'

const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
function setup(extraRouter = {}) {
  let enabled = false, hydrate = async () => {}, calls = 0
  const guards = []
  const context = { exports: {}, require(id) {
    if (id.endsWith('/remote-config')) return { hydrateRemoteConfig: () => { calls++; return hydrate() } }
    if (id.endsWith('/client-module-policy')) return {
      clientModuleForRoute: path => /^\/(pages\/circles|pkg-circle)(\/|\?)/.test(path) ? 'circle' : null,
      clientFeatureUnavailableRoute: module => `/pkg-common/feature-unavailable/index?module=${module}`,
      isClientModuleEnabled: () => enabled,
    }
    throw new Error(id)
  } }
  vm.runInNewContext(ts.transpileModule(readFileSync('apps/mobile/src/lib/client-module-h5-history-guard.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context)
  const router = { beforeEach: guard => guards.push(guard), ...extraRouter }
  context.exports.installClientModuleH5HistoryGuard(router)
  context.exports.installClientModuleH5HistoryGuard(router)
  return { guards, calls: () => calls, enabled: value => { enabled = value }, hydrate: value => { hydrate = value } }
}
test('关闭模块的直达和历史恢复均进入停用页，开启后保留原目标', async () => {
  const r = setup(); assert.equal(r.guards.length, 1)
  for (const fullPath of ['/pages/circles/index', '/pkg-circle/circles/detail?id=synthetic']) {
    assert.equal(await r.guards[0]({ fullPath }), '/pkg-common/feature-unavailable/index?module=circle')
  }
  r.enabled(true)
  assert.equal(await r.guards[0]({ fullPath: '/pages/circles/index' }), true)
})
test('首页与停用页不请求配置、不产生重定向循环', async () => {
  const r = setup()
  for (const fullPath of ['/pages/index/index', '/pkg-common/feature-unavailable/index?module=circle']) {
    assert.equal(await r.guards[0]({ fullPath }), true)
  }
  assert.equal(r.calls(), 0)
})
test('慢配置不得把已返回首页的用户重新拉入停用页', async () => {
  const r = setup(); let finish
  r.hydrate(() => new Promise(resolve => { finish = resolve }))
  const pending = r.guards[0]({ fullPath: '/pages/circles/index' })
  assert.equal(await r.guards[0]({ fullPath: '/pages/index/index' }), true)
  finish(); assert.equal(await pending, false)
})
test('配置异常不放开关闭模块', async () => {
  const r = setup(); r.hydrate(async () => { throw new Error('offline') })
  assert.equal(await r.guards[0]({ fullPath: '/pages/circles/index' }), '/pkg-common/feature-unavailable/index?module=circle')
})
test('首个导航已开始时在 ready 后补验，使用 replace 且只安装一次', async () => {
  const replacements = []
  let ready
  setup({ isReady: () => new Promise(resolve => { ready = resolve }),
    currentRoute: { value: { fullPath: '/pages/circles/index' } },
    replace: async path => { replacements.push(path) },
  })
  ready()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(replacements, ['/pkg-common/feature-unavailable/index?module=circle'])
})
test('冷启动补验等待期间用户离开，不覆盖新页面', async () => {
  const replacements = [], currentRoute = { value: { fullPath: '/pages/circles/index' } }
  let ready, finish
  const r = setup({ isReady: () => new Promise(resolve => { ready = resolve }), currentRoute,
    replace: async path => { replacements.push(path) },
  })
  r.hydrate(() => new Promise(resolve => { finish = resolve }))
  ready(); await new Promise(resolve => setImmediate(resolve))
  currentRoute.value.fullPath = '/pages/index/index'
  await r.guards[0](currentRoute.value)
  finish(); await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(replacements, [])
})
