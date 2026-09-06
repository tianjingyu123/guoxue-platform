import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url), ts = require('../../apps/mobile/node_modules/typescript')
const source = readFileSync(new URL('../../apps/mobile/src/pkg-live/create/index.vue', import.meta.url), 'utf8')
const functions = source.slice(source.indexOf('let admissionGeneration'), source.indexOf('function onLiveGranted'))
  + source.slice(source.indexOf('async function checkLivePermission'), source.indexOf('// 三态 UI'))
  + source.slice(source.indexOf('async function onPrimary'), source.indexOf('// 立即开播：'))
function harness(check) {
  const ref = value => ({ value }), writes = [], exports = {}, checks = []
  const state = {
    checkingPermission: ref(false), submitting: ref(false), retrying: ref(false), circleId: ref('circle'), showPublishGuide: ref(false),
    isEdit: ref(false), createdId: ref(''), primaryDisabled: ref(false), title: ref('合成直播'), liveMode: ref('obs'), startTime: ref(''),
    isCharge: ref(false), chargePrice: ref(''), description: ref('合成说明'), cover: ref(''), quality: ref('basic'),
    selectedProducts: ref([]), visibility: ref('CIRCLE_ONLY'), editRoomId: ref(''),
  }
  const code = ts.transpileModule(functions + '\nexports.onPrimary=onPrimary; exports.checkLivePermission=checkLivePermission; exports.hide=invalidateAdmission;', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(code, { exports, ...state, checkCirclePublishPermission: async (...args) => { checks.push(args); return check(...args) },
    uni: { showToast() {}, redirectTo() {} }, isClientFeatureEnabled: () => true, setTimeout() {}, onLiveGranted() {}, onShow() {}, onHide() {}, onUnload() {},
    liveApi: { createRoom: async dto => { writes.push(dto); return { id: 'room' } } },
  })
  return { ...exports, ...state, writes, checks }
}
test('LIVE资格拒绝时零建房，不能因仅本圈绕过', async () => {
  const h = harness(() => false); await h.onPrimary()
  assert.equal(h.writes.length, 0); assert.equal(h.showPublishGuide.value, true)
  assert.equal(h.checks[0][0], 'LIVE')
})
test('资格通过后仅创建一次OBS房间', async () => {
  const h = harness(() => true); await h.onPrimary()
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].circleId, 'circle')
  assert.equal(h.createdId.value, 'room')
})
test('资格查询中重复提交及切换圈子均不得误创建', async () => {
  let resolve
  const h = harness(() => new Promise(done => { resolve = done }))
  const pending = h.onPrimary(); await h.onPrimary()
  assert.equal(h.checks.length, 1); h.circleId.value = 'other'; resolve(true); await pending
  assert.equal(h.writes.length, 0); assert.equal(h.checkingPermission.value, false)
})
test('仅核对资格不会创建房间或开播', async () => {
  const h = harness(() => true); assert.equal(await h.checkLivePermission(true), true)
  assert.equal(h.writes.length, 0)
  assert.doesNotMatch(source, /myCircles\.value\.filter\(.*role === 'owner'/)
})

test('离开直播创建页后迟到资格不得创建房间或弹申请面板', async () => {
  for (const allowed of [true, false]) {
    let resolve
    const h = harness(() => new Promise(done => { resolve = done }))
    const pending = h.onPrimary(); h.hide(); resolve(allowed); await pending
    assert.equal(h.writes.length, 0); assert.equal(h.showPublishGuide.value, false)
  }
})
