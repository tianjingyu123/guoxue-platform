import { apiGet, apiPost } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { LikeItem, MyLikesResponse, LikeTargetType } from '../types/likes'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据
const mockLikes: LikeItem[] = [
  {
    id: 1,
    target: {
      id: 101,
      type: 'article',
      title: '八字命理入门：如何看懂自己的命盘',
      author: {
        id: 1001,
        nickname: '易学大师',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-06-03 14:30'
  },
  {
    id: 2,
    target: {
      id: 201,
      type: 'course',
      title: '周易六爻预测实战课程',
      cover: '/placeholder.svg?height=80&width=120',
      author: {
        id: 1002,
        nickname: '周易研究院',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-06-03 10:15'
  },
  {
    id: 3,
    target: {
      id: 301,
      type: 'video',
      title: '三分钟学会看手相基础',
      cover: '/placeholder.svg?height=80&width=120',
      author: {
        id: 1003,
        nickname: '相学入门',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-06-02 20:45'
  },
  {
    id: 4,
    target: {
      id: 401,
      type: 'circle_post',
      title: '今日卦象分享：天火同人',
      author: {
        id: 1004,
        nickname: '每日一卦',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-06-02 16:20'
  },
  {
    id: 5,
    target: {
      id: 501,
      type: 'question',
      title: '请问八字中食神生财是什么意思？',
      author: {
        id: 1005,
        nickname: '命理小白',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-06-02 09:30'
  },
  {
    id: 6,
    target: {
      id: 601,
      type: 'answer',
      title: '关于紫微斗数中天机星的详细解读',
      author: {
        id: 1006,
        nickname: '紫微达人',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-06-01 18:00'
  },
  {
    id: 7,
    target: {
      id: 701,
      type: 'product',
      title: '专业风水罗盘（黄铜版）',
      cover: '/placeholder.svg?height=80&width=80',
      author: {
        id: 1007,
        nickname: '风水用品店',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-06-01 14:15'
  },
  {
    id: 8,
    target: {
      id: 801,
      type: 'comment',
      title: '这个解释太到位了，学习了！',
      author: {
        id: 1008,
        nickname: '学习者',
        avatar: '/placeholder.svg?height=40&width=40'
      }
    },
    createdAt: '2026-05-31 22:00'
  }
]

/**
 * 获取我的点赞记录
 */
export async function getMyLikes(
  page: number = 1,
  pageSize: number = 20,
  type?: LikeTargetType
): Promise<ApiResponse<MyLikesResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockLikes
    if (type) {
      filtered = mockLikes.filter(item => item.target.type === type)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = filtered.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: filtered.length,
        hasMore: end < filtered.length
      },
      message: 'success'
    }
  }

  const params: Record<string, any> = { page, pageSize }
  if (type) params.type = type
  return apiGet<MyLikesResponse>('/api/user/likes', params)
}

/**
 * 取消点赞
 */
export async function unlikeContent(
  targetId: number,
  targetType: LikeTargetType
): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: null,
      message: '已取消点赞'
    }
  }

  return apiPost<null>('/api/interact/unlike', { targetId, targetType })
}

/**
 * 获取目标类型的中文名称
 */
export function getLikeTypeName(type: LikeTargetType): string {
  const names: Record<LikeTargetType, string> = {
    article: '文章',
    course: '课程',
    video: '视频',
    product: '商品',
    circle_post: '帖子',
    question: '问答',
    answer: '回答',
    comment: '评论'
  }
  return names[type] || '内容'
}

/**
 * 获取目标类型的跳转URL
 */
export function getLikeTargetUrl(targetId: number, type: LikeTargetType): string {
  const urlMap: Record<LikeTargetType, string> = {
    article: `/article/${targetId}`,
    course: `/course/${targetId}`,
    video: `/video/${targetId}`,
    product: `/shop/product/${targetId}`,
    circle_post: `/circle/post/${targetId}`,
    question: `/qa/question/${targetId}`,
    answer: `/qa/answer/${targetId}`,
    comment: `/comment/${targetId}`
  }
  return urlMap[type] || '/'
}
