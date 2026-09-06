import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText

function adapter(row, request = async () => [row]) {
  const exports = {}
  vm.runInNewContext(compile(fs.readFileSync('apps/mobile/src/lib/circle-consult-data.ts', 'utf8')), { exports, require: name => {
    if (name === '@/utils/request') return { apiGet: request }
    if (name === '@/utils/storage') return { getStorage: () => null }
    throw new Error(name)
  } })
  return exports.consultApi
}
for (const method of ['listExperts', 'listAllExperts', 'getUserConsultServices']) {
  test(`${method} 区分网络错误、异常响应与真实空列表`, async () => {
    await assert.rejects(adapter(null, async () => { throw new Error('NETWORK') })[method]('synthetic'), /加载失败/)
    for (const bad of [null, {}, { data: {} }, [null]]) {
      await assert.rejects(adapter(null, async () => bad)[method]('synthetic'), /加载失败/)
    }
    assert.equal((await adapter(null, async () => [])[method]('synthetic')).length, 0)
  })
  test(`${method} 不以价格或非布尔标识冒充已开通`, async () => {
    const denied = adapter({ userId: 'expert', callPricePerMinuteCoin: 8, audioCallEnabled: 'true' })
    const row = (await denied[method]('synthetic'))[0]
    assert.equal(row.callPrice, 0); assert.equal(row.audioCallEnabled, false); assert.equal(row.videoCallEnabled, false)
    const granted = adapter({ userId: 'expert', callPricePerMinuteCoin: 8, videoCallEnabled: true })
    const live = (await granted[method]('synthetic'))[0]
    assert.equal(live.callPrice, 8); assert.equal(live.audioCallEnabled, false); assert.equal(live.videoCallEnabled, true)
  })
}
function booking(list) {
  const exports = {}, hooks = {}, api = { listExperts: async () => list }
  const source = fs.readFileSync('apps/mobile/src/pkg-circle/circles/booking.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  vm.runInNewContext(compile(source + '\nexport { load, circleId, expertId, expert, error, price, callType };'), { exports,
    require: name => {
      if (name === 'vue') return { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), onBeforeUnmount() {} }
      if (name === '@dcloudio/uni-app') return { onLoad: fn => { hooks.load = fn }, onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn } }
      if (name === '@/lib/circle-consult-data') return { consultApi: api }
      if (name === '@/utils/router') return {}
      throw new Error(name)
    } })
  exports.circleId.value = 'circle'; exports.expertId.value = 'expert'
  return { ...exports, api, hooks }
}
test('只开放视频时默认选视频，撤权后清旧价和旧服务', async () => {
  const s = booking([{ id: 'expert', callPrice: 8, audioCallEnabled: false, videoCallEnabled: true }])
  await s.load(); assert.equal(s.callType.value, 'VIDEO'); assert.equal(s.price.value, 8)
  s.api.listExperts = async () => []
  await s.load(); assert.equal(s.expert.value, null); assert.equal(s.price.value, 0); assert.match(s.error.value, /暂未开通/)
})
test('路由旧价格不能在服务查询失败时恢复购买展示', async () => {
  const s = booking([])
  s.hooks.load({ circleId: 'circle', expertId: 'expert', price: '999' })
  await s.hooks.show()
  await new Promise(setImmediate)
  assert.equal(s.price.value, 0); assert.match(s.error.value, /暂未开通/)
  s.api.listExperts = async () => { throw new Error('NETWORK') }
  await s.load(); assert.equal(s.expert.value, null); assert.equal(s.price.value, 0); assert.match(s.error.value, /加载失败/)
})

