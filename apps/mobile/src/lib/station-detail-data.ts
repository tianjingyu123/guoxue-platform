// 分站版首页配置（对齐原型 components/station/station-context defaultStationConfig）
// 主题色忠实保留原型演示分站的紫色 #8B5CF6；图片复用项目既有素材

import { apiGet, useMock } from '@/utils/request'

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
  memberCount: number
  contentCount: number
  createdAt: string
  expiresAt: string
  featured: StationFeaturedItem[]
}

export const defaultStationConfig: StationConfig = {
  id: 'station-demo',
  name: '青云国学小站',
  logo: '',
  themeColor: '#8B5CF6',
  heroImages: ['/static/images/banners/banner-1.png'],
  masterName: '青云道长',
  masterAvatar: '/static/experts/expert-2.jpg',
  masterIntro: '从事国学研究20余年，专注八字命理与风水堪舆，愿以所学助有缘人趋吉避凶。',
  memberCount: 3680,
  contentCount: 156,
  createdAt: '2024-01-15',
  expiresAt: '2025-01-15',
  featured: [
    { id: 'f1', type: 'course', title: '八字入门实战课', cover: '/static/images/feed/course-1.jpg', recommendation: '这门课是我亲自筛选的，非常适合零基础的朋友入门学习', price: 199, originalPrice: 399 },
    { id: 'f2', type: 'circle', title: '八字命理研习社', cover: '/static/images/feed/circle-1.jpg', recommendation: '我自己也在这个圈子里，圈主讲解非常专业', price: 99 },
    { id: 'f3', type: 'article', title: '2024甲辰年运势全解析', cover: '/static/images/feed/article-1.jpg', recommendation: '今年必读的一篇文章，讲得很透彻' },
  ],
}

export const featuredTypeConfig: Record<StationFeaturedItem['type'], { icon: string; label: string }> = {
  article: { icon: 'file-text', label: '文章' },
  course: { icon: 'book-open', label: '课程' },
  circle: { icon: 'users', label: '圈子' },
}

// ===== stationDetailApi — 分站详情页数据 API 层 =====
export const stationDetailApi = {
  async getStationConfig(stationId?: string) {
    if (true) return defaultStationConfig
    const path = stationId ? `/station/${stationId}/config` : '/station/config'
    try { return await apiGet<any>(path) }
    catch { return defaultStationConfig }
  },
  async getFeaturedTypeConfig() {
    if (true) return featuredTypeConfig
    try { return await apiGet<any>('/station/featured-type-config') }
    catch { return featuredTypeConfig }
  },
}
