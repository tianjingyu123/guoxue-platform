import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url), ts = require('../../apps/mobile/node_modules/typescript'), vue = require('../../apps/mobile/node_modules/vue')
function setup(t) {
  const state = { grant: null, failPost: false, confirm: true, canApply: true }, writes = [], hooks = {}, exports = {}, scope = vue.effectScope()
  const api = {
    apiGet: async url => {
      if (url.includes('/members?')) return { members: [{ userId: url.includes('page=2') ? 'guest-two' : 'guest-one', user: { nickname: '合成嘉宾' } }], total: 21 }
      if (url.includes('application-context')) return { circleId: 'circle', capability: url.includes('AUDIO_QUESTION') ? 'AUDIO_QUESTION' : 'VIDEO_QUESTION', subjectUserId: new URL(url, 'https://example.invalid').searchParams.get('subjectUserId'), canApply: state.canApply, reason: state.canApply ? 'ELIGIBLE_TO_APPLY' : 'CIRCLE_GRANT_UNAVAILABLE', grant: null }
      const capability = url.endsWith('AUDIO_QUESTION') ? 'AUDIO_QUESTION' : 'VIDEO_QUESTION'
      return { circleId: 'circle', capability, grant: capability === 'AUDIO_QUESTION' ? state.grant : null }
    },
    apiPost: async (url, body) => { writes.push({ url, body }); if (state.failPost) throw Error('UNKNOWN') },
  }
  const source = readFileSync(new URL('../../apps/mobile/src/pkg-circle/circles/expert-config.vue', import.meta.url), 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const code = ts.transpileModule(source + '\nexport { cfg, currentId, loading, loadProviderGrants, providerGrants, grantsError, canToggleProvider, toggleProvider, grantBusy, inspectApplication, submitApplication, applicationReason, applicationScope, applicationCapability, loadApplicationMembers, selectApplicationMember, applicationMembers, selectedMember };', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  scope.run(() => vm.runInNewContext(code, { exports, uni: { showToast() {}, showModal: args => args.success({ confirm: state.confirm }) },
    require: name => {
      if (name === 'vue') return { ...vue, onBeforeUnmount: fn => { hooks.unmount = fn } }
      if (name === '@dcloudio/uni-app') return { onLoad() {} }
      if (name === '@/utils/request') return api
      if (name === '@/lib/circle-consult-data') return { getCurrentUserId: () => 'self', expertConfigApi: { get: async () => ({ audioCallApproved: true, videoCallApproved: false, callPricePerMinuteCoin: 0 }) } }
      return {}
    },
  }))
  t.after(() => scope.stop()); exports.currentId.value = 'circle'; exports.loading.value = false
  exports.cfg.value = { callPricePerMinuteCoin: 88, audioCallApproved: false, videoCallApproved: false }
  return { ...exports, state, writes, api, hooks }
}
const grant = () => ({ id: 'grant', revision: 4, circleId: 'circle', capability: 'AUDIO_QUESTION', subjectUserId: 'self', state: 'APPROVED', enabled: false, expiresAt: '2099-01-01T00:00:00Z' })
test('有定价但未授权不可启用，音频不代替视频', async t => {
  const h = setup(t); await h.loadProviderGrants(); assert.equal(!!h.canToggleProvider('AUDIO_QUESTION'), false)
  h.state.grant = grant(); await h.loadProviderGrants()
  assert.equal(!!h.canToggleProvider('AUDIO_QUESTION'), true); assert.equal(!!h.canToggleProvider('VIDEO_QUESTION'), false)
})
test('本人启用绑定revision，刷新不覆盖未保存价格', async t => {
  const h = setup(t); h.state.grant = grant(); await h.loadProviderGrants(); await h.toggleProvider('AUDIO_QUESTION')
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].body.expectedRevision, 4); assert.equal(h.writes[0].body.enabled, true)
  assert.equal(h.cfg.value.callPricePerMinuteCoin, 88); assert.equal(h.cfg.value.audioCallApproved, true)
})
test('启停失败不重发，也不提交价格；取消确认零写入', async t => {
  const h = setup(t); h.state.grant = grant(); await h.loadProviderGrants(); h.state.confirm = false
  await h.toggleProvider('AUDIO_QUESTION'); assert.equal(h.writes.length, 0)
  h.state.confirm = true; h.state.failPost = true; await h.toggleProvider('AUDIO_QUESTION')
  assert.equal(h.writes.length, 1); assert.equal(h.grantBusy.value, false)
})
test('串用其他成员授权拒绝展示和启停', async t => {
  const h = setup(t); h.state.grant = { ...grant(), subjectUserId: 'other' }; await h.loadProviderGrants()
  assert.ok(h.grantsError.value); await h.toggleProvider('AUDIO_QUESTION'); assert.equal(h.writes.length, 0)
})
test('重复点击不产生第二次启用请求', async t => {
  const h = setup(t); h.state.grant = grant(); await h.loadProviderGrants(); let finish
  h.api.apiPost = async (url, body) => { h.writes.push({ url, body }); await new Promise(resolve => { finish = resolve }) }
  const pending = h.toggleProvider('AUDIO_QUESTION'); await Promise.resolve(); await h.toggleProvider('AUDIO_QUESTION')
  assert.equal(h.writes.length, 1); finish(); await pending
})
test('圈主圈级申请和本人服务申请精确区分，不自行批准', async t => {
  const h = setup(t); h.cfg.value.role = 'OWNER'; h.applicationReason.value = '合成申请'
  await h.inspectApplication(); await h.submitApplication()
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].body.subjectUserId, undefined)
  assert.equal(h.writes[0].body.capability, 'AUDIO_QUESTION'); assert.equal(h.writes[0].body.enabled, undefined)
  h.applicationScope.value = 'SELF'; h.applicationCapability.value = 'VIDEO_QUESTION'
  await h.inspectApplication(); await h.submitApplication()
  assert.equal(h.writes[1].body.subjectUserId, 'self'); assert.equal(h.writes[1].body.capability, 'VIDEO_QUESTION')
})
test('圈级未开通或预检后切换范围不能提交个人申请', async t => {
  const h = setup(t); h.cfg.value.role = 'OWNER'; h.applicationReason.value = '合成申请'; h.state.canApply = false
  await h.inspectApplication(); await h.submitApplication(); assert.equal(h.writes.length, 0)
  h.state.canApply = true; await h.inspectApplication(); h.applicationScope.value = 'SELF'
  await h.submitApplication(); assert.equal(h.writes.length, 0)
})
test('普通成员不能进入圈主申请写流程', async t => {
  const h = setup(t); h.cfg.value.role = 'MEMBER'; h.applicationReason.value = '合成申请'
  await h.inspectApplication(); await h.submitApplication(); assert.equal(h.writes.length, 0)
})
test('分页选择嘉宾精确提交该成员，翻页清除旧申请对象', async t => {
  const h = setup(t); h.cfg.value.role = 'OWNER'; h.applicationReason.value = '合成嘉宾申请'
  await h.loadApplicationMembers(1); await h.selectApplicationMember(h.applicationMembers.value[0]); await h.submitApplication()
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].body.subjectUserId, 'guest-one')
  await h.loadApplicationMembers(2); assert.equal(h.selectedMember.value, null)
  await h.submitApplication(); assert.equal(h.writes.length, 1)
  await h.selectApplicationMember(h.applicationMembers.value[0]); await h.submitApplication()
  assert.equal(h.writes[1].body.subjectUserId, 'guest-two'); assert.equal(h.writes[1].body.enabled, undefined)
})
test('非当前列表成员与跨圈旧选择不能提交', async t => {
  const h = setup(t); h.cfg.value.role = 'OWNER'; h.applicationReason.value = '合成申请'
  await h.loadApplicationMembers(); await h.selectApplicationMember({ userId: 'outsider', name: '未在列表' })
  await h.submitApplication(); assert.equal(h.writes.length, 0)
  await h.selectApplicationMember(h.applicationMembers.value[0]); h.currentId.value = 'other'
  await h.submitApplication(); assert.equal(h.writes.length, 0)
})
test('成员列表迟到不能替换新圈子的成员', async t => {
  const h = setup(t); h.cfg.value.role = 'OWNER'; let finish
  h.api.apiGet = () => new Promise(resolve => { finish = resolve })
  const pending = h.loadApplicationMembers(); h.currentId.value = 'other'
  finish({ members: [{ userId: 'old', user: { nickname: '旧圈成员' } }], total: 1 }); await pending
  assert.equal(h.applicationMembers.value.length, 0)
})
