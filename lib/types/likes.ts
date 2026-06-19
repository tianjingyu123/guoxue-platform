// 点赞目标类型
export type LikeTargetType = 'article' | 'course' | 'video' | 'product' | 'circle_post' | 'question' | 'answer' | 'comment'

// 点赞记录项
export interface LikeItem {
  id: number
  // 目标内容
  target: {
    id: number
    type: LikeTargetType
    title: string
    cover?: string
    // 作者信息
    author?: {
      id: number
      nickname: string
      avatar: string
    }
  }
  // 点赞时间
  createdAt: string
}

// 点赞记录列表响应
export interface MyLikesResponse {
  list: LikeItem[]
  total: number
  hasMore: boolean
}
