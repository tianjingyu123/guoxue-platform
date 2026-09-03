import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { stripTypeScriptTypes } from 'node:module'

const read = (file) => fs.readFileSync(file, 'utf8')
const copy = (value) => JSON.parse(JSON.stringify(value))

// 运行真实状态/网络适配/路由函数，网络只用内存实现，不读取账号或访问任何环境。
function runtime() {
  const storage = new Map()
  const remote = new Map()
  const navigations = [], requests = [], toasts = []
  let failSave = false, failLoad = false, beforeSaveResponse = null, saveResponseOverride
  const context = vm.createContext({
    uni: {
      getStorageSync: (key) => storage.get(key) ?? '',
      setStorageSync: (key, value) => storage.set(key, copy(value)),
      removeStorageSync: (key) => storage.delete(key),
      getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
      reLaunch: (options) => navigations.push(options),
      showToast: (options) => toasts.push(options),
    },
    track: { custom() {} },
    apiGet: async (url) => {
      requests.push({ method: 'GET', url })
      if (failLoad) throw Error('网络暂不可用')
      return copy(remote.get(storage.get('userInfo').id))
    },
    apiPut: async (url, body) => {
      requests.push({ method: 'PUT', url, body: copy(body) })
      if (failSave) throw Error('保存失败')
      const id = storage.get('userInfo').id
      remote.set(id, { id, interestCategories: [], ...remote.get(id), ...copy(body) })
      beforeSaveResponse?.()
      return copy(saveResponseOverride === undefined ? remote.get(id) : saveResponseOverride)
    },
  })
  for (const file of ['utils/storage.ts', 'utils/interests.ts', 'utils/router.ts', 'lib/interest-data.ts', 'utils/auth-journey.ts']) {
    const source = read(`apps/mobile/src/${file}`).replace(/^import[^\r\n]*$/gm, '').replace(/\bexport\s+/g, '')
    vm.runInContext(stripTypeScriptTypes(source), context, { filename: file })
  }
  const api = vm.runInContext('({clearAuthSession,setToken,setUserInfo,continueAfterLogin,completeAccountInterestGuide,hasCompletedInterestGuide,getInterestThemes,interestGuideStatus,interestThemesForCategories,hydrateAccountInterests,hydrateConfirmedInterestSave,finishAuthJourney,safeLoginRedirect})', context)
  function login(user) {
    api.clearAuthSession({ preserveLoginRedirect: true })
    api.setToken(`session-${user.id}`)
    api.setUserInfo(user)
  }
  return { context: api, storage, remote, navigations, requests, toasts, login,
    failSave: () => { failSave = true }, failLoad: () => { failLoad = true },
    beforeSave: (fn) => { beforeSaveResponse = fn },
    saveResponse: (value) => { saveResponseOverride = value },
  }
}

test('首次选择保存到账号，退出再次登录和新设备不再进入引导', async () => {
  const r = runtime()
  r.remote.set('A', { id: 'A', interestCategories: [], interestGuideCompleted: false })
  r.login(r.remote.get('A'))
  await r.context.continueAfterLogin()
  assert.equal(r.navigations.at(-1).url, '/pkg-auth/welcome/index')
  await r.context.completeAccountInterestGuide(['yixue', 'jingdian', 'yixue'])
  assert.deepEqual(r.requests.at(-1).body, { interestGuideCompleted: true, interestCategories: ['命理易学', '经典研读'] })
  assert.equal(r.context.hasCompletedInterestGuide(), true)
  r.login(r.remote.get('A'))
  await r.context.continueAfterLogin()
  assert.equal(r.navigations.at(-1).url, '/pages/index/index')
  const fresh = runtime()
  fresh.login(r.remote.get('A'))
  await fresh.context.continueAfterLogin()
  assert.equal(fresh.navigations.at(-1).url, '/pages/index/index')
})

