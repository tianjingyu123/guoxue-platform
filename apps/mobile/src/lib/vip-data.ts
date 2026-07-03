// 会员开通页数据层（pkg-profile/vip）— 书院会员（C1 会员产品化 · 2026-07-03 用户拍板）
// 后端真源：
//   - GET /member/plans（member.controller.ts·公开）→ MemberConfig[]：
//     { id, level: MONTHLY/QUARTERLY/YEARLY/YEARLY_AUTO, name, price(Decimal), monthlyPoints, sort, benefits(Json), isActive }
//   - GET /member/status（需登录）→ { memberLevel, isActive, remainingDays, memberExpire, autoRenew }
//   - GET /member/purchases（需登录）→ { items: [{ id, memberType, amount, paidAt, expireAt }], total }
//   - GET /member/ai-quota（需登录）→ { isMember, dailyLimit, usedToday, remaining }（会员 dailyLimit/remaining=-1）
//   - GET /system/legal/member（legal.controller.ts·公开）→ 会员服务协议 { title, content, version } 或 null
// 下单/支付/轮询复用 lib/shop-data.ts 的 shopApi（createOrder type=MEMBER / payOrderNative / getOrderPayState）。
// 错误一律抛给页面走三态，不回退假数据。

import { apiGet } from '@/utils/request'

/** 后端会员套餐档位（MemberConfig.level；LIFETIME 已停售仅存量展示） */
export type MemberLevel = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'YEARLY_AUTO' | 'LIFETIME'

/** 会员套餐（MemberConfig 适配后的展示结构） */
export interface VipPlan {
  id: string // MemberConfig.id —— 下单 targetId 用
  level: MemberLevel
  name: string
  price: number
  monthlyPoints: number // 每月赠送积分
  benefits: string[] // 权益列表（后端 Json 字符串数组）
  durationName: string // 月卡/季卡/年卡/连续包年
  dailyPrice: string // 折合每天（''=不展示）
  popular?: boolean // 展示层推荐位（年卡主推）
  autoRenew?: boolean // 连续包年档
}

/** 当前用户会员状态（GET /member/status 适配） */
export interface VipMemberStatus {
  level: 'none' | MemberLevel
  isExpired: boolean
  isLifetime: boolean
  expireAt: string // YYYY-MM-DD（终身/无会员为 ''）
  daysLeft: number // 终身为 -1
  autoRenew: boolean // 连续包年用户
}

/** 我的会员购买记录（GET /member/purchases 适配） */
export interface VipPurchaseRecord {
  id: string
  levelName: string // 月卡/季卡/年卡/终身
  amount: number
  paidAt: string // YYYY-MM-DD
  expireAt: string // YYYY-MM-DD（终身为 ''）
}

/** 会员服务协议（GET /system/legal/member 原文） */
export interface VipAgreement {
  title: string
  content: string // Markdown 纯文本
  version: string
}

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，不 export） —— */
interface RawPlan {
  id?: string
  level?: string
  name?: string
  price?: number | string
  monthlyPoints?: number | string
  sort?: number | string
  benefits?: unknown
}
interface RawStatus {
  memberLevel?: string
  isActive?: boolean
  remainingDays?: number | string
  memberExpire?: string | null
  autoRenew?: boolean
}
interface RawPurchase {
  id?: string
  memberType?: string
  amount?: number | string
  paidAt?: string
  expireAt?: string | null
}
interface RawLegal {
  title?: string
  content?: string
  version?: string
}

const DURATION_NAME: Record<MemberLevel, string> = {
  MONTHLY: '月卡',
  QUARTERLY: '季卡',
  YEARLY: '年卡',
  YEARLY_AUTO: '连续包年',
  LIFETIME: '终身',
}
const DURATION_DAYS: Record<MemberLevel, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
  YEARLY_AUTO: 365,
  LIFETIME: 0,
}
/** 展示顺序：月/季/年(主推)/连续包年（后端 sort 缺失时兜底） */
const LEVEL_ORDER: Record<MemberLevel, number> = {
  MONTHLY: 1,
  QUARTERLY: 2,
  YEARLY: 3,
  YEARLY_AUTO: 4,
  LIFETIME: 9,
}

function isMemberLevel(v: unknown): v is MemberLevel {
  return v === 'MONTHLY' || v === 'QUARTERLY' || v === 'YEARLY' || v === 'YEARLY_AUTO' || v === 'LIFETIME'
}

