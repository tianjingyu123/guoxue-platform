import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
function setup() {
  const page = fs.readFileSync('apps/mobile/src/pages/paipan/index.vue', 'utf8')
  const body = page.slice(page.indexOf('async function loadPaipanEntry()'), page.indexOf('function paipanReturnPath()'))
  let token = 'local-session'; let checks = 0; const navigations = []
  const context = {
    entryGeneration: 0, previewNeedsRecheck: false, nativeQaRequested: false,
    entryTarget: 'tool', entryStationId: '',
    getToken: () => token, getFavorites: () => [], loadPlatformAgents: async () => {},
    hydratePaipanRuntime: async () => 'native',
    consumePaipanColdTarget: () => null,
    legacyPaipanApi: { nativeQaAccess: async () => { checks++; return { allowed: true } }, entry: async () => ({ mode: 'legacy', url: 'https://example.invalid/entry' }) },
    stageLegacyPaipanEntry: () => {}, uni: { navigateTo: value => navigations.push(value), redirectTo: value => navigations.push(value) },
    ...Object.fromEntries(['entryLoading', 'entryError', 'allowNative', 'qaNotFound', 'loginRequired', 'legacyRouting', 'favIds'].map(k => [k, { value: false }])),
  }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context)
  return { context, setToken: value => { token = value }, checks: () => checks, navigations }
}
test('公开native模式仍需私有资格，不登录不发探针', async () => {
  const p = setup(); p.setToken(''); await p.context.loadPaipanEntry()
  assert.equal(p.context.allowNative.value, false); assert.equal(p.checks(), 0)
  assert.equal(p.context.entryError.value, '页面不存在')
})
test('拒绝、网络失败或非严格true均不展示；旧快照native也不能绕过', async () => {
  for (const response of [{ allowed: false }, { allowed: 'true' }, null]) {
    const p = setup(); p.context.legacyPaipanApi.nativeQaAccess = async () => {
      if (!response) throw new Error('offline'); return response
    }
    await p.context.loadPaipanEntry(); assert.equal(p.context.allowNative.value, false)
    assert.equal(p.context.entryError.value, '页面不存在')
  }
})
test('本次合格才展示，显式QA与入口native也使用同一检查', async () => {
  for (const mode of ['runtime', 'qa', 'entry']) {
    const p = setup()
    if (mode === 'qa') p.context.nativeQaRequested = true
    if (mode === 'entry') {
      p.context.hydratePaipanRuntime = async () => 'legacy'
      p.context.legacyPaipanApi.entry = async () => ({ mode: 'native' })
    }
    await p.context.loadPaipanEntry(); assert.equal(p.context.allowNative.value, true); assert.equal(p.checks(), 1)
  }
})
test('换账号或页面隐藏后的迟到响应不能恢复资格', async () => {
  for (const invalidate of ['token', 'generation']) {
    const p = setup(); let release; let entered
    const started = new Promise(resolve => { entered = resolve })
    p.context.legacyPaipanApi.nativeQaAccess = () => new Promise(resolve => { release = resolve; entered() })
    const pending = p.context.loadPaipanEntry(); await started
    if (invalidate === 'token') p.setToken('new-session'); else p.context.entryGeneration++
    release({ allowed: true }); await pending; assert.equal(p.context.allowNative.value, false)
  }
})
test('既有排盘入口不受新工具开关影响，不触发预览探针', async () => {
  const p = setup(); p.context.hydratePaipanRuntime = async () => 'legacy'
  await p.context.loadPaipanEntry(); assert.equal(p.checks(), 0)
  assert.equal(p.navigations.length, 1); assert.equal(p.navigations[0].url, '/pkg-common/legacy-paipan/index')
})

test('冷链接仅资格通过后恢复，跳转失败显示错误且不自动重复', async () => {
  const p = setup(); let consumed = 0
  p.context.consumePaipanColdTarget = () => { consumed++; return '/pkg-paipan/bazi/result?id=synthetic' }
  p.context.legacyPaipanApi.nativeQaAccess = async () => ({ allowed: false })
  await p.context.loadPaipanEntry(); assert.equal(consumed, 0); assert.equal(p.navigations.length, 0)
  p.context.legacyPaipanApi.nativeQaAccess = async () => ({ allowed: true })
  await p.context.loadPaipanEntry(); assert.equal(consumed, 1); assert.equal(p.navigations.length, 1)
  p.navigations[0].fail(); assert.match(p.context.entryError.value, /暂时无法打开/)
  assert.equal(p.context.allowNative.value, false)
})
