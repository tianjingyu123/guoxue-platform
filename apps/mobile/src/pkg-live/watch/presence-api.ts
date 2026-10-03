import { apiGetOptionalAuth, apiPostOptionalAuth, apiPutOptionalAuth } from '@/utils/request'

export interface LiveFeedRoom {
  id: string
  title: string
  cover: string
  hostName: string
  hostAvatar: string
}

interface RawLiveFeedRoom {
  id?: string
  title?: string
  cover?: string | null
  status?: string
  user?: { nickname?: string | null; avatar?: string | null } | null
}

/** 获取同一可见范围内的在播流；圈内流继续携带 circleId，避免跨圈泄露。 */
export async function getLiveFeed(circleId?: string): Promise<LiveFeedRoom[]> {
  const circle = circleId ? `&circleId=${encodeURIComponent(circleId)}` : ''
  const value = await apiGetOptionalAuth<
    RawLiveFeedRoom[] | { rooms?: RawLiveFeedRoom[]; data?: RawLiveFeedRoom[] }
  >(`/live/rooms?status=LIVING&pageSize=30${circle}`)
  const rooms = Array.isArray(value) ? value : (value?.rooms ?? value?.data ?? [])
  return rooms
    .filter((room) => String(room.status || '').toUpperCase() === 'LIVING')
    .map((room) => ({
      id: room.id || '',
      title: room.title || '',
      cover: room.cover || '',
      hostName: room.user?.nickname || '',
      hostAvatar: room.user?.avatar || '',
    }))
}

/** 进入与心跳只更新在线会话；同一身份或游客会话在同一场只累计一次访问。 */
export async function touchLivePresence(roomId: string, clientSessionId: string) {
  return await apiPutOptionalAuth<{ onlineCount: number; firstVisit: boolean }>(
    `/live/rooms/${roomId}/presence`,
    { clientSessionId },
  )
}

/** 离房幂等；失败时服务端仍会在 45 秒心跳窗口后自动清理。 */
export async function leaveLivePresence(roomId: string, clientSessionId: string): Promise<void> {
  await apiPostOptionalAuth(`/live/rooms/${roomId}/presence/leave`, { clientSessionId }).catch(() => undefined)
}
