import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { bigscreenApi, cockpitApi } from '@/api'
import { createPlatformSignalsLoader, emptyPlatformSignals } from '@/utils/platform-signals'
export type { TransactionSignals, ContentSignals, AiSignals, OfflineSignals, GrowthPoint, AlertSignals, SignalKey, SignalState } from '@/utils/platform-signals'

/** 各数据源独立降级；额外指标只服务已登录后台，不拓展对外令牌权限。 */
export function usePlatformSignals(enabled: () => boolean, canReadOperations: () => boolean, onAccessDenied: () => void) {
  const state = shallowRef(emptyPlatformSignals())
  const loader = createPlatformSignalsLoader({
    transactions: () => bigscreenApi.transactions(undefined, true),
    content: () => bigscreenApi.contentEco(undefined, true),
    ai: () => bigscreenApi.aiCapability(undefined, true),
    offline: () => bigscreenApi.offlineMap(undefined, true),
    growth: cockpitApi.userGrowth,
    alerts: cockpitApi.alerts,
  }, value => { state.value = value }, enabled, canReadOperations, onAccessDenied)
  watch([enabled, canReadOperations], () => loader.reset(), { flush: 'sync' })
  onBeforeUnmount(loader.dispose)
  return {
    transactions: computed(() => state.value.transactions), content: computed(() => state.value.content),
    ai: computed(() => state.value.ai), offline: computed(() => state.value.offline),
    growth: computed(() => state.value.growth), alerts: computed(() => state.value.alerts),
    states: computed(() => state.value.states), refreshing: computed(() => state.value.refreshing),
    refresh: loader.refresh, reset: loader.reset,
  }
}
