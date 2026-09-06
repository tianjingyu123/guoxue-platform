import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture() {
  let allowed = true, token = 'A', imageCallback, measureCallback
  const hooks = {}, saved = [], modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), getCurrentInstance: () => null },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onReady', 'onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/pkg-paipan/lib/luopan-data': { PLATE_STYLES: [{ id: 'sanyuan' }], mountainCenterDeg: () => 180 },
    '@/pkg-paipan/lib/xuankong-data': { MOUNTAINS: Array(24).fill('合成') },
    './lijichi-history': { saveLijichiHistory: value => { saved.push(value) } },
  }
  const selector = { in: () => selector, select: () => selector, boundingClientRect: () => selector, exec: fn => { measureCallback = fn } }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, uni: { chooseImage: options => { imageCallback = options.success }, createSelectorQuery: () => selector, showToast: () => {} },
      require: name => { if (!(name in modules)) throw Error(name); return modules[name] },
    })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts','utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts','utf8'))
  const source = fs.readFileSync('apps/mobile/src/pkg-paipan/lijichi/result.vue','utf8')
  const page = load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + '\nexport { preview, customer, fpUrl, heading, note, save, chooseFloorplan, measureStage, stageCenter };')
  hooks.onLoad({ payload: encodeURIComponent(JSON.stringify({ customer: '合成客户', sitting: 1, heading: 42, note: '合成笔记' })) })
  return { page, hooks, saved, choose: () => imageCallback({ tempFilePaths: ['local-synthetic.png'] }), measure: () => measureCallback([{ left: 1, top: 1, width: 100 }]), deny: () => { allowed = false }, switch: () => { token = 'B' } }
}
test('立极尺保存当前测量快照，正常选择图片可见且保存后保留', async () => {
  const f = fixture(); await f.page.preview.run(); f.page.chooseFloorplan(); f.choose()
  assert.equal(f.page.fpUrl.value, 'local-synthetic.png')
  f.page.save(); f.page.save(); await flush()
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].heading, 42)
  assert.equal(f.page.note.value, '合成笔记'); assert.equal(f.page.fpUrl.value, 'local-synthetic.png')
})
for (const cancel of ['hide', 'account', 'reshow']) test(`立极尺${cancel}后迟到图片和测量不恢复`, async () => {
  const f = fixture(); await f.page.preview.run(); f.page.chooseFloorplan(); f.page.measureStage()
  if (cancel === 'hide') f.hooks.onHide(); else if (cancel === 'account') f.switch(); else { f.hooks.onHide(); await f.page.preview.run() }
  f.choose(); f.measure(); assert.equal(f.page.fpUrl.value, ''); assert.equal(f.page.stageCenter, null)
})
test('立极尺整套关闭后保存不写入', async () => {
  const f = fixture(); await f.page.preview.run(); f.deny(); f.page.save(); await flush(); assert.equal(f.saved.length, 0)
})
