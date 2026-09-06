import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
function setup() {
  let token = 'a'; const data = new Map(); const modules = {}
  const uni = { getStorageSync: key => structuredClone(data.get(key)), setStorageSync: (key, value) => data.set(key, structuredClone(value)), removeStorageSync: key => data.delete(key) }
  modules['@/utils/storage'] = { getToken: () => token }
  for (const [name, file] of [
    ['@/lib/paipan/native-history-scope', 'apps/mobile/src/lib/paipan/native-history-scope.ts'],
    ['@/lib/paipan/history-core', 'apps/mobile/src/lib/paipan/history-core.ts'],
    ['history', 'apps/mobile/src/pkg-paipan2/liuyao/liuyao-history.ts'],
  ]) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { exports, uni, require: key => { if (!modules[key]) throw new Error(key); return modules[key] } })
    modules[name] = exports
  }
  const scope = modules['@/lib/paipan/native-history-scope']
  return { data, history: modules.history, scope, setToken: value => { token = value },
    as: (subject, action) => scope.withNativeHistoryScope(subject, token, action) }
}
const params = { matter: '合成记录', year: 2026, month: 9, day: 5, hour: 10, minute: 0, methodKey: 'auto' }
test('两个获准账号读写与清空分别隔离，旧无归属记录原样保留', () => {
  const p = setup()
  p.data.set('rebu:liuyao-history', [{ privateLegacy: true }]); p.data.set('rebu:liuyao-records', [{ privateLegacy: true }])
  p.as(A, () => { assert.equal(p.history.loadLiuyaoHistory().length, 0); p.history.saveLiuyaoHistory(params, 'A') })
  p.setToken('b'); p.as(B, () => {
    assert.equal(p.history.loadLiuyaoHistory().length, 0); p.history.saveLiuyaoHistory(params, 'B'); p.history.clearLiuyaoHistory()
  })
  p.setToken('a'); p.as(A, () => { assert.equal(p.history.loadLiuyaoHistory()[0].summary, 'A') })
  assert.deepEqual(p.data.get('rebu:liuyao-history'), [{ privateLegacy: true }])
  assert.deepEqual(p.data.get('rebu:liuyao-records'), [{ privateLegacy: true }])
})
test('作用域外不读历史且拒绝修改，不把授权留在模块缓存', () => {
  const p = setup(); p.as(A, () => p.history.saveLiuyaoHistory(params, 'A'))
  assert.equal(p.history.loadLiuyaoHistory().length, 0)
  assert.throws(() => p.history.clearLiuyaoHistory(), /重新核验/)
  assert.throws(() => p.as(A, () => { throw new Error('local failure') }), /local failure/)
  assert.equal(p.scope.nativeHistoryKey('test'), null)
})
test('旧令牌和不合法账号ID不能建立作用域', () => {
  const p = setup(); let called = false
  p.setToken('b')
  assert.throws(() => p.scope.withNativeHistoryScope(A, 'a', () => { called = true }), /无法确认/)
  assert.throws(() => p.as('../shared', () => { called = true }), /无法确认/)
  assert.equal(called, false); assert.equal(p.data.size, 0)
})
