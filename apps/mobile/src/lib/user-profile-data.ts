// 用户主页数据层（v0 迁移自原型 lib/api/user-profile + types/user-profile）
// 用于 pkg-circle/user/profile 页面
import { apiGet, apiPost, apiDelete } from '@/utils/request'
import { getStorage } from '@/utils/storage'

export interface UserProfileInfo {
  id: string
  nickname: string
  avatar: string
  coverImage?: string
  verified: boolean
  verifiedTitle?: string
  bio?: string
  /** 后端 users 模型暂无「研习等级」概念 → 诚实降级，无则不展示 */
  level?: number
  levelName?: string
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

// ============ 工具 ============

/** 当前登录用户 id（登录时存于 storage 'userInfo'，见 pkg-auth/login）。未登录返回 '' */
function currentUserId(): string {
  const u = getStorage<{ id?: string | number }>('userInfo')
  return u?.id != null ? String(u.id) : ''
}

// ============ API 层 ============
// 后端真实端点（apps/server user.controller）：
//   GET    /users/:id              → 公开资料（nickname/avatar/bio/...）
//   GET    /users/:id/stats        → 统计（articles/followers/following/totalLikes...）
//   GET    /users/:id/is-following → { following }
//   POST   /users/:id/follow       → 关注
//   DELETE /users/:id/follow       → 取关
// 后端无字段（coverImage/verified/verifiedTitle/level/levelName/isMutualFollow）→ 诚实降级

export const userProfileApi = {
  /** 获取用户资料：聚合 资料 + 统计 + 是否已关注 */
  async getProfile(userId: string) {
    const [user, stats] = await Promise.all([
      apiGet<any>(`/users/${userId}`),
      apiGet<any>(`/users/${userId}/stats`),
    ])

    const isSelf = !!userId && currentUserId() === String(userId)

    // is-following 仅作辅助信号：未登录/无权限时按「未关注」展示，不阻塞资料渲染
    let isFollowing = false
    if (!isSelf) {
      try {
        const r = await apiGet<{ following: boolean }>(`/users/${userId}/is-following`)
        isFollowing = !!r?.following
      } catch {
        isFollowing = false
      }
    }

    const data: UserProfileResponse = {
      profile: {
        id: String(user?.id ?? userId),
        nickname: user?.nickname || '用户',
        avatar: user?.avatar || '',
        bio: user?.bio || undefined,
        // 后端无以下字段 → 降级（页面 v-if 隐藏）
        verified: false,
      },
      stats: {
        followingCount: stats?.following ?? 0,
        followerCount: stats?.followers ?? 0,
        likeCount: stats?.totalLikes ?? 0,
      },
      isFollowing,
      isMutualFollow: false, // 后端无「互相关注」查询端点 → 降级
      isSelf,
    }
    return { code: 200, message: 'ok', data }
  },

  /**
   * 获取用户内容列表。
   * 诚实降级：后端无「用户内容聚合」端点（user.controller 无 posts；content 模块是
   * 诗词/精选库，非按作者聚合的动态流），故返回空列表 → 页面走空态。
   */
  async getPosts(_userId: string, _tab: string) {
    return { code: 200, message: 'ok', data: { list: [] as UserPostItem[] } }
  },

  /** 关注用户 —— POST /users/:id/follow */
  async follow(userId: string) {
    try {
      const data = await apiPost<any>(`/users/${userId}/follow`)
      return { code: 200, message: 'ok', data: (data ?? {}) as any }
    } catch (e: any) {
      // 不回退假 mock：返回错误信封，页面据 code!==200 回滚乐观更新并提示
      return { code: 500, message: e?.message || '关注失败', data: {} as any }
    }
  },

  /** 取关用户 —— DELETE /users/:id/follow */
  async unfollow(userId: string) {
    try {
      const data = await apiDelete<any>(`/users/${userId}/follow`)
      return { code: 200, message: 'ok', data: (data ?? {}) as any }
    } catch (e: any) {
      return { code: 500, message: e?.message || '取消关注失败', data: {} as any }
    }
  },
}

// 数字格式化
export function formatCount(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}
