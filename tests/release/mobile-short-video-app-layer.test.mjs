import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '../..')
const read = (file) => readFileSync(path.join(root, file), 'utf8')

test('App 短视频使用 WebView 同层播放器，不再由原生 video 覆盖互动区', () => {
  const page = read('apps/mobile/src/pkg-video/detail/index.vue')
  const player = read('apps/mobile/src/components/media/app-web-video.vue')

  assert.match(page, /#ifdef APP-PLUS[\s\S]*<AppWebVideo/u)
  assert.match(page, /#ifndef APP-PLUS[\s\S]*<video/u)
  assert.match(page, /:command="appPlayerCommand"/u)
  assert.match(page, /commandAppPlayer\('play'\)/u)
  assert.match(page, /commandAppPlayer\('pause'\)/u)
  assert.match(page, /commandAppPlayer\('seek', target\)/u)
  assert.match(player, /lang="renderjs"/u)
  assert.match(player, /document\.createElement\('video'\)/u)
  assert.match(player, /video\.style\.pointerEvents = 'none'/u)
  assert.match(player, /owner\.callMethod\('onRenderPlayerEvent'/u)
})

test('短视频滑动、评论和返回仍由 Vue 互动层接管', () => {
  const page = read('apps/mobile/src/pkg-video/detail/index.vue')
  assert.match(page, /<swiper[\s\S]*:vertical="true"[\s\S]*@change="onSwiperChange"/u)
  assert.match(page, /class="vp__act" @tap="openComments"/u)
  assert.match(page, /v-if="showComments" class="cs-mask"/u)
  assert.match(page, /function onBack\(/u)
  assert.match(page, /function onPressEnd\([\s\S]*Math\.abs\(dy\) >= 56/u)
})

test('短视频互动按钮满足至少 44px 的触控目标', () => {
  const page = read('apps/mobile/src/pkg-video/detail/index.vue')
  assert.match(page, /\.vp__act\s*\{[\s\S]*min-width:\s*88rpx;[\s\S]*min-height:\s*88rpx;/u)
})
