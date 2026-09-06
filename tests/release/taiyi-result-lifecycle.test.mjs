import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))
function fixture(tool = 'taiyi', file = 'result') {
  let allowed = false, token = 'A', delayed = null, calculations = 0, writes = 0, modal = null
  const hooks = {}
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), watch: () => {} },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token },
    '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => delayed ? await delayed : { allowed, subjectId: '00000000-0000-4000-8000-000000000001' } } },
    '@/pkg-paipan/lib/taiyi-engine': { paiTaiyi: () => { calculations++; return { dunType: '测试', juNumber: 1 } } },
    './taiyi-history': { saveTaiyiHistory: () => { writes++ }, loadTaiyiHistory: () => [], clearTaiyiHistory: () => { writes++ } },
    '@/pkg-paipan/lib/feigong-engine': { paiFeigong: () => { calculations++; return { qinglongZhi: '合成', methodLabel: '合成起局' } } },
    './feigong-history': { saveFeigongHistory: () => { writes++ }, loadFeigongHistory: () => [], clearFeigongHistory: () => { writes++ } },
    '@/pkg-paipan/lib/chuanren-engine': { SHENGXIAO: [], paiChuanren: () => { calculations++; return { qimen: { ju: { label: '合成' } }, liuren: { yuejiang: { zhi: '子' }, sizhu: { hour: { zhi: '午' } } } } } },
    './chuanren-history': { saveChuanrenHistory: () => { writes++ }, loadChuanrenHistory: () => [], clearChuanrenHistory: () => { writes++ } },
    './yinpan-mingli-history': { saveMingliHistory: () => { writes++ }, loadMingliHistory: () => [], clearMingliHistory: () => { writes++ } },
    '@/pkg-paipan/lib/qimen-engine': { mingliJu: () => ({ isYang: true, num: 1 }), computeQimen: () => { calculations++; return { ju: { label: '合成局' } } } },
    '@/pkg-paipan/lib/bazi-engine': {},
    '@/lib/paipan/ganzhi': { trueSolarTime: d => d },
    '@/lib/paipan/jieqi': {},
    '@/pkg-paipan/yinpan/yinpan-core': { JU_OPTIONS: [], DIZHI: [] },
    '@/pkg-paipan/lib/date-convert': { toSolarSafe: () => ({ ok: true }) },
  }
  const load = source => {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, uni: { showModal: options => { modal = options }, showToast: () => {} }, require: name => { if (!(name in modules)) throw Error(name); return modules[name] } })
    return exports
  }
  modules['@/lib/paipan/native-history-scope'] = load(fs.readFileSync('apps/mobile/src/lib/paipan/native-history-scope.ts', 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const source = fs.readFileSync(`apps/mobile/src/pkg-paipan/${tool}/${file}.vue`, 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const page = load(source + (file === 'index' ? '\nexport { preview, onClearHistory };' : tool === 'yinpan-mingli' ? '\nexport { preview, params as result, handleSave };' : tool === 'taiyi' ? '\nexport { preview, result, topic };' : '\nexport { preview, r as result, q as topic };'))
  const query = { payload: encodeURIComponent(JSON.stringify({ year: 2026, month: 9, day: 5, hour: 12, minute: 0, topic: '合成事项' })) }
  return { hooks, page, query, permit: () => { allowed = true }, deny: () => { allowed = false }, confirm: () => modal.success({ confirm: true }), delay: value => { delayed = value }, switchAccount: () => { token = 'B' }, counts: () => ({ calculations, writes }) }
}

for (const tool of ['taiyi', 'feigong', 'chuanren', 'yinpan-mingli']) test(`${tool}清空弹窗打开后隐藏或撤权，确认不得执行写入`, async () => {
  for (const cancel of ['hide', 'deny', 'reshow', 'account']) {
    const f = fixture(tool, 'index')
    f.permit(); await f.page.preview.run(); f.page.onClearHistory()
    if (cancel === 'hide') f.hooks.onHide()
    else if (cancel === 'reshow') { f.hooks.onHide(); await f.page.preview.run() }
    else if (cancel === 'account') f.switchAccount()
    else f.deny()
    f.confirm(); await flush()
    assert.equal(f.counts().writes, 0)
  }
})

for (const tool of ['taiyi', 'feigong', 'chuanren', 'yinpan-mingli']) test(`${tool}当前会话明确确认可以清空且重复回调只写一次`, async () => {
  const f = fixture(tool, 'index')
  f.permit(); await f.page.preview.run(); f.page.onClearHistory()
  f.confirm(); f.confirm(); await flush()
  assert.equal(f.counts().writes, 1)
})

test('真实太乙结果脚本：未获准不计算，首次保存一次，返回重算不重复保存', async () => {
  const f = fixture()
  f.hooks.onLoad(f.query); await flush()
  assert.deepEqual(f.counts(), { calculations: 0, writes: 0 })
  f.permit(); await f.page.preview.run()
  assert.deepEqual(f.counts(), { calculations: 1, writes: 1 })
  f.hooks.onHide(); assert.equal(f.page.result.value, null); assert.equal(f.page.topic.value, '')
  f.hooks.onShow(); await flush()
  assert.deepEqual(f.counts(), { calculations: 2, writes: 1 })
})

test('命理奇门自动保存一次，手动保存撤权后不写，隐藏清除命主参数', async () => {
  const f = fixture('yinpan-mingli')
  f.hooks.onLoad(f.query); await flush()
  assert.equal(f.counts().writes, 0)
  f.permit(); await f.page.preview.run()
  assert.equal(f.counts().writes, 1)
  f.hooks.onHide(); assert.equal(f.page.result.value, null)
  f.hooks.onShow(); await flush(); assert.equal(f.counts().writes, 1)
  f.page.handleSave(); await flush(); assert.equal(f.counts().writes, 2)
  f.deny(); f.page.handleSave(); await flush()
  assert.equal(f.counts().writes, 2)
  assert.equal(f.page.result.value, null)
})

for (const tool of ['feigong', 'chuanren']) test(`${tool}真实结果脚本：资格控制计算，返回不重复保存，隐藏立即清结果`, async () => {
  const f = fixture(tool)
  f.hooks.onLoad(f.query); await flush()
  assert.deepEqual(f.counts(), { calculations: 0, writes: 0 })
  f.permit(); await f.page.preview.run()
  assert.deepEqual(f.counts(), { calculations: 1, writes: 1 })
  f.hooks.onHide(); assert.equal(f.page.result.value, null)
  f.hooks.onShow(); await flush()
  assert.deepEqual(f.counts(), { calculations: 2, writes: 1 })
})

test('真实太乙结果脚本：隐藏或换账号后的迟到资格不计算和保存', async () => {
  for (const cancel of ['hide', 'account']) {
    const f = fixture(); let finish
    f.delay(new Promise(resolve => { finish = resolve }))
    f.hooks.onLoad(f.query)
    if (cancel === 'hide') f.hooks.onHide(); else f.switchAccount()
    finish({ allowed: true, subjectId: '00000000-0000-4000-8000-000000000001' })
    await flush()
    assert.deepEqual(f.counts(), { calculations: 0, writes: 0 })
    assert.equal(f.page.result.value, null)
  }
})
