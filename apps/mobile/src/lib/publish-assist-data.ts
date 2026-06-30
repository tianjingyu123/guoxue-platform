/**
 * AI 发布辅助 data 层 —— 对接后端 ai-gateway/publish-assist
 * 端点前缀 /ai/publish/*，全部走真实 AI 网关（PublishAssistService）。
 * 返回结构严格对齐后端 service，不臆想字段。
 */
import { apiPost } from '@/utils/request'

/** POST /ai/publish/polish → { polished } */
export interface PolishResult {
  polished: string
}

/** POST /ai/publish/optimize-title → { titles } */
export interface TitleResult {
  titles: string[]
}

/** POST /ai/publish/suggest-tags → { tags } */
export interface TagsResult {
  tags: string[]
}

/**
 * POST /ai/publish/generate-cover
 * - 配置了腾讯云 AI 绘画：imageUrl 为 base64 data url（真实图）
 * - 未配置/失败：imageUrl=null + designPrompt（AI 生成的设计提示词文本）
 */
export interface CoverResult {
  imageUrl: string | null
  imageBase64?: string
  designPrompt?: string
  source: string
  message?: string
}

export const publishAssistApi = {
  /** AI 文字润色 */
  polish: (text: string) => apiPost<PolishResult>('/ai/publish/polish', { text }),
  /** AI 标题优化（返回 3 个候选标题） */
  optimizeTitle: (content: string) => apiPost<TitleResult>('/ai/publish/optimize-title', { content }),
  /** AI 标签推荐（返回 5 个标签） */
  suggestTags: (content: string) => apiPost<TagsResult>('/ai/publish/suggest-tags', { content }),
  /** AI 封面图生成 */
  generateCover: (prompt: string) => apiPost<CoverResult>('/ai/publish/generate-cover', { prompt }),
}