function settings() {
  const exports = {}, sheets = [], saved = []
  const record = { role: 'MEMBER', questionPriceCoin: 0, peekPriceCoin: 0, questionTimeoutHours: 72, callPricePerMinuteCoin: 0,
    textConfigAllowed: false, audioCallApproved: true, videoCallApproved: false }
  const api = { get: async () => ({ ...record }), set: async (...args) => { saved.push(args) } }
  const source = fs.readFileSync('apps/mobile/src/pkg-circle/circles/expert-config.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  vm.runInNewContext(compile(source + '\nexport { load, loadConfig, cfg, currentId, expertCircles, loading, saving, save, pickCallPrice, pickQuestionPrice, switchCircle };'), {
    exports, uni: { showToast() {}, showActionSheet: spec => sheets.push(spec) }, require: name => {
      if (name === 'vue') return { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), onBeforeUnmount() {} }
      if (name === '@dcloudio/uni-app') return { onLoad() {} }
      if (name === '@/utils/router') return {}
      if (name === '@/lib/circle-data') return { circleApi: { getMyCircles: async () => [{ id: 'circle', name: '合成圈子', rawRole: 'MEMBER' }] } }
      if (name === '@/lib/circle-consult-data') return { expertConfigApi: api, getCurrentUserId: () => 'user' }
      if (name === '@/utils/request') return { apiGet: async url => ({ circleId: 'circle', capability: url.endsWith('AUDIO_QUESTION') ? 'AUDIO_QUESTION' : 'VIDEO_QUESTION', grant: null }), apiPost: async () => { throw new Error('UNEXPECTED_GRANT_WRITE') } }
      throw new Error(name)
    },
  })
  return { ...exports, api, sheets, saved }
}
test('直授普通成员不会被设置页头衔过滤，可选音视频价格但不扩展图文权限', async () => {
  const s = settings(); await s.load()
  assert.equal(s.expertCircles.value.length, 1)
  s.pickCallPrice(); assert.equal(s.sheets.length, 1)
  s.sheets[0].success({ tapIndex: 1 }); assert.equal(s.cfg.value.callPricePerMinuteCoin, 10)
  s.cfg.value.questionPriceCoin = 40; s.pickQuestionPrice()
  assert.equal(s.cfg.value.questionPriceCoin, 0); assert.equal(s.sheets.length, 1)
  await s.save(); assert.equal(s.saved[0][0], 'circle'); assert.equal(s.saved[0][1].questionPriceCoin, 0)
})
test('未获准或撤权后只能关闭连麦，保存期间不允许选择价格', async () => {
  const s = settings(); await s.load(); s.cfg.value.audioCallApproved = false; s.cfg.value.callPricePerMinuteCoin = 20
  s.pickCallPrice(); assert.equal(s.cfg.value.callPricePerMinuteCoin, 0); assert.equal(s.sheets.length, 0)
  s.saving.value = true; s.cfg.value.audioCallApproved = true; s.pickCallPrice(); assert.equal(s.sheets.length, 0)
})
test('切换圈子后旧配置响应不覆盖当前房间设置', async () => {
  const s = settings(); await s.load()
  let resolve; s.api.get = () => new Promise(done => { resolve = done })
  const pending = s.loadConfig(); s.currentId.value = 'new-circle'; s.cfg.value = null
  resolve({ callPricePerMinuteCoin: 999 }); await pending
  assert.equal(s.cfg.value, null)
})

