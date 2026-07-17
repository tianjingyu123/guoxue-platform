import { apiGet, apiPost, apiDelete } from '@/utils/request'

/**
 * 全局搜索数据层。
 * 后端真源：GET /search?q=&type=&page=&pageSize=（FTS + ILIKE 回退 + 权重 + redis 缓存）。
 * 后端按类型返回 { articles, courses, products, circles, videos, users, classics, contents }，
 * （ebooks 已于 2026-07-14 从后端搜索摘除：电子书板块 07-08 瘦身已下线，前端无详情页）
 * 各数组元素字段见下方 RawX。本层负责映射为前端统一展示结构，并把
 * articles + videos + contents 合并为一个「内容」列表（综合模式后端三类都给，content 模式只给 contents）。
 *
 * AI 总结：POST /search/ai/summary（需登录），失败/未登录由调用方走诚实降级隐藏。
 */

// ===== 后端原始返回（仅列前端用到的字段；price 为 Decimal，raw query 下可能是 string）=====
interface RawArticle { id: string; title: string; cover?: string | null; excerpt?: string | null; viewCount?: number }
interface RawVideo { id: string; title: string; coverUrl?: string | null; viewCount?: number }
interface RawContent { id: string; title: string; type?: string; author?: string | null; dynasty?: string | null; cover?: string | null; excerpt?: string | null; viewCount?: number; likeCount?: number }
interface RawCourse { id: string; title: string; cover?: string | null; intro?: string | null; price?: number | string; studentCount?: number }
interface RawProduct { id: string; title: string; images?: string[]; price?: number | string; salesCount?: number }
interface RawCircle { id: string; name: string; cover?: string | null; intro?: string | null; memberCount?: number }
interface RawClassic { id: string; title: string; author?: string | null; cover?: string | null; category?: string | null; dynasty?: string | null }
interface RawUser { id: string; nickname?: string | null; avatar?: string | null }

interface RawSearchResponse {
  q?: string
  type?: string
  articles?: RawArticle[]
  videos?: RawVideo[]
  contents?: RawContent[]
  courses?: RawCourse[]
  products?: RawProduct[]
  circles?: RawCircle[]
  classics?: RawClassic[]
  users?: RawUser[]
}

// ===== 前端统一展示结构 =====
export type ContentKind = 'article' | 'video' | 'post' | 'classic' | 'poem'

export interface SearchContent {
  id: string
  kind: ContentKind
  title: string
  summary: string
  cover?: string
  author?: string
  viewCount: number
  likeCount?: number
  href: string
}
export interface SearchCourse {
  id: string; title: string; cover?: string; intro?: string
  price: number; studentCount: number; href: string
}
export interface SearchProduct {
  id: string; title: string; cover?: string
  price: number; salesCount: number; href: string
}
export interface SearchCircle {
  id: string; name: string; cover?: string; description?: string
  memberCount: number; href: string
}
export interface SearchClassic {
  id: string; title: string; author?: string; cover?: string
  category?: string; dynasty?: string; href: string
}
export interface SearchUser {
  id: string; name: string; avatar?: string; href: string
}

export interface SearchResults {
  contents: SearchContent[]
  courses: SearchCourse[]
  products: SearchProduct[]
  circles: SearchCircle[]
  classics: SearchClassic[]
  users: SearchUser[]
}

/** 前端 Tab key → 后端 type（'all' 不传 type，后端各类返回前 5 条混排） */
export type SearchTab = 'all' | 'content' | 'course' | 'product' | 'circle' | 'classic' | 'user'

const dNum = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const s = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)

/** Content 表 type → 前端 ContentKind */
function contentKind(t?: string): ContentKind {
  switch ((t || '').toUpperCase()) {
    case 'POEM': return 'poem'
    case 'CLASSIC': return 'classic'
    default: return 'article'
  }
}

function emptyResults(): SearchResults {
  return { contents: [], courses: [], products: [], circles: [], classics: [], users: [] }
}

/** 后端原始响应 → 前端统一结构 */
function adapt(res: RawSearchResponse): SearchResults {
  const contents: SearchContent[] = [
    ...(res.articles || []).map((a): SearchContent => ({
      id: a.id, kind: 'article', title: a.title || '', summary: s(a.excerpt) || '',
      cover: s(a.cover), viewCount: dNum(a.viewCount), href: `/articles/${a.id}`,
    })),
    ...(res.videos || []).map((v): SearchContent => ({
      id: v.id, kind: 'video', title: v.title || '', summary: '',
      cover: s(v.coverUrl), viewCount: dNum(v.viewCount), href: `/video/${v.id}`,
    })),
    ...(res.contents || []).map((c): SearchContent => ({
      id: c.id, kind: contentKind(c.type), title: c.title || '', summary: s(c.excerpt) || '',
      cover: s(c.cover), author: s(c.author) || s(c.dynasty),
      viewCount: dNum(c.viewCount), likeCount: dNum(c.likeCount), href: `/articles/${c.id}`,
    })),
  ]
  return {
    contents,
    courses: (res.courses || []).map((c): SearchCourse => ({
      id: c.id, title: c.title || '', cover: s(c.cover), intro: s(c.intro),
      price: dNum(c.price), studentCount: dNum(c.studentCount), href: `/courses/${c.id}`,
    })),
    products: (res.products || []).map((p): SearchProduct => ({
      id: p.id, title: p.title || '', cover: p.images?.[0],
      price: dNum(p.price), salesCount: dNum(p.salesCount), href: `/mall/product/${p.id}`,
    })),
    circles: (res.circles || []).map((c): SearchCircle => ({
      id: c.id, name: c.name || '', cover: s(c.cover), description: s(c.intro),
      memberCount: dNum(c.memberCount), href: `/circles/${c.id}`,
    })),
    classics: (res.classics || []).map((c): SearchClassic => ({
      id: c.id, title: c.title || '', author: s(c.author), cover: s(c.cover),
      category: s(c.category), dynasty: s(c.dynasty), href: `/classics/${c.id}`,
    })),
    users: (res.users || []).map((u): SearchUser => ({
      id: u.id, name: s(u.nickname) || '用户', avatar: s(u.avatar), href: `/user/${u.id}`,
    })),
  }
}

