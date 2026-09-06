import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('../../apps/mobile/node_modules/typescript'), vue = require('../../apps/mobile/node_modules/vue')
function setup(t) {
  const props = vue.reactive({ open: true, circleId: 'circle' }), emits = [], posts = []
  const state = { allowed: false, eligible: true, grant: null, fail: false, cooldown: false, circles: true }
  const api = {
    apiGet: async url => {
      if (state.fail) throw Error('NETWORK')
      const capability = props.capability || 'SHORT_VIDEO'
      return url.includes('application-context') ? { circleId: 'circle', capability, subjectUserId: null,
        canApply: state.eligible && !state.cooldown && (!state.grant || Date.parse(state.grant.expiresAt) < Date.now()),
        reason: state.cooldown ? 'REAPPLY_COOLDOWN' : 'THRESHOLD_NOT_MET', progress: [] } : { circleId: 'circle', capability, grant: state.grant }
    },
    apiPost: async (url, body) => { posts.push({ url, body }); if (state.fail) throw Error('NETWORK') },
  }
  const scope = vue.effectScope(), exports = {}
  const source = readFileSync(new URL('../../apps/mobile/src/components/video/publish-guide-sheet.vue', import.meta.url), 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  const code = ts.transpileModule(source + '\nexport { loadStatus, handleAction, canApply, canEnable, reason, loadError };', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  scope.run(() => vm.runInNewContext(code, { exports, defineProps: () => props, defineEmits: () => (...args) => emits.push(args), uni: { showToast() {} },
    require: name => {
      if (name === 'vue') return { ...vue, watch() {}, onBeforeUnmount() {} }
      if (name.includes('app-icon')) return {}
      if (name.includes('use-overlay-scroll-lock')) return { useOverlayScrollLock() {} }
      if (name === '@/utils/request') return api
      if (name === '@/lib/circle-consult-data') return { getCurrentUserId: () => 'self' }
      if (name === '@/lib/publish-permission') return { checkCirclePublishPermission: async () => state.allowed, getCirclePublishGrantStatus: async () => ({ canPublish: true, circles: state.circles ? [{ id: 'circle', name: '合成圈子', canPublish: true, regularEligible: true }] : [] }) }
      throw Error(name)
    },
  }))
  t.after(() => scope.stop())
  return { ...exports, state, props, api, posts, emits }
}
test('旧授权canPublish不能触发granted，未达新门槛不展示申请', async t => {
  const h = setup(t); h.state.eligible = false; await h.loadStatus()
  assert.equal(h.canApply.value, false); assert.equal(h.emits.length, 0)
  await h.handleAction(); assert.equal(h.posts.length, 0)
})
test('新直授状态直接放行且不写旧申请', async t => {
  const h = setup(t); h.state.allowed = true; await h.loadStatus()
  assert.equal(h.emits[0][0], 'granted'); assert.equal(h.posts.length, 0)
})
test('申请需要原因且只调用新接口，重复点击不重发', async t => {
  const h = setup(t); await h.loadStatus(); await h.handleAction(); assert.equal(h.posts.length, 0)
  h.reason.value = '合成申请'; let finish
  h.api.apiPost = async (url, body) => { h.posts.push({ url, body }); await new Promise(resolve => { finish = resolve }) }
  const first = h.handleAction(); await h.handleAction(); assert.equal(h.posts.length, 1)
  assert.match(h.posts[0].url, /circle-capabilities\/circles\/circle\/applications/)
  assert.equal(h.posts[0].body.capability, 'SHORT_VIDEO'); finish(); await first
})
test('待启用资格绑定revision，失败后只回读', async t => {
  const h = setup(t); h.state.grant = { id: 'grant', revision: 7, circleId: 'circle', capability: 'SHORT_VIDEO', subjectUserId: null, state: 'APPROVED', enabled: false, expiresAt: '2099-01-01T00:00:00Z' }
  await h.loadStatus(); assert.equal(h.canEnable.value, true); assert.equal(h.canApply.value, false)
  h.api.apiPost = async (url, body) => { h.posts.push({ url, body }); throw Error('UNKNOWN') }
  await h.handleAction(); assert.equal(h.posts.length, 1)
  assert.equal(h.posts[0].body.expectedRevision, 7); assert.equal(h.posts[0].body.enabled, true)
})
test('关闭面板后迟到许可不能误触发布', async t => {
  const h = setup(t); h.state.allowed = true; const pending = h.loadStatus(); h.props.open = false; await pending
  assert.equal(h.emits.length, 0)
})
test('直播申请沿用面板但仅写入LIVE能力', async t => {
  const h = setup(t); h.props.capability = 'LIVE'; await h.loadStatus(); h.reason.value = '合成直播申请'
  await h.handleAction(); assert.equal(h.posts.length, 1)
  assert.equal(h.posts[0].body.capability, 'LIVE')
})

test('经营条件满足但仍在冷却期时不提交，过期批准按服务端预检重新申请', async t => {
  const h = setup(t); h.state.cooldown = true; await h.loadStatus(); h.reason.value = '再次申请'
  assert.equal(h.canApply.value, false); await h.handleAction(); assert.equal(h.posts.length, 0)
  h.state.cooldown = false
  h.state.grant = { id: 'expired', revision: 2, circleId: 'circle', capability: 'SHORT_VIDEO', subjectUserId: null, state: 'APPROVED', enabled: false, expiresAt: '2020-01-01T00:00:00Z' }
  await h.loadStatus(); assert.equal(h.canEnable.value, false); assert.equal(h.canApply.value, true)
})

test('个人直授可本人启用，不要求圈主列表或经营资格，但暂停不可自解', async t => {
  const h = setup(t); h.state.circles = false
  h.state.grant = { id: 'personal', revision: 3, circleId: 'circle', capability: 'SHORT_VIDEO', subjectUserId: 'self', state: 'APPROVED', enabled: false, expiresAt: '2099-01-01T00:00:00Z' }
  const original = h.api.apiGet
  h.api.apiGet = url => { assert.equal(url.includes('application-context'), false); return original(url) }
  await h.loadStatus(); assert.equal(h.canEnable.value, true); assert.equal(h.canApply.value, false)
  await h.handleAction(); assert.equal(h.posts.length, 1); assert.match(h.posts[0].url, /grants\/personal\/enabled/)
  h.state.grant.state = 'SUSPENDED'; await h.loadStatus(); await h.handleAction(); assert.equal(h.posts.length, 1)
})

test('错人授权及切圈后的旧预检都不能写入', async t => {
  const h = setup(t)
  h.state.grant = { id: 'other', revision: 3, circleId: 'circle', capability: 'SHORT_VIDEO', subjectUserId: 'other', state: 'APPROVED', enabled: false, expiresAt: '2099-01-01T00:00:00Z' }
  await h.loadStatus(); assert.equal(h.canEnable.value, false)
  h.state.grant = null; await h.loadStatus(); h.reason.value = '申请'; h.props.circleId = 'another'
  await h.handleAction(); assert.equal(h.posts.length, 0)
})
