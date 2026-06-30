/**
 * 圈子退款 数据层（真连 circle-refund 后端，规则见 docs/circle-refund-rules-v2.md）
 */
import { apiGet, apiPost } from '@/utils/request'

export interface RefundPreview {
  orderId: string | null
  paidAmount: number
  dailyCost: number
  usedDays: number
  refundBase: number   // 应退（手续费前）
  feeAmount: number    // 手续费
  actualRefund: number // 实际到账
  feeRate: number
}

export interface RefundRequestItem {
  id: string
  circleId: string
  circleName: string
  userId: string
  userNickname: string
  userAvatar: string
  paidAmount: number
  dailyCost: number
  usedDays: number
  refundBase: number
  feeAmount: number
  actualRefund: number
  reason: string
  ownerStatus: string  // pending/approved/rejected
  adminStatus: string
  refundStatus: string // pending/refunding/refunded/failed
  ownerRejectReason?: string | null
  adminRejectReason?: string | null
  createdAt: string
}

function num(v: any): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }

function adaptItem(x: any): RefundRequestItem {
  return {
    id: x.id,
    circleId: x.circleId,
    circleName: x.circleName ?? '',
    userId: x.userId ?? '',
    userNickname: x.userNickname ?? '用户',
    userAvatar: x.userAvatar ?? '',
    paidAmount: num(x.paidAmount),
    dailyCost: num(x.dailyCost),
    usedDays: num(x.usedDays),
    refundBase: num(x.refundBase),
    feeAmount: num(x.feeAmount),
    actualRefund: num(x.actualRefund),
    reason: x.reason ?? '',
    ownerStatus: x.ownerStatus,
    adminStatus: x.adminStatus,
    refundStatus: x.refundStatus,
    ownerRejectReason: x.ownerRejectReason,
    adminRejectReason: x.adminRejectReason,
    createdAt: x.createdAt,
  }
}

function pickArray(r: any): any[] {
  return Array.isArray(r) ? r : (r?.data ?? [])
}

export const refundApi = {
  /** 退款金额预览 — GET /circle-refund/preview/:circleId（业务不可退时后端抛错带 message） */
  preview: async (circleId: string): Promise<RefundPreview> => {
    const r = await apiGet<any>(`/circle-refund/preview/${circleId}`)
    return {
      orderId: r?.orderId ?? null,
      paidAmount: num(r?.paidAmount),
      dailyCost: num(r?.dailyCost),
      usedDays: num(r?.usedDays),
      refundBase: num(r?.refundBase),
      feeAmount: num(r?.feeAmount),
      actualRefund: num(r?.actualRefund),
      feeRate: num(r?.feeRate) || 0.2,
    }
  },
  /** 提交申诉退款申请 — POST /circle-refund/apply/:circleId */
  apply: (circleId: string, reason?: string) =>
    apiPost(`/circle-refund/apply/${circleId}`, { reason }),
  /** 我的退款申请 — GET /circle-refund/my */
  myRefunds: async (): Promise<RefundRequestItem[]> => {
    try { return pickArray(await apiGet<any>('/circle-refund/my')).map(adaptItem) } catch { return [] }
  },
  /** 圈主待审退款 — GET /circle-refund/owner-pending */
  ownerPending: async (): Promise<RefundRequestItem[]> => {
    try { return pickArray(await apiGet<any>('/circle-refund/owner-pending')).map(adaptItem) } catch { return [] }
  },
  /** 圈主审核 — POST /circle-refund/:id/owner-review */
  ownerReview: (id: string, approve: boolean, rejectReason?: string) =>
    apiPost(`/circle-refund/${id}/owner-review`, { approve, rejectReason }),
  /** 我的余额钱包 — GET /circle-refund/wallet */
  wallet: async (): Promise<WalletInfo> => {
    try {
      const r = await apiGet<any>('/circle-refund/wallet')
      const txns = Array.isArray(r?.transactions) ? r.transactions : []
      return {
        balance: num(r?.balance),
        transactions: txns.map((t: any) => ({
          type: t.type, amount: num(t.amount), balanceAfter: num(t.balanceAfter),
          remark: t.remark ?? '', createdAt: t.createdAt,
        })),
      }
    } catch {
      return { balance: 0, transactions: [] }
    }
  },
}

export interface WalletTxn {
  type: string
  amount: number
  balanceAfter: number
  remark: string
  createdAt: string
}
export interface WalletInfo {
  balance: number
  transactions: WalletTxn[]
}
