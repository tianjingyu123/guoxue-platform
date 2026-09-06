import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('商城无推荐商品时说明真实空态，不显示无解释的空白货架', async () => {
  const page = await read('apps/mobile/src/pkg-mall/home/index.vue')
  assert.match(page, /v-else-if="error"/u)
  assert.match(page, /<AppEmpty v-if="mallProducts.length === 0" title="暂无推荐商品"/u)
  assert.match(page, /<view v-else class="prod-grid">/u)
  assert.match(page, /onPullDownRefresh\(async/u)
})

test('圈子购买说明不固定承诺未开通的提问、回放或全量内容', async () => {
  const data = await read('apps/mobile/src/lib/circle-detail-data.ts')
  const notes = data.match(/export const circleMembershipNotes[^=]*=\s*\[([\s\S]*?)\n\]/)?.[1]
  assert.ok(notes)
  assert.doesNotMatch(notes, /直接提问|直播回放|专属勋章|解锁全部/)
  assert.match(notes, /入圈不自动开通额外服务/)
  for (const name of ['preview', 'detail']) {
    const page = await read(`apps/mobile/src/pkg-circle/circles/${name}.vue`)
    assert.match(page, /v-for="\(b, i\) in circleMembershipNotes"/)
    assert.doesNotMatch(page, /解锁以下专属权益|加入后解锁全部|in memberBenefits/)
  }
})

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
  assert.match(detail, /库存 \{\{ currentStock \}\}/u, '商品详情与规格弹层必须显示同一 SKU 库存口径')
  assert.doesNotMatch(detail, /<text class="guard-desc">平台严选<\/text>/u)
})
