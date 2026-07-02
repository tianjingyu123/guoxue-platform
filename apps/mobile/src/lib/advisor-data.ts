/**
 * 经营顾问数据层 — 对接后端 /advisor/insights 系列端点
 * 契约：GET /advisor/insights?roleType=... 返回 { insights: [...] }（主体由服务端按当前登录用户解析）
 * 写操作：POST /advisor/insights/:id/read | /act | /dismiss，均返回更新后的 insight。
 * 无 mock 回退：请求失败错误向上抛，由调用方决定降级策略。
 */
import { apiGet, apiPost } from '@/utils/request'

/** 顾问建议面向的角色类型 */
export type AdvisorRoleType = 'STATION_MASTER' | 'STATION_OFFLINE_OWNER'

/** 建议严重级别 */
export type AdvisorSeverity = 'INFO' | 'WARN' | 'CRITICAL'

/** 建议状态 */
export type AdvisorInsightStatus = 'OPEN' | 'READ'

/** 建议动作（当前仅 NAVIGATE 跳转） */
export interface AdvisorAction {
  label: string
  type: 'NAVIGATE'
  /** 跳转目标页面路径 */
  target: string
}

/** 一条经营顾问建议 */
export interface AdvisorInsight {
  id: string
  /** 规则标识（后端规则引擎产出） */
  ruleKey: string
  severity: AdvisorSeverity
  /** 建议文案 */
  content: string
  actions: AdvisorAction[]
  status: AdvisorInsightStatus
  createdAt: string
}

/** 站长推广转化漏斗（后端 GET /track/funnel，主体=当前登录站长，非站长会抛"你还没有开通分站"） */
export interface StationFunnel {
  /** 统计天数（默认30，最大90） */
  days: number
  /** 分享链接点击数 */
  clicks: number
  /** 新用户注册数（推荐关系归因） */
  registrations: number
  /** 下单用户数（去重） */
  buyers: number
}

/**
 * 今日万年历（后端 GET /wannianli/today 返回 DayDetail，此处仅声明轻栏展示所需子集）
 * 真实字段名以 apps/server/src/modules/wannianli/wannianli.service.ts 的 DayDetail 为准：
 * lunarDate 形如「丙午年闰5月18日」；riGanZhi 形如「甲子」；yi/ji 为字符串数组。
 */
export interface AlmanacToday {
  /** 公历日期 YYYY-MM-DD */
  solarDate: string
  /** 农历日期（含干支年，如「丙午年5月18日」） */
  lunarDate: string
  /** 日干支（如「甲子」） */
  riGanZhi: string
  /** 节气（当日无节气则缺省） */
  jieQi?: string
  /** 宜（后端为数组，出于兼容也允许字符串） */
  yi: string[] | string
  /** 忌（同上） */
  ji: string[] | string
}

/** 站长推广漏斗 API（无 mock 回退，失败向上抛，由组件决定隐藏降级） */
export const funnelApi = {
  /** 拉取当前登录站长近 N 天的推广转化漏斗（默认30天） */
  get(days = 30): Promise<StationFunnel> {
    return apiGet<StationFunnel>(`/track/funnel?days=${days}`)
  },
}

/** 万年历轻量 API（工作台今日宜忌轻栏用；无 mock 回退） */
export const almanacApi = {
  /** 今日万年历（库中无当日数据时后端返回 null） */
  today(): Promise<AlmanacToday | null> {
    return apiGet<AlmanacToday | null>('/wannianli/today')
  },
}

export const advisorApi = {
  /** 拉取当前登录用户在指定角色下的经营建议列表 */
  async list(roleType: AdvisorRoleType): Promise<AdvisorInsight[]> {
    const res = await apiGet<{ insights: AdvisorInsight[] }>(`/advisor/insights?roleType=${roleType}`)
    return Array.isArray(res?.insights) ? res.insights : []
  },

  /** 标记一条建议为已读 */
  read(id: string): Promise<AdvisorInsight> {
    return apiPost<AdvisorInsight>(`/advisor/insights/${id}/read`)
  },

  /** 标记一条建议为已采纳（用户点击动作按钮） */
  act(id: string): Promise<AdvisorInsight> {
    return apiPost<AdvisorInsight>(`/advisor/insights/${id}/act`)
  },

  /** 忽略一条建议 */
  dismiss(id: string): Promise<AdvisorInsight> {
    return apiPost<AdvisorInsight>(`/advisor/insights/${id}/dismiss`)
  },
}
