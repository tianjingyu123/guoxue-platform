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

import { apiGet, apiGetOptionalAuth, apiPostOptionalAuth } from '@/utils/request'
import { getCachedUiConfig } from '@/lib/ui-config-data'
import { resolveAgentTheme } from '@/lib/agent-experience'

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
 *  product: { price, originalPrice, salesCount, stock, tags }
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
// 类型 → 详情/落地路由（唯一真源映射）
//  feed-card（瀑布流九类卡）与首页焦点区 goFocus 共用此函数——
//  勿在组件内另写 switch 分叉（曾因两处各写一份导致焦点大卡非 live 一律错跳文章页）。
// ============================================
export function feedTargetUrl(item: FeedEnvelope): string {
  const id = item.id
  switch (item.type) {
    case 'video':
      return `/video/${id}`
    case 'article':
      return `/articles/${id}`
    case 'post':
      return `/pkg-circle/circles/post?id=${id}`
    case 'course':
      return `/course/${id}`
    case 'product':
      return `/mall/product/${id}`
    case 'classic':
      return `/pkg-classics/detail/index?id=${id}`
    case 'live':
      return `/live/${id}`
    case 'paipan':
      // 排盘钩子 → 排盘主 tab（router MAIN_TABS 走 reLaunch）。
      // 旧值 /pkg-paipan/index/index 不在 pages.json（pkg-paipan 分包无 index 页），
      // navigateTo 必 fail 弹「功能开发中」——战略转化位曾是死链。
      return '/paipan'
    case 'agent':
      return `/pkg-agent/agent/chat?id=${id}`
    default:
      return `/articles/${id}`
  }
}

// ============================================
// 智能体卡分类色系（card-system.html §智能体·4 色系）
//  文案生成=雾金 / 分析报告=星紫 / 古籍查询=青瓷 / 办公效率=雾蓝
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
  copy:    { scheme: 'copy',    gradient: 'linear-gradient(135deg,#FAF8F1,#F2F4FB,#F9F5FC)', icon: 'edit',        iconStroke: '#766B91', accent: '#B89B5E' },
  analyze: { scheme: 'analyze', gradient: 'linear-gradient(135deg,#F6F3FF,#EAF0FF,#F8FAFF)', icon: 'trending-up', iconStroke: '#616FA8', accent: '#8479CF' },
  classic: { scheme: 'classic', gradient: 'linear-gradient(135deg,#F4FAFB,#EAF3F4,#FAF8F2)', icon: 'book-open',   iconStroke: '#557C83', accent: '#6AA0A5' },
  office:  { scheme: 'office',  gradient: 'linear-gradient(135deg,#F3F7FE,#E7EFFA,#F8FAFD)', icon: 'briefcase',   iconStroke: '#5A739B', accent: '#6D8FC4' },
}
/**
 * payload.category（或 subtitle 领域）→ 色系主题；无法判定则暖金。
 * 后台配置优先：category 精确命中 ConfigSystem.agent_card.categoryColors（如 文案生成→g-copy）→ 用配置色系；
 * 否则退回关键字正则。→ 智能体卡配色后台可配。
 */
