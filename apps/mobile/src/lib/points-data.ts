// 积分中心数据与类型（迁移自原型 /points 体系，1:1 还原 lib/api/points.ts 的 mock 数据）
import { apiGet, apiPost, useMock } from '@/utils/request'

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

// ========== Mock 数据 ==========

export const pointsInfo: PointsInfo = {
  balance: 2580,
  totalEarned: 5280,
  totalSpent: 2700,
  todayEarned: 15,
}

export const pointsTasks: PointsTask[] = [
  { id: 1, title: '每日签到', points: 5, icon: 'calendar', action: '去签到', limit: '每日1次', completed: false },
  { id: 2, title: '发布帖子', points: 10, icon: 'file-text', action: '去发布', limit: '每日3次', completed: false, current: 1, max: 3 },
  { id: 3, title: '发布文章', points: 30, icon: 'file-text', action: '去发布', limit: '每日1次', completed: true },
  { id: 4, title: '邀请好友注册', points: 100, icon: 'users', action: '去邀请', limit: '无上限', completed: false },
  { id: 5, title: '购买课程/商品', points: 1, icon: 'shopping-bag', action: '去购物', limit: '消费¥1=1积分', completed: false },
]

export const pointsHistory: PointsHistoryItem[] = [
  { id: 1, title: '每日签到', points: 5, time: '今天 08:30', type: 'earn' },
  { id: 2, title: '发布帖子', points: 10, time: '今天 10:15', type: 'earn' },
  { id: 3, title: '兑换优惠券', points: -500, time: '昨天 14:20', type: 'spend' },
  { id: 4, title: '购买课程', points: 199, time: '昨天 09:00', type: 'earn' },
]

// 后端 PointsProduct → 前端 PointsExchangeItem（type 大写→小写）
function adaptPointsProduct(p: any): PointsExchangeItem {
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
function formatPointsTime(v: any): string {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `昨天 ${hm}`
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${hm}`
}
function adaptPointsRecord(r: any): PointsHistoryItem {
  const amt = Number(r.amount ?? 0)
  const isEarn = String(r.type ?? '').toUpperCase() === 'EARN' || amt >= 0
  return {
    id: r.id,
    title: r.description || r.source || (isEarn ? '积分获取' : '积分消费'),
    points: amt,
    time: formatPointsTime(r.createdAt),
    type: isEarn ? 'earn' : 'spend',
  }
}

// ============ API 层 ============

export const pointsApi = {
  /** 获取积分信息 —— GET /users/me/points（后端 {balance,totalEarned,totalSpent}；今日获取后端无→0 降级） */
  async getInfo(): Promise<PointsInfo> {
    const p = await apiGet<{ balance?: number; totalEarned?: number; totalSpent?: number }>('/users/me/points')
    return {
      balance: Number(p.balance ?? 0),
      totalEarned: Number(p.totalEarned ?? 0),
      totalSpent: Number(p.totalSpent ?? 0),
      todayEarned: 0,
    }
  },

  /** 获取积分任务列表 —— GET /users/me/points/tasks（后端结构与前端 PointsTask 对齐） */
  async getTasks(): Promise<PointsTask[]> {
    const res = await apiGet<PointsTask[]>('/users/me/points/tasks')
    return Array.isArray(res) ? res : []
  },

  /** 获取积分历史 —— GET /users/me/points/records（后端 {items:PointsRecord[]} → 适配） */
  async getHistory(): Promise<PointsHistoryItem[]> {
    const res = await apiGet<{ items?: any[] } | any[]>('/users/me/points/records')
    const list = Array.isArray(res) ? res : (res?.items ?? [])
    return list.map(adaptPointsRecord)
  },

  /** 获取积分兑换商品 —— GET /users/me/points/products（积分商城真实商品） */
  async getExchangeItems(): Promise<PointsExchangeItem[]> {
    const res = await apiGet<any[]>('/users/me/points/products')
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
