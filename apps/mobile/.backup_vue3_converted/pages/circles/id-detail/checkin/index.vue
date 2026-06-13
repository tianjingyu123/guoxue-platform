<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-12 bg-muted rounded-lg" />
      <view class="h-52 bg-muted rounded-2xl" />
      <view class="h-32 bg-muted rounded-xl" />
      <view class="h-36 bg-muted rounded-xl" />
      <view class="h-48 bg-muted rounded-xl" />
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border flex-shrink-0">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="text-base font-semibold text-foreground">圈子签到</text>
        <view @click="showRules = !showRules" class="p-1"><text class="text-lg text-muted-foreground">ℹ</text></view>
      </view>

      <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
        <!-- 签到卡片 -->
        <view class="bg-gradient-to-br from-primary to-[#E74C3C] rounded-2xl p-6 text-white mb-4 relative overflow-hidden">
          <!-- 装饰 -->
          <view class="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
          <view class="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />

          <view class="relative z-10">
            <view class="flex items-center justify-between mb-4">
              <text class="text-sm opacity-80">{{ today }}</text>
              <text class="text-xs text-white/60"> 连续签到 {{ streak }} 天</text>
            </view>

            <view class="text-center my-4">
              <text class="text-5xl block mb-3">{{ signed ? '' : '' }}</text>
              <text class="text-lg font-bold block">{{ signed ? '今日已签到' : '签到领积分' }}</text>
              <text class="text-sm opacity-70 block mt-1">{{ signed ? '明天再来哦' : '签到 +5 积分' }}</text>
            </view>

            <view class="flex justify-center mt-4">
              <view
                class="px-12 py-3 rounded-full text-base font-bold transition-all shadow-lg"
                :class="signed ? 'bg-white/20 text-white' : 'bg-white text-primary'"
                @click="doSign"
              >
                <text>{{ signed ? '已签到 ✓' : '立即签到 +5分' }}</text>
              </view>
            </view>

            <!-- 连续签到奖励预览 -->
            <view class="mt-5 pt-4 border-t border-white/20">
              <text class="text-xs text-white/60 block mb-2">连续签到奖励</text>
              <view class="flex gap-1.5">
                <view
                  v-for="(reward, idx) in streakRewards" :key="idx"
                  class="flex-1 text-center py-2 rounded-lg"
                  :class="streak >= reward.days ? 'bg-white/30' : 'bg-white/10'"
                >
                  <text class="text-lg block">{{ reward.icon }}</text>
                  <text class="text-[10px] block mt-0.5 opacity-80">{{ reward.days }}天</text>
                  <text class="text-[10px] block opacity-60">+{{ reward.points }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 签到日历（月视图） -->
        <view class="bg-white rounded-xl p-4 border border-border mb-4">
          <view class="flex items-center justify-between mb-4">
            <view @click="prevMonth" class="p-1"><text class="text-sm text-muted-foreground">‹</text></view>
            <text class="text-sm font-semibold text-foreground">{{ currentYear }}年{{ currentMonth }}月</text>
            <view @click="nextMonth" class="p-1"><text class="text-sm text-muted-foreground">›</text></view>
          </view>

          <!-- 星期头 -->
          <view class="grid grid-cols-7 mb-2">
            <view v-for="day in weekDays" :key="day" class="text-center text-[10px] text-muted-foreground py-1">{{ day }}</view>
          </view>

          <!-- 日历格子 -->
          <view class="grid grid-cols-7 gap-1">
            <view
              v-for="(cell, idx) in calendarDays"
              :key="idx"
              class="text-center py-2 rounded-lg text-xs"
              :class="[
                cell.empty ? 'invisible' : '',
                cell.today ? 'bg-primary text-white font-bold' : '',
                cell.signed && !cell.today ? 'bg-green-50 text-green-600' : '',
                !cell.empty && !cell.today && !cell.signed ? 'text-foreground' : ''
              ]"
            >
              <text v-if="!cell.empty" class="block">{{ cell.day }}</text>
              <text v-if="cell.signed && !cell.today" class="text-[8px] block mt-0.5">✓</text>
              <text v-if="cell.today && !signed" class="text-[8px] block mt-0.5">·</text>
            </view>
          </view>
        </view>

        <!-- 签到规则 -->
        <view v-if="showRules" class="bg-white rounded-xl p-4 border border-border mb-4">
          <view class="flex items-center justify-between mb-3">
            <text class="text-sm font-semibold text-foreground"> 签到规则</text>
            <text @click="showRules = false" class="text-xs text-muted-foreground">收起</text>
          </view>
          <view class="space-y-2 text-xs text-muted-foreground">
            <text class="block">1. 每日签到可获得 5 积分</text>
            <text class="block">2. 连续签到 7 天额外奖励 20 积分</text>
            <text class="block">3. 连续签到 15 天额外奖励 50 积分</text>
            <text class="block">4. 连续签到 30 天额外奖励 150 积分</text>
            <text class="block">5. 中断签到将从 1 天重新计算</text>
          </view>
        </view>

        <!-- 签到排行榜 -->
        <view class="bg-white rounded-xl p-4 border border-border mb-6">
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-1.5">
              <text class="text-base"></text>
              <text class="text-sm font-semibold text-foreground">签到排行榜</text>
            </view>
            <text class="text-xs text-muted-foreground">本月排行</text>
          </view>
          <view v-for="(r, i) in rankings" :key="r.name" class="flex items-center gap-3 py-2.5 border-b border-[#F0EBE5] last:border-b-0">
            <!-- 排名 -->
            <view class="w-6 text-center">
              <text v-if="i === 0" class="text-base"></text>
              <text v-else-if="i === 1" class="text-base"></text>
              <text v-else-if="i === 2" class="text-base"></text>
              <text v-else class="text-xs text-muted-foreground">{{ i + 1 }}</text>
            </view>
            <!-- 头像 -->
            <view
              class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              :style="{ backgroundColor: r.color }"
            >
              {{ r.name[0] }}
            </view>
            <text class="text-[13px] text-foreground flex-1 font-medium">{{ r.name }}</text>
            <view class="flex items-center gap-2 text-xs">
              <text class="text-primary font-semibold">{{ r.days }}天</text>
              <text class="text-[#ccc]">{{ r.streak }}连</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

