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
