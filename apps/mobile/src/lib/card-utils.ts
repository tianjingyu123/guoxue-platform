// 全平台统一卡片库 - 工具层(从原型 components/cards/primitives.tsx 迁移)
// 一套数据 + 一个基础卡 + 有限的位置变体(variant)
// 跨端说明:封面/头像用 image 组件显示;backdrop-blur 小程序不支持,降级为半透明实底

export type CardVariant = 'feed' | 'list' | 'rail' | 'rank'

// ---------- 封面比例归一化:全平台只允许 3:4(竖) 与 1:1(方) ----------
export type NormalRatio = '3:4' | '1:1'
export function normalizeRatio(coverRatio?: string): NormalRatio {
  if (coverRatio === '16:9' || coverRatio === '4:3' || coverRatio === '1:1') return '1:1'
  return '3:4'
}

// ---------- 数字格式化 ----------
export function formatCount(num?: number): string {
  if (!num) return '0'
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

// ---------- 卡片数据类型 ----------
export interface ProductCardData {
  id: number | string
  title: string
  /** 商品发布端“一句话简介”，用于全平台商品卡片的小字说明 */
  subtitle?: string
  cover?: string
  coverRatio?: string
  price?: number
  originalPrice?: number
  sales?: number
  stock?: number
  /** 商品发布端标签；仅展示真实录入内容 */
  tags?: string[]
  /** 推荐场景文案，例如“平台严选” */
  reason?: string
  rating?: number
  /** 高转化标:秒杀 / 热销 / 新品 */
  tag?: string
  /** 官方自营（归属官方旗舰店）→ 卡片显示「官方自营」角标 */
  isOfficialSelfOwned?: boolean
}

export interface CourseCardData {
    id: number | string
    title: string
    cover?: string
    coverRatio?: string
    /** 课程简介：用于课程卡“你将学到”区域，必须来自发布端 intro 字段 */
    intro?: string
    /** 一级分类：用于学习路径标签与分类浏览 */
    category?: string
    price?: number
  originalPrice?: number
  free?: boolean
  students?: number
  lessons?: number
  rating?: number
  teacher?: string
  teacherAvatar?: string
  tag?: string
}

export interface LiveCardData {
  id: number | string
  title: string
  cover?: string
  coverRatio?: string
  host?: string
  hostAvatar?: string
  viewers?: number
  reservations?: number
  status?: 'live' | 'upcoming' | 'replay'
  /** 直播类型:knowledge 知识授课 / commerce 电商带货 */
  liveType?: 'knowledge' | 'commerce'
  scheduledTime?: string
  duration?: string
  replayUrl?: string
}

export interface AgentCardData {
  id: number | string
  name: string
  avatar?: string
  description?: string
  useCount?: number
  rating?: number
  tag?: string
}

export interface ClassicCardData {
  id: number | string
  title: string
  author?: string
  dynasty?: string
  description?: string
  isFree?: boolean
  hasAudio?: boolean
  readers?: number
}

export interface VideoCardData {
  id: number | string
  title: string
  cover?: string
  coverRatio?: string
  author?: string
  plays?: number
  likes?: number
  duration?: string
}

// ---------- 类型角标文案 ----------
export const typeLabels: Record<string, string> = {
  live: '直播', course: '课程', product: '好物', agent: '智能体',
  video: '视频', article: '文章', ebook: '古籍', circle: '圈子',
}

// ---------- 高转化标配置(tag → kind) ----------
export type HotKind = 'seckill' | 'live' | 'hot' | 'free' | 'new'
export function productHotKind(tag?: string): HotKind | null {
  if (tag === '秒杀') return 'seckill'
  if (tag === '热销') return 'hot'
  if (tag === '新品') return 'new'
  return null
}
export function courseHotKind(tag?: string): HotKind | null {
  if (tag === '热销') return 'hot'
  if (tag === '新品') return 'new'
  return null
}
