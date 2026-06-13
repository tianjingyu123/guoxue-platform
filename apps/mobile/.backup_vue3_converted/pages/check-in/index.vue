<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1 text-foreground">
          <text class="text-lg">←</text>
        </view>
        <text class="text-lg font-semibold text-foreground">每日签到</text>
        <view class="w-8" />
      </view>
    </view>

    <view class="pb-20">
      <!-- 签到卡片 -->
      <view class="mx-4 mt-4 p-6 bg-gradient-to-br from-primary to-red-700 text-white rounded-2xl">
        <view class="flex items-start justify-between mb-4">
          <view>
            <text class="text-sm opacity-80 block mb-1">连续签到</text>
            <text class="text-4xl font-bold block">{{ mockData.consecutiveDays }}</text>
            <text class="text-sm opacity-80 block mt-1">天</text>
          </view>
          <text class="text-5xl opacity-80"></text>
        </view>
        <view class="grid grid-cols-3 gap-3 text-sm mb-4">
          <view>
            <text class="opacity-80 block">本周签到</text>
            <text class="font-bold text-lg block">5/7</text>
          </view>
          <view>
            <text class="opacity-80 block">总签到数</text>
            <text class="font-bold text-lg block">{{ mockData.totalCheckIns }}</text>
          </view>
          <view>
            <text class="opacity-80 block">最长纪录</text>
            <text class="font-bold text-lg block">{{ mockData.longestStreak }}</text>
          </view>
        </view>
        <view v-if="!checkedIn"
          @click="handleCheckIn"
          class="w-full py-3 bg-white text-primary rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          <text class="text-lg"></text>
          <text>今日签到 + {{ mockData.todayReward }} 积分</text>
        </view>
        <view v-else class="flex items-center justify-center gap-2 p-3 bg-white/20 rounded-lg">
          <text class="text-lg">✓</text>
          <text class="text-sm font-medium">今日已签到</text>
        </view>
      </view>

      <!-- 签到日历 -->
      <view class="mx-4 mt-6">
        <text class="text-sm font-semibold text-foreground block mb-3">本月签到情况</text>
        <view class="grid grid-cols-7 gap-2">
          <view v-for="item in mockData.checkins" :key="item.day"
            @click="sysCheck(item.day)"
            :class="item.checked ? 'p-3 rounded-lg text-center text-sm font-medium transition-colors bg-primary text-white' : item.bonus ? 'p-3 rounded-lg text-center text-sm font-medium transition-colors bg-orange-100 text-orange-900 border border-orange-300' : 'p-3 rounded-lg text-center text-sm font-medium transition-colors bg-muted text-muted-foreground'"
          >
            <text class="block">{{ item.day }}</text>
            <text v-if="item.bonus" class="text-xs block mt-0.5"></text>
          </view>
        </view>
      </view>

      <!-- 签到奖励 -->
      <view class="mx-4 mt-6">
        <text class="text-sm font-semibold text-foreground block mb-3">签到奖励</text>
        <view class="space-y-2">
          <view v-for="(reward, idx) in mockData.rewards" :key="idx"
            :class="reward.days <= mockData.consecutiveDays ? 'p-4 bg-white border border-border rounded-xl flex items-center justify-between bg-primary/5' : 'p-4 bg-white border border-border rounded-xl flex items-center justify-between'"
          >
            <view class="flex items-center gap-3">
              <text class="text-2xl">{{ reward.icon }}</text>
              <view>
                <text class="font-semibold text-foreground block">{{ reward.reward }}</text>
                <text class="text-xs text-muted-foreground">连续签到 {{ reward.days }} 天</text>
              </view>
            </view>
            <view class="text-right">
              <text class="text-sm font-bold text-primary block">+{{ reward.points }}</text>
              <text class="text-xs text-muted-foreground">积分</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 说明 -->
      <view class="mx-4 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <text class="text-sm font-semibold text-blue-900 block mb-2">签到说明</text>
        <view class="text-xs text-blue-800 space-y-1">
          <text class="block">• 每天可签到一次，获得积分奖励</text>
          <text class="block">• 连续签到可获得额外奖励</text>
          <text class="block">• 第6天和14天会获得双倍积分</text>
          <text class="block">• 积分可用于兑换商城商品</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const mockData = {
  checkedToday: true,
  consecutiveDays: 18,
  totalCheckIns: 85,
  currentStreak: 18,
  longestStreak: 42,
  todayReward: 50,
  checkins: [
    { day: 1, reward: 10 },
    { day: 2, reward: 10 },
    { day: 3, reward: 10 },
    { day: 4, reward: 10 },
    { day: 5, reward: 10 },
    { day: 6, reward: 15, bonus: true },
    { day: 7, reward: 10 },
    { day: 8, reward: 10 },
    { day: 9, reward: 10 },
    { day: 10, reward: 10 },
    { day: 11, reward: 10 },
    { day: 12, reward: 10 },
    { day: 13, reward: 10 },
    { day: 14, reward: 20, bonus: true },
    { day: 15, reward: 10 },
    { day: 16, reward: 10 },
    { day: 17, reward: 10 },
    { day: 18, reward: 10, checked: true },
  ],
  rewards: [
    { days: 7, reward: '7日奖励', points: 50, icon: '🎁' },
    { days: 14, reward: '14日奖励', points: 150, icon: '' },
    { days: 30, reward: '30日大奖', points: 500, icon: '👑' },
  ],
}

const checkedIn = ref(mockData.checkedToday)

function handleCheckIn() {
  checkedIn.value = true
}

function sysCheck(day: number) {
  // Calendar day tap - no action needed for display
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
