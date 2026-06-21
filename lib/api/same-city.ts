import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  SameCityItem, 
  SameCityFeedResponse, 
  SameCityContentType,
  Location,
  City,
  HotCity,
  NearbyRecommend
} from '../types/same-city'

// Mock 同城数据
const mockFeedItems: SameCityItem[] = [
  {
    id: 1,
    type: 'activity',
    title: '周末国学读书会·《论语》精读',
    cover: '/placeholder.svg?height=200&width=300',
    description: '每周六下午，一起品读经典，感悟人生智慧。',
    author: { id: 1, name: '国学社', avatar: '/placeholder.svg' },
    location: {
      name: '热卜国学中心',
      address: '北京市朝阳区建国路88号',
      latitude: 39.9087,
      longitude: 116.4716,
      distance: 1200,
    },
    startTime: '2026-06-07 14:00',
    endTime: '2026-06-07 17:00',
    isFree: true,
    participantCount: 28,
    tags: ['读书会', '论语', '免费'],
    status: '报名中',
    createdAt: '2026-06-01 10:00',
  },
  {
    id: 2,
    type: 'course',
    title: '八字命理入门班·周末班',
    cover: '/placeholder.svg?height=200&width=300',
    description: '零基础入门，系统学习八字命理基础知识。',
    author: { id: 2, name: '李明德', avatar: '/placeholder.svg' },
    location: {
      name: '易学书院',
      address: '北京市海淀区中关村大街1号',
      latitude: 39.9842,
      longitude: 116.3074,
      distance: 3500,
    },
    startTime: '2026-06-15 09:00',
    endTime: '2026-06-15 17:00',
    price: 599,
    participantCount: 18,
    tags: ['八字', '入门', '周末'],
    status: '报名中',
    createdAt: '2026-06-02 09:00',
  },
  {
    id: 3,
    type: 'circle',
    title: '北京易学爱好者交流群',
    cover: '/placeholder.svg?height=200&width=300',
    description: '北京地区易学爱好者交流平台，分享学习心得，组织线下活动。',
    author: { id: 3, name: '易友会', avatar: '/placeholder.svg' },
    location: {
      name: '北京市',
      address: '北京市',
      latitude: 39.9042,
      longitude: 116.4074,
      distance: 0,
    },
    viewCount: 5680,
    likeCount: 328,
    participantCount: 1256,
    tags: ['交流', '同城', '活动'],
    createdAt: '2026-05-15 10:00',
  },
  {
    id: 4,
    type: 'station',
    title: '玄门工作室',
    cover: '/placeholder.svg?height=200&width=300',
    description: '专业命理咨询，一对一服务，预约制。',
    location: {
      name: '玄门工作室',
      address: '北京市西城区西单北大街100号',
      latitude: 39.9139,
      longitude: 116.3749,
      distance: 2800,
    },
    viewCount: 2350,
    tags: ['咨询', '预约'],
    createdAt: '2026-04-20 10:00',
  },
  {
    id: 5,
    type: 'article',
    title: '北京古观象台：600年的星象观测史',
    cover: '/placeholder.svg?height=200&width=300',
    description: '探访北京古观象台，了解明清两代的天文观测历史。',
    author: { id: 4, name: '文化行者', avatar: '/placeholder.svg' },
    location: {
      name: '古观象台',
      address: '北京市东城区东裱褙胡同2号',
      latitude: 39.9042,
      longitude: 116.4174,
      distance: 1500,
    },
    viewCount: 3280,
    likeCount: 256,
    commentCount: 45,
    tags: ['历史', '天文', '探访'],
    createdAt: '2026-05-28 14:00',
  },
  {
    id: 6,
    type: 'video',
    title: '实拍：北京白云观道士的一天',
    cover: '/placeholder.svg?height=200&width=300',
    description: '跟随镜头，了解道士的日常修行生活。',
    author: { id: 5, name: '道文化', avatar: '/placeholder.svg' },
    location: {
      name: '白云观',
      address: '北京市西城区白云观街9号',
      latitude: 39.8962,
      longitude: 116.3447,
      distance: 4200,
    },
    viewCount: 12560,
    likeCount: 1890,
    commentCount: 234,
    tags: ['道教', '白云观', '纪录'],
    createdAt: '2026-05-20 10:00',
  },
]

// Mock 热门城市
const mockHotCities: HotCity[] = [
  { code: 'beijing', name: '北京', count: 1256 },
  { code: 'shanghai', name: '上海', count: 986 },
  { code: 'guangzhou', name: '广州', count: 756 },
  { code: 'shenzhen', name: '深圳', count: 623 },
  { code: 'chengdu', name: '成都', count: 589 },
  { code: 'hangzhou', name: '杭州', count: 478 },
  { code: 'nanjing', name: '南京', count: 412 },
  { code: 'wuhan', name: '武汉', count: 356 },
]

