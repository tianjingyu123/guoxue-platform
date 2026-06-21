import { ref, onMounted, type Ref } from 'vue'

export function useAsyncData<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)

  async function reload() {
    isLoading.value = true
    loadError.value = null
    try {
      data.value = await fetcher()
    } catch (e: unknown) {
      loadError.value = (e as { message?: string })?.message || '加载失败，请稍后重试'
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => reload())

  return { data, isLoading, loadError, reload }
}
