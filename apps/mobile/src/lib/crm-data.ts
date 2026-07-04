/**
 * 客户经营 CRM 数据层（课-P3·服务环）— 对接后端 /crm 系列端点
 * 契约（apps/server/src/modules/crm/crm.controller.ts）：
 *   GET    /crm/clients?tier=&keyword=&page=&pageSize=  客户列表（RFM 实时分层·手机号脱敏）
 *   POST   /crm/clients                                 创建档案（phone/birth 后端 M4 加密落库·体验档≤20）
 *   GET    /crm/clients/:id                             详情（含服务记录/待办提醒·明文电话生辰）
 *   PUT    /crm/clients/:id | DELETE /crm/clients/:id   更新 / 硬删（客户可要求删除·后端审计留痕）
 *   POST/GET /crm/clients/:id/serve-logs · PUT/DELETE /crm/serve-logs/:id  服务记录
 *   GET    /crm/reminders?status=  · PUT /crm/reminders/:id/done · POST /crm/reminders/:id/draft
 *   GET    /crm/suggested-clients  · POST /crm/clients/from-order  订单归因入库询问
 * 合规：后端无导出端点（设计红线）。无 mock 回退：请求失败错误向上抛，页面走三态。
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

/** RFM 四层（与后端 RFM_TIERS 常量一致） */
export type RfmTier = 'HIGH_VALUE' | 'ACTIVE' | 'AT_RISK' | 'DORMANT'

export const RFM_TIER_LABEL: Record<RfmTier, string> = {
  HIGH_VALUE: '高价值',
  ACTIVE: '活跃',
  AT_RISK: '流失预警',
  DORMANT: '沉睡',
}

/** 提醒类型（DAYUN 后端已预留·本期不生成） */
export type ReminderKind = 'BIRTHDAY' | 'LICHUN' | 'REPURCHASE' | 'DAYUN'

/** 服务记录类型 → 中文 */
export const SERVE_TYPE_LABEL: Record<string, string> = {
  consult: '咨询',
  course: '课程',
  product: '商品',
  paipan: '排盘',
}

/** 客户列表项（手机号脱敏） */
export interface CrmClient {
  id: string
  name: string
  phoneMasked: string | null
  hasBirth: boolean
  gender: string | null
  tags: string[]
  source: string
  lastServeAt: string | null
  serveCount: number
  totalSpend: number
  tier: RfmTier
  createdAt: string
}

export interface CrmServeLog {
  id: string
  clientId: string
  type: string
  amount: number | null
  summary: string
  servedAt: string
}

export interface CrmReminder {
  id: string
  clientId: string
  clientName?: string
  kind: ReminderKind
  kindLabel?: string
  dueAt: string
  status: 'PENDING' | 'DONE'
  aiDraft: string | null
  createdAt: string
}

/** 客户详情（档案归本人所有·返回明文电话与生辰） */
export interface CrmClientDetail extends CrmClient {
  phone: string | null
  birth: string | null
  notes: string | null
  serveLogs: CrmServeLog[]
  reminders: CrmReminder[]
}

export interface CrmClientListResult {
  items: CrmClient[]
  /** 分页信息内嵌（后端刻意不平铺 total/page/pageSize，避免响应拦截器误吞 tierCounts/quota） */
  pagination: { total: number; page: number; pageSize: number }
  tierCounts: Record<RfmTier, number>
  /** 体验档配额（limit=null 表示 B 端角色不限量） */
  quota: { used: number; limit: number | null }
}

/** 近30天经我 ref 成交且未入库的买家（昵称已脱敏） */
export interface CrmSuggestedClient {
  orderId: string
  nickname: string
  orderCount: number
  totalAmount: number
  lastOrderAt: string
}

export interface CrmClientForm {
  name: string
  phone?: string
  /** 生辰 YYYY-MM-DD[ HH:mm]（仅用于生日/流年提醒·表单需明示用途并征得客户同意） */
  birth?: string
  gender?: string
  tags?: string[]
  notes?: string
}

export interface CrmServeLogForm {
  type: string
  amount?: number
  summary: string
  servedAt?: string
}

export const crmApi = {
  // ── 客户档案 ──
  listClients(params: { tier?: RfmTier | ''; keyword?: string; page?: number; pageSize?: number } = {}): Promise<CrmClientListResult> {
    const qs = [
      params.tier ? `tier=${params.tier}` : '',
      params.keyword ? `keyword=${encodeURIComponent(params.keyword)}` : '',
      params.page ? `page=${params.page}` : '',
      params.pageSize ? `pageSize=${params.pageSize}` : '',
    ].filter(Boolean).join('&')
    return apiGet<CrmClientListResult>(`/crm/clients${qs ? '?' + qs : ''}`)
  },
  createClient(data: CrmClientForm): Promise<CrmClient> {
    return apiPost<CrmClient>('/crm/clients', data)
  },
  getClient(id: string): Promise<CrmClientDetail> {
    return apiGet<CrmClientDetail>(`/crm/clients/${id}`)
  },
  updateClient(id: string, data: Partial<CrmClientForm>): Promise<CrmClient> {
    return apiPut<CrmClient>(`/crm/clients/${id}`, data)
  },
  deleteClient(id: string): Promise<{ deleted: boolean }> {
    return apiDelete<{ deleted: boolean }>(`/crm/clients/${id}`)
  },

  // ── 服务记录 ──
  addServeLog(clientId: string, data: CrmServeLogForm): Promise<CrmServeLog> {
    return apiPost<CrmServeLog>(`/crm/clients/${clientId}/serve-logs`, data)
  },
  listServeLogs(clientId: string): Promise<{ items: CrmServeLog[] }> {
    return apiGet<{ items: CrmServeLog[] }>(`/crm/clients/${clientId}/serve-logs`)
  },
  deleteServeLog(logId: string): Promise<{ deleted: boolean }> {
    return apiDelete<{ deleted: boolean }>(`/crm/serve-logs/${logId}`)
  },

  // ── 提醒待办 ──
  reminders(status: 'PENDING' | 'DONE' = 'PENDING'): Promise<{ items: CrmReminder[] }> {
    return apiGet<{ items: CrmReminder[] }>(`/crm/reminders?status=${status}`)
  },
  completeReminder(id: string): Promise<CrmReminder> {
    return apiPut<CrmReminder>(`/crm/reminders/${id}/done`)
  },
  /** AI 草拟跟进话术（后端便宜档·失败自动降级模板话术） */
  draftReminder(id: string): Promise<{ id: string; aiDraft: string }> {
    return apiPost<{ id: string; aiDraft: string }>(`/crm/reminders/${id}/draft`)
  },

  // ── 订单归因入库询问 ──
  suggestedClients(): Promise<{ items: CrmSuggestedClient[] }> {
    return apiGet<{ items: CrmSuggestedClient[] }>('/crm/suggested-clients')
  },
  /** 一键入库（只取买家昵称建档·手机号生辰由从业者征得同意后手补） */
  fromOrder(orderId: string): Promise<CrmClient> {
    return apiPost<CrmClient>('/crm/clients/from-order', { orderId })
  },
}
