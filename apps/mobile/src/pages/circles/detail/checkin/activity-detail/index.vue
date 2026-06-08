<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">圈子</text>
      <text class="v0-route">V0: circles/[id]/checkin/[activityId]</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] pb-24">
          <!--   -->
          <view class="relative h-52">
            <image src={{ activity.cover }} alt="" class="w-full h-full object-cover" />
            <view class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            
            <!--   -->
            <view class="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <view class="v0-btn" @click={() => router.back()} class="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
                <ArrowLeft class="w-5 h-5 text-white" />
              </view>
              <view class="v0-btn" class="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
                <Share2 class="w-5 h-5 text-white" />
              </view>
            </view>
    
            <!--   -->
            <view class="absolute bottom-0 left-0 right-0 p-4">
              <view class="flex items-center gap-2 mb-2">
                <text class="px-2 py-0.5 bg-[#52C41A] text-white text-[10px] rounded-full">进行中</text>
                <text class="text-white/80 text-[12px]">Day {{ activity.currentDay }}/{{ activity.totalDays }}</text>
              </view>
              <text class="text-white text-[20px] font-bold mb-1">{{ activity.title }}</text>
              <text class="text-white/70 text-[13px] line-clamp-2">{{ activity.description }}</text>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-3 bg-white border-b border-[#E8E3DB]">
            <view class="flex items-center justify-between mb-2">
              <text class="text-[12px] text-[#666]">活动进度</text>
              <text class="text-[12px] text-[#C41E3A] font-medium">{{ Math.round(progressPercent) }}%</text>
            </view>
            <view class="h-2 bg-[#F5F0E8] rounded-full overflow-hidden">
              <view 
                class="h-full bg-gradient-to-r from-[#C41E3A] to-[#FF6B6B] rounded-full transition-all duration-500"
                :style=" width: `${{ progressPercent }}%` }}
              />
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 py-4">
            <view class="grid grid-cols-4 gap-3">
              <view class="bg-white rounded-xl p-3 text-center shadow-sm">
                <view class="text-[20px] font-bold text-[#2C2C2C]">{{ activity.participants }}</view>
                <view class="text-[11px] text-[#999]">参与人数</view>
              </view>
              <view class="bg-white rounded-xl p-3 text-center shadow-sm">
                <view class="text-[20px] font-bold text-[#52C41A]">{{ activity.todayCheckedIn }}</view>
                <view class="text-[11px] text-[#999]">今日已打卡</view>
              </view>
              <view class="bg-white rounded-xl p-3 text-center shadow-sm">
                <view class="text-[20px] font-bold text-[#FF6B35]">{{ activity.myStreak }}</view>
                <view class="text-[11px] text-[#999]">我的连续</view>
              </view>
              <view class="bg-white rounded-xl p-3 text-center shadow-sm">
                <view class="text-[20px] font-bold text-[#C41E3A]">{{ activity.myTotalDays }}</view>
                <view class="text-[11px] text-[#999]">累计打卡</view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4 pb-4">
            <view class="bg-white rounded-xl p-4 shadow-sm">
              <view class="flex items-center justify-between mb-3">
                <text class="font-medium text-[#2C2C2C]">打卡日历</text>
                <text class="text-[12px] text-[#999]">{{ activity.startDate }} - {{ activity.endDate }}</text>
              </view>
              <view class="grid grid-cols-7 gap-2">
                
    <view v-for="(day, index) in calendarDays" :key="index"> (
                  <view 
                    key={day.day}
                    class={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-[13px] font-medium transition-all",
                      day.isCompleted && "bg-[#52C41A] text-white",
                      day.isToday && !activity.hasCheckedToday && "bg-[#C41E3A] text-white ring-2 ring-[#C41E3A]/30",
                      day.isToday && activity.hasCheckedToday && "bg-[#52C41A] text-white ring-2 ring-[#52C41A]/30",
                      day.isFuture && "bg-[#F5F0E8] text-[#CCC]",
                      !day.isCompleted && !day.isToday && !day.isFuture && "bg-[#FFE4E4] text-[#C41E3A]"
                    )}
                  >
                    {day.isCompleted ? <CheckCircle class="w-4 h-4" /> : day.day}
                  </view>
                ))}
              </view>
              <view class="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-[#F5F0E8]">
                <view class="flex items-center gap-1">
                  <view class="w-3 h-3 rounded bg-[#52C41A]" />
                  <text class="text-[11px] text-[#999]">已完成</text>
                </view>
                <view class="flex items-center gap-1">
                  <view class="w-3 h-3 rounded bg-[#FFE4E4]" />
                  <text class="text-[11px] text-[#999]">已错过</text>
                </view>
                <view class="flex items-center gap-1">
                  <view class="w-3 h-3 rounded bg-[#F5F0E8]" />
                  <text class="text-[11px] text-[#999]">未开始</text>
                </view>
              </view>
            </view>
          </view>
    
          <!--   -->
          <view class="px-4">
            <view class="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm">
              
    <view v-for="(tab, index) in tabs" :key="index"> (
                <view class="v0-btn"
                  key={{ tab.id }}
                  @click={() => setActiveTab(tab.id as typeof activeTab)}
                  class={cn(
                    "flex-1 py-2 text-[13px] font-medium rounded-lg transition-all",
                    activeTab === tab.id 
                      ? "bg-[#C41E3A] text-white" 
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
            {activeTab === 'today' && (
              <view class="space-y-4">
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center gap-2 mb-3">
                    <BookOpen class="w-5 h-5 text-[#C9A96E]" />
                    <text class="font-medium text-[#2C2C2C]">今日阅读</text>
                  </view>
                  <text class="text-[16px] font-bold text-[#2C2C2C] mb-2">{{ todayContent.chapter }}</text>
                  <text class="text-[13px] text-[#666] leading-relaxed mb-3">{{ todayContent.summary }}</text>
                  <view class="bg-[#FAF8F5] rounded-lg p-3">
                    <view class="text-[12px] text-[#999] mb-2">核心要点</view>
                    <view class="space-y-1.5">
                      {todayContent.keyPoints.map((point, idx) => (
                        <view key={idx} class="flex items-center gap-2">
                          <view class="w-1.5 h-1.5 rounded-full bg-[#C41E3A]" />
                          <text class="text-[13px] text-[#2C2C2C]">{{ point }}</text>
                        </view>
                      ))}
                    </view>
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-white rounded-xl p-4 shadow-sm">
                  <view class="flex items-center gap-2 mb-3">
                    <Star class="w-5 h-5 text-[#FF6B35]" />
                    <text class="font-medium text-[#2C2C2C]">打卡规则</text>
                  </view>
                  <view class="space-y-2">
                    {activity.rules.map((rule, idx) => (
                      <view key={idx} class="flex items-start gap-2">
                        <text class="w-5 h-5 rounded-full bg-[#F5F0E8] text-[11px] text-[#666] flex items-center justify-center flex-shrink-0">{{ idx + 1 }}</text>
                        <text class="text-[13px] text-[#666]">{{ rule }}</text>
                      </view>
                    ))}
                  </view>
                </view>
    
                <!--   -->
                <view class="bg-gradient-to-r from-[#FFF8E7] to-[#FFFBF0] rounded-xl p-4 border border-[#F0E6D3]">
                  <view class="flex items-center gap-2 mb-2">
                    <Trophy class="w-5 h-5 text-[#C9A96E]" />
                    <text class="font-medium text-[#2C2C2C]">完成奖励</text>
                  </view>
                  <view class="flex items-center gap-4">
                    <view class="flex items-center gap-1">
                      <Sparkles class="w-4 h-4 text-[#C9A96E]" />
                      <text class="text-[13px] text-[#666]">每日 +{{ activity.reward.xp }} 经验值</text>
                    </view>
                    <view class="flex items-center gap-1">
                      <Star class="w-4 h-4 text-[#C9A96E]" />
                      <text class="text-[13px] text-[#666]">获得「{{ activity.reward.badge }}」勋章</text>
                    </view>
                  </view>
                </view>
              </view>
            )}
    
            <!--   -->
            {activeTab === 'feed' && (
              <view class="space-y-3">
                
    <view v-for="(item, index) in checkinFeed" :key="index"> (
                  <view key={item.id} class="bg-white rounded-xl p-4 shadow-sm">
                    <view class="flex items-center gap-3 mb-3">
                      <image src={{ item.user.avatar }} alt="" class="w-10 h-10 rounded-full" />
                      <view class="flex-1">
                        <view class="font-medium text-[14px] text-[#2C2C2C]">{{ item.user.name }}</view>
                        <view class="text-[11px] text-[#999]">{{ item.time }}</view>
                      </view>
                      <view class="px-2 py-0.5 bg-[#52C41A]/10 text-[#52C41A] text-[10px] rounded-full">已打卡</view>
                    </view>
                    <text class="text-[14px] text-[#2C2C2C] leading-relaxed mb-3">{{ item.content }}</text>
                    {item.images.length > 0 && (
                      <view class="mb-3">
                        {item.images.map((img, idx) => (
                          <image key={idx} src={{ img }} alt="" class="w-full rounded-lg" />
                        ))}
                      </view>
                    )}
                    <view class="flex items-center gap-4 pt-2 border-t border-[#F5F0E8]">
                      <view class="v0-btn" class="flex items-center gap-1 text-[#999]">
                        <Heart class="w-4 h-4" />
                        <text class="text-[12px]">{{ item.likes }}</text>
                      </view>
                      <view class="v0-btn" class="flex items-center gap-1 text-[#999]">
                        <MessageCircle class="w-4 h-4" />
                        <text class="text-[12px]">{{ item.comments }}</text>
                      </view>
                    </view>
                  </view>
                ))}
              </view>
            )}
    
            <!--   -->
            {activeTab === 'rank' && (
              <view class="bg-white rounded-xl overflow-hidden shadow-sm">
                <view class="p-4 border-b border-[#F5F0E8]">
                  <view class="flex items-center gap-2">
                    <Trophy class="w-5 h-5 text-[#C9A96E]" />
                    <text class="font-medium text-[#2C2C2C]">连续打卡排行</text>
                  </view>
                </view>
                <view>
                  
    <view v-for="(item, idx) in leaderboard" :key="idx"> (
                    <view key={item.rank} class={cn(
                      "flex items-center gap-3 px-4 py-3",
                      idx < leaderboard.length - 1 && "border-b border-[#F5F0E8]"
                    )}>
                      <view class={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold",
                        item.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white" :
                        item.rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
                        item.rank === 3 ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white" :
                        "bg-[#F5F0E8] text-[#999]"
                      )}>
                        {{ item.rank }}
                      </view>
                      <image src={{ item.user.avatar }} alt="" class="w-10 h-10 rounded-full" />
                      <view class="flex-1">
                        <view class="font-medium text-[14px] text-[#2C2C2C]">{{ item.user.name }}</view>
                        <view class="text-[11px] text-[#999]">累计{{ item.totalDays }}天</view>
                      </view>
                      <view class="text-right">
                        <view class="flex items-center gap-1">
                          <Flame class="w-4 h-4 text-[#FF6B35]" />
                          <text class="font-bold text-[#FF6B35]">{{ item.streak }}</text>
                        </view>
                        <view class="text-[10px] text-[#999]">连续天数</view>
                      </view>
                    </view>
                  ))}
                </view>
              </view>
            )}
    
            <!--   -->
            {activeTab === 'my' && (
              <view class="space-y-3">
                {myCheckins.length > 0 ? (
                  myCheckins.map((item, idx) => (
                    <view key={idx} class="bg-white rounded-xl p-4 shadow-sm">
                      <view class="flex items-center gap-2 mb-2">
                        <CheckCircle class="w-4 h-4 text-[#52C41A]" />
                        <text class="text-[12px] text-[#999]">{{ item.date }}</text>
                      </view>
                      <text class="text-[14px] text-[#2C2C2C] leading-relaxed mb-2">{{ item.content }}</text>
                      {item.images.length > 0 && (
                        <view class="flex gap-2 mb-2">
                          {item.images.map((img, imgIdx) => (
                            <image key={imgIdx} src={{ img }} alt="" class="w-20 h-20 rounded-lg object-cover" />
                          ))}
                        </view>
                      )}
                      <view class="flex items-center gap-4 text-[12px] text-[#999]">
                        <text class="flex items-center gap-1"><Heart class="w-3.5 h-3.5" />{{ item.likes }}</text>
                        <text class="flex items-center gap-1"><MessageCircle class="w-3.5 h-3.5" />{{ item.comments }}</text>
                      </view>
                    </view>
                  ))
                ) : (
                  <view class="flex flex-col items-center justify-center py-16">
                    <BookOpen class="w-12 h-12 text-[#E8E3DB] mb-3" />
                    <text class="text-[#999] text-[14px]">还没有打卡记录</text>
                  </view>
                )}
              </view>
            )}
          </view>
    
          <!--   -->
          <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DB] px-4 py-3 z-50">
            {activity.hasCheckedToday ? (
              <view class="flex items-center justify-center gap-2 py-3 bg-[#F5F0E8] rounded-full">
                <CheckCircle class="w-5 h-5 text-[#52C41A]" />
                <text class="text-[#52C41A] font-medium">今日已打卡</text>
              </view>
            ) : (
              <view class="v0-btn"
                @click={() => setShowCheckinModal(true)}
                class="w-full py-3.5 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-medium rounded-full shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle class="w-5 h-5" />
                立即打卡 (+{{ activity.reward.xp }}经验)
              </view>
            )}
          </view>
    
          <!--   -->
          {showCheckinModal && (
            <view class="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
              <view class="w-full max-w-lg bg-white rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                <view class="flex items-center justify-between px-4 py-4 border-b border-[#E8E3DB]">
                  <view class="v0-btn" @click={() => setShowCheckinModal(false)} class="text-[#999]">
                    <X class="w-6 h-6" />
                  </view>
                  <text class="font-semibold text-[#2C2C2C]">打卡</text>
                  <view class="w-6" />
                </view>
                
                <view class="p-4 max-h-[70vh] overflow-y-auto">
                  <!--   -->
                  <view class="bg-[#FAF8F5] rounded-xl p-3 mb-4">
                    <view class="text-[12px] text-[#999] mb-1">今日阅读内容</view>
                    <view class="text-[14px] font-medium text-[#2C2C2C]">{{ todayContent.chapter }}</view>
                  </view>
    
                  <!--   -->
                  <view class="mb-4">
                    <text class="text-[14px] font-medium text-[#2C2C2C] mb-2 block">
                      写下你的心得 <text class="text-[#C41E3A]">*</text>
                    </text>
                    <textarea
                      value={{ checkinContent }}
                      @change={(e) => setCheckinContent(e.target.value)}
                      placeholder="记录今天的阅读收获，至少50字..."
                      class="w-full h-32 p-3 bg-[#FAF8F5] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#C41E3A]/30"
                    />
                    <view class="text-right text-[12px] text-[#999] mt-1">
                      {{ checkinContent.length }}/50 {checkinContent.length < 50 && "(至少50字)"}
                    </view>
                  </view>
    
                  <!--   -->
                  <view class="mb-4">
                    <text class="text-[14px] font-medium text-[#2C2C2C] mb-2 block">
                      添加图片 <text class="text-[12px] text-[#999]">(选填)</text>
                    </text>
                    <view class="v0-btn" class="w-20 h-20 rounded-xl border-2 border-dashed border-[#E8E3DB] flex flex-col items-center justify-center text-[#999]">
                      <Camera class="w-6 h-6 mb-1" />
                      <text class="text-[11px]">添加</text>
                    </view>
                  </view>
                </view>
    
                <view class="px-4 py-4 border-t border-[#E8E3DB]">
                  <view class="v0-btn"
                    @click={{ handleCheckin }}
                    :disabled={{ isSubmitting || checkinContent.length < 50 }}
                    class={cn(
                      "w-full py-3.5 rounded-full font-medium transition-all flex items-center justify-center gap-2",
                      checkinContent.length >= 50 && !isSubmitting
                        ? "bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white shadow-lg"
                        : "bg-[#E8E3DB] text-[#999] cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? "提交中..." : "确认打卡"}
                  </view>
                </view>
              </view>
            </view>
          )}
    
          <!--   -->
          {showSuccess && (
            <view class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <view class="w-[85%] max-w-sm bg-white rounded-2xl p-6 text-center animate-in fade-in zoom-in-95">
                <view class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#52C41A] to-[#95DE64] flex items-center justify-center mb-4">
                  <CheckCircle class="w-10 h-10 text-white" />
                </view>
                <text class="text-[20px] font-bold text-[#2C2C2C] mb-2">打卡成功!</text>
                <text class="text-[#666] mb-4">
                  连续打卡 <text class="text-[#FF6B35] font-bold">{{ activity.myStreak }}</text> 天
                </text>
                <view class="flex items-center justify-center gap-3 mb-6">
                  <view class="px-3 py-1.5 bg-[#FFF8E7] rounded-full flex items-center gap-1">
                    <Sparkles class="w-4 h-4 text-[#C9A96E]" />
                    <text class="text-[13px] text-[#C9A96E]">+{{ activity.reward.xp }} 经验</text>
                  </view>
                </view>
                <view class="v0-btn"
                  @click={() => setShowSuccess(false)}
                  class="w-full py-3 bg-gradient-to-r from-[#C41E3A] to-[#E74C3C] text-white font-medium rounded-full"
                >
                  太棒了
                </view>
              </view>
            </view>
          )}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const checkinActivity = {
const todayContent = {
const leaderboard = [
const myCheckins = [
const checkinFeed = [
    const days = []
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