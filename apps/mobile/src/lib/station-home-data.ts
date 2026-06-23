// 分站首页数据（对齐原型 lib/api/station-home mock；图片复用项目既有素材）

import { apiGet, useMock } from '@/utils/request'

export interface StationBrand {
  id: number
  code: string
  name: string
  logo: string
  slogan: string
  theme: { primaryColor: string; secondaryColor: string; headerStyle: 'dark' | 'light' }
  master: { id: number; nickname: string; avatar: string; title: string }
}

export interface StationBanner {
  id: number
  image: string
  title: string
  link: string
}

export interface StationFeature {
  id: number
  icon: string
  name: string
  link: string
  color: string
  badge?: string
}

export interface StationRecommend {
  id: number
  type: 'course' | 'circle' | 'live'
  title: string
  cover: string
  price?: number
  originalPrice?: number
  tag?: string
}

export interface StationFeedItem {
  id: number
  type: 'article' | 'video' | 'course' | 'live' | 'product'
  title: string
  cover: string
  author: { id: number; nickname: string; avatar: string }
  stats: { views: number; likes: number; comments: number }
  createdAt: string
  isLive?: boolean
  price?: number
}

export const stationBrand: StationBrand = {
  id: 1,
  code: 'guoxue001',
  name: '明德国学馆',
  logo: '/static/experts/expert-1.jpg',
  slogan: '传承经典·启迪智慧',
  theme: { primaryColor: '#C41E3A', secondaryColor: '#C9A96E', headerStyle: 'dark' },
  master: { id: 101, nickname: '明德先生', avatar: '/static/experts/expert-1.jpg', title: '国学传承人' },
}

export const stationBanners: StationBanner[] = [
  { id: 1, image: '/static/images/banners/banner-1.png', title: '春季国学研修班火热招生', link: '/courses/1' },
  { id: 2, image: '/static/images/banners/banner-2.png', title: '名师直播·每周三晚8点', link: '/live/list' },
  { id: 3, image: '/static/images/banners/banner-3.png', title: '新人专享·首单立减50元', link: '/activity/new-user' },
]

export const stationFeatures: StationFeature[] = [
  { id: 1, icon: 'book-open', name: '精品课程', link: '/courses', color: '#C41E3A' },
  { id: 2, icon: 'users', name: '国学圈子', link: '/circles', color: '#C9A96E', badge: '热' },
  { id: 3, icon: 'video', name: '直播讲堂', link: '/live/list', color: '#10B981' },
  { id: 4, icon: 'shopping-bag', name: '文创商城', link: '/shop', color: '#6366F1' },
  { id: 5, icon: 'compass', name: '每日运势', link: '/paipan', color: '#F59E0B' },
]

export const stationRecommends: StationRecommend[] = [
  { id: 1, type: 'course', title: '八字命理入门到精通', cover: '/static/images/feed/course-1.jpg', price: 199, originalPrice: 399, tag: '站长推荐' },
  { id: 2, type: 'course', title: '易经智慧与人生决策', cover: '/static/images/feed/course-2.jpg', price: 299, tag: '热门' },
  { id: 3, type: 'circle', title: '风水研习社', cover: '/static/images/feed/circle-1.jpg', tag: '官方' },
  { id: 4, type: 'live', title: '周易六爻预测实战', cover: '/static/images/feed/live-1.jpg', price: 0, tag: '免费' },
]

export const stationFeedList: StationFeedItem[] = [
  { id: 1, type: 'article', title: '八字看婚姻：什么样的八字容易遇到良缘？', cover: '/static/images/feed/article-1.jpg', author: { id: 101, nickname: '明德先生', avatar: '/static/experts/expert-1.jpg' }, stats: { views: 3280, likes: 156, comments: 42 }, createdAt: '2026-06-03' },
  { id: 2, type: 'video', title: '三分钟学会看手相基础', cover: '/static/images/feed/video-1.jpg', author: { id: 102, nickname: '玄易居士', avatar: '/static/experts/expert-2.jpg' }, stats: { views: 8920, likes: 423, comments: 87 }, createdAt: '2026-06-02' },
  { id: 3, type: 'live', title: '今晚8点：如何通过风水改善财运', cover: '/static/images/feed/live-2.jpg', author: { id: 103, nickname: '风水大师张', avatar: '/static/experts/expert-1.jpg' }, stats: { views: 1560, likes: 89, comments: 23 }, createdAt: '2026-06-03', isLive: true },
  { id: 4, type: 'course', title: '紫微斗数从零开始', cover: '/static/images/feed/course-3.jpg', author: { id: 104, nickname: '紫微学堂', avatar: '/static/experts/expert-2.jpg' }, stats: { views: 4560, likes: 234, comments: 56 }, createdAt: '2026-06-01', price: 299 },
  { id: 5, type: 'product', title: '开光铜钱六帝钱挂件', cover: '/static/images/feed/product-1.jpg', author: { id: 105, nickname: '文创小铺', avatar: '/static/experts/expert-1.jpg' }, stats: { views: 2340, likes: 89, comments: 12 }, createdAt: '2026-06-02', price: 68 },
]

export const stationPosterImage = '/static/images/station/share-poster.png'

export function feedTypeLabel(type: StationFeedItem['type']): string {
  const labels: Record<StationFeedItem['type'], string> = {
    article: '文章', video: '视频', course: '课程', live: '直播', product: '商品',
  }
  return labels[type] || '内容'
}

export function feedTypeIcon(type: StationFeedItem['type']): string {
  const icons: Record<StationFeedItem['type'], string> = {
    article: 'file-text', video: 'play', course: 'book-open', live: 'radio', product: 'shopping-bag',
  }
  return icons[type] || 'file-text'
}

export function formatStatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

// ===== stationHomeApi — 分站首页数据 API 层 =====
export const stationHomeApi = {
  async getStationBrand() {
    if (useMock()) return stationBrand
    try { return await apiGet<any>('/station/home/brand') }
    catch { return stationBrand }
  },
  async getBanners() {
    if (useMock()) return stationBanners
    try { return await apiGet<any>('/station/home/banners') }
    catch { return stationBanners }
  },
  async getFeatures() {
    if (useMock()) return stationFeatures
    try { return await apiGet<any>('/station/home/features') }
    catch { return stationFeatures }
  },
  async getRecommends() {
    if (useMock()) return stationRecommends
    try { return await apiGet<any>('/station/home/recommends') }
    catch { return stationRecommends }
  },
  async getFeedList() {
    if (useMock()) return stationFeedList
    try { return await apiGet<any>('/station/home/feed') }
    catch { return stationFeedList }
  },
  async getPosterImage() {
    if (useMock()) return stationPosterImage
    try { return await apiGet<any>('/station/home/poster') }
    catch { return stationPosterImage }
  },
}
