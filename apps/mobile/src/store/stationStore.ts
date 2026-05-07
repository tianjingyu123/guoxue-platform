import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { stationApi } from '@/api'

/** 分站品牌信息 */
export interface StationBrand {
  id: string
  name: string
  logo: string
  themeColor: string
  code: string
  intro: string
}

export const useStationStore = defineStore('station', () => {
  // ========== State ==========
  const brand = ref<StationBrand | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== Getters ==========
  /** 当前是否为分站模式（有品牌信息） */
  const isStationMode = computed(() => !!brand.value)
  /** 分站名称 */
  const stationName = computed(() => brand.value?.name || '')
  /** 分站 Logo URL */
  const stationLogo = computed(() => brand.value?.logo || '')
  /** 分站主题色 */
  const stationThemeColor = computed(() => brand.value?.themeColor || '#8b4513')
  /** 分站推广码 */
  const stationCode = computed(() => brand.value?.code || '')
  /** 分站 ID */
  const stationId = computed(() => brand.value?.id || '')

  // ========== Actions ==========

  /** 通过推广码获取品牌信息 */
  async function fetchBrand(code: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await stationApi.getBrand(code)
      brand.value = res as StationBrand
      // 持久化缓存
      uni.setStorageSync('stationBrand', JSON.stringify(res))
      uni.setStorageSync('stationCode', code)
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取分站品牌信息失败'
      console.error('[stationStore] fetchBrand error:', error.value)
      uni.showToast({ title: '分站信息加载失败', icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 从缓存恢复品牌信息 */
  function restoreFromCache() {
    try {
      const cached = uni.getStorageSync('stationBrand')
      if (cached) {
        brand.value = JSON.parse(cached) as StationBrand
      }
    } catch {
      // 缓存解析失败，忽略
    }
  }

  /** 清除分站品牌信息 */
  function clearBrand() {
    brand.value = null
    uni.removeStorageSync('stationBrand')
    uni.removeStorageSync('stationCode')
  }

  return {
    // state
    brand,
    loading,
    error,
    // getters
    isStationMode,
    stationName,
    stationLogo,
    stationThemeColor,
    stationCode,
    stationId,
    // actions
    fetchBrand,
    restoreFromCache,
    clearBrand,
  }
})
