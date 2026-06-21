import { apiGet, useMock } from '@/utils/request'

export interface StationFeedItem {
  id: number
  type: string
  cover: string
  title: string
  isLive?: boolean
  price?: number
  author: { avatar: string; nickname: string }
  stats: { views: number; likes: number }
}

export const stationBrand = {
  name: '易道书院',
  logo: '/static/images/brand/logo.png',
  theme: { primaryColor: '#C41E3A', headerStyle: 'dark' as 'dark' | 'light' },
  master: { avatar: '/static/images/avatar/master.png' },
}

export const stationBanners: { id: number; image: string }[] = [
  { id: 1, image: '/static/images/brand/banner1.png' },
  { id: 2, image: '/static/images/brand/banner2.png' },
  { id: 3, image: '/static/images/brand/banner3.png' },
]

export const stationFeatures: { id: number; icon: string; color: string; name: string; badge?: string }[] = [
  { id: 1, icon: 'book-open', color: '#C41E3A', name: '课程推广' },
  { id: 2, icon: 'users', color: '#2563EB', name: '邀请有礼' },
  { id: 3, icon: 'image', color: '#D97706', name: '海报素材', badge: 'NEW' },
  { id: 4, icon: 'trending-up', color: '#16A34A', name: '收益排行' },
  { id: 5, icon: 'gift', color: '#E74C3C', name: '活动奖励' },
  { id: 6, icon: 'settings', color: '#6B7280', name: '分站设置' },
  { id: 7, icon: 'help-circle', color: '#8B5CF6', name: '推广指南' },
  { id: 8, icon: 'message-circle', color: '#EC4899', name: '专属客服' },
]

export const stationRecommends: { id: number; cover: string; title: string; tag?: string; price?: number; originalPrice?: number }[] = [
  { id: 1, cover: '/static/images/brand/course1.png', title: '八字命理入门', tag: '热销', price: 99, originalPrice: 199 },
  { id: 2, cover: '/static/images/brand/course2.png', title: '风水实战指南', price: 128, originalPrice: 258 },
  { id: 3, cover: '/static/images/brand/course3.png', title: '紫微斗数精讲', tag: '新课', price: 168 },
]

export const stationFeedList: StationFeedItem[] = [
  { id: 1, type: 'course', cover: '/static/images/brand/course1.png', title: '周易六十四卦详解', author: { avatar: '/static/images/avatar/u1.png', nickname: '周易大师' }, stats: { views: 1280, likes: 256 } },
  { id: 2, type: 'article', cover: '/static/images/brand/article1.png', title: '命理学的现代应用', author: { avatar: '/static/images/avatar/u2.png', nickname: '命理研究者' }, stats: { views: 890, likes: 128 } },
  { id: 3, type: 'live', cover: '/static/images/brand/live1.png', title: '每日运势解读直播', isLive: true, author: { avatar: '/static/images/avatar/u3.png', nickname: '运势主播' }, stats: { views: 3200, likes: 560 } },
  { id: 4, type: 'product', cover: '/static/images/brand/product1.png', title: '开光风水罗盘', price: 298, author: { avatar: '/static/images/avatar/u4.png', nickname: '法器专营' }, stats: { views: 650, likes: 89 } },
]

export const stationPosterImage = '/static/images/brand/share-poster.png'

export function feedTypeLabel(type: string): string {
  const map: Record<string, string> = { course: '课程', article: '文章', live: '直播', product: '商品' }
  return map[type] || type
}

export function feedTypeIcon(type: string): string {
  const map: Record<string, string> = { course: 'book-open', article: 'file-text', live: 'radio', product: 'shopping-bag' }
  return map[type] || 'file-text'
}

export function formatStatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toString()
}

// ============================================
// API 层
// ============================================
export const stationHomeApi = {
  async home() {
    if (useMock()) return { brand: stationBrand, banners: stationBanners, features: stationFeatures, recommends: stationRecommends, feedList: stationFeedList, posterImage: stationPosterImage }
    try {
      const data = await apiGet<any>('/station/home')
      return { brand: data.brand || stationBrand, banners: data.banners || stationBanners, features: data.features || stationFeatures, recommends: data.recommends || stationRecommends, feedList: data.feedList || stationFeedList, posterImage: data.posterImage || stationPosterImage }
    } catch { return { brand: stationBrand, banners: stationBanners, features: stationFeatures, recommends: stationRecommends, feedList: stationFeedList, posterImage: stationPosterImage } }
  },
}
