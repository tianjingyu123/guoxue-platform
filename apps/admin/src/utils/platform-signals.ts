export interface TransactionSignals {
  todayOrders?: number; todayRevenue?: number; hourOrders?: number
  typeBreakdown?: { type: string; amount: number; count: number }[]
  recentOrders?: { id: string; type: string; amount: number; at: string }[]
  updatedAt?: string
}
export interface ContentSignals { totalPosts?: number; totalVideos?: number; monthGrowth?: { articles?: number; posts?: number }; updatedAt?: string }
export interface AiSignals { totalApiCalls?: number; todayApiCalls?: number; knowledgeBaseSize?: number; botConversations?: number; updatedAt?: string }
export interface OfflineSignals { totalStations?: number; totalStudents?: number; totalCourses?: number; cityDistribution?: { city: string; count: number }[]; updatedAt?: string }
export interface GrowthPoint { date: string; newUsers?: number }
export interface AlertSignals { systemAlerts?: { type?: string; message?: string; level?: string }[]; riskAlerts?: { id?: string; type?: string; title?: string; level?: string }[] }
export type SignalKey = 'transactions' | 'content' | 'ai' | 'offline' | 'growth' | 'alerts'
export interface SignalState { status: 'waiting' | 'ready' | 'stale' | 'error'; receivedAt?: string }
export interface PlatformSignalsState {
  transactions: TransactionSignals; content: ContentSignals; ai: AiSignals; offline: OfflineSignals
  growth: GrowthPoint[]; alerts: AlertSignals; states: Record<SignalKey, SignalState>; refreshing: boolean
}
export function emptyPlatformSignals(): PlatformSignalsState {
  return {
    transactions: {}, content: {}, ai: {}, offline: {}, growth: [], alerts: {}, refreshing: false,
    states: { transactions: { status: 'waiting' }, content: { status: 'waiting' }, ai: { status: 'waiting' }, offline: { status: 'waiting' }, growth: { status: 'waiting' }, alerts: { status: 'waiting' } },
  }
}

/** 同一权限上下文的一组数据源：普通网络故障可降级，认证失败必须整体清空。 */
export function createPlatformSignalsLoader(
  requests: Record<SignalKey, () => Promise<{ data: unknown }>>,
  changed: (state: PlatformSignalsState) => void,
  enabled: () => boolean,
  canReadOperations: () => boolean,
  onAccessDenied: () => void,
) {
  let state = emptyPlatformSignals(), generation = 0, operationsReadAt = 0, disposed = false
  function publish(patch: Partial<PlatformSignalsState>) { state = { ...state, ...patch }; changed(state) }
  function reset() {
    generation++
    operationsReadAt = 0
    if (!disposed) { state = emptyPlatformSignals(); changed(state) }
  }
  async function read(key: SignalKey, current: number) {
    try {
      const response = await requests[key]()
      if (disposed || current !== generation) return
      if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) throw new Error('invalid signal data')
      const value = key === 'growth' ? (response.data as { trends?: GrowthPoint[] }).trends : response.data
      publish({
        [key]: key === 'growth' ? (Array.isArray(value) ? value : []) : value,
        states: { ...state.states, [key]: { status: 'ready', receivedAt: new Date().toISOString() } },
      })
    } catch (error) {
      if (disposed || current !== generation) return
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        reset()
        onAccessDenied()
      } else {
        publish({ states: { ...state.states, [key]: { ...state.states[key], status: state.states[key].receivedAt ? 'stale' : 'error' } } })
      }
    }
  }
  async function refresh(force = false) {
    if (!enabled() || state.refreshing || disposed) return
    const current = generation
    publish({ refreshing: true })
    const keys: SignalKey[] = ['transactions', 'content', 'ai', 'offline']
    if (canReadOperations() && (force || Date.now() - operationsReadAt >= 60000)) {
      operationsReadAt = Date.now()
      keys.push('growth', 'alerts')
    }
    await Promise.all(keys.map(key => read(key, current)))
    if (!disposed && current === generation) publish({ refreshing: false })
  }
  return { refresh, reset, dispose: () => { disposed = true; generation++ } }
}
