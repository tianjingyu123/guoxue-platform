import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
function fixture() {
  const storage = new Map(), exports = {}
  let response = { mode: 'native' }, offline = false
  const source = fs.readFileSync('apps/mobile/src/lib/paipan-runtime.ts', 'utf8')
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date,
    require: () => ({ legacyPaipanApi: { runtime: async () => { if (offline) throw new Error('offline'); return response } } }),
    uni: { getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value) },
  })
  return { storage, read: exports.hydratePaipanRuntime, response: value => { response = value }, offline: () => { offline = true } }
}

test('整套模式仅接受明确legacy或native，非法响应不猜测第三方模式', async () => {
  const f = fixture()
  assert.equal(await f.read(), 'native')
  for (const value of [{}, { mode: 'tool:bazi' }, { mode: null }, null]) {
    f.response(value)
    assert.equal(await f.read(), 'unknown')
  }
  f.response({ mode: 'legacy' }); assert.equal(await f.read(), 'legacy')
  f.response({}); assert.equal(await f.read(), 'unknown')
  f.offline(); assert.equal(await f.read(), 'unknown')
})

test('网络失败只接受有效时间内的模式快照', async () => {
  const f = fixture(); await f.read(); f.offline()
  assert.equal(await f.read(), 'native')
  for (const timestamp of [Date.now() + 60_000, Date.now() - 600_001, 0, NaN]) {
    f.storage.set('paipan:runtime-mode-observed-at', timestamp)
    assert.equal(await f.read(), 'unknown')
  }
})
