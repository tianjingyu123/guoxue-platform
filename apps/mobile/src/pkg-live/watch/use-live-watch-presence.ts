import { onUnmounted } from 'vue'
import { leaveLivePresence, touchLivePresence } from './presence-api'

export interface LivePresenceFailure {
  roomId: string
  retryInMs: number
  status: number | null
  code: string | null
}

interface UseLiveWatchPresenceOptions {
  roomId: () => string
  isEnded: () => boolean
  onOnlineCount: (onlineCount: number) => void
  onFailure?: (failure: LivePresenceFailure) => void
}

/**
 * 观看会话以独立于播放器事件的心跳为事实来源。
 * 原生播放器的 play 回调在部分 Android 机型可能迟到，不能把在线统计绑定到它。
 */
export function useLiveWatchPresence(options: UseLiveWatchPresenceOptions) {
  const sessionId = `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  let activeRoomId = ''
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryAttempt = 0
  let disposed = false
  let paused = false
  let lifecycleVersion = 0
  let touchQueued = false
  let pendingLeave: Promise<void> | null = null
  let pendingLeaveRoomId = ''
  const inFlightRooms = new Set<string>()

  function currentRoomId() {
    return String(options.roomId() || '').trim()
  }

  function clearHeartbeat() {
    if (!heartbeatTimer) return
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  function clearRetry() {
    if (!retryTimer) return
    clearTimeout(retryTimer)
    retryTimer = null
  }

  function startHeartbeat() {
    if (heartbeatTimer || disposed) return
    heartbeatTimer = setInterval(() => { void touchPresence() }, 20_000)
  }

  function failureDetails(cause: unknown): Pick<LivePresenceFailure, 'status' | 'code'> {
    const error = cause as { status?: unknown; statusCode?: unknown; code?: unknown } | null
    const rawStatus = Number(error?.status ?? error?.statusCode)
    const rawCode = error?.code
    return {
      status: Number.isFinite(rawStatus) ? rawStatus : null,
      code: typeof rawCode === 'string' && rawCode ? rawCode.slice(0, 80) : null,
    }
  }

  function scheduleRetry(roomId: string, cause: unknown) {
    if (retryTimer || disposed || paused || roomId !== currentRoomId() || options.isEnded()) return
    const retryInMs = Math.min(1_000 * (2 ** retryAttempt), 20_000)
    retryAttempt = Math.min(retryAttempt + 1, 5)
    const details = failureDetails(cause)
    options.onFailure?.({ roomId, retryInMs, ...details })
    retryTimer = setTimeout(() => {
      retryTimer = null
      void touchPresence()
    }, retryInMs)
  }

  async function touchPresence() {
    let roomId = currentRoomId()
    if (!roomId || disposed || options.isEnded()) return
    paused = false
    if (inFlightRooms.has(roomId)) {
      // 前后台切换时，旧请求尚未结束。请求完成后补发一次，不能把恢复动作吞掉。
      touchQueued = true
      return
    }

    // 同一房间的离房请求必须先完成，否则网络乱序可能把刚恢复的在线会话删除。
    if (pendingLeave && pendingLeaveRoomId === roomId) await pendingLeave
    roomId = currentRoomId()
    if (!roomId || disposed || paused || options.isEnded() || inFlightRooms.has(roomId)) return

    const requestLifecycleVersion = lifecycleVersion
    inFlightRooms.add(roomId)
    try {
      const state = await touchLivePresence(roomId, sessionId)
      // 切房或下播期间返回的旧响应不能污染当前直播间的人数。
      if (disposed || paused || requestLifecycleVersion !== lifecycleVersion || roomId !== currentRoomId() || options.isEnded()) return
      activeRoomId = roomId
      retryAttempt = 0
      clearRetry()
      options.onOnlineCount(state.onlineCount)
      startHeartbeat()
    } catch (cause) {
      scheduleRetry(roomId, cause)
    } finally {
      inFlightRooms.delete(roomId)
      if (touchQueued && !paused && !disposed && !options.isEnded()) {
        touchQueued = false
        void touchPresence()
      }
    }
  }

  async function leavePresence(targetRoomId = activeRoomId || currentRoomId()) {
    const roomId = String(targetRoomId || '').trim()
    if (!roomId) return
    paused = true
    lifecycleVersion += 1
    touchQueued = false
    if (roomId === currentRoomId() || roomId === activeRoomId) {
      clearHeartbeat()
      clearRetry()
    }
    if (activeRoomId === roomId) activeRoomId = ''
    const request = leaveLivePresence(roomId, sessionId)
    pendingLeave = request
    pendingLeaveRoomId = roomId
    try {
      await request
    } finally {
      if (pendingLeave === request) {
        pendingLeave = null
        pendingLeaveRoomId = ''
      }
    }
  }

  onUnmounted(() => {
    disposed = true
    clearHeartbeat()
    clearRetry()
    const roomId = activeRoomId || currentRoomId()
    if (roomId && (!pendingLeave || pendingLeaveRoomId !== roomId)) void leaveLivePresence(roomId, sessionId)
  })

  return { touchPresence, leavePresence }
}
