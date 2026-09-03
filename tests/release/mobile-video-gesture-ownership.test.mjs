import assert from 'node:assert/strict'
import test from 'node:test'
import { videoRuntime, rendererFixture, videoPage } from './helpers/mobile-video-fixture.mjs'

const tap = (renderer) => { renderer.dispatch('touchstart'); renderer.dispatch('touchend') }

test('一次真实触摸+16ms后祖先合成tap：只暂停一次，不误判点赞', () => {
  const r = videoRuntime()
  const player = rendererFixture((detail) => r.onAppPlayerGesture(detail, 'test-video'))
  tap(player)
  r.clock.advance(16)
  r.onLayerTap({ detail: { clientX: 180, clientY: 320 } })
  r.clock.advance(300)
  assert.deepEqual(r.commands, ['pause'])
  assert.equal(r.currentVideo.value.isLiked, false)
  const click = player.dispatch('click')
  assert.equal(click.stopped, true)
  assert.equal(click.prevented, true)
})

test('两次不同真实手势才双击加赞；重复end只处理一次，已赞不取消', async () => {
  let likes = 0
  const r = videoRuntime({ like: async () => { likes++; return { isLiked: true, likeCount: 8 } } })
  const player = rendererFixture((detail) => r.onAppPlayerGesture(detail, 'test-video'))
  tap(player); player.dispatch('touchend')
  r.clock.advance(100); tap(player)
  await new Promise((resolve) => setImmediate(resolve))
  r.clock.advance(500)
  assert.equal(likes, 1)
  assert.equal(r.currentVideo.value.likes, 8)
  assert.deepEqual(r.commands, [])
  tap(player); r.clock.advance(100); tap(player)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(likes, 1)
  assert.deepEqual(player.events.filter((e) => e.type === 'gesture').slice(0, 4).map((e) => e.detail.gestureId), [1, 1, 2, 2])
})

test('相隔280ms的两次单击各执行一次，不丢失边界点击', () => {
  const r = videoRuntime()
  const player = rendererFixture((detail) => r.onAppPlayerGesture(detail, 'test-video'))
  tap(player); r.clock.advance(280); tap(player); r.clock.advance(280)
  assert.deepEqual(r.commands, ['pause', 'play'])
})

test('上下滑一次切一条；拖动后回原点不会播放或点赞', () => {
  const r = videoRuntime()
  const player = rendererFixture((detail) => r.onAppPlayerGesture(detail, r.currentVideo.value.id))
  player.dispatch('touchstart', 180, 600); player.dispatch('touchmove', 180, 300); player.dispatch('touchend', 180, 300)
  assert.equal(r.currentIndex.value, 1)
  player.dispatch('touchstart', 180, 300); player.dispatch('touchmove', 180, 600); player.dispatch('touchend', 180, 600)
  assert.equal(r.currentIndex.value, 0)
  player.dispatch('touchstart', 180, 320); player.dispatch('touchmove', 210, 320); player.dispatch('touchend', 180, 320)
  r.clock.advance(500)
  assert.deepEqual(r.commands, [])
})

test('长按倍速/取消/离页和换片均取消待执行单击；旧视频桥不影响新视频', () => {
  const r = videoRuntime()
  const player = rendererFixture((detail) => r.onAppPlayerGesture(detail, 'test-video'))
  player.dispatch('touchstart'); r.clock.advance(500); player.dispatch('touchend'); r.clock.advance(500)
  assert.deepEqual(r.commands, ['rate:2', 'rate:1'])
  r.commands.length = 0
  tap(player); player.dispatch('touchstart'); player.dispatch('touchcancel'); r.clock.advance(400)
  assert.deepEqual(r.commands, [])
  tap(player); r.switchTo(1); r.clock.advance(400); tap(player); r.clock.advance(400)
  assert.deepEqual(r.commands, [])
  r.switchTo(0); tap(player); r.hidden[0](); r.clock.advance(400)
  assert.deepEqual(r.commands, ['pause'])
  r.commands.length = 0
  tap(player); r.unmounted[0](); r.clock.advance(400)
  assert.deepEqual(r.commands, [])
})

test('暂停图标单独恢复播放并取消待判断tap；模板保持跨端隔离', () => {
  const r = videoRuntime()
  r.onSingleTap({}); r.resumePausedVideo(); r.clock.advance(400)
  assert.deepEqual(r.commands, ['play'])
  assert.match(videoPage, /@gesture="onAppPlayerGesture\(\$event, v\.id\)"/)
  assert.match(videoPage, /class="vp__pause" @tap\.stop="resumePausedVideo"/)
  assert.match(videoPage, /#ifndef APP-PLUS[\s\S]*@tap\.stop="onSingleTap"/)
})
