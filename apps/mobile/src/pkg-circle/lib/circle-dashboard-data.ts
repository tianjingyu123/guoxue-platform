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
 * - GET /circles/:id/dashboard/trends            → { trends: [{ date, newMembers, revenue }] }（近30天，仅含有数据的日期）
 * - GET /circles/:id/dashboard/churn-warning     → { atRisk: [{ userId,nickname,avatar }], count }（近14天不活跃成员）
 * - GET /circles/:id/dashboard/pending-questions → { questions: [{ id,questionTitle,question,priceCoin,createdAt,asker:{id,nickname} }] }
 *     后端无「不活跃天数」逐人字段 → 仅展示名单与总数，不编造天数。
 * - GET /circles/:id/dashboard/members-insight?page&pageSize → { customers: [成员画像], total }
 *     画像聚合复用后端公共 InsightService（同站长客户洞察），额外带 role 圈内角色；排除圈主本人。
 * - GET /circles/:id/dashboard/members-insight/:userId/timeline → { events: [{ action,path,summary,occurredAt }] }
 *     summary 已是后端人话摘要；仅本圈成员可查，越权 403。
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

/** 近30天趋势单日数据点 */
export interface DashboardTrendPoint {
  /** 日期（YYYY-MM-DD） */
  date: string
  /** 当日新增成员数 */
  newMembers: number
  /** 当日入圈费收入（元） */
  revenue: number
}

/** 流失预警成员 */
export interface DashboardChurnMember {
  userId: string
  name: string
  avatar: string
}

/** 流失预警（近14天无发帖/评论的成员） */
export interface DashboardChurnWarning {
  /** 预警成员名单（后端最多返回 20 人） */
  atRisk: DashboardChurnMember[]
  /** 不活跃成员总数 */
  count: number
}

/** 待回复付费提问 */
export interface DashboardPendingQuestion {
  id: string
  title: string
  /** 提问悬赏（虚拟币） */
  priceCoin: number
  askerName: string
  createdAt: string
}

/** 成员洞察·智能名片（GET /circles/:id/dashboard/members-insight 适配后） */
export interface CircleMemberInsight {
  userId: string
  nickname: string
  avatar: string
  /** 圈内角色（PARTNER/ADMIN/GUEST/VOLUNTEER/MEMBER，圈主本人已被后端排除） */
  role: string
  /** 入圈时间 */
  boundAt: string
  /** 最近活跃时间（空=近期无行为） */
  lastActiveAt: string
  /** 近30天行为数 */
  events30d: number
  /** 订单数 */
  orderCount: number
  /** 累计消费（元） */
  totalSpent: number
  /** 兴趣标签（由行为聚合推断，最多3个） */
  interests: string[]
}

/** 成员行为时间线条目（summary 已是后端人话摘要） */
export interface MemberTimelineEvent {
  action: string
  path: string
  summary: string
  occurredAt: string
}

/**
 * 圈子经营概览（GET /circles/:id/dashboard/overview，圈主鉴权，按 circleId）
 * 后端真实返回：name/memberCount/newMembers(本月)/monthRevenue(入圈费·元)/
 * interactionRate(如"12.3%")/monthPosts/monthComments/monthLikes。无 7 日活跃与同比字段。
 */
export interface CircleDashboardOverview {
  name: string
  memberCount: number
  /** 本月新增成员 */
  newMembers: number
  /** 本月入圈费收入（元） */
  monthRevenue: number
  /** 本月互动率（后端已格式化百分比字符串，如 "12.3%"） */
  interactionRate: string
  monthPosts: number
  monthComments: number
  monthLikes: number
}

