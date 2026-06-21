// 智能客服相关类型定义

// 消息角色
export type CSMessageRole = 'user' | 'assistant' | 'system' | 'human'

// 消息类型
export type CSMessageType = 'text' | 'image' | 'suggestions' | 'transfer' | 'rating'

// 知识引用
export interface KnowledgeReference {
  id: number
  title: string
  url: string
  snippet: string
}

// 客服消息
export interface CSMessage {
  id: string
  role: CSMessageRole
  type: CSMessageType
  content: string
  // 图片
  image?: {
    url: string
    thumbnail?: string
  }
  // 知识引用
  references?: KnowledgeReference[]
  // 推荐问题
  suggestions?: string[]
  // 转人工信息
  transfer?: {
    queuePosition: number
    estimatedWait: string
    humanName?: string
    humanAvatar?: string
  }
  // 满意度评价
  rating?: {
    value: 'positive' | 'negative' | null
    comment?: string
  }
  createdAt: string
  isStreaming?: boolean
}

// 客服配置
export interface CSConfig {
  welcomeMessage: string
  suggestions: string[]
  workingHours: string
  isHumanAvailable: boolean
  currentQueueCount: number
}

// 会话状态
export type CSSessionStatus = 'ai' | 'waiting' | 'human' | 'closed'

// 客服会话
export interface CSSession {
  id: string
  status: CSSessionStatus
  messages: CSMessage[]
  humanAgent?: {
    id: number
    name: string
    avatar: string
  }
  createdAt: string
  updatedAt: string
}

// 满意度评价请求
export interface RatingRequest {
  sessionId: string
  messageId: string
  value: 'positive' | 'negative'
  comment?: string
}
