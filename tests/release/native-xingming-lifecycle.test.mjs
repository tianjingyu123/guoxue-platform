import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))

function harness() {
  const state = { token: 'A', allowed: false, writes: 0, removals: [], nav: [], modal: null }
  const hooks = {}, data = new Map([['rebu:xingming-history', '公共旧记录'], ['rebu:xingming-records', '公共记录']])
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(k => [k, fn => { hooks[k] = fn }])),
    '@/utils/storage': { getToken: () => state.token }, '@/utils/router': { navigateTo: url => state.nav.push(url) },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed: state.allowed, subjectId: `00000000-0000-4000-8000-00000000000${state.token === 'A' ? 1 : 2}` }) } },
    '@/pkg-paipan2/lib/xingming-engine': { analyzeName: () => ({ candidate: { score: 80 } }) },
    '@/pkg-paipan2/lib/bazi-engine': { computeBazi: () => ({ zodiac: '测试', lunarDate: '测试年正月' }) },
    '@/pkg-paipan2/lib/date-convert': { toSolarSafe: v => ({ ok: true, date: v }) },
  }
  function load(source) {
    const exports = {}
    // 与项目 esnext 保持字符串迭代语义，不能用默认 ES5 把汉字展开编译为数组专用辅助函数。
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, uni: { getStorageSync: k => structuredClone(data.get(k)), setStorageSync: (k, v) => { state.writes++; data.set(k, structuredClone(v)) }, removeStorageSync: k => { state.removals.push(k); data.delete(k) }, showToast: () => {}, showModal: m => { state.modal = m } },
      require: name => { if (!(name in modules)) throw Error(name); return modules[name] },
    })
    return exports
  }
  for (const name of ['native-history-scope', 'history-core', 'private-history']) {
    modules[`@/lib/paipan/${name}`] = modules[`./${name}`] = load(fs.readFileSync(`apps/mobile/src/lib/paipan/${name}.ts`, 'utf8'))
  }
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const store = modules['./history'] = modules['../history'] = load(fs.readFileSync('apps/mobile/src/pkg-paipan2/xingming/history.ts', 'utf8'))
  function page(file, names) {
    const source = fs.readFileSync(`apps/mobile/src/pkg-paipan2/xingming/${file}.vue`, 'utf8')
    return load(source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + `\nexport { ${names} };`)
  }
  return { state, hooks, data, store, page }
}

test('姓名结果仅准入后保存，历史跳转参数可读取，返回不重复保存', async () => {
  const h = harness(), history = h.page('history/index', 'preview, open')
  h.state.allowed = true; await history.preview.run()
  history.open({ raw: { name: '测试姓名', gender: '女', birth: '1990-01-01 12:00' } })
  const payload = h.state.nav[0].split('?payload=')[1]
  assert.equal(JSON.parse(decodeURIComponent(payload)).name, '测试姓名')
  const p = h.page('result', 'preview, fullName, detail, birthInfo')
  h.hooks.onLoad({ payload }); h.state.allowed = false; await p.preview.run()
  assert.equal(h.state.writes, 0); assert.equal(p.detail.value, null)
  h.state.allowed = true; await p.preview.run(); assert.equal(h.state.writes, 1)
  assert.equal(p.fullName.value, '测试姓名')
  h.hooks.onHide(); assert.equal(p.fullName.value, ''); assert.equal(p.detail.value, null)
  h.hooks.onShow(); await flush(); assert.equal(h.state.writes, 1)
  h.state.token = 'B'; await p.preview.run(); assert.equal(p.preview.allowed.value, false)
  assert.equal(p.fullName.value, ''); assert.equal(h.state.writes, 1)
  assert.equal(h.data.get('rebu:xingming-history'), '公共旧记录'); assert.equal(h.data.get('rebu:xingming-records'), '公共记录')
  assert.throws(() => h.store.clearXingmingHistory(), /重新核验/)
})

test('姓名旧分散参数兼容；畸形payload显示错误，不保存', async () => {
  const h = harness(); h.state.allowed = true
  let p = h.page('result', 'preview, fullName, errMsg')
  h.hooks.onLoad({ name: '合成姓名', gender: '男', birth: '1990-01-01 12:00' })
  await p.preview.run(); assert.equal(p.fullName.value, '合成姓名'); assert.equal(h.state.writes, 1)
  p = h.page('result', 'preview, errMsg')
  h.hooks.onLoad({ payload: '%' }); await p.preview.run()
  assert.match(p.errMsg.value, /参数解析失败/); assert.equal(h.state.writes, 1)
})

test('姓名录入清空确认退出后失效；正常清空保留输入，不删除公共历史', async () => {
  const h = harness(); h.state.allowed = true
  const p = h.page('index', 'preview, fullName, birthDate, onClearHistory, onDateConfirm')
  await p.preview.run(); p.fullName.value = '合成姓名'; p.onClearHistory()
  h.hooks.onHide(); h.state.modal.success({ confirm: true }); await flush()
  assert.equal(h.state.writes, 0); assert.equal(h.state.removals.length, 0); assert.equal(p.fullName.value, '')
  p.onDateConfirm({ year: 2000, month: 2, day: 3, hour: 4, minute: 5 }); assert.equal(p.birthDate.value.year, 1990)
  await p.preview.run(); p.fullName.value = '重新输入'; p.onClearHistory(); h.state.modal.success({ confirm: true }); await flush()
  assert.equal(p.fullName.value, '重新输入'); assert.deepEqual(h.state.removals, ['rebu:xingming-records:account:00000000-0000-4000-8000-000000000001'])
  assert.equal(h.data.get('rebu:xingming-history'), '公共旧记录')
})
