import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
function compile(source, modules, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(code, { exports, require: name => { if (!(name in modules)) throw new Error(name); return modules[name] }, ...globals })
  return exports
}
function page(confirm = async () => {}) {
  const writes = []; let refreshes = 0
  const api = { get: async () => ({ data: { enabled: false, mode: 'legacy', revision: 'a'.repeat(64) } }),
    put: async (url, body) => { writes.push({ url, body }); return { data: { enabled: body.enabled, mode: body.mode, revision: 'b'.repeat(64) } } } }
  const source = fs.readFileSync('apps/admin/src/views/system/NativePaipanPreview.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  return { api, writes, refreshes: () => refreshes, ...compile(source + '\nexport { load, save, state, desired, desiredMode, busy, error };', {
    vue: { ref: value => ({ value }), onMounted: () => {} },
    'element-plus': { ElMessage: { success: () => {} }, ElMessageBox: { confirm } },
    '@/api': { api }, '@/store/auth': { useAuthStore: () => ({ fetchMenus: async () => { refreshes++ } }) },
  }) }
}
test('专用页面读状态、确认保存指纹并刷新菜单', async () => {
  const p = page(); await p.load(); p.desired.value = true; await p.save()
  assert.equal(p.writes.length, 1); assert.equal(p.writes[0].body.expectedRevision, 'a'.repeat(64))
  assert.equal(p.state.value.enabled, true); assert.equal(p.refreshes(), 1)
})

test('仅切换整套模式也能保存，确认期间修改选择不改变本次目标', async () => {
  let release; const p = page(() => new Promise(resolve => { release = resolve }))
  await p.load(); p.desiredMode.value = 'native'; const pending = p.save()
  p.desiredMode.value = 'legacy'; await p.save(); release(); await pending
  assert.equal(p.writes.length, 1); assert.equal(p.writes[0].body.mode, 'native')
  assert.equal(p.writes[0].body.enabled, false); assert.equal(p.state.value.mode, 'native')
})

test('旧服务端缺少整套模式时不允许盲保存', async () => {
  const p = page(); p.api.get = async () => ({ data: { enabled: false, revision: 'a'.repeat(64) } })
  await p.load(); assert.equal(p.state.value, null); p.desiredMode.value = 'native'; await p.save()
  assert.equal(p.writes.length, 0)
})

test('整套来回切换只提交模式、预览和修订，不生成逐工具权限', async () => {
  const p = page(); await p.load()
  for (const mode of ['native', 'legacy']) {
    p.desiredMode.value = mode
    await p.save()
    const write = p.writes.at(-1)
    assert.equal(write.url, '/system/native-paipan-preview')
    assert.deepEqual(Object.keys(write.body).sort(), ['enabled', 'expectedRevision', 'mode'])
    assert.equal(write.body.mode, mode)
    assert.equal(write.body.enabled, false, '整体自研模式不依赖开启管理员预览')
    assert.equal(p.state.value.mode, mode)
  }
  assert.equal(p.writes.length, 2)
  assert.equal(p.writes[1].body.expectedRevision, 'b'.repeat(64))
  await p.save()
  assert.equal(p.writes.length, 2, '未改变整套选择时不重复写入')
})
test('取消不写，失败清空旧状态并要求重新加载', async () => {
  const p = page(async () => { throw 'cancel' }); await p.load(); p.desired.value = true; await p.save()
  assert.equal(p.writes.length, 0)
  const q = page(); await q.load(); q.desired.value = true; q.api.put = async () => { throw new Error('409') }; await q.save()
  assert.equal(q.state.value, null); assert.match(q.error.value, /重新加载/); assert.equal(q.busy.value, false)
  await q.save(); assert.equal(q.writes.length, 0)
})
test('确认期间锁定目标，重复点击不产生第二次提交', async () => {
  let release; const p = page(() => new Promise(resolve => { release = resolve }))
  await p.load(); p.desired.value = true; const pending = p.save()
  p.desired.value = false; await p.save(); release(); await pending
  assert.equal(p.writes.length, 1); assert.equal(p.writes[0].body.enabled, true)
})
test('新工具资格不再读取公开模式，退出或换账号后不复用响应', async () => {
  let token = 'first'; let release; const urls = []
  const api = { get: url => { urls.push(url); return new Promise(resolve => { release = resolve }) } }
  const runtime = compile(fs.readFileSync('apps/admin/src/lib/paipan-runtime.ts', 'utf8'), { '@/api': { api } }, { localStorage: { getItem: () => token } })
  const pending = runtime.refreshPaipanMode(); token = 'second'; release({ data: { allowed: true } })
  assert.equal(await pending, 'legacy'); assert.equal(runtime.isNativePaipanEnabled(), false)
  assert.equal(urls[0], '/legacy-paipan/native-qa/access')
  const next = runtime.refreshPaipanMode(); release({ data: { allowed: true } }); assert.equal(await next, 'native')
  token = null; assert.equal(runtime.isNativePaipanEnabled(), false)
  token = 'second'; runtime.clearNativePreviewState(); assert.equal(runtime.isNativePaipanEnabled(), false)
  const stale = runtime.refreshPaipanMode(); runtime.clearNativePreviewState(); release({ data: { allowed: true } })
  assert.equal(await stale, 'legacy'); assert.equal(runtime.isNativePaipanEnabled(), false)
})
