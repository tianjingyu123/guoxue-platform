import type { LiveRtcConfig } from './live-mic-data'

type NativeModule = Record<string, (...args: any[]) => any>

const MODULE_NAME = 'TRTCCloudUniPlugin-TRTCCloudImpl'
const EVENT_MODULE_NAME = 'globalEvent'
const APP_SCENE_LIVE = 1
const ROLE_ANCHOR = 20
const AUDIO_QUALITY_SPEECH = 1
const VIDEO_STREAM_BIG = 0

let trtcModule: NativeModule | null = null
let eventModule: NativeModule | null = null
const listeners = new Map<string, (payload: any) => void>()
let joined = false
let localPreviewActive = false
let localPreviewViewId = ''
let remoteUserLeaveHandler: ((userId?: string) => void) | null = null
let remoteVideoAvailabilityHandler: ((userId: string, available: boolean) => void) | null = null
let connectionStateHandler: ((state: 'connected' | 'reconnecting' | 'lost') => void) | null = null
const remoteVideoUsers = new Set<string>()

function getNativePlugin(name: string): NativeModule | null {
  const loader = (uni as any)?.requireNativePlugin
  if (typeof loader !== 'function') return null
  const plugin = loader(name)
  return plugin && typeof plugin === 'object' ? plugin as NativeModule : null
}

function ensureModules() {
  trtcModule ||= getNativePlugin(MODULE_NAME)
  eventModule ||= getNativePlugin(EVENT_MODULE_NAME)
  if (!trtcModule || !eventModule || typeof trtcModule.sharedInstance !== 'function') {
    throw new Error('当前安装包未包含 TRTC 原生插件，请升级到正式 App 包')
  }
  return { trtc: trtcModule, events: eventModule }
}

function removeListeners() {
  if (!eventModule) return
  for (const [event, listener] of listeners) {
    try { eventModule.removeEventListener?.(event, listener) } catch {}
  }
  listeners.clear()
}

function on(event: string, callback: (data: any[]) => void) {
  const { events } = ensureModules()
  const listener = (payload: any) => callback(Array.isArray(payload?.data) ? payload.data : [])
  listeners.set(event, listener)
  events.addEventListener?.(event, listener)
}

export function isLiveTrtcSupported(): boolean {
  try {
    return !!getNativePlugin(MODULE_NAME)
  } catch {
    return false
  }
}

/**
 * 主播页用它清理异常退出的连麦观众。常规观众只播放云直播流，
 * 因而 TRTC 房间里的远端用户就是已经获准的连麦观众。
 */
export function setLiveRemoteUserLeaveHandler(handler: ((userId?: string) => void) | null) {
  remoteUserLeaveHandler = handler
}

export function setLiveRemoteVideoAvailabilityHandler(
  handler: ((userId: string, available: boolean) => void) | null,
) {
  remoteVideoAvailabilityHandler = handler
}

export function setLiveConnectionStateHandler(handler: ((state: 'connected' | 'reconnecting' | 'lost') => void) | null) {
  connectionStateHandler = handler
}

function bindConnectionEvents() {
  on('onConnectionLost', () => connectionStateHandler?.('lost'))
  on('onTryToReconnect', () => connectionStateHandler?.('reconnecting'))
  on('onConnectionRecovery', () => connectionStateHandler?.('connected'))
}

function bindRemoteMediaEvents() {
  on('onRemoteUserLeaveRoom', (data) => {
    const userId = String(data[0] || '')
    if (userId) {
      stopLiveRemoteVideo(userId)
      remoteVideoAvailabilityHandler?.(userId, false)
    }
    remoteUserLeaveHandler?.(userId || undefined)
  })
  on('onUserVideoAvailable', (data) => {
    const userId = String(data[0] || '')
    if (!userId) return
    const rawAvailable = data[1]
    const available = rawAvailable === true || rawAvailable === 1 || rawAvailable === 'true'
    if (!available) stopLiveRemoteVideo(userId)
    remoteVideoAvailabilityHandler?.(userId, available)
  })
}

/** 原生远端视图必须先挂载，再把同一个 viewId 交给 TRTC。 */
export function startLiveRemoteVideo(userId: string, viewId: string) {
  if (!joined || !trtcModule || !userId || !viewId) return
  trtcModule.startRemoteView?.({ userId, streamType: VIDEO_STREAM_BIG, viewId })
  remoteVideoUsers.add(userId)
}

export function stopLiveRemoteVideo(userId: string) {
  if (!trtcModule || !userId) return
  try { trtcModule.stopRemoteView?.({ userId, streamType: VIDEO_STREAM_BIG }) } catch {}
  remoteVideoUsers.delete(userId)
}

/**
 * 连麦候场本地预览：只打开本机摄像头画面，不进 TRTC 房间、不发布音视频。
 * 用户点击“加入直播”后才由 joinLiveVideo 进入房间并开始上行。
 */
