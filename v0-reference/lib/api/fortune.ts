import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { DailyFortune, FortuneDetail, FortuneLevel, FortuneHistory } from '../types/fortune'

// Mock 每日运势数据
function generateMockDailyFortune(dateStr: string): DailyFortune {
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  
  // 根据日期生成伪随机分数
  const seed = date.getDate() + date.getMonth() * 31
  const baseScore = 60 + (seed % 35)
  
  const getLevel = (score: number): FortuneLevel => {
    if (score >= 90) return 'excellent'
    if (score >= 75) return 'good'
    if (score >= 60) return 'normal'
    if (score >= 40) return 'bad'
    return 'poor'
  }
  
  const careerScore = Math.min(100, baseScore + (seed % 15) - 7)
  const loveScore = Math.min(100, baseScore + ((seed * 3) % 15) - 7)
  const wealthScore = Math.min(100, baseScore + ((seed * 5) % 15) - 7)
  const healthScore = Math.min(100, baseScore + ((seed * 7) % 15) - 7)
  
  return {
    date: dateStr,
    lunarDate: '五月初五',
    weekday: weekdays[date.getDay()],
    overallScore: baseScore,
    overallLevel: getLevel(baseScore),
    overallSummary: baseScore >= 75 
      ? '今日运势良好，适合开展重要事项，把握机遇。' 
      : baseScore >= 60 
        ? '今日运势平稳，按部就班即可，不宜冒进。'
        : '今日运势欠佳，宜静不宜动，谨慎行事。',
    yiji: {
      yi: ['出行', '会友', '求财', '签约'].slice(0, 2 + (seed % 3)),
      ji: ['动土', '开业', '嫁娶', '远行'].slice(0, 1 + (seed % 3)),
    },
    categories: [
      {
        category: 'career',
        categoryName: '事业运',
        score: careerScore,
        level: getLevel(careerScore),
        summary: '工作顺利，贵人相助',
        suggestion: '把握机会，主动出击',
        luckyColor: '蓝色',
        luckyNumber: 3,
        luckyDirection: '东方',
      },
      {
        category: 'love',
        categoryName: '爱情运',
        score: loveScore,
        level: getLevel(loveScore),
        summary: '桃花运旺，感情升温',
        suggestion: '多与伴侣沟通',
        luckyColor: '粉色',
        luckyNumber: 2,
        luckyDirection: '南方',
      },
      {
        category: 'wealth',
        categoryName: '财运',
        score: wealthScore,
        level: getLevel(wealthScore),
        summary: '正财稳定，偏财有望',
        suggestion: '理性投资，避免冲动',
        luckyColor: '金色',
        luckyNumber: 8,
        luckyDirection: '西方',
      },
      {
        category: 'health',
        categoryName: '健康运',
        score: healthScore,
        level: getLevel(healthScore),
        summary: '身体康健，精力充沛',
        suggestion: '注意休息，适量运动',
        luckyColor: '绿色',
        luckyNumber: 5,
        luckyDirection: '北方',
      },
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

/**
 * 获取每日运势
 */
export async function getDailyFortune(date?: string): Promise<ApiResponse<DailyFortune>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const targetDate = date || new Date().toISOString().split('T')[0]
    return { code: 200, data: generateMockDailyFortune(targetDate), message: 'success' }
  }
  return apiGet<DailyFortune>('/fortune/daily', { date })
}

/**
 * 获取运势详情
 */
export async function getFortuneDetail(date?: string): Promise<ApiResponse<FortuneDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const targetDate = date || new Date().toISOString().split('T')[0]
    const daily = generateMockDailyFortune(targetDate)
    const detail: FortuneDetail = {
      ...daily,
      detailAnalysis: `根据您的生辰八字分析，今日${daily.overallLevel === 'good' || daily.overallLevel === 'excellent' ? '运势较好' : '运势平平'}。\n\n天干地支显示，今日宜${daily.yiji.yi.join('、')}，忌${daily.yiji.ji.join('、')}。\n\n总体来说，${daily.overallSummary}`,
      wuxingAnalysis: {
        element: '木',
        description: '今日木气旺盛，适合生发之事，利于事业发展。',
      },
      zodiacFortune: {
        zodiac: '双子座',
        summary: '今日双子座思维活跃，沟通运极佳，适合谈判协商。',
      },
      chineseZodiacFortune: {
        animal: '龙',
        summary: '属龙者今日贵人运旺，有望得到贵人相助，事业顺利。',
      },
    }
    return { code: 200, data: detail, message: 'success' }
  }
  return apiGet<FortuneDetail>('/fortune/detail', { date })
}

/**
 * 获取运势历史
 */
