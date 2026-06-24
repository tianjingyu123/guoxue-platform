// 用户主页数据层（v0 迁移自原型 lib/api/user-profile + types/user-profile）
// 用于 pkg-circle/user/profile 页面
import { apiGet, apiPost, useMock } from '@/utils/request'

export interface UserProfileInfo {
  id: number
  nickname: string
  avatar: string
  coverImage?: string
  verified: boolean
  verifiedTitle?: string
  bio?: string
  level: number
  levelName: string
}

export interface UserProfileStats {
  followingCount: number
  followerCount: number
  likeCount: number
}

export interface UserProfileResponse {
  profile: UserProfileInfo
  stats: UserProfileStats
  isFollowing: boolean
  isMutualFollow: boolean
  isSelf: boolean
}

export type UserContentType = 'post' | 'article' | 'video'

export interface UserPostItem {
  id: string
  type: UserContentType
  content: string
  title?: string
  cover?: string
  images?: string[]
  likeCount: number
  commentCount: number
  isLiked: boolean
  createdAt: string
}

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

// 内容类型名
export function getContentTypeName(type: UserContentType): string {
  switch (type) {
    case 'post':
      return '帖子'
    case 'article':
      return '文章'
    case 'video':
      return '短视频'
    default:
      return '内容'
  }
}

// 内容跳转地址（uni 路径）
export function getContentUrl(item: UserPostItem): string {
  switch (item.type) {
    case 'article':
      return `/pkg-circle/articles/detail?id=${item.id}`
    case 'video':
      return `/pkg-video/video/detail?id=${item.id}`
    case 'post':
    default:
      return `/pkg-circle/circles/post-detail?id=${item.id}`
  }
}

// ===== mock 数据 =====

const _mockProfile: UserProfileResponse = {
  profile: {
    id: 1,
    nickname: '张明远',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangmingyuan',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
    verified: true,
    verifiedTitle: '认证命理师',
    bio: '研习易理二十载，专注八字与紫微斗数。愿以所学，助君明心见性，趋吉避凶。',
    level: 8,
    levelName: '研习大成',
  },
  stats: {
    followingCount: 286,
    followerCount: 12800,
    likeCount: 45600,
  },
  isFollowing: false,
  isMutualFollow: false,
  isSelf: false,
}

const _mockPosts: UserPostItem[] = [
  {
    id: 'p1',
    type: 'post',
    content: '今日与诸位道友论及"天人合一"之理。古人观天象以察人事，非迷信也，乃是对自然规律的敬畏与体悟。诸君以为然否？',
    images: [
      'https://picsum.photos/400/400?random=801',
      'https://picsum.photos/400/400?random=802',
    ],
    likeCount: 328,
    commentCount: 56,
    isLiked: false,
    createdAt: '2小时前',
  },
  {
    id: 'a1',
    type: 'article',
    title: '八字入门：天干地支与五行生克的基础逻辑',
    content: '本文从最基础的天干地支讲起，梳理五行生克制化的核心规律……',
    cover: 'https://picsum.photos/240/160?random=803',
    likeCount: 1265,
    commentCount: 142,
    isLiked: true,
    createdAt: '昨天',
  },
  {
    id: 'v1',
    type: 'video',
    title: '三分钟读懂紫微斗数十二宫',
    content: '三分钟读懂紫微斗数十二宫',
    cover: 'https://picsum.photos/360/640?random=804',
    likeCount: 5620,
    commentCount: 318,
    isLiked: false,
    createdAt: '3天前',
  },
  {
    id: 'p2',
    type: 'post',
    content: '有缘人问我：如何看待"命由天定"与"事在人为"？我答曰：知命方能造命，明理才可立身。命是起点，非终点。',
    likeCount: 196,
    commentCount: 38,
    isLiked: false,
    createdAt: '4天前',
  },
  {
    id: 'a2',
    type: 'article',
    title: '紫微斗数命盘解析：命宫主星的深层含义',
    content: '命宫主星决定一个人的先天格局，本文详解十四主星入命宫……',
    cover: 'https://picsum.photos/240/160?random=805',
    likeCount: 892,
    commentCount: 76,
    isLiked: false,
    createdAt: '1周前',
  },
  {
    id: 'v2',
    type: 'video',
    title: '风水入门：家居布局的三大禁忌',
    content: '风水入门：家居布局的三大禁忌',
    cover: 'https://picsum.photos/360/640?random=806',
    likeCount: 3210,
    commentCount: 205,
    isLiked: false,
    createdAt: '2周前',
  },
]

// ============ API 层 ============

export const userProfileApi = {
  /** 获取用户资料 */
  async getProfile(userId: number) {
    if (true) return {
      code: 200, message: 'ok',
      data: { ..._mockProfile, profile: { ..._mockProfile.profile, id: userId } },
    }
    try {
      const data = await apiGet<any>(`/user/${userId}/profile`)
      return { code: 200, message: 'ok', data: data || { ..._mockProfile, profile: { ..._mockProfile.profile, id: userId } } }
    } catch {
      return { code: 200, message: 'ok', data: { ..._mockProfile, profile: { ..._mockProfile.profile, id: userId } } }
    }
  },

  /** 获取用户内容列表 */
  async getPosts(userId: number, tab: string) {
    if (true) return { code: 200, message: 'ok', data: { list: _mockPosts } }
    try {
      const data = await apiGet<any>(`/user/${userId}/posts?tab=${tab}`)
      return { code: 200, message: 'ok', data: { list: data?.list?.length ? data.list : _mockPosts } }
    } catch { return { code: 200, message: 'ok', data: { list: _mockPosts } } }
  },

  /** 关注用户 */
  async follow(userId: number) {
    if (true) return { code: 200, message: 'ok', data: { isMutualFollow: true } }
    try {
      const data = await apiPost<any>(`/user/${userId}/follow`)
      return { code: 200, message: 'ok', data }
    } catch { return { code: 200, message: 'ok', data: { isMutualFollow: true } } }
  },

  /** 取关用户 */
  async unfollow(userId: number) {
    if (true) return { code: 200, message: 'ok', data: {} }
    try {
      const data = await apiPost<any>(`/user/${userId}/unfollow`)
      return { code: 200, message: 'ok', data }
    } catch { return { code: 200, message: 'ok', data: {} } }
  },
}

// 数字格式化
export function formatCount(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}
