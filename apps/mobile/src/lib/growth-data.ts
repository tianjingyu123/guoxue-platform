// 成长中心数据层（平台级学分/功名等级/连续学习/成就墙）
// 后端真源（已读源码核实，勿臆造）：
//   GET  /users/me/growth-profile  user-growth.controller.ts → UserGrowthService.getMyGrowth（/users/me/growth 被旧成长值系统占用）
//   POST /users/me/checkin         checkin.controller.ts → CheckinService.checkIn（重复签到抛「今日已签到」）
//   GET  /users/me/checkin/status  checkin.controller.ts → CheckinService.getStatus
// 三端点均需登录（JwtAuthGuard），401 由 request 层统一处理。

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
  /** 我的成长档案（学分/等级/连续天数/成就墙/全部阶梯） */
  me: () => apiGet<GrowthProfile>('/users/me/growth-profile'),

  /** 今日学习打卡（重复打卡后端报「今日已签到」） */
  checkin: () => apiPost<CheckinResult>('/users/me/checkin'),

  /** 查询今日打卡状态 */
  checkinStatus: () => apiGet<CheckinStatus>('/users/me/checkin/status'),
}
