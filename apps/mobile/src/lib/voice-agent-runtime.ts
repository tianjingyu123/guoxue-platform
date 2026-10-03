import type { VoiceRoomTicket } from '@/lib/agent-data'

export type VoiceConversationState = 'listening' | 'thinking' | 'speaking' | 'reconnecting' | 'ended'

export interface VoiceTranscript {
  speaker: 'user' | 'assistant'
  text: string
  final?: boolean
}

export interface VoiceRuntimeEvents {
  onState: (state: VoiceConversationState) => void
  onTranscript: (item: VoiceTranscript) => void
  onError: (error: Error) => void
}

/**
 * 多端实时语音 SDK 适配边界。
 *
 * H5 由供应商 SDK 启动脚本注册 window.__GUOXUE_VOICE_AGENT_RUNTIME__；
 * App/小程序由对应原生插件或小程序组件注册同名 bridge。
 * 页面只依赖该稳定契约，不把供应商私钥或平台专用 API 泄漏到业务 UI。
 */
export interface VoiceAgentRuntimeBridge {
  connect(ticket: VoiceRoomTicket, events: VoiceRuntimeEvents): Promise<void>
  setMuted(muted: boolean): Promise<void> | void
  disconnect(): Promise<void> | void
}

function runtimeHost(): Record<string, unknown> {
  return globalThis as unknown as Record<string, unknown>
}

export function getVoiceAgentRuntime(): VoiceAgentRuntimeBridge | null {
  const bridge = runtimeHost().__GUOXUE_VOICE_AGENT_RUNTIME__ as VoiceAgentRuntimeBridge | undefined
  if (!bridge || typeof bridge.connect !== 'function' || typeof bridge.disconnect !== 'function') return null
  return bridge
}

export function voiceRuntimeReady(): boolean {
  return !!getVoiceAgentRuntime()
}

/** 请求麦克风权限；H5 主动预检，小程序走 scope.record，App 由原生 RTC SDK 在入会时请求。 */
export async function requestMicrophoneAccess(): Promise<void> {
  // #ifdef H5
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持麦克风采集')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((track) => track.stop())
  return
  // #endif

  // #ifdef MP-WEIXIN
  await new Promise<void>((resolve, reject) => {
    uni.authorize({
      scope: 'scope.record',
      success: () => resolve(),
      fail: () => reject(new Error('请在小程序设置中允许使用麦克风')),
    })
  })
  return
  // #endif

  // #ifdef APP-PLUS
  // App 的 Android/iOS 权限声明已写入 manifest；RTC 原生插件入会时触发系统授权框。
  return
  // #endif

  throw new Error('当前终端尚未接入麦克风权限适配器')
}
