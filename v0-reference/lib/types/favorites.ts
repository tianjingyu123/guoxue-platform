// 收藏相关类型定义

// 收藏内容类型
export type FavoriteType = 'course' | 'circle' | 'article' | 'product' | 'live' | 'teacher'

// 收藏项
export interface FavoriteItem {
  id: number
  // 收藏类型
  type: FavoriteType
  // 目标ID
  targetId: number
  // 标题
  title: string
  // 副标题/描述
  subtitle: string
  // 封面图
  cover: string
  // 价格（0表示免费）
  price: number
  originalPrice?: number
  // 收藏时间
  collectedAt: string
  // 额外信息（根据类型不同）
  extra?: {
    // 课程：章节数
    chapterCount?: number
    // 圈子：成员数
    memberCount?: number
    // 文章：阅读数
    readCount?: number
    // 商品：销量
    soldCount?: number
    // 直播：观看数
    viewerCount?: number
    // 作者/讲师
    author?: string
  }
  // 是否失效（如商品下架、课程删除）
  isInvalid?: boolean
}

// 收藏列表响应
export interface FavoritesResponse {
  list: FavoriteItem[]
  total: number
  hasMore: boolean
}

// 收藏统计
export interface FavoriteStats {
  total: number
  course: number
  circle: number
  article: number
  product: number
  live: number
  teacher: number
}

// 收藏分类Tab
export interface FavoriteTab {
  id: FavoriteType | 'all'
  name: string
  count: number
}
