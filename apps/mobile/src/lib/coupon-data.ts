/**
 * 优惠券数据层（C 端领券闭环 · shop 旧体系 Coupon/UserCoupon）
 *
 * ⚠️ 体系选择说明：商城 checkout 下单核销走的是 shop 体系（shop.service 只查 UserCoupon），
 * 本页领的券必须能在结算时用掉，故对接 /shop/coupons*（与核销打通的闭环）：
 * - GET  /shop/coupons?pageSize=50   → { coupons, total, page, pageSize }
 *   （真实 query 仅 page/pageSize/admin；非 admin 后端自动过滤 status=ACTIVE 且未过期）
 * - POST /shop/coupons/:id/claim     → 新建 UserCoupon 行（限量/重复领取校验，业务异常 message 直接 toast）
 * - GET  /shop/coupons/my            → UserCoupon[] 裸数组（后端只返回 used=false，include coupon）
 *
 * 适配层派生逻辑：
 * - claimed：旧页面思路 = 叠加「我的券」列表推算——持有该 couponId 的未使用券即视为已领
 *   （与后端 claim 规则一致：持有未使用券时重复领取会被拒）
 * - 我的券三态：UserCoupon 无 status 枚举，由 used/usedAt + coupon.validEnd/coupon.status 派生
 *   unused/used/expired（后端 my 只返回未使用券 → used 页签天然为空，如实呈现）
 * - perUserLimit：shop 体系无此字段 → 0 = 数据缺失，页面诚实隐藏「每人限领」文案
 *
 * marketing 模块 /marketing/coupons*（CouponTemplate/CouponRecord）是 admin 营销模板体系，
 * 与 checkout 核销未打通，待 P1 两套券体系统一后再切换。
 */
import { apiGet, apiPost } from '@/utils/request'

/* ── 类型 ── */
export type CouponType = 'amount' | 'percent'
export type MyCouponStatus = 'unused' | 'used' | 'expired'

/** 可领券（领券中心卡片） */
export interface CouponTemplate {
  id: string
  name: string
  type: CouponType
  /** 面值：满减为元；折扣为 90 = 9 折 */
  value: number
  /** 使用门槛（满 X 可用，0 = 无门槛） */
  minAmount: number
  /** 有效期（yyyy-MM-dd，空 = 页面降级隐藏） */
  expireAt: string
  scope: string[]
  /** 剩余可领量（-1 = 不限量/后端未给，视为充足不展示） */
  remaining: number
  /** 每人限领（0 = 后端未提供，页面隐藏限领文案；shop 体系无此字段） */
  perUserLimit: number
  /** 当前用户已领数（shop 体系 = 是否持有未使用券 0/1） */
  claimed: number
}

/** 我的券（券包列表项） */
export interface MyCouponItem {
  id: string
  name: string
  type: CouponType
  value: number
  minAmount: number
  expireAt: string
  scope: string[]
  status: MyCouponStatus
}

export const couponTabs: { key: MyCouponStatus | 'center'; label: string }[] = [
  { key: 'unused', label: '未使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
  { key: 'center', label: '领券中心' },
]

/** 优惠券面值展示 */
export function formatCouponValue(c: { type: CouponType; value: number }): string {
  return c.type === 'percent' ? `${c.value / 10}折` : `¥${c.value}`
}

/* ── 宽松归一化（多套命名兼容，Decimal 序列化为字符串亦可安全转数） ── */
interface RawCoupon {
  id?: string | number
  templateId?: string | number
  name?: string
  title?: string
  /** shop CouponType: FULL_REDUCE/DISCOUNT/NO_THRESHOLD */
  type?: string
  /** 兼容旧字段：满减金额/折扣率（Decimal → "10.00"） */
  value?: number | string
  faceValue?: number | string
  amount?: number | string
  discountAmount?: number | string
  /** 折扣率新字段（0.85 = 85折） */
  discountRate?: number | string
  minAmount?: number | string
  threshold?: number | string
  scope?: string | string[]
  status?: string
  validEnd?: string
  expireAt?: string
  endTime?: string
  /** -1 = 不限量 */
  totalCount?: number | string
  usedCount?: number | string
  remaining?: number | string
  remainCount?: number | string
  stock?: number | string
  perUserLimit?: number | string
  limitPerUser?: number | string
}
interface RawUserCoupon {
  id?: string | number
  couponId?: string | number
  used?: boolean
  usedAt?: string | null
  status?: string
  coupon?: RawCoupon | null
  template?: RawCoupon | null
}

const SCOPE_LABELS: Record<string, string> = {
  ALL: '全场通用', PRODUCT: '商城', COURSE: '课程', CIRCLE: '圈子', MEMBER: '会员', EBOOK: '电子书',
}
function num(v: unknown, fallback = 0): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : fallback
}
/** 后端 CouponType(NO_THRESHOLD/FULL_REDUCE/DISCOUNT) → 前端展示类型（兼容直传 percent/amount） */
function adaptType(t?: string): CouponType {
  const s = String(t || '').toUpperCase()
  return s === 'DISCOUNT' || s === 'PERCENT' ? 'percent' : 'amount'
}
/** 面值归一：满减为元；折扣后端 0.85 → 前端 85（已是 >1 的百分制则原样） */
function adaptValue(type: CouponType, raw: unknown): number {
  const v = num(raw)
  if (type === 'percent' && v > 0 && v <= 1) return Math.round(v * 100)
  return v
}
function adaptScope(s?: string | string[]): string[] {
  if (Array.isArray(s)) return s.map((x) => SCOPE_LABELS[String(x).toUpperCase()] || String(x)).filter(Boolean)
  if (!s) return ['全场通用']
  return [SCOPE_LABELS[String(s).toUpperCase()] || String(s)]
}
function fmtDate(s?: string | null): string {
  return s ? String(s).slice(0, 10) : ''
}
/** { coupons } / { items } / 裸数组 三兼容取列表 */
function pickItems<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[]
  const o = res as { coupons?: T[]; items?: T[] } | null
  if (Array.isArray(o?.coupons)) return o!.coupons!
  if (Array.isArray(o?.items)) return o!.items!
  return []
}

