import { onBeforeUnmount, ref } from 'vue'
import { bigscreenApi, cockpitApi } from '@/api'

export interface TransactionSignals {
  todayOrders?: number; todayRevenue?: number; hourOrders?: number
  typeBreakdown?: { type: string; amount: number; count: number }[]
  recentOrders?: { id: string; type: string; amount: number; at: string }[]
  updatedAt?: string
}
export interface ContentSignals {
  totalPosts?: number; totalVideos?: number
  monthGrowth?: { articles?: number; posts?: number }
  updatedAt?: string
}
export interface AiSignals {
  totalApiCalls?: number; todayApiCalls?: number; knowledgeBaseSize?: number; botConversations?: number
  updatedAt?: string
}
export interface OfflineSignals {
  totalStations?: number; totalStudents?: number; totalCourses?: number
  cityDistribution?: { city: string; count: number }[]
  updatedAt?: string
}
export interface GrowthPoint { date: string; newUsers?: number }
export interface AlertSignals {
  systemAlerts?: { type?: string; message?: string; level?: string }[]
  riskAlerts?: { id?: string; type?: string; title?: string; level?: string }[]
}
export type SignalKey = 'transactions' | 'content' | 'ai' | 'offline' | 'growth' | 'alerts'
export interface SignalState { status: 'waiting' | 'ready' | 'stale' | 'error'; receivedAt?: string }

/** 各数据源独立降级；额外指标只服务已登录后台，不拓展对外令牌权限。 */
export function usePlatformSignals(enabled: () => boolean, canReadOperations: () => boolean) {
  const transactions = ref<TransactionSignals>({})
  const content = ref<ContentSignals>({})
  const ai = ref<AiSignals>({})
  const offline = ref<OfflineSignals>({})
  const growth = ref<GrowthPoint[]>([])
  const alerts = ref<AlertSignals>({})
  const states = ref<Record<SignalKey, SignalState>>({
    transactions: { status: 'waiting' }, content: { status: 'waiting' }, ai: { status: 'waiting' },
    offline: { status: 'waiting' }, growth: { status: 'waiting' }, alerts: { status: 'waiting' },
  })
  const refreshing = ref(false)
  let disposed = false
  let operationsReadAt = 0

  async function read<T>(key: SignalKey, request: () => Promise<{ data: T }>, save: (value: T) => void) {
    try {
      const response = await request()
      if (disposed) return
      if (response.data === null || typeof response.data !== 'object') throw new Error('invalid signal data')
      save(response.data)
      states.value[key] = { status: 'ready', receivedAt: new Date().toISOString() }
    } catch {
      if (!disposed) states.value[key] = { ...states.value[key], status: states.value[key].receivedAt ? 'stale' : 'error' }
    }
  }

  async function refresh(force = false) {
    if (!enabled() || refreshing.value || disposed) return
    refreshing.value = true
    const jobs = [
      read('transactions', bigscreenApi.transactions, value => { transactions.value = value }),
      read('content', bigscreenApi.contentEco, value => { content.value = value }),
      read('ai', bigscreenApi.aiCapability, value => { ai.value = value }),
      read('offline', bigscreenApi.offlineMap, value => { offline.value = value }),
    ]
    if (canReadOperations() && (force || Date.now() - operationsReadAt >= 60000)) {
      operationsReadAt = Date.now()
      jobs.push(
        read<{ trends?: GrowthPoint[] }>('growth', cockpitApi.userGrowth, value => { growth.value = Array.isArray(value.trends) ? value.trends : [] }),
        read('alerts', cockpitApi.alerts, value => { alerts.value = value }),
      )
    }
    await Promise.all(jobs)
    if (!disposed) refreshing.value = false
  }

  onBeforeUnmount(() => { disposed = true })
  return { transactions, content, ai, offline, growth, alerts, states, refreshing, refresh }
}
