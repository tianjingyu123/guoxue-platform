// 成就/勋章相关类型定义

// 成就分类
export type AchievementCategory = 'learning' | 'social' | 'creation' | 'special' | 'activity'

// 成就稀有度
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

// 成就项
export interface AchievementItem {
  id: number
  name: string                      // 成就名称
  description: string               // 成就描述
  icon: string                      // 图标
  category: AchievementCategory     // 分类
  rarity: AchievementRarity         // 稀有度
  condition: string                 // 获得条件描述
  // 进度相关
  currentProgress: number           // 当前进度
  targetProgress: number            // 目标进度
  // 获得状态
  isUnlocked: boolean               // 是否已解锁
  unlockedAt?: string               // 解锁时间
  // 奖励
  rewardPoints?: number             // 奖励积分
  rewardBadge?: string              // 奖励徽章
}

// 成就统计
export interface AchievementStats {
  totalCount: number                // 总成就数
  unlockedCount: number             // 已解锁数
  totalPoints: number               // 累计获得积分
  recentUnlocked: AchievementItem[] // 最近解锁
}

// 成就分类信息
export interface AchievementCategoryInfo {
  key: AchievementCategory
  name: string
  icon: string
  total: number
  unlocked: number
}

// 成就详情响应
export interface AchievementDetailResponse {
  achievement: AchievementItem
  relatedAchievements: AchievementItem[]  // 相关成就
}

// 成就列表响应
export interface AchievementsResponse {
  stats: AchievementStats
  categories: AchievementCategoryInfo[]
  achievements: AchievementItem[]
}
