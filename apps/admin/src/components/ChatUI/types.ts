import type { CSSProperties } from 'vue'

/** 单条消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: ChatSource[]
  usage?: ChatUsage
  isStreaming?: boolean
  feedback?: 'like' | 'dislike' | null
  createdAt: Date | string
}

/** 参考来源 */
export interface ChatSource {
  index: number
  title: string
  excerpt: string
}

/** Token 用量 */
export interface ChatUsage {
  promptTokens?: number
  completionTokens?: number
}

/** SSE 事件格式 (StreamUnifierService) */
export interface SseChunk {
  type: 'chunk' | 'source' | 'done' | 'error'
  content?: string
  index?: number
  title?: string
  excerpt?: string
  message?: string
  usage?: ChatUsage
}

/** ChatUI 组件配置 */
export interface ChatUIConfig {
  /** SSE 流式端点 (POST) */
  apiEndpoint: string
  /** 非流式 fallback 端点 (POST, 可选) */
  fallbackEndpoint?: string
  /** 输入框占位符 */
  placeholder?: string
  /** 首次对话时自动发送的消息（如系统指令） */
  systemContext?: string
  /** 是否显示引用来源 */
  showSources?: boolean
  /** 是否显示反馈按钮 */
  showFeedback?: boolean
  /** 是否显示重试按钮 */
  showRetry?: boolean
  /** 欢迎消息 */
  welcomeMessage?: string
  /** 消息容器最大高度 */
  maxHeight?: string | number
  /** 自定义气泡样式 */
  bubbleStyle?: CSSProperties
  /** 额外的请求 body 字段 */
  extraBody?: Record<string, unknown>
}
