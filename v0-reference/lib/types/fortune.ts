// 运势相关类型定义

// 运势等级
export type FortuneLevel = 'excellent' | 'good' | 'normal' | 'bad' | 'poor'

// 宜忌项
export interface FortuneYiJi {
  yi: string[]   // 宜
  ji: string[]   // 忌
}

// 分类运势
export interface CategoryFortune {
  category: 'career' | 'love' | 'wealth' | 'health'
  categoryName: string
  score: number
  level: FortuneLevel
  summary: string
  suggestion: string
  luckyColor?: string
  luckyNumber?: number
  luckyDirection?: string
}

// 每日运势
export interface DailyFortune {
  date: string
  lunarDate: string
  weekday: string
  // 综合运势
  overallScore: number
  overallLevel: FortuneLevel
  overallSummary: string
  // 宜忌
  yiji: FortuneYiJi
  // 分类运势
  categories: CategoryFortune[]
  // 幸运信息
  luckyColor: string
  luckyNumber: number
  luckyDirection: string
  luckyTime: string
  // 今日提醒
  tips: string[]
}

// 运势详情
export interface FortuneDetail extends DailyFortune {
  // 详细解读
  detailAnalysis: string
  // 五行分析
  wuxingAnalysis?: {
    element: string
    description: string
  }
  // 星座运势
  zodiacFortune?: {
    zodiac: string
    summary: string
  }
  // 生肖运势
  chineseZodiacFortune?: {
    animal: string
    summary: string
  }
}

// 运势历史记录
export interface FortuneHistory {
  date: string
  overallScore: number
  overallLevel: FortuneLevel
}

// ========== 运势设置相关 ==========

// 时辰选项
export type ShiChen = 
  | 'zi'    // 子时 23:00-01:00
  | 'chou'  // 丑时 01:00-03:00
  | 'yin'   // 寅时 03:00-05:00
  | 'mao'   // 卯时 05:00-07:00
  | 'chen'  // 辰时 07:00-09:00
  | 'si'    // 巳时 09:00-11:00
  | 'wu'    // 午时 11:00-13:00
  | 'wei'   // 未时 13:00-15:00
  | 'shen'  // 申时 15:00-17:00
  | 'you'   // 酉时 17:00-19:00
  | 'xu'    // 戌时 19:00-21:00
  | 'hai'   // 亥时 21:00-23:00
  | 'unknown' // 不确定

// 出生信息
export interface BirthInfo {
  // 公历生日
  solarDate: string
  // 农历生日
  lunarDate?: string
  isLunar: boolean
  // 时辰
  shichen: ShiChen
  // 性别
  gender: 'male' | 'female'
}

// 运势推送设置
export interface FortunePushSettings {
  // 是否开启推送
  enabled: boolean
  // 推送时间 (HH:mm)
  pushTime: string
  // 推送类型
  pushTypes: {
    daily: boolean      // 每日运势
    weekly: boolean     // 每周运势
    important: boolean  // 重要日子提醒
  }
}

// 运势订阅设置
export interface FortuneSubscribeSettings {
  birthInfo: BirthInfo
  pushSettings: FortunePushSettings
}
