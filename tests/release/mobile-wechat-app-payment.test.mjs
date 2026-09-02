import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('App 微信 SDK 配置与登录使用同一移动应用标识和通用链接', () => {
  const config = JSON.parse(fs.readFileSync('apps/mobile/src/manifest.json', 'utf8'))['app-plus'].distribute.sdkConfigs
  assert.deepEqual(config.payment.weixin, config.oauth.weixin)
  assert.ok(config.payment.appleiap)
})

test('App 收银台先检查 SDK，再请求服务端参数，不把 SDK success 当到账', () => {
  const page = fs.readFileSync('apps/mobile/src/pkg-shop/paying/index.vue', 'utf8')
  const app = page.slice(page.indexOf('// #ifdef APP-PLUS'), page.indexOf('// #ifndef MP-WEIXIN || H5 || APP-PLUS'))
  assert.match(app, /uni\.getProvider\(/)
  assert.match(app, /shopApi\.payOrderApp\(orderId\.value, platform\)/)
  assert.ok(app.indexOf('uni.getProvider') < app.indexOf('shopApi.payOrderApp'))
  assert.match(app, /provider: 'wxpay',\s*orderInfo,/)
  assert.doesNotMatch(app, /status\.value = 'success'|console\.(log|warn|error)/)
  assert.match(app, /clearTimers\('all'\)/)
  assert.match(page, /startPolling\(600\)/)
})

test('新增 App 下单受鉴权、频率与资金红线保护', () => {
  const controller = fs.readFileSync('apps/server/src/modules/shop/shop.controller.ts', 'utf8')
  assert.match(controller, /@Post\("orders\/:id\/pay\/app"\)\s*@RedLineGate\(RedLine\.MONEY\)\s*@UseGuards\(JwtAuthGuard, StrictRedisThrottleGuard\)/)
})
