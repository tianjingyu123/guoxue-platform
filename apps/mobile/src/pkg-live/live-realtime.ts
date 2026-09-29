// H5/App 才编入 Socket.IO；微信小程序保留 TIM/历史轮询，避免实时库占用主包额度。
// #ifdef H5 || APP-PLUS
import { io, type Socket } from 'socket.io-client'
// #endif
import { getToken } from '@/utils/storage'

export interface LiveCommittedComment {
  id: string
  userId: string
  userName: string
  avatar?: string
  content: string
  type?: string
  createdAt?: string
}

export interface LiveCommittedGift {
  recordId: string
  userId: string
  userName: string
  giftId: string
  giftName: string
  giftIcon?: string
  quantity: number
  totalCoin?: number
  createdAt?: string
}

export interface LiveLikeCount {
  userId: string
  likeCount: number
  timestamp: number
}

export interface LiveRealtimeHandlers {
  onComment?: (event: LiveCommittedComment) => void
  onGift?: (event: LiveCommittedGift) => void
  onLike?: (event: LiveLikeCount) => void
  /** Socket 可用时为 true；断线或未登录时为 false，页面据此启用 TIM/轮询降级。 */
  onAvailability?: (available: boolean) => void
}

export interface LiveRealtimeSubscription {
  stop: () => void
}

function resolveSocketOrigin(): string {
  const apiUrl = String((import.meta as any).env?.VITE_API_URL || '').trim()
  return apiUrl.replace(/\/+$/, '').replace(/\/api\/v1$/i, '')
}

/**
 * 直播互动主通道。腾讯 IM 仍保留为断线降级通道；没有登录态时直接交给页面轮询，
 * 避免为匿名连接放宽全局 WebSocket 鉴权边界。
 */
export function subscribeLiveRealtime(roomId: string, handlers: LiveRealtimeHandlers): LiveRealtimeSubscription {
  // #ifndef H5 || APP-PLUS
  handlers.onAvailability?.(false)
  return { stop: () => undefined }
  // #endif

  // #ifdef H5 || APP-PLUS
  const token = getToken()
  const origin = resolveSocketOrigin()
  if (!roomId || !token || !origin) {
    handlers.onAvailability?.(false)
    return { stop: () => undefined }
  }

  let stopped = false
  let available = false
  const socket: Socket = io(`${origin}/ws`, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5_000,
    timeout: 8_000,
  })

  const setAvailable = (next: boolean) => {
    if (available === next) return
    available = next
    handlers.onAvailability?.(next)
  }

  socket.on('connect', () => {
    if (stopped) return
    socket.emit('live:join', roomId)
    setAvailable(true)
  })
  socket.on('disconnect', () => setAvailable(false))
  socket.on('connect_error', () => setAvailable(false))
  socket.on('auth_error', () => setAvailable(false))
  socket.on('live:comment_committed', (event: LiveCommittedComment) => handlers.onComment?.(event))
  socket.on('live:gift_committed', (event: LiveCommittedGift) => handlers.onGift?.(event))
  socket.on('live:like_count', (event: LiveLikeCount) => handlers.onLike?.(event))

  return {
    stop: () => {
      if (stopped) return
      stopped = true
      setAvailable(false)
      if (socket.connected) socket.emit('live:leave', roomId)
      socket.removeAllListeners()
      socket.disconnect()
    },
  }
  // #endif
}
