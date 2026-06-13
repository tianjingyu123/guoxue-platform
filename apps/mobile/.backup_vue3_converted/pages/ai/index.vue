<template>
  <view class="min-h-screen bg-background flex flex-col">
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">AI神器</text>
      <view class="w-7" />
    </view>
    <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
      <view v-for="t in tools" :key="t.path" class="flex items-center gap-3 bg-white rounded-xl p-3.5 mb-2.5 shadow-sm" @click="goPage(t.path)">
        <text class="text-3xl">{{ t.icon }}</text>
        <view class="flex-1">
          <text class="text-sm font-medium text-foreground block">{{ t.name }}</text>
          <text class="text-xs text-muted-foreground">{{ t.desc }}</text>
        </view>
        <text class="text-lg text-[#ccc]">›</text>
      </view>
      <view class="h-5" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
const tools = [
  { name: '封面生成', icon: '', desc: 'AI生成书籍封面', path: 'cover-generate' },
  { name: '文章润色', icon: '✍️', desc: 'AI帮你润色国学文章', path: 'polish' },
  { name: 'AI问答', icon: '🤖', desc: '智能国学知识问答', path: 'qa' },
]
function goBack() { uni.navigateBack() }
function goPage(p: string) { uni.navigateTo({ url: `/pages/ai/${p}/index` }) }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
