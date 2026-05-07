import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { searchApi } from '@/api'

/** 搜索结果条目 */
export interface SearchResultItem {
  id: string
  type: string // article | course | circle | classic
  title: string
  summary?: string
  cover?: string
  url?: string
  score?: number
  createdAt?: string
}

export const useSearchStore = defineStore('search', () => {
  // ========== State ==========
  const results = ref<SearchResultItem[]>([])
  const hotKeywords = ref<string[]>([])
  const history = ref<string[]>([])
  const keyword = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== Getters ==========
  const hasResults = computed(() => results.value.length > 0)

  // ========== Actions ==========

  /** 搜索 */
  async function search(q: string, type?: string) {
    keyword.value = q
    if (!q.trim()) {
      results.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      const res: any = await searchApi.search(q, type)
      if (Array.isArray(res)) {
        results.value = res as SearchResultItem[]
      } else if (res.list || res.items) {
        results.value = (res.list || res.items) as SearchResultItem[]
      } else {
        results.value = []
      }
      // 搜索成功后自动保存到历史
      await saveHistory(q)
    } catch (e: any) {
      error.value = e.errMsg || e.message || '搜索失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取热搜词 */
  async function fetchHotKeywords() {
    try {
      const res: any = await searchApi.hot()
      if (Array.isArray(res)) {
        hotKeywords.value = res as string[]
      } else if (res.list || res.items) {
        hotKeywords.value = (res.list || res.items) as string[]
      } else if (typeof res === 'object' && res.keywords) {
        hotKeywords.value = res.keywords as string[]
      }
    } catch {
      // 热搜词失败不影响其他功能
    }
  }

  /** 获取搜索历史 */
  async function fetchHistory() {
    try {
      const res: any = await searchApi.history()
      if (Array.isArray(res)) {
        history.value = res as string[]
      } else if (res.list || res.items) {
        history.value = (res.list || res.items) as string[]
      }
    } catch {
      // 历史记录获取失败，尝试从本地读取兜底
      const local = uni.getStorageSync('search_history')
      if (local) {
        try {
          history.value = JSON.parse(local)
        } catch {
          history.value = []
        }
      }
    }
  }

  /** 保存搜索历史 */
  async function saveHistory(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    // 去重并移到最前
    history.value = [trimmed, ...history.value.filter((h) => h !== trimmed)].slice(0, 20)
    // 同时保存到服务端和本地
    try {
      await searchApi.saveHistory(trimmed)
    } catch {
      // 服务端保存失败，至少本地保留
    }
    uni.setStorageSync('search_history', JSON.stringify(history.value))
  }

  /** 清除搜索历史 */
  async function clearHistory() {
    history.value = []
    uni.removeStorageSync('search_history')
    try {
      // 尝试调用服务端清除（如果存在该接口）
      const { api } = await import('@/api')
      await api.delete('/search/history')
    } catch {
      // 服务端清除失败，本地已清除
    }
  }

  return {
    // state
    results,
    hotKeywords,
    history,
    keyword,
    loading,
    error,
    // getters
    hasResults,
    // actions
    search,
    fetchHotKeywords,
    fetchHistory,
    saveHistory,
    clearHistory,
  }
})
