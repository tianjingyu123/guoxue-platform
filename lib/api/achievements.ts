// 成就/勋章相关 API
import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  AchievementItem, 
  AchievementsResponse, 
  AchievementDetailResponse,
  AchievementCategory,
  AchievementStats,
  AchievementCategoryInfo
} from '../types/achievements'

// ========== Mock 数据 ==========

const mockAchievements: AchievementItem[] = [
  {
    id: 1,
    name: '初入国学',
    description: '完成首次注册，开启国学之旅',
    icon: '🎓',
    category: 'learning',
    rarity: 'common',
    condition: '完成账号注册',
    currentProgress: 1,
    targetProgress: 1,
    isUnlocked: true,
    unlockedAt: '2026-01-15',
    rewardPoints: 10,
  },
  {
    id: 2,
    name: '好学不倦',
    description: '累计学习时长达到10小时',
    icon: '📚',
    category: 'learning',
    rarity: 'common',
    condition: '累计学习10小时',
    currentProgress: 10,
    targetProgress: 10,
    isUnlocked: true,
    unlockedAt: '2026-02-20',
    rewardPoints: 50,
  },
  {
    id: 3,
    name: '学海无涯',
    description: '累计学习时长达到100小时',
    icon: '🏆',
    category: 'learning',
    rarity: 'rare',
    condition: '累计学习100小时',
    currentProgress: 68,
    targetProgress: 100,
    isUnlocked: false,
    rewardPoints: 200,
  },
  {
    id: 4,
    name: '博古通今',
    description: '累计学习时长达到500小时',
    icon: '👑',
    category: 'learning',
    rarity: 'legendary',
    condition: '累计学习500小时',
    currentProgress: 68,
    targetProgress: 500,
    isUnlocked: false,
    rewardPoints: 1000,
  },
  {
    id: 5,
    name: '广结善缘',
    description: '关注10位国学爱好者',
    icon: '🤝',
    category: 'social',
    rarity: 'common',
    condition: '关注10位用户',
    currentProgress: 10,
    targetProgress: 10,
    isUnlocked: true,
    unlockedAt: '2026-03-10',
    rewardPoints: 30,
  },
  {
    id: 6,
    name: '德高望重',
    description: '获得100位粉丝关注',
    icon: '⭐',
    category: 'social',
    rarity: 'rare',
    condition: '拥有100位粉丝',
    currentProgress: 45,
    targetProgress: 100,
    isUnlocked: false,
    rewardPoints: 150,
  },
  {
    id: 7,
    name: '桃李满天下',
    description: '获得1000位粉丝关注',
    icon: '🌟',
    category: 'social',
    rarity: 'epic',
    condition: '拥有1000位粉丝',
    currentProgress: 45,
    targetProgress: 1000,
    isUnlocked: false,
    rewardPoints: 500,
  },
  {
    id: 8,
    name: '妙笔生花',
    description: '发布首篇原创文章',
    icon: '✍️',
    category: 'creation',
    rarity: 'common',
    condition: '发布1篇文章',
    currentProgress: 1,
    targetProgress: 1,
    isUnlocked: true,
    unlockedAt: '2026-04-05',
    rewardPoints: 30,
  },
  {
    id: 9,
    name: '著作等身',
    description: '累计发布50篇原创内容',
    icon: '📖',
    category: 'creation',
    rarity: 'epic',
    condition: '发布50篇内容',
    currentProgress: 12,
    targetProgress: 50,
    isUnlocked: false,
    rewardPoints: 300,
  },
  {
    id: 10,
    name: '春节同庆',
    description: '参与2026年春节活动',
    icon: '🧧',
    category: 'activity',
    rarity: 'rare',
    condition: '参与春节限定活动',
    currentProgress: 1,
    targetProgress: 1,
    isUnlocked: true,
    unlockedAt: '2026-01-28',
    rewardPoints: 100,
    rewardBadge: '新春福袋',
  },
  {
    id: 11,
    name: '端午传承',
    description: '参与2026年端午活动',
    icon: '🐲',
    category: 'activity',
    rarity: 'rare',
    condition: '参与端午限定活动',
    currentProgress: 0,
    targetProgress: 1,
    isUnlocked: false,
    rewardPoints: 100,
  },
  {
    id: 12,
    name: '传道授业',
    description: '成功回答10个问题并被采纳',
    icon: '💡',
    category: 'social',
    rarity: 'rare',
    condition: '被采纳10次回答',
    currentProgress: 3,
    targetProgress: 10,
    isUnlocked: false,
    rewardPoints: 100,
  },
  {
    id: 13,
    name: '开山祖师',
    description: '创建一个超过100人的圈子',
    icon: '🏛️',
    category: 'creation',
    rarity: 'legendary',
    condition: '圈子成员达100人',
    currentProgress: 0,
    targetProgress: 100,
    isUnlocked: false,
    rewardPoints: 500,
  },
  {
    id: 14,
    name: '日行一善',
    description: '连续签到7天',
    icon: '📅',
    category: 'special',
    rarity: 'common',
    condition: '连续签到7天',
    currentProgress: 7,
    targetProgress: 7,
    isUnlocked: true,
    unlockedAt: '2026-05-01',
    rewardPoints: 50,
  },
  {
    id: 15,
    name: '持之以恒',
    description: '连续签到30天',
    icon: '🔥',
    category: 'special',
    rarity: 'rare',
    condition: '连续签到30天',
    currentProgress: 18,
    targetProgress: 30,
    isUnlocked: false,
    rewardPoints: 200,
  },
  {
    id: 16,
    name: '岁月如歌',
    description: '连续签到365天',
    icon: '💎',
    category: 'special',
    rarity: 'legendary',
    condition: '连续签到365天',
    currentProgress: 18,
    targetProgress: 365,
    isUnlocked: false,
    rewardPoints: 2000,
  },
]

