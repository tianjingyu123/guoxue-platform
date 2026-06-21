/**
 * 统一讨论 / 评价数据类型（母版系统）
 * 一套类型同时支撑「评论」与「带星评价」，定义国风差异化能力：
 * 认证标识、精选置顶、划线引用、楼中楼。
 */

export type DiscussionScene =
  | 'classic'
  | 'course'
  | 'article'
  | 'circle'
  | 'product'
  | 'live'

export type DiscussionMode = 'comment' | 'review'

export type AuthorBadge = 'none' | 'teacher' | 'official' | 'master' | 'vip'

export interface DiscussionAuthor {
  id: number | string
  name: string
  avatar?: string
  badge?: AuthorBadge
  level?: number
}

export interface DiscussionQuote {
  text: string
  source?: string
}

export interface DiscussionReply {
  id: number | string
  author: DiscussionAuthor
  content: string
  time: string
  likeCount: number
  liked?: boolean
  replyToName?: string
}

export interface DiscussionItem {
  id: number | string
  author: DiscussionAuthor
  content: string
  time: string
  likeCount: number
  liked?: boolean
  rating?: number
  featured?: boolean
  quote?: DiscussionQuote
  replies: DiscussionReply[]
  replyCount?: number
}

export interface DiscussionConfig {
  scene: DiscussionScene
  mode: DiscussionMode
  title: string
  accentColor?: string
  averageRating?: number
  placeholder?: string
}
