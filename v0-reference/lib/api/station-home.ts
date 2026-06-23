// 分站首页相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  StationBrand, 
  StationHomeData, 
  StationFeedItem,
  StationPosterData 
} from '../types/station-home'

// ========== Mock 数据 ==========

const mockStationBrand: StationBrand = {
  id: 1,
  code: 'guoxue001',
  name: '明德国学馆',
  logo: '/placeholder.svg?height=48&width=48',
  slogan: '传承经典·启迪智慧',
  theme: {
    primaryColor: '#C41E3A',
    secondaryColor: '#C9A96E',
    headerStyle: 'dark',
  },
  contact: {
    phone: '400-123-4567',
    wechat: 'mingde_guoxue',
  },
  master: {
    id: 101,
    nickname: '明德先生',
    avatar: '/placeholder.svg?height=64&width=64',
    title: '国学传承人',
  },
}

const mockBanners = [
  { id: 1, image: '/placeholder.svg?height=180&width=375', title: '春季国学研修班火热招生', link: '/courses/1', linkType: 'internal' as const },
  { id: 2, image: '/placeholder.svg?height=180&width=375', title: '名师直播·每周三晚8点', link: '/live/list', linkType: 'internal' as const },
  { id: 3, image: '/placeholder.svg?height=180&width=375', title: '新人专享·首单立减50元', link: '/activity/new-user', linkType: 'internal' as const },
]

const mockFeatures = [
  { id: 1, icon: 'BookOpen', name: '精品课程', link: '/courses', color: '#C41E3A' },
  { id: 2, icon: 'Users', name: '国学圈子', link: '/circles', color: '#C9A96E', badge: '热' },
  { id: 3, icon: 'Video', name: '直播讲堂', link: '/live/list', color: '#10B981' },
  { id: 4, icon: 'ShoppingBag', name: '文创商城', link: '/shop', color: '#6366F1' },
  { id: 5, icon: 'Compass', name: '每日运势', link: '/paipan', color: '#F59E0B' },
]

const mockRecommends = [
  { id: 1, type: 'course' as const, title: '八字命理入门到精通', cover: '/placeholder.svg?height=120&width=200', price: 199, originalPrice: 399, tag: '站长推荐', stats: { sales: 1280, rating: 4.9 } },
  { id: 2, type: 'course' as const, title: '易经智慧与人生决策', cover: '/placeholder.svg?height=120&width=200', price: 299, tag: '热门', stats: { sales: 860, rating: 4.8 } },
  { id: 3, type: 'circle' as const, title: '风水研习社', cover: '/placeholder.svg?height=120&width=200', tag: '官方', stats: { views: 12500 } },
  { id: 4, type: 'live' as const, title: '周易六爻预测实战', cover: '/placeholder.svg?height=120&width=200', price: 0, tag: '免费', stats: { views: 3200 } },
]

const mockFeedList: StationFeedItem[] = [
  {
    id: 1,
    type: 'article',
    title: '八字看婚姻：什么样的八字容易遇到良缘？',
    cover: '/placeholder.svg?height=100&width=150',
    summary: '婚姻是人生大事，八字命理中有许多关于婚姻的论断...',
    author: { id: 101, nickname: '明德先生', avatar: '/placeholder.svg?height=32&width=32' },
    stats: { views: 3280, likes: 156, comments: 42 },
    createdAt: '2026-06-03',
  },
  {
    id: 2,
    type: 'video',
    title: '三分钟学会看手相基础',
    cover: '/placeholder.svg?height=100&width=150',
    author: { id: 102, nickname: '玄易居士', avatar: '/placeholder.svg?height=32&width=32' },
    stats: { views: 8920, likes: 423, comments: 87 },
    createdAt: '2026-06-02',
  },
  {
    id: 3,
    type: 'live',
    title: '今晚8点：如何通过风水改善财运',
    cover: '/placeholder.svg?height=100&width=150',
    author: { id: 103, nickname: '风水大师张', avatar: '/placeholder.svg?height=32&width=32' },
    stats: { views: 1560, likes: 89, comments: 23 },
    createdAt: '2026-06-03',
    isLive: true,
    liveStartTime: '20:00',
  },
  {
    id: 4,
    type: 'course',
    title: '紫微斗数从零开始',
    cover: '/placeholder.svg?height=100&width=150',
    author: { id: 104, nickname: '紫微学堂', avatar: '/placeholder.svg?height=32&width=32' },
    stats: { views: 4560, likes: 234, comments: 56 },
    createdAt: '2026-06-01',
    price: 299,
  },
  {
    id: 5,
    type: 'product',
    title: '开光铜钱六帝钱挂件',
    cover: '/placeholder.svg?height=100&width=150',
    author: { id: 105, nickname: '文创小铺', avatar: '/placeholder.svg?height=32&width=32' },
    stats: { views: 2340, likes: 89, comments: 12 },
    createdAt: '2026-06-02',
    price: 68,
  },
]

/**
 * 获取分站首页数据
 */
export async function getStationHomeData(stationCode: string): Promise<ApiResponse<StationHomeData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        brand: mockStationBrand,
        banners: mockBanners,
        features: mockFeatures,
        recommends: mockRecommends,
        feedList: mockFeedList,
        hasMoreFeed: true,
      },
      message: 'success',
    }
  }
  return apiGet<StationHomeData>(`/station/${stationCode}/home`)
}

/**
 * 获取分站品牌信息
 */
export async function getStationBrand(stationCode: string): Promise<ApiResponse<StationBrand>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: mockStationBrand, message: 'success' }
  }
  return apiGet<StationBrand>(`/station/${stationCode}/brand`)
}

/**
 * 加载更多Feed内容
 */
export async function getStationFeed(
  stationCode: string, 
  page: number = 1, 
  pageSize: number = 10
): Promise<ApiResponse<{ list: StationFeedItem[]; hasMore: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    // 模拟分页
    const hasMore = page < 3
    return {
      code: 200,
      data: {
        list: mockFeedList.map(item => ({ ...item, id: item.id + (page - 1) * 10 })),
        hasMore,
      },
      message: 'success',
    }
  }
  return apiGet<{ list: StationFeedItem[]; hasMore: boolean }>(`/station/${stationCode}/feed`, { page, pageSize })
}

/**
 * 生成分站推广海报
 */
export async function generateStationPoster(stationCode: string): Promise<ApiResponse<StationPosterData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      code: 200,
      data: {
        posterUrl: '/placeholder.svg?height=600&width=375',
        qrcodeUrl: '/placeholder.svg?height=120&width=120',
        inviteCode: 'MINGDE2026',
      },
      message: 'success',
    }
  }
  return apiPost<StationPosterData>(`/station/${stationCode}/poster/generate`)
}

/**
 * 获取内容类型图标
 */
export function getFeedTypeIcon(type: StationFeedItem['type']): string {
  const icons: Record<StationFeedItem['type'], string> = {
    article: 'FileText',
    video: 'Play',
    course: 'BookOpen',
    live: 'Radio',
    product: 'ShoppingBag',
  }
  return icons[type] || 'FileText'
}

/**
 * 获取内容类型标签
 */
export function getFeedTypeLabel(type: StationFeedItem['type']): string {
  const labels: Record<StationFeedItem['type'], string> = {
    article: '文章',
    video: '视频',
    course: '课程',
    live: '直播',
    product: '商品',
  }
  return labels[type] || '内容'
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}