/** 收入构成条目（GET /circles/:id/dashboard/revenue-breakdown·全期 PAID 口径，无时间过滤） */
export interface RevenueBreakdownItem {
  type: string
  label: string
  amount: number
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
interface RawTrendPoint {
  date?: string
  newMembers?: number
  revenue?: number | string
}
interface RawChurnMember {
  userId?: string
  nickname?: string | null
  avatar?: string | null
}
interface RawPendingQuestion {
  id?: string
  questionTitle?: string | null
  question?: string | null
  priceCoin?: number
  createdAt?: string
  asker?: { id?: string; nickname?: string | null } | null
}
interface RawMemberInsight {
  userId?: string | number
  nickname?: string | null
  avatar?: string | null
  role?: string | null
  boundAt?: string | null
  lastActiveAt?: string | null
  events30d?: number | string
  orderCount?: number | string
  totalSpent?: number | string
  interests?: string[]
}
interface RawMembersInsightResp { customers?: RawMemberInsight[]; total?: number }
interface RawMemberTimelineEvent { action?: string; path?: string; summary?: string; occurredAt?: string }
interface RawMemberTimelineResp { events?: RawMemberTimelineEvent[] }
interface RawCircleDashboardOverview {
  name?: string
  memberCount?: number
  newMembers?: number
  monthRevenue?: number | string
  interactionRate?: string
  monthPosts?: number
  monthComments?: number
  monthLikes?: number
}
interface RawBreakdownItem { type?: string; label?: string; amount?: number | string }

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

  /** 圈子经营概览（需 circleId·圈主鉴权）— GET /circles/:id/dashboard/overview */
  async circleOverview(circleId: string): Promise<CircleDashboardOverview> {
    const raw = await apiGet<RawCircleDashboardOverview>(`/circles/${circleId}/dashboard/overview`)
    return {
      name: raw?.name || '',
      memberCount: num(raw?.memberCount),
      newMembers: num(raw?.newMembers),
      monthRevenue: num(raw?.monthRevenue),
      interactionRate: raw?.interactionRate || '0%',
      monthPosts: num(raw?.monthPosts),
      monthComments: num(raw?.monthComments),
      monthLikes: num(raw?.monthLikes),
    }
  },

  /** 收入构成（全期 PAID 口径·入圈费/课程/商品）— GET /circles/:id/dashboard/revenue-breakdown */
  async revenueBreakdown(circleId: string): Promise<RevenueBreakdownItem[]> {
    const raw = await apiGet<{ breakdown?: RawBreakdownItem[] }>(`/circles/${circleId}/dashboard/revenue-breakdown`)
    const list = Array.isArray(raw?.breakdown) ? raw.breakdown : []
    return list.map((b) => ({ type: b.type || '', label: b.label || '', amount: num(b.amount) }))
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

  /** 近30天成员增长+收入趋势（需 circleId；后端仅返回有数据的日期，补齐由页面/纯函数处理） */
  async trends(circleId: string): Promise<DashboardTrendPoint[]> {
    const raw = await apiGet<{ trends?: RawTrendPoint[] }>(`/circles/${circleId}/dashboard/trends`)
    const list = Array.isArray(raw?.trends) ? raw.trends : []
    return list.map((t) => ({
      date: t.date || '',
      newMembers: num(t.newMembers),
      revenue: num(t.revenue),
    }))
  },

  /** 成员流失预警：近14天无发帖/评论的成员（需 circleId） */
  async churnWarning(circleId: string): Promise<DashboardChurnWarning> {
    const raw = await apiGet<{ atRisk?: RawChurnMember[]; count?: number }>(
      `/circles/${circleId}/dashboard/churn-warning`,
    )
    const list = Array.isArray(raw?.atRisk) ? raw.atRisk : []
    return {
      atRisk: list.map((m) => ({
        userId: m.userId || '',
        name: m.nickname || '匿名用户',
        avatar: m.avatar || '',
      })),
      count: num(raw?.count),
    }
  },

  /** 待回复付费提问（需 circleId；后端最多返回 20 条 PENDING） */
  async pendingQuestions(circleId: string): Promise<DashboardPendingQuestion[]> {
    const raw = await apiGet<{ questions?: RawPendingQuestion[] }>(
      `/circles/${circleId}/dashboard/pending-questions`,
    )
    const list = Array.isArray(raw?.questions) ? raw.questions : []
    return list.map((q) => ({
      id: q.id || '',
      // 优先用标题，无标题则截取正文前 40 字兜底
      title: q.questionTitle || (q.question || '').slice(0, 40) || '无标题提问',
      priceCoin: num(q.priceCoin),
      askerName: q.asker?.nickname || '匿名用户',
      createdAt: q.createdAt || '',
    }))
  },

  /** 成员洞察：本圈成员画像列表（分页，按最近活跃排序；错误直接抛给页面走三态） */
  async membersInsight(
    circleId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: CircleMemberInsight[]; total: number }> {
    const raw = await apiGet<RawMembersInsightResp>(
      `/circles/${circleId}/dashboard/members-insight?page=${page}&pageSize=${pageSize}`,
    )
    const items = (raw?.customers || []).map((c): CircleMemberInsight => ({
      userId: String(c.userId ?? ''),
      nickname: c.nickname || '匿名用户',
      avatar: c.avatar || '',
      role: c.role || 'MEMBER',
      boundAt: c.boundAt || '',
      lastActiveAt: c.lastActiveAt || '',
      events30d: num(c.events30d),
      orderCount: num(c.orderCount),
      totalSpent: num(c.totalSpent),
      interests: Array.isArray(c.interests) ? c.interests : [],
    }))
    return { items, total: raw?.total || 0 }
  },

  /** 成员洞察：单个成员行为时间线（点击卡片展开时按需请求） */
  async memberTimeline(circleId: string, userId: string): Promise<MemberTimelineEvent[]> {
    const raw = await apiGet<RawMemberTimelineResp>(
      `/circles/${circleId}/dashboard/members-insight/${userId}/timeline`,
    )
    return (raw?.events || []).map((e): MemberTimelineEvent => ({
      action: e.action || '',
      path: e.path || '',
      summary: e.summary || '',
      occurredAt: e.occurredAt || '',
    }))
  },
}

// ─── 纯函数：趋势补齐 & 健康度合成 ───

/**
 * 将后端稀疏的趋势点（仅含有数据的日期）补齐为连续 N 天序列（缺失日填 0）。
 * 纯函数：不依赖外部状态，方便单测与图表按固定天数渲染。
 */
export function fillTrendDays(points: DashboardTrendPoint[], days = 30): DashboardTrendPoint[] {
  const map = new Map(points.map((p) => [p.date, p]))
  const result: DashboardTrendPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const hit = map.get(key)
    result.push({ date: key, newMembers: hit?.newMembers || 0, revenue: hit?.revenue || 0 })
  }
  return result
}

