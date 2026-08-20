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
  assert.match(audience, /<swiper[\s\S]*vertical[\s\S]*@change="onFeedChange"/)
  assert.match(audience, /<video[\s\S]*autoplay/)
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
  assert.match(audience, /room\.visibility === 'CIRCLE_ONLY'/)
  assert.match(audience, /room\.circleName/)
  assert.match(audience, /class="social-rail"/)
  assert.match(audience, /class="rail-action" @click="openMicSheet"/)
  assert.match(audience, /class="audience-stack"/)
  assert.match(audience, /class="host-verified"/)
  assert.match(audience, /room\.followers != null/)
  assert.match(audience, /liveApi\.isFollowingHost\(detail\.room\.hostId\)/)
  assert.match(audience, /class="quality-chip"/)
  assert.match(audience, /class="live-safety-strip"/)
  assert.match(audience, /文明互动 · 理性消费/)
  assert.match(audience, /class="dock-share" @click="shareRoom"/)
  assert.match(audience, /class="like-feedback"/)
  assert.match(audience, /function likeParticleStyle/)
  assert.match(audience, /function startLikeParticleTicker/)
  assert.doesNotMatch(audience, /@keyframes live-heart-rise/)
  assert.doesNotMatch(audience, /title: '已点赞'/)
  assert.match(audience, /micState === 'connected' \? '连麦中' : micState === 'requesting' \? '等待中' : '连麦'/)
  assert.match(audience, /liveApi\.sendComment\(/)
  assert.match(audience, /await ensureLiveAudioPermission\(\)/)
  assert.match(audience, /await joinLiveAudio\(/)
  assert.match(audience, /:muted="micRealtimeAudioActive"/)
  assert.match(audience, /const roomEnded = computed/)
  assert.match(audience, /endCountdown\.value = 3/)
  assert.match(audience, /if \(hasNextRoom\.value\) void switchToFeedIndex\(feedIndex\.value \+ 1\)/)
  assert.match(audience, /else returnToLiveEntrance\(\)/)
  assert.match(audience, /setInterval\(\(\) => \{ void pollRoomStatus\(\) \}, 5000\)/)
  assert.match(audience, /v-if="roomEnded" class="ended-mask"/)
  assert.match(audience, /playUrl\.value = null/)
  assert.match(audience, /onBackPress\(\(\) => \{\s*if \(roomEnded\.value\) return false/)
  assert.match(mainPackages, /"path":\s*"pkg-live\/watch\/index"/)
  assert.match(liveSubPackage, /#ifndef APP-PLUS[\s\S]*"path":\s*"watch\/index"[\s\S]*#endif/)
})

test('App 全屏直播 nvue 页面不允许被自动滚动容器包裹', () => {
  const pages = source('apps/mobile/src/pages.json')
  for (const route of ['pkg-live/host/index', 'pkg-live/watch/index']) {
    const routeStart = pages.indexOf(`"path": "${route}"`)
    assert.notEqual(routeStart, -1, `${route} 未注册为 App 主包页面`)
    const routeConfig = pages.slice(routeStart, routeStart + 320)
    assert.match(
      routeConfig,
      /"disableScroll"\s*:\s*true/,
      `${route} 必须禁用 nvue 自动 scroller，确保视频层和互动覆盖层共用全屏坐标系`,
    )
  }
})

test('直播全域视觉保留主舞台与专业工作台层级', () => {
  const plaza = source('apps/mobile/src/pkg-live/plaza/index.vue')
  const create = source('apps/mobile/src/pkg-live/create/index.vue')
  const consolePage = source('apps/mobile/src/pkg-live/console/index.vue')
  const obs = source('apps/mobile/src/pkg-live/obs/index.vue')

  assert.match(plaza, /LIVE DISCOVERY/)
  assert.match(plaza, /class="discovery-hero"/)
  assert.match(plaza, /今日现场 · 知识与生活正在发生/)
  assert.match(create, /LIVE CREATOR STUDIO/)
  assert.match(create, /把一场直播，策划成一次值得停留的现场/)
  assert.match(create, /内容策划/)
  assert.match(create, /互动与经营/)
  assert.match(create, /发布检查/)
  assert.match(consolePage, /REBUGX LIVE STUDIO/)
  assert.match(consolePage, /公屏与数据每 3 秒同步/)
  assert.match(obs, /OBS LIVE CONTROL/)
  assert.match(obs, /真实媒体流检测/)
  assert.match(obs, /短期密钥保护/)
})

test('直播 nvue 不使用已知跨机型不稳定的样式属性', () => {
  for (const relativePath of [
    'apps/mobile/src/pkg-live/host/index.nvue',
    'apps/mobile/src/pkg-live/watch/index.nvue',
  ]) {
    const content = source(relativePath)
    assert.doesNotMatch(content, /\bletter-spacing\s*:/, `${relativePath} 使用 nvue 不支持的 letter-spacing`)
    assert.doesNotMatch(content, /\btext-shadow\s*:/, `${relativePath} 使用 nvue 不支持的 text-shadow`)
    assert.doesNotMatch(content, /\balign-self\s*:/, `${relativePath} 使用 nvue 不支持的 align-self`)
    assert.doesNotMatch(content, /\bmin-(?:width|height)\s*:/, `${relativePath} 使用 nvue 不支持的 min-size`)
  }
})

test('主播在直播间内轮询公屏并直接处理连麦申请', () => {
  const host = source('apps/mobile/src/pkg-live/host/index.nvue')

  assert.match(host, /await liveApi\.getConsoleData\(/)
  assert.match(host, /await liveMicApi\.list\(/)
  assert.match(host, /item\.status === 'PENDING'/)
  assert.match(host, /managePendingMic\('ACCEPT'\)/)
  assert.match(host, /managePendingMic\('REJECT'\)/)
  assert.match(host, /stats\.onlineCount/)
  assert.match(host, /热卜 LIVE STUDIO/)
  assert.match(host, /outputWarning \? '分发恢复中' : '推流稳定'/)
  assert.match(host, /outputWarning\.value \? 196 : 116/)
  assert.match(host, /room-output-pill\.recovering/)
  assert.match(host, /stats\.interactionRate/)
  assert.match(host, /class="danmaku-head"/)
  assert.match(host, /const connectedMics = computed/)
  assert.match(host, /const compactSeatMics = computed/)
  assert.match(host, /v-for="item in compactSeatMics"/)
  assert.match(host, /manageActiveMic\(item, action\)/)
  assert.match(host, /class="host-composer-sheet"/)
  assert.match(host, /await liveApi\.sendComment\(roomId\.value, content\)/)
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

test('观众连麦申请显式使用 1-6 号麦位并在占位冲突时顺延', () => {
  const micApi = source('apps/mobile/src/pkg-live/live-mic-data.ts')

  assert.match(micApi, /MIC_SEAT_POSITIONS\s*=\s*\[1,\s*2,\s*3,\s*4,\s*5,\s*6\]/)
  assert.match(micApi, /position:\s*candidate/)
  assert.match(micApi, /isSeatOccupiedError\(error\)/)
})

test('观众直播进入即自动播放且隐藏原生播放控件', () => {
  const audience = source('apps/mobile/src/pkg-live/watch/index.nvue')

  assert.match(audience, /\bautoplay\b/)
  assert.match(audience, /@loadedmetadata="ensureAudiencePlayback"/)
  assert.match(audience, /uni\.createVideoContext\('live-audience-player'\)\.play\(\)/)
  assert.match(audience, /onShow\(\(\) => \{[\s\S]*ensureAudiencePlayback\(\)/)
  assert.match(audience, /:controls="false"/)
  assert.match(audience, /:show-center-play-btn="false"/)
  assert.match(audience, /:show-play-btn="false"/)
  assert.match(audience, /:show-fullscreen-btn="false"/)
  assert.match(audience, /:enable-progress-gesture="false"/)
})

test('全端观众在线心跳不依赖播放器回调，并在下播后自动离场', () => {
  const appAudience = source('apps/mobile/src/pkg-live/watch/index.nvue')
  const crossPlatformAudience = source('apps/mobile/src/pkg-live/watch/index.vue')
  const presence = source('apps/mobile/src/pkg-live/watch/use-live-watch-presence.ts')

  assert.match(presence, /setInterval\(\(\) => \{ void touchPresence\(\) \}, 20_000\)/)
  assert.match(presence, /const retryInMs = Math\.min\(1_000 \* \(2 \*\* retryAttempt\), 20_000\)/)
  assert.match(presence, /onOnlineCount\(state\.onlineCount\)/)
  assert.match(presence, /leaveLivePresence\(roomId, sessionId\)/)
  assert.match(presence, /isActive\?: \(\) => boolean/)
  assert.match(presence, /const roomOperationTails = new Map<string, Promise<void>>\(\)/)
  assert.match(presence, /function enqueueRoomOperation<T>/)
  assert.match(presence, /const pendingLeaveByRoom = new Map<string, Promise<void>>\(\)/)
  assert.match(presence, /invalidateRoom\(roomId\)/)
  assert.match(appAudience, /ensureAudiencePlayback\(\)\s*\/\/ 原生 video 的 @play 回调不是在线事实源；起播请求发出后立即登记观看会话。\s*void touchPresence\(\)/)
  assert.match(appAudience, /useLiveWatchPresence\(/)
  assert.match(appAudience, /isActive: \(\) => pageVisible\.value && presenceActive\.value/)
  assert.match(appAudience, /presenceActive\.value = false/)
  assert.match(appAudience, /const pageVisible = ref\(true\)\s*const presenceActive = ref\(true\)\s*let roomLoadVersion = 0/)
  assert.match(appAudience, /function isCurrentRoomRequest\(targetRoomId: string, requestVersion: number\)/)
  assert.match(appAudience, /async function joinPublicScreen\(groupId: string, targetRoomId: string, requestVersion: number\)/)
  assert.match(appAudience, /pageVisible\.value = false\s*presenceActive\.value = false\s*resumeAfterHide = true\s*roomLoadVersion \+= 1\s*stopRoomPolling\(\)/)
  assert.match(appAudience, /void leavePresence\(previousRoomId\)\s*void removeMicRequest\(\)\s*void finishMic\(\)\s*void leavePublicScreen\(\)/)
  assert.match(appAudience, /function scheduleEndAdvance\(\) \{\s*if \(endAdvanceTimer \|\| !pageVisible\.value\) return\s*\/\/ 下播后的三秒停留[\s\S]*void leavePresence\(\)\s*endCountdown\.value = 3/)
  assert.match(appAudience, /function returnToLiveEntrance\(\)/)
  assert.match(appAudience, /uni\.reLaunch\(\{ url: '\/pkg-live\/plaza\/index' \}\)/)
  assert.match(crossPlatformAudience, /useLiveWatchPresence\(/)
  assert.match(crossPlatformAudience, /isActive: \(\) => pageVisible\.value/)
  assert.match(crossPlatformAudience, /function isCurrentRoomRequest\(targetRoomId: string, requestVersion: number\)/)
  assert.match(crossPlatformAudience, /room\.value\.visibility === 'CIRCLE_ONLY' \? room\.value\.circleId : undefined/)
  assert.match(crossPlatformAudience, /@ready="onLivePlayerReady"/)
  assert.match(crossPlatformAudience, /function scheduleEndAdvance\(\)/)
  assert.match(crossPlatformAudience, /void refreshLiveFeed\(\)/)
  assert.match(crossPlatformAudience, /if \(!playUrl\.value\) await fetchPlayUrl\(targetRoomId, requestVersion\)/)
  assert.match(crossPlatformAudience, /onHide\(\(\) => \{\s*pageVisible\.value = false\s*resumeAfterHide = true\s*roomLoadVersion \+= 1\s*stopRoomPolling\(\)/)
  assert.match(crossPlatformAudience, /function returnToLiveEntrance\(\)/)
  assert.match(crossPlatformAudience, /returnRoute\.value = normalizeReturnRoute\(opts\?\.returnRoute\)/)
  assert.match(crossPlatformAudience, /const returnRouteQuery = returnRoute\.value \? `&returnRoute=\$\{encodeURIComponent\(returnRoute\.value\)\}` : ''/)
  assert.match(crossPlatformAudience, /void leavePresence\(previousRoomId\)\s*if \(next\)/)
})

test('观众连麦仅在静音状态变化时调用原生 TRTC', () => {
  const audience = source('apps/mobile/src/pkg-live/watch/index.nvue')

  assert.match(audience, /let appliedMicMuteState: boolean \| null = null/)
  assert.match(audience, /if \(appliedMicMuteState === muted\) return/)
  assert.match(audience, /micHostMuted\.value = hostMuted/)
  assert.match(audience, /主播已将你静音/)
})

test('观众连麦仅在主播接受后才申请设备权限', () => {
  const audience = source('apps/mobile/src/pkg-live/watch/index.nvue')
  const requestMic = audience.slice(
    audience.indexOf('async function requestMic()'),
    audience.indexOf('async function pollMicStatus()'),
  )
  const preflight = audience.slice(
    audience.indexOf('async function prepareMicPreflight('),
    audience.indexOf('async function confirmMicJoin()'),
  )

  assert.match(requestMic, /const mic = await liveMicApi\.request\(room\.value\.id, micMediaMode\.value\)/)
  assert.doesNotMatch(requestMic, /ensureLive(?:CapturePermissions|AudioPermission)\(\)/)
  assert.match(preflight, /await ensureLiveCapturePermissions\(\)/)
  assert.match(preflight, /await ensureLiveAudioPermission\(\)/)
  assert.match(preflight, /void removeMicRequest\(\)\s*throw cause/)
})

test('观看页只接入直播专属互动上下文和公屏', () => {
  const liveData = source('apps/mobile/src/lib/live-data.ts')
  const audience = source('apps/mobile/src/pkg-live/watch/index.nvue')
  const webAudience = source('apps/mobile/src/pkg-live/watch/index.vue')
  const watchAdapter = liveData.slice(
    liveData.indexOf('async getWatchRoom(id: string'),
    liveData.indexOf('/** 获取登录用户的跨设备回放进度'),
  )
  const audiencePoll = audience.slice(
    audience.indexOf('async function pollRoomStatus()'),
    audience.indexOf('async function checkMicInvitation('),
  )

  assert.match(liveData, /let liveWatchContextEndpointAvailable: boolean \| null = null/)
  assert.match(liveData, /let liveWatchContextRetryAt = 0/)
  assert.match(liveData, /liveWatchContextEndpointAvailable = missingEndpoint \? false : null/)
  assert.match(liveData, /if \(Date\.now\(\) < liveWatchContextRetryAt\) return null/)
  assert.match(liveData, /liveWatchContextRetryAt = 0/)
  assert.doesNotMatch(liveData, /if \(liveWatchContextEndpointAvailable === false\) return null/)
  assert.match(liveData, /\/live\/rooms\/\$\{roomId\}\/watch-context/)
  assert.match(liveData, /\/live\/rooms\/\$\{roomId\}\/comments\?page=1&pageSize=20/)
  assert.match(watchAdapter, /async getWatchContext\(roomId: string\): Promise<LiveWatchContext \| null>/)
  assert.match(watchAdapter, /async getWatchComments\(roomId: string, hostUserId = ''\): Promise<VerticalLiveComment\[\]>/)
  assert.match(watchAdapter, /allowGift: raw\.interaction\?\.allowGift === true && raw\.room\?\.allowGift === true/)
  assert.match(watchAdapter, /\.slice\(0, 20\)/)
  assert.match(watchAdapter, /\.filter\(\(comment\): comment is VerticalLiveComment => !!comment\)/)
  assert.doesNotMatch(watchAdapter, /\/comment\?targetType=/)
  assert.match(audience, /void refreshWatchContext\(targetRoomId, requestVersion, true\)/)
  assert.match(audience, /const context = await liveApi\.getWatchContext\(targetRoomId\)/)
  assert.match(audience, /const history = await liveApi\.getWatchComments\(targetRoomId, room\.value\.hostId\)/)
  assert.match(audiencePoll, /room\.value = retainWatchCapabilities\(detail\.room\)/)
  assert.doesNotMatch(audiencePoll, /refreshWatchContext\(/)
  assert.match(audience, /room\.value\.canComment/)
  assert.match(audience, /room\.value\.canGift/)
  assert.match(audience, /room\.value\.canLike/)
  assert.match(webAudience, /void refreshWatchContext\(roomId, requestVersion\)/)
  assert.match(webAudience, /const context = await liveApi\.getWatchContext\(targetRoomId\)/)
  assert.match(webAudience, /const history = await liveApi\.getWatchComments\(targetRoomId, room\.value\.hostId\)/)
  assert.match(webAudience, /if \(!room\.value\.canComment\)/)
  assert.match(webAudience, /if \(!room\.value\.canLike\)/)
  assert.match(webAudience, /if \(!room\.value\.canGift\)/)
  assert.match(webAudience, /onlineAvatars: \[\]/)
  assert.doesNotMatch(webAudience, /\/comment\?targetType=/)
})

test('直播送礼先执行年龄与用户自设限额，观众端不公开消费排行', () => {
  const appAudience = source('apps/mobile/src/pkg-live/watch/index.nvue')
  const webAudience = source('apps/mobile/src/pkg-live/watch/index.vue')
  const giftPanel = source('apps/mobile/src/components/live/gift-panel.vue')
  const api = source('apps/mobile/src/pkg-live/live-interaction-api.ts')
  const combinedAudience = `${appAudience}\n${webAudience}`

  assert.match(appAudience, /getLiveGiftSpendingPreference/)
  assert.match(appAudience, /updateLiveGiftSpendingPreference/)
  assert.match(appAudience, /首次赠送前，请先设置消费限额/)
  assert.match(giftPanel, /首次赠送前，请设置单次与每日限额/)
  assert.match(api, /\/live\/gift-spending-preference/)
  assert.doesNotMatch(combinedAudience, /getGiftRanking|gift-ranking|贡献榜|打赏榜/)
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
