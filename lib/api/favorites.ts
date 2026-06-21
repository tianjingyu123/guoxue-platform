import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { FavoriteItem, FavoritesResponse, FavoriteStats, FavoriteType, FavoriteTab } from '../types/favorites'

// Mock 收藏数据
const mockFavorites: FavoriteItem[] = [
  {
    id: 1,
    type: 'course',
    targetId: 101,
    title: '八字入门实战课',
    subtitle: '周易大师 · 28章节',
    cover: '/placeholder.svg?height=80&width=80',
    price: 199,
    originalPrice: 299,
    collectedAt: '2026-06-01 10:30',
    extra: { chapterCount: 28, author: '周易大师' },
  },
  {
    id: 2,
    type: 'circle',
    targetId: 201,
    title: '八字命理研习社',
    subtitle: '3280成员 · 每日更新',
    cover: '/placeholder.svg?height=80&width=80',
    price: 99,
    collectedAt: '2026-05-30 14:20',
    extra: { memberCount: 3280 },
  },
  {
    id: 3,
    type: 'article',
    targetId: 301,
    title: '八字中的食神制杀格局详解',
    subtitle: '周易大师 · 阅读 2.3万',
    cover: '/placeholder.svg?height=80&width=80',
    price: 0,
    collectedAt: '2026-05-28 09:15',
    extra: { readCount: 23000, author: '周易大师' },
  },
  {
    id: 4,
    type: 'product',
    targetId: 401,
    title: '开运水晶手链',
    subtitle: '已售 326件',
    cover: '/placeholder.svg?height=80&width=80',
    price: 168,
    originalPrice: 298,
    collectedAt: '2026-05-25 16:40',
    extra: { soldCount: 326 },
  },
  {
    id: 5,
    type: 'course',
    targetId: 102,
    title: '紫微斗数精讲',
    subtitle: '张玄风 · 36章节',
    cover: '/placeholder.svg?height=80&width=80',
    price: 299,
    collectedAt: '2026-05-22 11:00',
    extra: { chapterCount: 36, author: '张玄风' },
  },
  {
    id: 6,
    type: 'circle',
    targetId: 202,
    title: '风水堪舆学院',
    subtitle: '1860成员',
    cover: '/placeholder.svg?height=80&width=80',
    price: 0,
    collectedAt: '2026-05-20 08:30',
    extra: { memberCount: 1860 },
  },
  {
    id: 7,
    type: 'article',
    targetId: 302,
    title: '流年运势分析方法论',
    subtitle: '玄学居士 · 阅读 1.8万',
    cover: '/placeholder.svg?height=80&width=80',
    price: 0,
    collectedAt: '2026-05-18 15:20',
    extra: { readCount: 18000, author: '玄学居士' },
  },
  {
    id: 8,
    type: 'product',
    targetId: 402,
    title: '八字命理入门电子书',
    subtitle: '已售 856件',
    cover: '/placeholder.svg?height=80&width=80',
    price: 29,
    collectedAt: '2026-05-15 12:10',
    extra: { soldCount: 856 },
  },
  {
    id: 9,
    type: 'live',
    targetId: 501,
    title: '八字看财运直播',
    subtitle: '已结束 · 1.2万人观看',
    cover: '/placeholder.svg?height=80&width=80',
    price: 0,
    collectedAt: '2026-05-12 20:00',
    extra: { viewerCount: 12000, author: '周易大师' },
  },
  {
    id: 10,
    type: 'teacher',
    targetId: 601,
    title: '周易大师',
    subtitle: '八字命理专家 · 粉丝 12.8万',
    cover: '/placeholder.svg?height=80&width=80',
    price: 0,
    collectedAt: '2026-05-10 09:00',
  },
]

/**
 * 获取收藏统计
 */
