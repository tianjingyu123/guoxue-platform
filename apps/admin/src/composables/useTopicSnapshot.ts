import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createSnapshotLoader, type SnapshotState } from '@/utils/topic-screen'

/** 每个专题只调用原来的一个接口，不拓展对外令牌的数据范围。 */
export function useTopicSnapshot<T extends { updatedAt?: string }>(request: (token?: string) => Promise<{ data: T }>, interval = 30000) {
  const route = useRoute()
  const snapshot = shallowRef<SnapshotState<T>>({ data: null, refreshing: false, failed: false, forbidden: false })
  const token = computed(() => typeof route.query.token === 'string' ? route.query.token : undefined)
  const loader = createSnapshotLoader(async () => (await request(token.value)).data, value => { snapshot.value = value })
  let timer: ReturnType<typeof setInterval> | undefined
  function onVisible() { if (!document.hidden) void loader.refresh() }
  watch(token, () => { loader.reset(); void loader.refresh() })
  onMounted(() => {
    void loader.refresh()
    timer = setInterval(onVisible, interval)
    document.addEventListener('visibilitychange', onVisible)
  })
  onBeforeUnmount(() => {
    loader.dispose()
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  })
  return { snapshot, data: computed(() => snapshot.value.data ?? {} as T), refresh: loader.refresh }
}
