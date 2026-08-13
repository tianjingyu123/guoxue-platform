import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/request'

export interface LiveMicItem {
  id: string
  liveRoomId: string
  userId: string
  position: number
  status: 'PENDING' | 'OCCUPIED' | 'MUTED'
  joinedAt: string
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
}

export const liveMicApi = {
  /** 申请直播连麦；只进入待审批态，不会直接打开麦克风。 */
  request: (roomId: string, position: number) =>
    apiPost<LiveMicItem>(`/live/rooms/${roomId}/mics`, { position }),

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

  leave: (roomId: string, userId: string) =>
    apiDelete<{ success: boolean }>(`/live/rooms/${roomId}/mics/${userId}`),

  getRtcConfig: (roomId: string) =>
    apiGet<LiveRtcConfig>(`/live/rooms/${roomId}/rtc-config`),
}
