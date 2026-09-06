import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')

test('数字解读共用整套规则，保存与清空按账号隔离，退出丢弃迟到确认', async () => {
  let allowed = true, token = 'A', modal
  const hooks = {}, data = new Map([['rebu:shuzi-history', '公共旧记录']]), writes = []
  const uni = { getStorageSync: k => data.get(k), setStorageSync: (k, v) => { writes.push(k); data.set(k, v) }, showModal: v => { modal = v } }
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), watch: () => {} },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map(k => [k, fn => { hooks[k] = fn }])),
    '@/utils/storage': { getToken: () => token },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: `00000000-0000-4000-8000-00000000000${token === 'A' ? 1 : 2}` }) } },
    '@/pkg-paipan2/lib/shuzi-data': { INPUT_KINDS: [{ id: 'phone', label: '测试' }], extractDigits: (_, raw) => ({ ok: true, digits: raw }) },
    './meihua-lite': {}, '@/utils/router': {},
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, uni, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const store = modules['./history'] = load(fs.readFileSync('apps/mobile/src/pkg-paipan2/shuzi/history.ts', 'utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan2/shuzi/index.vue', 'utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, input, digits, records, showHistory, analyze, openHistory, onClearHistory };')
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
  assert.equal(writes.length, 0)
  page.analyze(); await settle(); assert.equal(writes.length, 0)
  await page.preview.run(); page.input.value = '123456'; page.analyze(); page.analyze(); await settle()
  assert.equal(writes.length, 1); assert.equal(page.digits.value, '123456')
  page.openHistory(); await settle()
  assert.equal(page.input.value, '123456'); assert.equal(page.records.value.length, 1)
  page.onClearHistory(); hooks.onHide(); modal.success({ confirm: true }); await settle()
  assert.equal(writes.length, 1); assert.equal(page.digits.value, null); assert.equal(page.input.value, '')
  await page.preview.run(); page.onClearHistory(); modal.success({ confirm: true }); await settle()
  assert.equal(writes.length, 2); assert.equal(data.get('rebu:shuzi-history'), '公共旧记录')
  assert.ok(writes.every(k => k.endsWith(':account:00000000-0000-4000-8000-000000000001')))
  token = 'B'; await page.preview.run(); assert.equal(page.preview.allowed.value, false)
  assert.throws(() => store.clearShuziHistory(), /账号无法确认/)
  token = 'A'; allowed = false; await page.preview.run(); page.analyze(); await settle(); assert.equal(writes.length, 2)
})
