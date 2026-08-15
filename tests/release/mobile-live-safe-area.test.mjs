import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function source(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

const immersiveLivePages = [
  'apps/mobile/src/pkg-live/host/index.nvue',
  'apps/mobile/src/pkg-live/watch/index.vue',
  'apps/mobile/src/pkg-live/vertical/index.vue',
  'apps/mobile/src/pkg-live/horizontal/index.vue',
  'apps/mobile/src/pkg-live/console/index.vue',
  'apps/mobile/src/pkg-live/create/index.vue',
  'apps/mobile/src/pkg-live/end/index.vue',
]

const highRiskCustomNavigationPages = [
  'apps/mobile/src/pkg-live/plaza/index.vue',
  'apps/mobile/src/pkg-course/player/index.vue',
  'apps/mobile/src/pkg-agent/agent/voice-call.vue',
]

test('直播沉浸式页面统一使用运行时安全区', () => {
  for (const relativePath of immersiveLivePages) {
    const content = source(relativePath)
    assert.match(content, /useAppSafeArea|getSystemInfoSync/, `${relativePath} 未接入运行时安全区`)
    assert.doesNotMatch(
      content,
      /env\(safe-area-inset-(?:top|right|bottom|left)\)/,
      `${relativePath} 仍依赖 App WebView 中不稳定的 CSS safe-area env`,
    )
  }
})

test('圈子内发起直播的必经详情页使用运行时顶部安全区', () => {
  const content = source('apps/mobile/src/pkg-circle/circles/detail.vue')
  assert.match(content, /useAppSafeArea/)
  assert.match(content, /:style="\{ paddingTop: safeTop \+ 'px' \}"/)
  assert.doesNotMatch(content, /padding-top:\s*var\(--status-bar-height/)
})

test('直播广场、课程播放器和语音通话不再依赖隐式安全区', () => {
  for (const relativePath of highRiskCustomNavigationPages) {
    const content = source(relativePath)
    assert.match(content, /useAppSafeArea|getSystemInfoSync/, `${relativePath} 未接入运行时安全区`)
    assert.match(content, /safeTop/, `${relativePath} 顶部控件未使用运行时安全区`)
    assert.match(content, /safeBottom/, `${relativePath} 底部控件未使用运行时安全区`)
    assert.doesNotMatch(
      content,
      /env\(safe-area-inset-(?:top|right|bottom|left)\)/,
      `${relativePath} 仍依赖 App WebView 中不稳定的 CSS safe-area env`,
    )
  }
})

test('主播页不允许回退到固定安全区占位', () => {
  const content = source('apps/mobile/src/pkg-live/host/index.nvue')
  assert.doesNotMatch(content, /safe-top|safe-bottom/)
  assert.doesNotMatch(content, /padding-top:\s*68rpx|padding-bottom:\s*26rpx/)
  assert.match(content, /:style="topbarStyle"/)
  assert.match(content, /:style="bottombarStyle"/)
})

test('固定高度直播导航在全局 border-box 下保留完整安全区高度', () => {
  const createPage = source('apps/mobile/src/pkg-live/create/index.vue')
  const consolePage = source('apps/mobile/src/pkg-live/console/index.vue')

  assert.match(createPage, /\.nav\s*\{[^}]*box-sizing:\s*content-box/s)
  assert.match(consolePage, /\.topbar\s*\{[^}]*box-sizing:\s*content-box/s)
  assert.match(consolePage, /\.sk-topbar\s*\{[^}]*box-sizing:\s*content-box/s)
})

test('横屏直播控件位置由旋转后的安全区动态计算', () => {
  const content = source('apps/mobile/src/pkg-live/horizontal/index.vue')
  assert.doesNotMatch(content, /top:\s*64px/)
  assert.match(content, /safeTop \+ 64/)
  assert.match(content, /safeLeft \+ 16/)
  assert.match(content, /safeRight \+ 16/)
  assert.match(content, /safeBottom \+ 16/)
})

test('主播采集和观众语音连麦在调用 TRTC 前申请最小权限', () => {
  const permissions = source('apps/mobile/src/pkg-live/app-capture-permissions.ts')
  const host = source('apps/mobile/src/pkg-live/host/index.nvue')
  const micSheet = source('apps/mobile/src/pkg-live/mic-connect-sheet.vue')

  assert.match(permissions, /export async function ensureLiveCapturePermissions/)
  assert.match(permissions, /export async function ensureLiveAudioPermission/)
  assert.match(permissions, /android\.permission\.CAMERA/)
  assert.match(permissions, /android\.permission\.RECORD_AUDIO/)
  assert.ok(
    host.indexOf('await ensureLiveCapturePermissions()') < host.indexOf('await joinLiveVideo('),
    '主播页必须在加入 TRTC 前完成相机和麦克风授权',
  )
  assert.match(micSheet, /await ensureLiveAudioPermission\(\)/)
})

test('控制台返回和系统返回都先恢复主播页，再由主播页接管下播确认', () => {
  const host = source('apps/mobile/src/pkg-live/host/index.nvue')
  const consolePage = source('apps/mobile/src/pkg-live/console/index.vue')

  assert.match(consolePage, /function returnToHost\(\)/)
  assert.match(consolePage, /uni\.navigateBack\(/)
  assert.match(consolePage, /onBackPress\(\(\) =>/)
  assert.doesNotMatch(consolePage, /live:host-console-return/)
  assert.doesNotMatch(host, /allowConsoleReturnUntil/)
  assert.match(host, /onBackPress\(\(\) =>/)
  assert.match(host, /requestEnd\(\)/)
  assert.match(host, /requestEnd\(\)\s*\n\s*return true/)
})
