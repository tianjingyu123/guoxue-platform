/**
 * 平台智能体 data 层 —— 对接 GET /bots（真实 BotConfig 全局智能体列表）。
 * 严格按后端字段映射，原型臆想字段(评分/使用量/创建者/置顶)后端无→不映射、页面降级隐藏。
 */
import { apiGet } from '@/utils/request'

export interface BotItem {
  id: string
  name: string
  avatar: string
  intro: string
  type: string
  isFree: boolean
  price: number
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  BAZI: '八字命理',
  ZIWEI: '紫微斗数',
  FENGSHUI: '风水堪舆',
  QIMEN: '奇门遁甲',
  CUSTOMER_SERVICE: '智能客服',
  CIRCLE_ASSISTANT: '圈主助理',
  CONTENT_WRITER: '内容创作',
}

export function botTypeLabel(type: string): string {
  return TYPE_LABEL[type] || '通用助手'
}

/** 后端 BotConfig 原始响应（字段全 optional，仅声明 adapter 访问到的） */
interface RawBot { id?: string | number; name?: string; avatar?: string; intro?: string; type?: string; isFree?: boolean; price?: number | string; createdAt?: string }

export const botApi = {
  /** 智能体列表 GET /bots?type= */
  async list(type?: string): Promise<BotItem[]> {
    const res = await apiGet<RawBot[] | { rows?: RawBot[]; items?: RawBot[] }>(`/bots${type ? `?type=${encodeURIComponent(type)}` : ''}`)
    const arr = Array.isArray(res) ? res : (res?.rows ?? res?.items ?? [])
    return arr.map((b: RawBot) => ({
      id: String(b.id),
      name: b.name || '未命名智能体',
      avatar: b.avatar || '',
      intro: b.intro || '',
      type: b.type || '',
      isFree: b.isFree !== false && (b.price == null || Number(b.price) === 0),
      price: Number(b.price) || 0,
      createdAt: b.createdAt || '',
    }))
  },
}
