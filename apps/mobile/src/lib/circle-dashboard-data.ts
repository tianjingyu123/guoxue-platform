/**
 * 圈主数据看板 API 层（dashboard.vue 专用）
 * 全部真连后端 /api/v1；apiGet 已自动加 token + 剥信封。
 *
 * 后端可得字段（严格按真实返回 adapt，无来源的指标一律不提供 → 页面降级隐藏）：
 * - GET /circle-backend/overview  → { circle, memberCount, activeMembers, monthNewMembers }
 *     注意：后端不返回任何同比增长率，也无 totalPosts/totalRevenue → KPI 仅成员数/活跃/本月新增。
 * - GET /circle-backend/revenue   → { totalAmount, totalGuestPayouts, ownerRevenue, totalTransactions, period }
 *     金额单位：后端 circleGuestEarning.amount / earned 为 Prisma Decimal（元），Number() 后直接展示，不二次换算。
 * - GET /circles/:id/leaderboard?pageSize=5 → { items:[{userId,nickname,avatar,contributionScore,postCount,rank}], ... }
 *     无点赞数字段 → likes 不提供。
 * - GET /circles/:id/hot-content?limit=5    → [{ id,title,user:{nickname},likeCount,commentCount,hotScore,createdAt }]
 *     无浏览量字段 → views 不提供。
 *
 * 后端无「近30天趋势」与「流失预警」端点 → 页面整块删除，绝不用随机数/假数据填充。
 */
import { apiGet } from '@/utils/request'

// ─── 视图模型类型 ───

/** 概览 KPI（仅后端真实可得字段；无增长率来源，故不含 growth） */
export interface DashboardOverview {
  memberCount: number
  activeMembers: number
  monthNewMembers: number
}

/** 收益概览（金额单位：元，直接展示） */
export interface DashboardRevenue {
  totalAmount: number
  totalGuestPayouts: number
  ownerRevenue: number
  totalTransactions: number
  period: string
}

/** 活跃贡献者（按发帖量排名） */
export interface DashboardContributor {
  userId: string
  name: string
  avatar: string
  postCount: number
}

/** 热门内容 */
export interface DashboardHotPost {
  id: string
  title: string
  authorName: string
  likeCount: number
  commentCount: number
}

// ─── 后端原始返回类型（仅声明本层用到的字段） ───
interface RawOverview {
  memberCount?: number
  activeMembers?: number
  monthNewMembers?: number
}
interface RawRevenue {
  totalAmount?: number | string
  totalGuestPayouts?: number | string
  ownerRevenue?: number | string
  totalTransactions?: number
  period?: string
}
interface RawLeaderboardItem {
  userId?: string
  nickname?: string
  avatar?: string | null
  postCount?: number
}
interface RawHotPost {
  id?: string
  title?: string
  user?: { nickname?: string | null } | null
  likeCount?: number
  commentCount?: number
}

// ─── 工具 ───
const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? (n as number) : 0
}

// ─── API ───
export const dashboardApi = {
  /** 概览 KPI（不传 circleId，后端取当前圈主的圈子） */
  async overview(): Promise<DashboardOverview> {
    const raw = await apiGet<RawOverview>('/circle-backend/overview')
    return {
      memberCount: num(raw?.memberCount),
      activeMembers: num(raw?.activeMembers),
      monthNewMembers: num(raw?.monthNewMembers),
    }
  },

  /** 收益概览（不传 circleId） */
  async revenue(): Promise<DashboardRevenue> {
    const raw = await apiGet<RawRevenue>('/circle-backend/revenue')
    return {
      totalAmount: num(raw?.totalAmount),
      totalGuestPayouts: num(raw?.totalGuestPayouts),
      ownerRevenue: num(raw?.ownerRevenue),
      totalTransactions: num(raw?.totalTransactions),
      period: raw?.period || '',
    }
  },

  /** 活跃贡献者 TOP5（需 circleId） */
  async contributors(circleId: string, pageSize = 5): Promise<DashboardContributor[]> {
    const raw = await apiGet<{ items?: RawLeaderboardItem[] } | RawLeaderboardItem[]>(
      `/circles/${circleId}/leaderboard?pageSize=${pageSize}`,
    )
    const items = Array.isArray(raw) ? raw : raw?.items || []
    return items.map((it) => ({
      userId: it.userId || '',
      name: it.nickname || '匿名用户',
      avatar: it.avatar || '',
      postCount: num(it.postCount),
    }))
  },

  /** 热门内容 TOP5（需 circleId） */
  async hotContent(circleId: string, limit = 5): Promise<DashboardHotPost[]> {
    const raw = await apiGet<RawHotPost[]>(`/circles/${circleId}/hot-content?limit=${limit}`)
    const list = Array.isArray(raw) ? raw : []
    return list.map((p) => ({
      id: p.id || '',
      title: p.title || '无标题',
      authorName: p.user?.nickname || '匿名用户',
      likeCount: num(p.likeCount),
      commentCount: num(p.commentCount),
    }))
  },
}
