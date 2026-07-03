/**
 * 悬赏咨询 · 数据层
 * 后端契约见 apps/server/src/modules/bounty/bounty.controller.ts（7 端点·前缀 /bounty）。
 *   POST   /bounty/questions            发布悬赏（冻结赏金·需登录）
 *   GET    /bounty/questions            悬赏列表（status/category/stationId 过滤 + 分页）
 *   GET    /bounty/questions/:id        悬赏详情
 *   POST   /bounty/questions/:id/claim  抢答（非提问者·OPEN 才可抢）
 *   POST   /bounty/questions/:id/answer 提交回答（仅抢到的答主）
 *   POST   /bounty/questions/:id/settle 采纳结算（提问者·ANSWERED 才可解付赏金）
 *   POST   /bounty/questions/:id/refund 退款（提问者·OPEN/CLAIMED 才可退）
 *
 * 铁律：所有方法真连后端，错误向上抛由页面走「错误态」；空数据走「空态」，绝不回退假 mock。
 *
 * ⚠️ 后端为「单人抢答·单一回答」模型（非多回答问答区）：一条悬赏最多一个答主(answererId)+
 *    一段回答(answer/answerImages/answerAudioUrl)。故前端不做多回答列表/点赞/逐条采纳。
 * ⚠️ 后端无「我的悬赏」端点：mine() 拉取列表后按 askerId/answererId 客户端过滤（诚实降级）。
 * ⚠️ 列表 service 返回 { questions, total, page, pageSize }，其中 questions 非拦截器分页键，
 *    故整体作为 data 原样返回，用 apiGet 取 .questions。
 */
import { apiGet, apiPost } from '@/utils/request'
import { getUserInfo } from '@/utils/storage'

/** 悬赏状态机（与后端 BountyQuestion.status 一一对应） */
export type BountyStatus = 'OPEN' | 'CLAIMED' | 'ANSWERED' | 'SETTLED' | 'REFUNDED' | 'CLOSED' | 'EXPIRED'

/** 悬赏分类（与后端 category 枚举一一对应） */
export type BountyCategory = 'BAZI' | 'ZIWEI' | 'FENGSHUI' | 'CAREER' | 'LOVE' | 'GENERAL'

/** 状态中文标签（页面共用） */
export const BOUNTY_STATUS_LABEL: Record<BountyStatus, string> = {
  OPEN: '悬赏中',
  CLAIMED: '答主已接',
  ANSWERED: '待采纳',
  SETTLED: '已采纳',
  REFUNDED: '已退款',
  CLOSED: '已关闭',
  EXPIRED: '已过期',
}

/** 分类中文标签（页面共用） */
export const BOUNTY_CATEGORY_LABEL: Record<BountyCategory, string> = {
  BAZI: '八字命理',
  ZIWEI: '紫微斗数',
  FENGSHUI: '风水堪舆',
  CAREER: '事业前程',
  LOVE: '情感姻缘',
  GENERAL: '综合咨询',
}

/** 广场状态筛选 tab（key='' 表示全部·后端不传 status） */
export const BOUNTY_STATUS_TABS: { key: '' | BountyStatus; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'OPEN', label: '悬赏中' },
  { key: 'ANSWERED', label: '待采纳' },
  { key: 'SETTLED', label: '已采纳' },
]

/** 发布悬赏可选分类（含中文标签，与后端枚举一致） */
export const BOUNTY_CATEGORY_OPTIONS: { key: BountyCategory; label: string }[] = [
  { key: 'BAZI', label: '八字命理' },
  { key: 'ZIWEI', label: '紫微斗数' },
  { key: 'FENGSHUI', label: '风水堪舆' },
  { key: 'CAREER', label: '事业前程' },
  { key: 'LOVE', label: '情感姻缘' },
  { key: 'GENERAL', label: '综合咨询' },
]

/** 悬赏（后端 BountyQuestion 原始返回结构·无用户关联） */
export interface BountyQuestion {
  id: string
  title: string
  description: string
  images: string[]
  bountyCoin: number
  category: string
  stationId: string | null
  circleId: string | null
  askerId: string
  answererId: string | null
  status: BountyStatus
  answer: string | null
  answerImages: string[]
  answerAudioUrl: string | null
  lockExpireAt: string | null
  createdAt: string
  answeredAt: string | null
  settledAt: string | null
}

