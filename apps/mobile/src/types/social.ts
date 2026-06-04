/**
 * 社交互动类型定义（点赞/评论/收藏/关注）
 * 基于后端 API /interaction/** 端点
 */

/** 点赞目标类型 */
export type LikeTargetType = 'article' | 'course' | 'video' | 'product' | 'circle_post' | 'question' | 'answer' | 'comment'

/** 点赞切换响应 */
export interface LikeToggleResponse {
  isLiked: boolean
  likeCount: number
}

/** 点赞记录 */
export interface LikeItem {
  id: string
  targetType: LikeTargetType
  targetId: string
  target?: {
    id: string
    title: string
    cover?: string
    author?: {
      id: string
      nickname: string
      avatar: string
    }
  }
  createdAt: string
}

// ==================== 评论 ====================

/** 评论目标类型 */
export type CommentTargetType = 'article' | 'course' | 'video' | 'product' | 'circle_post' | 'question'

/** 评论项 */
export interface CommentItem {
  id: string
  targetType: string
  targetId: string
  content: string
  author: {
    id: string
    nickname: string
    avatar: string
  }
  replyTo?: {              // 回复目标
    id: string
    nickname: string
  }
  parentId?: string        // 父评论ID
  likeCount: number
  isLiked?: boolean
  children?: CommentItem[] // 子回复
  createdAt: string
  updatedAt?: string
}

/** 创建评论请求 */
export interface CreateCommentRequest {
  targetType: string
  targetId: string
  content: string
  parentId?: string
  replyToId?: string
}

/** 我的评论列表 */
export interface MyCommentItem {
  id: string
  content: string
  createdAt: string
  target: {
    id: string
    type: CommentTargetType
    title: string
    cover?: string
  }
  likeCount: number
  replyCount: number
  hasReply: boolean
}

/** 收到的评论 */
export interface ReceivedCommentItem {
  id: string
  content: string
  createdAt: string
  commenter: {
    id: string
    nickname: string
    avatar: string
  }
  myContent: {
    id: string
    type: CommentTargetType
    title: string
    cover?: string
  }
  isReplied: boolean
  myReply?: {
    content: string
    createdAt: string
  }
}

// ==================== 收藏 ====================

/** 收藏类型 */
export type CollectTargetType = 'course' | 'circle' | 'article' | 'product' | 'live' | 'teacher' | 'video'

/** 收藏切换响应 */
export interface CollectToggleResponse {
  isCollected: boolean
}

/** 收藏项 */
export interface CollectItem {
  id: string
  targetType: CollectTargetType
  targetId: string
  title: string
  subtitle?: string
  cover?: string
  price?: number
  originalPrice?: number
  collectedAt: string
  author?: string
  extra?: Record<string, any>
  isInvalid?: boolean
}

/** 收藏统计 */
export interface CollectStats {
  total: number
  course: number
  circle: number
  article: number
  product: number
  live: number
  video: number
  teacher: number
}

// ==================== 关注 ====================

/** 用户简要信息（关注列表用） */
export interface FollowUser {
  id: string
  nickname: string
  avatar: string
  bio?: string
  isVip?: boolean
  isVerified?: boolean
  isFollowed?: boolean      // 是否互关
  followedAt?: string       // 关注时间
}

/** 粉丝/关注列表中的统计 */
export interface FollowUserWithStats extends FollowUser {
  followerCount?: number
  followingCount?: number
  articleCount?: number
}

// ==================== 举报 ====================

/** 举报请求 */
export interface ReportRequest {
  targetType: string
  targetId: string
  reason: string
  description?: string
}

/** 举报统计 */
export interface ReportStats {
  total: number
  resolved: number
  pending: number
}

// ==================== 浏览历史 ====================

/** 浏览历史 */
export interface BrowseHistoryItem {
  id: string
  targetType: string
  targetId: string
  title: string
  cover?: string
  url?: string
  lastVisitAt: string
  visitCount: number
}
