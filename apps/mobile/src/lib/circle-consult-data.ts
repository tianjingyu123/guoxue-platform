/**
 * 圈子达人咨询 数据层
 * 真连后端 GET /circles/:id/experts（circleMember 中开通咨询的达人 + 真实金币价格）。
 * 注：后端达人模型只有「角色 + 提问价/连麦价 + 响应时限」，原型臆想的评分/专长标签/
 *     在线状态/累计咨询数 后端无支撑，已按数据流铁律去除（不展示假数据）。
 */
import { apiGet, apiPost } from '@/utils/request'
import { getStorage } from '@/utils/storage'

export interface ConsultExpert {
  id: string          // userId
  name: string
  avatar: string
  roleLabel: string   // 圈主 / 合伙人 / 嘉宾
  questionPrice: number  // 图文提问价（金币/次），0 表示未开通
  peekPrice: number      // 围观价（金币/次），由达人本人设定，0=不开放围观
  callPrice: number      // 电话连麦价（金币/分钟），0 表示未开通
  responseHours: number  // 提问响应时限（小时）
  /** 所属圈子（仅跨圈模式 listAllExperts 返回）。定价按圈子走，下单必须用这一项的 circleId */
  circleId?: string
  circleName?: string
}

/** 某用户在某圈子开通的咨询服务（个人主页"付费咨询"入口聚合用） */
export interface UserConsultService {
  circleId: string
  circleName: string
  circleCover: string
  roleLabel: string
  expertName: string
  expertAvatar: string
  questionPrice: number  // 图文提问价（金币/次），0=未开通
  peekPrice: number      // 围观价（金币/次），0=不开放围观
  callPrice: number      // 连麦价（金币/分钟），0=未开通
  responseHours: number
}

const ROLE_LABEL: Record<string, string> = { OWNER: '圈主', PARTNER: '合伙人', GUEST: '嘉宾' }

/* —— 后端原始响应类型（容错适配用，字段全 optional，仅声明 adapter 访问到的） —— */
interface RawQUser { id?: string | number; nickname?: string; avatar?: string }
interface RawExpertMember {
  userId?: string; user?: RawQUser | null; role?: string
  questionPriceCoin?: number | string; peekPriceCoin?: number | string
  callPricePerMinuteCoin?: number | string; questionTimeoutHours?: number | string
  circleId?: string; circle?: { id?: string; name?: string; cover?: string } | null
}

/** 达人好评率（来自通话评价·rating≥4 占比）。无评价的达人不在结果里 → 前端不渲染该行 */
export interface ExpertRatingStat {
  ratingCount: number
  goodRate: number // 0-100 整数百分比
}