// Mock 城市列表
const mockCities: City[] = [
  { code: 'beijing', name: '北京', pinyin: 'beijing', firstLetter: 'B', isHot: true },
  { code: 'shanghai', name: '上海', pinyin: 'shanghai', firstLetter: 'S', isHot: true },
  { code: 'guangzhou', name: '广州', pinyin: 'guangzhou', firstLetter: 'G', isHot: true },
  { code: 'shenzhen', name: '深圳', pinyin: 'shenzhen', firstLetter: 'S', isHot: true },
  { code: 'chengdu', name: '成都', pinyin: 'chengdu', firstLetter: 'C', isHot: true },
  { code: 'hangzhou', name: '杭州', pinyin: 'hangzhou', firstLetter: 'H', isHot: true },
  { code: 'nanjing', name: '南京', pinyin: 'nanjing', firstLetter: 'N' },
  { code: 'wuhan', name: '武汉', pinyin: 'wuhan', firstLetter: 'W' },
  { code: 'xian', name: '西安', pinyin: 'xian', firstLetter: 'X' },
  { code: 'chongqing', name: '重庆', pinyin: 'chongqing', firstLetter: 'C' },
  { code: 'tianjin', name: '天津', pinyin: 'tianjin', firstLetter: 'T' },
  { code: 'suzhou', name: '苏州', pinyin: 'suzhou', firstLetter: 'S' },
]

/**
 * 获取同城Feed
 */
export async function getSameCityFeed(params: {
  latitude?: number
  longitude?: number
  city?: string
  type?: SameCityContentType | 'all'
  radius?: number  // 搜索半径（米）
  page?: number
  pageSize?: number
}): Promise<ApiResponse<SameCityFeedResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockFeedItems]
    
    if (params.type && params.type !== 'all') {
      list = list.filter(item => item.type === params.type)
    }
    
    // 按距离排序
    if (params.latitude && params.longitude) {
      list.sort((a, b) => (a.location.distance || 0) - (b.location.distance || 0))
    }
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<SameCityFeedResponse>('/same-city/feed', params as Record<string, unknown>)
}

/**
 * 获取附近推荐
 */
export async function getNearbyRecommends(
  latitude: number,
  longitude: number
): Promise<ApiResponse<NearbyRecommend[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const recommends: NearbyRecommend[] = [
      { type: 'activity', count: 12, items: mockFeedItems.filter(i => i.type === 'activity').slice(0, 3) },
      { type: 'course', count: 8, items: mockFeedItems.filter(i => i.type === 'course').slice(0, 3) },
      { type: 'station', count: 5, items: mockFeedItems.filter(i => i.type === 'station').slice(0, 3) },
    ]
    return { code: 200, data: recommends, message: 'success' }
  }
  return apiGet<NearbyRecommend[]>('/same-city/nearby', { latitude, longitude })
}

/**
 * 获取热门城市
 */
export async function getHotCities(): Promise<ApiResponse<HotCity[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: mockHotCities, message: 'success' }
  }
  return apiGet<HotCity[]>('/same-city/hot-cities')
}

/**
 * 获取城市列表
 */
export async function getCityList(): Promise<ApiResponse<City[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: mockCities, message: 'success' }
  }
  return apiGet<City[]>('/same-city/cities')
}

/**
 * 搜索城市
 */
export async function searchCity(keyword: string): Promise<ApiResponse<City[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const results = mockCities.filter(c => 
      c.name.includes(keyword) || c.pinyin.toLowerCase().includes(keyword.toLowerCase())
    )
    return { code: 200, data: results, message: 'success' }
  }
  return apiGet<City[]>('/same-city/cities/search', { keyword })
}

/**
 * 获取内容类型标签
 */
export function getContentTypeLabel(type: SameCityContentType): string {
  const labels: Record<SameCityContentType, string> = {
    activity: '活动',
    course: '课程',
    circle: '圈子',
    station: '驿站',
    article: '文章',
    video: '视频',
  }
  return labels[type]
}

/**
 * 获取内容类型颜色
 */
export function getContentTypeColor(type: SameCityContentType): string {
  const colors: Record<SameCityContentType, string> = {
    activity: 'text-orange-600 bg-orange-50',
    course: 'text-blue-600 bg-blue-50',
    circle: 'text-purple-600 bg-purple-50',
    station: 'text-green-600 bg-green-50',
    article: 'text-gray-600 bg-gray-100',
    video: 'text-red-600 bg-red-50',
  }
  return colors[type]
}

/**
 * 格式化距离
 */
