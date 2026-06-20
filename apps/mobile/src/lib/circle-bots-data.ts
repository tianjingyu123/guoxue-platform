/**
 * 圈子智能体数据（从原型 lib/api/circle-bots.ts + types/circle-bots.ts 迁移）
 * 含 mock 数据 + 排序/搜索逻辑 + 使用次数格式化。
 */
import { apiGet, useMock } from '@/utils/request'

export interface CircleSummary {
  id: number
  name: string
  icon: string
  description: string
  memberCount: number
  isAdmin: boolean
  isOwner: boolean
}

export interface CircleBotItem {
  id: number
  name: string
  avatar: string
  description: string
  rating: number
  price: number
  tags: string[]
  isNew: boolean
  circleId: number
  creator: { id: number; nickname: string; avatar: string }
  usageCount: number
  lastActiveAt: string
  isPinned: boolean
  isOfficial: boolean
}

export type SortBy = 'hot' | 'new' | 'usage'

const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
const C_AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

export const circleSummary: CircleSummary = {
  id: 1,
  name: '八字命理研习社',
  icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=1',
  description: '专注于八字命理学习与交流，汇聚众多命理爱好者',
  memberCount: 12580,
  isAdmin: true,
  isOwner: false,
}

export const circleBots: CircleBotItem[] = [
  { id: 101, name: '八字速排助手', avatar: AVATAR('paipan'), description: '快速排出八字命盘，支持阴阳历转换，自动计算大运流年', rating: 4.9, price: 0, tags: ['八字', '排盘', '免费'], isNew: false, circleId: 1, creator: { id: 1001, nickname: '圈主·易道玄', avatar: C_AVATAR('yidao') }, usageCount: 28500, lastActiveAt: '2026-06-03 10:30', isPinned: true, isOfficial: true },
  { id: 102, name: '日柱分析师', avatar: AVATAR('rizhu'), description: '专注于日柱深度解读，分析日主性格特征与人生走势', rating: 4.8, price: 0, tags: ['日柱', '性格', '分析'], isNew: false, circleId: 1, creator: { id: 1002, nickname: '管理员·天机子', avatar: C_AVATAR('tianji') }, usageCount: 15600, lastActiveAt: '2026-06-03 09:15', isPinned: true, isOfficial: false },
  { id: 103, name: '流年运势预测', avatar: AVATAR('liunian'), description: '根据八字推算流年运势，提供全年各月运势详解', rating: 4.7, price: 10, tags: ['流年', '运势', '付费'], isNew: false, circleId: 1, creator: { id: 1001, nickname: '圈主·易道玄', avatar: C_AVATAR('yidao') }, usageCount: 12300, lastActiveAt: '2026-06-02 18:45', isPinned: false, isOfficial: true },
  { id: 104, name: '合婚配对分析', avatar: AVATAR('hehun'), description: '根据双方八字分析婚姻契合度，提供相处建议', rating: 4.6, price: 20, tags: ['合婚', '配对', '婚姻'], isNew: false, circleId: 1, creator: { id: 1003, nickname: '成员·紫微星', avatar: C_AVATAR('ziwei') }, usageCount: 9800, lastActiveAt: '2026-06-01 14:20', isPinned: false, isOfficial: false },
  { id: 105, name: '事业运分析官', avatar: AVATAR('shiye'), description: '深度分析八字中的事业宫位，指导职业发展方向', rating: 4.8, price: 15, tags: ['事业', '职业', '发展'], isNew: true, circleId: 1, creator: { id: 1002, nickname: '管理员·天机子', avatar: C_AVATAR('tianji') }, usageCount: 8500, lastActiveAt: '2026-06-03 08:00', isPinned: false, isOfficial: false },
  { id: 106, name: '五行调理顾问', avatar: AVATAR('wuxing'), description: '分析八字五行强弱，提供日常调理和补救建议', rating: 4.5, price: 0, tags: ['五行', '调理', '免费'], isNew: true, circleId: 1, creator: { id: 1004, nickname: '成员·玄易居士', avatar: C_AVATAR('xuanyi') }, usageCount: 6200, lastActiveAt: '2026-05-30 16:30', isPinned: false, isOfficial: false },
]

/** 按关键词 + 排序过滤（置顶优先），1:1 还原原型 getCircleBots 逻辑 */
export function queryBots(keyword: string, sortBy: SortBy): CircleBotItem[] {
  let list = [...circleBots]
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter(
      (b) =>
        b.name.toLowerCase().includes(kw) ||
        b.description.toLowerCase().includes(kw) ||
        b.tags.some((t) => t.toLowerCase().includes(kw)),
    )
  }
  if (sortBy === 'hot' || sortBy === 'usage') {
    list.sort((a, b) => b.usageCount - a.usageCount)
  } else if (sortBy === 'new') {
    list.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
  }
  list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  return list
}

export function formatUsageCount(count: number): string {
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

export const circleBotsApi = {
  /** 获取圈子智能体列表 */
  async list(circleId: number, keyword?: string, sortBy: SortBy = 'hot') {
    if (useMock()) return queryBots(keyword || '', sortBy)
    try {
      const qs = new URLSearchParams({ sortBy, ...(keyword ? { keyword } : {}) }).toString()
      const data = await apiGet<any[]>(`/bots/circle/${circleId}?${qs}`)
      return data as CircleBotItem[]
    } catch { return queryBots(keyword || '', sortBy) }
  },

  /** 获取圈子智能体详情 */
  async detail(botId: number) {
    if (useMock()) return circleBots.find(b => b.id === botId) || circleBots[0]
    try {
      return await apiGet<CircleBotItem>(`/bots/${botId}`)
    } catch { return circleBots.find(b => b.id === botId) || circleBots[0] }
  },

  /** 获取圈子摘要信息 */
  async summary(circleId: number): Promise<CircleSummary> {
    if (useMock()) return { ...circleSummary }
    try {
      return await apiGet<CircleSummary>(`/circles/${circleId}/summary`)
    } catch { return { ...circleSummary } }
  },
}
