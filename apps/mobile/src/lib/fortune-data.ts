// 运势板块数据（迁移自原型 lib/api/fortune.ts + lib/types/fortune.ts）
// 联调：API 对象 fortuneApi 已对接后端 /fortune/* 端点

import { apiGet, apiPost, apiDelete, useMock } from '@/utils/request'

export type FortuneLevel = 'excellent' | 'good' | 'normal' | 'bad' | 'poor'

export interface FortuneCategory {
  category: 'career' | 'love' | 'wealth' | 'health'
  categoryName: string
  score: number
  level: FortuneLevel
  summary: string
  suggestion: string
  luckyColor: string
  luckyNumber: number
  luckyDirection: string
}

export interface DailyFortune {
  date: string
  lunarDate: string
  weekday: string
  overallScore: number
  overallLevel: FortuneLevel
  overallSummary: string
  yiji: { yi: string[]; ji: string[] }
  categories: FortuneCategory[]
  luckyColor: string
  luckyNumber: number
  luckyDirection: string
  luckyTime: string
  tips: string[]
}

// 等级信息：标签 + 文字色（hex，供 AppIcon/文本用）
export function getFortuneLevelInfo(level: FortuneLevel): { label: string; color: string } {
  const info: Record<FortuneLevel, { label: string; color: string }> = {
    excellent: { label: '大吉', color: '#dc2626' },
    good: { label: '吉', color: '#ea580c' },
    normal: { label: '平', color: '#2563eb' },
    bad: { label: '凶', color: '#4b5563' },
    poor: { label: '大凶', color: '#1f2937' },
  }
  return info[level]
}

function getLevel(score: number): FortuneLevel {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'normal'
  if (score >= 40) return 'bad'
  return 'poor'
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 格式化日期：今天/昨天/明天 或 M月D日
export function formatFortuneDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((d0 - t0) / 86400000)
  if (diff === 0) return '今天'
  if (diff === -1) return '昨天'
  if (diff === 1) return '明天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// 分类配色（与原型 categoryColors 对齐）+ 图标名（icons-registry）
export const CATEGORY_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  career: { bg: 'rgba(37,99,235,0.08)', color: '#2563eb', icon: 'briefcase' },
  love: { bg: 'rgba(219,39,119,0.08)', color: '#db2777', icon: 'heart' },
  wealth: { bg: 'rgba(217,119,6,0.08)', color: '#d97706', icon: 'coins' },
  health: { bg: 'rgba(22,163,74,0.08)', color: '#16a34a', icon: 'activity' },
}

// 按日期生成每日运势（确定性 mock，与原型同算法）
export function buildDailyFortune(dateStr: string): DailyFortune {
  const date = new Date(dateStr)
  const seed = date.getDate() + date.getMonth() * 31
  const baseScore = 60 + (seed % 35)
  const careerScore = Math.min(100, baseScore + (seed % 15) - 7)
  const loveScore = Math.min(100, baseScore + ((seed * 3) % 15) - 7)
  const wealthScore = Math.min(100, baseScore + ((seed * 5) % 15) - 7)
  const healthScore = Math.min(100, baseScore + ((seed * 7) % 15) - 7)

  return {
    date: dateStr,
    lunarDate: '五月初五',
    weekday: WEEKDAYS[date.getDay()],
    overallScore: baseScore,
    overallLevel: getLevel(baseScore),
    overallSummary:
      baseScore >= 75
        ? '今日运势良好，适合开展重要事项，把握机遇。'
        : baseScore >= 60
          ? '今日运势平稳，按部就班即可，不宜冒进。'
          : '今日运势欠佳，宜静不宜动，谨慎行事。',
    yiji: {
      yi: ['出行', '会友', '求财', '签约'].slice(0, 2 + (seed % 3)),
      ji: ['动土', '开业', '嫁娶', '远行'].slice(0, 1 + (seed % 3)),
    },
    categories: [
      { category: 'career', categoryName: '事业运', score: careerScore, level: getLevel(careerScore), summary: '工作顺利，贵人相助', suggestion: '把握机会，主动出击', luckyColor: '蓝色', luckyNumber: 3, luckyDirection: '东方' },
      { category: 'love', categoryName: '爱情运', score: loveScore, level: getLevel(loveScore), summary: '桃花运旺，感情升温', suggestion: '多与伴侣沟通', luckyColor: '粉色', luckyNumber: 2, luckyDirection: '南方' },
      { category: 'wealth', categoryName: '财运', score: wealthScore, level: getLevel(wealthScore), summary: '正财稳定，偏财有望', suggestion: '理性投资，避免冲动', luckyColor: '金色', luckyNumber: 8, luckyDirection: '西方' },
      { category: 'health', categoryName: '健康运', score: healthScore, level: getLevel(healthScore), summary: '身体康健，精力充沛', suggestion: '注意休息，适量运动', luckyColor: '绿色', luckyNumber: 5, luckyDirection: '北方' },
    ],
    luckyColor: '金色',
    luckyNumber: 8,
    luckyDirection: '东南方',
    luckyTime: '上午9点-11点',
    tips: [
      '今日宜穿金色或黄色系衣物增强运势',
      '东南方位是今日的吉利方向',
      '上午是今日的最佳时段',
    ],
  }
}