test('主动跳过持久化完成态但不伪造或清空既有兴趣', async () => {
  const r = runtime()
  r.remote.set('A', { id: 'A', interestCategories: [], interestGuideCompleted: false })
  r.login(r.remote.get('A'))
  await r.context.completeAccountInterestGuide()
  assert.deepEqual(r.requests.at(-1).body, { interestGuideCompleted: true })
  r.login(r.remote.get('A'))
  await r.context.continueAfterLogin()
  assert.equal(r.navigations.at(-1).url, '/pages/index/index')
  assert.deepEqual(copy(r.context.getInterestThemes()), [])
})

test('历史兴趣和完成后清空都保持完成；缺字段是未知而非首次', () => {
  const { context } = runtime()
  assert.equal(context.interestGuideStatus({ id: 'A', interestCategories: ['八字'], interestGuideCompleted: false }), 'complete')
  assert.equal(context.interestGuideStatus({ id: 'A', interestCategories: [], interestGuideCompleted: true }), 'complete')
  assert.equal(context.interestGuideStatus({ id: 'A', interestCategories: [] }), 'unknown')
  assert.equal(context.interestGuideStatus({ id: 'A', interestCategories: '错误数据', interestGuideCompleted: false }), 'unknown')
  assert.deepEqual(copy(context.interestThemesForCategories(['八字', '儒学', '琴棋雅艺'])), ['yixue', 'jingdian', 'yayi'])
})

test('同机A→B→A无串号，旧全局键不生效，退出仍清凭据', () => {
  const r = runtime()
  const a = { id: 'A', interestCategories: ['命理易学'], interestGuideCompleted: true }
  r.login(a)
  assert.equal(r.context.hasCompletedInterestGuide(), true)
  r.login({ id: 'B', interestCategories: [], interestGuideCompleted: false })
  r.storage.set('user_interest_themes', ['yixue'])
  r.storage.set('user_interest_guide_completed', true)
  assert.equal(r.context.hasCompletedInterestGuide(), false)
  assert.deepEqual(copy(r.context.getInterestThemes()), [])
  assert.equal(r.context.hydrateAccountInterests(a), false)
  r.login(a)
  assert.equal(r.context.hasCompletedInterestGuide(), true)
  r.context.clearAuthSession()
  assert.equal(r.storage.has('auth_token'), false)
  assert.equal(r.storage.has('userInfo'), false)
  assert.equal(r.context.hasCompletedInterestGuide(), false)
})

test('保存失败/迟到响应不伪造完成，也不污染另一账号', async () => {
  const failed = runtime()
  failed.login({ id: 'A', interestGuideCompleted: false })
  failed.failSave()
  await assert.rejects(failed.context.completeAccountInterestGuide(['yixue']), /保存失败/)
  assert.equal(failed.context.hasCompletedInterestGuide(), false)
  assert.equal(failed.navigations.length, 0)
  const late = runtime()
  late.login({ id: 'A', interestGuideCompleted: false })
  late.beforeSave(() => late.login({ id: 'B', interestGuideCompleted: false }))
  await assert.rejects(late.context.completeAccountInterestGuide(['yixue']), /账号状态已变化/)
  assert.equal(late.context.hasCompletedInterestGuide(), false)
  assert.equal(late.storage.get('userInfo').id, 'B')
})

test('缺字段读取服务端恢复；网络失败可浏览但不写已完成', async () => {
  const r = runtime()
  r.remote.set('A', { id: 'A', interestCategories: [], interestGuideCompleted: true })
  r.login({ id: 'A' })
  await r.context.continueAfterLogin()
  assert.equal(r.requests[0].url, '/auth/me')
  assert.equal(r.context.hasCompletedInterestGuide(), true)
  const offline = runtime()
  offline.login({ id: 'A' })
  offline.failLoad()
  await offline.context.continueAfterLogin()
  assert.equal(offline.navigations.at(-1).url, '/pages/index/index')
  assert.equal(offline.context.hasCompletedInterestGuide(), false)
  assert.equal(offline.toasts.length, 1)
})

