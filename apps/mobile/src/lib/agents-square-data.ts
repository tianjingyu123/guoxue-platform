/**
 * AI 智能体广场数据层 —— 接真实后端 GET /bots、GET /bots/ranking。
 *
 * 数据真实性约定（铁律）：
 * - 后端 BotConfig 仅含 id/name/type/avatar/intro/isFree/price/voiceEnabled/createdAt 等，
 *   原型臆想字段（评分 rating / 使用量 useCount / 认证 isOfficial / 标签 tags 等）后端无 →
 *   一律降级隐藏（置为 undefined），页面 v-if 隐藏，绝不编造。
 * - 后端无对应端点的（热门问答 / 对话历史 / 常见问题）→ 返回空数组走空态，禁止返回 mock。
 * - 请求失败直接 throw，让页面走 error 态，禁止 catch 返回假数据兜底。
 */
import { apiGet } from '@/utils/request'
import { botTypeLabel } from './bot-data'

export interface SquareBot {
  id: string
  name: string
  avatar: string
  description: string
  category: string
  categoryName: string
  isFree: boolean
  price?: number
  capabilities: string[]
  /** 头像底色 */
  bgColor: string
  /** 上线 7 天内（由 createdAt 真实推导） */
  isNew?: boolean
  // ↓ 后端无、降级隐藏字段（保留可选以兼容页面，但永不赋值假数据）
  hotScore?: number
  useCount?: number
  rating?: number
  ratingCount?: number
  tags?: string[]
  isOfficial?: boolean
  isRecommended?: boolean
}

export interface SquareQuestion {
  id: string
  question: string
  botId: string
  botName: string
  botAvatar: string
  views: number
}

/** 对话历史（/agents/history） */
export interface AgentConversation {
  id: string
  /** Coze 会话 id（用于续聊） */
  conversationId: string
  /** 智能体 BotConfig id（用于跳转加载） */
  botConfigId: string
  agentName: string
  agentAvatar: string
  agentCategory: string
  lastMessage: string
  lastTime: string
  messageCount: number
  unread: number
}

/** 常见问题（/agents/questions） */
export interface AgentFAQ {
  id: string
  category: string
  question: string
  answer: string
}

/** 智能体热度榜（/agents/ranking） */
export interface RankingAgent {
  id: string
  name: string
  description: string
  avatar: string
  category: string
  // ↓ 后端无、降级隐藏字段
  users?: number
  sessions?: number
  rating?: number
  verified?: boolean
}

const PALETTE = ['#c41e3a', '#7c3aed', '#059669', '#ea580c', '#6366f1', '#0891b2']

function isWithin7Days(createdAt?: string): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  return !Number.isNaN(t) && Date.now() - t < 7 * 24 * 3600 * 1000
}

/** 会话时间格式化：当天显示时:分，否则显示月-日 */
function formatConvTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }
  const mo = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${mo}-${day}`
}

/* —— 后端原始响应类型（容错适配用，字段全 optional，仅声明 adapter 访问到的） —— */
interface RawBot { id?: string | number; name?: string; avatar?: string; intro?: string; type?: string; isFree?: boolean; price?: number | string; voiceEnabled?: boolean; createdAt?: string }
interface RawRankingBot { id?: string | number; name?: string; intro?: string; avatar?: string; type?: string }
interface RawConversation { conversationId?: string; botConfigId?: string; botName?: string; botAvatar?: string; botType?: string; lastMessage?: string; lastQuery?: string; lastTime?: string; messageCount?: number }

/** 兼容数组 / 分页信封返回 */
function unwrap<T = Record<string, unknown>>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const o = res as { rows?: T[]; items?: T[] } | null
  return o?.rows ?? o?.items ?? []
}

function mapSquareBot(b: RawBot, i: number): SquareBot {
  const type = b.type || ''
  const capabilities: string[] = []
  if (b.voiceEnabled) capabilities.push('语音对话')
  const price = b.price != null ? Number(b.price) : undefined
  return {
    id: String(b.id),
    name: b.name || '未命名智能体',
    avatar: b.avatar || '',
    description: b.intro || '',
    category: type,
    categoryName: botTypeLabel(type),
    isFree: b.isFree !== false && (price == null || price === 0),
    price,
    capabilities,
    bgColor: PALETTE[i % PALETTE.length],
    isNew: isWithin7Days(b.createdAt),
  }
}

/** 格式化数量（万） */
export function formatCount(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return num.toLocaleString()
}

// ============ API 层 ============

export const agentsSquareApi = {
  /** 广场智能体列表 —— GET /bots */
  async getHotBots(): Promise<SquareBot[]> {
    const res = await apiGet<unknown>('/bots')
    return unwrap<RawBot>(res).map(mapSquareBot)
  },

  /** 智能体热度榜 —— GET /bots/ranking */
  async getRanking(): Promise<RankingAgent[]> {
    const res = await apiGet<unknown>('/bots/ranking')
    return unwrap<RawRankingBot>(res).map((b: RawRankingBot) => ({
      id: String(b.id),
      name: b.name || '未命名智能体',
      description: b.intro || '',
      avatar: b.avatar || '',
      category: botTypeLabel(b.type || ''),
      // users/sessions/rating/verified 后端无 → 不赋值，页面隐藏
    }))
  },

  /** 热门问答 —— 后端无对应端点，返回空走空态 */
  async getHotQuestions(): Promise<SquareQuestion[]> {
    return []
  },

  /** 对话历史 —— GET /bots/my-conversations（按 conversationId 聚合的我的会话） */
  async getConversations(): Promise<AgentConversation[]> {
    const res = await apiGet<unknown>('/bots/my-conversations')
    return unwrap<RawConversation>(res).map((c: RawConversation) => ({
      id: String(c.conversationId),
      conversationId: String(c.conversationId),
      botConfigId: String(c.botConfigId),
      agentName: c.botName || '智能体',
      agentAvatar: c.botAvatar || '',
      agentCategory: botTypeLabel(c.botType || ''),
      lastMessage: c.lastMessage || c.lastQuery || '',
      lastTime: formatConvTime(c.lastTime),
      messageCount: Number(c.messageCount) || 0,
      unread: 0,
    }))
  },

  /** 常见问题 —— 后端无对应端点，返回空走空态 */
  async getFaqs(): Promise<AgentFAQ[]> {
    return []
  },
}
