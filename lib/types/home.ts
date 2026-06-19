// 首页相关类型定义

// Banner 数据
export interface BannerItem {
  id: number
  image: string
  title: string
  link: string
  type: 'course' | 'activity' | 'product' | 'external'
}

// 快捷入口
export interface QuickEntry {
  id: number
  icon: string
  label: string
  href: string
  badge?: string
  color?: string
}

// Feed 内容类型
export type FeedItemType = 'article' | 'course' | 'live' | 'video' | 'post'

// Feed 项目
export interface FeedItem {
  id: number
  type: FeedItemType
  title: string
  cover?: string
  author: {
    id: number
    name: string
    avatar: string
    isVerified?: boolean
  }
  stats: {
    views?: number
    likes?: number
    comments?: number
    students?: number
  }
  tags?: string[]
  price?: number
  originalPrice?: number
  isLive?: boolean
  createTime: string
}

// 首页数据
export interface HomeData {
  banners: BannerItem[]
  quickEntries: QuickEntry[]
  feeds: FeedItem[]
}
