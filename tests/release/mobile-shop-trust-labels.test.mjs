import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('普通商家商品不冒充官方自营或平台严选', async () => {
  const [dataSource, card, category] = await Promise.all([
    read('apps/mobile/src/lib/shop-data.ts'),
    read('apps/mobile/src/components/cards/product-card.vue'),
    read('apps/mobile/src/pkg-mall/category/index.vue'),
  ])

  assert.match(dataSource, /isSelected\?: boolean/u)
  assert.match(dataSource, /p\.isOfficialSelfOwned \? '官方自营' : p\.isSelected \? '平台严选' : '商家商品'/u)
  assert.match(card, /if \(props\.data\.isOfficialSelfOwned\) return '官方自营'/u)
  assert.match(card, /if \(props\.data\.isSelected\) return '平台严选'/u)
  assert.match(card, /return '商家商品'/u)
  assert.doesNotMatch(card, /严选好物/u)
  assert.match(category, /p\.isOfficialSelfOwned \? '官方自营' : p\.isSelected \? '平台严选' : '商家商品'/u)
})

test('商品详情认证文案严格跟随自营或严选标记', async () => {
  const detail = await read('apps/mobile/src/pkg-mall/product/detail.vue')

  assert.match(detail, /v-else-if="product\.isSelected"[^>]*>平台严选</u)
  assert.match(detail, /product\.isOfficialSelfOwned \? '官方自营' : product\.isSelected \? '品质认证' : '平台交易保障'/u)
  assert.match(detail, /product\.isOfficialSelfOwned \? '官方直营' : product\.isSelected \? '平台严选' : '订单售后可追踪'/u)
  assert.doesNotMatch(detail, /<text class="guard-desc">平台严选<\/text>/u)
})
