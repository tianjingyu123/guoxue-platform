// 运势板块数据（迁移自原型 lib/api/fortune.ts + lib/types/fortune.ts）
// 联调：把 buildDailyFortune 换成后端 /fortune/daily 拉取，保留返回结构

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
