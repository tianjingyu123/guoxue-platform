<template>
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="bg-gradient-to-r from-primary to-[#E85A70] px-4 py-3 flex items-center gap-3">
      <view class="w-8 h-8 bg-white/20 rounded-full" />
      <view class="w-24 h-5 bg-white/20 rounded" />
    </view>
    <view class="p-4 space-y-4">
      <view class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="bg-white rounded-2xl p-4 h-24 animate-pulse" />
      </view>
      <view class="bg-white rounded-2xl p-4 h-48" />
      <view class="flex flex-col gap-3">
        <view v-for="i in 3" :key="i" class="bg-white rounded-2xl p-4 h-24" />
      </view>
    </view>
  </view>

  <view v-else class="min-h-screen bg-background pb-20">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#E85A70] text-white">
      <view class="px-4 py-3 flex items-center justify-between">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1 rounded-full">
            <text class="text-white text-xl">←</text>
          </view>
          <text class="text-lg font-medium">数据中心</text>
        </view>
        <view @click="handleRefresh" :class="['p-2 rounded-full', refreshing ? 'animate-spin pointer-events-none' : '']">
          <text class="text-white"></text>
        </view>
      </view>
    </view>

    <!-- 概览卡片 -->
    <view class="p-4">
      <view class="grid grid-cols-2 gap-3">
        <view class="bg-white rounded-2xl p-4 shadow-sm">
          <view class="flex items-center gap-2 text-ink-soft text-sm mb-2">
            <text></text>
            <text>总观看</text>
          </view>
          <text class="text-2xl font-bold text-foreground block">{{ formatNumber(stats.totalViews) }}</text>
          <view class="flex items-center gap-1 mt-1">
            <text :class="stats.viewsGrowthRate >= 0 ? 'text-green-500' : 'text-red-500'">{{ stats.viewsGrowthRate >= 0 ? '📈' : '📉' }}</text>
            <text :class="['text-xs', stats.viewsGrowthRate >= 0 ? 'text-green-500' : 'text-red-500']">{{ Math.abs(stats.viewsGrowthRate) }}%</text>
            <text class="text-xs text-muted-foreground">较上月</text>
          </view>
        </view>

        <view class="bg-white rounded-2xl p-4 shadow-sm">
          <view class="flex items-center gap-2 text-ink-soft text-sm mb-2">
            <text></text>
            <text>总收益</text>
          </view>
          <text class="text-2xl font-bold text-accent block">¥{{ formatNumber(stats.totalRevenue) }}</text>
          <view class="flex items-center gap-1 mt-1">
            <text :class="stats.revenueGrowthRate >= 0 ? 'text-green-500' : 'text-red-500'">{{ stats.revenueGrowthRate >= 0 ? '📈' : '📉' }}</text>
            <text :class="['text-xs', stats.revenueGrowthRate >= 0 ? 'text-green-500' : 'text-red-500']">{{ Math.abs(stats.revenueGrowthRate) }}%</text>
            <text class="text-xs text-muted-foreground">较上月</text>
          </view>
        </view>

        <view class="bg-white rounded-2xl p-4 shadow-sm">
          <view class="flex items-center gap-2 text-ink-soft text-sm mb-2">
            <text>🕐</text>
            <text>场均时长</text>
          </view>
          <text class="text-2xl font-bold text-foreground block">{{ stats.avgDuration }}<text class="text-sm font-normal ml-1">分钟</text></text>
          <text class="text-xs text-muted-foreground block mt-1">共{{ stats.totalRooms }}场直播</text>
        </view>

        <view class="bg-white rounded-2xl p-4 shadow-sm">
          <view class="flex items-center gap-2 text-ink-soft text-sm mb-2">
            <text></text>
            <text>粉丝增长</text>
          </view>
          <text class="text-2xl font-bold text-primary block">+{{ formatNumber(stats.fansGrowth) }}</text>
          <text class="text-xs text-muted-foreground block mt-1">本月新增</text>
        </view>
      </view>
    </view>

    <!-- 趋势图 -->
    <view class="px-4 mb-4">
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-4">
          <text class="font-medium text-foreground">近30天趋势</text>
          <view class="flex bg-background rounded-lg p-1">
            <view
              @click="trendType = 'views'"
              :class="['px-3 py-1 text-sm rounded-md', trendType === 'views' ? 'bg-white text-primary shadow-sm' : 'text-ink-soft']"
            >
              <text>观看</text>
            </view>
            <view
              @click="trendType = 'revenue'"
              :class="['px-3 py-1 text-sm rounded-md', trendType === 'revenue' ? 'bg-white text-primary shadow-sm' : 'text-ink-soft']"
            >
              <text>收益</text>
            </view>
          </view>
        </view>

        <!-- 简易柱状图 -->
        <view class="h-32 flex items-end gap-0.5">
          <view
            v-for="(t, i) in trend"
            :key="i"
            class="flex-1 bg-gradient-to-t from-primary/20 to-primary/60 rounded-t"
            :style="{ height: trendBarHeight(t) + '%' }"
          />
        </view>
        <view class="flex justify-between mt-2 text-xs text-muted-foreground">
          <text>{{ trend[0]?.date?.slice(5) }}</text>
          <text>{{ trend[14]?.date?.slice(5) }}</text>
          <text>{{ trend[29]?.date?.slice(5) }}</text>
        </view>
      </view>
    </view>

    <!-- 直播场次列表 -->
    <view class="px-4">
      <view class="flex items-center justify-between mb-3">
        <text class="font-medium text-foreground">直播记录</text>
        <text class="text-sm text-muted-foreground">共{{ rooms.length }}场</text>
      </view>

      <view v-if="rooms.length === 0" class="text-center py-12">
        <text class="text-[#E8E0D5] text-4xl block mb-3">▶</text>
        <text class="text-muted-foreground block">暂无直播记录</text>
        <view @click="goTo('/pages/live/create/index')" class="mt-4 px-6 py-2 bg-primary text-white rounded-full text-sm inline-block">
          <text>创建直播</text>
        </view>
      </view>

      <view v-else class="flex flex-col gap-3">
        <view
          v-for="room in rooms"
          :key="room.id"
          @click="goTo('/pages/live/id-detail/index?id=' + room.id)"
          class="bg-white rounded-2xl p-4 shadow-sm"
        >
          <view class="flex gap-3">
            <view class="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <view class="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/50" />
              <view v-if="room.status === 'preview'" class="absolute top-1 left-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                <text>预告</text>
              </view>
              <view v-else class="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                <text>{{ formatDuration(room.duration) }}</text>
              </view>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-foreground text-sm line-clamp-1 block">{{ room.title }}</text>
              <text class="text-xs text-muted-foreground block mt-1">{{ formatDate(room.startTime) }}</text>
              <view v-if="room.status === 'ended'" class="flex items-center gap-3 mt-2 text-xs text-ink-soft">
                <text> {{ formatNumber(room.views) }}</text>
                <text>🎁 {{ room.gifts }}</text>
                <text class="text-accent font-medium">¥{{ room.revenue }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface HostLiveStats {
  totalViews: number; totalRevenue: number; avgDuration: number; fansGrowth: number
  totalRooms: number; totalGifts: number; viewsGrowthRate: number; revenueGrowthRate: number
}
interface HostLiveRoom {
  id: string; title: string; cover: string; status: string; startTime: string; endTime?: string
  duration: number; views: number; peakViewers: number; likes: number; gifts: number; revenue: number
}
interface HostLiveTrend { date: string; views: number; revenue: number; duration: number }

const mockStats: HostLiveStats = {
  totalViews: 125680, totalRevenue: 8960, avgDuration: 125, fansGrowth: 1280,
  totalRooms: 48, totalGifts: 3250, viewsGrowthRate: 15.2, revenueGrowthRate: 8.5,
}
const mockRooms: HostLiveRoom[] = [
  { id: '1', title: '八字命理入门精讲（第12期）', cover: '', status: 'ended', startTime: '2024-01-15T19:00:00', endTime: '2024-01-15T21:30:00', duration: 150, views: 3280, peakViewers: 856, likes: 12500, gifts: 280, revenue: 560 },
  { id: '2', title: '紫微斗数实战案例分析', cover: '', status: 'ended', startTime: '2024-01-12T20:00:00', endTime: '2024-01-12T22:00:00', duration: 120, views: 2560, peakViewers: 680, likes: 8900, gifts: 180, revenue: 380 },
  { id: '3', title: '六爻占卜基础教学', cover: '', status: 'ended', startTime: '2024-01-10T19:30:00', endTime: '2024-01-10T21:00:00', duration: 90, views: 1980, peakViewers: 520, likes: 6500, gifts: 120, revenue: 240 },
  { id: '4', title: '梅花易数快速入门', cover: '', status: 'preview', startTime: '2024-01-20T19:00:00', duration: 0, views: 0, peakViewers: 0, likes: 0, gifts: 0, revenue: 0 },
]
const mockTrend: HostLiveTrend[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  views: Math.floor(Math.random() * 3000) + 1000,
  revenue: Math.floor(Math.random() * 500) + 100,
  duration: Math.floor(Math.random() * 120) + 60,
}))

