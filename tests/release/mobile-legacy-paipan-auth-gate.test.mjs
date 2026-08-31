import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const data = fs.readFileSync('apps/mobile/src/lib/legacy-paipan-data.ts', 'utf8')
const paipan = fs.readFileSync('apps/mobile/src/pages/paipan/index.vue', 'utf8')
const gateway = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const login = fs.readFileSync('apps/mobile/src/pkg-auth/login/index.vue', 'utf8')
const profile = fs.readFileSync('apps/mobile/src/pages/profile/index.vue', 'utf8')
const feedData = fs.readFileSync('apps/mobile/src/lib/feed-data.ts', 'utf8')
const pageLayout = fs.readFileSync('apps/mobile/src/lib/page-layout-data.ts', 'utf8')
const supportActions = fs.readFileSync('apps/mobile/src/components/common/platform-support-actions.vue', 'utf8')
const mineData = fs.readFileSync('apps/mobile/src/lib/mine-data.ts', 'utf8')

test('旧排盘用户入口的 401 不得触发全局登录页劫持', () => {
  assert.match(data, /import \{ apiGet, apiGetOptionalAuth \}/u)
  assert.match(data, /entry: \(\) => apiGetOptionalAuth<LegacyPaipanEntry>/u)
  assert.match(data, /account: \(\) => apiGetOptionalAuth<LegacyPaipanEntry>/u)
  assert.match(data, /nativeQaAccess: \(\) => apiGet</u)
})

test('排盘首页区分需要登录和真实服务故障，并允许游客返回公开页面', () => {
  assert.match(paipan, /const loginRequired = ref\(false\)/u)
  assert.match(paipan, /登录后使用排盘/u)
  assert.match(paipan, /微信或手机号快捷进入/u)
  assert.match(paipan, /先逛逛/u)
  assert.match(paipan, /navigateTo\('\/login\?paipan=1'\)/u)
  assert.match(paipan, /navigateTo\('\/pages\/index\/index'\)/u)
  assert.doesNotMatch(paipan, /if \(entryTarget !== "station" && !getToken\(\)\)/u)
})

test('旧排盘兼容页直接访问时同样不强制重启到登录页', () => {
  assert.match(gateway, /const loginRequired = ref\(false\)/u)
  assert.match(gateway, /登录后进入排盘工具/u)
  assert.match(gateway, /navigateTo\('\/login\?paipan=1'\)/u)
  assert.match(gateway, /返回热卜首页/u)
  assert.doesNotMatch(gateway, /if \(!getToken\(\)\)/u)
})

test('登录页提供明确游客出口且清除陈旧回跳，避免 iOS 重启后卡死登录页', () => {
  assert.match(login, /暂不登录，先逛逛/u)
  assert.match(login, /function browseAsGuest\(\)/u)
  assert.match(login, /uni\.removeStorageSync\('login:redirect'\)/u)
  assert.match(login, /uni\.reLaunch\(\{ url: '\/pages\/index\/index' \}\)/u)
})

test('游客进入个人中心不请求私有接口，第一页即可正常浏览', () => {
  assert.match(profile, /const isGuest = ref\(!getToken\(\)\)/u)
  assert.match(profile, /function enterGuestMode\(\)/u)
  assert.match(profile, /if \(!getToken\(\)\) \{\s*enterGuestMode\(\)\s*return\s*\}/u)
  assert.match(profile, /暂不登录也可以浏览首页、圈子和发现内容/u)
  assert.match(profile, /if \(isGuest\.value && href !== '\/vip' && href !== '\/paipan'\)/u)
  assert.match(profile, /uni\.setStorageSync\('login:redirect', '\/pages\/profile\/index'\)/u)
})

test('发现页公开分类流使用可选登录，不因陈旧凭证劫持到登录页', () => {
  const categoryBlock = feedData.slice(feedData.indexOf('export async function getCategoryFeed'), feedData.indexOf('export type SmartFeedChannel'))
  assert.match(categoryBlock, /apiGetOptionalAuth/u)
  assert.doesNotMatch(categoryBlock, /\bapiGet</u)
  assert.match(pageLayout, /apiGetOptionalAuth<RawPage \| null>/u)
  assert.doesNotMatch(pageLayout, /import \{ apiGet \}/u)
})

test('公开枢纽的消息角标在游客态不发私有请求，过期凭证也只静默降级', () => {
  assert.match(supportActions, /if \(!getToken\(\)\) \{ unreadCount\.value = 0; return \}/u)
  const unreadBlock = mineData.slice(mineData.indexOf('async getUnreadNotifyCount'), mineData.indexOf('/** 我的会员权益'))
  assert.match(unreadBlock, /apiGetOptionalAuth/u)
  assert.doesNotMatch(unreadBlock, /\bapiGet</u)
})
