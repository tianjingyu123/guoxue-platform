/**
 * V8 节气仪式数据层（solar-term 端点·纯文化内容 + 荣誉成就·无资金）
 * 后端契约见 docs/design/V8-节气仪式裂变-设计方案-20260703.md §四。
 *   GET  /solar-term/today       （公开·可选登录）
 *   POST /solar-term/participate （登录·仅节气日当天）
 *   GET  /solar-term/my          （登录）
 * 页面只 import 本文件导出的 solarTermApi / 类型 / 纯工具（成就文案），禁止 import mock。
 */
import { apiGet, apiGetOptionalAuth, apiPost } from '@/utils/request'

/** 当期节气内容（节气日才有；字段均为一句式文化内容） */
export interface SolarTermCurrent {
  /** 拼音 key */
  key: string
  /** 节气名（中文） */
  name: string
  /** 公历日期 YYYY-MM-DD */
  date: string
  /** 三候（「·」分隔的三候一句） */
  sanHou: string
  /** 习俗一句 */
  custom: string
  /** 养生一句 */
  health: string
  /** 应景公版诗句一句 */
  poem: string
}

/** 下一节气 + 距今整天数 */
export interface NextTerm {
  name: string
  daysUntil: number
}

/** GET /solar-term/today 响应 */
export interface SolarTermToday {
  isSolarTermDay: boolean
  current: SolarTermCurrent | null
  next: NextTerm
  /** 登录用户今日是否已参与（未登录恒 false） */
  myParticipated: boolean
}

/** POST /solar-term/participate 响应 */
export interface ParticipateResult {
  /** 参与的节气名 */
  term: string
  /** 本次新获得的成就 code（可为空数组） */
  newAchievements: string[]
  /** 去重后累计参与节气数（对应集齐 x/24） */
  totalTerms: number
}

/** 我参与过的单条记录 */
export interface MyParticipationItem {
  termName: string
  year: number
  participatedAt: string
}

/** GET /solar-term/my 响应 */
export interface MyParticipation {
  participated: MyParticipationItem[]
  totalUniqueTerms: number
  /** 集齐进度字符串「x/24」 */
  collectProgress: string
}

/** 节气成就 code → 展示文案（前端荣誉徽章文案，纯展示） */
const ACHIEVEMENT_LABELS: Record<string, string> = {
  solar_term_ritual: '应时·初参',
  solar_term_4: '应时·四时',
  solar_term_12: '应时·十二气',
  solar_term_24: '应时·廿四节',
}

/** 节气成就 code → 中文文案（未知 code 原样返回，诚实降级不臆造） */
export function achievementLabel(code: string): string {
  return ACHIEVEMENT_LABELS[code] || code
}

export const solarTermApi = {
  /** 今日节气（是否节气日/当期内容/下一节气/我是否已参与）。可选登录，token 自动携带 */
  today(): Promise<SolarTermToday> {
    return apiGetOptionalAuth<SolarTermToday>('/solar-term/today')
  },

  /** 参与今日节气仪式（登录·仅节气日当天可参与；业务异常由页面 catch 走 toast） */
  participate(): Promise<ParticipateResult> {
    return apiPost<ParticipateResult>('/solar-term/participate')
  },

  /** 我参与过的节气 + 集齐进度 x/24（登录） */
  my(): Promise<MyParticipation> {
    return apiGet<MyParticipation>('/solar-term/my')
  },
}
