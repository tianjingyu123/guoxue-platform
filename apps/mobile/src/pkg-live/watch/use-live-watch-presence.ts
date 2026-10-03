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
  /** 页面进入后台或已被新的房间加载取代时，不再登记在线。 */
  isActive?: () => boolean
  onOnlineCount: (onlineCount: number) => void
  onFailure?: (failure: LivePresenceFailure) => void
}

/**
 * 观看会话以独立于播放器事件的心跳为事实来源。
 *
 * 每个房间的 touch / leave 串行执行：服务端使用无版本的 zadd/zrem，若网络乱序，
 * 旧 touch 晚于 leave 到达会造成“已离场但仍在线”。页面层用 isActive 与房间代次
 * 失效旧请求，避免切后台、切房后重新登记在线。
 */
export function useLiveWatchPresence(options: UseLiveWatchPresenceOptions) {
  const sessionId = `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  let activeRoomId = ''
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryRoomId = ''
  let retryRoomVersion = 0
  let retryAttempt = 0
  let disposed = false
  const roomVersions = new Map<string, number>()
  const roomOperationTails = new Map<string, Promise<void>>()
  const pendingTouchRooms = new Set<string>()
  const queuedTouchRooms = new Set<string>()
  const pendingLeaveByRoom = new Map<string, Promise<void>>()

  function currentRoomId() {
    return String(options.roomId() || '').trim()
  }

  function roomVersion(roomId: string) {
    return roomVersions.get(roomId) || 0
  }

  function invalidateRoom(roomId: string) {
    const next = roomVersion(roomId) + 1
    roomVersions.set(roomId, next)
    return next
  }

  function canTouch(roomId: string, expectedVersion: number) {
    return Boolean(
      roomId
      && !disposed
      && !options.isEnded()
      && options.isActive?.() !== false
      && roomId === currentRoomId()
      && expectedVersion === roomVersion(roomId),
    )
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
    retryRoomId = ''
    retryRoomVersion = 0
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

  function enqueueRoomOperation<T>(roomId: string, operation: () => Promise<T>) {
    const previous = roomOperationTails.get(roomId) || Promise.resolve()
    const request = previous.catch(() => undefined).then(operation)
    const tail = request.then(() => undefined, () => undefined)
    roomOperationTails.set(roomId, tail)
    void tail.then(() => {
      if (roomOperationTails.get(roomId) === tail) roomOperationTails.delete(roomId)
    })
    return request
  }

  function scheduleRetry(roomId: string, expectedVersion: number, cause: unknown) {
    if (!canTouch(roomId, expectedVersion)) return
    if (retryTimer && retryRoomId === roomId && retryRoomVersion === expectedVersion) return
    clearRetry()
    const retryInMs = Math.min(1_000 * (2 ** retryAttempt), 20_000)
    retryAttempt = Math.min(retryAttempt + 1, 5)
    const details = failureDetails(cause)
    options.onFailure?.({ roomId, retryInMs, ...details })
    retryRoomId = roomId
    retryRoomVersion = expectedVersion
    retryTimer = setTimeout(() => {
      retryTimer = null
      retryRoomId = ''
      retryRoomVersion = 0
      if (canTouch(roomId, expectedVersion)) void touchPresence()
    }, retryInMs)
  }

  async function touchPresence() {
    const roomId = currentRoomId()
    const expectedVersion = roomVersion(roomId)
    if (!canTouch(roomId, expectedVersion)) return
    if (pendingTouchRooms.has(roomId)) {
      // 同房间的并发心跳合并为紧随当前请求的一次补发。
      queuedTouchRooms.add(roomId)
      return
    }

    pendingTouchRooms.add(roomId)
    try {
      await enqueueRoomOperation(roomId, async () => {
        if (!canTouch(roomId, expectedVersion)) return
        try {
          const state = await touchLivePresence(roomId, sessionId)
          if (!canTouch(roomId, expectedVersion)) return
          activeRoomId = roomId
          retryAttempt = 0
          clearRetry()
          options.onOnlineCount(state.onlineCount)
          startHeartbeat()
        } catch (cause) {
          scheduleRetry(roomId, expectedVersion, cause)
        }
      })
    } finally {
      pendingTouchRooms.delete(roomId)
      if (queuedTouchRooms.delete(roomId) && canTouch(roomId, roomVersion(roomId))) {
        void touchPresence()
      }
    }
  }

  async function leavePresence(targetRoomId = activeRoomId || currentRoomId()) {
    const roomId = String(targetRoomId || '').trim()
    if (!roomId) return
    const pending = pendingLeaveByRoom.get(roomId)
    if (pending) return pending

    // 使已经排队或在飞行中的旧 touch 在返回后失效；leave 会排在该房间操作队列末端。
    invalidateRoom(roomId)
    queuedTouchRooms.delete(roomId)
    // 新房间不继承旧房间的网络退避档位，避免首次失败就被长时间延后。
    retryAttempt = 0
    if (roomId === currentRoomId() || roomId === activeRoomId) {
      clearHeartbeat()
      clearRetry()
    }
    if (activeRoomId === roomId) activeRoomId = ''

    const request = enqueueRoomOperation(roomId, async () => {
      try {
        await leaveLivePresence(roomId, sessionId)
      } catch {
        // 离场为尽力操作，网络失败不应阻断切房、返回或页面卸载。
      }
    })
    const settled = request.then(() => undefined, () => undefined)
    pendingLeaveByRoom.set(roomId, settled)
    void settled.then(() => {
      if (pendingLeaveByRoom.get(roomId) === settled) pendingLeaveByRoom.delete(roomId)
    })
    return settled
  }

  onUnmounted(() => {
    disposed = true
    clearHeartbeat()
    clearRetry()
    const roomId = activeRoomId || currentRoomId()
    if (roomId) void leavePresence(roomId)
  })

  return { touchPresence, leavePresence }
}
