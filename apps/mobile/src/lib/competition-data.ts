/**
 * 赛事 competition 数据层（真连后端 @guoxue/server competition 模块）
 * 后端：CompetitionPublicController（/competitions/*），需 COMPETITION_ENABLED=true 启用。
 * 列表端点经 ResponseInterceptor 拆包 → apiGetPaged 取 .items；对象端点 apiGet。
 * id 为 cuid 字符串。金额单位为「分」。
 */
import { apiGet, apiGetPaged, apiPost } from '@/utils/request'

// ─────────── 后端枚举 ───────────
export type CompetitionStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
export type RoundType = 'REGISTRATION' | 'PRELIMINARY' | 'SEMIFINAL' | 'FINAL'
export type RoundStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED'
export type QuestionType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'FILL_IN' | 'SCALE' | 'CASE_ANALYSIS' | 'ESSAY'
export type RegistrationStatus = 'REGISTERED' | 'QUALIFIED' | 'DISQUALIFIED' | 'WITHDRAWN'
export type PromotionStatus = 'ELIMINATED' | 'PROMOTED' | 'CHAMPION' | 'RUNNER_UP' | 'THIRD_PLACE'
/** 前端展示态（由后端状态映射而来） */
export type UiStatus = 'registering' | 'ongoing' | 'ended'

// ─────────── 类型 ───────────
export interface PrizeItem { rank: number; title?: string; prize?: number; prizeItem?: string; description?: string }

export interface CompetitionRound {
  id: string
  competitionId: string
  type: RoundType
  status: RoundStatus
  title: string
  description?: string | null
  sortOrder: number
  startAt: string
  endAt: string
  duration: number
  passCount: number
  passPercent: number
  liveConfig?: Record<string, any> | null
}

export interface Competition {
  id: string
  title: string
  type: string
  level: string
  status: CompetitionStatus
  description?: string | null
  coverImage?: string | null
  rules?: string | null
  maxParticipants: number
  entryFee: number
  isInviteOnly: boolean
  requireIdentity: boolean
  tags: string[]
  totalPrize: number
  prizeType: string
  prizeConfig?: PrizeItem[] | null
  organizerType?: string | null
  publishedAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  createdAt: string
  rounds?: CompetitionRound[]
  _count?: { registrations?: number; questions?: number }
}

export interface Registration {
  id: string
  competitionId: string
  userId: string
  status: RegistrationStatus
  paidFee: number
  extraData?: Record<string, any> | null
  createdAt: string
}

export interface Ranking {
  id: string
  competitionId: string
  userId: string
  roundId?: string | null
  rank: number
  score: number
  status: PromotionStatus
  prize: number
  certificateUrl?: string | null
  user?: { id: string; nickname?: string | null; avatar?: string | null }
}

export interface PaperQuestion {
  id: string
  type: QuestionType
  score: number
  stem: string
  options?: { key: string; text: string }[] | null
  difficulty: number
}

export interface MyResultAnswer {
  questionId: string
  stem?: string
  type?: QuestionType
  userAnswer?: Record<string, any>
  correctAnswer?: Record<string, any>
  analysis?: string | null
  score?: number | null
  isCorrect?: boolean | null
  duration?: number
}
export interface CompetitionScore {
  id: string
  registrationId: string
  roundId?: string | null
  totalScore: number
  autoScore: number
  judgeScore: number
  rank?: number | null
}
export interface MyResults {
  registration: Registration
  answers: MyResultAnswer[]
  totalScores: CompetitionScore[]
  rankings: Ranking[]
}

// ─────────── 人才库（二期·赛-P4） ───────────
/** 战绩徽章（公开榜只回奖牌；我的档案回完整轨迹含 PARTICIPANT） */
export interface TalentMedal {
  competitionId: string
  title: string
  status: PromotionStatus | 'PARTICIPANT'
  rank?: number | null
  score?: number
  finishedAt?: string
}

/** 人才榜条目（后端已脱敏：昵称掩码·只出头像与战绩） */
export interface TalentItem {
  position: number
  userId: string
  nickname: string
  avatar?: string | null
  bestRank?: number | null
  totalCompetitions: number
  totalWins: number
  talentScore: number
  /** 后端权威分析师段位（收官重算落库·与前端 analystLevel 阈值一致）·存量已回填 */
  level?: AnalystLevel | string
  medals: TalentMedal[]
  isCertified: boolean
  verifiedTitle?: string | null
}