export function formatDistance(meters?: number): string {
  if (!meters) return ''
  if (meters < 100) return '100m内'
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * 生成导航链接
 */
export function getNavigationUrl(location: { latitude: number; longitude: number; name: string }): string {
  return `https://uri.amap.com/navigation?to=${location.longitude},${location.latitude},${encodeURIComponent(location.name)}&mode=car&coordinate=gaode`
}

// ========== 附近的人相关 API ==========

import type { 
  NearbyUser, 
  NearbyUserListResponse, 
  NearbyUserType,
  LocationPrivacySetting 
} from '../types/same-city'

// Mock 附近用户数据
const mockNearbyUsers: NearbyUser[] = [
  {
    id: 1,
    name: '玄学小白',
    avatar: '/placeholder.svg',
    type: 'enthusiast',
    bio: '刚入门八字命理，希望认识更多同好一起学习交流～',
    interests: ['八字', '紫微斗数', '风水'],
    commonInterests: ['八字', '紫微斗数'],
    distance: 800,
    showExactDistance: true,
    followerCount: 128,
    postCount: 23,
    isFollowing: false,
    isMutual: false,
    lastActiveAt: '10分钟前',
    isOnline: true,
  },
  {
    id: 2,
    name: '李明德',
    avatar: '/placeholder.svg',
    type: 'teacher',
    verified: true,
    verifiedTitle: '命理咨询师',
    bio: '从事命理研究20余年，擅长八字、紫微斗数，线下授课中',
    interests: ['八字', '紫微斗数', '六爻', '奇门遁甲'],
    commonInterests: ['八字'],
    distance: 1500,
    showExactDistance: false,
    followerCount: 3256,
    postCount: 156,
    isFollowing: true,
    isMutual: false,
    lastActiveAt: '1小时前',
    isOnline: false,
  },
  {
    id: 3,
    name: '王道长',
    avatar: '/placeholder.svg',
    type: 'inheritor',
    verified: true,
    verifiedTitle: '非遗传承人',
    bio: '道家文化传承人，专注道法与养生，定期举办公益讲座',
    interests: ['道家文化', '养生', '周易', '风水'],
    commonInterests: ['周易'],
    distance: 3200,
    showExactDistance: false,
    followerCount: 8923,
    postCount: 89,
    isFollowing: false,
    isMutual: false,
    lastActiveAt: '昨天',
    isOnline: false,
  },
  {
    id: 4,
    name: '易学爱好者',
    avatar: '/placeholder.svg',
    type: 'enthusiast',
    bio: '周易研究3年，喜欢和志同道合的朋友交流学习心得',
    interests: ['周易', '六爻', '梅花易数'],
    commonInterests: ['周易', '六爻'],
    distance: 500,
    showExactDistance: true,
    followerCount: 56,
    postCount: 12,
    isFollowing: false,
    isMutual: false,
    lastActiveAt: '刚刚',
    isOnline: true,
  },
  {
    id: 5,
    name: '赵老师',
    avatar: '/placeholder.svg',
    type: 'teacher',
    verified: true,
    verifiedTitle: '风水师',
    bio: '专业风水堪舆，家居布局、商业选址咨询，可上门服务',
    interests: ['风水', '堪舆', '家居布局'],
    commonInterests: ['风水'],
    distance: 2100,
    showExactDistance: false,
    followerCount: 1567,
    postCount: 78,
    isFollowing: true,
    isMutual: true,
    lastActiveAt: '3小时前',
    isOnline: false,
  },
]

export async function getNearbyUsers(params: {
  latitude: number
  longitude: number
  radius?: number  // 搜索半径（米）
  type?: NearbyUserType | 'all'
  page?: number
  pageSize?: number
}): Promise<ApiResponse<NearbyUserListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockNearbyUsers]
    
    if (params.type && params.type !== 'all') {
      list = list.filter(u => u.type === params.type)
    }
    
    // 按距离排序
    list.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    
    return {
      code: 200,
      data: { list, total: list.length, hasMore: false },
      message: 'success',
    }
  }
  return apiGet<NearbyUserListResponse>('/same-city/nearby-users', params as Record<string, unknown>)
}

export async function followUser(userId: number): Promise<ApiResponse<{ success: boolean; isFollowing: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true, isFollowing: true }, message: '关注成功' }
  }
  return apiPost<{ success: boolean; isFollowing: boolean }>(`/users/${userId}/follow`)
}

export async function unfollowUser(userId: number): Promise<ApiResponse<{ success: boolean; isFollowing: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true, isFollowing: false }, message: '已取消关注' }
  }
  return apiPost<{ success: boolean; isFollowing: boolean }>(`/users/${userId}/unfollow`)
}

export async function getLocationPrivacySetting(): Promise<ApiResponse<LocationPrivacySetting>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        visibleToNearby: true,
        distancePrecision: 'fuzzy',
        visibleRange: 5,
      },
      message: 'success',
    }
  }
  return apiGet<LocationPrivacySetting>('/users/privacy/location')
}

export async function updateLocationPrivacySetting(
  setting: Partial<LocationPrivacySetting>
): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '设置已更新' }
  }
  return apiPost<{ success: boolean }>('/users/privacy/location', setting)
}

export function getUserTypeLabel(type: NearbyUserType): string {
  const labels: Record<NearbyUserType, string> = {
    enthusiast: '爱好者',
    teacher: '老师',
    inheritor: '传承人',
  }
  return labels[type]
}

export function getUserTypeColor(type: NearbyUserType): string {
  const colors: Record<NearbyUserType, string> = {
    enthusiast: 'text-blue-600 bg-blue-50',
    teacher: 'text-primary bg-primary/10',
    inheritor: 'text-purple-600 bg-purple-50',
  }
  return colors[type]
}

export function formatUserDistance(meters?: number, showExact: boolean = true): string {
  if (!meters) return ''
  if (!showExact || meters < 1000) return '附近'
  return `约${(meters / 1000).toFixed(1)}km`
}
