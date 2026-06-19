// AI 封面图生成相关类型

// 封面风格
export type CoverStyle = 
  | 'traditional'      // 传统国风
  | 'ink'              // 水墨风
  | 'minimalist'       // 简约现代
  | 'vintage'          // 复古怀旧
  | 'gradient'         // 渐变色彩
  | 'illustration'     // 插画风格

// 封面尺寸
export type CoverSize = '16:9' | '4:3' | '1:1' | '3:4'

// 生成请求参数
export interface CoverGenerateRequest {
  // 内容标题
  title: string
  // 内容摘要
  summary?: string
  // 用户自定义 Prompt
  prompt?: string
  // 风格
  style: CoverStyle
  // 尺寸
  size: CoverSize
  // 生成数量
  count: number
}

// 生成结果
export interface CoverGenerateResult {
  id: string
  url: string
  prompt: string
  style: CoverStyle
  size: CoverSize
  createdAt: string
}

// 生成响应
export interface CoverGenerateResponse {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results: CoverGenerateResult[]
  errorMessage?: string
}

// 风格选项
export interface CoverStyleOption {
  value: CoverStyle
  label: string
  description: string
  preview: string
}

// 历史记录
export interface CoverHistoryItem {
  id: string
  title: string
  results: CoverGenerateResult[]
  selectedId?: string
  createdAt: string
}