function adaptTemplate(r: RawCoupon, heldCouponIds: Set<string>): CouponTemplate {
  const id = String(r.id ?? r.templateId ?? '')
  const type = adaptType(r.type)
  const total = num(r.totalCount, -1)
  const used = num(r.usedCount, -1)
  // 剩余量：remaining/remainCount/stock 直取；否则 totalCount-usedCount 推导；totalCount=-1 不限量 → -1
  let remaining = num(r.remaining ?? r.remainCount ?? r.stock, -1)
  if (remaining < 0 && total >= 0 && used >= 0) remaining = Math.max(0, total - used)
  return {
    id,
    name: r.name || r.title || '优惠券',
    type,
    value: adaptValue(type, r.value ?? r.faceValue ?? r.amount ?? r.discountAmount ?? r.discountRate),
    minAmount: num(r.minAmount ?? r.threshold),
    expireAt: fmtDate(r.validEnd || r.expireAt || r.endTime),
    scope: adaptScope(r.scope),
    remaining,
    // shop 体系无 perUserLimit：0 = 缺失，页面隐藏限领文案
    perUserLimit: num(r.perUserLimit ?? r.limitPerUser, 0),
    // 持有未使用券即已领（后端 claim 会拒绝重复领取）
    claimed: heldCouponIds.has(id) ? 1 : 0,
  }
}

/** UserCoupon 无 status 枚举 → used/usedAt + coupon.validEnd/coupon.status 派生三态 */
function deriveMyStatus(r: RawUserCoupon, c: RawCoupon): MyCouponStatus {
  const s = String(r.status || '').toLowerCase()
  if (s === 'unused' || s === 'used' || s === 'expired') return s as MyCouponStatus
  if (r.used || r.usedAt) return 'used'
  const end = c.validEnd || c.expireAt || c.endTime
  if (end && new Date(end).getTime() < Date.now()) return 'expired'
  if (c.status && String(c.status).toUpperCase() !== 'ACTIVE') return 'expired'
  return 'unused'
}

function adaptMyCoupon(r: RawUserCoupon): MyCouponItem {
  const c: RawCoupon = r.coupon || r.template || {}
  const type = adaptType(c.type)
  return {
    id: String(r.id ?? c.id ?? ''),
    name: c.name || c.title || '优惠券',
    type,
    value: adaptValue(type, c.value ?? c.faceValue ?? c.amount ?? c.discountAmount ?? c.discountRate),
    minAmount: num(c.minAmount ?? c.threshold),
    expireAt: fmtDate(c.validEnd || c.expireAt || c.endTime),
    scope: adaptScope(c.scope),
    status: deriveMyStatus(r, c),
  }
}

/** 拉「我的券」原始列表（my 只返回 used=false 的持有券） */
async function fetchMyRaw(): Promise<RawUserCoupon[]> {
  const res = await apiGet<RawUserCoupon[] | { items?: RawUserCoupon[] }>('/shop/coupons/my')
  return pickItems<RawUserCoupon>(res)
}

/* ── API ── */
export const couponApi = {
  /** 领券中心：可领券列表 — GET /shop/coupons（非 admin 后端已滤 ACTIVE+未过期），叠加 my 推算 claimed */
  async getAvailable(): Promise<CouponTemplate[]> {
    // 未登录/拉取失败 → 不标记已领（安全降级，重复领取后端仍会校验并 toast）
    let held = new Set<string>()
    try {
      const my = await fetchMyRaw()
      held = new Set(
        my.filter((r) => !r.used).map((r) => String(r.couponId ?? r.coupon?.id ?? '')).filter(Boolean),
      )
    } catch { /* 忽略：claimed 统一为 0 */ }
    const res = await apiGet<{ coupons?: RawCoupon[] } | RawCoupon[]>('/shop/coupons?pageSize=50')
    return pickItems<RawCoupon>(res).map((r) => adaptTemplate(r, held)).filter((c) => c.id)
  },

  /** 领取优惠券 — POST /shop/coupons/:id/claim（响应=新建 UserCoupon 行；业务异常 message 由页面 toast） */
  async claim(couponId: string): Promise<{ couponId: string }> {
    const res = await apiPost<{ id?: string; couponId?: string }>(`/shop/coupons/${couponId}/claim`)
    return { couponId: String(res?.couponId ?? res?.id ?? '') }
  },

  /** 我的券 — GET /shop/coupons/my（后端无 status 查询；前端派生三态后按页签过滤） */
  async getMy(status: MyCouponStatus): Promise<MyCouponItem[]> {
    const items = await fetchMyRaw()
    return items.map(adaptMyCoupon).filter((c) => c.id && c.status === status)
  },
}
