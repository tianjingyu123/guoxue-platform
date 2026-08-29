import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const page = fs.readFileSync('apps/mobile/src/pkg-common/legacy-paipan/index.vue', 'utf8')
const pages = fs.readFileSync('apps/mobile/src/pages.json', 'utf8')

test('H5 旧排盘由用户手势新窗口打开并保留可见返回入口', () => {
  assert.match(page, /window\.open\('', '_blank'\)/u)
  assert.match(page, /opened\.opener = null/u)
  assert.match(page, /opened\.location\.replace\(legacyUrl\.value\)/u)
  assert.match(page, /window\.location\.assign\(legacyUrl\.value\)/u)
  assert.doesNotMatch(page, /window\.location\.replace\(entry\.url\)/u)
  assert.match(page, />返回热卜首页</u)
})

test('App 与小程序旧排盘使用默认原生导航安全区、硬件返回和受控消息桥', () => {
  assert.match(pages, /"path": "legacy-paipan\/index"[\s\S]*?"navigationBarTitleText": "旧版排盘"/u)
  const routeConfig = pages.slice(pages.indexOf('"path": "legacy-paipan/index"'), pages.indexOf('"path": "legacy-paipan/index"') + 320)
  assert.doesNotMatch(routeConfig, /"navigationStyle": "custom"/u)
  assert.match(page, /@message="handleLegacyMessage"/u)
  assert.match(page, /message\.type === 'rebu:return'/u)
  assert.match(page, /message\.action === 'return-to-rebu'/u)
  assert.match(page, /onBackPress\(\(\) =>/u)
  assert.match(page, /navigateTo\('\/pages\/index\/index'\)/u)
})
