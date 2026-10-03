import { isClientFeatureEnabled } from '@/lib/remote-config'
import { apiGet, apiPut } from '@/utils/request'

export interface ObsStreamRuntime {
  serverUrl: string
  streamKey: string
  status: 'online' | 'offline'
  roomStatus: 'WAITING' | 'LIVING' | 'ENDED' | 'REPLAY' | 'CANCELLED' | ''
  connectedAt: string | null
  disconnectedAt: string | null
  lastEventAt: string | null
  duration: number
  fps: number | null
  bitrate: number | null
  resolution: string
  droppedFrames: number | null
  reason: string | null
  ingestMode: 'TRTC_RTMP' | 'CSS_RTMP'
  expiresAt: string | null
}

interface RawStreamUrls {
  pushUrl?: string
  serverUrl?: string
  streamKey?: string
  ingestMode?: 'TRTC_RTMP' | 'CSS_RTMP'
  expiresAt?: string
}

interface RawStreamStatus {
  roomStatus?: ObsStreamRuntime['roomStatus']
  status?: ObsStreamRuntime['status']
  connectedAt?: string | null
  disconnectedAt?: string | null
  lastEventAt?: string | null
  durationSeconds?: number
  reason?: string | null
  metrics?: { fps?: number; bitrate?: number; resolution?: string; droppedFrames?: number }
}

/** 获取房间专属推流码与验签回调连接态，不用业务状态冒充媒体流在线。 */
export async function getObsStream(roomId: string): Promise<ObsStreamRuntime> {
  const [urls, runtime] = await Promise.all([
    apiGet<RawStreamUrls>(`/live/rooms/${roomId}/stream-urls`),
    apiGet<RawStreamStatus>(`/live/rooms/${roomId}/stream-status`),
  ])
  const pushUrl = urls?.pushUrl || ''
  const marker = `room_${roomId}`
  const markerIndex = pushUrl.indexOf(marker)
  const trtcMarker = '/push/'
  const trtcMarkerIndex = pushUrl.indexOf(trtcMarker)
  const metrics = runtime?.metrics || {}
  return {
    serverUrl: urls?.serverUrl
      || (trtcMarkerIndex > 0 ? pushUrl.slice(0, trtcMarkerIndex + trtcMarker.length) : markerIndex > 0 ? pushUrl.slice(0, markerIndex) : ''),
    streamKey: urls?.streamKey
      || (trtcMarkerIndex >= 0 ? pushUrl.slice(trtcMarkerIndex + trtcMarker.length) : markerIndex >= 0 ? pushUrl.slice(markerIndex) : ''),
    status: runtime?.status === 'online' ? 'online' : 'offline',
    roomStatus: runtime?.roomStatus || '',
    connectedAt: runtime?.connectedAt || null,
    disconnectedAt: runtime?.disconnectedAt || null,
    lastEventAt: runtime?.lastEventAt || null,
    duration: Number(runtime?.durationSeconds) || 0,
    fps: Number.isFinite(Number(metrics.fps)) ? Number(metrics.fps) : null,
    bitrate: Number.isFinite(Number(metrics.bitrate)) ? Number(metrics.bitrate) : null,
    resolution: metrics.resolution || '',
    droppedFrames: Number.isFinite(Number(metrics.droppedFrames)) ? Number(metrics.droppedFrames) : null,
    reason: runtime?.reason || null,
    ingestMode: urls?.ingestMode === 'TRTC_RTMP' ? 'TRTC_RTMP' : 'CSS_RTMP',
    expiresAt: urls?.expiresAt || null,
  }
}

/** OBS 专用正式开播：服务端仅在收到真实推流回调后放行。 */
export async function startObsLive(roomId: string): Promise<{ id: string; status?: string; imGroupId?: string }> {
  if (!isClientFeatureEnabled('live_start', true)) {
    throw new Error('直播开播功能正在维护，已创建的直播不会丢失，请稍后重试')
  }
  return await apiPut<{ id: string; status?: string; imGroupId?: string }>(`/live/rooms/${roomId}/start-obs`)
}
