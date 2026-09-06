import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'

function setup(tool, file = 'index.vue') {
  let token = 'A'; let subjectId = A; let enabled = false; let reads = 0
  const data = new Map(); const hooks = {}
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': { onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn } },
    '@/utils/storage': { getToken: () => token },
    '@/utils/router': { navigateTo: () => {} },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed: enabled, subjectId }) } },
  }
  const uni = {
    getStorageSync: key => { reads++; return structuredClone(data.get(key)) },
    setStorageSync: (key, value) => data.set(key, structuredClone(value)),
    removeStorageSync: key => data.delete(key),
  }
  function compile(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { exports, uni, require: key => { if (!modules[key]) throw new Error(key); return modules[key] } })
    return exports
  }
  for (const [name, file] of [
    ['@/lib/paipan/history-core', 'lib/paipan/history-core.ts'],
    ['@/lib/paipan/native-history-scope', 'lib/paipan/native-history-scope.ts'],
    ['@/lib/paipan/private-history', 'lib/paipan/private-history.ts'],
    ['@/composables/useNativePreviewPage', 'composables/useNativePreviewPage.ts'],
    [`../${tool}-history`, `pkg-paipan/${tool}/${tool}-history.ts`],
  ]) {
    modules['./history-core'] = modules['@/lib/paipan/history-core']
    modules['./native-history-scope'] = modules['@/lib/paipan/native-history-scope']
    modules[name] = compile(fs.readFileSync(`apps/mobile/src/${file}`, 'utf8'))
  }
  const source = fs.readFileSync(`apps/mobile/src/pkg-paipan/${tool}/history/${file}`, 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const names = file === 'groups.vue' ? 'preview, records, groups, change' : 'preview, records, groupNames, onPin, onDelete, onGroup'
  const page = compile(`${source}\nexport { ${names} };`)
  const history = modules[`../${tool}-history`]
  return { page, data, hooks, history, reads: () => reads,
    as: action => modules['@/lib/paipan/native-history-scope'].withNativeHistoryScope(subjectId, token, action),
    permit: () => { enabled = true }, deny: () => { enabled = false },
    switchAccount: () => { token = 'B'; subjectId = B } }
}

for (const tool of ['bazi', 'qimen', 'yangpan']) {
  test(`${tool}：实际分组页新增/改名/删除均核验，撤权不能提交已打开弹窗的动作`, async () => {
    const p = setup(tool, 'groups.vue'); const store = p.history[`${tool}Store`]
    assert.equal(p.reads(), 0); p.permit(); await p.page.preview.run()
    await p.page.change({ type: 'add', name: '合成分组' })
    assert.equal(p.page.groups.value.includes('合成分组'), true)
    let id; p.as(() => { id = store.save({ name: '测试', group: '合成分组' }).id })
    await p.page.change({ type: 'rename', old: '合成分组', name: '改名测试' })
    assert.equal(p.page.groups.value.includes('合成分组'), false)
    assert.equal(p.page.records.value.find(r => r.id === id).group, '改名测试')
    const snapshot = JSON.stringify([...p.data]); p.deny()
    await p.page.change({ type: 'remove', old: '改名测试' })
    assert.equal(JSON.stringify([...p.data]), snapshot); assert.equal(p.page.groups.value.length, 0)
    p.permit(); await p.page.change({ type: 'remove', old: '改名测试' })
    assert.equal(p.page.records.value.find(r => r.id === id).group, '全部')
    assert.equal(p.page.groups.value.includes('改名测试'), false)
  })
  test(`${tool}：不存在分组/默认分组/重复名称均不得修改历史`, async () => {
    const p = setup(tool, 'groups.vue'); p.permit(); await p.page.preview.run()
    await p.page.change({ type: 'add', name: '合成分组' })
    const snapshot = JSON.stringify([...p.data])
    for (const command of [{ type: 'remove', old: '全部' }, { type: 'rename', old: '已删除', name: '新分组' }, { type: 'add', name: '合成分组' }]) {
      assert.equal(await p.page.change(command), false)
      assert.equal(JSON.stringify([...p.data]), snapshot)
    }
  })
  test(`${tool}：实际历史页初始化零读取，授权后读分组和记录，撤权操作零写入`, async () => {
    const p = setup(tool); const store = p.history[`${tool}Store`]; const groups = p.history[`${tool}Groups`]
    assert.equal(p.reads(), 0)
    await p.page.preview.run(); assert.equal(p.reads(), 0)
    let id
    p.as(() => { id = store.save({ name: '测试', year: 2026 }).id; groups.save(['全部', '私有分组']) })
    p.permit(); await p.page.preview.run()
    assert.equal(p.page.records.value.length, 1); assert.equal(p.page.groupNames.value[1], '私有分组')
    await p.page.onPin([id]); assert.equal(p.page.records.value[0].pinned, true)
    await p.page.onGroup({ ids: [id], group: '私有分组' }); assert.equal(p.page.records.value[0].group, '私有分组')
    const before = JSON.stringify([...p.data]); p.deny(); await p.page.onDelete([id])
    assert.equal(JSON.stringify([...p.data]), before); assert.equal(p.page.records.value.length, 0)
    assert.equal(p.page.groupNames.value.length, 0)
    p.permit(); await p.page.preview.run(); await p.page.onDelete([id]); assert.equal(p.page.records.value.length, 0)
  })
  test(`${tool}：跨账号分组/记录独立，模块不缓存账号，旧无归属数据保留`, async () => {
    const p = setup(tool); const store = p.history[`${tool}Store`]; const groups = p.history[`${tool}Groups`]
    p.data.set(`rebu:${tool}-history`, [{ privateLegacy: true }])
    p.data.set(`rebu:${tool}-groups`, ['全部', '旧分组'])
    p.as(() => { store.save({ name: 'A' }); groups.save(['全部', 'A分组']) })
    p.permit(); await p.page.preview.run(); p.hooks.hide(); p.switchAccount()
    await p.page.preview.run(); assert.equal(p.page.preview.allowed.value, false)
    p.as(() => { assert.equal(store.load().length, 0); assert.equal(groups.load().includes('A分组'), false); store.clear() })
    assert.equal(store.load().length, 0); assert.equal(groups.load().length, 0)
    assert.throws(() => groups.save(['全部']), /重新核验/)
    assert.throws(() => store.clear(), /重新核验/)
    assert.deepEqual(p.data.get(`rebu:${tool}-history`), [{ privateLegacy: true }])
    assert.deepEqual(p.data.get(`rebu:${tool}-groups`), ['全部', '旧分组'])
    assert.equal(p.data.get(`rebu:${tool}-history:account:${A}`).length, 1)
  })
}
