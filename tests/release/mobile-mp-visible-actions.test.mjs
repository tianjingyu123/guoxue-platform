import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('全站设计令牌同时挂载到微信小程序 page 根节点', () => {
  const tokens = read('apps/mobile/src/styles/tokens.scss')
  assert.match(tokens, /:root,\s*\npage\s*\{[\s\S]*?--brand:/)
  assert.match(tokens, /--card:\s*var\(--pure-white\)/)
  assert.match(tokens, /--classics-bg:\s*#f4f2ee/)
})

test('古籍关键入口具备小程序实色兜底', () => {
  const home = read('apps/mobile/src/pkg-classics/home/index.vue')
  const detail = read('apps/mobile/src/pkg-classics/detail/index.vue')
  assert.match(home, /\.ch-circle-btn[\s\S]*?background:\s*rgba\(255, 255, 255, 0\.92\)/)
  assert.match(home, /\.ch-continue[\s\S]*?background:\s*var\(--card, #ffffff\)/)
  assert.match(detail, /\.cd-coread-icon[\s\S]*?background:\s*var\(--brand, #c41e3a\)/)
  assert.match(detail, /\.cd-read-btn[\s\S]*?background:\s*var\(--brand, #c41e3a\)/)
})

test('文章互动操作进入正文流，评论输入按需出现', () => {
  const article = read('apps/mobile/src/pkg-circle/articles/detail.vue')
  assert.match(article, /class="ad-inline-actions"/)
  assert.match(article, /:deferred-input="true"/)
  assert.doesNotMatch(article, /#bar-actions/)
  assert.match(article, /\.ad-bottom-pad\s*\{\s*height:\s*calc\(40rpx/)
})
