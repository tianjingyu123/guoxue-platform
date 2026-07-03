// 成长中心数据层（平台级学分/功名等级/连续学习/成就墙）
// 后端真源（已读源码核实，勿臆造）：
//   GET  /users/me/growth-profile  user-growth.controller.ts → UserGrowthService.getMyGrowth（/users/me/growth 被旧成长值系统占用）
//   POST /users/me/checkin         checkin.controller.ts → CheckinService.checkIn（重复签到抛「今日已签到」）
//   GET  /users/me/checkin/status  checkin.controller.ts → CheckinService.getStatus
//   GET  /users/me/growth-profile/titles          称号目录（12 枚·含 earned/equipped 状态）
//   POST /users/me/growth-profile/titles/equip    佩戴称号 body { code }（未获得返回 400·每用户至多一枚）
//   POST /users/me/growth-profile/titles/unequip  卸下称号
// 以上端点均需登录（JwtAuthGuard），401 由 request 层统一处理。

import { apiGet, apiPost } from '@/utils/request'

/** 功名阶梯定义（与后端 GROWTH_LEVELS 一致：exp 为该级起点学分） */
export interface GrowthLevel {
  level: number
  name: string
  exp: number
}

/** 成就（earned=false 时 earnedAt 为 null；desc 即达成条件文案） */
export interface GrowthAchievement {
  code: string
  name: string
  desc: string
  icon: string
  earned: boolean
  earnedAt: string | null
}

/** 我的成长档案（GET /users/me/growth-profile 响应） */
export interface GrowthProfile {
  totalExp: number
  level: number
  levelName: string
  levelStartExp: number
  /** 下一级起点学分；null=已到顶级（宗师） */
  nextLevelExp: number | null
  currentStreak: number
  maxStreak: number
  achievements: GrowthAchievement[]
  levels: GrowthLevel[]
  /** 佩戴中的称号；null=未佩戴（响应缺省时由适配层归一为 null） */
  equippedTitle: { code: string; name: string } | null
}

/** 称号（GET /users/me/growth-profile/titles 数组项；未获得时 earnedAt 为 null，desc 即获取条件文案） */
export interface GrowthTitle {
  code: string
  name: string
  desc: string
  earned: boolean
  equipped: boolean
  earnedAt: string | null
}

/** 打卡结果（POST /users/me/checkin 响应） */
export interface CheckinResult {
  consecutiveDays: number
  rewardPoints: number
  date: string
}

/** 今日打卡状态（GET /users/me/checkin/status 响应） */
export interface CheckinStatus {
  todayChecked: boolean
  continuousDays: number
  totalPoints: number
}

/**
 * 后端成就 icon 与前端图标注册表（lib/icons-registry.ts）的差异映射：
 * door-open / footprints 未注册 → 就近替换为已注册图标。
 * - door-open（初入学堂）→ book-open（开卷入学，语义贴合）
 * - footprints（千里之行）→ map（行路千里，语义贴合）
 */
const ICON_FALLBACK: Record<string, string> = {
  'door-open': 'book-open',
  footprints: 'map',
}

/** 解析成就图标名（未注册的后端图标名替换为近似已注册图标） */
export function resolveAchievementIcon(icon: string): string {
  return ICON_FALLBACK[icon] ?? icon
}

/** 成长中心 API（真连后端，无 mock 回退；错误向上抛给页面走三态） */
export const growthApi = {
  /** 我的成长档案（学分/等级/连续天数/成就墙/全部阶梯/佩戴称号） */
  me: async (): Promise<GrowthProfile> => {
    const profile = await apiGet<GrowthProfile>('/users/me/growth-profile')
    // 容错：旧响应缺省 equippedTitle 时归一为 null，避免 undefined 泄漏到视图层
    return { ...profile, equippedTitle: profile.equippedTitle ?? null }
  },

  /** 称号目录（12 枚·含获得/佩戴状态） */
  titles: () => apiGet<GrowthTitle[]>('/users/me/growth-profile/titles'),

  /** 佩戴称号（每用户至多一枚；未获得后端返回 400） */
  equipTitle: (code: string) => apiPost<void>('/users/me/growth-profile/titles/equip', { code }),

  /** 卸下当前佩戴称号 */
  unequipTitle: () => apiPost<void>('/users/me/growth-profile/titles/unequip'),

  /** 今日学习打卡（重复打卡后端报「今日已签到」） */
  checkin: () => apiPost<CheckinResult>('/users/me/checkin'),

  /** 查询今日打卡状态 */
  checkinStatus: () => apiGet<CheckinStatus>('/users/me/checkin/status'),
}
