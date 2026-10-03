import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const loginSource = readFileSync('apps/mobile/src/pkg-auth/login/index.vue', 'utf8')

test('微信登录使用登录分包内的轻量双气泡品牌标识', () => {
  assert.doesNotMatch(loginSource, /<AppIcon\s+name="wechat"/)
  assert.match(loginSource, /class="wechat-mark"/)
  assert.match(loginSource, /class="wechat-bubble wechat-bubble-primary"/)
  assert.match(loginSource, /class="wechat-bubble wechat-bubble-secondary"/)
  assert.match(loginSource, /\.wechat-bubble\s*\{[\s\S]*background:\s*#07c160;/)
})
