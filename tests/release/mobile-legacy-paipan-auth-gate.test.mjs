import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const data = fs.readFileSync('apps/mobile/src/lib/legacy-paipan-data.ts', 'utf8')
const paipan = fs.readFileSync('apps/mobile/src/pages/paipan/index.vue', 'utf8')
const gateway = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const login = fs.readFileSync('apps/mobile/src/pkg-auth/login/index.vue', 'utf8')

test('旧排盘用户入口的 401 不得触发全局登录页劫持', () => {
  assert.match(data, /import \{ apiGet, apiGetOptionalAuth \}/u)
  assert.match(data, /entry: \(\) => apiGetOptionalAuth<LegacyPaipanEntry>/u)
  assert.match(data, /account: \(\) => apiGetOptionalAuth<LegacyPaipanEntry>/u)
  assert.match(data, /nativeQaAccess: \(\) => apiGet</u)
})

test('排盘首页区分需要登录和真实服务故障，并允许游客返回公开页面', () => {
  assert.match(paipan, /const loginRequired = ref\(false\)/u)
  assert.match(paipan, /登录后使用排盘/u)
  assert.match(paipan, /登录后进入排盘/u)
  assert.match(paipan, /先逛逛/u)
  assert.match(paipan, /navigateTo\('\/login'\)/u)
  assert.match(paipan, /navigateTo\('\/pages\/index\/index'\)/u)
})

test('旧排盘兼容页直接访问时同样不强制重启到登录页', () => {
  assert.match(gateway, /const loginRequired = ref\(false\)/u)
  assert.match(gateway, /登录后进入旧版排盘/u)
  assert.match(gateway, /navigateTo\('\/login'\)/u)
  assert.match(gateway, /返回热卜首页/u)
})

test('登录页提供明确游客出口且清除陈旧回跳，避免 iOS 重启后卡死登录页', () => {
  assert.match(login, /暂不登录，先逛逛/u)
  assert.match(login, /function browseAsGuest\(\)/u)
  assert.match(login, /uni\.removeStorageSync\('login:redirect'\)/u)
  assert.match(login, /navigateTo\('\/pages\/index\/index'\)/u)
})
