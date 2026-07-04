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
//   GET    /users/:id/public-profile → 公开主页聚合（脱敏资料+认证徽章+统计+关注关系）
//   POST   /users/:id/follow         → 关注（返回 { ...follow, isMutualFollow }）
//   DELETE /users/:id/follow         → 取关
// 后端无字段（coverImage/level/levelName）→ 前端诚实降级（页面 v-if 隐藏）

/* —— 后端 GET /users/:id/public-profile 原始响应类型（字段全 optional，容错适配用） —— */
interface RawPublicProfile {
  profile?: {
    id?: string | number
    nickname?: string
    avatar?: string | null
    bio?: string | null
    verified?: boolean
    verifiedTitle?: string | null
  }
  stats?: {
    followingCount?: number
    followerCount?: number
    likeCount?: number
  }
  isFollowing?: boolean
  isMutualFollow?: boolean
  isSelf?: boolean
}

export const userProfileApi = {
  /** 获取用户公开主页：脱敏资料 + 认证徽章 + 统计 + 关注关系（后端一次聚合） */
  async getProfile(userId: string) {
    const raw = await apiGet<RawPublicProfile>(`/users/${userId}/public-profile`)
    const p = raw?.profile
    const s = raw?.stats

    const data: UserProfileResponse = {
      profile: {
        id: String(p?.id ?? userId),
        nickname: p?.nickname || '用户',
        avatar: p?.avatar || '',
        bio: p?.bio || undefined,
        verified: !!p?.verified,
        verifiedTitle: p?.verifiedTitle || undefined,
        // 后端无 coverImage/level/levelName → 降级（页面 v-if 隐藏）
      },
      stats: {
        followingCount: s?.followingCount ?? 0,
        followerCount: s?.followerCount ?? 0,
        likeCount: s?.likeCount ?? 0,
      },
      isFollowing: !!raw?.isFollowing,
      isMutualFollow: !!raw?.isMutualFollow,
      // 后端已按 viewer 计算 isSelf；未登录场景后端无 viewerId → false，前端用本地 id 兜底
      isSelf: !!raw?.isSelf || (!!userId && currentUserId() === String(userId)),
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
      // 写操作后端返回结构不定，用 unknown 接收；信封 data 强转 any（允许保留）
      const data = await apiPost<unknown>(`/users/${userId}/follow`)
      return { code: 200, message: 'ok', data: (data ?? {}) as any }
    } catch (e: any) {
      // 不回退假 mock：返回错误信封，页面据 code!==200 回滚乐观更新并提示
      return { code: 500, message: e?.message || '关注失败', data: {} as any }
    }
  },

  /** 取关用户 —— DELETE /users/:id/follow */
  async unfollow(userId: string) {
    try {
      // 写操作后端返回结构不定，用 unknown 接收；信封 data 强转 any（允许保留）
      const data = await apiDelete<unknown>(`/users/${userId}/follow`)
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
