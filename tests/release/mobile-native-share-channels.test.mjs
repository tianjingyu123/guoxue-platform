import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8')

test('App 正式包声明微信与系统分享能力，复制链接只作为兜底', () => {
  const manifest = source('apps/mobile/src/manifest.json')
  const sheet = source('apps/mobile/src/components/common/content-share-sheet.vue')

  assert.match(manifest, /"Share"\s*:\s*\{\}/)
  assert.match(manifest, /"share"\s*:\s*\{[\s\S]*?"weixin"/)
  assert.match(sheet, /scene:\s*'WXSceneSession'/)
  assert.match(sheet, /scene:\s*'WXSceneTimeline'/)
  assert.match(sheet, /plus\.share\.sendWithSystem/)
  assert.match(sheet, />微信好友</)
  assert.match(sheet, />朋友圈</)
  assert.match(sheet, />更多平台</)
  assert.match(sheet, />分享海报</)
  assert.match(sheet, />复制链接</)
  assert.match(sheet, /shareLink\(\{ title: props\.title, text: props\.summary, url: props\.url \}\)/)

  const posterLabelAt = sheet.indexOf('aria-label="生成分享海报"')
  const posterBlock = sheet.slice(sheet.lastIndexOf('<view', posterLabelAt), posterLabelAt)
  assert.match(posterBlock, /v-if="posterEnabled"/, '无海报数据的页面必须隐藏海报入口')
  const moreLabelAt = sheet.indexOf('aria-label="分享到更多平台"')
  const moreBlock = sheet.slice(sheet.lastIndexOf('<view', moreLabelAt), moreLabelAt)
  assert.doesNotMatch(moreBlock, /v-if="posterEnabled"/, '更多平台不能被海报能力误伤')

  const shareUtil = source('apps/mobile/src/utils/share.ts')
  assert.match(shareUtil, /plus\.share\.sendWithSystem/)
  assert.ok(shareUtil.indexOf('plus.share.sendWithSystem') < shareUtil.indexOf('return copyLink(url)'), 'App 必须先尝试系统分享，复制只能兜底')
})

test('视频、直播、课程和商品使用真实内容生成差异化分享卡片与深链', () => {
  const pages = [
    ['apps/mobile/src/pkg-video/detail/index.vue', /kind="video"/, /videoShareTitle/, /buildShareUrl/],
    ['apps/mobile/src/pkg-live/watch/index.vue', /kind="live"/, /liveShareTitle/, /buildH5Url\('pkg-live\/watch\/index'/],
    ['apps/mobile/src/pkg-course/detail/index.vue', /kind="course"/, /courseShareTitle/, /buildH5Url\('pkg-course\/detail\/index'/],
    ['apps/mobile/src/pkg-mall/product/detail.vue', /kind="product"/, /productShareTitle/, /buildH5Url\('pkg-mall\/product\/detail'/],
    ['apps/mobile/src/pkg-circle/articles/detail.vue', /kind="article"/, /articleShareTitle/, /buildH5Url\('pkg-circle\/articles\/detail'/],
    ['apps/mobile/src/pkg-circle/circles/detail.vue', /kind="circle"/, /circleShareTitle/, /buildH5Url\('pkg-circle\/circles\/detail'/],
    ['apps/mobile/src/pkg-operator/station-home/index.vue', /kind="station"/, /stationShareTitle/, /buildH5Url\('\/pkg-operator\/station-home\/index'/],
    ['apps/mobile/src/pkg-shop/group-buy/index.vue', /kind="product"/, /groupShareTitle/, /buildH5Url\('pkg-shop\/group-buy\/detail'/],
    ['apps/mobile/src/pkg-activity/detail/index.vue', /kind="activity"/, /activityShareTitle/, /buildH5Url\('pkg-activity\/detail\/index'/],
  ]

  for (const [file, kind, title, link] of pages) {
    const page = source(file)
    assert.match(page, /ContentShareSheet/)
    assert.match(page, /<(?:content-share-sheet|ContentShareSheet)/)
    assert.match(page, kind)
    assert.match(page, title)
    assert.match(page, link)
    assert.match(page, /onShareAppMessage/)
    assert.match(page, /onShareTimeline/)
  }
})

test('分站、拼团与活动不再展示无点击行为的伪分享渠道', () => {
  const station = source('apps/mobile/src/pkg-operator/station-home/index.vue')
  const groupBuy = source('apps/mobile/src/pkg-shop/group-buy/index.vue')
  const activity = source('apps/mobile/src/pkg-activity/detail/index.vue')

  assert.doesNotMatch(station, /@tap="copyLink"/)
  assert.doesNotMatch(groupBuy, /class="way"[^>]*>\s*<view/u)
  assert.doesNotMatch(activity, /v-for="it in shareItems"/)
  assert.match(station, /:poster-enabled="false"/)
  assert.match(groupBuy, /:poster-enabled="false"/)
  assert.match(activity, /:poster-enabled="false"/)
})

test('直播横屏与竖屏入口不再退化为只复制链接', () => {
  for (const file of [
    'apps/mobile/src/pkg-live/horizontal/index.vue',
    'apps/mobile/src/pkg-live/vertical/index.vue',
  ]) {
    const page = source(file)
    const shareBlock = page.slice(page.indexOf('async function onShare()'), page.indexOf('//', page.indexOf('async function onShare()')))
    assert.match(shareBlock, /await shareLink\(/)
    assert.match(shareBlock, /title:/)
    assert.match(shareBlock, /text:/)
    assert.match(shareBlock, /imageUrl:/)
    assert.doesNotMatch(shareBlock, /setClipboardData/)
  }
})

test('分享门禁进入正式客户端测试束', () => {
  const pkg = JSON.parse(source('package.json'))
  assert.match(pkg.scripts['release:test-mobile-native-bundle'], /mobile-native-share-channels\.test\.mjs/)
  assert.match(pkg.scripts['release:test-mobile-native-bundle'], /mobile-classics-overlay-scroll\.test\.mjs/)
})
