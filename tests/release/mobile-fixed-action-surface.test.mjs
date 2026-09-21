import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('商品详情固定购买栏使用不透明底色和清晰上边界', () => {
  const source = read('apps/mobile/src/pkg-mall/product/detail.vue')
  assert.match(source, /\.action-bar\s*\{[^}]*position:\s*fixed[^}]*background:\s*#ffffff[^}]*box-shadow:/s)
  assert.match(source, /\.spec-panel\s*\{[^}]*background:\s*#ffffff/s)
})

test('其他主要固定操作栏不再使用透明白底', () => {
  const cases = [
    ['apps/mobile/src/pkg-order/appeal/index.vue', /\.bottom-bar\s*\{[^}]*background:\s*#ffffff/s],
    ['apps/mobile/src/pkg-order/review/index.vue', /\.submit-bar\s*\{[^}]*background:\s*#ffffff/s],
    ['apps/mobile/src/pkg-report/detail/index.vue', /\.rd-footer\s*\{[^}]*background:\s*#faf8f5/s],
    ['apps/mobile/src/pkg-profile/vip/index.vue', /\.buy-bar\s*\{[^}]*background:\s*#faf8f5/s],
  ]
  for (const [path, pattern] of cases) assert.match(read(path), pattern, path)
})
