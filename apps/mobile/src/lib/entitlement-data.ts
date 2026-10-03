/**
 * 统一权益数据层。
 * 小程序、H5 与 APP 只依赖当前登录用户的 userId，由后端聚合全部历史和新权益。
 */
import { apiGet } from '@/utils/request'

export type EntitlementStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED'

export interface EntitlementItem {
  id?: string
  entitlementKey: string
  kind: string
  resourceType: string
  resourceId: string
  scope: string
  quantity: number
  unlimited: boolean
  validFrom?: string
  validUntil: string | null
  effectiveStatus: EntitlementStatus
  source: 'ENTITLEMENT_CENTER' | 'LEGACY_PROJECTION' | 'ORDER_PROJECTION' | 'PURCHASE_PROJECTION'
  sourceId?: string
  metadata?: Record<string, unknown> | null
}

export interface UnifiedEntitlements {
  userId: string
  generatedAt: string
  items: EntitlementItem[]
  wallet: {
    coinBalance: number
    coinFrozen: number
    availableCoupons: number
  }
}

export interface EntitlementLedgerPage {
  items: Array<{
    id: string
    entitlementKey: string
    kind: string
    resourceType: string
    resourceId: string
    scope: string
    action: 'GRANT' | 'CONSUME' | 'REVOKE' | 'ADJUST' | 'MIGRATE'
    quantity: number
    sourceType: string
    sourceId?: string | null
    validFrom: string
    validUntil?: string | null
    createdAt: string
  }>
  total: number
  page: number
  pageSize: number
}

export const entitlementApi = {
  getMine: () => apiGet<UnifiedEntitlements>('/entitlements/me'),
  getLedger: (page = 1, pageSize = 50) =>
    apiGet<EntitlementLedgerPage>(`/entitlements/me/ledger?page=${page}&pageSize=${pageSize}`),
}
