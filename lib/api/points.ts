// 积分中心 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { PointsInfo, PointsTask, PointsHistoryItem, PointsExchangeItem } from '../types/points'

// ========== Mock 数据 ==========

const mockPointsInfo: PointsInfo = {
  balance: 2580,
  totalEarned: 5280,
  totalSpent: 2700,
  todayEarned: 15,
}

const mockPointsTasks: PointsTask[] = [
  { id: 1, title: '每日签到', points: 5, icon: 'Calendar', action: '去签到', limit: '每日1次', completed: false },
  { id: 2, title: '发布帖子', points: 10, icon: 'FileText', action: '去发布', limit: '每日3次', completed: false, current: 1, max: 3 },
  { id: 3, title: '发布文章', points: 30, icon: 'FileText', action: '去发布', limit: '每日1次', completed: true },
  { id: 4, title: '邀请好友注册', points: 100, icon: 'Users', action: '去邀请', limit: '无上限', completed: false },
  { id: 5, title: '购买课程/商品', points: 1, icon: 'ShoppingBag', action: '去购物', limit: '消费¥1=1积分', completed: false },
]

const mockPointsHistory: PointsHistoryItem[] = [
  { id: 1, title: '每日签到', points: 5, time: '今天 08:30', type: 'earn' },
  { id: 2, title: '发布帖子', points: 10, time: '今天 10:15', type: 'earn' },
  { id: 3, title: '兑换优惠券', points: -500, time: '昨天 14:20', type: 'spend' },
  { id: 4, title: '购买课程', points: 199, time: '昨天 09:00', type: 'earn' },
]

const mockExchangeItems: PointsExchangeItem[] = [
  { id: 1, type: 'coupon', title: '10元无门槛券', points: 500, icon: 'Ticket', stock: 100, color: 'text-primary' },
  { id: 2, type: 'coupon', title: '满100减20券', points: 800, icon: 'Ticket', stock: 50, color: 'text-primary' },
  { id: 3, type: 'coin', title: '50国学币', points: 500, icon: 'Coins', stock: 999, color: 'text-accent' },
  { id: 4, type: 'coin', title: '200国学币', points: 1800, icon: 'Coins', stock: 999, color: 'text-accent' },
  { id: 5, type: 'vip', title: '7天会员体验', points: 1000, icon: 'Crown', stock: 30, color: 'text-yellow-500' },
  { id: 6, type: 'gift', title: '国学书签套装', points: 2000, icon: 'Package', stock: 20, color: 'text-green-500' },
]

// ========== API 函数 ==========

// 获取积分信息
export async function getPointsInfo(): Promise<ApiResponse<PointsInfo>> {
  if (useMock()) {
    return { code: 200, data: mockPointsInfo, message: 'success' }
  }
  return apiGet<PointsInfo>('/user/points')
}

// 获取积分任务列表
export async function getPointsTasks(): Promise<ApiResponse<PointsTask[]>> {
  if (useMock()) {
    return { code: 200, data: mockPointsTasks, message: 'success' }
  }
  return apiGet<PointsTask[]>('/user/points/tasks')
}

// 获取积分历史记录
export async function getPointsHistory(page: number = 1, pageSize: number = 20): Promise<ApiResponse<PointsHistoryItem[]>> {
  if (useMock()) {
    return { code: 200, data: mockPointsHistory, message: 'success' }
  }
  return apiGet<PointsHistoryItem[]>('/user/points/history', { page, pageSize })
}

// 获取积分兑换商品列表
export async function getPointsExchangeItems(): Promise<ApiResponse<PointsExchangeItem[]>> {
  if (useMock()) {
    return { code: 200, data: mockExchangeItems, message: 'success' }
  }
  return apiGet<PointsExchangeItem[]>('/user/points/exchange')
}

// 兑换商品
export async function exchangePoints(itemId: number): Promise<ApiResponse<{ success: boolean; newBalance: number }>> {
  if (useMock()) {
    const item = mockExchangeItems.find(i => i.id === itemId)
    if (!item) {
      return { code: 404, data: { success: false, newBalance: mockPointsInfo.balance }, message: '商品不存在' }
    }
    if (mockPointsInfo.balance < item.points) {
      return { code: 400, data: { success: false, newBalance: mockPointsInfo.balance }, message: '积分不足' }
    }
    return { code: 200, data: { success: true, newBalance: mockPointsInfo.balance - item.points }, message: '兑换成功' }
  }
  return apiPost<{ success: boolean; newBalance: number }>('/user/points/exchange', { itemId })
}

// 完成任务
export async function completeTask(taskId: number): Promise<ApiResponse<{ success: boolean; points: number }>> {
  if (useMock()) {
    const task = mockPointsTasks.find(t => t.id === taskId)
    if (!task) {
      return { code: 404, data: { success: false, points: 0 }, message: '任务不存在' }
    }
    return { code: 200, data: { success: true, points: task.points }, message: '任务完成' }
  }
  return apiPost<{ success: boolean; points: number }>('/user/points/tasks/complete', { taskId })
}