/** 用户身上的等级（status/记录里不会出现 YEARLY_AUTO，连续包年记 YEARLY+autoRenew） */
export function memberLevelLabel(level: string): string {
  if (level === 'MONTHLY') return '月卡会员'
  if (level === 'QUARTERLY') return '季卡会员'
  if (level === 'YEARLY') return '年卡会员'
  if (level === 'LIFETIME') return '终身会员'
  return '书院会员'
}

export const vipApi = {
  /** 会员套餐列表 — GET /member/plans（启用项；前端按 sort→档位序排列） */
  async getPlans(): Promise<VipPlan[]> {
    const res = await apiGet<RawPlan[]>('/member/plans')
    const list = Array.isArray(res) ? res : []
    return list
      .filter((p): p is RawPlan & { id: string; level: MemberLevel } => !!p?.id && isMemberLevel(p?.level))
      .map((p) => {
        const level = p.level
        const price = Number(p.price) || 0
        const days = DURATION_DAYS[level]
        return {
          id: String(p.id),
          level,
          name: p.name || '书院会员',
          price,
          monthlyPoints: Number(p.monthlyPoints) || 0,
          benefits: Array.isArray(p.benefits) ? (p.benefits as unknown[]).map(String) : [],
          durationName: DURATION_NAME[level],
          dailyPrice: days > 0 ? (price / days).toFixed(2) : '',
          popular: level === 'YEARLY',
          autoRenew: level === 'YEARLY_AUTO',
          _sort: Number(p.sort) || LEVEL_ORDER[level],
        }
      })
      .sort((a, b) => a._sort - b._sort)
      .map(({ _sort: _ignored, ...plan }) => plan)
  },

  /** 当前会员状态 — GET /member/status（未登录/接口异常由调用方 catch 后按无会员展示） */
  async getStatus(): Promise<VipMemberStatus> {
    const res = await apiGet<RawStatus>('/member/status')
    const lv = res?.memberLevel
    if (!isMemberLevel(lv)) {
      return { level: 'none', isExpired: false, isLifetime: false, expireAt: '', daysLeft: 0, autoRenew: false }
    }
    const isLifetime = lv === 'LIFETIME' || Number(res?.remainingDays) === -1
    return {
      level: lv,
      isExpired: !res?.isActive,
      isLifetime,
      expireAt: res?.memberExpire ? String(res.memberExpire).slice(0, 10) : '',
      daysLeft: isLifetime ? -1 : Number(res?.remainingDays) || 0,
      autoRenew: !!res?.autoRenew,
    }
  },

  /** 我的购买记录 — GET /member/purchases */
  async getPurchases(page = 1, pageSize = 20): Promise<{ items: VipPurchaseRecord[]; total: number }> {
    const res = await apiGet<{ items?: RawPurchase[]; total?: number }>('/member/purchases', {
      page: String(page),
      pageSize: String(pageSize),
    })
    const items = (Array.isArray(res?.items) ? res.items : [])
      .filter((r): r is RawPurchase & { id: string } => !!r?.id)
      .map((r) => ({
        id: String(r.id),
        levelName: memberLevelLabel(String(r.memberType || '')),
        amount: Number(r.amount) || 0,
        paidAt: r.paidAt ? String(r.paidAt).slice(0, 10) : '',
        expireAt: r.expireAt ? String(r.expireAt).slice(0, 10) : '',
      }))
    return { items, total: Number(res?.total) || items.length }
  },

  /** AI 伴读额度 — GET /member/ai-quota（会员 remaining=-1 表示不限量） */
  async getAiQuota(): Promise<{ isMember: boolean; dailyLimit: number; usedToday: number; remaining: number }> {
    const res = await apiGet<{ isMember?: boolean; dailyLimit?: number; usedToday?: number; remaining?: number }>(
      '/member/ai-quota',
    )
    return {
      isMember: !!res?.isMember,
      dailyLimit: Number(res?.dailyLimit ?? 10),
      usedToday: Number(res?.usedToday ?? 0),
      remaining: Number(res?.remaining ?? 0),
    }
  },

  /** 会员服务协议 — GET /system/legal/member（无已发布文档返回 null，页面走空态提示） */
  async getAgreement(): Promise<VipAgreement | null> {
    const row = await apiGet<RawLegal | null>('/system/legal/member')
    if (!row || !row.content) return null
    return {
      title: row.title || '会员服务协议',
      content: row.content,
      version: row.version || '',
    }
  },
}
