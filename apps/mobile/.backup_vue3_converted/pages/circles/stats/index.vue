<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack" class="p-1">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">圈子统计</text>
    </view>

    <view class="px-4 pb-20">
      <!-- KPI Cards -->
      <view class="grid grid-cols-2 gap-3 mt-4">
        <view
          v-for="kpi in kpis"
          :key="kpi.label"
          class="p-4 bg-white border border-border rounded-xl"
        >
          <view class="flex items-start justify-between mb-2">
            <view :class="['w-9 h-9 rounded-lg flex items-center justify-center', kpi.bg]">
              <text :class="['text-base', kpi.color]">{{ kpi.icon }}</text>
            </view>
            <view :class="['text-xs font-medium flex items-center gap-0.5', kpi.up ? 'text-green-600' : 'text-red-500']">
              <text>{{ kpi.up ? '📈' : '📉' }}</text>
              <text>{{ Math.abs(kpi.trend) }}%</text>
            </view>
          </view>
          <text class="text-xl font-bold text-foreground block">{{ kpi.value }}</text>
          <text class="text-xs text-muted-foreground mt-0.5 block">{{ kpi.label }}</text>
        </view>
      </view>

      <!-- Member growth chart (simplified bar visualization) -->
      <view class="mt-6">
        <text class="text-sm font-semibold text-foreground mb-3 block">成员增长（本周）</text>
        <view class="p-4 bg-white border border-border rounded-xl">
          <view v-for="(d, i) in weeklyData" :key="i" class="flex items-center gap-2 mb-2">
            <text class="text-xs text-muted-foreground w-8 text-right">{{ d.day }}</text>
            <view class="flex-1 h-5 bg-muted rounded-full overflow-hidden">
              <view
                class="h-full bg-primary rounded-full"
                :style="{ width: (d.members / maxMembers) * 100 + '%' }"
              />
            </view>
            <text class="text-xs text-foreground w-14 text-right">{{ d.members.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- Posts & Views chart -->
      <view class="mt-6">
        <text class="text-sm font-semibold text-foreground mb-3 block">帖子 & 浏览（本周）</text>
        <view class="p-4 bg-white border border-border rounded-xl">
          <view class="flex items-center gap-3 mb-3">
            <view class="flex items-center gap-1">
              <view class="w-2 h-2 rounded-sm bg-primary" />
              <text class="text-xs text-muted-foreground">帖子</text>
            </view>
            <view class="flex items-center gap-1">
              <view class="w-2 h-2 rounded-sm" style="background: #C9A96E;" />
              <text class="text-xs text-muted-foreground">浏览</text>
            </view>
          </view>
          <view v-for="(d, i) in weeklyData" :key="i" class="mb-2">
            <text class="text-xs text-muted-foreground mb-1 block">{{ d.day }}</text>
            <view class="flex items-center gap-2 mb-0.5">
              <view class="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <view
                  class="h-full bg-primary rounded-full"
                  :style="{ width: (d.posts / maxPosts) * 100 + '%' }"
                />
              </view>
              <text class="text-xs text-foreground w-12 text-right">{{ d.posts }}</text>
            </view>
            <view class="flex items-center gap-2">
              <view class="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <view
                  class="h-full rounded-full"
                  :style="{ width: (d.views / maxViews) * 100 + '%', background: '#C9A96E' }"
                />
              </view>
              <text class="text-xs text-foreground w-12 text-right">{{ d.views.toLocaleString() }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const weeklyData = [
  { day: '周一', members: 12420, posts: 285, views: 18500 },
  { day: '周二', members: 12580, posts: 312, views: 21200 },
  { day: '周三', members: 12630, posts: 298, views: 19800 },
  { day: '周四', members: 12800, posts: 356, views: 24600 },
  { day: '周五', members: 12950, posts: 401, views: 28300 },
  { day: '周六', members: 13120, posts: 520, views: 35000 },
  { day: '周日', members: 13280, posts: 486, views: 32100 },
]

const kpis = [
  { label: '总成员',   value: '13,280', trend: 12,  icon: '', color: 'text-blue-600',   bg: 'bg-blue-50', up: true },
  { label: '总帖子',   value: '45,620', trend: 8,   icon: '', color: 'text-green-600',  bg: 'bg-green-50', up: true },
  { label: '本周回复', value: '8,956',  trend: -3,  icon: '', color: 'text-orange-600', bg: 'bg-orange-50', up: false },
  { label: '本周浏览', value: '179,500',trend: 22,  icon: '️', color: 'text-purple-600', bg: 'bg-purple-50', up: true },
]

const maxMembers = computed(() => Math.max(...weeklyData.map(d => d.members)))
const maxPosts = computed(() => Math.max(...weeklyData.map(d => d.posts)))
const maxViews = computed(() => Math.max(...weeklyData.map(d => d.views)))

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
