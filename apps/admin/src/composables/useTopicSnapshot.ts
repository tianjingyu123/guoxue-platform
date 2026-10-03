import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { createSnapshotLoader, type SnapshotState } from '@/utils/topic-screen'
import { useBigscreenContext } from '@/composables/useBigscreenContext'

/** 每个专题只调用原来的一个接口，不拓展对外令牌的数据范围。 */
export function useTopicSnapshot<T extends { updatedAt?: string }>(request: (token?: string) => Promise<{ data: T }>, interval = 30000) {
  const context = useBigscreenContext()
  const snapshot = shallowRef<SnapshotState<T>>({ data: null, refreshing: false, failed: false, forbidden: false })
  const loader = createSnapshotLoader(async () => (await request(context.token.value)).data, value => { snapshot.value = value })
  let timer: ReturnType<typeof setInterval> | undefined
  function refresh() {
    if (context.invalidScopedToken.value) { loader.forbid(); return }
    return loader.refresh()
  }
  function onVisible() { if (!document.hidden) void refresh() }
  watch(context.key, () => { loader.reset(); void nextTick(() => refresh()) }, { flush: 'sync' })
  onMounted(() => {
    void refresh()
    timer = setInterval(onVisible, interval)
    document.addEventListener('visibilitychange', onVisible)
  })
  onBeforeUnmount(() => {
    loader.dispose()
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  })
  return { snapshot, data: computed(() => snapshot.value.data ?? {} as T), refresh }
}
