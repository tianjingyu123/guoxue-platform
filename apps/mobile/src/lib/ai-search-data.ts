/**
 * AI 智能搜索 data 层 —— 接后端 POST /search/ai（真实 AI 网关问答）。
 * 后端仅返回 AI 回答文本(answer)，不返回结构化推荐结果，故组件不展示推荐(降级，不造假)。
 */
import { apiPost } from '@/utils/request'

export interface AiSearchAnswer {
  answer: string
  query: string
}

export const aiSearchApi = {
  /** AI 智能搜索问答 POST /search/ai */
  query: (q: string) => apiPost<AiSearchAnswer>('/search/ai', { query: q }),
}
