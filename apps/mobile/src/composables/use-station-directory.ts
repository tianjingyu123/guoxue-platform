import { computed, ref } from 'vue'
import { offlineApi, type Station, type StationType } from '@/lib/offline-data'

const PAGE_SIZE = 20

/** 城市目录独立加载；换筛选或退出页面使旧响应失效。 */
export function useStationDirectory() {
  const cities = ref<string[]>([])
  const cityOptions = computed(() => ['全部', ...cities.value])
  const directoryError = ref(false)
  const selectedCity = ref('全部')
  const selectedType = ref<StationType | 'all'>('all')
  const keyword = ref('')
  const stations = ref<Station[]>([])
  const total = ref(0)
  const loading = ref(false)
  const errMsg = ref('')
  const loadingMore = ref(false)
  const moreError = ref('')
  const hasMore = ref(false)
  const hasFilter = computed(() => !!keyword.value.trim() || selectedType.value !== 'all' || selectedCity.value !== '全部')
  let sequence = 0
  let directorySequence = 0
  let disposed = false
  let page = 1
  let query: { city?: string; type?: StationType; keyword?: string } = {}

  async function loadCities() {
    const seq = ++directorySequence
    directoryError.value = false
    try {
      const result = await offlineApi.discoverCities()
      if (disposed || seq !== directorySequence) return
      cities.value = [...new Set(result.filter(value => typeof value === 'string' && !!value && value !== '全部'))]
    } catch {
      if (!disposed && seq === directorySequence) directoryError.value = true
    }
  }

  async function load() {
    if (disposed) return
    const seq = ++sequence
    query = {
      city: selectedCity.value === '全部' ? undefined : selectedCity.value,
      type: selectedType.value === 'all' ? undefined : selectedType.value,
      keyword: keyword.value.trim() || undefined,
    }
    page = 1
    stations.value = []
    total.value = 0
    errMsg.value = moreError.value = ''
    loadingMore.value = hasMore.value = false
    loading.value = true
    try {
      const result = await offlineApi.searchStationPage({ ...query, page, pageSize: PAGE_SIZE })
      if (disposed || seq !== sequence) return
      stations.value = result.stations
      total.value = result.total
      hasMore.value = result.stations.length > 0 && page * PAGE_SIZE < result.total
    } catch (error) {
      if (!disposed && seq === sequence) errMsg.value = (error as Error)?.message || '加载失败，请重试'
    } finally {
      if (!disposed && seq === sequence) loading.value = false
    }
  }

  async function selectCity(value: string) {
    if (!cityOptions.value.includes(value) || value === selectedCity.value) return
    selectedCity.value = value
    await load()
  }

  async function selectType(value: StationType | 'all') {
    if (value === selectedType.value) return
    selectedType.value = value
    await load()
  }

  async function clearFilter() {
    keyword.value = ''
    selectedCity.value = '全部'
    selectedType.value = 'all'
    await load()
  }

  async function loadMore() {
    if (disposed || loading.value || loadingMore.value || !hasMore.value) return
    const seq = sequence
    const next = page + 1
    loadingMore.value = true
    moreError.value = ''
    try {
      const result = await offlineApi.searchStationPage({ ...query, page: next, pageSize: PAGE_SIZE })
      if (disposed || seq !== sequence) return
      const ids = new Set(stations.value.map(station => station.id))
      stations.value = [...stations.value, ...result.stations.filter(station => !ids.has(station.id))]
      page = next
      total.value = result.total
      hasMore.value = result.stations.length > 0 && page * PAGE_SIZE < result.total
    } catch (error) {
      if (!disposed && seq === sequence) moreError.value = (error as Error)?.message || '加载更多失败，点击重试'
    } finally {
      if (!disposed && seq === sequence) loadingMore.value = false
    }
  }

  function dispose() { disposed = true; sequence++; directorySequence++ }
  return { cities, cityOptions, directoryError, selectedCity, selectedType, keyword, stations, total,
    loading, errMsg, loadingMore, moreError, hasMore, hasFilter, loadCities, load, selectCity, selectType, clearFilter, loadMore, dispose }
}