export const consultApi = {
  /**
   * 达人好评率聚合 — GET /consult-calls/expert-stats?expertIds=a,b
   * 失败/未登录返回 {}，调用方按"无数据不渲染"降级（不编数）。
   */
  getExpertRatingStats: async (expertIds: string[]): Promise<Record<string, ExpertRatingStat>> => {
    const ids = expertIds.filter(Boolean)
    if (!ids.length) return {}
    try {
      const res = await apiGet<Record<string, ExpertRatingStat>>(
        `/consult-calls/expert-stats?expertIds=${encodeURIComponent(ids.join(','))}`,
      )
      return res && typeof res === 'object' ? res : {}
    } catch {
      return {}
    }
  },

  /** 圈子达人列表 — GET /circles/:id/experts */
  listExperts: async (circleId: string): Promise<ConsultExpert[]> => {
    try {
      const res = await apiGet<RawExpertMember[] | { data?: RawExpertMember[] }>(`/circles/${circleId}/experts`)
      const arr = Array.isArray(res) ? res : (res?.data ?? [])
      return arr.map((m: RawExpertMember): ConsultExpert => ({
        id: m.user?.id != null ? String(m.user.id) : (m.userId || ''),
        name: m.user?.nickname || '',
        avatar: m.user?.avatar || '',
        roleLabel: ROLE_LABEL[m.role || ''] || '达人',
        questionPrice: Number(m.questionPriceCoin) || 0,
        peekPrice: Number(m.peekPriceCoin) || 0,
        callPrice: Number(m.callPricePerMinuteCoin) || 0,
        responseHours: Number(m.questionTimeoutHours) || 0,
      }))
    } catch {
      return []
    }
  },

  /**
   * 全平台达人列表 — GET /circles/experts/discover（跨圈聚合·发现页全局入口用）。
   * 发现页的「达人咨询」不带 circleId，此前跳达人列表页时 circleId 为空 → 恒空列表、
   * 提问按钮点不动。跨圈模式下每个达人带自己的 circleId，下单用它。
   */
  listAllExperts: async (limit = 50): Promise<ConsultExpert[]> => {
    try {
      const res = await apiGet<RawExpertMember[] | { data?: RawExpertMember[] }>(`/circles/experts/discover?limit=${limit}`)
      const arr = Array.isArray(res) ? res : (res?.data ?? [])
      return arr.map((m: RawExpertMember): ConsultExpert => ({
        id: m.user?.id != null ? String(m.user.id) : (m.userId || ''),
        name: m.user?.nickname || '',
        avatar: m.user?.avatar || '',
        roleLabel: ROLE_LABEL[m.role || ''] || '达人',
        questionPrice: Number(m.questionPriceCoin) || 0,
        peekPrice: Number(m.peekPriceCoin) || 0,
        callPrice: Number(m.callPricePerMinuteCoin) || 0,
        responseHours: Number(m.questionTimeoutHours) || 0,
        circleId: m.circleId || m.circle?.id || '',
        circleName: m.circle?.name || '',
      }))
    } catch {
      return []
    }
  },

  /** 用户在所有圈子开通的咨询服务聚合 — GET /circles/expert-services/by-user/:userId（查询失败返回 []，由调用方按"无服务"降级，不展示假数据） */
  getUserConsultServices: async (userId: string): Promise<UserConsultService[]> => {
    try {
      const res = await apiGet<RawExpertMember[] | { data?: RawExpertMember[] }>(`/circles/expert-services/by-user/${userId}`)
      const arr = Array.isArray(res) ? res : (res?.data ?? [])
      return arr.map((m: RawExpertMember): UserConsultService => ({
        circleId: m.circleId || m.circle?.id || '',
        circleName: m.circle?.name || '',
        circleCover: m.circle?.cover || '',
        roleLabel: ROLE_LABEL[m.role || ''] || '达人',
        expertName: m.user?.nickname || '',
        expertAvatar: m.user?.avatar || '',
        questionPrice: Number(m.questionPriceCoin) || 0,
        peekPrice: Number(m.peekPriceCoin) || 0,
        callPrice: Number(m.callPricePerMinuteCoin) || 0,
        responseHours: Number(m.questionTimeoutHours) || 0,
      }))
    } catch {
      return []
    }
  },
}

/* ───────────────────────── 达人自助配置（我的达人设置）─────────────────────────
 * 真连 GET /circles/:id/expert/:userId（读回）+ POST /circles/:id/expert/config（保存）。
 * 后端只认 JWT 里的 userId（只能配置自己），且要求 role ∈ OWNER/PARTNER/GUEST，否则 403。
 * 保存是全量覆盖：四个价格/时限字段必须一起提交，漏传 questionTimeoutHours /
 * callPricePerMinuteCoin 会 400，漏传 peekPriceCoin 会被重置为 0。
 */

/** 达人在某个圈子的咨询配置 */
export interface ExpertConfig {
  role: string            // 后端原始角色 OWNER/PARTNER/GUEST
  questionPriceCoin: number      // 图文提问价（金币/次），0=不接提问
  peekPriceCoin: number          // 围观价（金币/次），0=不开放围观
  questionTimeoutHours: number   // 响应时限（小时），超时自动全额退款
  callPricePerMinuteCoin: number // 连麦价（金币/分钟），0=不接连麦
}

export const expertConfigApi = {
  /** 读回我在该圈的咨询配置 — GET /circles/:id/expert/:userId（错误上抛，供页面三态） */
  get: async (circleId: string, userId: string): Promise<ExpertConfig> => {
    const m = await apiGet<RawExpertMember & { questionTimeoutHours?: number | string }>(
      `/circles/${circleId}/expert/${userId}`,
    )
    return {
      role: (m?.role || '').toUpperCase(),
      questionPriceCoin: Number(m?.questionPriceCoin) || 0,
      peekPriceCoin: Number(m?.peekPriceCoin) || 0,
      questionTimeoutHours: Number(m?.questionTimeoutHours) || 72,
      callPricePerMinuteCoin: Number(m?.callPricePerMinuteCoin) || 0,
    }
  },

  /** 保存配置 — POST /circles/:id/expert/config（全量覆盖·错误上抛由页面 toast） */
  set: async (circleId: string, cfg: Omit<ExpertConfig, 'role'>): Promise<void> => {
    await apiPost<unknown>(`/circles/${circleId}/expert/config`, {
      questionPriceCoin: cfg.questionPriceCoin,
      peekPriceCoin: cfg.peekPriceCoin,
      questionTimeoutHours: cfg.questionTimeoutHours,
      callPricePerMinuteCoin: cfg.callPricePerMinuteCoin,
    })
  },
}

