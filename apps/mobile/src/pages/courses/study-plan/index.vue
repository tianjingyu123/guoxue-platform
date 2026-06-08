<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">课程</text>
      <text class="v0-route">V0: courses/study-plan</text>
    </view>
        <view class="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-4">
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-2">
              <view class="w-8 h-8 bg-[#C41E3A]/10 rounded-lg flex items-center justify-center">
                <Calendar class="w-4 h-4 text-[#C41E3A]" />
              </view>
              <text class="text-[15px] font-semibold text-[#2C2C2C]">打卡日历</text>
            </view>
            <text class="text-[12px] text-[#999999]">近30天打卡 <text class="text-[#C41E3A] font-medium">{{ totalDays }}</text> 天</text>
          </view>
          
          <!--   -->
          <view class="flex mb-2">
            <view class="w-6" />
            
    <view v-for="(label, i) in WEEK_LABELS" :key="i"> (
              <view key={i} class="flex-1 text-center text-[10px] text-[#999999]">{{ label }}</view>
            ))}
          </view>
          
          <!--   -->
          <view class="space-y-1">
            
    <view v-for="(week, wi) in weeks" :key="wi"> (
              <view key={wi} class="flex items-center">
                <view class="w-6 text-[10px] text-[#999999]">
                  {{ week[0].getMonth() + 1 }}月
                </view>
                
    <view v-for="(date, di) in week" :key="di"> {
                  const dateStr = date.toISOString().slice(0, 10)
                  const level = data[dateStr] || 0
                  const isToday = dateStr === todayStr
                  const isFuture = date > TODAY
                  
                  return (
                    <view key={di} class="flex-1 flex justify-center">
                      <view 
                        class={cn(
                          "w-6 h-6 rounded-md transition-colors",
                          isFuture ? "bg-transparent" : getIntensityColor(level),
                          isToday && "ring-2 ring-[#C41E3A] ring-offset-1"
                        )}
                        title={`${dateStr}: ${level > 0 ? "已打卡" : "未打卡"}`}
                      />
                    </view>
                  )
                })}
              </view>
            ))}
          </view>
          
          <!--   -->
          <view class="flex items-center justify-end gap-1 mt-3 text-[10px] text-[#999999]">
            <text>少</text>
            <view class="w-3 h-3 rounded bg-[#F2EFEA]" />
            <view class="w-3 h-3 rounded bg-[#FFE5E5]" />
            <view class="w-3 h-3 rounded bg-[#FF9999]" />
            <view class="w-3 h-3 rounded bg-[#C41E3A]" />
            <text>多</text>
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
const MOCK_GOAL: StudyGoal = { daysPerWeek: 5, minutesPerDay: 30 }
const MOCK_COURSES: PlannedCourse[] = [
const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"]
  const data: { [key: string]: number } = {}
  const weeks: Date[][] = []
    const week: Date[] = []
  const minuteOptions = [15, 20, 30, 45, 60, 90, 120]
      const arr = [...prev]

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