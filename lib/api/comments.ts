/**
 * 评论相关 API
 */

import { apiGet, apiPost, apiDelete } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { CommentItem, MyCommentsResponse, CommentTargetType, ReceivedCommentItem, ReceivedCommentsResponse } from '../types/comments'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// Mock 数据
const mockComments: CommentItem[] = [
  {
    id: 1,
    content: '这篇文章写得太好了，对八字命理的解析非常透彻，学到了很多知识！',
    createdAt: '2026-06-03 14:30',
    target: {
      id: 101,
      type: 'article',
      title: '八字命理入门：如何看懂自己的命盘',
      cover: '/placeholder.svg?height=80&width=80'
    },
    likeCount: 12,
    replyCount: 3,
    hasReply: true
  },
  {
    id: 2,
    content: '老师讲得很清楚，希望能出更多关于六爻的课程',
    createdAt: '2026-06-02 10:15',
    target: {
      id: 201,
      type: 'course',
      title: '周易六爻预测实战课程',
      cover: '/placeholder.svg?height=80&width=80'
    },
    likeCount: 8,
    replyCount: 1,
    hasReply: true
  },
  {
    id: 3,
    content: '请问这个罗盘的材质是什么？看起来很精致',
    createdAt: '2026-06-01 16:45',
    target: {
      id: 301,
      type: 'product',
      title: '专业风水罗盘（黄铜版）',
      cover: '/placeholder.svg?height=80&width=80'
    },
    likeCount: 2,
    replyCount: 1,
    hasReply: true
  },
  {
    id: 4,
    content: '分享得很有价值，感谢楼主的无私分享',
    createdAt: '2026-05-30 09:20',
    target: {
      id: 401,
      type: 'circle_post',
      title: '我学习紫微斗数三年的心得体会',
      cover: '/placeholder.svg?height=80&width=80'
    },
    likeCount: 25,
    replyCount: 0,
    hasReply: false
  },
  {
    id: 5,
    content: '这个问题我也遇到过，建议参考《滴天髓》中的相关论述',
    createdAt: '2026-05-28 11:30',
    target: {
      id: 501,
      type: 'question',
      title: '关于八字中伤官见官的问题',
    },
    likeCount: 15,
    replyCount: 2,
    hasReply: false
  },
  {
    id: 6,
    content: '视频画质很清晰，讲解也很专业',
    createdAt: '2026-05-25 20:00',
    target: {
      id: 601,
      type: 'video',
      title: '三分钟学会看手相基础',
      cover: '/placeholder.svg?height=80&width=80'
    },
    likeCount: 6,
    replyCount: 0,
    hasReply: false
  }
]

/**
 * 获取我的评论列表
 */
export async function getMyComments(
  page: number = 1, 
  pageSize: number = 20
): Promise<ApiResponse<MyCommentsResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 600))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = mockComments.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: mockComments.length,
        hasMore: end < mockComments.length
      },
      message: 'success'
    }
  }
  
  return apiGet<MyCommentsResponse>('/api/user/comments', { page, pageSize })
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: null,
      message: '删除成功'
    }
  }
  
  return apiDelete<null>(`/api/user/comments/${commentId}`)
}

/**
 * 批量删除评论
 */
export async function deleteComments(commentIds: number[]): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: null,
      message: '删除成功'
    }
  }
  
  return apiPost<null>('/api/user/comments/batch-delete', { ids: commentIds })
}

/**
 * 获取目标内容的跳转链接
 */
export function getTargetUrl(type: CommentTargetType, id: number): string {
  switch (type) {
    case 'article': return `/article/${id}`
    case 'course': return `/learn/${id}`
    case 'video': return `/video/${id}`
    case 'product': return `/mall/product/${id}`
    case 'circle_post': return `/circle/post/${id}`
    case 'question': return `/qa/question/${id}`
    default: return '#'
  }
}

/**
 * 获取目标类型的中文名称
 */
export function getTargetTypeName(type: CommentTargetType): string {
  const names: Record<CommentTargetType, string> = {
    article: '文章',
    course: '课程',
    video: '视频',
    product: '商品',
    circle_post: '帖子',
    question: '问答'
  }
  return names[type] || '内容'
}