export async function getFortuneHistory(days: number = 7): Promise<ApiResponse<FortuneHistory[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const history: FortuneHistory[] = []
    const today = new Date()
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const fortune = generateMockDailyFortune(dateStr)
      history.push({
        date: dateStr,
        overallScore: fortune.overallScore,
        overallLevel: fortune.overallLevel,
      })
    }
    
    return { code: 200, data: history, message: 'success' }
  }
  return apiGet<FortuneHistory[]>('/fortune/history', { days })
}

/**
 * 获取运势等级显示信息
 */
export function getFortuneLevelInfo(level: FortuneLevel): { label: string; color: string; bgColor: string } {
  const info: Record<FortuneLevel, { label: string; color: string; bgColor: string }> = {
    excellent: { label: '大吉', color: 'text-red-600', bgColor: 'bg-red-50' },
    good: { label: '吉', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    normal: { label: '平', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    bad: { label: '凶', color: 'text-gray-600', bgColor: 'bg-gray-50' },
    poor: { label: '大凶', color: 'text-gray-800', bgColor: 'bg-gray-100' },
  }
  return info[level]
}

/**
 * 获取等级标签
 */
export function getLevelLabel(level: FortuneLevel): string {
  return getFortuneLevelInfo(level).label
}

/**
 * 获取等级颜色类名
 */
export function getLevelColor(level: FortuneLevel): string {
  return getFortuneLevelInfo(level).color
}

/**
 * 获取分类图标
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    career: '💼',
    love: '❤️',
    wealth: '💰',
    health: '🏃',
  }
  return icons[category] || '✨'
}

/**
 * 格式化日期显示
 */
export function formatFortuneDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (dateStr === today.toISOString().split('T')[0]) return '今天'
  if (dateStr === yesterday.toISOString().split('T')[0]) return '昨天'
  if (dateStr === tomorrow.toISOString().split('T')[0]) return '明天'
  
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// ========== 运势设置相关 API ==========

import type { ShiChen, FortuneSubscribeSettings, BirthInfo, FortunePushSettings } from '../types/fortune'

// 时辰选项列表
export const SHICHEN_OPTIONS: { value: ShiChen; label: string; time: string }[] = [
  { value: 'zi', label: '子时', time: '23:00-01:00' },
  { value: 'chou', label: '丑时', time: '01:00-03:00' },
  { value: 'yin', label: '寅时', time: '03:00-05:00' },
  { value: 'mao', label: '卯时', time: '05:00-07:00' },
  { value: 'chen', label: '辰时', time: '07:00-09:00' },
  { value: 'si', label: '巳时', time: '09:00-11:00' },
  { value: 'wu', label: '午时', time: '11:00-13:00' },
  { value: 'wei', label: '未时', time: '13:00-15:00' },
  { value: 'shen', label: '申时', time: '15:00-17:00' },
  { value: 'you', label: '酉时', time: '17:00-19:00' },
  { value: 'xu', label: '戌时', time: '19:00-21:00' },
  { value: 'hai', label: '亥时', time: '21:00-23:00' },
  { value: 'unknown', label: '不确定', time: '' },
]

// 推送时间选项
export const PUSH_TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
]

/**
 * 获取运势订阅设置
 */
export async function getFortuneSubscribeSettings(): Promise<ApiResponse<FortuneSubscribeSettings>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        birthInfo: {
          solarDate: '1990-03-15',
          lunarDate: '庚午年二月十九',
          isLunar: false,
          shichen: 'si',
          gender: 'male',
        },
        pushSettings: {
          enabled: true,
          pushTime: '08:00',
          pushTypes: {
            daily: true,
            weekly: true,
            important: true,
          },
        },
      },
      message: 'success',
    }
  }
  return apiGet<FortuneSubscribeSettings>('/fortune/subscribe/settings')
}

/**
 * 更新出生信息
 */
export async function updateBirthInfo(birthInfo: BirthInfo): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: { success: true }, message: '出生信息已更新' }
  }
  return apiPost<{ success: boolean }>('/fortune/subscribe/birth-info', birthInfo)
}

/**
 * 更新推送设置
 */
export async function updatePushSettings(settings: FortunePushSettings): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '推送设置已更新' }
  }
  return apiPost<{ success: boolean }>('/fortune/subscribe/push-settings', settings)
}

/**
 * 获取时辰显示名
 */
export function getShichenLabel(shichen: ShiChen): string {
  const option = SHICHEN_OPTIONS.find(o => o.value === shichen)
  return option ? `${option.label}${option.time ? ` (${option.time})` : ''}` : '未设置'
}

/**
 * 公历转农历（简化版，实际需调用API）
 */
export async function solarToLunar(solarDate: string): Promise<ApiResponse<{ lunarDate: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    // Mock: 简单返回
    return { code: 200, data: { lunarDate: '农历日期' }, message: 'success' }
  }
  return apiGet<{ lunarDate: string }>('/fortune/solar-to-lunar', { date: solarDate })
}
