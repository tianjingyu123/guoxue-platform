/**
 * 首页统一信息流数据层（H1 瀑布流 · 九类统一信封契约）
 *
 * 统一信封 FeedEnvelope 已由后端 recommend/smart-feed/feed 返回，前端九类卡组件
 * （components/feed/cards/*）与注册表分发（components/feed/feed-card.vue）均消费此契约。
 * 与旧 lib/home-data.ts（RenderItem/FeedItem 老结构）并存，逐步迁移。
 *
 * 真连端点：
 *  - GET  /recommend/smart-feed/feed?page=&pageSize=  → { items: FeedEnvelope[] }（OptionalAuth，未登录返回空）
 *  - POST /users/feedback  { type, content }          → 负反馈（不感兴趣）
 */

import { apiGet, apiPost } from '@/utils/request'
import { getToken } from '@/utils/storage'

// ============================================
// 统一信封契约（与后端 smart-feed 对齐）
// ============================================
export type FeedType =
  | 'video'
  | 'article'
  | 'post'
  | 'course'
  | 'product'
  | 'classic'
  | 'live'
  | 'paipan'
  | 'agent'

/** 封面比例（决定 padding-top 撑高） */
export type CoverRatio = '3:4' | '4:3' | '1:1' | '16:9'

export interface FeedAuthor {
  name: string
  avatar?: string
}

/** 底部右侧单一关键指标 */
export interface FeedMetric {
  /** play/like/view/price/students/readers/action 等 */
  kind: string
  value: string | number
}

export interface FeedEnvelope {
  id: string
  type: FeedType
  title: string
  subtitle?: string
  cover?: string
  /** '3:4' | '4:3' | '1:1' | '16:9'；缺省按类型默认 */
  coverRatio?: string
  author?: FeedAuthor
  metric?: FeedMetric
  /**
   * 各类型扩展载荷：
   *  course:  { price, originalPrice, free }
   *  product: { price, originalPrice }
   *  video:   { duration }
   *  live:    { isLive, viewers }
   *  post:    { circleName }
   *  paipan:  { hint, action }
   *  agent:   { question, action }
   */
  payload?: Record<string, unknown>
  /** 推荐理由（“因为你关注了…”），可选展示 */
  reason?: string
}

// ============================================
// 封面比例 → padding-top 百分比（X5 无 aspect-ratio，统一用 padding-top）
// ============================================
export function ratioPadding(ratio?: string): string {
  switch (ratio) {
    case '4:3':
      return '75%'
    case '1:1':
      return '100%'
    case '16:9':
      return '56.25%'
    case '3:4':
    default:
      return '133.33%'
  }
}

// ============================================
// 数字格式化（万 / k）
// ============================================
export function formatCount(n?: number | string): string {
  const v = typeof n === 'string' ? Number(n) : (n ?? 0)
  if (!Number.isFinite(v)) return String(n ?? '')
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return v.toLocaleString()
}

// ============================================
// payload 安全取值助手
// ============================================
export function payloadNum(item: FeedEnvelope, key: string): number | undefined {
  const v = item.payload?.[key]
  return typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : undefined
}
export function payloadStr(item: FeedEnvelope, key: string): string | undefined {
  const v = item.payload?.[key]
  return typeof v === 'string' ? v : v == null ? undefined : String(v)
}
export function payloadBool(item: FeedEnvelope, key: string): boolean {
  return item.payload?.[key] === true
}

// ============================================
// API 层
// ============================================

/** 后端 smart-feed 原始项：字段宽松，容错映射为 FeedEnvelope */
interface RawFeedItem {
  id?: string
  type?: string
  title?: string
  subtitle?: string
  cover?: string | null
  coverRatio?: string
  author?: { name?: string; avatar?: string } | null
  metric?: { kind?: string; value?: string | number } | null
  payload?: Record<string, unknown> | null
  reason?: string
  [k: string]: unknown
}

const VALID_TYPES: FeedType[] = [
  'video',
  'article',
  'post',
  'course',
  'product',
  'classic',
  'live',
  'paipan',
  'agent',
]

/** 原始项 → FeedEnvelope（脏字段容错；非法 type 归一为 article 以走文摘/文章卡不留空白） */
function adapt(raw: RawFeedItem): FeedEnvelope | null {
  if (!raw || !raw.id) return null
  const type = (VALID_TYPES.includes(raw.type as FeedType) ? raw.type : 'article') as FeedType
  return {
    id: String(raw.id),
    type,
    title: raw.title ?? '',
    subtitle: raw.subtitle,
    cover: raw.cover ?? undefined,
    coverRatio: raw.coverRatio,
    author: raw.author
      ? { name: raw.author.name ?? '', avatar: raw.author.avatar }
      : undefined,
    metric: raw.metric && raw.metric.kind != null
      ? { kind: raw.metric.kind, value: raw.metric.value ?? '' }
      : undefined,
    payload: raw.payload ?? undefined,
    reason: raw.reason,
  }
}

/**
 * 获取智能信息流 — GET /recommend/smart-feed/feed（OptionalAuth）。
 * - 未登录：不发请求（个性化需 userId），返回 []，由页面回退热门流承载，绝不白屏。
 * - 失败/空：返回 []，静默降级。
 */
export async function getSmartFeed(page = 1, pageSize = 20): Promise<FeedEnvelope[]> {
  if (!getToken()) return []
  try {
    const data = await apiGet<{ items?: RawFeedItem[] }>(
      `/recommend/smart-feed/feed?page=${page}&pageSize=${pageSize}`,
    )
    const raw = Array.isArray(data?.items) ? data.items : []
    return raw.map(adapt).filter((x): x is FeedEnvelope => x !== null)
  } catch {
    return []
  }
}

/**
 * 负反馈（不感兴趣）— POST /users/feedback。
 * 复用平台意见反馈端点：type='feed_dislike'，content 记录被反馈内容与原因，
 * 供推荐侧后续降权（后端接入负反馈信号后自动生效）。
 * 静默处理：失败不抛，前端仅本地移除卡片即可，不打断浏览。
 */
export async function sendFeedback(item: FeedEnvelope, reason: string): Promise<boolean> {
  try {
    await apiPost('/users/feedback', {
      type: 'feed_dislike',
      content: JSON.stringify({
        feedId: item.id,
        feedType: item.type,
        title: item.title,
        reason,
      }),
    })
    return true
  } catch {
    return false
  }
}
