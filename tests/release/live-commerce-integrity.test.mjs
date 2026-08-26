import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8')

test('直播观众端购买统一进入真实商城结算并携带直播来源', () => {
  for (const page of [
    'apps/mobile/src/pkg-live/watch/index.vue',
    'apps/mobile/src/pkg-live/watch/index.nvue',
    'apps/mobile/src/pkg-live/vertical/index.vue',
  ]) {
    const text = source(page)
    assert.match(text, /pkg-shop\/checkout\/index\?productId=/u, page)
    assert.match(text, /sourceContentType=LIVE&sourceContentId=/u, page)
  }
})

test('直播购买支付完成后保留返回直播间入口并恢复原观看页', () => {
  const checkout = source('apps/mobile/src/pkg-shop/checkout/index.vue')
  const paying = source('apps/mobile/src/pkg-shop/paying/index.vue')
  const success = source('apps/mobile/src/pkg-shop/pay-success/index.vue')

  assert.match(checkout, /returnLiveRoomId=\$\{encodeURIComponent\(contentSource\.value\.id\)\}/u)
  assert.match(paying, /returnLiveRoomId\.value = String\(q\?\.returnLiveRoomId/u)
  assert.match(paying, /pay-success\?orderId=\$\{orderId\.value\}\$\{liveReturn\}/u)
  assert.match(paying, /function handleCancel\([\s\S]*?returnLiveRoomId\.value[\s\S]*?pkg-live\/watch\/index/u)
  assert.match(success, /v-if="returnLiveRoomId"[\s\S]*?>返回直播间</u)
  assert.match(success, /previous\?\.route[\s\S]*?pkg-live\/watch\/index[\s\S]*?navigateBack/u)
  assert.match(success, /redirectTo\(`\/pkg-live\/watch\/index\?id=/u)
})

test('直播来源分佣前由服务端验证商品确实属于该直播间挂车', () => {
  const order = source('apps/server/src/modules/shop/shop-order.service.ts')
  const attribution = source('apps/server/src/modules/shop/shop-attribution.service.ts')

  assert.match(order, /sourceContentType === "LIVE"[\s\S]*?isLiveProductSource\(sourceContentId, dto\.targetId\)/u)
  assert.match(order, /if \(!isValidLiveSource\)[\s\S]*?sourceContentType = null;[\s\S]*?sourceContentId = null;/u)
  assert.match(attribution, /liveProduct\.findUnique\([\s\S]*?liveId_productId:[\s\S]*?liveId: liveRoomId, productId[\s\S]*?liveRoom:[\s\S]*?status/u)
  assert.match(attribution, /\["LIVING", "REPLAY"\]\.includes\(linked\.liveRoom\.status\)/u)
})

test('直播 GMV、收益与商品销量只统计该直播间来源的已支付商品订单', () => {
  const live = source('apps/server/src/modules/live/live.service.ts')
  const dashboard = source('apps/server/src/modules/live/live-dashboard.service.ts')
  const collector = source('apps/server/src/modules/live/live-data-collector.service.ts')

  for (const text of [live, dashboard, collector]) {
    assert.match(text, /type: "PRODUCT"/u)
    assert.match(text, /sourceContentType: "LIVE"/u)
    assert.match(text, /sourceContentId:/u)
    assert.match(text, /status: \{ in: \["PAID", "SHIPPED", "COMPLETED"\] \}/u)
  }
  assert.match(dashboard, /sourceContentId: roomId/u)
  assert.match(dashboard, /_sum: \{ amount: true, quantity: true \}/u)
  assert.match(dashboard, /sales: Number\(o\._sum\.quantity \|\| 0\)/u)
  assert.match(collector, /paidAt: \{ gte: oneMinuteAgo, lt: minuteStart \}/u)
})

test('主播收益使用真实佣金与打赏入账，不把直播 GMV 冒充可提现收益', () => {
  const live = source('apps/server/src/modules/live/live.service.ts')
  const earnings = source('apps/mobile/src/pkg-live/earnings/index.vue')

  assert.match(live, /ledgerEntry\.findMany\([\s\S]*?beneficiaryId: userId[\s\S]*?category: "COMMISSION"/u)
  assert.match(live, /userEarning\.findMany\([\s\S]*?scene: "LIVE_GIFT"/u)
  assert.match(live, /stats: \{ total, reward, goods, gmv, trend \}/u)
  assert.match(earnings, /带货佣金/u)
  assert.match(earnings, /直播成交额（GMV，不等于收益）/u)
  assert.match(earnings, /GMV 不计入可提现余额/u)
})

test('未接统一订单与支付引擎的旧直播秒杀入口明确标记即将开放且不再伪扣库存', () => {
  const live = source('apps/server/src/modules/live/live.service.ts')
  const controller = source('apps/server/src/modules/live/live.controller.ts')
  const method = live.match(/async flashSaleOrder\([\s\S]*?\n  \}/u)?.[0] || ''

  assert.match(method, /直播专属秒杀即将开放/u)
  assert.doesNotMatch(method, /liveFlashSale\.updateMany/u)
  assert.match(controller, /直播专属秒杀下单（即将开放）[\s\S]*?deprecated: true/u)
})

test('直播带货完整性回归已接入移动端正式门禁', () => {
  const pkg = JSON.parse(source('package.json'))
  assert.match(pkg.scripts['release:test-mobile-native-bundle'], /live-commerce-integrity\.test\.mjs/u)
})
