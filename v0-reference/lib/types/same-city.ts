// ========== 同城发现相关类型 ==========

// 内容类型
export type SameCityContentType = 'activity' | 'course' | 'circle' | 'station' | 'article' | 'video'

// 定位信息
export interface Location {
  latitude: number
  longitude: number
  city: string
  district?: string
  address?: string
}

// 城市信息
export interface City {
  code: string
  name: string
  pinyin: string
  firstLetter: string
  isHot?: boolean
}

// 同城内容项
export interface SameCityItem {
  id: number
  type: SameCityContentType
  // 基本信息
  title: string
  cover: string
  description?: string
  // 发布者
  author?: {
    id: number
    name: string
    avatar: string
  }
  // 位置
  location: {
    name: string
    address: string
    latitude: number
    longitude: number
    distance?: number  // 距离（米）
  }
  // 时间（活动/课程）
  startTime?: string
  endTime?: string
  // 价格
  price?: number
  isFree?: boolean
  // 统计
  viewCount?: number
  likeCount?: number
  commentCount?: number
  participantCount?: number
  // 标签
  tags?: string[]
  // 状态
  status?: string
  // 创建时间
  createdAt: string
}

// 同城Feed响应
export interface SameCityFeedResponse {
  list: SameCityItem[]
  total: number
  hasMore: boolean
}

// 热门城市
export interface HotCity {
  code: string
  name: string
  count: number  // 内容数量
}

// 附近推荐
export interface NearbyRecommend {
  type: SameCityContentType
  count: number
  items: SameCityItem[]
}

// ========== 附近的人相关 ==========

// 用户类型
export type NearbyUserType = 'enthusiast' | 'teacher' | 'inheritor'

// 附近用户
export interface NearbyUser {
  id: number
  name: string
  avatar: string
  // 用户类型
  type: NearbyUserType
  // 认证信息
  verified?: boolean
  verifiedTitle?: string
  // 简介
  bio?: string
  // 兴趣标签
  interests: string[]
  // 共同兴趣
  commonInterests?: string[]
  // 距离（米）
  distance?: number
  // 是否显示精确距离
  showExactDistance?: boolean
  // 统计
  followerCount: number
  postCount: number
  // 关系
  isFollowing: boolean
  isMutual: boolean
  // 最后活跃
  lastActiveAt?: string
  // 是否在线
  isOnline?: boolean
}

// 附近用户列表响应
export interface NearbyUserListResponse {
  list: NearbyUser[]
  total: number
  hasMore: boolean
}

// 用户隐私设置
export interface LocationPrivacySetting {
  // 是否对附近可见
  visibleToNearby: boolean
  // 显示距离精度（模糊/精确）
  distancePrecision: 'fuzzy' | 'exact'
  // 可见范围（km）
  visibleRange: number
}
