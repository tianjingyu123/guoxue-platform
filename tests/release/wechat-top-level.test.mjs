import assert from 'node:assert/strict'
import test from 'node:test'
import { promoteWechatPaymentPage, navigateWechatAuthorization } from '../../apps/mobile/src/utils/wechat-top-level.ts'

function windows(embedded = true) {
  const calls = []
  const top = { location: { origin: 'https://api.rebugx.cn', replace: url => calls.push(['replace', url]), assign: url => calls.push(['assign', url]) } }
  const current = { location: { origin: top.location.origin, href: 'https://api.rebugx.cn/h5/pkg-shop/paying/index?orderId=test-order&method=wechat&amount=0.01&__contentLayer=1' }, top }
  current.self = current
  if (!embedded) current.top = current
  current.location.assign = url => calls.push(['self-assign', url])
  return { current, top, calls }
}

test('内嵌支付页在任何授权或下单前恢复顶层并保留订单参数', () => {
  const { current, calls } = windows()
  assert.equal(promoteWechatPaymentPage(current), true)
  assert.deepEqual(calls, [['replace', 'https://api.rebugx.cn/h5/pkg-shop/paying/index?orderId=test-order&method=wechat&amount=0.01']])
})
test('正常顶层支付不重复加载', () => {
  const { current, calls } = windows(false)
  assert.equal(promoteWechatPaymentPage(current), false)
  assert.deepEqual(calls, [])
})
test('授权保留 state 与回跳地址并跳转顶层而不是 iframe', () => {
  const { current, calls } = windows()
  const url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx-test&redirect_uri=https%3A%2F%2Fapi.rebugx.cn%2Fh5%2Fwechat-oauth-callback.html&state=wxpay.test#wechat_redirect'
  navigateWechatAuthorization(current, url)
  assert.deepEqual(calls, [['assign', url]])
})
test('拒绝非微信授权地址与跨域父页，不能把订单或授权发送到其他站点', () => {
  const { current, top, calls } = windows()
  assert.throws(() => navigateWechatAuthorization(current, 'https://example.com/'))
  top.location.origin = 'https://example.com'
  assert.throws(() => promoteWechatPaymentPage(current))
  assert.throws(() => navigateWechatAuthorization(current, 'https://open.weixin.qq.com/connect/oauth2/authorize'))
  assert.deepEqual(calls, [])
})
