import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi } from '@/api'

/** 文章/内容条目 */
export interface ArticleItem {
  id: string
  title: string
  summary?: string
  content?: string
  cover?: string
  author?: string
  category?: string
  tags?: string[]
  viewCount?: number
  likeCount?: number
  collectCount?: number
  commentCount?: number
  createdAt?: string
  updatedAt?: string
}

/** 分页信息 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export const useContentStore = defineStore('content', () => {
  // ========== State ==========
  const articles = ref<ArticleItem[]>([])
  const currentArticle = ref<ArticleItem | null>(null)
  const feedList = ref<ArticleItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
  })

  // ========== Getters ==========
  const hasMore = computed(() => {
    const { page, pageSize, total } = pagination.value
    return page * pageSize < total
  })

  // ========== Actions ==========

  /** 获取文章列表 */
  async function fetchArticles(params?: Record<string, any>) {
    loading.value = true
    error.value = null
    try {
      const res: any = await contentApi.list({ page: 1, pageSize: 10, ...params })
      if (Array.isArray(res)) {
        articles.value = res as ArticleItem[]
      } else if (res.list || res.items) {
        articles.value = (res.list || res.items) as ArticleItem[]
        pagination.value = {
          page: res.page || 1,
          pageSize: res.pageSize || 10,
          total: res.total || res.count || articles.value.length,
        }
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取文章列表失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取首页 Feed 流 */
  async function fetchFeed(params?: Record<string, any>) {
    loading.value = true
    error.value = null
    try {
      const res: any = await contentApi.feed({ page: 1, pageSize: 10, ...params })
      if (Array.isArray(res)) {
        feedList.value = res as ArticleItem[]
      } else if (res.list || res.items) {
        feedList.value = (res.list || res.items) as ArticleItem[]
        pagination.value = {
          page: res.page || 1,
          pageSize: res.pageSize || 10,
          total: res.total || res.count || feedList.value.length,
        }
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取首页内容失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取文章详情 */
  async function fetchDetail(id: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await contentApi.detail(id)
      currentArticle.value = res as ArticleItem
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取文章详情失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 获取相关文章 */
  async function fetchRelated(id: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await contentApi.related(id)
      return Array.isArray(res) ? (res as ArticleItem[]) : []
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取相关文章失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 加载更多（分页） */
  async function loadMore(params?: Record<string, any>) {
    if (loading.value || !hasMore.value) return
    loading.value = true
    error.value = null
    try {
      const nextPage = pagination.value.page + 1
      const res: any = await contentApi.list({ page: nextPage, pageSize: pagination.value.pageSize, ...params })
      const newItems = Array.isArray(res) ? (res as ArticleItem[]) : (res.list || res.items || []) as ArticleItem[]
      articles.value = [...articles.value, ...newItems]
      pagination.value = {
        page: res.page || nextPage,
        pageSize: res.pageSize || pagination.value.pageSize,
        total: res.total || res.count || articles.value.length,
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '加载更多失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  /** 重置分页 */
  function resetPagination() {
    pagination.value = { page: 1, pageSize: 10, total: 0 }
  }

  return {
    // state
    articles,
    currentArticle,
    feedList,
    loading,
    error,
    pagination,
    // getters
    hasMore,
    // actions
    fetchArticles,
    fetchFeed,
    fetchDetail,
    fetchRelated,
    loadMore,
    resetPagination,
  }
})
