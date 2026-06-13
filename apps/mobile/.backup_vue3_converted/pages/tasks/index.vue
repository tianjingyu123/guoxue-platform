<template>
  <view class="min-h-screen bg-background flex flex-col">
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">积分任务</text>
      <view class="w-7" />
    </view>
    <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
      <view class="bg-white rounded-xl p-3.5 mb-3 shadow-sm">
        <text class="text-sm font-semibold text-foreground block mb-2.5">每日任务</text>
        <view v-for="t in daily" :key="t.title" class="flex items-center justify-between py-2 border-b border-[#FAF8F5] last:border-b-0">
          <view class="flex-1">
            <text class="text-[13px] text-foreground block">{{ t.title }}</text>
            <text class="text-[11px] text-muted-foreground">{{ t.desc }}</text>
          </view>
          <view class="px-3 py-1.5 rounded-2xl text-xs" :class="t.done ? 'bg-[#E8F5E9] text-[#4CAF50]' : 'bg-primary text-white'" @click="doTask(t)">
            {{ t.done ? '已完成' : `+${t.points}` }}
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const daily = ref([
  { title: '每日签到', desc: '已签到', points: 5, done: true },
  { title: '浏览3篇文章', desc: '学习国学', points: 10, done: false },
  { title: '回答1个问题', desc: '帮助他人', points: 20, done: false },
])
function goBack() { uni.navigateBack() }
function doTask(t: any) {
  if (!t.done) {
    t.done = true
    uni.showToast({ title: `+${t.points}积分`, icon: 'success' })
  }
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