test('HTTP200但完成字段缺失/false/账号错配/兴趣异常，一律不伪报持久化成功', async () => {
  for (const response of [null, {}, { id: 'A', interestCategories: ['命理易学'] },
    { id: 'A', interestCategories: ['命理易学'], interestGuideCompleted: false },
    { id: 'B', interestCategories: [], interestGuideCompleted: true },
    { id: 'A', interestGuideCompleted: true }, { id: 'A', interestCategories: [null], interestGuideCompleted: true }]) {
    const r = runtime()
    r.login({ id: 'A', interestCategories: [], interestGuideCompleted: false })
    r.saveResponse(response)
    await assert.rejects(r.context.completeAccountInterestGuide(['yixue']), /保存尚未确认/)
    assert.equal(r.context.hasCompletedInterestGuide(), false)
    assert.deepEqual(r.storage.get('userInfo').interestCategories, [])
    assert.equal(r.navigations.length, 0)
    assert.throws(() => r.context.hydrateConfirmedInterestSave(response, 'A'), /保存尚未确认/)
  }
})

test('保存水合使用真实服务端规范化结果，而非本次请求参数', async () => {
  const r = runtime()
  r.login({ id: 'A', interestGuideCompleted: false })
  r.saveResponse({ id: 'A', interestCategories: ['经典研读'], interestGuideCompleted: true })
  await r.context.completeAccountInterestGuide(['yixue'])
  assert.deepEqual(r.storage.get('userInfo').interestCategories, ['经典研读'])
})

test('引导保留排盘目标，选择/跳过完成才消费一次，跳转失败回首页', async () => {
  for (const keys of [undefined, ['yixue']]) {
    const r = runtime()
    r.login({ id: 'A', interestGuideCompleted: false })
    const target = '/pages/paipan/index?entry=my'
    r.storage.set('login:redirect', target)
    await r.context.continueAfterLogin()
    assert.equal(r.storage.get('login:redirect'), target)
    await r.context.completeAccountInterestGuide(keys)
    r.context.finishAuthJourney()
    assert.equal(r.navigations.at(-1).url, target)
    assert.equal(r.storage.has('login:redirect'), false)
    r.navigations.at(-1).fail()
    assert.equal(r.navigations.at(-1).url, '/pages/index/index')
  }
})

test('回跳拒绝外链/未知路由/登录环/编码路径绕行，保留受信查询', () => {
  const { context } = runtime()
  for (const value of ['https://bad.example', '//bad.example', '/unknown/page', '/login', '/welcome', '/pkg-auth/login/index', '/pages/../evil', '/%2f%2fbad.example', '/pages/index/index#bad', '/pages/index/index\\bad', '/pages/index/index\n']) {
    assert.equal(context.safeLoginRedirect(value), '', value)
  }
  assert.equal(context.safeLoginRedirect('/pages/paipan/index?entry=my'), '/pages/paipan/index?entry=my')
})

test('四种成功登录、注册、欢迎和兴趣页接入统一账号旅程', () => {
  const login = read('apps/mobile/src/pkg-auth/login/index.vue')
  assert.equal((login.match(/await goAfterLogin\(\)/g) || []).length, 4)
  assert.match(login, /async function goAfterLogin\(\)\s*\{\s*await continueAfterLogin\(\)/)
  const register = read('apps/mobile/src/pkg-auth/register/index.vue')
  assert.match(register, /clearAuthSession\(\{ preserveLoginRedirect: true \}\)/)
  assert.match(register, /await continueAfterLogin\(\)/)
  assert.match(read('apps/mobile/src/pkg-auth/welcome/index.vue'), /finishAuthJourney\(\)/)
  const guide = read('apps/mobile/src/pkg-auth/interests-guide/index.vue')
  assert.match(guide, /await completeAccountInterestGuide\(keys\)[\s\S]*navigated = true[\s\S]*finishAuthJourney\(\)/)
  assert.match(guide, /if \(navigated \|\| saving\.value\) return/)
  assert.match(guide, /role="alert"/)
})

test('资料修改与引导共用词表，清空也提交完成且成功后才水合', () => {
  const profile = read('apps/mobile/src/pkg-mine/edit-profile/index.vue')
  assert.match(profile, /INTEREST_THEMES\.map\(\(theme\) => theme\.label\)/)
  assert.match(profile, /const saved = await mineApi\.updateProfile\([\s\S]*interestGuideCompleted: true[\s\S]*hydrateConfirmedInterestSave\(saved, account\.id\)/)
})