/** 搜索分页页大小（与后端默认一致；结果页据「返回条数 < 此值」判到底） */
export const SEARCH_PAGE_SIZE = 20

export const searchApi = {
  /**
   * 执行搜索。tab='all' 综合（不传 type，各类前 5）；其余传对应后端 type。
   * page 从 1 起（后端 GET /search 原生支持 page/pageSize，此前前端写死第 1 页）。
   * 出错抛给调用方走 error 三态（不回退假数据）。
   */
  async search(q: string, tab: SearchTab = 'all', page = 1): Promise<SearchResults> {
    const kw = q.trim()
    if (!kw) return emptyResults()
    const typeParam = tab === 'all' ? '' : `&type=${tab}`
    const res = await apiGet<RawSearchResponse>(
      `/search?q=${encodeURIComponent(kw)}&page=${page}&pageSize=${SEARCH_PAGE_SIZE}${typeParam}`,
    )
    return adapt(res || {})
  },

  /**
   * AI 智能总结（综合 Tab 用）。需登录；未登录/未配置/限流时抛错，调用方静默隐藏卡片。
   * @param items 用于喂给模型的结果摘要（title + 一句话）
   */
  async aiSummary(query: string, items: { title: string; content: string }[]): Promise<string> {
    const res = await apiPost<{ summary?: string }>('/search/ai/summary', { query, results: items.slice(0, 10) })
    return res?.summary || ''
  },

  /** 保存搜索历史（登录态，失败静默） */
  async saveHistory(keyword: string): Promise<void> {
    try { await apiGet(`/search/history/save?keyword=${encodeURIComponent(keyword)}`) } catch { /* 非关键 */ }
  },

  /**
   * 热门搜索 — GET /search/hot
   * 🔴 2026-07-14 接线：搜索页原本是 8 条写死的假热搜（「八字入门教程 12.8万」…），
   *    而后端按真实词频聚合（无数据时回退后台 search_hot_words 配置）。
   *    历史更荒唐：saveHistory 一直在往后端写，但前端从来不读 —— 写进去的永远看不见。
   */
  async getHot(limit = 10): Promise<HotSearchItem[]> {
    const rows = await apiGet<RawHotItem[]>(`/search/hot?limit=${limit}`)
    const list = Array.isArray(rows) ? rows : []
    return list.map((r, i) => ({
      keyword: r.keyword,
      count: formatSearchCount(r.count ?? r._count?.keyword ?? 0),
      hot: i < 3, // 前三名标「热」，与原型一致（不再写死）
    }))
  },

  /**
   * 我的搜索历史 — GET /search/history（未登录返回空数组，不报错）
   * 后端 SearchHistory 每搜一次存一行（这是热搜词频的数据源，本就该保留每一次），
   * 但展示要按词去重 —— 否则同一个词搜 16 次，历史栏就铺 16 个「八字」（真机走查实测）。
   * 按时间倒序取首次出现，保留"最近搜的在最前"。
   */
  async getHistory(limit = 10): Promise<string[]> {
    try {
      const rows = await apiGet<Array<{ keyword?: string }>>('/search/history')
      const seen = new Set<string>()
      const out: string[] = []
      for (const r of Array.isArray(rows) ? rows : []) {
        const k = (r?.keyword || '').trim()
        if (!k || seen.has(k)) continue
        seen.add(k)
        out.push(k)
        if (out.length >= limit) break
      }
      return out
    } catch {
      return [] // 未登录/失败 → 不展示历史，不打扰
    }
  },

  /** 清空搜索历史 — DELETE /search/history */
  async clearHistory(): Promise<void> {
    await apiDelete('/search/history')
  },

  /** 搜索建议（猜你想搜）— GET /search/suggest?q= */
  async getSuggestions(q: string, limit = 6): Promise<string[]> {
    try {
      const rows = await apiGet<Array<string | { keyword?: string }>>(
        `/search/suggest?q=${encodeURIComponent(q)}&limit=${limit}`,
      )
      return (Array.isArray(rows) ? rows : [])
        .map((r) => (typeof r === 'string' ? r : r?.keyword || ''))
        .filter(Boolean)
    } catch {
      return []
    }
  },
}

/** 后端热搜原始行：真实词频聚合走 _count.keyword，回退配置走 count */
interface RawHotItem {
  keyword: string
  count?: number
  _count?: { keyword?: number }
}

export interface HotSearchItem {
  keyword: string
  count: string
  hot: boolean
}

/** 搜索次数展示：1.2万 / 3560 —— 原型里的「12.8万」是写死的，这里按真实值格式化 */
function formatSearchCount(n: number): string {
  if (!n || n < 0) return '0'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return String(n)
}
