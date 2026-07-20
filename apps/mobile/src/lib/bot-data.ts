/**
 * 平台智能体 data 层 —— 对接 GET /bots（真实 BotConfig 全局智能体列表）。
 * 严格按后端字段映射，原型臆想字段(评分/使用量/创建者/置顶)后端无→不映射、页面降级隐藏。
 */
import { apiGet, apiGetOptionalAuth, apiPost } from '@/utils/request'

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

/**
 * 我的追问额度（GET /bots/:id/quota 契约）
 * pricePer10Coin=0 表示该智能体免费不限（不走追问包计费）
 */
export interface BotQuota {
  /** 是否会员免费畅享 */
  memberFree: boolean
  /** 追问包定价（国学币/10次），0=免费不限 */
  pricePer10Coin: number
  /** 每用户免费试用总次数 */
  freeUses: number
  /** 已用免费试用次数 */
  freeUsed: number
  /** 追问包剩余次数 */
  paidRemaining: number
}

/** 购买追问包响应（POST /bots/:id/purchase-uses 契约） */
export interface PurchaseUsesResult {
  /** 本次到账次数（固定 10） */
  purchased: number
  /** 购买后追问包剩余次数 */
  paidRemaining: number
}

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

  /** 我的追问额度 GET /bots/:id/quota（会员免费/试用剩余/追问包余量/定价） */
  async getQuota(id: string, optionalAuth = false): Promise<BotQuota> {
    const path = `/bots/${id}/quota`
    const q = optionalAuth
      ? await apiGetOptionalAuth<Partial<BotQuota>>(path)
      : await apiGet<Partial<BotQuota>>(path)
    return {
      memberFree: !!q?.memberFree,
      pricePer10Coin: Number(q?.pricePer10Coin) || 0,
      freeUses: Number(q?.freeUses) || 0,
      freeUsed: Number(q?.freeUsed) || 0,
      paidRemaining: Number(q?.paidRemaining) || 0,
    }
  },

  /** 购买追问包 POST /bots/:id/purchase-uses（10次/包·扣国学币，余额不足由后端抛错） */
  async purchaseUses(id: string): Promise<PurchaseUsesResult> {
    const res = await apiPost<Partial<PurchaseUsesResult>>(`/bots/${id}/purchase-uses`, {})
    return {
      purchased: Number(res?.purchased) || 0,
      paidRemaining: Number(res?.paidRemaining) || 0,
    }
  },
}
