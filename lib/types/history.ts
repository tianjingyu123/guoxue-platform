// 浏览历史相关类型定义

// 历史记录类型
export type HistoryItemType = 'course' | 'article' | 'product' | 'circle' | 'classic' | 'agent'

// 历史记录项
export interface HistoryItem {
  id: number
  type: HistoryItemType
  title: string
  subtitle: string
  image?: string
  time: string
  progress?: number         // 课程进度（仅课程类型）
}

// 历史记录分组（按日期）
export interface HistoryGroup {
  date: string
  items: HistoryItem[]
}
