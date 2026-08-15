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
  'apps/mobile/src/pkg-live/watch/index.nvue',
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
  const topbarStyle = content.match(/const topbarStyle = computed\(\(\) => \(\{[\s\S]*?\}\)\)/)?.[0] || ''
  assert.match(topbarStyle, /top:/)
  assert.doesNotMatch(topbarStyle, /paddingTop:/)
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

test('App 观众端使用同路由 nvue 承载原生视频与互动层', () => {
  const audience = source('apps/mobile/src/pkg-live/watch/index.nvue')
  const pages = source('apps/mobile/src/pages.json')
  const mainPackages = pages.slice(0, pages.indexOf('"subPackages"'))
  const liveSubPackage = pages.slice(pages.indexOf('"root": "pkg-live"'))

  assert.match(audience, /<video[\s\S]*id="live-audience-player"/)
  assert.match(audience, /class="comment-stack"/)
  assert.match(audience, /class="bottom-dock"/)
  assert.match(audience, /<cover-view class="topbar"/)
  assert.match(audience, /<cover-view class="comment-stack"/)
  assert.match(audience, /<cover-view class="bottom-dock"/)
  assert.match(audience, /<cover-view v-if="showCommentComposer" class="composer-mask"/)
  assert.match(audience, /<cover-view v-if="showMicSheet && micState !== 'connected'" class="mic-mask"/)
  const roomMetaStyle = audience.match(/const roomMetaStyle = computed\(\(\) => \(\{[\s\S]*?\}\)\)/)?.[0] || ''
  assert.match(roomMetaStyle, /top:/)
  assert.doesNotMatch(roomMetaStyle, /bottom:/)
  assert.match(audience, /圈内 · \$\{room\.circleName\}/)
  assert.match(audience, /class="dock-action mic-action"/)
  assert.match(audience, /micState === 'connected' \? '连麦中' : micState === 'requesting' \? '等待中' : '连麦'/)
  assert.match(audience, /liveApi\.sendComment\(/)
  assert.match(audience, /await ensureLiveAudioPermission\(\)/)
  assert.match(audience, /await joinLiveAudio\(/)
  assert.match(audience, /:muted="micRealtimeAudioActive"/)
  assert.match(audience, /const roomEnded = computed/)
  assert.match(audience, /setInterval\(\(\) => \{ void pollRoomStatus\(\) \}, 5000\)/)
  assert.match(audience, /v-if="roomEnded" class="ended-mask"/)
  assert.match(audience, /playUrl\.value = null/)
  assert.match(audience, /onBackPress\(\(\) => \{\s*if \(roomEnded\.value\) return false/)
  assert.match(mainPackages, /"path":\s*"pkg-live\/watch\/index"/)
  assert.match(liveSubPackage, /#ifndef APP-PLUS[\s\S]*"path":\s*"watch\/index"[\s\S]*#endif/)
})

test('主播在直播间内轮询公屏并直接处理连麦申请', () => {
  const host = source('apps/mobile/src/pkg-live/host/index.nvue')

  assert.match(host, /await liveApi\.getConsoleData\(/)
  assert.match(host, /await liveMicApi\.list\(/)
  assert.match(host, /item\.status === 'PENDING'/)
  assert.match(host, /managePendingMic\('ACCEPT'\)/)
  assert.match(host, /managePendingMic\('REJECT'\)/)
  assert.match(host, /stats\.onlineCount/)
  assert.match(host, /class="danmaku-head"/)
  assert.match(host, /const connectedMic = computed/)
  assert.match(host, /manageActiveMic\(connectedMic\.status === 'MUTED' \? 'UNMUTE' : 'MUTE'\)/)
  assert.match(host, /manageActiveMic\('KICK'\)/)
  assert.match(host, /setLiveRemoteUserLeaveHandler\(handleRemoteUserLeave\)/)
  assert.match(host, /class="end-confirm"/)
  assert.match(host, /endConfirmVisible\.value = true/)
  assert.doesNotMatch(host, /uni\.showModal\(/)
})

test('观众连麦与主播视频使用同一 TRTC 直播场景', () => {
  const client = source('apps/mobile/src/pkg-live/live-trtc-client.ts')

  assert.doesNotMatch(client, /APP_SCENE_VOICE_CHAT_ROOM/)
  assert.equal((client.match(/appScene:\s*APP_SCENE_LIVE/g) || []).length, 2)
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