export function startLiveDevicePreview(viewId: string, frontCamera = true) {
  if (!viewId) throw new Error('连麦预览视图未就绪')
  const { trtc } = ensureModules()
  trtc.sharedInstance()
  if (localPreviewActive && localPreviewViewId === viewId) return
  if (localPreviewActive) {
    try { trtc.stopLocalPreview?.() } catch {}
  }
  trtc.startLocalPreview({ isFrontCamera: frontCamera, userId: viewId })
  localPreviewActive = true
  localPreviewViewId = viewId
}

export function stopLiveDevicePreview() {
  if (!localPreviewActive || !trtcModule) return
  try { trtcModule.stopLocalPreview?.() } catch {}
  localPreviewActive = false
  localPreviewViewId = ''
}

export async function joinLiveAudio(config: LiveRtcConfig): Promise<void> {
  if (joined) return
  const { trtc } = ensureModules()
  trtc.sharedInstance()
  bindConnectionEvents()

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('进入连麦房间超时，请检查网络后重试'))
      }
    }, 12_000)

    on('onEnterRoom', (data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const result = Number(data[0] || 0)
      if (result <= 0) {
        reject(new Error(`进入连麦房间失败（${result}）`))
        return
      }
      joined = true
      if (config.canPublishAudio) trtc.startLocalAudio(AUDIO_QUALITY_SPEECH)
      resolve()
    })
    on('onError', (data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`TRTC 连麦失败（${Number(data[0] || -1)}）`))
    })

    trtc.enterRoom({
      sdkAppId: config.sdkAppId,
      userId: config.userId,
      userSig: config.userSig,
      strRoomId: config.strRoomId,
      privateMapKey: config.privateMapKey,
      role: ROLE_ANCHOR,
      // 连麦观众与视频主播必须使用同一直播场景，否则同一房间可能无法互通。
      appScene: APP_SCENE_LIVE,
    })
  })
}

/** 主播或获批视频嘉宾进入直播房间并启动本地预览。 */
export async function joinLiveVideo(config: LiveRtcConfig, viewId: string): Promise<void> {
  if (joined) return
  if (config.mediaMode !== 'VIDEO' || !config.canPublishVideo) {
    throw new Error('当前账号没有视频连麦权限')
  }
  if (config.role === 'HOST' && !config.streamId) throw new Error('服务端未返回直播流标识')

  const { trtc } = ensureModules()
  trtc.sharedInstance()
  bindConnectionEvents()
  bindRemoteMediaEvents()

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('进入视频直播间超时，请检查网络后重试'))
      }
    }, 12_000)

    on('onEnterRoom', (data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const result = Number(data[0] || 0)
      if (result <= 0) {
        reject(new Error(`进入视频直播间失败（${result}）`))
        return
      }
      joined = true
      if (!localPreviewActive || localPreviewViewId !== viewId) {
        trtc.startLocalPreview({ isFrontCamera: true, userId: viewId })
        localPreviewActive = true
        localPreviewViewId = viewId
      }
      if (config.canPublishAudio) trtc.startLocalAudio(AUDIO_QUALITY_SPEECH)
      resolve()
    })
    on('onError', (data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`TRTC 视频直播失败（${Number(data[0] || -1)}）`))
    })

    trtc.enterRoom({
      sdkAppId: config.sdkAppId,
      userId: config.userId,
      userSig: config.userSig,
      strRoomId: config.strRoomId,
      privateMapKey: config.privateMapKey,
      ...(config.streamId ? { streamId: config.streamId } : {}),
      role: ROLE_ANCHOR,
      appScene: APP_SCENE_LIVE,
    })
  })
}

export function switchLiveCamera(frontCamera: boolean) {
  if ((!joined && !localPreviewActive) || !trtcModule) return
  trtcModule.switchCamera?.(frontCamera)
}

export function setLiveVideoMuted(muted: boolean) {
  if (!joined || !trtcModule) return
  trtcModule.muteLocalVideo?.({ streamType: 0, mute: muted })
}

export function setLiveAudioMuted(muted: boolean) {
  if (!joined || !trtcModule) return
  trtcModule.muteLocalAudio?.(muted)
}

export function leaveLiveAudio() {
  if (trtcModule) {
    for (const userId of [...remoteVideoUsers]) stopLiveRemoteVideo(userId)
    if (localPreviewActive) {
      try { trtcModule.stopLocalPreview?.() } catch {}
    }
    try { trtcModule.stopLocalAudio?.() } catch {}
    try { trtcModule.exitRoom?.() } catch {}
  }
  joined = false
  localPreviewActive = false
  localPreviewViewId = ''
  remoteVideoUsers.clear()
  removeListeners()
  try { trtcModule?.destroySharedInstance?.() } catch {}
  trtcModule = null
  eventModule = null
}

export const leaveLiveVideo = leaveLiveAudio
