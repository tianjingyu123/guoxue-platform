/**
 * 八字案例库 · 数据层
 *
 * 🔴 答案 = 真实人生经历（life 六维度 + events 大事年表）；断语（commentary）只是参考。
 *
 * 「先断后看」由后端把着门：列表/详情接口**根本不下发答案**，
 * 答案唯一的出口是 reveal（公布答案）。所以这里也不要试图从详情里取答案——取不到。
 */
import { apiGet, apiPost, apiPut } from '@/utils/request'

/** 人生经历的六个维度（与后端 LIFE_DIMENSIONS 同名，练手时逐项对照） */
export const LIFE_DIMENSIONS = [
  { key: 'career', label: '事业', hint: '职业、成败、起落' },
  { key: 'marriage', label: '婚姻', hint: '婚恋、离合' },
  { key: 'wealth', label: '财运', hint: '财富、得失' },
  { key: 'health', label: '健康', hint: '体质、病灾' },
  { key: 'family', label: '六亲', hint: '父母、子女、兄弟' },
  { key: 'character', label: '性格', hint: '禀性、行事' },
] as const

export type LifeKey = (typeof LIFE_DIMENSIONS)[number]['key']

export const CASE_SOURCES = [
  { key: '', label: '全部' },
  { key: 'CELEBRITY', label: '名人' },
  { key: 'CLASSIC', label: '古籍' },
  { key: 'CURATED', label: '平台整理' },
  { key: 'USER', label: '同好投稿' },
]

export const SOURCE_LABEL: Record<string, string> = {
  CELEBRITY: '名人',
  CLASSIC: '古籍',
  CURATED: '平台整理',
  USER: '同好投稿',
}

/** 案例（不含答案 —— 答案后端不下发） */
export interface BaziCaseItem {
  id: string
  gender: string
  yearPillar: string
  monthPillar: string
  dayPillar: string
  hourPillar: string
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  birthHour?: number | null
  source: string
  title: string
  realName?: string | null
  era?: string | null
  tags: string[]
  quality: number
  isPremium: boolean
  viewCount: number
  attemptCount: number
  /** 仅同类八字接口返回 */
  samePillars?: string[]
  sameCount?: number
}

export interface CaseRewardPlan {
  enabled: boolean
  tiers: { key: 'basic' | 'good' | 'premium'; minQuality: number; amount: number | null }[]
  note: string
}

export interface LifeEvent {
  year: number
  ganzhi?: string
  event: string
  category?: string
}

/** 答案（只有 reveal 之后才拿得到） */
export interface CaseAnswer {
  life: Partial<Record<LifeKey, string>>
  events: LifeEvent[]
  commentary?: string | null
  commentarySrc?: string | null
  myGuess?: Partial<Record<LifeKey, string>>
  dimensions?: { key: string; label: string }[]
}

export const caseApi = {
  list(q: { page?: number; pageSize?: number; source?: string; keyword?: string; premiumOnly?: boolean } = {}) {
    const p = new URLSearchParams()
    if (q.page) p.set('page', String(q.page))
    if (q.pageSize) p.set('pageSize', String(q.pageSize))
    if (q.source) p.set('source', q.source)
    if (q.keyword) p.set('keyword', q.keyword)
    if (q.premiumOnly) p.set('premiumOnly', 'true')
    return apiGet<{ items: BaziCaseItem[]; total: number }>(`/bazi-cases?${p.toString()}`)
  },

  /** 详情（不含答案） */
  detail(id: string) {
    return apiGet<BaziCaseItem>(`/bazi-cases/${id}`)
  },

  /** 我在此案例的练手状态；已公布答案则一并带回答案（刷新回显用） */
  myAttempt(id: string) {
    return apiGet<{ guess: Record<string, string>; revealed: boolean; selfScore: number | null } & Partial<CaseAnswer>>(
      `/bazi-cases/${id}/mine`,
    )
  },

  /** 保存我的断语（公布答案前） */
  saveGuess(id: string, guess: Record<string, string>) {
    return apiPost(`/bazi-cases/${id}/guess`, { guess })
  },

  /** 公布答案 —— 答案唯一的出口 */
  reveal(id: string) {
    return apiPost<CaseAnswer>(`/bazi-cases/${id}/reveal`, {})
  },

  /** 自评断中几项（用户自己判） */
  selfScore(id: string, score: number) {
    return apiPut(`/bazi-cases/${id}/self-score`, { score })
  },

  /** 同类八字：日柱相同 + 年/月/时另任意两柱相同 */
  similar(pillars: { year: string; month: string; day: string; hour: string }, limit = 5) {
    return apiPost<{ total: number; items: BaziCaseItem[] }>('/bazi-cases/similar', { ...pillars, limit })
  },

  submit(dto: {
    gender: string
    yearPillar: string
    monthPillar: string
    dayPillar: string
    hourPillar: string
    birthYear?: number
    birthMonth?: number
    birthDay?: number
    birthHour?: number
    title: string
    era?: string
    tags?: string[]
    life?: Record<string, string>
    events?: LifeEvent[]
    commentary?: string
    consent: boolean
  }) {
    return apiPost<{ id: string; status: string; quality: number }>('/bazi-cases', dto)
  },

  mine() {
    return apiGet<{ items: (BaziCaseItem & { status: string; reviewNote?: string })[]; approved: number; total: number; badge: string | null }>(
      '/bazi-cases/mine',
    )
  },

  rewardPlan() {
    return apiGet<CaseRewardPlan>('/bazi-cases/reward-plan')
  },

  leaderboard(limit = 20) {
    return apiGet<{ rank: number; nickname: string; avatar: string; count: number; badge: string | null }[]>(
      `/bazi-cases/leaderboard?limit=${limit}`,
    )
  },
}

/** 四柱拼成一行（列表/卡片展示用） */
export function pillarsText(c: BaziCaseItem): string {
  return `${c.yearPillar} ${c.monthPillar} ${c.dayPillar} ${c.hourPillar}`
}
