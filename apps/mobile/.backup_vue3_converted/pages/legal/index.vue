<template>
  <view class="min-h-screen bg-background flex flex-col">
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">法律政策</text>
      <view class="w-7" />
    </view>
    <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
      <view class="bg-white rounded-xl overflow-hidden shadow-sm">
        <view @click="goPage(l.path)" v-for="l in list" :key="l.label" class="flex items-center justify-between px-3.5 py-3 border-b border-[#FAF8F5] last:border-b-0 text-sm text-foreground">
          <text>{{ l.label }}</text>
          <text class="text-base text-[#ccc]">›</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
const list = [
  { label: '隐私政策', path: '/pages/policy/privacy-policy/index' },
  { label: '用户协议', path: '/pages/policy/user-agreement/index' },
  { label: '儿童隐私保护', path: '/pages/policy/children-privacy/index' },
  { label: '青少年模式', path: '/pages/policy/teen-mode/index' },
  { label: '数据收集清单', path: '/pages/legal/data-collection-list/index' },
]
function goBack() { uni.navigateBack() }
function goPage(p: string) { uni.navigateTo({ url: p }) }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