/** 我的战绩档案 */
export interface MyTalentProfile {
  userId: string
  bestRank?: number | null
  totalCompetitions: number
  totalWins: number
  talentScore: number
  /** 后端权威分析师段位（收官重算落库） */
  level?: AnalystLevel | string
  badges: TalentMedal[]
  position?: number | null
  isCertified: boolean
  verifiedTitle?: string | null
}

// ─────────── 易学分析师等级（前端推算·A12/A13） ───────────
// 🔴 后端 CompetitionTalent 无 level 字段、无自动晋级规则（见摸底）。
// 前端按真实 talentScore（冠100/亚60/季40/晋级10/参与2 累计）分档展示，
// 页面须标注"等级依据战绩积分推算"，避免误导为后端权威认证。
export type AnalystLevel = 'TRAINEE' | 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR' | 'MASTER'
export interface AnalystLevelInfo { key: AnalystLevel; label: string; min: number; next?: number }
export const ANALYST_LEVELS: AnalystLevelInfo[] = [
  { key: 'TRAINEE', label: '见习分析师', min: 0, next: 50 },
  { key: 'JUNIOR', label: '初级分析师', min: 50, next: 150 },
  { key: 'INTERMEDIATE', label: '中级分析师', min: 150, next: 400 },
  { key: 'SENIOR', label: '高级分析师', min: 400, next: 800 },
  { key: 'MASTER', label: '资深分析师', min: 800 },
]
/** 按 talentScore 推算分析师等级 + 距下一级进度（真实分数分档·非后端权威字段） */
export function analystLevel(talentScore: number): { info: AnalystLevelInfo; progress: number; toNext: number } {
  let idx = 0
  for (let i = ANALYST_LEVELS.length - 1; i >= 0; i--) {
    if (talentScore >= ANALYST_LEVELS[i].min) { idx = i; break }
  }
  const info = ANALYST_LEVELS[idx]
  const toNext = info.next ? Math.max(0, info.next - talentScore) : 0
  const progress = info.next ? Math.min(100, Math.round(((talentScore - info.min) / (info.next - info.min)) * 100)) : 100
  return { info, progress, toNext }
}

export interface PaperAnswerItem { questionId: string; answer: Record<string, any>; duration?: number }
export interface BatchSubmitResult {
  totalScore: number
  questionCount: number
  results: { questionId: string; score: number; isCorrect: boolean }[]
}

// ─────────── 展示常量与工具（纯函数，可被页面 import） ───────────
/** 后端状态 → 前端展示态。DRAFT/CANCELLED 返回 null（不展示） */
export function mapStatus(s: CompetitionStatus): UiStatus | null {
  if (s === 'PUBLISHED') return 'registering'
  if (s === 'IN_PROGRESS') return 'ongoing'
  if (s === 'FINISHED') return 'ended'
  return null
}

export const uiStatusConfig: Record<UiStatus, { label: string }> = {
  registering: { label: '报名中' },
  ongoing: { label: '进行中' },
  ended: { label: '已结束' },
}

/** 赛事类型 → 中文标签（覆盖后端 CompetitionType 全枚举） */
const TYPE_LABELS: Record<string, string> = {
  BAZI_PREDICT: '八字预测', LIUYAO: '六爻断卦', QIMEN_DUNJIA: '奇门遁甲', MEIHUA_YISHU: '梅花易数',
  ZIWEI_DOUSHU: '紫微斗数', FENGSHUI: '风水堪舆', NAME_ANALYSIS: '姓名学', POETRY: '诗词',
  COUPLET: '对联', CALLIGRAPHY: '书法', PAINTING: '国画', MUSIC: '民乐',
  GO_CHESS: '棋艺', TEA_CEREMONY: '茶道', INCENSE: '香道', MARTIAL_ARTS: '武术太极',
  TCM_DIAGNOSIS: '中医辨证', CLASSIC_RECITE: '经典诵读', GEWU_PERCEIVE: '格物感知', UNKNOWN_PREDICT: '未知预测',
}
export const typeLabel = (t: string) => TYPE_LABELS[t] || '综合'

/** 赛事级别 → 标签与归类（platform/circle/joint 用于徽章配色） */
export function levelInfo(level: string, organizerType?: string | null): { label: string; kind: 'platform' | 'circle' | 'joint' } {
  if (level === 'S') return { label: '平台赛事', kind: 'platform' }
  if (level === 'A') return { label: '联合主办', kind: 'joint' }
  return { label: '圈子赛事', kind: 'circle' }
}