function pageSection(path, prefix, suffix, bindings, state) {
  const source = fs.readFileSync(path, 'utf8')
  const section = source.slice(source.indexOf(prefix), source.indexOf(suffix, source.indexOf(prefix)))
  const exports = {}
  vm.runInNewContext(compile(section + `\nexport { ${bindings} };`), { exports,
    ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), ...state })
  return exports
}
test('圈子问答失败可重试，音视频单独授权不显示无效图文按钮', async () => {
  const api = { listExperts: async () => { throw new Error('NETWORK') } }
  const s = pageSection('apps/mobile/src/pkg-circle/circles/detail.vue', 'const qaExperts =', 'function onTabTap',
    'qaExperts, qaLoading, qaLoaded, qaError, loadQaExperts', { circleId: { value: 'c1' }, consultApi: api })
  await s.loadQaExperts()
  assert.equal(s.qaLoaded.value, false); assert.equal(s.qaLoading.value, false); assert.match(s.qaError.value, /失败/)
  api.listExperts = async () => [{ id: 'voice', questionPrice: 0, audioCallEnabled: true }, { id: 'text', questionPrice: 8 }]
  await s.loadQaExperts()
  assert.equal(s.qaError.value, ''); assert.equal(s.qaLoaded.value, true)
  assert.equal(s.qaExperts.value.length, 1); assert.equal(s.qaExperts.value[0].id, 'text')
})
test('连麦页面离开后迟到响应失效，返回重新核验撤权', async () => {
  const s = booking([])
  let resolveOld
  s.api.listExperts = () => new Promise(resolve => { resolveOld = resolve })
  const old = s.hooks.show()
  s.hooks.hide()
  resolveOld([{ id: 'expert', callPrice: 8, audioCallEnabled: true }]); await old
  assert.equal(s.expert.value, null); assert.equal(s.price.value, 0)
  s.api.listExperts = async () => []
  await s.hooks.show(); assert.match(s.error.value, /暂未开通/)
})
test('达人列表每次显示重新查询，离开后旧列表与好评响应均不回填', async () => {
  const exports = {}, hooks = {}
  const api = { listExperts: async () => [{ id: 'expert', questionPrice: 8 }], getExpertRatingStats: async () => ({}) }
  const source = fs.readFileSync('apps/mobile/src/pkg-circle/circles/consult-experts.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  vm.runInNewContext(compile(source + '\nexport { experts, ratingStats, error };'), { exports, require: name => {
    if (name === 'vue') return { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }) }
    if (name === '@dcloudio/uni-app') return Object.fromEntries(['onLoad', 'onShow', 'onHide', 'onUnload'].map(key => [key, fn => { hooks[key] = fn }]))
    if (name === '@/lib/circle-consult-data') return { consultApi: api }
    if (name === '@/utils/router') return {}
    throw new Error(name)
  } })
  hooks.onLoad({ circleId: 'c1' })
  await hooks.onShow(); assert.equal(exports.experts.value.length, 1)
  let resolveStats
  api.getExpertRatingStats = () => new Promise(resolve => { resolveStats = resolve })
  const pending = hooks.onShow(); await new Promise(setImmediate)
  hooks.onHide(); resolveStats({ expert: { goodRate: 100 } }); await pending
  assert.equal(exports.experts.value.length, 0); assert.equal(Object.keys(exports.ratingStats.value).length, 0)
  api.listExperts = async () => []
  await hooks.onShow(); assert.equal(exports.experts.value.length, 0); assert.equal(exports.error.value, '')
})
test('圈子问答返回时能丢弃已加载标记，迟到结果不能恢复旧提问入口', async () => {
  let resolveOld
  const api = { listExperts: () => new Promise(resolve => { resolveOld = resolve }) }
  const s = pageSection('apps/mobile/src/pkg-circle/circles/detail.vue', 'const qaExperts =', 'function onTabTap',
    'qaExperts, qaLoaded, qaError, loadQaExperts, invalidateQaExperts', { circleId: { value: 'c1' }, consultApi: api })
  const old = s.loadQaExperts(); s.invalidateQaExperts()
  resolveOld([{ id: 'text', questionPrice: 8 }]); await old
  assert.equal(s.qaExperts.value.length, 0); assert.equal(s.qaLoaded.value, false)
  api.listExperts = async () => []
  await s.loadQaExperts(); assert.equal(s.qaExperts.value.length, 0); assert.equal(s.qaLoaded.value, true)
})
test('个人主页咨询失败不残留旧购买入口，重试及切换用户可恢复', async () => {
  const path = 'apps/mobile/src/pkg-circle/user/profile.vue'
  const source = fs.readFileSync(path, 'utf8'), exports = {}, userIdStr = { value: 'u1' }
  const api = { getUserConsultServices: async () => [{ circleId: 'c1', questionPrice: 8 }] }
  const declarations = source.slice(source.indexOf('const consultServices ='), source.indexOf('const posts ='))
  const loader = source.slice(source.indexOf('async function loadConsultServices()'), source.indexOf('async function loadProfile()'))
  const invalidator = source.slice(source.indexOf('function invalidateConsultServices()'), source.indexOf('// 加载私信关系'))
  const hooks = {}
  assert.match(source, /onShow\(loadRelationAndConsult\)/)
  vm.runInNewContext(compile(declarations + loader + invalidator + '\nexport { consultServices, consultError, consultLoading, loadConsultServices };'), {
    exports, userIdStr, consultApi: api, ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }),
    onHide: fn => { hooks.hide = fn }, onUnload: fn => { hooks.unload = fn },
  })
  await exports.loadConsultServices(); assert.equal(exports.consultServices.value.length, 1)
  api.getUserConsultServices = async () => { throw new Error('NETWORK') }
  await exports.loadConsultServices(); assert.equal(exports.consultServices.value.length, 0); assert.match(exports.consultError.value, /失败/)
  let resolveOld
  api.getUserConsultServices = () => new Promise(resolve => { resolveOld = resolve })
  const old = exports.loadConsultServices()
  userIdStr.value = 'u2'; api.getUserConsultServices = async () => [{ circleId: 'c2' }]
  await exports.loadConsultServices(); resolveOld([{ circleId: 'c1' }]); await old
  assert.equal(exports.consultServices.value[0].circleId, 'c2'); assert.equal(exports.consultError.value, '')
  assert.equal(exports.consultLoading.value, false)
  let resolveHidden
  api.getUserConsultServices = () => new Promise(resolve => { resolveHidden = resolve })
  const hidden = exports.loadConsultServices(); hooks.hide()
  resolveHidden([{ circleId: 'stale' }]); await hidden
  assert.equal(exports.consultServices.value.length, 0)
})
