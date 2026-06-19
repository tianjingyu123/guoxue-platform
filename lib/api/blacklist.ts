import { apiGet, apiPost, apiDelete } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { BlacklistItem, BlacklistResponse, SearchUserItem, SearchUserResponse } from '../types/blacklist'

// 是否使用 Mock 数据
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据 - 黑名单用户
const mockBlacklist: BlacklistItem[] = [
  {
    id: 1,
    userId: 10001,
    nickname: '恶意评论者',
    avatar: '/placeholder.svg?height=48&width=48',
    blockedAt: '2026-06-01 14:30',
    reason: '多次发布不当言论'
  },
  {
    id: 2,
    userId: 10002,
    nickname: '广告营销号',
    avatar: '/placeholder.svg?height=48&width=48',
    blockedAt: '2026-05-28 09:15',
    reason: '频繁发送广告信息'
  },
  {
    id: 3,
    userId: 10003,
    nickname: '骚扰用户A',
    avatar: '/placeholder.svg?height=48&width=48',
    blockedAt: '2026-05-20 16:45'
  },
  {
    id: 4,
    userId: 10004,
    nickname: '违规账号',
    avatar: '/placeholder.svg?height=48&width=48',
    blockedAt: '2026-05-15 11:20',
    reason: '发布违规内容'
  },
  {
    id: 5,
    userId: 10005,
    nickname: '恶意举报者',
    avatar: '/placeholder.svg?height=48&width=48',
    blockedAt: '2026-05-10 08:00'
  }
]

// Mock 数据 - 可搜索的用户
const mockSearchUsers: SearchUserItem[] = [
  { id: 20001, nickname: '国学爱好者小李', avatar: '/placeholder.svg?height=40&width=40', isBlocked: false },
  { id: 20002, nickname: '易学研究者', avatar: '/placeholder.svg?height=40&width=40', isBlocked: false },
  { id: 20003, nickname: '传统文化传承人', avatar: '/placeholder.svg?height=40&width=40', isBlocked: false },
  { id: 20004, nickname: '风水师张三', avatar: '/placeholder.svg?height=40&width=40', isBlocked: false },
  { id: 20005, nickname: '命理学徒', avatar: '/placeholder.svg?height=40&width=40', isBlocked: false },
  { id: 10001, nickname: '恶意评论者', avatar: '/placeholder.svg?height=40&width=40', isBlocked: true },
  { id: 10002, nickname: '广告营销号', avatar: '/placeholder.svg?height=40&width=40', isBlocked: true },
]

/**
 * 获取黑名单列表
 */
export async function getBlacklist(
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<BlacklistResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = mockBlacklist.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: mockBlacklist.length,
        hasMore: end < mockBlacklist.length
      },
      message: 'success'
    }
  }
  
  return apiGet<BlacklistResponse>('/api/im/blacklist', { page, pageSize })
}

/**
 * 搜索用户（用于添加黑名单）
 */
export async function searchUsersForBlock(
  keyword: string
): Promise<ApiResponse<SearchUserResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const filtered = mockSearchUsers.filter(u => 
      u.nickname.toLowerCase().includes(keyword.toLowerCase())
    )
    return {
      code: 200,
      data: {
        list: filtered,
        total: filtered.length
      },
      message: 'success'
    }
  }
  
  return apiGet<SearchUserResponse>('/api/users/search', { keyword, forBlock: true })
}

/**
 * 添加用户到黑名单
 */
export async function addToBlacklist(
  userId: number,
  reason?: string
): Promise<ApiResponse<{ id: number }>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: { id: Date.now() },
      message: '已加入黑名单'
    }
  }
  
  return apiPost<{ id: number }>('/api/im/blacklist', { userId, reason })
}

/**
 * 从黑名单移除用户
 */
export async function removeFromBlacklist(
  userId: number
): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: null,
      message: '已移出黑名单'
    }
  }
  
  return apiDelete<null>(`/api/im/blacklist/${userId}`)
}

/**
 * 批量移除黑名单
 */
export async function batchRemoveFromBlacklist(
  userIds: number[]
): Promise<ApiResponse<{ removed: number }>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: { removed: userIds.length },
      message: `已移出 ${userIds.length} 人`
    }
  }
  
  return apiPost<{ removed: number }>('/api/im/blacklist/batch-remove', { userIds })
}
