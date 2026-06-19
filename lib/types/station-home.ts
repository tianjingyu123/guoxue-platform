// 分站相关类型定义（扩展）

// 分站品牌信息
export interface StationBrand {
  id: number
  code: string                // 分站唯一标识
  name: string
  logo: string
  slogan?: string
  // 主题定制
  theme: {
    primaryColor: string      // 主题色
    secondaryColor?: string
    headerStyle: 'light' | 'dark'
  }
  // 联系方式
  contact?: {
    phone?: string
    wechat?: string
    email?: string
  }
  // 站长信息
  master: {
    id: number
    nickname: string
    avatar: string
    title?: string            // 站长头衔
  }
}

// 分站Banner
export interface StationBanner {
  id: number
  image: string
  title?: string
  link: string
  linkType: 'internal' | 'external' | 'miniprogram'
}

// 特色入口
export interface StationFeatureEntry {
  id: number
  icon: string
  name: string
  link: string
  badge?: string              // 角标（如"热"）
  color?: string              // 图标背景色
}

// 站长推荐内容
export interface StationRecommend {
  id: number
  type: 'course' | 'article' | 'circle' | 'live' | 'product'
  title: string
  cover: string
  price?: number
  originalPrice?: number
  tag?: string                // 推荐标签
  stats?: {
    views?: number
    sales?: number
    rating?: number
  }
}

// Feed内容项
export interface StationFeedItem {
  id: number
  type: 'article' | 'video' | 'course' | 'live' | 'product'
  title: string
  cover: string
  summary?: string
  author: {
    id: number
    nickname: string
    avatar: string
  }
  stats: {
    views: number
    likes: number
    comments: number
  }
  createdAt: string
  price?: number
  isLive?: boolean            // 直播中
  liveStartTime?: string
}

// 分站首页数据
export interface StationHomeData {
  brand: StationBrand
  banners: StationBanner[]
  features: StationFeatureEntry[]
  recommends: StationRecommend[]
  feedList: StationFeedItem[]
  hasMoreFeed: boolean
}

// 分站分享海报数据
export interface StationPosterData {
  posterUrl: string
  qrcodeUrl: string
  inviteCode: string
}
