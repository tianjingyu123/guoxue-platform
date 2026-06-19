// 排盘工具相关类型

// 工具分类
export interface ToolCategory {
  name: string
  tools: ToolItem[]
}

// 工具项
export interface ToolItem {
  toolId: string
  name: string
  description: string
  icon?: string
  badge?: string | null
  color?: string
}

// 输入字段定义
export interface InputField {
  type: 'string' | 'number' | 'enum' | 'datetime' | 'boolean' | 'date' | 'time'
  label: string
  placeholder?: string
  required?: boolean
  values?: Array<{ value: string; label: string }>  // enum 类型使用
  min?: number  // number 类型使用
  max?: number  // number 类型使用
  default?: string | number | boolean
}

// 输入 Schema
export interface InputSchema {
  type: 'object'
  properties: Record<string, InputField>
  required: string[]
}

// 工具目录响应
export interface ToolsDirectoryResponse {
  categories: ToolCategory[]
}

// 计算结果响应（通用）
export interface CalculateResponse<T = unknown> {
  toolId: string
  input: Record<string, unknown>
  result: T
  calculatedAt: string
}

// 八字结果
export interface BaziResult {
  fourPillars: Array<{
    pillar: string
    heavenlyStem: string
    earthlyBranch: string
    element: string
    animal: string
  }>
  fiveElements: {
    wood: number
    fire: number
    earth: number
    metal: number
    water: number
  }
  dayMaster: string
  pattern: string
  strength: string
}
