import { ref, computed, type Ref } from 'vue'

/**
 * 分页列表 composable —— 统一「分页 + 三态 + 上拉加载更多」样板。
 *
 * 病灶：250+ 列表页各写一份 page/pageSize/hasMore/loadingMore + loadList/loadMore，
 *      且大量列表页根本没接分页（全量渲染，长列表卡顿）。范本散落在 articles/index.vue。
 * 解药：抽成 useList，页面只需提供 fetcher（返回 { items, total }）。
 *
 * uni-app 用法（注意：不在此处自动加载，由页面生命周期触发，契合 onLoad/onShow）：
 *   const { list, total, loading, error, loadStatus, isEmpty, refresh, loadMore } = useList({
 *     fetcher: ({ page, pageSize }) => shopApi.products({ page, pageSize, storeId }),
 *     getParams: () => ({ storeId: storeId.value }),   // 可选：随筛选/搜索变化的查询参数
 *   })
 *   onLoad(() => refresh())          // 首屏/切筛选时重载
 *   onReachBottom(() => loadMore())  // 上拉加载更多
 *   // 模板：<app-load-more :status="loadStatus" />
 */

export interface PagedResult<T> {
  items: T[]
  /** 总数。后端未返回时按已加载长度兜底，不影响 hasMore 判定 */
  total?: number
}

export interface FetchParams {
  page: number
  pageSize: number
}

export interface UseListOptions<T, P extends Record<string, any>> {
  /** 分页请求函数，入参含 page/pageSize 及 getParams 展开的查询参数 */
  fetcher: (params: FetchParams & P) => Promise<PagedResult<T>>
  /** 每页条数，默认 20 */
  pageSize?: number
  /** 动态查询参数（筛选 tab / 排序 / 关键词等），每次请求实时求值 */
  getParams?: () => P
}

export function useList<T, P extends Record<string, any> = Record<string, never>>(
  opts: UseListOptions<T, P>,
) {
  const pageSize = opts.pageSize ?? 20
  const list = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const page = ref(1)
  const loading = ref(false) // 首屏 / 刷新
  const loadingMore = ref(false) // 上拉加载更多
  const error = ref('')
  const hasMore = ref(false)
  let version = 0
  let revalidating = false

  function buildParams(p: number): FetchParams & P {
    const extra = (opts.getParams ? opts.getParams() : {}) as P
    return { ...extra, page: p, pageSize }
  }

  /** 重载第一页（首屏、下拉刷新、切换筛选时调用） */
  async function refresh() {
    const requestVersion = ++version
    loading.value = true
    error.value = ''
    page.value = 1
    try {
      const res = await opts.fetcher(buildParams(1))
      if (requestVersion !== version) return
      list.value = res.items
      total.value = res.total ?? res.items.length
      hasMore.value = res.items.length >= pageSize
    } catch (e: any) {
      if (requestVersion !== version) return
      error.value = e?.message || '加载失败，请稍后重试'
      list.value = []
      total.value = 0
      hasMore.value = false
    } finally {
      if (requestVersion === version) loading.value = false
    }
  }

  /** 追加下一页（上拉触底调用）。失败静默，保留已加载内容 */
  async function loadMore() {
    if (loading.value || loadingMore.value || revalidating || !hasMore.value) return
    const requestVersion = version
    loadingMore.value = true
    try {
      const next = page.value + 1
      const res = await opts.fetcher(buildParams(next))
      if (requestVersion !== version) return
      list.value.push(...res.items)
      page.value = next
      hasMore.value = res.items.length >= pageSize
    } catch {
      // 加载更多失败静默，避免覆盖已加载列表；用户可再次上拉重试
    } finally {
      loadingMore.value = false
    }
  }

  /** 静默同步已加载的所有页；筛选切换后丢弃旧响应，失败不清空已有列表。 */
  async function revalidate() {
    if (loading.value || loadingMore.value || revalidating) return
    revalidating = true
    const requestVersion = version
    const loadedPages = page.value
    const items: T[] = []
    let latestTotal = 0
    let lastSize = 0
    let lastPage = 1
    try {
      for (let p = 1; p <= loadedPages; p++) {
        const res = await opts.fetcher(buildParams(p))
        if (requestVersion !== version) return
        items.push(...res.items)
        latestTotal = res.total ?? items.length
        lastSize = res.items.length
        lastPage = p
        if (lastSize < pageSize) break
      }
      list.value = items
      total.value = latestTotal
      page.value = lastPage
      hasMore.value = lastSize >= pageSize && items.length < latestTotal
      error.value = ''
    } catch { /* 网络失败保留当前分页与内容 */ }
    finally { revalidating = false }
  }

  /** 空态：非加载中、无错误、列表为空 */
  const isEmpty = computed(() => !loading.value && !error.value && list.value.length === 0)

  /** 直接喂给 <app-load-more :status="loadStatus" /> */
  const loadStatus = computed<'loading' | 'nomore' | 'more'>(() => {
    if (loadingMore.value) return 'loading'
    if (!hasMore.value && list.value.length > 0) return 'nomore'
    return 'more'
  })

  return {
    list,
    total,
    page,
    pageSize,
    loading,
    loadingMore,
    error,
    hasMore,
    isEmpty,
    loadStatus,
    refresh,
    revalidate,
    loadMore,
  }
}
