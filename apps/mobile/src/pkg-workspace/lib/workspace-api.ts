/**
 * 从业者工作台 · 接口层
 *
 * 全部真接口（后端 practitioner 模块）。V0 原稿是 1128 行静态假数据，一律不搬。
 * 唯一「本地」的东西是报告章节骨架（REPORT_TYPES）——那是内容模板不是数据，
 * AI 按骨架填正文，老师再改。
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

/* ───────────── 类型 ───────────── */

import type { SeedReportType } from '@/lib/paipan/report-chapters'
export type ReportType = SeedReportType

export interface ReportChapter {
  key: string
  title: string
  /** 正文（AI 起草 → 老师定稿） */
  body: string
  /** 是否 AI 生成（交付页要显式披露） */
  ai?: boolean
}

/** 盘面快照：由前端已交叉验证的排盘引擎算好后原样存档，报告图文并茂用 */
export interface ReportPaipan {
  toolKey: string
  toolLabel: string
  /** 四柱 / 星曜 / 卦象等，各工具结构不同，按各自结果页原样存 */
  data: Record<string, unknown>
  /** 一句话摘要（列表页展示） */
  summary?: string
}

export interface ReportRecord {
  id: string
  ownerId?: string
  clientId?: string | null
  toolKey?: string | null
  type: ReportType
  typeLabel: string
  title: string
  clientName: string
  clientBirth?: string | null
  status: 'draft' | 'final' | 'delivered'
  style: string
  paipan?: ReportPaipan | null
  chapters?: ReportChapter[] | null
  shareToken?: string | null
  sharedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ProStatus {
  isPro: boolean
  expireAt: string | null
  firstPaidAt: string | null
  daysLeft: number
  /** 价格（元/月），真源后端 CommissionConfig，前端不写死 */
  price: number
  period: string
  freeReportQuota: number
}

export interface WorkspaceBrand {
  brandName: string
  title: string
  avatarText: string
  logoUrl: string
  sealText: string
  slogan: string
  contact: string
  disclaimer: string
}

export interface Appointment {
  id: string
  clientId?: string | null
  clientName: string
  startAt: string
  service: string
  channel: string
  status: 'pending' | 'confirmed' | 'done' | 'cancelled'
  note?: string | null
  fee?: string | number | null
}

export interface CaseRecord {
  id: string
  reportId?: string | null
  title: string
  clientName?: string | null
  category: string
  summary?: string | null
  tags: string[]
  fee: string | number
  occurredAt: string
}

export interface LedgerEntry {
  id: string
  source: 'manual' | 'platform'
  clientName: string
  service: string
  amount: number
  payMethod: string
  note: string
  occurredAt: string
  /** 平台结算的钱老师改不了，只有自己手记的能删改 */
  editable: boolean
}

/* ───────────── 报告类型骨架 ───────────── */
// 唯一真源在主包 lib/paipan/report-chapters（排盘结果页造种子时也要用它，分包看不见彼此）
export { REPORT_TYPE_LIST as REPORT_TYPES, reportTypeOf, TOOL_REPORT_TYPE } from '@/lib/paipan/report-chapters'
export type { ReportTypeSpec, SeedReportType } from '@/lib/paipan/report-chapters'

function qs(q: Record<string, string | undefined>): string {
  const pairs = Object.entries(q).filter(([, v]) => !!v) as [string, string][]
  if (!pairs.length) return ''
  return '?' + pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
}

/* ───────────── 接口 ───────────── */

export const wsApi = {
  home: () => apiGet<any>('/practitioner/home'),
  profile: () => apiGet<any>('/practitioner/profile'),
  pro: () => apiGet<ProStatus>('/practitioner/pro'),
  saveBrand: (b: Partial<WorkspaceBrand>) => apiPut<any>('/practitioner/brand', b),

  // 报告
  listReports: (q: { status?: string; keyword?: string } = {}) =>
    apiGet<{ list: ReportRecord[]; total: number; quota: { used: number; limit: number | null; unlimited: boolean } }>(
      `/practitioner/reports${qs(q)}`,
    ),
  getReport: (id: string) => apiGet<ReportRecord>(`/practitioner/reports/${id}`),
  createReport: (r: Partial<ReportRecord>) => apiPost<ReportRecord>('/practitioner/reports', r),
  updateReport: (id: string, r: Partial<ReportRecord>) => apiPut<ReportRecord>(`/practitioner/reports/${id}`, r),
  deleteReport: (id: string) => apiDelete<{ success: boolean }>(`/practitioner/reports/${id}`),
  shareReport: (id: string) => apiPost<{ shareToken: string; sharedAt: string }>(`/practitioner/reports/${id}/share`),
  unshareReport: (id: string) => apiDelete<{ success: boolean }>(`/practitioner/reports/${id}/share`),
  sharedReport: (token: string) => apiGet<any>(`/practitioner/reports/shared/${token}`),
  /** AI 起草某一章（盘面由排盘引擎算好后传入，AI 只写解读） */
  aiDraft: (p: { chapterTitle: string; reportTypeLabel: string; clientName: string; paipan: unknown; hint?: string }) =>
    apiPost<{ text: string }>('/practitioner/reports/ai-draft', p, undefined, 60000),

  // 案例库
  listCases: (q: { category?: string; keyword?: string } = {}) =>
    apiGet<{ list: CaseRecord[]; total: number }>(`/practitioner/cases${qs(q)}`),
  createCase: (c: Partial<CaseRecord>) => apiPost<CaseRecord>('/practitioner/cases', c),
  updateCase: (id: string, c: Partial<CaseRecord>) => apiPut<CaseRecord>(`/practitioner/cases/${id}`, c),
  deleteCase: (id: string) => apiDelete<{ success: boolean }>(`/practitioner/cases/${id}`),

  // 日程
  listAppointments: (q: { from?: string; to?: string; status?: string } = {}) =>
    apiGet<{ list: Appointment[]; total: number }>(`/practitioner/appointments${qs(q)}`),
  createAppointment: (a: Partial<Appointment>) => apiPost<Appointment>('/practitioner/appointments', a),
  updateAppointment: (id: string, a: Partial<Appointment>) => apiPut<Appointment>(`/practitioner/appointments/${id}`, a),
  deleteAppointment: (id: string) => apiDelete<{ success: boolean }>(`/practitioner/appointments/${id}`),

  // 账本
  ledger: (month?: string) => apiGet<any>(`/practitioner/ledger${month ? `?month=${month}` : ''}`),
  addLedger: (e: {
    clientName?: string
    service: string
    amount: number
    payMethod?: string
    note?: string
    occurredAt?: string
  }) => apiPost<any>('/practitioner/ledger', e),
  deleteLedger: (id: string) => apiDelete<{ success: boolean }>(`/practitioner/ledger/${id}`),

  // 客户档案 —— 复用 CRM（不另起炉灶）
  listClients: (q: { keyword?: string; tag?: string } = {}) => apiGet<any>(`/crm/clients${qs(q)}`),
  getClient: (id: string) => apiGet<any>(`/crm/clients/${id}`),
  createClient: (c: Record<string, unknown>) => apiPost<any>('/crm/clients', c),
  updateClient: (id: string, c: Record<string, unknown>) => apiPut<any>(`/crm/clients/${id}`, c),
  deleteClient: (id: string) => apiDelete<any>(`/crm/clients/${id}`),
}

/** 开通/续费从业者会员：走商城订单（在线支付 → 回调开通，与书院会员互不影响） */
export function createProOrder() {
  return apiPost<{ id: string; amount: number }>('/shop/orders', { type: 'PRACTITIONER_PRO' })
}
