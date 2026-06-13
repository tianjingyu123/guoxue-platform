<template>
  <view class="min-h-screen bg-background flex flex-col">
    <view class="flex items-center justify-between px-4 h-12 bg-white border-b border-border shrink-0">
      <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
      <text class="text-base font-semibold text-foreground">管理中心</text>
      <view class="w-7" />
    </view>
    <scroll-view scroll-y class="flex-1 p-4 overflow-y-auto">
      <view v-for="m in menus" :key="m.label" class="bg-white rounded-xl p-3.5 mb-3 shadow-sm" @click="goPage(m.path)">
        <view class="flex items-center gap-2.5 text-sm text-foreground">
          <text class="text-2xl">{{ m.icon }}</text>
          <view class="flex-1">
            <text class="text-sm font-medium text-foreground block">{{ m.label }}</text>
            <text class="text-xs text-muted-foreground">{{ m.desc }}</text>
          </view>
          <text class="text-lg text-[#ccc]">›</text>
        </view>
      </view>
      <view class="h-5" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
const menus = [
  { label: '用户管理', icon: '', desc: '管理平台用户', path: 'users' },
  { label: '内容审核', icon: '', desc: '审核帖子和评论', path: 'audit' },
  { label: '数据分析', icon: '📊', desc: '查看平台数据', path: 'analytics' },
  { label: '系统设置', icon: '⚙️', desc: '平台配置管理', path: 'settings' },
]
function goBack() { uni.navigateBack() }
function goPage(p: string) { uni.navigateTo({ url: `/pages/manage/${p}/index` }) }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
