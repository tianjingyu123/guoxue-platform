import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const reader = readFileSync('apps/mobile/src/pkg-classics/reader/index.vue', 'utf8')

test('古籍目录与 AI 解析弹层在真机拥有确定高度并独立滚动', () => {
  assert.match(reader, /<scroll-view scroll-y enable-flex class="rd-sheet-body" @touchmove\.stop>/u)
  assert.match(reader, /scroll-y enable-flex class="rd-toc-body"/u)
  assert.match(reader, /\.rd-sheet--ai, \.rd-sheet--dict \{ height: 70vh; max-height: 70vh; \}/u)
  assert.match(reader, /\.rd-sheet-tall \{ height: 82vh; max-height: 82vh; \}/u)
  assert.match(reader, /\.rd-sheet-body \{ height: 0;[\s\S]*overflow: hidden; \}/u)
  assert.match(reader, /\.rd-toc-body \{ height: 0;[\s\S]*overflow: hidden; \}/u)
})

test('弹层遮罩阻止滚动穿透，滚动区本身不被 prevent 掐断', () => {
  assert.match(reader, /class="rd-mask" @tap="closeAi" @touchmove\.self\.prevent/u)
  assert.match(reader, /class="rd-mask" @tap="closeToc" @touchmove\.self\.prevent/u)
  assert.doesNotMatch(reader, /class="rd-sheet-body" @touchmove\.prevent/u)
  assert.doesNotMatch(reader, /class="rd-toc-body"[^>]*@touchmove\.prevent/u)
})
