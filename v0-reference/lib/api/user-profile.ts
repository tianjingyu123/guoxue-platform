// 用户主页相关 API

import { apiGet, apiPost } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  UserProfileResponse, 
  UserContentResponse, 
  UserFavoritesResponse,
  UserPublicProfile,
  UserStats,
  UserPostItem,
  UserFavoriteItem
} from '../types/user-profile'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据 - 用户资料
const mockUserProfile: UserPublicProfile = {
  id: 10086,
  nickname: '玄学大师张三丰',
  avatar: '/placeholder.svg?height=120&width=120',
  bio: '专注易学研究三十年，精通八字、六爻、奇门遁甲。愿与同道中人共同探讨国学智慧，传承中华文化。',
  gender: 'male',
  location: '北京市',
  level: 8,
  levelName: '宗师',
  verified: true,
  verifiedType: 'master',
  verifiedTitle: '认证命理师',
  joinedAt: '2020-03-15',
  coverImage: '/placeholder.svg?height=200&width=400'
}

const mockUserStats: UserStats = {
  followingCount: 128,
  followerCount: 15680,
  likeCount: 89420,
  postCount: 256,
  articleCount: 48,
  videoCount: 32,
  answerCount: 189
}

// Mock 数据 - 用户动态
const mockUserPosts: UserPostItem[] = [
  {
    id: 1,
    type: 'post',
    content: '今日分享：八字看婚姻的几个关键点。日支为配偶宫，看日支与日干的关系可以初步判断婚姻状态...',
    images: ['/placeholder.svg?height=200&width=200', '/placeholder.svg?height=200&width=200'],
    likeCount: 328,
    commentCount: 56,
    shareCount: 89,
    createdAt: '2026-06-03 10:30',
    isLiked: false
  },
  {
    id: 2,
    type: 'article',
    title: '深度解析：2026年流年运势与个人八字的关系',
    content: '丙午年即将到来，火气旺盛的一年。对于不同八字的人来说，影响各不相同...',
    cover: '/placeholder.svg?height=120&width=200',
    likeCount: 1256,
    commentCount: 234,
    shareCount: 567,
    createdAt: '2026-06-02 15:00',
    isLiked: true
  },
  {
    id: 3,
    type: 'video',
    title: '三分钟学会看手相基础',
    content: '手相入门教学，教你看懂生命线、智慧线、感情线...',
    cover: '/placeholder.svg?height=120&width=200',
    likeCount: 2890,
    commentCount: 456,
    shareCount: 890,
    createdAt: '2026-06-01 20:00',
    isLiked: false
  },
  {
    id: 4,
    type: 'answer',
    title: '如何理解八字中的伤官见官？',
    content: '伤官见官是八字中一个比较特殊的组合，需要结合整体八字来看。首先我们要理解伤官和正官的关系...',
    likeCount: 456,
    commentCount: 78,
    shareCount: 123,
    createdAt: '2026-05-30 14:20',
    isLiked: false
  },
  {
    id: 5,
    type: 'course',
    title: '周易六爻预测实战课程',
    content: '从基础到实战，系统学习六爻预测...',
    cover: '/placeholder.svg?height=120&width=200',
    likeCount: 3456,
    commentCount: 567,
    shareCount: 234,
    createdAt: '2026-05-28 09:00',
    isLiked: true
  }
]

// Mock 数据 - 用户收藏
const mockUserFavorites: UserFavoriteItem[] = [
  {
    id: 101,
    type: 'article',
    title: '紫微斗数入门：十二宫位详解',
    cover: '/placeholder.svg?height=80&width=120',
    author: { id: 201, nickname: '紫微研究者', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-02'
  },
  {
    id: 102,
    type: 'course',
    title: '梅花易数精讲课程',
    cover: '/placeholder.svg?height=80&width=120',
    author: { id: 202, nickname: '易学大师', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-06-01'
  },
  {
    id: 103,
    type: 'video',
    title: '风水布局实战案例分析',
    cover: '/placeholder.svg?height=80&width=120',
    author: { id: 203, nickname: '风水堪舆师', avatar: '/placeholder.svg?height=40&width=40' },
    createdAt: '2026-05-30'
  }
]

/**
 * 获取用户主页数据
 */
export async function getUserProfile(userId: number): Promise<ApiResponse<UserProfileResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        profile: { ...mockUserProfile, id: userId },
        stats: mockUserStats,
        isFollowing: false,
        isMutualFollow: false,
        isBlocked: false,
        isSelf: userId === 1 // 假设当前用户ID为1
      },
      message: 'success'
    }
  }
  
  return apiGet<UserProfileResponse>(`/api/user/${userId}/profile`)
}

/**
 * 获取用户动态/帖子列表
 */
export async function getUserPosts(
  userId: number,
  type: 'all' | 'post' | 'article' | 'video' | 'answer' = 'all',
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<UserContentResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let filtered = mockUserPosts
    if (type !== 'all') {
      filtered = mockUserPosts.filter(p => p.type === type)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      code: 200,
      data: {
        list: filtered.slice(start, end),
        total: filtered.length,
        hasMore: end < filtered.length
      },
      message: 'success'
    }
  }
  
  return apiGet<UserContentResponse>(`/api/user/${userId}/posts`, { type, page, pageSize })
}

/**
 * 获取用户收藏列表
 */
export async function getUserFavorites(
  userId: number,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<UserFavoritesResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      code: 200,
      data: {
        list: mockUserFavorites.slice(start, end),
        total: mockUserFavorites.length,
        hasMore: end < mockUserFavorites.length
      },
      message: 'success'
    }
  }
  
  return apiGet<UserFavoritesResponse>(`/api/user/${userId}/favorites`, { page, pageSize })
}

/**
 * 关注用户
 */
export async function followUser(userId: number): Promise<ApiResponse<{ isFollowing: boolean; isMutualFollow: boolean }>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: { isFollowing: true, isMutualFollow: Math.random() > 0.5 },
      message: '关注成功'
    }
  }
  
  return apiPost<{ isFollowing: boolean; isMutualFollow: boolean }>(`/api/user/${userId}/follow`)
}

/**
 * 取消关注用户
 */
export async function unfollowUser(userId: number): Promise<ApiResponse<{ isFollowing: boolean }>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: { isFollowing: false },
      message: '已取消关注'
    }
  }
  
  return apiPost<{ isFollowing: boolean }>(`/api/user/${userId}/unfollow`)
}

/**
 * 获取内容类型名称
 */
export function getContentTypeName(type: UserPostItem['type']): string {
  const names: Record<UserPostItem['type'], string> = {
    post: '动态',
    article: '文章',
    video: '视频',
    answer: '回答',
    course: '课程'
  }
  return names[type] || '内容'
}

/**
 * 获取内容跳转URL
 */
export function getContentUrl(item: UserPostItem): string {
  const urlMap: Record<UserPostItem['type'], string> = {
    post: `/circle/post/${item.id}`,
    article: `/article/${item.id}`,
    video: `/video/${item.id}`,
    answer: `/qa/question/${item.id}`,
    course: `/course/${item.id}`
  }
  return urlMap[item.type] || '#'
}

/**
 * 获取收藏内容跳转URL
 */
export function getFavoriteUrl(item: UserFavoriteItem): string {
  const urlMap: Record<UserFavoriteItem['type'], string> = {
    article: `/article/${item.id}`,
    video: `/video/${item.id}`,
    course: `/course/${item.id}`,
    post: `/circle/post/${item.id}`,
    question: `/qa/question/${item.id}`
  }
  return urlMap[item.type] || '#'
}
