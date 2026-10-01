import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { REGISTERED_PAGE_PATHS } from '../../apps/mobile/src/utils/registered-page-paths.ts'

// 执行真实映射函数，避开 im-data 的 TIM、uni 等平台初始化副作用。
const source = fs.readFileSync(new URL('../../apps/mobile/src/lib/im-data.ts', import.meta.url), 'utf8')
const fn = source.match(/function notifyLink\([\s\S]*?\n\}/)?.[0]
assert(fn, '实际通知映射入口应存在')
const notifyLink = vm.runInNewContext(`${stripTypeScriptTypes(fn)}; notifyLink`)
const typeFn = source.match(/function mapNotifyType\([\s\S]*?\n\}/)?.[0]
const categoryFn = source.match(/function notifyCategory\([\s\S]*?\n\}/)?.[0]
assert(typeFn && categoryFn)
const classify = vm.runInNewContext(`${stripTypeScriptTypes(typeFn + '\n' + categoryFn)}; ({type:mapNotifyType, category:notifyCategory})`)

test('课程到期通知直达已登记课程详情，并保留购买目标', () => {
  const link = notifyLink('COURSE', 'course-id')
  assert.equal(link, '/pkg-course/detail/index?id=course-id')
  assert(REGISTERED_PAGE_PATHS.has(link.split('?')[0]))
})

test('支付退款通知直达已登记订单详情', () => {
  for (const type of ['ORDER', 'order']) {
    const link = notifyLink(type, 'order-id')
    assert.equal(link, '/pkg-order/detail/index?id=order-id')
    assert(REGISTERED_PAGE_PATHS.has(link.split('?')[0]))
  }
})

test('既有圈帖文章直播和用户通知映射保留', () => {
  const cases = [
    ['CIRCLE_POST', '/pkg-circle/circles/post'], ['POST', '/pkg-circle/circles/post'],
    ['ARTICLE', '/pkg-circle/articles/detail'], ['CIRCLE', '/pkg-circle/circles/detail'],
    ['LIVE', '/pkg-live/watch/index'], ['USER', '/user/example'], ['FOLLOW', '/user/example'],
  ]
  for (const [type, expected] of cases) {
    const link = notifyLink(type, 'example')
    if (expected.startsWith('/user/')) assert.equal(link, expected)
    else { assert.equal(link, `${expected}?id=example`); assert(REGISTERED_PAGE_PATHS.has(expected)) }
  }
  assert.equal(notifyLink('FEEDBACK', 'feedback-id'), '/feedback?tab=history')
})

test('目标标识不变成额外查询参数或页面片段', () => {
  const id = '合成 id&other=1#section'
  for (const type of ['COURSE', 'ORDER', 'POST', 'ARTICLE', 'CIRCLE', 'LIVE']) {
    const link = notifyLink(type, id)
    const query = new URLSearchParams(link.split('?')[1])
    assert.equal(query.get('id'), id)
    assert.deepEqual([...query.keys()], ['id'])
    assert(!link.includes('#'))
  }
  assert.equal(notifyLink('USER', 'id/path?next=1'), '/user/id%2Fpath%3Fnext%3D1')
})

test('未知类型、缺失目标和空白目标不生成死链', () => {
  for (const [type, id] of [[null, 'id'], ['COURSE', null], ['COURSE', ''], ['COURSE', '   '], ['ALIEN', 'id']]) {
    assert.equal(notifyLink(type, id), undefined)
  }
})

test('实际支付成功通知类型进入交易消息并显示订单分类', () => {
  const payment = fs.readFileSync(new URL('../../apps/server/src/modules/shop/shop-payment.service.ts', import.meta.url), 'utf8')
  const actualType = payment.match(/type:\s*"([^"]+)",\s*title:\s*"支付成功"/)?.[1]
  assert(actualType, '从实际付款通知入口取得通知类型')
  assert.equal(classify.type(actualType), 'transaction')
  assert.equal(classify.category(actualType), '订单')
})

test('支付退款与充值保留交易分类，未知业务类型仍诚实归入系统', () => {
  for (const type of ['PURCHASE', 'purchase', 'ORDER', 'REFUND', 'ORDER_REFUND_FAILED', 'PAYMENT', 'RECHARGE']) assert.equal(classify.type(type), 'transaction')
  assert.equal(classify.category('REFUND'), '退款')
  assert.equal(classify.type('COURSE_EXPIRING'), 'system')
  assert.equal(classify.type('UNKNOWN'), 'system')
})
