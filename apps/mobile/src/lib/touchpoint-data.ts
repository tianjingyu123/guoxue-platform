import { apiGetOptionalAuth } from '@/utils/request'
import { track } from '@/composables/useTrack'

/**
 * 无痕商业化触点 · 前端数据层（触-P1 机制层）
 * 后端真源：GET /recommend/touchpoint?scene=<key>&ctx=<json>（touchpoint.controller·OptionalAuthGuard）
 *
 * 服务端统一裁决克制规则（频控 24h/开关/相关性硬门槛），前端只做两件事：
 * 1. 拉卡：show:false 或请求异常 → 一律不渲染（诚实降级·触点永不打扰）
 * 2. 埋点：曝光 view（卡实际渲染才报·由 touchpoint-card 组件在 onMounted 触发）+ 点击 click
 */

/** 触点场景枚举（与后端 TOUCHPOINTS 对齐·本批仅 levelup_course 有召回逻辑，其余返回空） */
export type TouchpointScene =
  | 'jieqi_gift' // #4 节气礼盒（场景标签未上线前返回空）
  | 'levelup_course' // #8 晋级进阶课（已实现·参考实现）
  | 'classic_course' // #1 古籍精讲
  | 'poetry_goods' // #3 诗词雅物
  | 'circle_course' // #6 圈子课程
  | 'cert_next_course' // #9 证书下一课
  | 'consult_goods' // #10 咨询回执商品
  | 'ai_quota_member' // #5 已落地·仅登记（不经本端点）
  | 'daily_learn' // #7 已落地·仅登记（不经本端点）

/** 触点卡（后端 TouchpointCard 原样透传） */
export interface TouchpointCard {
  skuType: string
  skuId: string
  title: string
  /** 理由文案：为什么此刻推 */
  reason: string
  cover: string
  /** 跳转路径（原型路径·走 navigateTo 动态表） */
  link: string
}

export interface TouchpointResult {
  show: boolean
  card?: TouchpointCard
}

export const touchpointApi = {
  /**
   * 拉取某场景触点卡。服务端裁决，show:false / 异常 → 不渲染（页面 v-if 挂 result.card）。
   * @param scene 触点场景 key
   * @param ctx   场景上下文（如 { category: '易学' }），服务端召回用
   */
  async get(scene: TouchpointScene, ctx?: Record<string, unknown>): Promise<TouchpointResult> {
    try {
      let url = `/recommend/touchpoint?scene=${encodeURIComponent(scene)}`
      if (ctx) url += `&ctx=${encodeURIComponent(JSON.stringify(ctx))}`
      const res = await apiGetOptionalAuth<TouchpointResult>(url)
      if (res?.show && res.card?.skuId && res.card.link) return { show: true, card: res.card }
      return { show: false }
    } catch {
      // 触点是锦上添花：任何异常静默降级为不出，绝不打扰用户
      return { show: false }
    }
  },
}

/**
 * 触点埋点（走现有 track.custom 通道·action='touchpoint'）。
 * view 由 touchpoint-card 组件在实际渲染（onMounted）时上报，勿在拉数据处提前报。
 */
export function reportTouchpoint(scene: string, phase: 'view' | 'click', extra?: Record<string, unknown>) {
  track.custom('touchpoint', { tp: scene, phase, ...extra })
}
