// 会员开通页数据层（pkg-profile/vip）
// 后端真源：
//   - GET /member/plans（member.controller.ts·公开）→ MemberConfig[]：
//     { id, level: MONTHLY/YEARLY/LIFETIME, name, price(Decimal), coinBonus, benefits(Json), isActive }
//   - GET /member/status（需登录）→ { memberLevel, isActive, remainingDays, memberExpire }
//   - GET /system/legal/member（legal.controller.ts·公开）→ 会员服务协议 { title, content, version } 或 null
// 下单/支付/轮询复用 lib/shop-data.ts 的 shopApi（createOrder type=MEMBER / payOrderNative / getOrderPayState）。
// 错误一律抛给页面走三态，不回退假数据。

import { apiGet } from '@/utils/request'

/** 后端会员等级枚举（MemberConfig.level） */
export type MemberLevel = 'MONTHLY' | 'YEARLY' | 'LIFETIME'

/** 会员套餐（MemberConfig 适配后的展示结构） */
export interface VipPlan {
  id: string // MemberConfig.id —— 下单 targetId 用
  level: MemberLevel
  name: string
  price: number
  coinBonus: number // 每月赠送国学币
  benefits: string[] // 权益列表（后端 Json 字符串数组）
  durationName: string // 月度/年度/终身
  dailyPrice: string // 折合每天（终身无此概念为 ''）
  popular?: boolean // 展示层推荐位（年度性价比最高）
}

/** 当前用户会员状态（GET /member/status 适配） */
export interface VipMemberStatus {
  level: 'none' | MemberLevel
  isExpired: boolean
  isLifetime: boolean
  expireAt: string // YYYY-MM-DD（终身/无会员为 ''）
  daysLeft: number // 终身为 -1
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
  coinBonus?: number | string
  benefits?: unknown
}
interface RawStatus {
  memberLevel?: string
  isActive?: boolean
  remainingDays?: number | string
  memberExpire?: string | null
}
interface RawLegal {
  title?: string
  content?: string
  version?: string
}

const DURATION_NAME: Record<MemberLevel, string> = { MONTHLY: '月度', YEARLY: '年度', LIFETIME: '终身' }
const DURATION_DAYS: Record<MemberLevel, number> = { MONTHLY: 30, YEARLY: 365, LIFETIME: 0 }

function isMemberLevel(v: unknown): v is MemberLevel {
  return v === 'MONTHLY' || v === 'YEARLY' || v === 'LIFETIME'
}

export const vipApi = {
  /** 会员套餐列表 — GET /member/plans（后端已按价格升序返回启用项） */
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
          name: p.name || '平台会员',
          price,
          coinBonus: Number(p.coinBonus) || 0,
          benefits: Array.isArray(p.benefits) ? (p.benefits as unknown[]).map(String) : [],
          durationName: DURATION_NAME[level],
          dailyPrice: days > 0 ? (price / days).toFixed(2) : '',
          popular: level === 'YEARLY',
        }
      })
  },

  /** 当前会员状态 — GET /member/status（未登录/接口异常由调用方 catch 后按无会员展示） */
  async getStatus(): Promise<VipMemberStatus> {
    const res = await apiGet<RawStatus>('/member/status')
    const lv = res?.memberLevel
    if (!isMemberLevel(lv)) {
      return { level: 'none', isExpired: false, isLifetime: false, expireAt: '', daysLeft: 0 }
    }
    const isLifetime = lv === 'LIFETIME' || Number(res?.remainingDays) === -1
    return {
      level: lv,
      isExpired: !res?.isActive,
      isLifetime,
      expireAt: res?.memberExpire ? String(res.memberExpire).slice(0, 10) : '',
      daysLeft: isLifetime ? -1 : Number(res?.remainingDays) || 0,
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