/* ───────────────────────── 图文付费问答（PaidQuestion）─────────────────────────
 * 真连后端 @Controller("question")。模型见 prisma PaidQuestion。
 * 注意（后端现状，非造假）：
 *  - 后端 ask() 把标题拼进 question 字段为「【标题】正文」，questionTitle 列保持空，
 *    故读取时用 splitQuestion() 还原标题/正文。
 *  - GET /question 仅支持 circleId/status/isPublic/page/pageSize 筛选，
 *    没有 askerId/answererId 维度；「我的提问 / 咨询订单」只能按 circleId 拉取后
 *    在前端按当前用户过滤（圈子内本人记录），这是后端能力边界导致的降级。
 *  - 列表接口不做付费墙，answer 全文仅在详情页 GET /question/:id 受墙保护，
 *    故列表卡片一律不渲染 answer 文本。
 */

export type PaidQuestionStatus = 'PENDING' | 'ANSWERED' | 'REJECTED' | 'REFUNDED' | 'EXPIRED' | 'CLOSED'

export interface QuestionUser { id: string; nickname: string; avatar: string }

export interface PaidQuestion {
  id: string
  circleId: string
  askerId: string
  answererId: string
  /** 原始问题文本（可能含「【标题】正文」前缀，用 splitQuestion 拆分） */
  question: string
  images: string[]
  priceCoin: number
  peekPriceCoin: number
  /** 是否公开（公开后可被围观；后端 PaidQuestion.isPublic 真字段） */
  isPublic: boolean
  status: PaidQuestionStatus
  /** 受付费墙保护：非当事人/未围观时后端返回 null */
  answer: string | null
  /** 后端付费墙剔除 answer 时置 true（已回答但需围观） */
  answerLocked: boolean
  answeredAt: string | null
  peekCount: number
  createdAt: string
  asker?: QuestionUser
  answerer?: QuestionUser
  circle?: { id: string; name: string }
}

export interface AskQuestionPayload {
  circleId: string
  answererId: string
  questionTitle: string
  question: string
  priceCoin: number
  isPublic?: boolean
  images?: string[]
}

export interface QuestionListQuery {
  circleId?: string
  status?: PaidQuestionStatus
  isPublic?: boolean
  /** 提问者维度（我的提问） */
  askerId?: string
  /** 回答者维度（我收到的提问） */
  answererId?: string
  /** 参与者维度（我提问的 + 我回答的，OR 关系；咨询订单页用） */
  participantId?: string
  page?: number
  pageSize?: number
}

/** 当前登录用户 id（登录时存于 storage 'userInfo'，见 pkg-auth/login）。未登录返回 '' */
export function getCurrentUserId(): string {
  const u = getStorage<{ id?: string | number }>('userInfo')
  return u?.id != null ? String(u.id) : ''
}

const TITLE_RE = /^【([^】]*)】([\s\S]*)$/
/** 还原后端拼接的「【标题】正文」为 { title, body } */
export function splitQuestion(raw: string): { title: string; body: string } {
  const m = TITLE_RE.exec(raw || '')
  if (m) return { title: m[1], body: m[2] }
  return { title: '', body: raw || '' }
}

/** 后端 PaidQuestion 原始响应（字段全 optional，仅声明 adapter 访问到的） */
interface RawPaidQuestion {
  id?: string | number; circleId?: string; circle?: { id?: string | number; name?: string } | null
  askerId?: string; asker?: RawQUser | null; answererId?: string; answerer?: RawQUser | null
  question?: string; images?: string[]; priceCoin?: number | string; peekPriceCoin?: number | string
  isPublic?: boolean; status?: string; answer?: string | null; answerLocked?: boolean; answeredAt?: string | null
  peekCount?: number | string; createdAt?: string
}
interface RawQuestionListResp { questions?: RawPaidQuestion[]; total?: number; page?: number; pageSize?: number }

function mapUser(u?: RawQUser | null): QuestionUser | undefined {
  if (!u) return undefined
  return { id: String(u.id || ''), nickname: u.nickname || '', avatar: u.avatar || '' }
}

