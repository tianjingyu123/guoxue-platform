import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { videoRuntime, videoPage } from './helpers/mobile-video-fixture.mjs'

const source = fs.readFileSync('apps/mobile/src/utils/video-comment-layout.ts', 'utf8').replace('export ', '')
const layout = vm.runInNewContext(`${stripTypeScriptTypes(source)}; videoCommentLayout`)

test('键盘覆盖和系统缩窗只扣一次，评论标题/关闭与输入均留在可视区', () => {
  for (const [viewport, base, keyboard, top] of [[844, 844, 346, 47], [498, 844, 346, 47], [667, 667, 290, 20], [375, 375, 162, 0]]) {
    const result = layout(viewport, base, keyboard, top)
    assert.ok(viewport - result.bottom - result.height >= top + 8)
    assert.ok(result.height >= 120)
    assert.equal(result.bottom, Math.max(0, keyboard - (base - viewport)))
  }
  assert.equal(layout(844, 844, 346, 47).height, layout(498, 844, 346, 47).height)
  assert.equal(layout(844, 844, 0, 47).height, 844 * 0.68)
})

test('输入聚焦/键盘开合/系统resize/关闭弹层恢复，不移动底层页面', () => {
  const r = videoRuntime()
  r.openComments()
  r.commentInputFocused.value = true
  r.onCommentKeyboardHeight({ detail: { height: 300 } })
  assert.equal(r.commentPanelStyle.value.bottom, '300px')
  const overlayHeight = r.commentPanelStyle.value.height
  r.onVideoWindowResize({ size: { windowHeight: 500 } })
  assert.equal(r.commentPanelStyle.value.bottom, '0px')
  assert.equal(r.commentPanelStyle.value.height, overlayHeight)
  r.closeComments()
  r.onVideoWindowResize({ size: { windowHeight: 800 } })
  assert.equal(r.showComments.value, false)
  assert.equal(r.commentPanelStyle.value.bottom, '0px')
  assert.equal(r.commentPanelStyle.value.height, '544px')
})

test('跨端输入禁用整页推移，仅列表收缩滚动，关闭按钮最小44px并支持键盘', () => {
  assert.match(videoPage, /:adjust-position="false"/)
  assert.match(videoPage, /@keyboardheightchange="onCommentKeyboardHeight"/)
  assert.match(videoPage, /scroll-view[^>]*enable-flex[^>]*class="cs__body"[^>]*@touchmove\.stop/)
  assert.match(videoPage, /\.cs__body\s*\{[^}]*height: 0[^}]*min-height: 0[^}]*overflow: hidden/)
  assert.match(videoPage, /\.cs__close\s*\{[^}]*min-width: 44px[^}]*min-height: 44px/)
  assert.match(videoPage, /aria-label="关闭评论"[^>]*@keydown\.enter\.prevent="closeComments"/)
})
