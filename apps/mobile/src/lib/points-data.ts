// 积分中心数据与类型（生产数据全部来自后端积分流水）
import { apiGet, apiPost } from '@/utils/request'

// 积分信息
export interface PointsInfo {
  balance: number // 当前积分余额
  totalEarned: number // 累计获取
  totalSpent: number // 累计使用
  todayEarned: number // 今日获取
}

// 积分任务
export interface PointsTask {
  id: number
  title: string
  points: number
  icon: string // 图标名称
  action: string // 按钮文字
  limit: string // 限制说明
  completed: boolean
  current?: number // 当前进度
  max?: number // 最大次数
}

// 积分历史记录
export interface PointsHistoryItem {
  id: number | string
  title: string
  points: number // 正数为获取，负数为消费
  time: string
  type: 'earn' | 'spend'
}

// 积分兑换商品
export type ExchangeType = 'coupon' | 'coin' | 'vip' | 'gift'
export interface PointsExchangeItem {
  id: string
  type: ExchangeType
  title: string
  points: number // 所需积分
  icon: string // 图标名称
  stock: number // 库存
  color: string // 图标颜色
}

/* —— 后端原始响应类型（容错适配用，字段全 optional） —— */
interface RawPointsProduct { id?: string | number; type?: string; title?: string; points?: number | string; icon?: string; stock?: number | string; color?: string }
interface RawPointsRecord { id?: number | string; amount?: number | string; type?: string; description?: string; source?: string; createdAt?: string }

// 后端 PointsProduct → 前端 PointsExchangeItem（type 大写→小写）
function adaptPointsProduct(p: RawPointsProduct): PointsExchangeItem {
  return {
    id: String(p.id),
    type: String(p.type || '').toLowerCase() as ExchangeType,
    title: p.title || '',
    points: Number(p.points ?? 0),
    icon: p.icon || 'gift',
    stock: Number(p.stock ?? 0),
    color: p.color || '#c9a96e',
  }
}

export const exchangeTypeLabels: Record<ExchangeType, string> = {
  coupon: '优惠券',
  coin: '国学币',
  vip: '会员',
  gift: '实物',
}

// ============ 适配（后端 PointsRecord → 前端 PointsHistoryItem）============
function formatPointsTime(v?: string): string {
  const d = new Date(v ?? '')
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `昨天 ${hm}`
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${hm}`
}
function adaptPointsRecord(r: RawPointsRecord): PointsHistoryItem {
  const amt = Number(r.amount ?? 0)
  const isEarn = String(r.type ?? '').toUpperCase() === 'EARN' || amt >= 0
  return {
    id: r.id ?? '',
    title: r.description || r.source || (isEarn ? '积分获取' : '积分消费'),
    points: amt,
    time: formatPointsTime(r.createdAt),
    type: isEarn ? 'earn' : 'spend',
  }
}

// ============ API 层 ============

export const pointsApi = {
  /** 获取积分信息 —— GET /users/me/points（余额、累计与北京时间今日获取均为真实流水口径） */
  async getInfo(): Promise<PointsInfo> {
    const p = await apiGet<{ balance?: number; totalEarned?: number; totalSpent?: number; todayEarned?: number }>('/users/me/points')
    return {
      balance: Number(p.balance ?? 0),
      totalEarned: Number(p.totalEarned ?? 0),
      totalSpent: Number(p.totalSpent ?? 0),
      todayEarned: Number(p.todayEarned ?? 0),
    }
  },

  /** 获取积分任务列表 —— GET /users/me/points/tasks（后端结构与前端 PointsTask 对齐） */
  async getTasks(): Promise<PointsTask[]> {
    const res = await apiGet<PointsTask[]>('/users/me/points/tasks')
    return Array.isArray(res) ? res : []
  },

  /** 获取积分历史 —— GET /users/me/points/records（后端 {items:PointsRecord[]} → 适配） */
  async getHistory(): Promise<PointsHistoryItem[]> {
    const res = await apiGet<{ items?: RawPointsRecord[] } | RawPointsRecord[]>('/users/me/points/records')
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    return list.map(adaptPointsRecord)
  },

  /** 获取积分兑换商品 —— GET /users/me/points/products（积分商城真实商品） */
  async getExchangeItems(): Promise<PointsExchangeItem[]> {
    const res = await apiGet<RawPointsProduct[]>('/users/me/points/products')
    return Array.isArray(res) ? res.map(adaptPointsProduct) : []
  },

  /** 执行积分兑换 —— POST /users/me/points/exchange（事务扣积分+减库存+建兑换记录，奖励由系统发放） */
  async exchange(_productId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiPost<{ reward?: string }>('/users/me/points/exchange', { productId: _productId })
      return { success: true, message: res?.reward || '兑换成功' }
    } catch (e: any) {
      return { success: false, message: e?.message || '兑换失败' }
    }
  },
}
