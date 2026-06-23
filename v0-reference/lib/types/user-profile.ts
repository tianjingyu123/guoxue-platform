// 用户主页相关类型定义

// 用户公开资料
export interface UserPublicProfile {
  id: number
  nickname: string
  avatar: string
  bio?: string
  gender?: 'male' | 'female' | 'unknown'
  location?: string
  // 用户等级
  level: number
  levelName: string
  // 认证信息
  verified?: boolean
  verifiedType?: 'instructor' | 'master' | 'heritage' | 'official'
  verifiedTitle?: string
  // 注册时间
  joinedAt: string
  // 背景图
  coverImage?: string
}

// 用户统计数据
export interface UserStats {
  // 关注数
  followingCount: number
  // 粉丝数
  followerCount: number
  // 获赞数
  likeCount: number
  // 发布内容数
  postCount: number
  articleCount: number
  videoCount: number
  answerCount: number
}

// 用户动态项
export interface UserPostItem {
  id: number
  type: 'post' | 'article' | 'video' | 'answer' | 'course'
  title?: string
  content: string
  images?: string[]
  cover?: string
  // 互动数据
  likeCount: number
  commentCount: number
  shareCount: number
  // 时间
  createdAt: string
  // 是否点赞
  isLiked?: boolean
}

// 用户收藏项
export interface UserFavoriteItem {
  id: number
  type: 'article' | 'video' | 'course' | 'post' | 'question'
  title: string
  cover?: string
  author: {
    id: number
    nickname: string
    avatar: string
  }
  createdAt: string
}

// 用户主页数据响应
export interface UserProfileResponse {
  profile: UserPublicProfile
  stats: UserStats
  isFollowing: boolean
  isMutualFollow: boolean
  isBlocked: boolean
  isSelf: boolean
}

// 用户内容列表响应
export interface UserContentResponse {
  list: UserPostItem[]
  total: number
  hasMore: boolean
}

// 用户收藏列表响应
export interface UserFavoritesResponse {
  list: UserFavoriteItem[]
  total: number
  hasMore: boolean
}
