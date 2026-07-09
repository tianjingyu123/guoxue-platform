/**
 * 圈子成长体系 数据层（真连 growth 后端：签到 / 成长等级 / 徽章 / 入圈审批）
 * 后端路由挂在 circles/:id 下。后端无的字段降级隐藏，不造假。
 */
import { apiGet, apiPost } from '@/utils/request'

// ── 类型 ────────────────────────────────────────────

export interface LevelMe {
  userId: string
  rank: number
  memberCount: number
  joinedDays: number
  posts: number
  likes: number
  checkinExp: number
  checkinStreak: number
  badgesCount: number
  level: number
  levelName: string
  totalExp: number
  currentLevelMinExp: number
  nextLevelMinExp: number | null
  expIntoLevel: number
  expForNextLevel: number | null
  progressPercent: number
  isMax: boolean
}

export interface RankItem {
  rank: number
  userId: string
  nickname: string
  avatar: string
  checkinExp: number
  checkinStreak: number
  posts: number
  likes: number
  totalExp: number
  level: number
  levelName: string
}

export interface GrowthData {
  me: LevelMe
  leaderboard: RankItem[]
}

export interface CheckinResult {
  alreadyChecked: boolean
  message: string
  expGained: number
  bonus?: number
  checkinStreak: number
  totalCheckins: number
  checkinExp: number
}

export interface CalendarData {
  month: string
  today: string
  checkedToday: boolean
  checkinStreak: number
  totalCheckins: number
  days: { date: string; expGained: number }[]
}

export interface BadgeItem {
  code: string
  name: string
  desc: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  earned: boolean
  gainedAt: string | null
  progress: number
  total: number
}

export interface BadgesData {
  earnedCount: number
  total: number
  badges: BadgeItem[]
}

export interface JoinRequestItem {
  id: string
  circleId: string
  userId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  message: string
  reviewedBy: string | null
  reviewedAt: string | null
  rejectReason: string | null
  createdAt: string
  userNickname: string
  userAvatar: string
}

/** 我的入圈申请（申请人视角，含圈子名/封面） */
export interface MyJoinRequestItem {
  id: string
  circleId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  message: string
  reviewedAt: string | null
  rejectReason: string | null
  createdAt: string
  circleName: string
  circleCover: string
}

function num(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }
/** 兼容「裸数组」或「{data:[]}」两种响应形态，统一取出数组 */
function pickArray<T>(r: T[] | { data?: T[] } | null | undefined): T[] { return Array.isArray(r) ? r : (r?.data ?? []) }

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
/** GET /circles/:id/checkin/calendar（days 声明为必有数组以避开 r.days.map 的 possibly-undefined，运行时仍由 Array.isArray 守卫） */
interface RawCalendar {
  month?: string
  today?: string
  checkedToday?: boolean
  checkinStreak?: number | string
  totalCheckins?: number | string
  days: { date: string; expGained?: number | string }[]
}
/** 入圈申请项（圈主视角）；映射到必填视图字段的项声明为必有 */
interface RawJoinRequest {
  id: string
  circleId: string
  userId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  message?: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  rejectReason?: string | null
  createdAt: string
  userNickname?: string
  userAvatar?: string
}
/** 我的入圈申请项（申请人视角） */
interface RawMyJoinRequest {
  id: string
  circleId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  message?: string
  reviewedAt?: string | null
  rejectReason?: string | null
  createdAt: string
  circleName?: string
  circleCover?: string
}

// ── API ─────────────────────────────────────────────

export const growthApi = {
  /** 今日签到（幂等） — POST /circles/:id/checkin */
  checkin: (circleId: string) => apiPost<CheckinResult>(`/circles/${circleId}/checkin`),

  /** 我本月签到日历 — GET /circles/:id/checkin/calendar?month=YYYY-MM */
  calendar: async (circleId: string, month?: string): Promise<CalendarData> => {
    const qs = month ? `?month=${month}` : ''
    const r = await apiGet<RawCalendar>(`/circles/${circleId}/checkin/calendar${qs}`)
    return {
      month: r?.month ?? '',
      today: r?.today ?? '',
      checkedToday: !!r?.checkedToday,
      checkinStreak: num(r?.checkinStreak),
      totalCheckins: num(r?.totalCheckins),
      days: Array.isArray(r?.days) ? r.days.map((d) => ({ date: d.date, expGained: num(d.expGained) })) : [],
    }
  },

  /** 我的成长 + 等级排行榜 — GET /circles/:id/growth */
  growth: (circleId: string) => apiGet<GrowthData>(`/circles/${circleId}/growth`),

  /** 徽章列表 — GET /circles/:id/badges */
  badges: (circleId: string) => apiGet<BadgesData>(`/circles/${circleId}/badges`),

  /** 入圈申请列表（圈主权限） — GET /circles/:id/join-requests */
  joinRequests: async (circleId: string): Promise<JoinRequestItem[]> => {
    return pickArray(await apiGet<RawJoinRequest[] | { data?: RawJoinRequest[] }>(`/circles/${circleId}/join-requests`)).map((x) => ({
      id: x.id,
      circleId: x.circleId,
      userId: x.userId,
      status: x.status,
      message: x.message ?? '',
      reviewedBy: x.reviewedBy ?? null,
      reviewedAt: x.reviewedAt ?? null,
      rejectReason: x.rejectReason ?? null,
      createdAt: x.createdAt,
      userNickname: x.userNickname ?? '用户',
      userAvatar: x.userAvatar ?? '',
    }))
  },

  /** 审批入圈申请（圈主权限） — POST /circles/:id/join-requests/:reqId/review */
  reviewJoinRequest: (circleId: string, reqId: string, action: 'approve' | 'reject', rejectReason?: string) =>
    apiPost(`/circles/${circleId}/join-requests/${reqId}/review`, { action, rejectReason }),

  /** 我的入圈申请列表（申请人视角） — GET /circles/my-join-requests */
  myJoinRequests: async (): Promise<MyJoinRequestItem[]> => {
    return pickArray(await apiGet<RawMyJoinRequest[] | { data?: RawMyJoinRequest[] }>(`/circles/my-join-requests`)).map((x) => ({
      id: x.id,
      circleId: x.circleId,
      status: x.status,
      message: x.message ?? '',
      reviewedAt: x.reviewedAt ?? null,
      rejectReason: x.rejectReason ?? null,
      createdAt: x.createdAt,
      circleName: x.circleName ?? '圈子',
      circleCover: x.circleCover ?? '',
    }))
  },
}