export function agentTheme(item: FeedEnvelope): AgentTheme {
  const cat = (payloadStr(item, 'category') || '').toString()
  const shared = resolveAgentTheme(cat || item.subtitle || item.title)
  const sharedIcons: Record<string, string> = {
    CLASSICS_READING: 'book-open',
    POETRY_ART: 'feather',
    WRITING_STUDIO: 'edit',
    RITES_CULTURE: 'landmark',
    LEARNING_GROWTH: 'graduation-cap',
    YIJING_STUDY: 'compass',
  }
  if (cat || item.subtitle || item.title) {
    return {
      scheme: 'analyze',
      gradient: shared.gradient,
      icon: sharedIcons[shared.key] || 'sparkles',
      iconStroke: shared.ink,
      accent: shared.accent,
    }
  }
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
  // 兼容尚未同步更新的旧推荐接口：首页历史钩子实际承载智能体，
  // 不应继续以 paipan 类型渲染并跳向排盘页。
  const source: RawFeedItem = raw.id === 'hook-paipan'
    ? {
        ...raw,
        id: 'b1000001-0000-0000-0000-000000000008',
        type: 'agent',
        title: '国学学习规划师',
        subtitle: '按兴趣、基础和可用时间，制定经典阅读路线与每周学习计划',
        reason: '学习成长',
        metric: { kind: 'action', value: '开始规划' },
        payload: { category: '学习成长', action: '开始对话' },
      }
    : raw.id === 'hook-agent'
      ? {
          ...raw,
          id: 'b1000001-0000-0000-0000-000000000001',
          type: 'agent',
          title: '古籍句读助手',
          subtitle: '断句、释词、通译与出处核对，把难读古文拆成可理解的知识卡',
          reason: '经典研读',
          metric: { kind: 'action', value: '开始学习' },
          payload: { category: '经典研读', action: '开始对话' },
        }
      : raw
  const type = (VALID_TYPES.includes(source.type as FeedType) ? source.type : 'article') as FeedType
  return {
    id: String(source.id),
    type,
    title: source.title ?? '',
    subtitle: source.subtitle,
    cover: source.cover ?? undefined,
    coverRatio: source.coverRatio,
    author: source.author
      ? { name: source.author.name ?? '', avatar: source.author.avatar }
      : undefined,
    metric: source.metric && source.metric.kind != null
      ? { kind: source.metric.kind, value: source.metric.value ?? '' }
      : undefined,
    payload: source.payload ?? undefined,
    reason: source.reason,
  }
}

/** 公共内容流展示底线：文章必须有首图，避免旧缓存/旧数据再次渲染无图文摘卡。 */
export function isRenderablePublicFeedItem(item: FeedEnvelope): boolean {
  if (item.type === 'post') return false
  if (item.type === 'article') return !!item.cover?.trim()
  return true
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
 * type ∈ course/classic/video/live/article/product。圈帖仅在所属圈子内展示，不属于公开分类流。
 */
export async function getCategoryFeed(type: string, page = 1, size = 6): Promise<FeedEnvelope[]> {
  // 前端防御：即使旧页面或缓存仍请求 post，也不渲染到发现页。
  if (type === 'post') return []
  try {
    const data = await apiGet<{ items?: RawFeedItem[] }>(
      `/recommend/smart-feed/category?type=${encodeURIComponent(type)}&page=${page}&size=${size}`,
    )
    const raw = Array.isArray(data?.items) ? data.items : []
    return raw
      .map(adapt)
      .filter((x): x is FeedEnvelope => x !== null && isRenderablePublicFeedItem(x))
  } catch {
    return []
  }
}

export type SmartFeedChannel = 'recommend' | 'following' | 'hot'

export async function getSmartFeed(
  page = 1,
  pageSize = 20,
  channel: SmartFeedChannel = 'recommend',
): Promise<FeedEnvelope[]> {
  // 不再吞异常：请求失败向上抛出，页面据此展示错误态+重试（区别于返回 [] 的"真空"）。
  const data = await apiGetOptionalAuth<{ items?: RawFeedItem[] }>(
    `/recommend/smart-feed/feed?page=${page}&pageSize=${pageSize}&channel=${encodeURIComponent(channel)}`,
  )
  const raw = Array.isArray(data?.items) ? data.items : []
  return raw
    .map(adapt)
    .filter((x): x is FeedEnvelope => x !== null && isRenderablePublicFeedItem(x))
}

/**
 * 负反馈（不感兴趣）— POST /users/feedback。
 * 复用平台意见反馈端点：type='feed_dislike'，content 记录被反馈内容与原因，
 * 供推荐侧后续降权（后端接入负反馈信号后自动生效）。
 * 静默处理：失败不抛，前端仅本地移除卡片即可，不打断浏览。
 */
export async function sendFeedback(item: FeedEnvelope, reason: string): Promise<boolean> {
  try {
    await apiPostOptionalAuth('/users/feedback', {
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