const signed = ref(false)
const streak = ref(3)
const showRules = ref(false)

// 日期
const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const today = ref('2024年6月10日 星期一')

// 已签到日期（模拟）
const signedDays = ref<number[]>([1, 2, 3, 5, 6, 7, 8, 9])

// 连续签到奖励
const streakRewards = [
  { days: 7, icon: '', points: 20 },
  { days: 15, icon: '', points: 50 },
  { days: 30, icon: '', points: 150 },
  { days: 60, icon: '👑', points: 500 },
]

// 日历生成
const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayDate = now.getDate()

  const cells: Array<{ day: number; empty: boolean; today: boolean; signed: boolean }> = []

  // 空白填充
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: 0, empty: true, today: false, signed: false })
  }

  // 日期
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && d === todayDate
    const isSigned = signedDays.value.includes(d)
    cells.push({ day: d, empty: false, today: isToday, signed: isSigned })
  }

  return cells
})

// 排行榜
const rankings = [
  { name: '周易大师', days: 28, streak: 28, color: '#C41E3A' },
  { name: '国学达人', days: 26, streak: 15, color: '#C9A96E' },
  { name: '易学爱好者', days: 24, streak: 12, color: '#2C2C2C' },
  { name: '文化传承', days: 22, streak: 8, color: '#4A6741' },
  { name: '命理研究', days: 20, streak: 6, color: '#7B68EE' },
  { name: '玄学爱好者', days: 18, streak: 5, color: '#D2691E' },
  { name: '风水大师', days: 15, streak: 3, color: '#8B4513' },
  { name: '紫微传人', days: 12, streak: 12, color: '#1E90FF' },
]

function goBack() { uni.navigateBack() }

function doSign() {
  if (signed.value) {
    uni.showToast({ title: '今日已签到', icon: 'none' })
    return
  }
  signed.value = true
  streak.value++
  signedDays.value.push(now.getDate())

  // 检查连续签到奖励
  const reward = streakRewards.find(r => r.days === streak.value)
  if (reward) {
    uni.showToast({ title: `签到成功！连续 ${streak.value} 天，获得 ${reward.points} 积分`, icon: 'none' })
  } else {
    uni.showToast({ title: '签到成功 +5积分', icon: 'success' })
  }
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
