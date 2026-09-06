import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
function setup(directory = 'pkg-paipan2/liuyao') {
  const storage = new Map(); const hooks = {}; const navigations = []; const clipboard = []; let token = 'A'; let computes = 0
  let subjectId = A; let enabled = false
  const uni = { getStorageSync: key => structuredClone(storage.get(key)), setStorageSync: (key, value) => storage.set(key, structuredClone(value)), removeStorageSync: key => storage.delete(key), showToast: () => {}, showModal: options => options.success({ confirm: true }) }
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), watch: () => {}, nextTick: fn => Promise.resolve().then(fn) },
    '@dcloudio/uni-app': { onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn }, onLoad: fn => { hooks.load = fn }, onReady: fn => { hooks.ready = fn } },
    '@/utils/storage': { getToken: () => token },
    '@/utils/router': { navigateTo: url => navigations.push(url) },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed: enabled, subjectId }) } },
    '@/pkg-paipan2/lib/liuyao-data': { QIGUA_METHODS: [] },
    '@/pkg-paipan2/lib/liuyao-engine': { computeLiuyao: () => { computes++; return { chart: { lines: [], benShort: '乾', bianShort: '乾' } } } },
    '../lib/xiaochengtu-engine': { paiXiaoChengTu: () => { computes++; return { topic: '测试', dateLabel: '测试时间', benGua: { name: '乾' }, bianGua: { name: '乾' } } } },
    '@/pkg-paipan/lib/hepan-engine': { computeHepan: () => { computes++; return { totalScore: 80, aspects: [] } } },
    '@/pkg-paipan/lib/ziwei-engine': { computeZiwei: input => { computes++; return { input, adjusted: new Date(2026, 8, 5, 10, 0) } }, toZiweiChart: (result, name) => ({ clientName: name, input: result.input }) },
    '@/pkg-paipan/lib/bazi-engine': { cityLongitude: () => 116, cityLatitude: () => 40 },
    '@/pkg-paipan/lib/qizheng-engine': { computeQizheng: () => { computes++; return { ming: { zhi: '子', mansion: '室', mansionDeg: 1 }, shen: { zhi: '子', mansion: '室', mansionDeg: 1 }, enYongChouNan: { en: '金', yong: '木' }, meta: { ganzhi: [] } } } },
    '@/pkg-paipan/lib/daliuren-engine': { SHENJIANG_NAME: {}, computeLiuren: date => { computes++; return { sizhu: { day: { gan: '甲', zhi: '子' }, hour: { zhi: '子' } }, yuejiang: { zhi: '子' }, date: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() }, sanchuan: [], keti: [] } } },
    '@/pkg-paipan/lib/jinkoujue-engine': { ZHI: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'], paiJinKouJue: input => { computes++; return { topic: input.topic, difen: { zhi: input.difenZhi }, yuejiang: { zhi: '子' }, yongRole: '人元', pillars: { day: '甲子' }, keTi: [] } } },
    '@/pkg-paipan/lib/jinkoujue-data': { JKJ_KNOWLEDGE: [{ id: 'test', entries: [] }] },
    '@/pkg-paipan/lib/wannianli-engine': { buildAlmanac: () => { computes++; return { day: { lunarYear: '合成年份' } } } },
    '@/pkg-paipan/lib/zeji-engine': { findEventByTerm: term => ({ id: term }) },
    './xiaoliuren-data': { PALACES: ['大安'], GRID_ORDER: [0], getSizhu: () => ({ hour: { zi: 0 } }), getLunar: () => ({ m: 9, d: 5 }), paiPan: () => { computes++; return { hourPalace: 0, dayPalace: 0, palaces: [] } } },
    '@/pkg-paipan/lib/qimen-engine': { computeQimen: () => { computes++; return { ju: { label: '阳遁1局' } } } },
    './yinpan-core': { JU_OPTIONS: [] },
    '@/pkg-paipan/lib/xuankong-data': { currentPeriod: () => 9, MOUNTAINS: Array.from({ length: 24 }, (_, i) => `山${i}`), CN_NUM: ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'], computeChart: () => { computes++; return { sitting: '子', facing: '午', geju: '合成格局' } } },
    '@/utils/canvas/adapter': { renderToCanvas: async () => {} },
    '@/pkg-paipan/lib/date-convert': { toSolarSafe: input => ({ date: input, ok: true }) },
    '@/pkg-paipan/lib/lunar/index.js': { Solar: {} },
    '@/lib/paipan/ganzhi': { fourPillars: () => ({ year: { gan: '甲', zhi: '子' }, month: { gan: '甲', zhi: '子' }, day: { gan: '甲', zhi: '子' }, hour: { gan: '甲', zhi: '子' } }), GAN_WUXING: {}, ZHI_WUXING: {}, ZHIS: [] },
    '@/lib/paipan/jieqi': { formatJieqiRange: () => '' },
  }
  uni.setClipboardData = options => clipboard.push(options.data)
  function compile(source) {
    const exports = {}
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    vm.runInNewContext(code, { exports, uni, require: key => { if (!modules[key]) throw new Error(key); return modules[key] } })
    return exports
  }
  for (const [name, file] of [
    ['@/lib/paipan/native-history-scope', 'lib/paipan/native-history-scope.ts'],
    ['@/lib/paipan/history-core', 'lib/paipan/history-core.ts'],
    ['./liuyao-history', 'pkg-paipan2/liuyao/liuyao-history.ts'],
    ['@/composables/useNativePreviewPage', 'composables/useNativePreviewPage.ts'],
  ]) modules[name] = compile(fs.readFileSync(`apps/mobile/src/${file}`, 'utf8'))
  modules['./history-core'] = modules['@/lib/paipan/history-core']
  modules['./native-history-scope'] = modules['@/lib/paipan/native-history-scope']
  for (const [name, file] of [
    ['@/lib/paipan/private-history', 'lib/paipan/private-history.ts'],
    ['@/pkg-paipan/lib/hepan-data', 'pkg-paipan/lib/hepan-data.ts'],
    ['@/pkg-paipan/lib/meihua-data', 'pkg-paipan/lib/meihua-data.ts'],
    ['./hepan-history', 'pkg-paipan/hepan/hepan-history.ts'],
    ['./meihua-history', 'pkg-paipan/meihua/meihua-history.ts'],
    ['./ziwei-history', 'pkg-paipan/ziwei/ziwei-history.ts'],
    ['./yinpan-history', 'pkg-paipan/yinpan/yinpan-history.ts'],
    ['./xuankong-history', 'pkg-paipan/xuankong/xuankong-history.ts'],
    ['./qizheng-history', 'pkg-paipan/qizheng/qizheng-history.ts'],
    ['./daliuren-history', 'pkg-paipan/daliuren/daliuren-history.ts'],
    ['./xiaoliuren-history', 'pkg-paipan/xiaoliuren/xiaoliuren-history.ts'],
  ]) modules[name] = compile(fs.readFileSync(`apps/mobile/src/${file}`, 'utf8'))
  modules['../hepan-history'] = modules['./hepan-history']
  modules['../meihua-history'] = modules['./meihua-history']
  modules['../ziwei-history'] = modules['./ziwei-history']
  modules['../yinpan-history'] = modules['./yinpan-history']
  modules['../xuankong-history'] = modules['./xuankong-history']
  modules['../xiaoliuren-history'] = modules['./xiaoliuren-history']
  modules['../liuyao-history'] = modules['./liuyao-history']
  function page(file, names) {
    const script = fs.readFileSync(`apps/mobile/src/${directory}/${file}`, 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
    return compile(`${script}\nexport { ${names} };`)
  }
  return { storage, hooks, page, navigations, clipboard, computes: () => computes,
    permit: () => { enabled = true }, deny: () => { enabled = false },
    switchAccount: () => { token = 'B'; subjectId = B } }
}
const payload = encodeURIComponent(JSON.stringify({ year: 2026, month: 9, day: 5, hour: 10, minute: 0, methodKey: 'auto' }))

for (const tool of ['ziwei', 'xuankong']) test(`${tool}摘要复制：已有显示资格仍需重验，撤权不复制、不保留展示`, async () => {
  const p = setup(`pkg-paipan/${tool}`)
  const page = p.page('result.vue', tool === 'ziwei' ? 'preview, onShare, chart as content' : 'preview, onShare, params as content, customer')
  const input = tool === 'ziwei' ? { y: 2026, m: 9, d: 5, hour: 10, minute: 0, name: '合成姓名' } : { year: 2026, month: 9, day: 5, hour: 10, minute: 0, period: 9, sitting: 0, shuikou: 0, customer: '合成姓名' }
  p.hooks.load({ payload: encodeURIComponent(JSON.stringify(input)) }); p.permit(); await page.preview.run()
  assert.ok(page.content.value)
  if (tool === 'xuankong') page.customer.value = '当前改名'
  const before = JSON.stringify([...p.storage]); await page.onShare()
  assert.equal(p.clipboard.length, 1); assert.ok(page.content.value)
  if (tool === 'xuankong') assert.equal(page.customer.value, '当前改名')
  assert.equal(JSON.stringify([...p.storage]), before)
  p.deny(); await page.onShare(); assert.equal(p.clipboard.length, 1); assert.equal(page.content.value, null)
})

test('小六壬：起课资格、历史隔离与重开，撤权后不得保存或修改历史', async () => {
  const p = setup('pkg-paipan/xiaoliuren'); const key = `rebu:xiaoliuren-history:account:${A}`
  p.storage.set('rebu:xiaoliuren-history', [{ legacy: true }])
  const page = p.page('index.vue', 'preview, phase, matter, handleSubmit')
  p.hooks.load({}); await page.handleSubmit(); assert.equal(p.computes(), 0)
  p.permit(); await page.preview.run(); page.matter.value = '合成事项'; await page.handleSubmit()
  assert.equal(page.phase.value, 'result'); assert.equal(p.storage.get(key).length, 1)
  const before = JSON.stringify([...p.storage]); p.deny(); await page.handleSubmit()
  assert.equal(page.phase.value, 'input'); assert.equal(JSON.stringify([...p.storage]), before)
  const history = p.page('history/index.vue', 'preview, records, open, onPin, onDelete')
  p.permit(); await history.preview.run(); assert.equal(history.records.value.length, 1)
  const record = history.records.value[0]; await history.onPin([record.id]); assert.equal(history.records.value[0].pinned, true)
  await history.open({ raw: record }); const url = new URL(p.navigations[0], 'https://test.invalid')
  const reopened = p.page('index.vue', 'preview, phase, matter')
  p.hooks.load({ replay: url.searchParams.get('replay') }); assert.equal(reopened.phase.value, 'input')
  await reopened.preview.run(); assert.equal(reopened.phase.value, 'result'); assert.equal(reopened.matter.value, '合成事项')
  assert.equal(p.storage.get(key).length, 1)
  p.deny(); await history.onDelete([record.id]); assert.equal(p.storage.get(key).length, 1)
  p.permit(); await history.onDelete([record.id]); assert.equal(p.storage.get(key).length, 0)
  assert.deepEqual(p.storage.get('rebu:xiaoliuren-history'), [{ legacy: true }])
})

test('万年历：资格前不计算页头，隐藏后清空视图并拒绝迟到交互', async () => {
  const p = setup('pkg-paipan/wannianli')
  const page = p.page('index.vue', 'preview, headerSubtitle, tab, showEra, seedEvent, bodyScrollTop, onNav, openEra, onPickYiJi')
  assert.equal(page.headerSubtitle.value, ''); assert.equal(p.computes(), 0)
  await page.preview.run(); assert.equal(page.headerSubtitle.value, '')
  p.permit(); await page.preview.run(); assert.equal(page.headerSubtitle.value.includes('合成年份'), true)
  page.onPickYiJi('嫁娶'); assert.equal(page.tab.value, 'zeji'); assert.equal(page.seedEvent.value.id, '嫁娶')
  page.openEra(); assert.equal(page.showEra.value, true)
  p.hooks.hide(); await Promise.resolve()
  page.onNav('zeji'); page.openEra(); page.onPickYiJi('开市')
  assert.equal(page.tab.value, 'calendar'); assert.equal(page.showEra.value, false)
  assert.equal(page.seedEvent.value, null); assert.equal(page.bodyScrollTop.value, 0)
  assert.equal(page.headerSubtitle.value, ''); assert.equal(p.storage.size, 0)
})
test('工具说明页：核验前不显示查询工具名，撤权和换账号不恢复', async () => {
  const p = setup('pkg-paipan/tools'); const page = p.page('coming-soon.vue', 'preview, toolName')
  p.hooks.load({ name: encodeURIComponent('私有测试工具') }); assert.equal(page.toolName.value, '此功能')
  await page.preview.run(); assert.equal(page.toolName.value, '此功能')
  p.permit(); await page.preview.run(); assert.equal(page.toolName.value, '私有测试工具')
  p.hooks.hide(); assert.equal(page.toolName.value, '此功能')
  p.switchAccount(); await page.preview.run(); assert.equal(page.toolName.value, '此功能')
})

test('金口诀实际页面：随机地分重开不变，保存隔离且撤权不能分享或清空', async () => {
  const p = setup('pkg-paipan/jinkoujue'); const oldKey = 'rebu:jinkoujue-history'
  p.storage.set(oldKey, '[{"legacy":true}]')
  const entry = p.page('index.vue', 'preview, records, openHistory, clearHistory, openRecord')
  await entry.preview.run(); assert.equal(entry.records.value.length, 0)
  const input = { year: 2026, month: 9, day: 5, hour: 10, minute: 0, dm: 'random', dz: '午' }
  const page = p.page('result.vue', 'preview, result, q, saved, handleSave, handleShare')
  p.hooks.load({ payload: encodeURIComponent(JSON.stringify(input)) })
  await page.preview.run(); assert.equal(p.computes(), 0)
  p.permit(); await page.preview.run(); assert.equal(page.result.value.difen.zhi, '午')
  assert.equal(p.storage.size, 1)
  await page.handleSave(); const key = `${oldKey}:account:${A}`; const saved = p.storage.get(key)
  assert.equal(JSON.parse(saved).length, 1); assert.equal(page.saved.value, true)
  p.hooks.hide(); assert.equal(page.result.value, null)
  await page.preview.run(); await page.handleSave(); assert.equal(p.storage.get(key), saved)
  await page.handleShare(); assert.equal(p.clipboard.length, 1); assert.equal(p.clipboard[0].includes('http'), false)
  p.deny(); await page.handleShare(); assert.equal(p.clipboard.length, 1); assert.equal(page.result.value, null)
  await entry.clearHistory(); assert.equal(p.storage.get(key), saved)
  p.permit(); await entry.openHistory(); assert.equal(entry.records.value.length, 1)
  await entry.openRecord(entry.records.value[0]); const url = new URL(p.navigations[0], 'https://test.invalid')
  const reopened = p.page('result.vue', 'preview, result, handleSave')
  p.hooks.load({ payload: url.searchParams.get('payload') }); await reopened.preview.run()
  assert.equal(reopened.result.value.difen.zhi, '午')
  p.deny(); await reopened.handleSave(); assert.equal(p.storage.get(key), saved)
  p.permit(); p.switchAccount(); await reopened.preview.run(); assert.equal(reopened.result.value, null)
  assert.equal(p.storage.has(`${oldKey}:account:${B}`), false)
  assert.equal(p.storage.get(oldKey), '[{"legacy":true}]')
})

for (const tool of ['qizheng', 'daliuren']) test(`${tool}实际页面：核验前零计算，返回不重复保存，撤权不可复制或清空`, async () => {
  const p = setup(`pkg-paipan/${tool}`)
  const oldKey = `rebu:${tool}-history`; p.storage.set(oldKey, '[{"legacy":true}]')
  const entry = p.page('index.vue', 'preview, history, onClearHistory, openRecord')
  await entry.preview.run(); assert.equal(entry.history.value.length, 0)
  const page = p.page('result.vue', 'preview, params, onShare, loadError')
  p.hooks.load({ payload }); await page.preview.run(); assert.equal(p.computes(), 0)
  p.permit(); await page.preview.run(); assert.equal(page.loadError.value, '')
  const key = `${oldKey}:account:${A}`; const saved = p.storage.get(key)
  p.hooks.hide(); assert.equal(page.params.value, null)
  await page.preview.run(); assert.equal(p.storage.get(key), saved)
  await page.onShare(); assert.equal(p.clipboard.length, 1)
  p.deny(); await page.onShare(); assert.equal(p.clipboard.length, 1)
  assert.equal(page.params.value, null)
  entry.onClearHistory(); for (let n = 0; n < 10; n++) await Promise.resolve()
  assert.equal(p.storage.get(key), saved)
  p.permit(); await entry.preview.run(); assert.equal(entry.history.value.length, 1)
  await entry.openRecord(entry.history.value[0]); assert.equal(p.navigations.length, 1)
  p.switchAccount(); await page.preview.run(); assert.equal(page.params.value, null)
  assert.equal(p.storage.has(`${oldKey}:account:${B}`), false)
  assert.equal(p.storage.get(oldKey), '[{"legacy":true}]')
})

test('大六壬实际时辰切换：逐次核验，撤权后不计算不显示，不额外保存', async () => {
  const p = setup('pkg-paipan/daliuren')
  const page = p.page('result.vue', 'preview, params, r, hourOffset, nextHour, prevHour')
  p.hooks.load({ payload }); p.permit(); await page.preview.run()
  const before = JSON.stringify([...p.storage])
  await page.nextHour(); assert.equal(page.hourOffset.value, 1); assert.equal(page.r.value.date.hour, 12)
  await page.nextHour(); assert.equal(page.hourOffset.value, 2); assert.equal(page.r.value.date.hour, 14)
  await page.prevHour(); assert.equal(page.hourOffset.value, 1)
  assert.equal(JSON.stringify([...p.storage]), before)
  const computes = p.computes(); p.deny(); await page.nextHour()
  assert.equal(p.computes(), computes); assert.equal(page.r.value, null); assert.equal(page.params.value, null)
  assert.equal(JSON.stringify([...p.storage]), before)
})

test('紫微实际历史重开链接能被结果页解析，保留精确时间和真太阳时参数', async () => {
  const p = setup('pkg-paipan/ziwei'); const entry = p.page('index.vue', 'preview')
  await entry.preview.run(); assert.equal(p.storage.size, 0)
  p.storage.set('rebu:ziwei-history', [{ legacy: true }])
  const input = { name: '合成姓名', gender: '女', y: 2026, m: 9, d: 5, hour: 0, minute: 15, city: '北京', lng: 116.4, useTrueSolar: true }
  const first = p.page('result.vue', 'preview, chart, loadError')
  p.hooks.load({ payload: encodeURIComponent(JSON.stringify(input)) }); await first.preview.run()
  assert.equal(p.computes(), 0); p.permit(); await first.preview.run(); assert.equal(p.computes(), 1)
  const history = p.page('history/index.vue', 'preview, records, open'); await history.preview.run()
  assert.equal(history.records.value.length, 1)
  await history.open({ raw: history.records.value[0] })
  assert.equal(p.navigations.length, 1)
  const url = new URL(p.navigations[0], 'https://test.invalid')
  const reopened = p.page('result.vue', 'preview, chart, loadError')
  // URLSearchParams 解码一次，真实结果页仍兼容自身的 decodeURIComponent。
  p.hooks.load({ payload: url.searchParams.get('payload') }); await reopened.preview.run()
  assert.equal(reopened.loadError.value, ''); assert.equal(reopened.chart.value.clientName, input.name)
  assert.equal(reopened.chart.value.input.hour, 0); assert.equal(reopened.chart.value.input.minute, 15)
  assert.equal(reopened.chart.value.input.lng, 116.4); assert.equal(reopened.chart.value.input.useTrueSolar, true)
  assert.deepEqual(p.storage.get('rebu:ziwei-history'), [{ legacy: true }])
  p.deny(); await history.open({ raw: input }); assert.equal(p.navigations.length, 1)
})

for (const tool of ['hepan', 'meihua', 'yinpan', 'xuankong']) {
  test(`${tool} 实际入口/结果/历史：旧记录不迁入，核验后保存，撤权删除零写入`, async () => {
    const p = setup(`pkg-paipan/${tool}`)
    const keys = tool === 'meihua' ? ['rebu:meihua:history', 'rebu:meihua-history'] : [`rebu:${tool}-history`, `rebu:${tool}-records`]
    for (const key of keys) p.storage.set(key, JSON.stringify([{ legacy: true }]))
    const entry = p.page('index.vue', tool !== 'meihua' ? 'preview, onClearHistory as clear' : 'preview, clearHistory as clear')
    await entry.preview.run(); assert.equal(p.storage.size, 2)
    const resultNames = { hepan: 'preview, params', meihua: 'preview, ready, handleSave', yinpan: 'preview, params, handleSave, editedMatter', xuankong: 'preview, params, onNameDone, customer' }
    const result = p.page('result.vue', resultNames[tool])
    const person = { name: '合成姓名', gender: '男', year: 2026, month: 9, day: 5, hour: 10, minute: 0 }
    const input = tool === 'hepan' ? { scene: 'marriage', a: person, b: person } : { ...person, matter: '测试', mode: 'manual', yaos: '111111', moving: 1, period: 9, sitting: 0, shuikou: 0 }
    p.hooks.load({ payload: encodeURIComponent(JSON.stringify(input)) })
    await result.preview.run(); assert.equal(p.storage.size, 2)
    p.permit(); await result.preview.run()
    if (tool === 'meihua') await result.handleSave()
    assert.equal(p.storage.size, 3)
    if (tool === 'yinpan' || tool === 'xuankong') {
      const field = tool === 'yinpan' ? result.editedMatter : result.customer
      const save = tool === 'yinpan' ? result.handleSave : result.onNameDone
      field.value = '修改测试'; await save()
      const scoped = p.storage.get(`${keys[1]}:account:${A}`)
      assert.equal(scoped[0].params[tool === 'yinpan' ? 'matter' : 'customer'], '修改测试')
      const beforeSave = JSON.stringify([...p.storage]); field.value = '撤权后禁止修改'; p.deny(); await save()
      assert.equal(JSON.stringify([...p.storage]), beforeSave); p.permit()
    }
    for (const key of keys) assert.equal(p.storage.get(key), JSON.stringify([{ legacy: true }]))
    await entry.preview.run(); const beforeClear = JSON.stringify([...p.storage]); p.deny(); entry.clear()
    for (let n = 0; n < 10; n++) await Promise.resolve()
    assert.equal(JSON.stringify([...p.storage]), beforeClear); p.permit()
    const history = p.page('history/index.vue', 'preview, records, onPin, onDelete')
    // 阴盘按完整参数去重，改事项会新增记录；玄空改名仍覆盖同一组排盘参数。
    const expectedRecords = tool === 'yinpan' ? 2 : 1
    assert.equal(history.records.value.length, 0); await history.preview.run(); assert.equal(history.records.value.length, expectedRecords)
    const id = history.records.value[0].id; await history.onPin([id]); assert.equal(history.records.value[0].pinned, true)
    const before = JSON.stringify([...p.storage]); p.deny(); await history.onDelete([id])
    assert.equal(JSON.stringify([...p.storage]), before); assert.equal(history.records.value.length, 0)
    p.permit(); await history.onDelete([id]); assert.equal(history.records.value.length, expectedRecords - 1)
  })
}

test('实际小成图结果页：核验前无计算和存储，账号隔离且隐藏后不重复留存', async () => {
  const p = setup('pkg-paipan/xiaochengtu')
  const oldKey = 'rebu:xiaochengtu-history'
  p.storage.set(oldKey, '[{"id":99}]')
  const page = p.page('result.vue', 'preview, result, invalid')
  p.hooks.load({ payload }); await page.preview.run()
  assert.equal(p.computes(), 0); assert.equal(p.storage.size, 1)
  p.permit(); await page.preview.run()
  assert.equal(p.computes(), 1)
  const key = `${oldKey}:account:${A}`
  const record = JSON.parse(p.storage.get(key))[0]
  p.hooks.hide(); assert.equal(page.result.value, null)
  await page.preview.run()
  assert.equal(JSON.parse(p.storage.get(key)).length, 1)
  assert.equal(JSON.parse(p.storage.get(key))[0].id, record.id)
  p.switchAccount(); await page.preview.run()
  assert.equal(page.preview.allowed.value, false); assert.equal(page.result.value, null)
  assert.equal(p.storage.has(`${oldKey}:account:${B}`), false)
  assert.equal(p.storage.get(oldKey), '[{"id":99}]')
})

test('实际小成图结果页：损坏参数不计算不落盘', async () => {
  const p = setup('pkg-paipan/xiaochengtu'); const page = p.page('result.vue', 'preview, invalid')
  p.permit(); p.hooks.load({ payload: '%' }); await page.preview.run()
  assert.equal(page.invalid.value, true); assert.equal(p.computes(), 0); assert.equal(p.storage.size, 0)
})
test('实际结果页：onLoad不计算/落盘，资格通过才计算并保存，返回不重复', async () => {
  const p = setup(); const page = p.page('result.vue', 'preview, params, loadError')
  p.hooks.load({ payload }); assert.equal(p.computes(), 0); assert.equal(p.storage.size, 0)
  await page.preview.run(); assert.equal(p.computes(), 0); assert.equal(p.storage.size, 0)
  p.permit(); await page.preview.run(); assert.equal(p.computes(), 1); assert.equal(p.storage.size, 1)
  const record = [...p.storage.values()][0][0]; p.hooks.hide(); assert.equal(page.params.value, null)
  await page.preview.run(); assert.equal([...p.storage.values()][0].length, 1); assert.equal([...p.storage.values()][0][0].id, record.id)
})
test('实际结果页：同一页面换账号不重放上一账号参数', async () => {
  const p = setup(); const page = p.page('result.vue', 'preview, params'); p.hooks.load({ payload }); p.permit()
  await page.preview.run(); p.hooks.hide(); p.switchAccount(); await page.preview.run()
  assert.equal(page.preview.allowed.value, false); assert.equal(page.params.value, null); assert.equal(p.computes(), 1); assert.equal(p.storage.size, 1)
})
test('实际历史页：只在本次资格通过时读取，撤权清空页面不清除数据', async () => {
  const p = setup(); const result = p.page('result.vue', 'preview'); p.hooks.load({ payload }); p.permit(); await result.preview.run()
  const history = p.page('history/index.vue', 'preview, records')
  assert.equal(history.records.value.length, 0); await history.preview.run(); assert.equal(history.records.value.length, 1)
  p.deny(); await history.preview.run(); assert.equal(history.records.value.length, 0); assert.equal(p.storage.size, 1)
})
