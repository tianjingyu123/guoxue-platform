import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const flush = () => new Promise(resolve => setImmediate(resolve))

function setup() {
  const state = { token: 'A', allowed: false, writes: [], fail: false, toasts: [], nav: [], modal: null, removes: [] }
  const data = new Map(['history', 'records', 'favorites'].map(k => [`rebu:qiming-${k}`, '公共旧数据']))
  const hooks = {}, candidate = { chars: [{ char: '合' }, { char: '成' }], score: 80, subScores: { yin: 1, xing: 2, yi: 3, li: 4 } }
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(k => [k, fn => { hooks[k] = fn }])),
    '@/utils/storage': { getToken: () => state.token }, '@/utils/router': { navigateTo: url => state.nav.push(url) },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed: state.allowed, subjectId: `00000000-0000-4000-8000-00000000000${state.token === 'A' ? 1 : 2}` }) } },
    '@/pkg-paipan2/lib/qiming-engine': { generateNames: () => ({ candidates: [candidate], profile: {} }) },
    '@/pkg-paipan2/lib/xingming-engine': { analyzeName: () => ({ candidate }) },
    '@/pkg-paipan2/lib/qiming-data': {}, '@/pkg-paipan2/lib/date-convert': { toSolarSafe: v => ({ ok: true, date: v }) },
  }
  function load(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, uni: { getStorageSync: k => structuredClone(data.get(k)), setStorageSync: (k, v) => { if (state.fail) throw Error('测试存储失败'); state.writes.push(k); data.set(k, structuredClone(v)) },
        removeStorageSync: k => { state.removes.push(k); data.delete(k) }, showToast: v => state.toasts.push(v.title), showModal: m => { state.modal = m } },
      require: name => { if (!(name in modules)) throw Error(name); return modules[name] },
    })
    return exports
  }
  for (const name of ['native-history-scope', 'history-core', 'private-history']) modules[`@/lib/paipan/${name}`] = modules[`./${name}`] = load(fs.readFileSync(`apps/mobile/src/lib/paipan/${name}.ts`, 'utf8'))
  modules['@/composables/useNativePreviewPage'] = load(fs.readFileSync('apps/mobile/src/composables/useNativePreviewPage.ts', 'utf8'))
  const store = modules['./store'] = modules['../store'] = load(fs.readFileSync('apps/mobile/src/pkg-paipan2/qiming/store.ts', 'utf8'))
  const page = (file, names) => load(fs.readFileSync(`apps/mobile/src/pkg-paipan2/qiming/${file}.vue`, 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1] + `\nexport { ${names} };`)
  return { state, hooks, data, candidate, store, page }
}

test('起名结果与详情收藏真实存储互通，返回不重存历史，选择同名幂等', async () => {
  const h = setup(), p = h.page('result', 'preview, result, favNames, onToggleFavorite, surname')
  h.hooks.onLoad({ payload: encodeURIComponent(JSON.stringify({ surname: '合', birth: '2026-01-01 12:00' })) })
  await p.preview.run(); assert.equal(h.state.writes.length, 0)
  h.state.allowed = true; await p.preview.run(); assert.equal(h.state.writes.length, 1)
  p.onToggleFavorite(h.candidate); p.onToggleFavorite(h.candidate); await flush()
  assert.equal(h.state.writes.length, 2); assert.equal(p.favNames.value.has('合成'), true); assert.equal(p.surname.value, '合')
  h.hooks.onHide(); assert.equal(p.result.value, null); await p.preview.run(); assert.equal(h.state.writes.length, 2)
  const d = h.page('detail', 'preview, favorite, fullName, onChoose, onToggleFavorite')
  h.hooks.onLoad({ name: encodeURIComponent('合成') }); await d.preview.run(); assert.equal(d.favorite.value, true)
  d.onChoose(); await flush(); assert.equal(h.state.writes.length, 2)
  d.onToggleFavorite(); await flush(); assert.equal(d.favorite.value, false); assert.equal(h.state.writes.length, 3)
  h.state.fail = true; d.onChoose(); await flush(); assert.equal(d.favorite.value, false)
  assert.equal(h.state.toasts.at(-1), '收藏未保存，请重试')
  h.state.token = 'B'; await d.preview.run(); assert.equal(d.fullName.value, ''); assert.equal(d.preview.allowed.value, false)
  for (const k of ['history', 'records', 'favorites']) assert.equal(h.data.get(`rebu:qiming-${k}`), '公共旧数据')
  assert.throws(() => h.store.toggleQimingFavorite({ name: '未授权' }), /账号无法确认/)
})

test('起名详情畸形编码不崩溃，切换为不允许时迟到收藏不写', async () => {
  const h = setup(); h.state.allowed = true
  const p = h.page('detail', 'preview, errMsg, onChoose, detail')
  h.hooks.onLoad({ name: '%' }); await p.preview.run(); assert.match(p.errMsg.value, /解析失败/)
  h.hooks.onLoad({ name: '合成' }); await p.preview.run()
  p.onChoose(); h.hooks.onHide(); await flush(); assert.equal(h.state.writes.length, 0); assert.equal(p.detail.value, null)
  await p.preview.run(); h.state.allowed = false; p.onChoose(); await flush(); assert.equal(h.state.writes.length, 0)
})

test('起名录入清空保持表单，历史页使用payload打开，隐藏后不删除', async () => {
  const h = setup(); h.state.allowed = true
  const p = h.page('index', 'preview, surname, fixChar, onClearHistory')
  await p.preview.run(); p.surname.value = '合'; p.fixChar.value = '成'; p.onClearHistory()
  h.hooks.onHide(); h.state.modal.success({ confirm: true }); await flush(); assert.equal(h.state.removes.length, 0)
  await p.preview.run(); p.surname.value = '合'; p.fixChar.value = '成'; p.onClearHistory(); h.state.modal.success({ confirm: true }); await flush()
  assert.equal(p.surname.value, '合'); assert.equal(p.fixChar.value, '成'); assert.equal(h.state.removes.length, 1)
  const list = h.page('history/index', 'preview, open, onDelete')
  await list.preview.run(); list.open({ raw: { surname: '合', birth: '2026-01-01 12:00' } })
  assert.equal(JSON.parse(decodeURIComponent(h.state.nav[0].split('?payload=')[1])).surname, '合')
  h.hooks.onHide(); list.onDelete(['unknown']); await flush(); assert.equal(h.state.writes.length, 0)
})
