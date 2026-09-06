import type { ConsultCallState } from './consult-call-data'

const terminalStates = new Set(['ENDED', 'MISSED', 'REFUNDED'])
const validTime = (value: unknown) => value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)))

/** 只同步业务状态，不签发票据、不发起/接听/结算，也不把网络失败当作通话结束。 */
export function createConsultCallStateSync(options: {
  callId: string
  read: (id: string) => Promise<ConsultCallState>
  onState: (state: ConsultCallState) => void
  onError: (code: 'STATE_UNAVAILABLE' | 'STATE_INVALID') => void
}) {
  let running = false
  let terminal = false
  let generation = 0
  let previous: ConsultCallState | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const stop = () => {
    running = false
    generation++
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const valid = (value: ConsultCallState) => value && value.id === options.callId
    && ['WAITING', 'ONGOING', 'ENDED', 'MISSED', 'REFUNDED'].includes(value.status)
    && ['VOICE', 'VIDEO'].includes(value.type) && ['CALLER', 'EXPERT'].includes(value.role)
    && validTime(value.startAt) && validTime(value.endAt)
    && (!previous || (value.type === previous.type && value.role === previous.role
      && !(previous.status === 'ONGOING' && value.status === 'WAITING')))

  const tick = async (current: number): Promise<void> => {
    let value: ConsultCallState
    try { value = await options.read(options.callId) }
    catch {
      if (!running || current !== generation) return
      stop()
      options.onError('STATE_UNAVAILABLE')
      return
    }
    if (!running || current !== generation) return
    if (!valid(value)) {
      stop()
      options.onError('STATE_INVALID')
      return
    }
    // 只传安全状态字段，未知扩展字段不会进入页面状态或日志。
    const state: ConsultCallState = { id: value.id, status: value.status, type: value.type,
      role: value.role, startAt: value.startAt, endAt: value.endAt }
    previous = state
    if (terminalStates.has(state.status)) {
      terminal = true
      stop()
    }
    options.onState(state)
    // 完成一次请求后再安排下一次；页面回调中停止后也不会复活计时器。
    if (running && current === generation) timer = setTimeout(() => { timer = null; void tick(current) }, 2000)
  }

  return {
    start() {
      if (running || terminal) return
      running = true
      const current = ++generation
      void tick(current)
    },
    stop,
  }
}
