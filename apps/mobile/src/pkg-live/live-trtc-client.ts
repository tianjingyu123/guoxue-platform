import type { LiveRtcConfig } from './live-mic-data'

type NativeModule = Record<string, (...args: any[]) => any>

const MODULE_NAME = 'TRTCCloudUniPlugin-TRTCCloudImpl'
const EVENT_MODULE_NAME = 'globalEvent'
const APP_SCENE_LIVE = 1
const ROLE_ANCHOR = 20
const AUDIO_QUALITY_SPEECH = 1

let trtcModule: NativeModule | null = null
let eventModule: NativeModule | null = null
const listeners = new Map<string, (payload: any) => void>()
let joined = false
let localPreviewActive = false
let remoteUserLeaveHandler: (() => void) | null = null

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
export function setLiveRemoteUserLeaveHandler(handler: (() => void) | null) {
  remoteUserLeaveHandler = handler
}

export async function joinLiveAudio(config: LiveRtcConfig): Promise<void> {
  if (joined) return
  const { trtc } = ensureModules()
  trtc.sharedInstance()

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

/** 主播进入视频直播间并启动本地预览。streamId 与云直播播放流保持一致。 */
export async function joinLiveVideo(config: LiveRtcConfig, viewId: string): Promise<void> {
  if (joined) return
  if (config.role !== 'HOST' || config.mediaMode !== 'VIDEO' || !config.canPublishVideo) {
    throw new Error('当前账号没有视频开播权限')
  }
  if (!config.streamId) throw new Error('服务端未返回直播流标识')

  const { trtc } = ensureModules()
  trtc.sharedInstance()

  on('onRemoteUserLeaveRoom', () => {
    remoteUserLeaveHandler?.()
  })

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
      trtc.startLocalPreview({ isFrontCamera: true, userId: viewId })
      localPreviewActive = true
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
      streamId: config.streamId,
      role: ROLE_ANCHOR,
      appScene: APP_SCENE_LIVE,
    })
  })
}

export function switchLiveCamera(frontCamera: boolean) {
  if (!joined || !trtcModule) return
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
    if (localPreviewActive) {
      try { trtcModule.stopLocalPreview?.() } catch {}
    }
    try { trtcModule.stopLocalAudio?.() } catch {}
    try { trtcModule.exitRoom?.() } catch {}
  }
  joined = false
  localPreviewActive = false
  removeListeners()
  try { trtcModule?.destroySharedInstance?.() } catch {}
  trtcModule = null
  eventModule = null
}

export const leaveLiveVideo = leaveLiveAudio