/** 列表返回信封 */
export interface BountyListResult {
  questions: BountyQuestion[]
  total: number
  page: number
  pageSize: number
}

/** 发布悬赏入参 */
export interface CreateBountyBody {
  title: string
  description: string
  bountyCoin: number
  category?: BountyCategory
  images?: string[]
  stationId?: string
  circleId?: string
}

/** 提交回答入参 */
export interface AnswerBountyBody {
  answer: string
  images?: string[]
  audioUrl?: string
}

/** 列表查询入参 */
export interface ListBountyQuery {
  page?: number
  pageSize?: number
  category?: string
  status?: BountyStatus | ''
}

export const bountyApi = {
  /** 悬赏列表（无需登录） */
  async list(query: ListBountyQuery = {}): Promise<BountyListResult> {
    const params: string[] = []
    params.push(`page=${query.page || 1}`)
    params.push(`pageSize=${query.pageSize || 20}`)
    if (query.category) params.push(`category=${encodeURIComponent(query.category)}`)
    if (query.status) params.push(`status=${encodeURIComponent(query.status)}`)
    const res = await apiGet<BountyListResult>(`/bounty/questions?${params.join('&')}`)
    return {
      questions: Array.isArray(res?.questions) ? res.questions : [],
      total: res?.total ?? 0,
      page: res?.page ?? 1,
      pageSize: res?.pageSize ?? 20,
    }
  },

  /** 悬赏详情（无需登录·不存在时后端返回 null） */
  detail(id: string): Promise<BountyQuestion | null> {
    return apiGet<BountyQuestion | null>(`/bounty/questions/${id}`)
  },

  /** 发布悬赏（需登录·后端事务内冻结赏金） */
  create(body: CreateBountyBody): Promise<BountyQuestion> {
    return apiPost<BountyQuestion>('/bounty/questions', body)
  },

  /** 抢答（需登录·非提问者·OPEN 才可抢） */
  claim(id: string): Promise<BountyQuestion> {
    return apiPost<BountyQuestion>(`/bounty/questions/${id}/claim`)
  },

  /** 提交回答（需登录·仅抢到的答主） */
  answer(id: string, body: AnswerBountyBody): Promise<BountyQuestion> {
    return apiPost<BountyQuestion>(`/bounty/questions/${id}/answer`, body)
  },

  /** 采纳结算（需登录·提问者·ANSWERED 才可解付赏金给答主） */
  settle(id: string): Promise<BountyQuestion> {
    return apiPost<BountyQuestion>(`/bounty/questions/${id}/settle`)
  },

  /** 退款（需登录·提问者·OPEN/CLAIMED 才可退） */
  refund(id: string): Promise<BountyQuestion> {
    return apiPost<BountyQuestion>(`/bounty/questions/${id}/refund`)
  },

  /**
   * 我的悬赏（后端无专属端点·拉列表后按当前用户 id 客户端过滤·诚实降级）。
   * role='posted' 过滤 askerId===me，role='answered' 过滤 answererId===me。
   */
  async mine(role: 'posted' | 'answered'): Promise<BountyQuestion[]> {
    const myId = getMyUserId()
    if (!myId) return []
    // 无用户过滤端点，取较大页做客户端过滤（平台早期数据量可控）
    const res = await this.list({ page: 1, pageSize: 100 })
    return res.questions.filter((q) =>
      role === 'posted' ? q.askerId === myId : q.answererId === myId,
    )
  },
}

/** 当前登录用户 id（未登录返回空串） */
export function getMyUserId(): string {
  const u = getUserInfo<{ id?: string | number }>()
  return u?.id != null ? String(u.id) : ''
}

/** 相对时间（如 3天前 / 昨天 / 今天） */
export function formatBountyTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) {
    const hours = Math.floor(diff / 3_600_000)
    if (hours <= 0) return '刚刚'
    return `${hours}小时前`
  }
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 日期时间格式化（yyyy/M/d HH:mm） */
export function formatBountyDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 答主接单锁剩余时间（lockExpireAt·CLAIMED 时后端设 72h 回答期限） */
export function remainingLockTime(lockExpireAt: string | null): string {
  if (!lockExpireAt) return ''
  const diff = new Date(lockExpireAt).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return '已超时'
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `剩余${days}天${hours}小时`
  return `剩余${hours}小时`
}