export const roundTypeLabel: Record<RoundType, string> = {
  REGISTRATION: '报名', PRELIMINARY: '初赛', SEMIFINAL: '复赛', FINAL: '总决赛',
}
export const questionTypeLabel: Record<QuestionType, string> = {
  SINGLE_CHOICE: '单选题', MULTI_CHOICE: '多选题', FILL_IN: '填空题',
  SCALE: '量表题', CASE_ANALYSIS: '案例分析', ESSAY: '论述题',
}
export const promotionLabel: Record<PromotionStatus, string> = {
  CHAMPION: '冠军', RUNNER_UP: '亚军', THIRD_PLACE: '季军', PROMOTED: '已晋级', ELIMINATED: '未晋级',
}

/** 分 → 元（去尾零） */
export function yuan(fen?: number | null): string {
  if (!fen) return '0'
  const v = fen / 100
  return Number.isInteger(v) ? String(v) : v.toFixed(2)
}
/** 奖品一句话摘要（首奖） */
export function topPrizeText(c: Competition): string {
  const first = c.prizeConfig?.[0]
  if (first?.description) return first.description
  if (first?.prize) return `${first.title || '冠军'}奖金${yuan(first.prize)}元`
  if (c.totalPrize) return `总奖金池${yuan(c.totalPrize)}元`
  return '荣誉证书'
}
/** ISO → YYYY-MM-DD */
export function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ─────────── API ───────────
export const competitionApi = {
  /** 赛事列表（公开，拉全部由页面按状态过滤；后端默认 createdAt desc） */
  async list(params: { type?: string; status?: CompetitionStatus; keyword?: string; page?: number; pageSize?: number } = {}) {
    const q = new URLSearchParams()
    if (params.type) q.set('type', params.type)
    if (params.status) q.set('status', params.status)
    if (params.keyword) q.set('keyword', params.keyword)
    q.set('page', String(params.page ?? 1))
    q.set('pageSize', String(params.pageSize ?? 50))
    return apiGetPaged<Competition>(`/competitions?${q.toString()}`)
  },
  /** 赛事详情（公开） */
  detail(id: string) {
    return apiGet<Competition>(`/competitions/${id}`)
  },
  /** 排名（公开） */
  rankings(id: string, roundId?: string) {
    const q = new URLSearchParams()
    if (roundId) q.set('roundId', roundId)
    q.set('pageSize', '100')
    return apiGetPaged<Ranking>(`/competitions/${id}/rankings?${q.toString()}`)
  },
  /** 我的报名状态（登录；未报名后端返回 null） */
  myRegistration(id: string) {
    return apiGet<Registration | null>(`/competitions/${id}/my-registration`)
  },
  /** 报名参赛（登录） */
  register(id: string, body: { inviterId?: string; inviteCode?: string } = {}) {
    return apiPost<Registration>(`/competitions/${id}/register`, body)
  },
  /** 我的成绩（登录） */
  myResults(id: string) {
    return apiGet<MyResults>(`/competitions/${id}/my-results`)
  },
  /** 获取试卷（登录，题目+选项乱序，不含答案） */
  getPaper(roundId: string, count = 30) {
    return apiGet<PaperQuestion[]>(`/competitions/rounds/${roundId}/paper?count=${count}`)
  },
  /** 整卷提交（登录，后端自动判客观题） */
  batchSubmit(roundId: string, body: { registrationId: string; answers: PaperAnswerItem[] }) {
    return apiPost<BatchSubmitResult>(`/competitions/rounds/${roundId}/batch-submit`, body)
  },
  /** 单题提交（登录） */
  submitAnswer(roundId: string, body: { registrationId: string; roundId: string; questionId: string; answer: Record<string, any>; duration?: number }) {
    return apiPost(`/competitions/rounds/${roundId}/submit`, body)
  },
  /** 人才榜（公开·脱敏·按 talentScore 降序） */
  talents(params: { page?: number; pageSize?: number } = {}) {
    const q = new URLSearchParams()
    q.set('page', String(params.page ?? 1))
    q.set('pageSize', String(params.pageSize ?? 50))
    return apiGetPaged<TalentItem>(`/competitions/talents?${q.toString()}`)
  },
  /** 我的战绩档案（登录） */
  myTalent() {
    return apiGet<MyTalentProfile>('/competitions/talents/me')
  },
  /** 电子证书 HTML（公开，返回 base64） */
  async certificateHtml(rankingId: string): Promise<string> {
    const base64 = await apiGet<string>(`/competitions/certificates/${rankingId}/view`)
    try {
      // base64 → utf8。H5 端用 atob 解码；非 H5 端无 atob 时原样返回（消费方自行处理）
      if (typeof atob !== 'function') return base64
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      if (typeof TextDecoder === 'function') return new TextDecoder('utf-8').decode(bytes)
      return decodeURIComponent(escape(bin))
    } catch {
      return ''
    }
  },
}