export async function getFavoriteStats(): Promise<ApiResponse<FavoriteStats>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    const stats: FavoriteStats = {
      total: mockFavorites.length,
      course: mockFavorites.filter(f => f.type === 'course').length,
      circle: mockFavorites.filter(f => f.type === 'circle').length,
      article: mockFavorites.filter(f => f.type === 'article').length,
      product: mockFavorites.filter(f => f.type === 'product').length,
      live: mockFavorites.filter(f => f.type === 'live').length,
      teacher: mockFavorites.filter(f => f.type === 'teacher').length,
    }
    return { code: 200, data: stats, message: 'success' }
  }
  return apiGet<FavoriteStats>('/user/favorites/stats')
}

/**
 * 获取收藏列表
 */
export async function getFavorites(params: {
  type?: FavoriteType | 'all'
  page?: number
  pageSize?: number
}): Promise<ApiResponse<FavoritesResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let list = [...mockFavorites]
    
    // 类型筛选
    if (params.type && params.type !== 'all') {
      list = list.filter(f => f.type === params.type)
    }
    
    // 分页
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const paged = list.slice(start, start + pageSize)
    
    return {
      code: 200,
      data: {
        list: paged,
        total: list.length,
        hasMore: start + pageSize < list.length,
      },
      message: 'success',
    }
  }
  return apiGet<FavoritesResponse>('/user/favorites', params)
}

/**
 * 取消收藏
 */
export async function removeFavorite(id: number): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { success: true }, message: '已取消收藏' }
  }
  return apiPost<{ success: boolean }>(`/user/favorites/${id}/remove`)
}

/**
 * 批量取消收藏
 */
export async function removeFavorites(ids: number[]): Promise<ApiResponse<{ successCount: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { successCount: ids.length }, message: `已取消${ids.length}个收藏` }
  }
  return apiPost<{ successCount: number }>('/user/favorites/batch-remove', { ids })
}

/**
 * 添加收藏
 */
export async function addFavorite(type: FavoriteType, targetId: number): Promise<ApiResponse<{ id: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: { id: Date.now() }, message: '收藏成功' }
  }
  return apiPost<{ id: number }>('/user/favorites/add', { type, targetId })
}

/**
 * 获取收藏Tab列表
 */
export function getFavoriteTabs(stats: FavoriteStats): FavoriteTab[] {
  return [
    { id: 'all', name: '全部', count: stats.total },
    { id: 'course', name: '课程', count: stats.course },
    { id: 'circle', name: '圈子', count: stats.circle },
    { id: 'article', name: '文章', count: stats.article },
    { id: 'product', name: '商品', count: stats.product },
    { id: 'live', name: '直播', count: stats.live },
    { id: 'teacher', name: '讲师', count: stats.teacher },
  ].filter(tab => tab.id === 'all' || tab.count > 0)
}

/**
 * 获取收藏类型显示名
 */
export function getFavoriteTypeName(type: FavoriteType): string {
  const names: Record<FavoriteType, string> = {
    course: '课程',
    circle: '圈子',
    article: '文章',
    product: '商品',
    live: '直播',
    teacher: '讲师',
  }
  return names[type]
}

/**
 * 获取收藏类型颜色
 */
export function getFavoriteTypeColor(type: FavoriteType): string {
  const colors: Record<FavoriteType, string> = {
    course: 'bg-blue-500/10 text-blue-600',
    circle: 'bg-green-500/10 text-green-600',
    article: 'bg-purple-500/10 text-purple-600',
    product: 'bg-orange-500/10 text-orange-600',
    live: 'bg-red-500/10 text-red-600',
    teacher: 'bg-amber-500/10 text-amber-600',
  }
  return colors[type]
}

/**
 * 获取收藏项跳转链接
 */
export function getFavoriteLink(item: FavoriteItem): string {
  const links: Record<FavoriteType, string> = {
    course: `/course/${item.targetId}`,
    circle: `/circle/${item.targetId}`,
    article: `/article/${item.targetId}`,
    product: `/product/${item.targetId}`,
    live: `/live/room/${item.targetId}`,
    teacher: `/teacher/${item.targetId}`,
  }
  return links[item.type]
}
