<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circles/[id]/level</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-8">
          <!--   -->
          <view class="bg-gradient-to-br from-[#2C2C2C] to-[#1a1a1a] pt-4 pb-8">
            <!--   -->
            <view class="px-4 mb-6 flex items-center justify-between">
              <view class="v0-btn" @click={() => router.back()} class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <ArrowLeft class="w-5 h-5 text-white" />
              </view>
              <text class="text-white font-semibold">我的等级</text>
              <Link href={`/circles/${circleId}/level/rank`} class="text-[12px] text-white/70 flex items-center">
                排行 <ChevronRight class="w-4 h-4" />
              </Link>
            </view>
    
            <!--   -->
            <view class="px-4">
              <view class="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-5 backdrop-blur">
                <view class="flex items-center gap-4 mb-4">
                  <view class="relative">
                    <image src={{ userData.avatar }} alt="" class="w-16 h-16 rounded-full border-2" :style=" borderColor: currentLevel.color }} />
                    <view 
                      class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                      :style=" backgroundColor: currentLevel.color }}
                    >
                      {{ currentLevel.level }}
                    </view>
                  </view>
                  <view class="flex-1">
                    <view class="flex items-center gap-2 mb-1">
                      <text class="text-white font-semibold text-[16px]">{{ userData.name }}</text>
                      <text 
                        class="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                        :style=" backgroundColor: currentLevel.color }}
                      >
                        Lv.{{ currentLevel.level }} {{ currentLevel.name }}
                      </text>
                    </view>
                    <view class="text-white/60 text-[12px]">
                      圈内排名 #{{ userData.rank }} · 已加入{{ userData.joinedDays }}天
                    </view>
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-black/20 rounded-xl p-3">
                  <view class="flex items-center justify-between mb-2">
                    <text class="text-white/70 text-[12px]">经验值</text>
                    <text class="text-white text-[12px]">
                      {{ userData.currentXp }} / {nextLevel ? nextLevel.minXp : "MAX"}
                    </text>
                  </view>
                  <view class="h-2 bg-black/30 rounded-full overflow-hidden">
                    <view 
                      class="h-full rounded-full transition-all duration-500"
                      :style=" 
                        width: `${{ progressToNext }}%`,
                        backgroundColor: currentLevel.color
                      }}
                    />
                  </view>
                  {nextLevel && (
                    <view class="text-white/50 text-[11px] mt-1.5">
                      距离 Lv.{{ nextLevel.level }} {{ nextLevel.name }} 还需 {{ nextLevel.minXp - userData.currentXp }} 经验
                    </view>
                  )}
                </view>
    
                <!--   -->
                <view class="grid grid-cols-4 gap-3 mt-4">
                  <view class="text-center">
                    <view class="text-white font-bold text-[18px]">{{ userData.posts }}</view>
                    <view class="text-white/50 text-[11px]">发帖</view>
                  </view>
                  <view class="text-center">
                    <view class="text-white font-bold text-[18px]">{{ userData.likes }}</view>
                    <view class="text-white/50 text-[11px]">获赞</view>
                  </view>
                  <view class="text-center">
                    <view class="text-white font-bold text-[18px]">{{ userData.badges }}</view>
                    <view class="text-white/50 text-[11px]">勋章</view>
                  </view>
                  <view class="text-center">
                    <view class="text-white font-bold text-[18px]">{{ userData.totalXp }}</view>
                    <view class="text-white/50 text-[11px]">总经验</view>
                  </view>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 -mt-4 relative z-10">
            <view class="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id as typeof activeTab)}
                  class={cn(
                    "flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all",
                    activeTab === tab.id 
                      ? "bg-[#2C2C2C] text-white" 
                      : "text-[#666]"
                  )}
                >
                  {{ tab.label }}
                </view>
              ))}
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <!--   -->
            {activeTab === 'level' && (
              <view class="space-y-4">
                <!--   -->
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center gap-2 mb-4">
                    <TrendingUp class="w-5 h-5 text-[#C41E3A]" />
                    <text class="font-medium text-[#2C2C2C]">等级体系</text>
                  </view>
                  <view class="space-y-3">
                    
    <view v-for="(level, idx) in levels" :key="idx"> {
                      const isCurrentLevel = level.level === currentLevel.level
                      const isPassed = level.level < currentLevel.level
                      const isLocked = level.level > currentLevel.level
                      
                      return (
                        <view 
                          key={level.level}
                          class={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            isCurrentLevel && "bg-[#FAF8F5] ring-2",
                            isPassed && "opacity-60"
                          )}
                          style={isCurrentLevel ? { ringColor: level.color + "30" } : undefined}
                        >
                          <view 
                            class={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                              isLocked && "bg-[#E8E3DB] text-[#999]"
                            )}
                            style={!isLocked ? { backgroundColor: level.color } : undefined}
                          >
                            <template v-if="isLocked">
    Lock class="w-4 h-4" /> : level.level}
                          </view>
                          <view class="flex-1">
                            <view class="flex items-center gap-2">
                              <text class={cn(
                                "font-medium text-[14px]",
                                isLocked ? "text-[#999]" : "text-[#2C2C2C]"
                              )}>
                                Lv.{{ level.level }} {{ level.name }}
                              </text>
                              {isCurrentLevel && (
                                <text class="px-2 py-0.5 bg-[#C41E3A] text-white text-[10px] rounded-full">当前</text>
                              )}
                              {isPassed && (
                                <CheckCircle class="w-4 h-4 text-[#52C41A]" />
                              )}
                            </view>
                            <view class="text-[11px] text-[#999]">
                              {{ level.minXp }} - {level.maxXp === 999999 ? "∞" : level.maxXp} 经验
                            </view>
                          </view>
                        </view>
                      )
                    })}
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center gap-2 mb-4">
                    <Gift class="w-5 h-5 text-[#C9A96E]" />
                    <text class="font-medium text-[#2C2C2C]">当前等级特权</text>
                  </view>
                  <view class="grid grid-cols-2 gap-2">
                    {levelPrivileges
                      .filter(p => p.level <= currentLevel.level)
                      .flatMap(p => p.privileges)
                      .map((privilege, idx) => (
                        <view key={idx} class="flex items-center gap-2 px-3 py-2 bg-[#FAF8F5] rounded-lg">
                          <CheckCircle class="w-4 h-4 text-[#52C41A]" />
                          <text class="text-[13px] text-[#2C2C2C]">{{ privilege }}</text>
                        </view>
                      ))}
                  </view>
                </view>
    
                <!--   -->
                {nextLevel && (
                  <view class="bg-gradient-to-r from-[#FFF8E7] to-[#FFFBF0] rounded-xl p-4 border border-[#F0E6D3]">
                    <view class="flex items-center gap-2 mb-3">
                      <Sparkles class="w-5 h-5 text-[#C9A96E]" />
                      <text class="font-medium text-[#2C2C2C]">
                        Lv.{{ nextLevel.level }} {{ nextLevel.name }} 解锁特权
                      </text>
                    </view>
                    <view class="flex flex-wrap gap-2">
                      {levelPrivileges.find(p => p.level === nextLevel.level)?.privileges.map((privilege, idx) => (
                        <view key={idx} class="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full">
                          <Lock class="w-3.5 h-3.5 text-[#C9A96E]" />
                          <text class="text-[12px] text-[#666]">{{ privilege }}</text>
                        </view>
                      ))}
                    </view>
                  </view>
                )}
              </view>
            )}
    
            <!--   -->
            {activeTab === 'badges' && (
              <view class="space-y-4">
                <!--   -->
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center justify-between mb-4">
                    <view class="flex items-center gap-2">
                      <Award class="w-5 h-5 text-[#C9A96E]" />
                      <text class="font-medium text-[#2C2C2C]">已获得勋章</text>
                    </view>
                    <text class="text-[12px] text-[#999]">{badges.filter(b => b.obtained).length}个</text>
                  </view>
                  <view class="grid grid-cols-3 gap-3">
                    {badges.filter(b => b.obtained).map(badge => (
                      <view key={badge.id} class="flex flex-col items-center p-3 bg-[#FAF8F5] rounded-xl">
                        <view 
                          class="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                          :style=" backgroundColor: badge.color + "15" }}
                        >
                          <badge.icon class="w-6 h-6" :style=" color: badge.color }} />
                        </view>
                        <text class="text-[12px] font-medium text-[#2C2C2C] text-center">{{ badge.name }}</text>
                        <text class="text-[10px] text-[#999]">{{ badge.obtainedAt }}</text>
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center justify-between mb-4">
                    <view class="flex items-center gap-2">
                      <Target class="w-5 h-5 text-[#999]" />
                      <text class="font-medium text-[#2C2C2C]">待解锁勋章</text>
                    </view>
                    <text class="text-[12px] text-[#999]">{badges.filter(b => !b.obtained).length}个</text>
                  </view>
                  <view class="space-y-3">
                    {badges.filter(b => !b.obtained).map(badge => (
                      <view key={badge.id} class="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl">
                        <view 
                          class="w-12 h-12 rounded-full flex items-center justify-center opacity-50"
                          :style=" backgroundColor: badge.color + "15" }}
                        >
                          <badge.icon class="w-6 h-6" :style=" color: badge.color }} />
                        </view>
                        <view class="flex-1">
                          <view class="flex items-center gap-2">
                            <text class="font-medium text-[14px] text-[#2C2C2C]">{{ badge.name }}</text>
                            <Lock class="w-3.5 h-3.5 text-[#999]" />
                          </view>
                          <text class="text-[12px] text-[#999]">{{ badge.desc }}</text>
                          {badge.progress !== undefined && badge.total !== undefined && (
                            <view class="mt-1.5">
                              <view class="flex items-center justify-between text-[10px] text-[#999] mb-1">
                                <text>进度</text>
                                <text>{{ badge.progress }}/{{ badge.total }}</text>
                              </view>
                              <view class="h-1.5 bg-[#E8E3DB] rounded-full overflow-hidden">
                                <view 
                                  class="h-full rounded-full"
                                  :style=" 
                                    width: `${{ (badge.progress / badge.total) * 100 }}%`,
                                    backgroundColor: badge.color
                                  }}
                                />
                              </view>
                            </view>
                          )}
                        </view>
                      </view>
                    ))}
                  </view>
                </view>
              </view>
            )}
    
            <!--   -->
            {activeTab === 'xp' && (
              <view class="space-y-4">
                <!--   -->
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center gap-2 mb-4">
                    <Zap class="w-5 h-5 text-[#FF6B35]" />
                    <text class="font-medium text-[#2C2C2C]">经验获取途径</text>
                  </view>
                  <view class="space-y-2">
                    
    <view v-for="(source, idx) in xpSources" :key="idx"> (
                      <view key={idx} class="flex items-center gap-3 p-3 bg-[#FAF8F5] rounded-xl">
                        <view 
                          class="w-10 h-10 rounded-xl flex items-center justify-center"
                          :style=" backgroundColor: source.color + "15" }}
                        >
                          <source.icon class="w-5 h-5" :style=" color: source.color }} />
                        </view>
                        <view class="flex-1">
                          <view class="font-medium text-[14px] text-[#2C2C2C]">{{ source.title }}</view>
                          <view class="text-[12px] text-[#999]">{{ source.desc }}</view>
                        </view>
                        <view class="text-[14px] font-bold" :style=" color: source.color }}>
                          {{ source.xp }}
                        </view>
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] rounded-xl p-4">
                  <view class="flex items-center justify-between mb-3">
                    <view class="flex items-center gap-2">
                      <Calendar class="w-5 h-5 text-white" />
                      <text class="font-medium text-white">每日签到</text>
                    </view>
                    <text class="text-white/70 text-[12px]">已连续签到 7 天</text>
                  </view>
                  <view class="grid grid-cols-7 gap-2 mb-3">
                    {[5, 5, 5, 10, 10, 15, 20].map((xp, idx) => {
                      const isPassed = idx < 3
                      const isToday = idx === 3
                      return (
                        <view 
                          key={idx}
                          class={cn(
                            "aspect-square rounded-lg flex flex-col items-center justify-center",
                            isPassed && "bg-white/20",
                            isToday && "bg-white",
                            !isPassed && !isToday && "bg-white/10"
                          )}
                        >
                          {isPassed ? (
                            <CheckCircle class="w-4 h-4 text-white" />
                          ) : (
                            
                              <text class={cn(
                                "text-[10px]",
                                isToday ? "text-[#C41E3A]" : "text-white/70"
                              )}>+{{ xp }}</text>
                              <text class={cn(
                                "text-[8px]",
                                isToday ? "text-[#C41E3A]" : "text-white/50"
                              )}>Day{{ idx + 1 }}</text>
                            
                          )}
                        </view>
                      )
                    })}
                  </view>
                  <view class="v0-btn" class="w-full py-2.5 bg-white text-[#C41E3A] font-medium rounded-lg">
                    立即签到 (+10经验)
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center justify-between mb-4">
                    <text class="font-medium text-[#2C2C2C]">最近获得</text>
                    <Link href={`/circles/${circleId}/level/history`} class="text-[12px] text-[#C41E3A]">
                      全部记录
                    </Link>
                  </view>
                  <view class="space-y-2">
                    {[
                      { title: "发布帖子", time: "今天 10:30", xp: "+10" },
                      { title: "每日签到", time: "今天 09:00", xp: "+10" },
                      { title: "获得点赞", time: "昨天 22:15", xp: "+5" },
                      { title: "完成打卡", time: "昨天 21:00", xp: "+10" },
                    ].map((item, idx) => (
                      <view key={{ idx }} class="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0">
                        <view>
                          <view class="text-[13px] text-[#2C2C2C]">{{ item.title }}</view>
                          <view class="text-[11px] text-[#999]">{{ item.time }}</view>
                        </view>
                        <text class="text-[14px] font-medium text-[#52C41A]">{{ item.xp }}</text>
                      </view>
                    ))}
                  </view>
                </view>
              </view>
            )}
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const levels = [
const badges = [
const levelPrivileges = [
const xpSources = [
const userData = {
  const tabs = [

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