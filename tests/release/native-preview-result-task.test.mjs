import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
const A = '00000000-0000-4000-8000-000000000001'
function setup(tool, query = {}) {
  let token = 'A'; let enabled = false; let computations = 0; let saves = 0
  let paused = false; let release
  const hooks = {}; const storage = new Map(); const toasts = []
  const value = { dunType: 'yang', juNumber: 1, zhiFu: '天心', zhiShiMen: '开门', jieQi: '白露', gongs: [] }
  const wait = () => { if (!paused) return Promise.resolve(); paused = false; return new Promise(resolve => { release = resolve }) }
  const api = { calculate: async () => { computations++; await wait(); return value }, save: async () => { saves++; await wait(); return { id: 'synthetic-record' } } }
  api.createRecord = api.save
  const modules = {
    vue: { ref: value => ({ value }), reactive: value => value, computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['Load', 'Show', 'Hide', 'Unload'].map(name => [`on${name}`, fn => { hooks[name.toLowerCase()] = fn }])),
    '@/utils/storage': { getToken: () => token }, '@/utils/router': { navigateTo: () => {} },
    '@/lib/brand': { BRAND: {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed: enabled, subjectId: A }) } },
    [`@/lib/${tool === 'bazi' ? 'bazi-result' : tool}-data`]: { [`${tool}Api`]: api },
    '@/pkg-paipan/lib/qimen-adapter': { computeQimenLocal: () => { computations++; return value } },
  }
  const uni = { getStorageSync: key => structuredClone(storage.get(key)), setStorageSync: (key, value) => storage.set(key, structuredClone(value)), removeStorageSync: key => storage.delete(key), showToast: msg => toasts.push(msg) }
  function compile(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { exports, uni, require: key => { if (!modules[key]) throw new Error(key); return modules[key] } })
    return exports
  }
  for (const [name, file] of [
    ['@/lib/paipan/native-history-scope', 'lib/paipan/native-history-scope.ts'],
    ['@/lib/paipan/history-core', 'lib/paipan/history-core.ts'],
    ['@/lib/paipan/private-history', 'lib/paipan/private-history.ts'],
    ['@/composables/useNativePreviewPage', 'composables/useNativePreviewPage.ts'],
    [`./${tool}-history`, `pkg-paipan/${tool}/${tool}-history.ts`],
  ]) {
    modules['./native-history-scope'] = modules['@/lib/paipan/native-history-scope']
    modules['./history-core'] = modules['@/lib/paipan/history-core']
    modules[name] = compile(fs.readFileSync(`apps/mobile/src/${file}`, 'utf8'))
  }
  const source = fs.readFileSync(`apps/mobile/src/pkg-paipan/${tool}/result.vue`, 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const names = tool === 'bazi' ? 'preview, baziResult as result, loadResult as load, recordIdFromQuery as serverRecordId, confirmEdit, draft' : 'preview, result, load, onSave, serverRecordId'
  const page = compile(`${source}\nexport { ${names} };`)
  hooks.load({ year: '2026', month: '9', day: '5', hour: '10', minute: '30', ...query })
  return { page, hooks, storage, toasts, computations: () => computations, saves: () => saves,
    permit: () => { enabled = true }, deny: () => { enabled = false }, logout: () => { token = '' },
    pause: () => { paused = true }, release: () => release(), pending: () => !!release }
}
for (const tool of ['qimen', 'yangpan']) {
  test(`${tool} 实际结果页：核验前零计算/保存，通过后正常落盘，返回不重复记录`, async () => {
    const p = setup(tool); assert.equal(p.computations(), 0)
    await p.page.load(); assert.equal(p.computations(), 0); assert.equal(p.storage.size, 0)
    p.permit(); assert.equal(await p.page.load(), true); assert.equal(p.storage.size, 1)
    const first = [...p.storage.values()][0][0].id
    p.hooks.hide(); assert.equal(p.page.result.value, null)
    await p.page.load(); assert.equal([...p.storage.values()][0][0].id, first)
    await p.page.onSave(); assert.equal(p.saves(), 1); assert.equal(p.page.serverRecordId.value, 'synthetic-record'); assert.equal(p.toasts.length, 1)
  })
  test(`${tool} 实际保存：网络期间隐藏/退出/撤权均不回填、不提示成功`, async () => {
    for (const event of ['hide', 'logout', 'deny']) {
      const p = setup(tool); p.permit(); await p.page.load(); const before = JSON.stringify([...p.storage])
      p.pause(); const pending = p.page.onSave()
      for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
      assert.equal(p.pending(), true)
      if (event === 'hide') p.hooks.hide(); else p[event]()
      p.release(); await pending
      assert.equal(p.page.result.value, null); assert.equal(p.page.serverRecordId.value, '')
      assert.equal(p.toasts.length, 0); assert.equal(JSON.stringify([...p.storage]), before)
    }
  })
  test(`${tool} 实际保存：已显示页面也须重新核验，拒绝时不发业务请求`, async () => {
    const p = setup(tool); p.permit(); await p.page.load(); p.deny(); await p.page.onSave()
    assert.equal(p.saves(), 0); assert.equal(p.toasts.length, 0); assert.equal(p.page.result.value, null)
  })
}
test('阳盘实际计算：迟到响应不能写入本地历史', async () => {
  const p = setup('yangpan'); p.permit(); p.pause(); const pending = p.page.load()
  for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
  assert.equal(p.pending(), true); p.logout(); p.release(); assert.equal(await pending, false)
  assert.equal(p.page.result.value, null); assert.equal(p.storage.size, 0)
})

test('八字实际结果页：授权后计算/保存，恢复不重复创建，编辑后创建新记录', async () => {
  const p = setup('bazi'); assert.equal(p.computations(), 0); await p.page.load(); assert.equal(p.saves(), 0)
  p.permit(); await p.page.load(); assert.equal(p.saves(), 1); assert.equal(p.storage.size, 1)
  const first = [...p.storage.values()][0][0].id
  p.hooks.hide(); await p.page.load(); assert.equal(p.saves(), 1)
  assert.equal([...p.storage.values()][0][0].id, first)
  p.page.draft.name = '改名测试'; p.page.confirmEdit()
  // 编辑触发的后台 Promise 只做有界微任务排空，不操作实际网络。
  for (let n = 0; n < 30; n++) await Promise.resolve()
  assert.equal(p.saves(), 2)
  assert.equal([...p.storage.values()][0][0].name, '改名测试')
})
test('八字实际结果页：从历史携带记录ID重开不新建服务端记录', async () => {
  const p = setup('bazi', { id: 'existing-record' }); p.permit(); await p.page.load()
  assert.equal(p.saves(), 0); assert.equal([...p.storage.values()][0][0].serverId, 'existing-record')
})
test('八字实际结果页：计算期间隐藏/退出/撤权后不继续创建记录', async () => {
  for (const event of ['hide', 'logout', 'deny']) {
    const p = setup('bazi'); p.permit(); p.pause(); const pending = p.page.load()
    for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
    assert.equal(p.pending(), true)
    if (event === 'hide') p.hooks.hide(); else p[event]()
    p.release(); assert.equal(await pending, false)
    assert.equal(p.saves(), 0); assert.equal(p.storage.size, 0); assert.equal(p.page.result.value, null)
  }
})
