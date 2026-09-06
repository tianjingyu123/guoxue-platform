import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')

function setup(file) {
  let enabled = false; let token = 'A'; let pause = false; let release; let confirm
  const hooks = {}; const calls = []; const toasts = []; const navigation = []; const clipboard = []
  const data = { id: 'synthetic', status: 'AUTHORIZED', analysisContent: '合成测试报告', inviteToken: 'synthetic-token', shareUrl: 'https://test.invalid/invite' }
  const request = async name => { calls.push(name); if (pause) await new Promise(r => { release = r }); return name === 'getInvite' ? { status: 'PENDING_INVITE', expired: false } : name === 'accept' ? { chartId: 'synthetic' } : ['mine', 'records'].includes(name) ? [data] : data }
  const modules = {
    vue: { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) },
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload', 'onLoad', 'onShareAppMessage', 'onShareTimeline'].map(name => [name, fn => { hooks[name] = fn }])),
    '@/utils/storage': { getToken: () => token },
    '@/utils/router': { navigateTo: url => navigation.push(url), redirectTo: url => navigation.push(url) },
    '@/composables/useShare': { useShare: () => ({ toAppMessage: x => x, toTimeline: x => x }) },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => ({ allowed: enabled, subjectId: '00000000-0000-4000-8000-000000000001' }) } },
    '@/lib/couple-data': { coupleApi: { mine: () => request('mine'), detail: () => request('detail'), remove: () => request('remove'), myBaziRecords: () => request('records'), invite: () => request('invite'), getInvite: () => request('getInvite'), accept: () => request('accept'), reject: () => request('reject') }, COUPLE_STATUS_LABEL: {}, COUPLE_ROLE_LABEL: {} },
  }
  const uni = { showToast: x => toasts.push(x.title), showModal: x => { confirm = x.success }, setClipboardData: x => clipboard.push(x.data) }
  function compile(source) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { exports, uni, require: key => { if (!modules[key]) throw new Error(key); return modules[key] } })
    return exports
  }
  for (const [name, path] of [
    ['@/lib/paipan/native-history-scope', 'lib/paipan/native-history-scope.ts'],
    ['@/composables/useNativePreviewPage', 'composables/useNativePreviewPage.ts'],
  ]) modules[name] = compile(fs.readFileSync(`apps/mobile/src/${path}`, 'utf8'))
  const script = fs.readFileSync(`apps/mobile/src/pkg-paipan/couple/${file}.vue`, 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const names = file === 'accept' ? 'preview, info, records, selectedId, loadInvite as load, onAccept, onReject' : file === 'invite' ? 'preview, records as content, loadRecords as load, selectedId, invited, onGenerate, copyLink, goResult' : file === 'mine' ? 'preview, list as content, load' : 'preview, detail as content, loadDetail as load, onDelete'
  const page = compile(`${script}\nexport { ${names} };`)
  hooks.onLoad?.({ id: 'synthetic', token: 'synthetic-invite' })
  return { page, hooks, calls, toasts, navigation, clipboard, permit: () => { enabled = true }, deny: () => { enabled = false }, logout: () => { token = '' },
    pause: () => { pause = true }, release: () => release(), pending: () => !!release, confirm: () => confirm({ confirm: true }) }
}
for (const file of ['mine', 'result', 'invite']) {
  test(`合盘${file}：未经核验不请求，成功后展示，撤权隐藏`, async () => {
    const p = setup(file); assert.equal(p.calls.length, 0)
    await p.page.load(); assert.equal(p.calls.length, 0)
    p.permit(); await p.page.load(); assert.equal(p.calls.length, 1); assert.equal(p.page.preview.allowed.value, true)
    p.deny(); await p.page.load(); assert.equal(p.calls.length, 1); assert.equal(p.page.preview.allowed.value, false)
    assert.equal(file !== 'result' ? p.page.content.value.length : p.page.content.value, file !== 'result' ? 0 : null)
  })
  test(`合盘${file}：隐藏/退出/撤权后迟到响应不回填`, async () => {
    for (const event of ['hide', 'logout', 'deny']) {
      const p = setup(file); p.permit(); p.pause(); const running = p.page.load()
      for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
      assert.equal(p.pending(), true)
      if (event === 'hide') p.hooks.onHide(); else p[event]()
      p.release(); assert.equal(await running, false); assert.equal(p.page.preview.allowed.value, false)
      assert.equal(file !== 'result' ? p.page.content.value.length : p.page.content.value, file !== 'result' ? 0 : null)
    }
  })
}
test('接受页：拒绝资格不读取邀请，读取期间撤权不继续请求个人记录', async () => {
  const p = setup('accept'); await p.page.load(); assert.equal(p.calls.length, 0)
  p.permit(); p.pause(); const running = p.page.load()
  for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
  assert.equal(p.pending(), true); p.deny(); p.release(); await running
  assert.deepEqual(p.calls, ['getInvite']); assert.equal(p.page.info.value, null); assert.equal(p.page.records.value.length, 0)
})
for (const action of ['onAccept', 'onReject']) {
  test(`接受页${action}：正常链路、重复点击及撤权后拒绝`, async () => {
    const p = setup('accept'); p.permit(); await p.page.load()
    assert.deepEqual(p.calls, ['getInvite', 'records']); assert.equal(p.page.selectedId.value, 'synthetic')
    p.pause(); const running = p.page[action](); await p.page[action]()
    for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
    assert.equal(p.pending(), true); p.release(); await running
    assert.equal(p.calls.length, 3)
    if (action === 'onAccept') assert.deepEqual(p.navigation, ['/pkg-paipan/couple/result?id=synthetic'])
    else { assert.equal(p.page.info.value.status, 'REJECTED'); assert.deepEqual(p.toasts, ['已婉拒']) }
    const denied = setup('accept'); denied.permit(); await denied.page.load(); denied.deny(); await denied.page[action]()
    assert.deepEqual(denied.calls, ['getInvite', 'records']); assert.equal(denied.navigation.length, 0)
  })
  test(`接受页${action}：写请求期间退出不回填、不跳转或提示成功`, async () => {
    const p = setup('accept'); p.permit(); await p.page.load(); p.pause(); const running = p.page[action]()
    for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
    assert.equal(p.pending(), true); p.logout(); p.release(); await running
    assert.equal(p.page.info.value, null); assert.equal(p.page.records.value.length, 0)
    assert.equal(p.toasts.length, 0); assert.equal(p.navigation.length, 0)
  })
}
test('合盘发起：重复点击仅一次请求，撤权后不能复制邀请凭据', async () => {
  const p = setup('invite'); p.permit(); await p.page.load()
  p.pause(); const running = p.page.onGenerate(); await p.page.onGenerate()
  for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
  assert.equal(p.calls.filter(x => x === 'invite').length, 1)
  p.release(); await running; assert.equal(p.page.invited.value.id, 'synthetic')
  await p.page.onGenerate(); assert.equal(p.calls.filter(x => x === 'invite').length, 1)
  await p.page.copyLink(); assert.equal(p.clipboard.length, 1)
  p.deny(); await p.page.copyLink(); assert.equal(p.clipboard.length, 1); assert.equal(p.page.invited.value, null)
  assert.equal(p.hooks.onShareAppMessage().path, '/pages/index/index')
})
test('合盘发起：已发请求后退出，迟到邀请不回填；撤权后不发邀请', async () => {
  const p = setup('invite'); p.permit(); await p.page.load(); p.deny(); await p.page.onGenerate()
  assert.deepEqual(p.calls, ['records'])
  p.permit(); await p.page.load(); p.pause(); const running = p.page.onGenerate()
  for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
  assert.equal(p.pending(), true); p.logout(); p.release(); await running
  assert.equal(p.page.invited.value, null); assert.equal(p.toasts.length, 0)
})
test('合盘删除：弹窗后撤权不发请求；请求中退出不提示成功或跳转', async () => {
  const p = setup('result'); p.permit(); await p.page.load(); p.page.onDelete(); p.deny(); await p.confirm()
  assert.deepEqual(p.calls, ['detail']); assert.equal(p.toasts.length, 0)
  p.permit(); await p.page.load(); p.page.onDelete(); p.pause(); const pending = p.confirm()
  for (let n = 0; n < 10 && !p.pending(); n++) await Promise.resolve()
  assert.equal(p.pending(), true); p.logout(); p.release(); await pending
  assert.equal(p.toasts.length, 0); assert.equal(p.navigation.length, 0)
})
test('合盘删除：核验通过后正常删除并跳转，分享不泄露私有报告入口', async () => {
  const p = setup('result'); p.permit(); await p.page.load(); p.page.onDelete(); await p.confirm()
  assert.deepEqual(p.calls, ['detail', 'remove']); assert.deepEqual(p.toasts, ['已删除'])
  assert.deepEqual(p.navigation, ['/pkg-paipan/couple/mine'])
  assert.equal(p.hooks.onShareAppMessage().path, '/pages/index/index')
  assert.equal(p.hooks.onShareTimeline().path, '/pages/index/index')
})
