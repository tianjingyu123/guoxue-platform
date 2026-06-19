// 搜索相关类型定义

// 热门搜索关键词
export interface HotSearch {
  keyword: string
  isHot: boolean
  rank: number
}

// 搜索联想
export interface SearchSuggestion {
  keyword: string
  count: number
}

// 搜索结果 - 圈子
export interface SearchCircleResult {
  id: number
  name: string
  description: string
  highlight: string
  cover: string
  members: number
  price: number
  owner: string
  ownerAvatar: string
  ownerTitle: string
  isVerified: boolean
  tags: string[]
  rating: number
  todayPosts: number
  recentJoiners: string[]
}

// 搜索结果 - 课程
export interface SearchCourseResult {
  id: number
  title: string
  instructor: string
  price: number
  originalPrice: number
  cover: string
  students: number
}

// 搜索结果 - 商品
export interface SearchProductResult {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  sales: number
}

// 搜索结果 - 文章
export interface SearchArticleResult {
  id: number
  title: string
  author: string
  avatar: string
  views: number
  likes: number
}

// 搜索结果 - 用户
export interface SearchUserResult {
  id: number
  name: string
  title: string
  followers: number
  avatar: string
  isVerified: boolean
}

// 综合搜索结果
export interface SearchResults {
  circles: SearchCircleResult[]
  courses: SearchCourseResult[]
  products: SearchProductResult[]
  articles: SearchArticleResult[]
  users: SearchUserResult[]
}
