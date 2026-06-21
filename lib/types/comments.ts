/**
 * 评论相关类型定义
 */

// 评论目标内容类型
export type CommentTargetType = 'article' | 'course' | 'video' | 'product' | 'circle_post' | 'question'

// 评论项
export interface CommentItem {
  id: number
  // 评论内容
  content: string
  // 评论时间
  createdAt: string
  // 目标内容
  target: {
    id: number
    type: CommentTargetType
    title: string
    cover?: string
  }
  // 互动数据
  likeCount: number
  replyCount: number
  // 是否被回复
  hasReply: boolean
}

// 我的评论列表响应
export interface MyCommentsResponse {
  list: CommentItem[]
  total: number
  hasMore: boolean
}

// 收到的评论项（他人对我内容的评论）
export interface ReceivedCommentItem {
  id: number
  // 评论内容
  content: string
  // 评论时间
  createdAt: string
  // 评论者信息
  commenter: {
    id: number
    nickname: string
    avatar: string
    level?: number
  }
  // 我的被评论内容
  myContent: {
    id: number
    type: CommentTargetType
    title: string
    cover?: string
  }
  // 是否已回复
  isReplied: boolean
  // 我的回复内容（如果有）
  myReply?: {
    content: string
    createdAt: string
  }
}

// 收到的评论列表响应
export interface ReceivedCommentsResponse {
  list: ReceivedCommentItem[]
  total: number
  unrepliedCount: number
  hasMore: boolean
}
