import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/request'

export interface LiveMicItem {
  id: string
  liveRoomId: string
  userId: string
  trtcUserId?: string
  position: number
  status: 'PENDING' | 'OCCUPIED' | 'MUTED'
  mediaMode: 'AUDIO' | 'VIDEO'
  source?: 'REQUEST' | 'INVITE'
  joinedAt: string
  nickname?: string
  avatar?: string | null
}

export interface LiveRtcConfig {
  sdkAppId: number
  userId: string
  strRoomId: string
  userSig: string
  privateMapKey: string
  expiresAt: string
  role: 'HOST' | 'GUEST'
  mediaMode: 'AUDIO' | 'VIDEO'
  canPublishAudio: boolean
  canPublishVideo?: boolean
  streamId?: string
  hostUserId?: string
  hostTrtcUserId?: string
}

const MIC_SEAT_POSITIONS = [1, 2, 3, 4, 5, 6] as const

function isSeatOccupiedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown } | null)?.message || error || '')
  return message.includes('麦位已被占用') || (message.includes('seat') && message.includes('occupied'))
}

export const liveMicApi = {
  /**
   * 申请直播连麦；只进入待审批态，不会直接打开麦克风。
   *
   * 始终显式发送 1-6 号麦位：部分已部署 ValidationPipe 会把缺省的可选数字
   * 转换成 0，导致“position 必须为 1-6”并阻断申请。未指定时从 1 号位开始
   * 逐席竞争；唯一索引仍是并发裁决的最终事实，已占用才尝试下一席。
   */
  request: async (roomId: string, mediaMode: 'AUDIO' | 'VIDEO' = 'AUDIO', position?: number) => {
    const candidates = position ? [position] : [...MIC_SEAT_POSITIONS]
    let lastError: unknown
    for (const candidate of candidates) {
      try {
        return await apiPost<LiveMicItem>(`/live/rooms/${roomId}/mics`, {
          mediaMode,
          position: candidate,
        })
      } catch (error) {
        lastError = error
        if (position || !isSeatOccupiedError(error)) throw error
      }
    }
    throw lastError instanceof Error ? lastError : new Error('当前连麦席位已满')
  },

  list: (roomId: string) => apiGet<LiveMicItem[]>(`/live/rooms/${roomId}/mics`),

  manage: (
    roomId: string,
    userId: string,
    action: 'ACCEPT' | 'REJECT' | 'MUTE' | 'UNMUTE' | 'KICK',
    position?: number,
  ) =>
    apiPut<LiveMicItem | { success: boolean }>(`/live/rooms/${roomId}/mics/manage`, {
      userId,
      action,
      ...(position ? { position } : {}),
    }),

  invite: (roomId: string, userId: string, mediaMode: 'AUDIO' | 'VIDEO', position?: number) =>
    apiPost<LiveMicItem>(`/live/rooms/${roomId}/mics/invite`, {
      userId,
      mediaMode,
      ...(position ? { position } : {}),
    }),

  respondInvite: (roomId: string, action: 'ACCEPT' | 'DECLINE') =>
    apiPut<LiveMicItem | { success: boolean; declined?: boolean }>(`/live/rooms/${roomId}/mics/invite/respond`, { action }),

  leave: (roomId: string, userId: string) =>
    apiDelete<{ success: boolean }>(`/live/rooms/${roomId}/mics/${userId}`),

  getRtcConfig: (roomId: string) =>
    apiGet<LiveRtcConfig>(`/live/rooms/${roomId}/rtc-config`),

  /** 嘉宾完成原生进房后续租混流；服务端失败时不应中断本地 TRTC 连麦。 */
  ready: (roomId: string) =>
    apiPut<{ active: boolean; streamMode: 'ORIGIN' | 'MIXED'; reason?: string }>(`/live/rooms/${roomId}/mics/ready`),

  /** 手机主播进房后续租统一 CDN 输出；失败不应中断本地相机，但必须在界面提示。 */
  hostReady: (roomId: string) =>
    apiPut<{ active: boolean; streamMode: 'ORIGIN' | 'MIXED'; reason?: string }>(`/live/rooms/${roomId}/host/ready`),

  hostNotReady: (roomId: string) =>
    apiDelete<{ active: boolean; streamMode: 'ORIGIN' | 'MIXED'; reason?: string }>(`/live/rooms/${roomId}/host/ready`),
}
