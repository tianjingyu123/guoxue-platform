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
import { getCachedUiConfig } from '@/lib/ui-config-data'

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
// 时长格式化：秒 → mm:ss（短视频右下 duration 角标用；已是 "mm:ss" 字符串则原样返回）
// ============================================
export function formatDuration(v?: number | string): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string' && v.includes(':')) return v // 已是 mm:ss
  const total = typeof v === 'string' ? Number(v) : v
  if (!Number.isFinite(total) || total <= 0) return ''
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
}

// ============================================
// 智能体卡分类色系（card-system.html §智能体·4 色系）
//  文案生成=暖金 / 分析报告=冷紫 / 古籍查询=温润棕 / 办公效率=蓝灰
//  payload.category 命中关键字 → 对应色系；缺省默认暖金（copy）
// ============================================
export type AgentColorScheme = 'copy' | 'analyze' | 'classic' | 'office'
export interface AgentTheme {
  scheme: AgentColorScheme
  /** 动态渐变（background-position 流动） */
  gradient: string
  /** 中央图标名（AppIcon） */
  icon: string
  /** 图标描边色 */
  iconStroke: string
  /** 光晕/角标主色 */
  accent: string
}
const AGENT_THEMES: Record<AgentColorScheme, AgentTheme> = {
  copy:    { scheme: 'copy',    gradient: 'linear-gradient(135deg,#F5EFE0,#E8DFD0,#F0E7D6)', icon: 'edit',       iconStroke: '#8A7A55', accent: '#C9A96E' },
  analyze: { scheme: 'analyze', gradient: 'linear-gradient(135deg,#F0E8F5,#E8DCF0,#EFE6F6)', icon: 'trending-up',iconStroke: '#7E6B96', accent: '#B49BD1' },
  classic: { scheme: 'classic', gradient: 'linear-gradient(135deg,#F5F0E8,#EBE0D0,#F1E8DA)', icon: 'book-open',  iconStroke: '#8A7A55', accent: '#C9A96E' },
  office:  { scheme: 'office',  gradient: 'linear-gradient(135deg,#EEF0F5,#E0E5EE,#EAEDF4)', icon: 'briefcase',  iconStroke: '#6B7896', accent: '#9BAAD1' },
}
/**
 * payload.category（或 subtitle 领域）→ 色系主题；无法判定则暖金。
 * 后台配置优先：category 精确命中 ConfigSystem.agent_card.categoryColors（如 文案生成→g-copy）→ 用配置色系；
 * 否则退回关键字正则。→ 智能体卡配色后台可配。
 */
export function agentTheme(item: FeedEnvelope): AgentTheme {
  const cat = (payloadStr(item, 'category') || '').toString()
  // 配置驱动：精确匹配后台 category→色系映射（值形如 'g-copy'/'copy'，归一去 g- 前缀）
  if (cat) {
    const map = getCachedUiConfig().agentCard.categoryColors
    const val = map?.[cat]
    if (val) {
      const scheme = String(val).replace(/^g-/, '') as AgentColorScheme
      if (AGENT_THEMES[scheme]) return AGENT_THEMES[scheme]
    }
  }
  const raw = (cat || item.subtitle || '').toString()
  if (/分析|报告|命理|八字|占|测|运势|数据/.test(raw)) return AGENT_THEMES.analyze
  if (/古籍|典故|字|经|书|译|注|查询/.test(raw)) return AGENT_THEMES.classic
  if (/办公|效率|纪要|周报|待办|助理|工作/.test(raw)) return AGENT_THEMES.office
  if (/文案|写作|生成|创作|营销|获客/.test(raw)) return AGENT_THEMES.copy
  return AGENT_THEMES.copy
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
 * - 登录：个性化分层流；未登录：后端返回匿名热门流（游客也能预览首页，不再白屏）。
 * - 空：正常返回 []（真的没内容）。
 * - 失败（服务器错误/断网）：向上抛错，交页面区分"错误态（重试）"与"空态"，
 *   不再静默吞成 []（否则 500/断网会被误当"暂无内容"，用户无从重试）。
 */
/**
 * 按类别取内容流（发现页分区用）— GET /recommend/smart-feed/category（公开）。
 * type ∈ course/classic/video/live/article/post/product。返回该类别一页统一信封卡。
 */
export async function getCategoryFeed(type: string, page = 1, size = 6): Promise<FeedEnvelope[]> {
  try {
    const data = await apiGet<{ items?: RawFeedItem[] }>(
      `/recommend/smart-feed/category?type=${encodeURIComponent(type)}&page=${page}&size=${size}`,
    )
    const raw = Array.isArray(data?.items) ? data.items : []
    return raw.map(adapt).filter((x): x is FeedEnvelope => x !== null)
  } catch {
    return []
  }
}

export async function getSmartFeed(page = 1, pageSize = 20): Promise<FeedEnvelope[]> {
  // 不再吞异常：请求失败向上抛出，页面据此展示错误态+重试（区别于返回 [] 的"真空"）。
  const data = await apiGet<{ items?: RawFeedItem[] }>(
    `/recommend/smart-feed/feed?page=${page}&pageSize=${pageSize}`,
  )
  const raw = Array.isArray(data?.items) ? data.items : []
  return raw.map(adapt).filter((x): x is FeedEnvelope => x !== null)
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
