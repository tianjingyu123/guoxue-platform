import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
function setup() {
  let token = 'session'; let reads = 0; let clears = 0
  const hooks = {}; const exports = {}
  const api = { nativeQaAccess: async () => ({ allowed: true }) }
  const code = ts.transpileModule(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(code, { exports, require: name => ({
    vue: { ref: value => ({ value }) },
    '@dcloudio/uni-app': { onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn } },
    '@/utils/storage': { getToken: () => token }, '@/lib/legacy-paipan-data': { legacyPaipanApi: api },
    '@/lib/paipan/native-history-scope': { withNativeHistoryScope: (_id, _token, action) => action() },
  })[name] })
  return { gate: exports.useNativePreviewPage(() => reads++, () => clears++), api, hooks,
    reads: () => reads, clears: () => clears, setToken: value => { token = value } }
}
test('资格前不读历史，确认后才读，隐藏清空并撤销显示', async () => {
  const p = setup(); assert.equal(p.reads(), 0); assert.equal(p.gate.allowed.value, false)
  assert.equal(await p.gate.run(), true); assert.equal(p.reads(), 1)
  p.hooks.hide(); assert.equal(p.gate.allowed.value, false); assert.ok(p.clears() >= 2)
})
test('无登录、失败、非true不读取或修改本地数据', async () => {
  for (const kind of ['guest', 'denied', 'offline']) {
    const p = setup(); let writes = 0
    if (kind === 'guest') p.setToken('')
    p.api.nativeQaAccess = async () => { if (kind === 'offline') throw new Error('offline'); return { allowed: false } }
    assert.equal(await p.gate.run(() => writes++), false)
    assert.equal(writes, 0); assert.equal(p.reads(), 0); assert.equal(p.gate.checking.value, false)
  }
})
test('隐藏、卸载、换账号后的迟到授权不触发本地动作', async () => {
  for (const event of ['hide', 'unload', 'token']) {
    const p = setup(); let release; let writes = 0
    p.api.nativeQaAccess = () => new Promise(resolve => { release = resolve })
    const pending = p.gate.run(() => writes++)
    if (event === 'token') p.setToken('other'); else p.hooks[event]()
    release({ allowed: true }); assert.equal(await pending, false); assert.equal(writes, 0)
  }
})
test('已有显示资格不能跳过下一次修改前的核验', async () => {
  const p = setup(); await p.gate.run(); let writes = 0
  p.api.nativeQaAccess = async () => ({ allowed: false })
  await p.gate.run(() => writes++); assert.equal(writes, 0); assert.equal(p.gate.allowed.value, false)
})
