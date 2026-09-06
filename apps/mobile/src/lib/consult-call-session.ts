import type { ConsultCallState, ConsultConnectResult, ConsultRtcTicket } from './consult-call-data'

type CallType = 'VOICE' | 'VIDEO'
export type ConsultSessionPhase = 'IDLE' | 'PREPARING' | 'CONNECTING' | 'WAITING' | 'ONGOING' | 'STOPPING' | 'FINISHED' | 'RECOVERY_REQUIRED'
export interface ConsultSessionView {
  phase: ConsultSessionPhase
  callId: string | null
  error: 'DEVICE_UNAVAILABLE' | 'ACTION_UNCERTAIN' | 'MEDIA_UNAVAILABLE' | 'STATE_UNAVAILABLE' | 'STATE_INVALID' | null
}

const terminal = (status: string) => ['ENDED', 'MISSED', 'REFUNDED'].includes(status)
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)

/** 业务动作与媒体连接分开；未知结果只能查状态，绝不自动重放扣费/接听动作。 */
export function createConsultCallSession(deps: {
  prepare: (type: CallType) => Promise<void>
  connect: (ticket: ConsultRtcTicket, type: CallType) => Promise<void>
  disconnect: () => void
  initiate: (input: { circleId: string; expertId: string; type: CallType }) => Promise<ConsultConnectResult>
  accept: (id: string) => Promise<ConsultConnectResult>
  read: (id: string) => Promise<ConsultCallState>
  end: (id: string) => Promise<unknown>
  cancel: (id: string) => Promise<unknown>
  onChange: (view: ConsultSessionView) => void
}) {
  let view: ConsultSessionView = { phase: 'IDLE', callId: null, error: null }
  let busy = false
  let disposed = false
  let mediaReady = false
  let interrupted = false, actionStarted = false
  let type: CallType | null = null
  let role: 'CALLER' | 'EXPERT' | null = null
  let lastStatus: ConsultCallState['status'] | null = null
  const publish = (phase: ConsultSessionPhase, error: ConsultSessionView['error'] = null) => {
    view = { ...view, phase, error }
    if (!disposed) deps.onChange({ ...view })
  }
  const disconnect = () => { mediaReady = false; try { deps.disconnect() } catch { /* 继续核实业务终态，不让原生清理异常阻断查询。 */ } }
  const validState = (state: ConsultCallState) => state && state.id === view.callId
    && state.type === type && state.role === role
    && ['WAITING', 'ONGOING', 'ENDED', 'MISSED', 'REFUNDED'].includes(state.status)
    && !(lastStatus === 'ONGOING' && state.status === 'WAITING')
    && !(lastStatus && terminal(lastStatus) && state.status !== lastStatus)
  const applyState = (state: ConsultCallState, render = true) => {
    if (disposed || !validState(state)) {
      if (!disposed) { disconnect(); publish('RECOVERY_REQUIRED', 'STATE_INVALID') }
      return false
    }
    lastStatus = state.status
    if (terminal(state.status)) { disconnect(); publish('FINISHED') }
    else if (render && !(view.phase === 'IDLE' && role === 'EXPERT' && state.status === 'WAITING')) {
      publish(mediaReady ? (state.status === 'WAITING' ? 'WAITING' : 'ONGOING') : 'RECOVERY_REQUIRED', mediaReady ? null : 'MEDIA_UNAVAILABLE')
    }
    return true
  }
  const validTicket = (result: ConsultConnectResult) => {
    const ticket = result?.trtc
    return uuid(result?.id) && ticket?.configured === true && Number.isSafeInteger(ticket.sdkAppId)
      && ticket.sdkAppId > 0 && ticket.sdkAppId <= 0xffffffff
      && /^consult_[a-f0-9]{16}$/.test(result.rtcRoomId)
      && ticket.roomId === result.rtcRoomId && ticket.strRoomId === result.rtcRoomId
      && /^c_[a-f0-9]{30}$/.test(ticket.userId)
      && typeof ticket.userSig === 'string' && ticket.userSig.length > 0
      && typeof ticket.privateMapKey === 'string' && ticket.privateMapKey.length > 0
      && typeof ticket.expiresAt === 'string' && Date.parse(ticket.expiresAt) > Date.now() + 5000
  }
  async function begin(callType: CallType, callRole: 'CALLER' | 'EXPERT', action: () => Promise<ConsultConnectResult>, id?: string) {
    if (disposed || busy || view.phase !== 'IDLE' || !['VOICE', 'VIDEO'].includes(callType) || (id !== undefined && !uuid(id))) return
    busy = true; type = callType; role = callRole; interrupted = false; actionStarted = false
    if (id) view.callId = id
    publish('PREPARING')
    try {
      // 摄像头/麦克风授权、原生 SDK 与并发占用必须在扣费前检查。
      try { await deps.prepare(callType) }
      catch { disconnect(); publish('IDLE', 'DEVICE_UNAVAILABLE'); return }
      if (disposed || interrupted) { disconnect(); return }
      let result: ConsultConnectResult
      actionStarted = true
      try { result = await action() }
      catch { disconnect(); publish('RECOVERY_REQUIRED', 'ACTION_UNCERTAIN'); return }
      if (uuid(result?.id) && (!id || result.id === id)) view.callId = result.id
      if (disposed || interrupted) { disconnect(); if (!disposed) publish('RECOVERY_REQUIRED', 'MEDIA_UNAVAILABLE'); return }
      if (!validTicket(result) || (id && result.id !== id)) {
        disconnect(); publish('RECOVERY_REQUIRED', 'MEDIA_UNAVAILABLE'); return
      }
      publish('CONNECTING')
      try {
        // 先核验业务未被另一端取消，再进房；凭据不进入公开视图。
        const state = await deps.read(result.id)
        if (disposed || interrupted) { disconnect(); return }
        if (!applyState(state, false) || terminal(state.status)) return
        publish('CONNECTING')
        await deps.connect(result.trtc, callType)
        if (disposed || interrupted) { disconnect(); return }
        mediaReady = true
        const latest = await deps.read(result.id)
        if (!disposed) applyState(latest)
      } catch { disconnect(); publish('RECOVERY_REQUIRED', 'MEDIA_UNAVAILABLE') }
    } finally { busy = false }
  }
  return {
    /** 从服务端恢复控制入口，不恢复旧票据，也不自动重签/再次接听。 */
    async loadExisting(id: string) {
      if (busy || disposed || view.phase !== 'IDLE' || !uuid(id)) return
      busy = true
      try {
        const state = await deps.read(id)
        if (disposed) return
        if (state.id !== id || !['VOICE', 'VIDEO'].includes(state.type) || !['CALLER', 'EXPERT'].includes(state.role)) {
          publish('RECOVERY_REQUIRED', 'STATE_INVALID'); return
        }
        view.callId = id; type = state.type; role = state.role
        if (applyState(state, false) && !terminal(state.status)) {
          publish(state.status === 'WAITING' && role === 'EXPERT' ? 'IDLE' : 'RECOVERY_REQUIRED',
            state.status === 'WAITING' && role === 'EXPERT' ? null : 'MEDIA_UNAVAILABLE')
        }
      } catch { publish('RECOVERY_REQUIRED', 'STATE_UNAVAILABLE') }
      finally { busy = false }
    },
    mediaLost() {
      if (disposed || view.phase === 'FINISHED') return
      interrupted = true; disconnect()
      publish(busy && !actionStarted && !view.callId ? 'IDLE' : 'RECOVERY_REQUIRED',
        busy && !actionStarted && !view.callId ? 'DEVICE_UNAVAILABLE' : 'MEDIA_UNAVAILABLE')
    },
    initiate(input: { circleId: string; expertId: string; type: CallType }) {
      return begin(input.type, 'CALLER', () => deps.initiate(input))
    },
    accept(id: string, callType: CallType) { return begin(callType, 'EXPERT', () => deps.accept(id), id) },
    /** 只接受与当前会话绑定的状态；同步器断网不代表已挂断或已退款。 */
    observe(state: ConsultCallState) { if (!busy && !disposed && view.callId) applyState(state) },
    async hangup() {
      if (busy || disposed || !view.callId || view.phase === 'FINISHED') return
      busy = true
      disconnect()
      publish('STOPPING')
      try {
        const state = await deps.read(view.callId)
        if (disposed || !applyState(state, false) || terminal(state.status)) return
        publish('STOPPING')
        // 先读最新状态，避免接听/取消竞争时拿旧 WAITING 发取消请求。
        if (state.status === 'WAITING') await deps.cancel(view.callId)
        else await deps.end(view.callId)
        const finalState = await deps.read(view.callId)
        if (!disposed && applyState(finalState) && !terminal(finalState.status)) publish('RECOVERY_REQUIRED', 'ACTION_UNCERTAIN')
      } catch { publish('RECOVERY_REQUIRED', 'ACTION_UNCERTAIN') }
      finally { busy = false }
    },
    dispose() { disposed = true; disconnect() },
    snapshot: () => ({ ...view }),
  }
}