// 当天 ISO 日期串
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// 日期偏移
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ============ 适配：后端 FortuneRecord → 前端 DailyFortune ============
// 后端 fortuneContent = { overall, career, love, wealth, health, direction, color, number, advice }
// 核心分数/幸运色数方位/advice 为真实后端值；等级/星期/概述为展示层派生；
// 农历/宜忌/吉时后端无 → 诚实降级（页面 v-if 隐藏，不编造）。

const CAT_META: { category: FortuneCategory['category']; categoryName: string; key: 'career' | 'love' | 'wealth' | 'health' }[] = [
  { category: 'career', categoryName: '事业运', key: 'career' },
  { category: 'love', categoryName: '爱情运', key: 'love' },
  { category: 'wealth', categoryName: '财运', key: 'wealth' },
  { category: 'health', categoryName: '健康运', key: 'health' },
]

function summaryByLevel(level: FortuneLevel): string {
  switch (level) {
    case 'excellent': return '运势极佳，大有可为'
    case 'good': return '运势上佳，宜主动进取'
    case 'normal': return '运势平稳，按部就班'
    case 'bad': return '运势欠佳，宜静守'
    default: return '运势低迷，谨慎为上'
  }
}

/* —— 后端原始响应类型（容错适配用，字段全 optional + 宽松类型，仅声明实际访问到的字段） —— */
interface RawFortuneContent {
  overall?: number | string
  career?: number | string
  love?: number | string
  wealth?: number | string
  health?: number | string
  advice?: string
}
/** 后端 FortuneRecord 原始响应 */
interface RawFortuneRecord {
  fortuneContent?: RawFortuneContent | null
  period?: string
  advice?: string
  luckyColor?: string
  luckyNumber?: number
  luckyDirection?: string
}
/** 排盘工具 / 引导卡原始响应（透传给页面，字段未约束，用索引签名宽松声明） */
interface RawFortuneTool { [key: string]: unknown }
interface RawFortuneGuideCard { [key: string]: unknown }

function adaptFortune(record: RawFortuneRecord): DailyFortune {
  const c: RawFortuneContent = record?.fortuneContent || {}
  const overallScore = Number(c.overall ?? 0)
  const overallLevel = getLevel(overallScore)
  const dateStr = record?.period || todayISO()
  const advice: string = record?.advice || c.advice || ''
  return {
    date: dateStr,
    lunarDate: '', // 后端未提供农历 → 降级隐藏
    weekday: WEEKDAYS[new Date(dateStr).getDay()] || '',
    overallScore,
    overallLevel,
    overallSummary: summaryByLevel(overallLevel),
    yiji: { yi: [], ji: [] }, // 后端未提供宜忌 → 降级隐藏
    categories: CAT_META.map((m) => {
      const score = Number(c[m.key] ?? 0)
      const level = getLevel(score)
      return {
        category: m.category,
        categoryName: m.categoryName,
        score,
        level,
        summary: summaryByLevel(level),
        suggestion: advice,
        luckyColor: record?.luckyColor || '',
        luckyNumber: record?.luckyNumber || 0,
        luckyDirection: record?.luckyDirection || '',
      }
    }),
    luckyColor: record?.luckyColor || '',
    luckyNumber: record?.luckyNumber || 0,
    luckyDirection: record?.luckyDirection || '',
    luckyTime: '', // 后端未提供吉时 → 降级隐藏
    tips: advice ? [advice] : [],
  }
}

// ============ API 层（真连 /fortune/*，错误传播给页面三态，不回退假数据）============

export const fortuneApi = {
  /** 今日运势 — GET /fortune/today */
  async getToday(): Promise<DailyFortune> {
    return adaptFortune(await apiGet<RawFortuneRecord>('/fortune/today'))
  },

  /** 指定日期运势 — GET /fortune/daily/:date（后端按登录用户，缺失即确定性生成） */
  async getByDate(dateStr: string): Promise<DailyFortune> {
    return adaptFortune(await apiGet<RawFortuneRecord>(`/fortune/daily/${dateStr}`))
  },

  /** 订阅运势推送 — POST /fortune/subscribe（fortuneType + pushChannel） */
  async subscribe(channel: string, type: string): Promise<{ success: boolean; message: string }> {
    await apiPost('/fortune/subscribe', { fortuneType: type, pushChannel: channel })
    return { success: true, message: '订阅成功' }
  },

  /** 排盘工具首页聚合 — GET /fortune/tools */
  async getTools(): Promise<RawFortuneTool[]> {
    const data = await apiGet<{ tools?: RawFortuneTool[] } | RawFortuneTool[]>('/fortune/tools')
    if (Array.isArray(data)) return data
    return Array.isArray(data?.tools) ? data.tools : []
  },

  /** 排盘引导卡 — GET /fortune/guide-card */
  async getGuideCard(): Promise<RawFortuneGuideCard | null> {
    return await apiGet<RawFortuneGuideCard | null>('/fortune/guide-card')
  },
}
