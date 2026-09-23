/**
 * AI 智能搜索 data 层 —— 接后端 POST /search/ai（真实 AI 网关问答）。
 * 回答和导览卡片由后端共同返回；模型故障时可单独读取已发布内容导览。
 */
import { apiGet, apiPostOptionalAuth } from '@/utils/request'

export type AiGuideCardType = 'classic' | 'article' | 'course' | 'circle' | 'content' | 'video'

export interface AiGuideCard {
  type: AiGuideCardType
  id: string
  title: string
  subtitle?: string
  cover?: string
  price?: number
  target: string
}

export interface AiSearchAnswer {
  answer: string
  query: string
  cards?: AiGuideCard[]
}

export const aiSearchApi = {
  /** AI 智能搜索问答 POST /search/ai */
  query: (q: string) => apiPostOptionalAuth<AiSearchAnswer>('/search/ai', { query: q }),
  guide: (q: string) => apiGet<{ query: string; cards: AiGuideCard[] }>(`/search/guide?q=${encodeURIComponent(q)}&topK=4`),
}