// ==================== 收到的评论相关 ====================

// Mock 数据 - 收到的评论
const mockReceivedComments: ReceivedCommentItem[] = [
  {
    id: 1001,
    content: '老师讲得非常清楚，终于搞懂了八字的基础概念！',
    createdAt: '2026-06-03 15:20',
    commenter: {
      id: 201,
      nickname: '易学初学者',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 2
    },
    myContent: {
      id: 101,
      type: 'article',
      title: '八字命理入门：如何看懂自己的命盘'
    },
    isReplied: false
  },
  {
    id: 1002,
    content: '请问老师，这个课程适合零基础的学员吗？',
    createdAt: '2026-06-03 10:45',
    commenter: {
      id: 202,
      nickname: '国学爱好者小王',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 3
    },
    myContent: {
      id: 201,
      type: 'course',
      title: '周易六爻预测实战课程'
    },
    isReplied: true,
    myReply: {
      content: '完全适合的，课程从基础讲起，循序渐进',
      createdAt: '2026-06-03 11:30'
    }
  },
  {
    id: 1003,
    content: '分享得太棒了，请问可以转载到我的公众号吗？会注明出处',
    createdAt: '2026-06-02 20:15',
    commenter: {
      id: 203,
      nickname: '传统文化传承者',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 5
    },
    myContent: {
      id: 301,
      type: 'circle_post',
      title: '我学习紫微斗数三年的心得体会'
    },
    isReplied: false
  },
  {
    id: 1004,
    content: '这个解答帮了我大忙，困扰很久的问题终于解决了',
    createdAt: '2026-06-02 14:30',
    commenter: {
      id: 204,
      nickname: '求知若渴',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 1
    },
    myContent: {
      id: 401,
      type: 'question',
      title: '关于八字中伤官见官的问题'
    },
    isReplied: true,
    myReply: {
      content: '很高兴能帮到你，有问题随时交流',
      createdAt: '2026-06-02 15:00'
    }
  },
  {
    id: 1005,
    content: '视频画质很好，讲解通俗易懂，期待更多内容',
    createdAt: '2026-06-01 18:00',
    commenter: {
      id: 205,
      nickname: '玄学新人',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 2
    },
    myContent: {
      id: 501,
      type: 'video',
      title: '三分钟学会看手相基础'
    },
    isReplied: false
  },
  {
    id: 1006,
    content: '收到货了，质量很好，谢谢老师推荐',
    createdAt: '2026-05-30 09:45',
    commenter: {
      id: 206,
      nickname: '风水学徒',
      avatar: '/placeholder.svg?height=40&width=40',
      level: 4
    },
    myContent: {
      id: 601,
      type: 'product',
      title: '专业风水罗盘（黄铜版）'
    },
    isReplied: true,
    myReply: {
      content: '感谢支持，有问题随时联系',
      createdAt: '2026-05-30 10:20'
    }
  }
]

/**
 * 获取收到的评论列表
 */
export async function getReceivedComments(
  page: number = 1, 
  pageSize: number = 20,
  filter: 'all' | 'unreplied' = 'all'
): Promise<ApiResponse<ReceivedCommentsResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 600))
    let filtered = mockReceivedComments
    if (filter === 'unreplied') {
      filtered = mockReceivedComments.filter(c => !c.isReplied)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const list = filtered.slice(start, end)
    return {
      code: 200,
      data: {
        list,
        total: filtered.length,
        unrepliedCount: mockReceivedComments.filter(c => !c.isReplied).length,
        hasMore: end < filtered.length
      },
      message: 'success'
    }
  }
  
  return apiGet<ReceivedCommentsResponse>('/api/user/received-comments', { page, pageSize, filter })
}

/**
 * 回复评论
 */
export async function replyComment(
  commentId: number, 
  content: string
): Promise<ApiResponse<{ replyId: number; createdAt: string }>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: {
        replyId: Date.now(),
        createdAt: new Date().toLocaleString('zh-CN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/\//g, '-')
      },
      message: '回复成功'
    }
  }
  
  return apiPost<{ replyId: number; createdAt: string }>(`/api/comments/${commentId}/reply`, { content })
}
