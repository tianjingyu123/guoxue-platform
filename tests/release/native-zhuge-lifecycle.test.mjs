import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture(file) {
  let allowed = true, token = 'A', engine, calculations = 0, writes = 0
  const hooks = {}, navigations = [], data = new Map([['rebu:zhuge-history','[]']])
  const realEngine = { paiZhuge: input => { calculations++; return { input, signNumber: 1, sign: { luck: '合成' } } } }
  engine = realEngine
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateTo: url => navigations.push(url) },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, uni: { showToast: () => {}, getStorageSync: k => data.get(k), setStorageSync: (k,v) => { writes++; data.set(k,v) } },
      require: name => { if (name === '@/pkg-paipan2/lib/zhuge-engine') return engine; if (!(name in modules)) throw Error(name); return modules[name] },
    })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts','utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts','utf8'))
  modules['./history'] = load(fs.readFileSync('apps/mobile/src/pkg-paipan2/zhuge/history.ts','utf8'))
  const source = fs.readFileSync(`apps/mobile/src/pkg-paipan2/zhuge/${file}.vue`,'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + (file === 'index' ? '\nexport { preview, chars, submit };' : '\nexport { preview, result, errMsg };'))
  return { page, hooks, data, navigations, delay: value => { engine = value }, realEngine, switch: () => { token = 'B' }, deny: () => { allowed = false }, counts: () => ({ calculations, writes }) }
}
for (const cancel of ['hide', 'account', 'deny']) test(`诸葛签库延迟加载在${cancel}后不计算不跳转`, async () => {
  const f = fixture('index'); await f.page.preview.run(); f.page.chars.value = '天地人'
  let finish; f.delay(new Promise(resolve => { finish = resolve })); const work = f.page.submit(); await flush()
  if (cancel === 'hide') f.hooks.onHide(); else if (cancel === 'account') f.switch(); else f.deny()
  finish(f.realEngine); await work; assert.equal(f.counts().calculations, 0); assert.equal(f.navigations.length, 0)
})
test('诸葛正常预检一次后跳转，结果返回不重复保存', async () => {
  const entry = fixture('index'); await entry.page.preview.run(); entry.page.chars.value = '天地人'
  await Promise.all([entry.page.submit(), entry.page.submit()]); assert.equal(entry.navigations.length, 1)
  const f = fixture('result'); f.hooks.onLoad({ input: '天地人' }); await f.page.preview.run()
  assert.equal(f.counts().writes, 1); f.hooks.onHide(); assert.equal(f.page.result.value, null)
  f.hooks.onShow(); await flush(); assert.equal(f.counts().writes, 1)
  assert.equal(f.data.get('rebu:zhuge-history'), '[]')
})
test('诸葛畸形编码显示参数错误而非页面崩溃', async () => {
  const f = fixture('result'); f.hooks.onLoad({ input: '%' }); await f.page.preview.run()
  assert.equal(f.page.result.value, null); assert.ok(f.page.errMsg.value); assert.equal(f.counts().writes, 0)
})