const mockStats: AchievementStats = {
  totalCount: mockAchievements.length,
  unlockedCount: mockAchievements.filter(a => a.isUnlocked).length,
  totalPoints: mockAchievements.filter(a => a.isUnlocked).reduce((sum, a) => sum + (a.rewardPoints || 0), 0),
  recentUnlocked: mockAchievements.filter(a => a.isUnlocked).slice(-3).reverse(),
}

const mockCategories: AchievementCategoryInfo[] = [
  { key: 'learning', name: '学习成就', icon: '📚', total: 4, unlocked: 2 },
  { key: 'social', name: '社交成就', icon: '🤝', total: 4, unlocked: 1 },
  { key: 'creation', name: '创作成就', icon: '✍️', total: 3, unlocked: 1 },
  { key: 'special', name: '特殊成就', icon: '⭐', total: 3, unlocked: 1 },
  { key: 'activity', name: '活动成就', icon: '🎉', total: 2, unlocked: 1 },
]

// ========== API 函数 ==========

/**
 * 获取成就列表和统计
 */
export async function getAchievements(category?: AchievementCategory): Promise<ApiResponse<AchievementsResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let achievements = mockAchievements
    if (category) {
      achievements = mockAchievements.filter(a => a.category === category)
    }
    return {
      code: 200,
      data: {
        stats: mockStats,
        categories: mockCategories,
        achievements,
      },
      message: 'success',
    }
  }
  return apiGet<AchievementsResponse>('/user/achievements', category ? { category } : {})
}

/**
 * 获取成就详情
 */
export async function getAchievementDetail(id: number): Promise<ApiResponse<AchievementDetailResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const achievement = mockAchievements.find(a => a.id === id)
    if (!achievement) {
      return { code: 404, data: null as any, message: '成就不存在' }
    }
    const related = mockAchievements
      .filter(a => a.category === achievement.category && a.id !== id)
      .slice(0, 3)
    return {
      code: 200,
      data: {
        achievement,
        relatedAchievements: related,
      },
      message: 'success',
    }
  }
  return apiGet<AchievementDetailResponse>(`/user/achievements/${id}`)
}

/**
 * 获取稀有度中文名
 */
export function getRarityName(rarity: string): string {
  const names: Record<string, string> = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
  }
  return names[rarity] || '普通'
}

/**
 * 获取稀有度颜色
 */
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'text-gray-500',
    rare: 'text-blue-500',
    epic: 'text-purple-500',
    legendary: 'text-amber-500',
  }
  return colors[rarity] || 'text-gray-500'
}

/**
 * 获取稀有度背景色
 */
export function getRarityBgColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'bg-gray-100',
    rare: 'bg-blue-50',
    epic: 'bg-purple-50',
    legendary: 'bg-amber-50',
  }
  return colors[rarity] || 'bg-gray-100'
}

/**
 * 获取分类中文名
 */
export function getCategoryName(category: AchievementCategory): string {
  const names: Record<AchievementCategory, string> = {
    learning: '学习成就',
    social: '社交成就',
    creation: '创作成就',
    special: '特殊成就',
    activity: '活动成就',
  }
  return names[category] || '其他'
}
