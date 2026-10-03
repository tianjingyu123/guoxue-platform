import { ref } from 'vue'
import type { RecommendItem } from '@/components/common/recommend-section.vue'
import { offlineApi, type Station } from '@/lib/offline-data'
import { recommendApi } from '@/lib/recommend-data'

const CITY_KEY = 'discovery:selected-city:v1'
const PAGE_SIZE = 12

/** 换城使旧响应失效；推荐与驿站分别保留错误，不伪装成空态。 */
export function useSameCity() {
  const cities = ref<string[]>([])
  const city = ref('')
  const directoryLoading = ref(false)
  const directoryError = ref(false)
  const stations = ref<Station[]>([])
  const recommendations = ref<RecommendItem[]>([])
  const loading = ref(false)
  const stationError = ref(false)
  const recommendationError = ref(false)
  const loadingMore = ref(false)
  const moreError = ref(false)
  const hasMore = ref(false)
  let sequence = 0
  let directorySequence = 0
  let page = 1
  let disposed = false

  async function loadCity() {
    const seq = ++sequence
    const requestedCity = city.value
    stations.value = []
    recommendations.value = []
    stationError.value = recommendationError.value = moreError.value = false
    hasMore.value = loadingMore.value = false
    page = 1
    loading.value = !!requestedCity
    if (!requestedCity) return
    await Promise.all([
      offlineApi.discoverStationPage(requestedCity, 1, PAGE_SIZE).then(result => {
        if (disposed || seq !== sequence) return
        stations.value = result.stations
        hasMore.value = result.stations.length > 0 && result.stations.length < result.total
      }).catch(() => { if (!disposed && seq === sequence) stationError.value = true }),
      recommendApi.getSameCity(requestedCity).then(items => {
        if (!disposed && seq === sequence) recommendations.value = items
      }).catch(() => { if (!disposed && seq === sequence) recommendationError.value = true }),
    ])
    if (!disposed && seq === sequence) loading.value = false
  }

  async function selectCity(value: string) {
    if (!cities.value.includes(value) || value === city.value) return
    city.value = value
    try { uni.setStorageSync(CITY_KEY, value) } catch { /* 偏好存储失败不阻断浏览 */ }
    await loadCity()
  }

  async function loadDirectory() {
    const seq = ++directorySequence
    directoryLoading.value = true
    directoryError.value = false
    try {
      const result = await offlineApi.discoverCities()
      if (disposed || seq !== directorySequence) return
      cities.value = [...new Set(result.filter(value => typeof value === 'string' && !!value))]
      let preferred = city.value
      try { preferred ||= String(uni.getStorageSync(CITY_KEY) || '') } catch { /* 无偏好时手选城市 */ }
      // 已停用城市不再请求或沿用旧内容；不凭空猜测用户位置。
      city.value = cities.value.includes(preferred) ? preferred : ''
      await loadCity()
    } catch {
      if (!disposed && seq === directorySequence) directoryError.value = true
    } finally {
      if (!disposed && seq === directorySequence) directoryLoading.value = false
    }
  }

  async function loadMore() {
    if (!city.value || loading.value || loadingMore.value || !hasMore.value) return
    const seq = sequence
    const next = page + 1
    loadingMore.value = true
    moreError.value = false
    try {
      const result = await offlineApi.discoverStationPage(city.value, next, PAGE_SIZE)
      if (disposed || seq !== sequence) return
      const ids = new Set(stations.value.map(station => station.id))
      stations.value = [...stations.value, ...result.stations.filter(station => !ids.has(station.id))]
      page = next
      hasMore.value = result.stations.length > 0 && stations.value.length < result.total
    } catch {
      if (!disposed && seq === sequence) moreError.value = true
    } finally {
      if (!disposed && seq === sequence) loadingMore.value = false
    }
  }

  function dispose() { disposed = true; sequence++; directorySequence++ }
  return { cities, city, directoryLoading, directoryError, stations, recommendations, loading,
    stationError, recommendationError, loadingMore, moreError, hasMore,
    loadDirectory, loadCity, selectCity, loadMore, dispose }
}
