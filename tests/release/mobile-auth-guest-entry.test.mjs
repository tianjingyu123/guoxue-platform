import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (file) => fs.readFileSync(`apps/mobile/src/${file}`, 'utf8')

test('登录页先逛逛保持一次reLaunch且字号/触摸区域有像素下限', () => {
  const page = read('pkg-auth/login/index.vue')
  const browse = page.slice(page.indexOf('function browseAsGuest()'), page.indexOf('onUnmounted(', page.indexOf('function browseAsGuest()')))
  assert.equal((browse.match(/uni\.reLaunch\(/g) || []).length, 1)
  assert.match(page, /\.guest-entry\s*\{[\s\S]*min-height: max\(44px, 96rpx\)/)
  assert.match(page, /\.guest-entry\s*\{[\s\S]*font-size: max\(16px, 32rpx\)/)
})

test('排盘先逛逛仅局部放大，不更改旧排盘门禁或重试按钮', () => {
  const page = read('pages/paipan/index.vue')
  assert.match(page, /class="degraded-retry guest-browse" @tap="browsePublicContent">先逛逛/)
  assert.match(page, /\.degraded-retry\.guest-browse\s*\{[\s\S]*min-height: max\(44px, 96rpx\)/)
  assert.match(page, /hydratePaipanRuntime\(/)
})

test('游客登录文字与头像行为一致，称号独立，已登录文字非按钮', () => {
  const page = read('pages/profile/index.vue')
  assert.match(page, /v-if="isGuest" class="id-login" role="link" tabindex="0"[\s\S]*@tap="go\('\/mine\/edit-profile'\)"[\s\S]*@keydown="activateOnKeyboard/)
  assert.match(page, /<text v-else class="id-name" role="heading"/)
  assert.match(page, /\.id-login\s*\{[^}]*min-height: 44px/)
  assert.match(page, /class="title-chip"[\s\S]*@tap="go\('\/pkg-mine\/achievements\/index'\)"/)
})
