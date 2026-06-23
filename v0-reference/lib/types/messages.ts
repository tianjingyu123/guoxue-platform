// 消息相关类型定义

// 消息类型
export type MessageType = 'interaction' | 'system' | 'income' | 'transaction' | 'service'

// 消息
export interface Message {
  id: number
  type: MessageType
  category: string
  title: string
  content: string
  avatar?: string
  time: string
  isRead: boolean
  link?: string
}

// 消息未读数统计
export interface MessageUnreadCounts {
  interaction: number
  system: number
  income: number
  transaction: number
  service: number
  total: number
}
