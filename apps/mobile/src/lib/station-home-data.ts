// 分站首页数据层 — 真连「分站品牌+模板」(getBrandWithTemplate) + 复用平台真实内容流(discover)
// 分站不生产内容，是平台内容的「品牌化入口」：品牌/模板由站长配置，内容来自平台真实推荐流。

import { apiGet } from '@/utils/request'
import { discoverApi, type FeedItem } from '@/lib/discover-data'

// 分站模板（对齐后端 STATION_TEMPLATES + 站长个性化 templateConfig 合并结果）
export interface StationTemplate {
  templateId: string
  name: string
  desc: string
  hero: string | null
  tabs: string[]
  modules: string[]
  showSections: string[]
}

// 分站品牌+模板（getBrandWithTemplate 返回结构）
export interface StationBrandFull {
  id: string
  code: string
  name: string
  logo: string
  intro: string
  themeColor: string
  template: StationTemplate
}

// 特色入口（由模板 modules 派生，跳转平台真实频道）
export interface StationFeature {
  key: string
  icon: string
  name: string
  path: string
  color: string
}

// 分站精选内容卡片（把平台 discover 的多态 FeedItem 拍平为统一卡片）
export interface StationFeedCard {
  id: string | number
  type: string // course/product/live/agent/classic/video
  title: string
  cover: string
  author: string
  price?: number
  isLive?: boolean
  viewers?: number
  likes?: number
}

// 已发布微页面（用户侧渲染）
export interface MicroPageComponentView {
  id: string
  type: string
  title?: string
  config: Record<string, any>
  sortOrder: number
}
export interface MicroPageView {
  id: string
  name: string
  status: string
  components: MicroPageComponentView[]
}

/** discover 多态 FeedItem（{kind,data}）→ 扁平 StationFeedCard */
function adaptFeed(items: FeedItem[]): StationFeedCard[] {
  return items.map((it) => {
    const d = it.data as any
    switch (it.kind) {
      case 'product': return { id: d.id, type: 'product', title: d.title || '', cover: d.cover || '', author: '', price: d.price, viewers: d.sales }
      case 'course': return { id: d.id, type: 'course', title: d.title || '', cover: d.cover || '', author: d.teacher || '', price: d.price, viewers: d.students }
      case 'live': return { id: d.id, type: 'live', title: d.title || '', cover: d.cover || '', author: d.host || '', isLive: d.status === 'live', viewers: d.viewers }
      case 'agent': return { id: d.id, type: 'agent', title: d.name || '', cover: d.avatar || '', author: '', viewers: d.useCount }
      case 'classic': return { id: d.id, type: 'classic', title: d.title || '', cover: d.cover || '', author: d.author || '', viewers: d.readers }
      case 'video': return { id: d.id, type: 'video', title: d.title || '', cover: d.cover || '', author: d.author || '', viewers: d.plays, likes: d.likes }
      default: return { id: '', type: 'content', title: '', cover: '', author: '' }
    }
  })
}

// 模块 → 平台频道入口映射（path 均为 pages.json 真实路径，确保可跳转）
const MODULE_ENTRY: Record<string, Omit<StationFeature, 'key'>> = {
  article: { icon: 'file-text', name: '文章', path: '/pages/discover/index', color: '#C41E3A' },
  course: { icon: 'book-open', name: '课程', path: '/pkg-course/courses-list/index', color: '#C41E3A' },
  circle: { icon: 'users', name: '圈子', path: '/pages/circles/index', color: '#C9A96E' },
  product: { icon: 'shopping-bag', name: '商城', path: '/pkg-mall/home/index', color: '#6366F1' },
  video: { icon: 'play-circle', name: '视频', path: '/pkg-video/list/index', color: '#0EA5E9' },
  live: { icon: 'radio', name: '直播', path: '/pkg-live/plaza/index', color: '#10B981' },
  paipan: { icon: 'compass', name: '排盘', path: '/pages/paipan/index', color: '#F59E0B' },
  marketing: { icon: 'gift', name: '活动', path: '/pages/discover/index', color: '#EC4899' },
}

/** 按模板 modules 派生分站特色入口（纯函数·跳转平台真实频道） */
export function deriveFeatures(modules: string[]): StationFeature[] {
  return (modules || []).filter((m) => MODULE_ENTRY[m]).map((m) => ({ key: m, ...MODULE_ENTRY[m] }))
}

/** 楼层显隐：模板 showSections 是否包含某区块（未配置时默认全显示） */
export function sectionVisible(tpl: StationTemplate | undefined, section: string): boolean {
  if (!tpl || !Array.isArray(tpl.showSections) || tpl.showSections.length === 0) return true
  return tpl.showSections.includes(section)
}

export function feedTypeLabel(type: string): string {
  const labels: Record<string, string> = { article: '文章', video: '视频', course: '课程', live: '直播', product: '商品', post: '动态' }
  return labels[type] || '内容'
}
export function feedTypeIcon(type: string): string {
  const icons: Record<string, string> = { article: 'file-text', video: 'play', course: 'book-open', live: 'radio', product: 'shopping-bag', post: 'message-square' }
  return icons[type] || 'file-text'
}
export function formatStatNumber(num: number): string {
  const n = Number(num) || 0
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

// ===== stationHomeApi — 分站首页数据 API 层（全真连） =====
export const stationHomeApi = {
  /** 分站品牌+模板 — GET /station/brand/:code/template（含缓存·千人千面渲染入口） */
  async getBrand(code: string): Promise<StationBrandFull> {
    const r = await apiGet<any>(`/station/brand/${encodeURIComponent(code)}/template`)
    const t = r?.template || {}
    return {
      id: r.id,
      code: r.code,
      name: r.name || '',
      logo: r.logo || '',
      intro: r.intro || '',
      themeColor: r.themeColor || '#C41E3A',
      template: {
        templateId: t.templateId || t.id || 'default',
        name: t.name || '',
        desc: t.desc || '',
        hero: t.hero ?? null,
        tabs: Array.isArray(t.tabs) ? t.tabs : [],
        modules: Array.isArray(t.modules) ? t.modules : [],
        showSections: Array.isArray(t.showSections) ? t.showSections : [],
      },
    }
  },
  /** 当前登录站长自己的分站码（无 code 参数时用于站长预览自己的分站） */
  async getMyStationCode(): Promise<string> {
    const s = await apiGet<any>('/station/my')
    return s?.code || ''
  },
  /** 分站精选内容流 — 复用平台真实推荐流（分站是平台内容的品牌化入口），拍平为统一卡片 */
  async getFeed(): Promise<StationFeedCard[]> {
    const items = await discoverApi.getRecommendations()
    return adaptFeed(items)
  },
  /** 分站已发布微页面 — GET /station/brand/:code/micro-page（无已发布页返回 null → 回退模板默认楼层） */
  async getMicroPage(code: string): Promise<MicroPageView | null> {
    const r = await apiGet<any>(`/station/brand/${encodeURIComponent(code)}/micro-page`)
    if (!r || !r.id) return null
    const components: MicroPageComponentView[] = Array.isArray(r.components) ? r.components : []
    return {
      id: r.id,
      name: r.name || '',
      status: r.status || 'PUBLISHED',
      components: [...components].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    }
  },
}