const loading = ref(true)
const refreshing = ref(false)
const stats = ref<HostLiveStats>(mockStats)
const rooms = ref<HostLiveRoom[]>(mockRooms)
const trend = ref<HostLiveTrend[]>(mockTrend)
const trendType = ref<'views' | 'revenue'>('views')

const maxTrendValue = computed(() => Math.max(...trend.value.map(t => trendType.value === 'views' ? t.views : t.revenue), 1))

onMounted(() => { setTimeout(() => { loading.value = false }, 800) })

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
function trendBarHeight(t: HostLiveTrend): number {
  const value = trendType.value === 'views' ? t.views : t.revenue
  return Math.max((value / maxTrendValue.value) * 100, 4)
}
async function handleRefresh() {
  refreshing.value = true
  // 重新加载数据
  await new Promise(r => setTimeout(r, 600))
  stats.value = { ...mockStats, totalViews: mockStats.totalViews + Math.floor(Math.random() * 100), fansGrowth: mockStats.fansGrowth + Math.floor(Math.random() * 50) }
  rooms.value = [...mockRooms]
  trend.value = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    views: Math.floor(Math.random() * 3000) + 1000,
    revenue: Math.floor(Math.random() * 500) + 100,
    duration: Math.floor(Math.random() * 120) + 60,
  }))
  refreshing.value = false
}
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
