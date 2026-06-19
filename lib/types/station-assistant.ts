// 站长助理相关类型定义

// 消息角色
export type AssistantMessageRole = 'user' | 'assistant' | 'system'

// 消息类型
export type AssistantMessageType = 'text' | 'chart' | 'table' | 'action'

// 图表数据
export interface ChartData {
  type: 'line' | 'bar' | 'pie'
  title: string
  data: Array<{
    label: string
    value: number
    color?: string
  }>
}

// 表格数据
export interface TableData {
  title: string
  headers: string[]
  rows: Array<string[]>
}

// 操作建议
export interface ActionSuggestion {
  title: string
  description: string
  link?: string
  priority: 'high' | 'medium' | 'low'
}

// 助理消息
export interface AssistantMessage {
  id: string
  role: AssistantMessageRole
  type: AssistantMessageType
  content: string
  // 图表数据
  chart?: ChartData
  // 表格数据
  table?: TableData
  // 操作建议
  actions?: ActionSuggestion[]
  // 引用链接
  references?: Array<{
    title: string
    url: string
  }>
  createdAt: string
  isStreaming?: boolean
}

// 助理配置
export interface StationAssistantConfig {
  name: string
  avatar: string
  welcomeMessage: string
  suggestions: Array<{
    id: string
    text: string
    category: 'data' | 'operation' | 'promotion' | 'team'
  }>
  capabilities: string[]
}

// 会话信息
export interface AssistantSession {
  id: string
  messages: AssistantMessage[]
  createdAt: string
  updatedAt: string
}

// 流式回调
export interface AssistantStreamCallbacks {
  onStart?: () => void
  onToken?: (token: string) => void
  onChart?: (chart: ChartData) => void
  onTable?: (table: TableData) => void
  onActions?: (actions: ActionSuggestion[]) => void
  onComplete?: (message: AssistantMessage) => void
  onError?: (error: Error) => void
}
