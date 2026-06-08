<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/achievements</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <!--   -->
          <view class="sticky top-0 z-10 bg-[#FAF8F5] border-b border-[#C9A96E]/20">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="v0-btn" @click={() => router.back()} class="p-1">
                <ArrowLeft class="w-6 h-6 text-[#2D2A26]" />
              </view>
              <text class="text-lg font-semibold text-[#2D2A26]">成就墙</text>
              <view class="w-8" />
            </view>
          </view>
    
          <DataState
            loading={{ loading }}
            error={{ error }}
            empty={{ !data }}
            onRetry={{ loadData }}
            skeleton={
              <view class="p-4 space-y-4">
                <view class="h-32 bg-gray-200 rounded-xl animate-pulse" />
                <view class="flex gap-2 overflow-x-auto">
                  {[1,2,3,4,5].map(i => (
                    <view key={i} class="h-10 w-20 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                  ))}
                </view>
                <view class="grid grid-cols-3 gap-3">
                  {[1,2,3,4,5,6].map(i => (
                    <view key={i} class="h-32 bg-gray-200 rounded-xl animate-pulse" />
                  ))}
                </view>
              </view>
            }
          >
            {data && (
              <view class="pb-20">
                <!--   -->
                <view class="mx-4 mt-4 p-4 bg-gradient-to-br from-[#C41E3A] to-[#9a1830] rounded-xl text-white">
                  <view class="flex items-center gap-3 mb-4">
                    <view class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Trophy class="w-6 h-6" />
                    </view>
                    <view>
                      <view class="text-sm opacity-80">成就进度</view>
                      <view class="text-2xl font-bold">{{ data.stats.unlockedCount }}/{{ data.stats.totalCount }}</view>
                    </view>
                    <view class="ml-auto text-right">
                      <view class="text-sm opacity-80">累计积分</view>
                      <view class="text-xl font-semibold text-[#C9A96E]">+{{ data.stats.totalPoints }}</view>
                    </view>
                  </view>
                  <Progress value={{ progressPercent }} class="h-2 bg-white/20" />
                  <view class="mt-2 text-sm opacity-80 text-right">{{ progressPercent }}%</view>
                </view>
    
                <!--   -->
                <view class="px-4 mt-4">
                  <view class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <view class="v0-btn"
                      @click={() => setSelectedCategory('all')}
                      class={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === 'all'
                          ? 'bg-[#C41E3A] text-white'
                          : 'bg-white text-[#666] border border-[#E5E5E5]'
                      }`}
                    >
                      全部 ({{ data.stats.totalCount }})
                    </view>
                    {data.categories.map(cat => (
                      <view class="v0-btn"
                        key={{ cat.key }}
                        @click={() => setSelectedCategory(cat.key)}
                        class={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                          selectedCategory === cat.key
                            ? 'bg-[#C41E3A] text-white'
                            : 'bg-white text-[#666] border border-[#E5E5E5]'
                        }`}
                      >
                        <text>{{ cat.icon }}</text>
                        <text>{cat.name.replace('成就', '')}</text>
                        <text class="opacity-70">({{ cat.unlocked }}/{{ cat.total }})</text>
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view class="px-4 mt-4">
                  <view class="grid grid-cols-3 gap-3">
                    {data.achievements.map(achievement => (
                      <view class="v0-btn"
                        key={{ achievement.id }}
                        @click={() => handleAchievementClick(achievement)}
                        class={`p-3 rounded-xl text-center transition-all ${
                          achievement.isUnlocked
                            ? `${getRarityBgColor(achievement.rarity)} border border-[#C9A96E]/30`
                            : 'bg-gray-100 opacity-60'
                        }`}
                      >
                        <view class={`text-3xl mb-2 ${!achievement.isUnlocked ? 'grayscale' : ''}`}>
                          {{ achievement.icon }}
                        </view>
                        <view class={`text-xs font-medium truncate ${
                          achievement.isUnlocked ? 'text-[#2D2A26]' : 'text-gray-500'
                        }`}>
                          {{ achievement.name }}
                        </view>
                        {achievement.isUnlocked ? (
                          <view class="mt-1 flex items-center justify-center gap-1">
                            <CheckCircle class="w-3 h-3 text-green-500" />
                            <text class="text-[10px] text-green-600">已获得</text>
                          </view>
                        ) : (
                          <view class="mt-1">
                            <Progress 
                              value={{ (achievement.currentProgress / achievement.targetProgress) * 100 }} 
                              class="h-1"
                            />
                            <text class="text-[10px] text-gray-400 mt-0.5 block">
                              {{ achievement.currentProgress }}/{{ achievement.targetProgress }}
                            </text>
                          </view>
                        )}
                        <!--   -->
                        {achievement.rarity !== 'common' && (
                          <view class={`mt-1 text-[10px] ${getRarityColor(achievement.rarity)}`}>
                            {{ getRarityName(achievement.rarity) }}
                          </view>
                        )}
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                {data.stats.recentUnlocked.length > 0 && (
                  <view class="px-4 mt-6">
                    <text class="text-sm font-semibold text-[#2D2A26] mb-3">最近解锁</text>
                    <view class="space-y-2">
                      {data.stats.recentUnlocked.map(achievement => (
                        <view class="v0-btn"
                          key={{ achievement.id }}
                          @click={() => handleAchievementClick(achievement)}
                          class="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E5E5E5]"
                        >
                          <text class="text-2xl">{{ achievement.icon }}</text>
                          <view class="flex-1 text-left">
                            <view class="text-sm font-medium text-[#2D2A26]">{{ achievement.name }}</view>
                            <view class="text-xs text-[#666]">{{ achievement.unlockedAt }} 获得</view>
                          </view>
                          <view class="text-sm text-[#C9A96E] font-medium">+{{ achievement.rewardPoints }}</view>
                          <ChevronRight class="w-4 h-4 text-gray-400" />
                        </view>
                      ))}
                    </view>
                  </view>
                )}
              </view>
            )}
          </DataState>
    
          <!--   -->
          <Sheet open={{ !!selectedAchievement }} onOpenChange={(open) => !open && setSelectedAchievement(null)}>
            <SheetContent side="bottom" class="h-[70vh] rounded-t-2xl">
              <SheetHeader class="border-b border-[#E5E5E5] pb-4">
                <SheetTitle class="text-center">成就详情</SheetTitle>
              </SheetHeader>
              
              {selectedAchievement && (
                <view class="py-6 overflow-y-auto">
                  <!--   -->
                  <view class="text-center">
                    <view class={`text-6xl mb-3 ${!selectedAchievement.isUnlocked ? 'grayscale' : ''}`}>
                      {{ selectedAchievement.icon }}
                    </view>
                    <view class="text-xl font-semibold text-[#2D2A26]">{{ selectedAchievement.name }}</view>
                    <view class={`mt-1 text-sm ${getRarityColor(selectedAchievement.rarity)}`}>
                      {{ getRarityName(selectedAchievement.rarity) }}成就
                    </view>
                    <view class="mt-2 text-sm text-[#666]">{{ selectedAchievement.description }}</view>
                  </view>
    
                  <!--   -->
                  <view class={`mx-4 mt-6 p-4 rounded-xl ${
                    selectedAchievement.isUnlocked 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    {selectedAchievement.isUnlocked ? (
                      <view class="flex items-center gap-3">
                        <CheckCircle class="w-10 h-10 text-green-500" />
                        <view>
                          <view class="font-medium text-green-700">已获得此成就</view>
                          <view class="text-sm text-green-600">{{ selectedAchievement.unlockedAt }} 解锁</view>
                        </view>
                        <view class="ml-auto text-right">
                          <view class="text-sm text-gray-500">获得积分</view>
                          <view class="text-lg font-semibold text-[#C9A96E]">+{{ selectedAchievement.rewardPoints }}</view>
                        </view>
                      </view>
                    ) : (
                      <view>
                        <view class="flex items-center gap-3 mb-3">
                          <Lock class="w-8 h-8 text-gray-400" />
                          <view>
                            <view class="font-medium text-gray-700">尚未解锁</view>
                            <view class="text-sm text-gray-500">{{ selectedAchievement.condition }}</view>
                          </view>
                        </view>
                        <view class="flex items-center gap-2">
                          <Progress 
                            value={{ (selectedAchievement.currentProgress / selectedAchievement.targetProgress) * 100 }}
                            class="flex-1 h-2"
                          />
                          <text class="text-sm text-gray-500">
                            {{ selectedAchievement.currentProgress }}/{{ selectedAchievement.targetProgress }}
                          </text>
                        </view>
                      </view>
                    )}
                  </view>
    
                  <!--   -->
                  <view class="mx-4 mt-4 p-4 bg-[#FFF9E6] rounded-xl border border-[#C9A96E]/30">
                    <view class="text-sm font-medium text-[#8B7355] mb-2">成就奖励</view>
                    <view class="flex items-center gap-4">
                      <view class="flex items-center gap-1">
                        <Star class="w-4 h-4 text-[#C9A96E]" />
                        <text class="text-[#2D2A26] font-medium">{{ selectedAchievement.rewardPoints }} 积分</text>
                      </view>
                      {selectedAchievement.rewardBadge && (
                        <view class="flex items-center gap-1">
                          <Trophy class="w-4 h-4 text-[#C9A96E]" />
                          <text class="text-[#2D2A26] font-medium">{{ selectedAchievement.rewardBadge }}</text>
                        </view>
                      )}
                    </view>
                  </view>
    
                  <!--   -->
                  {detailData?.relatedAchievements && detailData.relatedAchievements.length > 0 && (
                    <view class="mx-4 mt-6">
                      <text class="text-sm font-semibold text-[#2D2A26] mb-3">相关成就</text>
                      <view class="flex gap-3 overflow-x-auto pb-2">
                        {detailData.relatedAchievements.map(related => (
                          <view class="v0-btn"
                            key={{ related.id }}
                            @click={() => handleAchievementClick(related)}
                            class={`flex-shrink-0 w-20 p-2 rounded-xl text-center ${
                              related.isUnlocked ? getRarityBgColor(related.rarity) : 'bg-gray-100 opacity-60'
                            }`}
                          >
                            <view class={`text-2xl ${!related.isUnlocked ? 'grayscale' : ''}`}>{{ related.icon }}</view>
                            <view class="text-xs truncate mt-1">{{ related.name }}</view>
                          </view>
                        ))}
                      </view>
                    </view>
                  )}
                </view>
              )}
            </SheetContent>
          </Sheet>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据


async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>