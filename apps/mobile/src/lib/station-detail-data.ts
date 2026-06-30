// 分站版首页配置 —— 真连后端 station 模块
// 主题色默认沿用演示分站紫色 #8B5CF6（仅作后端无 themeColor 时的兜底）

import { apiGet } from '@/utils/request'

export interface StationFeaturedItem {
  id: string
  type: 'article' | 'course' | 'circle'
  title: string
  cover?: string
  recommendation?: string
  price?: number
  originalPrice?: number
}

export interface StationConfig {
  id: string
  name: string
  logo?: string
  themeColor: string
  heroImages: string[]
  masterName: string
  masterAvatar?: string
  masterIntro?: string
  /** 后端 GET /station/my 返回 lockedUsers；无对应字段时为 undefined（页面 v-if 降级） */
  memberCount?: number
  /** 后端无内容计数字段 → undefined（页面 v-if 降级） */
  contentCount?: number
  createdAt: string
  expiresAt: string
  /** 后端无"站长精选"端点 → 始终为空数组（页面 v-if 隐藏该模块） */
  featured: StationFeaturedItem[]
}

// 站长精选条目类型的图标/文案映射 —— 纯前端 UI 常量（后端无对应端点，诚实降级保留为静态配置）
export const featuredTypeConfig: Record<StationFeaturedItem['type'], { icon: string; label: string }> = {
  article: { icon: 'file-text', label: '文章' },
  course: { icon: 'book-open', label: '课程' },
  circle: { icon: 'users', label: '圈子' },
}

// Hero 轮播兜底图（后端 Station 无 heroImages 字段，用既有 banner 素材保证轮播组件可渲染）
const DEFAULT_HERO = '/static/images/banners/banner-1.png'

function toYmd(d?: string | null): string {
  return d ? String(d).slice(0, 10) : ''
}

/** 将后端 station 记录映射为分站首页配置 */
function mapStation(s: any): StationConfig {
  const heroImages: string[] = Array.isArray(s.heroImages) && s.heroImages.length
    ? s.heroImages
    : [DEFAULT_HERO]
  const memberCount = s.lockedUsers != null ? Number(s.lockedUsers) : undefined
  return {
    id: s.id,
    name: s.name || '',
    logo: s.logo || '',
    themeColor: s.themeColor || '#8B5CF6',
    heroImages,
    masterName: s.user?.nickname || s.name || '',
    masterAvatar: s.user?.avatar || '',
    masterIntro: s.intro || '',
    memberCount: Number.isFinite(memberCount as number) ? memberCount : undefined,
    contentCount: undefined, // 后端无内容计数 → 降级
    createdAt: toYmd(s.createdAt),
    expiresAt: toYmd(s.expireAt),
    featured: [], // 后端无站长精选端点 → 降级为空
  }
}

// ===== stationDetailApi — 分站详情页数据 API 层 =====
export const stationDetailApi = {
  /**
   * 获取分站首页配置。
   * - 传 stationId：GET /station/:id（公开分站详情，含 user{nickname}）
   * - 不传：GET /station/my（当前登录站长自己的分站，含 user.avatar、lockedUsers；未开通抛 404 → 走错误/空态）
   */
  async getStationConfig(stationId?: string): Promise<StationConfig> {
    const path = stationId ? `/station/${stationId}` : '/station/my'
    const s = await apiGet<any>(path)
    return mapStation(s)
  },

  /**
   * 站长精选条目类型 → 图标/文案映射。
   * 后端无对应端点，这是纯前端展示常量，诚实降级为同步静态配置。
   */
  async getFeaturedTypeConfig() {
    return featuredTypeConfig
  },
}