function mapQuestion(q: RawPaidQuestion): PaidQuestion {
  return {
    id: String(q?.id || ''),
    circleId: String(q?.circleId || q?.circle?.id || ''),
    askerId: String(q?.askerId || q?.asker?.id || ''),
    answererId: String(q?.answererId || q?.answerer?.id || ''),
    question: q?.question || '',
    images: Array.isArray(q?.images) ? q.images : [],
    priceCoin: Number(q?.priceCoin) || 0,
    peekPriceCoin: Number(q?.peekPriceCoin) || 0,
    isPublic: q?.isPublic !== false,
    status: (q?.status || 'PENDING') as PaidQuestionStatus,
    answer: q?.answer ?? null,
    answerLocked: !!q?.answerLocked,
    answeredAt: q?.answeredAt ?? null,
    peekCount: Number(q?.peekCount) || 0,
    createdAt: q?.createdAt ?? '',
    asker: mapUser(q?.asker),
    answerer: mapUser(q?.answerer),
    circle: q?.circle ? { id: String(q.circle.id || ''), name: q.circle.name || '' } : undefined,
  }
}

function buildQuery(p: QuestionListQuery): string {
  const parts: string[] = []
  if (p.circleId) parts.push(`circleId=${encodeURIComponent(p.circleId)}`)
  if (p.status) parts.push(`status=${encodeURIComponent(p.status)}`)
  if (p.isPublic != null) parts.push(`isPublic=${p.isPublic}`)
  if (p.askerId) parts.push(`askerId=${encodeURIComponent(p.askerId)}`)
  if (p.answererId) parts.push(`answererId=${encodeURIComponent(p.answererId)}`)
  if (p.participantId) parts.push(`participantId=${encodeURIComponent(p.participantId)}`)
  if (p.page) parts.push(`page=${p.page}`)
  if (p.pageSize) parts.push(`pageSize=${p.pageSize}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export const questionApi = {
  /**
   * 发起付费提问 — POST /question/ask（事务内扣币 + 建 PENDING 记录）。
   * 定价权归收款方：后端一律以达人本人的 CircleMember 配置为准，忽略客户端传的
   * priceCoin/peekPriceCoin（防提问者压价）。priceCoin 仍传，仅用于前端展示核对。
   */
  ask: async (payload: AskQuestionPayload): Promise<PaidQuestion> => {
    const body: Record<string, unknown> = {
      circleId: payload.circleId,
      answererId: payload.answererId,
      questionTitle: payload.questionTitle,
      question: payload.question,
      priceCoin: payload.priceCoin,
    }
    if (payload.isPublic != null) body.isPublic = payload.isPublic
    if (payload.images && payload.images.length) body.images = payload.images
    return mapQuestion(await apiPost<RawPaidQuestion>('/question/ask', body))
  },

  /** 问答列表 — GET /question（仅 circleId/status/isPublic 维度，无用户维度） */
  list: async (params: QuestionListQuery): Promise<{ items: PaidQuestion[]; total: number; page: number; pageSize: number }> => {
    const res = await apiGet<RawQuestionListResp>(`/question${buildQuery(params)}`)
    const arr = Array.isArray(res?.questions) ? res.questions : (Array.isArray(res) ? res : [])
    return {
      items: arr.map(mapQuestion),
      total: Number(res?.total) || arr.length,
      page: Number(res?.page) || 1,
      pageSize: Number(res?.pageSize) || arr.length,
    }
  },

  /** 问答详情 — GET /question/:id（付费墙：非当事人/未围观时 answer=null & answerLocked=true） */
  detail: async (id: string): Promise<PaidQuestion> => mapQuestion(await apiGet<RawPaidQuestion>(`/question/${id}`)),

  /** 达人回答 — POST /question/:id/answer（仅回答者本人） */
  answer: async (id: string, payload: { answer: string; images?: string[] }): Promise<PaidQuestion> => {
    const body: Record<string, unknown> = { answer: payload.answer }
    if (payload.images && payload.images.length) body.images = payload.images
    return mapQuestion(await apiPost<RawPaidQuestion>(`/question/${id}/answer`, body))
  },

  /** 拒答 — POST /question/:id/reject（自动全额退币给提问者） */
  reject: async (id: string, reason?: string): Promise<void> => {
    await apiPost<unknown>(`/question/${id}/reject`, reason ? { reason } : {})
  },

  /** 围观付费看答案 — POST /question/:id/peek（扣围观币） */
  peek: async (id: string): Promise<PaidQuestion> => mapQuestion(await apiPost<RawPaidQuestion>(`/question/${id}/peek`, {})),
}

/**
 * 我的金币余额 — GET /coin/balance（提问/悬赏吸底栏「当前余额」明示用）。
 * 未登录/失败返回 null，调用方隐藏余额行（不编数字）。
 */
export async function getCoinBalance(): Promise<number | null> {
  try {
    const res = await apiGet<{ balance?: number }>('/coin/balance')
    return Number(res?.balance) >= 0 ? Number(res?.balance) : null
  } catch {
    return null
  }
}
