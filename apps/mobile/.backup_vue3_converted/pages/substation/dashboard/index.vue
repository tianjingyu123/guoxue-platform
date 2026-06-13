<template>
  <view class="min-h-screen bg-background">
    <header class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack">
        <text class="text-lg text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">分站数据</text>
      <text class="ml-auto text-sm text-muted-foreground">📊</text>
    </header>

    <!-- 日期范围 -->
    <view class="flex gap-2 px-4 pt-4">
      <view v-for="r in ranges" :key="r.key"
        @click="range = r.key"
        :class="range === r.key ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-primary text-white' : 'px-4 py-1.5 rounded-full text-sm font-medium bg-muted text-foreground'"
      >
        <text>{{ r.label }}</text>
      </view>
    </view>

    <!-- 统计面板 -->
    <view class="grid grid-cols-2 gap-3 px-4 mt-4">
      <view v-for="s in stats" :key="s.label" class="p-4 bg-white border border-border rounded-xl">
        <view class="flex items-start justify-between mb-2">
          <text class="text-xs text-muted-foreground">{{ s.label }}</text>
          <text class="text-sm text-primary">{{ s.icon }}</text>
        </view>
        <text class="text-xl font-black text-foreground block">{{ s.value }}</text>
        <view v-if="s.trend !== 0" class="flex items-center gap-1 mt-1">
          <text :class="s.trend > 0 ? 'text-xs text-success' : 'text-xs text-danger'">{{ s.trend > 0 ? '📈' : '📉' }}</text>
          <text :class="s.trend > 0 ? 'text-[10px] font-medium text-success' : 'text-[10px] font-medium text-danger'">{{ Math.abs(s.trend) }}%</text>
          <text class="text-[10px] text-muted-foreground">vs 上期</text>
        </view>
      </view>
    </view>

    <!-- 收益趋势图 -->
    <view v-if="chartValues.length > 0" class="mx-4 mt-4 p-4 bg-white border border-border rounded-xl">
      <view class="flex items-center justify-between mb-3">
        <text class="text-sm font-semibold text-foreground">收益趋势</text>
        <text class="text-xs text-muted-foreground">单位：元</text>
      </view>
      <!-- SVG 折线图（与 React 版 MiniChart 一致） -->
      <view class="w-full h-16">
        <svg viewBox="0 0 100 100" style="width:100%;height:100%;" preserveAspectRatio="none">
          <polyline :points="chartPoints" fill="none" stroke="#C41E3A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </view>
      <view class="flex justify-between mt-1">
        <text class="text-[10px] text-muted-foreground">{{ range === '7d' ? '7天前' : '30天前' }}</text>
        <text class="text-[10px] text-muted-foreground">今天</text>
      </view>
    </view>

    <!-- 热销课程排行 -->
    <view class="mx-4 mt-4 p-4 bg-white border border-border rounded-xl mb-8">
      <text class="text-sm font-semibold text-foreground block mb-3">热销课程排行</text>
      <view class="space-y-3">
        <view v-for="(course, i) in topCourses" :key="course.id" class="flex items-center gap-3">
          <view :class="i === 0 ? 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-accent text-foreground' : i === 1 ? 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[#999]/30 text-foreground' : i === 2 ? 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-accent/40 text-foreground' : 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-muted text-muted-foreground'">
            <text>{{ i + 1 }}</text>
          </view>
          <text class="text-sm text-foreground flex-1 truncate">{{ course.title }}</text>
          <view class="text-right flex-shrink-0">
            <text class="text-xs font-semibold text-foreground block">{{ course.revenue }}</text>
            <text class="text-[10px] text-muted-foreground">{{ course.orders }} 单</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

type Range = '7d' | '30d' | '90d'

const ranges = [
  { key: '7d' as Range, label: '近7天' },
  { key: '30d' as Range, label: '近30天' },
  { key: '90d' as Range, label: '近90天' },
]

const range = ref<Range>('30d')

const data: Record<Range, { revenue: number; orders: number; users: number; courses: number }> = {
  '7d':  { revenue: 18640, orders: 124, users: 386,  courses: 42 },
  '30d': { revenue: 86200, orders: 580, users: 1840, courses: 42 },
  '90d': { revenue: 248000, orders: 1680, users: 5200, courses: 42 },
}

const trend: Record<Range, Record<string, number>> = {
  '7d':  { revenue: 12.4, orders: 8.6,  users: 15.2,  courses: 0 },
  '30d': { revenue: 18.7, orders: 14.3, users: 22.8,  courses: 5.3 },
  '90d': { revenue: 24.1, orders: 19.2, users: 31.5,  courses: 12.0 },
}

const dailyRevenue: Record<Range, number[]> = {
  '7d':  [1800, 2400, 1600, 3200, 2800, 3600, 3240],
  '30d': [2200, 2800, 1900, 3400, 3000, 3800, 2600, 4200, 3100, 2700,
          3500, 2900, 3300, 2500, 4100, 3600, 2800, 3900, 3200, 2600,
          3700, 3100, 2900, 4000, 3500, 2700, 3800, 3300, 2500, 4200],
  '90d': [1600, 2100, 1800, 2400, 2200, 2800, 2600, 3000, 2800, 3200,
          2400, 2900, 3100, 2700, 3400, 3200, 3600, 3400, 3800, 3500,
          4000, 3700, 4200, 3900, 4400, 4100, 4500, 4300, 4700, 4400,
          4900, 4600, 5000, 4800, 5200, 4900, 5400, 5100, 5500, 5300,
          5700, 5400, 5900, 5600, 6000, 5800, 6200, 5900, 6400, 6100,
          6500, 6300, 6700, 6400, 6800, 6600, 7000, 6700, 7100, 6900,
          7200, 7000, 7400, 7100, 7500, 7300, 7700, 7400, 7800, 7600,
          8000, 7700, 8100, 7900, 8200, 8000, 8300, 8100, 8400, 8200,
          8500, 8300, 8600, 8400, 8700, 8500, 8800, 8600, 8900, 8700],
}

const topCourses = [
  { id: '1', title: '八字命理入门到精通', orders: 286, revenue: '¥28,600' },
  { id: '2', title: '紫微斗数速成班',     orders: 194, revenue: '¥19,400' },
  { id: '3', title: '风水堪舆实战课程',   orders: 142, revenue: '¥21,300' },
  { id: '4', title: '奇门遁甲基础篇',     orders: 98,  revenue: '¥9,800' },
]

const d = computed(() => data[range.value])
const t = computed(() => trend[range.value])

const stats = computed(() => [
  { label: '总收益', value: `¥${d.value.revenue.toLocaleString()}`, trend: t.value.revenue, icon: '' },
  { label: '订单数', value: d.value.orders,   trend: t.value.orders,  icon: '' },
  { label: '新增用户', value: d.value.users,  trend: t.value.users,   icon: '' },
  { label: '课程数', value: d.value.courses,  trend: t.value.courses, icon: '' },
])

const chartValues = computed(() => dailyRevenue[range.value])
const chartPoints = computed(() => {
  const values = chartValues.value
  if (!values.length) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100
    const y = 100 - ((v - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')
})

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
