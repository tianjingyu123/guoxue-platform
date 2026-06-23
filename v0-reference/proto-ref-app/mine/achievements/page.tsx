'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Star, Lock, CheckCircle, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataState } from '@/components/data-state'
import { 
  getAchievements, 
  getAchievementDetail,
  getRarityName, 
  getRarityColor, 
  getRarityBgColor,
  getCategoryName 
} from '@/lib/api/achievements'
import type { 
  AchievementItem, 
  AchievementsResponse, 
  AchievementCategory,
  AchievementDetailResponse
} from '@/lib/types/achievements'

export default function AchievementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AchievementsResponse | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null)
  const [detailData, setDetailData] = useState<AchievementDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedCategory])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAchievements(selectedCategory === 'all' ? undefined : selectedCategory)
      if (res.code === 200) {
        setData(res.data)
      } else {
        setError(res.message)
      }
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleAchievementClick = async (achievement: AchievementItem) => {
    setSelectedAchievement(achievement)
    setDetailLoading(true)
    try {
      const res = await getAchievementDetail(achievement.id)
      if (res.code === 200) {
        setDetailData(res.data)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const progressPercent = data ? Math.round((data.stats.unlockedCount / data.stats.totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6 text-[#2D2A26]" />
          </button>
          <h1 className="text-lg font-semibold text-[#2D2A26]">成就墙</h1>
          <div className="w-8" />
        </div>
      </div>

      <DataState
        loading={loading}
        error={error}
        empty={!data}
        onRetry={loadData}
        skeleton={
          <div className="p-4 space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            <div className="flex gap-2 overflow-x-auto">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 w-20 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        {data && (
          <div className="pb-20">
            {/* 总览卡片 */}
            <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-[#C41E3A] to-[#9a1830] rounded-xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm opacity-80">成就进度</div>
                  <div className="text-2xl font-bold">{data.stats.unlockedCount}/{data.stats.totalCount}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm opacity-80">累计积分</div>
                  <div className="text-xl font-semibold text-[#C9A96E]">+{data.stats.totalPoints}</div>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2 bg-white/20" />
              <div className="mt-2 text-sm opacity-80 text-right">{progressPercent}%</div>
            </div>

            {/* 分类筛选 */}
            <div className="px-4 mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-[#C41E3A] text-white'
                      : 'bg-white text-[#666] border border-[#E5E5E5]'
                  }`}
                >
                  全部 ({data.stats.totalCount})
                </button>
                {data.categories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      selectedCategory === cat.key
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-white text-[#666] border border-[#E5E5E5]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name.replace('成就', '')}</span>
                    <span className="opacity-70">({cat.unlocked}/{cat.total})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 成就网格 */}
            <div className="px-4 mt-4">
              <div className="grid grid-cols-3 gap-3">
                {data.achievements.map(achievement => (
                  <button
                    key={achievement.id}
                    onClick={() => handleAchievementClick(achievement)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      achievement.isUnlocked
                        ? `${getRarityBgColor(achievement.rarity)} border border-[#C9A96E]/30`
                        : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <div className={`text-3xl mb-2 ${!achievement.isUnlocked ? 'grayscale' : ''}`}>
                      {achievement.icon}
                    </div>
                    <div className={`text-xs font-medium truncate ${
                      achievement.isUnlocked ? 'text-[#2D2A26]' : 'text-gray-500'
                    }`}>
                      {achievement.name}
                    </div>
                    {achievement.isUnlocked ? (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] text-green-600">已获得</span>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <Progress 
                          value={(achievement.currentProgress / achievement.targetProgress) * 100} 
                          className="h-1"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {achievement.currentProgress}/{achievement.targetProgress}
                        </span>
                      </div>
                    )}
                    {/* 稀有度标识 */}
                    {achievement.rarity !== 'common' && (
                      <div className={`mt-1 text-[10px] ${getRarityColor(achievement.rarity)}`}>
                        {getRarityName(achievement.rarity)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 最近解锁 */}
            {data.stats.recentUnlocked.length > 0 && (
              <div className="px-4 mt-6">
                <h3 className="text-sm font-semibold text-[#2D2A26] mb-3">最近解锁</h3>
                <div className="space-y-2">
                  {data.stats.recentUnlocked.map(achievement => (
                    <button
                      key={achievement.id}
                      onClick={() => handleAchievementClick(achievement)}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E5E5]"
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-[#2D2A26]">{achievement.name}</div>
                        <div className="text-xs text-[#666]">{achievement.unlockedAt} 获得</div>
                      </div>
                      <div className="text-sm text-[#C9A96E] font-medium">+{achievement.rewardPoints}</div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DataState>

      {/* 成就详情弹窗 */}
      <Sheet open={!!selectedAchievement} onOpenChange={(open) => !open && setSelectedAchievement(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader className="border-b border-[#E5E5E5] pb-4">
            <SheetTitle className="text-center">成就详情</SheetTitle>
          </SheetHeader>
          
          {selectedAchievement && (
            <div className="py-6 overflow-y-auto">
              {/* 成就图标和名称 */}
              <div className="text-center">
                <div className={`text-6xl mb-3 ${!selectedAchievement.isUnlocked ? 'grayscale' : ''}`}>
                  {selectedAchievement.icon}
                </div>
                <div className="text-xl font-semibold text-[#2D2A26]">{selectedAchievement.name}</div>
                <div className={`mt-1 text-sm ${getRarityColor(selectedAchievement.rarity)}`}>
                  {getRarityName(selectedAchievement.rarity)}成就
                </div>
                <div className="mt-2 text-sm text-[#666]">{selectedAchievement.description}</div>
              </div>

              {/* 获得状态 */}
              <div className={`mx-4 mt-6 p-4 rounded-xl ${
                selectedAchievement.isUnlocked 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                {selectedAchievement.isUnlocked ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                    <div>
                      <div className="font-medium text-green-700">已获得此成就</div>
                      <div className="text-sm text-green-600">{selectedAchievement.unlockedAt} 解锁</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-sm text-gray-500">获得积分</div>
                      <div className="text-lg font-semibold text-[#C9A96E]">+{selectedAchievement.rewardPoints}</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Lock className="w-8 h-8 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-700">尚未解锁</div>
                        <div className="text-sm text-gray-500">{selectedAchievement.condition}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(selectedAchievement.currentProgress / selectedAchievement.targetProgress) * 100}
                        className="flex-1 h-2"
                      />
                      <span className="text-sm text-gray-500">
                        {selectedAchievement.currentProgress}/{selectedAchievement.targetProgress}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 奖励信息 */}
              <div className="mx-4 mt-4 p-4 bg-[#FFF9E6] rounded-xl border border-[#C9A96E]/30">
                <div className="text-sm font-medium text-[#8B7355] mb-2">成就奖励</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#C9A96E]" />
                    <span className="text-[#2D2A26] font-medium">{selectedAchievement.rewardPoints} 积分</span>
                  </div>
                  {selectedAchievement.rewardBadge && (
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-[#C9A96E]" />
                      <span className="text-[#2D2A26] font-medium">{selectedAchievement.rewardBadge}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 相关成就 */}
              {detailData?.relatedAchievements && detailData.relatedAchievements.length > 0 && (
                <div className="mx-4 mt-6">
                  <h4 className="text-sm font-semibold text-[#2D2A26] mb-3">相关成就</h4>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {detailData.relatedAchievements.map(related => (
                      <button
                        key={related.id}
                        onClick={() => handleAchievementClick(related)}
                        className={`flex-shrink-0 w-20 p-2 rounded-xl text-center ${
                          related.isUnlocked ? getRarityBgColor(related.rarity) : 'bg-gray-100 opacity-60'
                        }`}
                      >
                        <div className={`text-2xl ${!related.isUnlocked ? 'grayscale' : ''}`}>{related.icon}</div>
                        <div className="text-xs truncate mt-1">{related.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
