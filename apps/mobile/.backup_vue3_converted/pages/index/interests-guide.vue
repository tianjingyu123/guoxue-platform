<template>
  <view class="min-h-screen bg-background flex flex-col">
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">兴趣选择</text>
      <text class="text-xs text-primary" @click="goHome">跳过</text>
    </view>
    <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
      <text class="text-lg font-semibold text-foreground mb-1 block">选择你感兴趣的内容</text>
      <text class="text-xs text-muted-foreground mb-4 block">我们将为您推荐更合适的内容</text>
      <view class="flex flex-wrap gap-2 mb-6">
        <view v-for="t in tags" :key="t.id" class="px-4 py-2 rounded-full text-sm border transition-all" :class="selected.has(t.id) ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border'" @click="toggleTag(t.id)">{{ t.name }}</view>
      </view>
      <view class="py-3.5 bg-primary text-white rounded-xl text-center text-sm font-semibold" :class="selected.size===0?'opacity-50':''" @click="goHome">完成 ({{ selected.size }})</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const selected = ref(new Set<number>())
const tags = [
  { id: 1, name: '八字命理' }, { id: 2, name: '紫微斗数' }, { id: 3, name: '风水堪舆' },
  { id: 4, name: '梅花易数' }, { id: 5, name: '六爻占卜' }, { id: 6, name: '奇门遁甲' },
  { id: 7, name: '诗词歌赋' }, { id: 8, name: '国学经典' }, { id: 9, name: '中医养生' },
  { id: 10, name: '书法绘画' }, { id: 11, name: '茶道香道' }, { id: 12, name: '传统文化' },
]
function goBack() { uni.navigateBack() }
function goHome() { uni.switchTab({ url: '/pages/index/index' }) }
function toggleTag(id: number) {
  const n = new Set(selected.value)
  n.has(id) ? n.delete(id) : n.add(id)
  selected.value = n
}
</script>