/** 圈子健康度结果 */
export interface CircleHealth {
  /** 0-100 综合分 */
  score: number
  /** 一句话评语 */
  comment: string
  /** 分档：excellent/good/normal/warn */
  level: 'excellent' | 'good' | 'normal' | 'warn'
}

/**
 * 圈子健康度合成（纯函数，仅用后端 overview 真实字段加权，前端不编造任何数据）。
 *
 * 权重说明（合计 100 分）：
 * - 活跃率 55 分：活跃成员/总成员。社群的生命线是活跃，权重最大；活跃率 100% 得满分。
 * - 增长势能 30 分：本月新增/总成员，按 10% 封顶折算满分（月增 10% 已是相当健康的拉新速度，
 *   封顶可防止小圈子靠一两个新人虚高）。
 * - 规模分 15 分：总成员/200 封顶折算满分。适度奖励规模，避免 3 人小圈拿到与千人圈同等的分数。
 */
export function computeCircleHealth(ov: DashboardOverview): CircleHealth {
  // 无成员：直接 0 分，给出起步引导
  if (!ov || ov.memberCount <= 0) {
    return { score: 0, comment: '圈子尚无成员，先邀请首批种子用户吧', level: 'warn' }
  }
  // 活跃率（0~1）
  const activeRate = Math.min(ov.activeMembers / ov.memberCount, 1)
  // 增长势能：本月新增占比，10% 封顶记满
  const growthRate = Math.min(ov.monthNewMembers / ov.memberCount / 0.1, 1)
  // 规模分：200 人封顶记满
  const scaleRate = Math.min(ov.memberCount / 200, 1)

  const score = Math.round(activeRate * 55 + growthRate * 30 + scaleRate * 15)

  if (score >= 85) return { score, comment: '圈子生机勃勃，保持当前内容与运营节奏', level: 'excellent' }
  if (score >= 70) return { score, comment: '整体健康，可加强拉新或激活沉睡成员再上一层', level: 'good' }
  if (score >= 50) return { score, comment: '活跃度有提升空间，试试发起话题、活动或答疑互动', level: 'normal' }
  return { score, comment: '圈子活跃度偏低，建议尽快策划活动唤醒成员', level: 'warn' }
}
