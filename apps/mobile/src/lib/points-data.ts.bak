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
  id: number
  title: string
  points: number // 正数为获取，负数为消费
  time: string
  type: 'earn' | 'spend'
}

// 积分兑换商品
export type ExchangeType = 'coupon' | 'coin' | 'vip' | 'gift'
export interface PointsExchangeItem {
  id: number
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

export const pointsExchangeItems: PointsExchangeItem[] = [
  { id: 1, type: 'coupon', title: '10元无门槛券', points: 500, icon: 'ticket', stock: 100, color: '#c9a96e' },
  { id: 2, type: 'coupon', title: '满100减20券', points: 800, icon: 'ticket', stock: 50, color: '#c9a96e' },
  { id: 3, type: 'coin', title: '50国学币', points: 500, icon: 'coins', stock: 999, color: '#d97706' },
  { id: 4, type: 'coin', title: '200国学币', points: 1800, icon: 'coins', stock: 999, color: '#d97706' },
  { id: 5, type: 'vip', title: '7天会员体验', points: 1000, icon: 'crown', stock: 30, color: '#eab308' },
  { id: 6, type: 'gift', title: '国学书签套装', points: 2000, icon: 'package', stock: 20, color: '#22c55e' },
]

export const exchangeTypeLabels: Record<ExchangeType, string> = {
  coupon: '优惠券',
  coin: '国学币',
  vip: '会员',
  gift: '实物',
}

// ============ API 层 ============

export const pointsApi = {
  /** 获取积分信息 */
  async getInfo(): Promise<PointsInfo> {
    if (useMock()) return pointsInfo
    try { return await apiGet<PointsInfo>('/points') } catch { return pointsInfo }
  },

  /** 获取积分任务列表 */
  async getTasks(): Promise<PointsTask[]> {
    if (useMock()) return pointsTasks
    try { return await apiGet<PointsTask[]>('/points/tasks') } catch { return pointsTasks }
  },

  /** 获取积分历史 */
  async getHistory(): Promise<PointsHistoryItem[]> {
    if (useMock()) return pointsHistory
    try { return await apiGet<PointsHistoryItem[]>('/points/history') } catch { return pointsHistory }
  },

  /** 获取积分兑换商品 */
  async getExchangeItems(): Promise<PointsExchangeItem[]> {
    if (useMock()) return pointsExchangeItems
    try { return await apiGet<PointsExchangeItem[]>('/points/exchange') } catch { return pointsExchangeItems }
  },

  /** 执行积分兑换 */
  async exchange(_itemId: number): Promise<{ success: boolean; message: string }> {
    if (useMock()) return { success: true, message: '兑换成功' }
    try { await apiPost(`/points/exchange/${_itemId}`, {}); return { success: true, message: '兑换成功' } } catch (e: any) { return { success: false, message: e?.message || '兑换失败' } }
  },
}
