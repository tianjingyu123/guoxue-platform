<template>
  <view class="min-h-screen bg-background pb-8">
    <!-- Header -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border" style="backdrop-filter:blur(12px);padding-top:44px">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
          <text class="font-semibold text-lg text-foreground">圈子数据</text>
        </view>
        <view class="relative">
          <view class="flex items-center gap-1 px-3 py-1.5 bg-[#F0EDE8] rounded-lg text-sm text-foreground" @click="showDatePicker = !showDatePicker">
            <text>{{ dateRanges.find(r => r.id === dateRange)?.label }}</text>
            <text class="text-sm">↓</text>
          </view>
          <view v-if="showDatePicker">
            <view class="fixed inset-0 z-40" @click="showDatePicker = false" />
            <view class="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-50">
              <view v-for="range in dateRanges" :key="range.id"
                class="w-full px-3 py-2 text-sm"
                :class="dateRange === range.id ? 'bg-primary/10 text-primary' : 'text-foreground'"
                @click="dateRange = range.id; showDatePicker = false"
              >
                <text>{{ range.label }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="p-4 space-y-6">
      <!-- Core Metrics Grid -->
      <view class="grid grid-cols-2 gap-3">
        <view v-for="(metric, key) in coreMetrics" :key="key" class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center gap-2 mb-2">
            <view class="w-8 h-8 rounded-lg flex items-center justify-center" :class="getMetricBg(key)">
              <text class="text-sm">{{ getMetricIcon(key) }}</text>
            </view>
            <text class="text-xs text-muted-foreground">{{ metric.label }}</text>
          </view>
          <text class="text-2xl font-bold text-foreground block">{{ metric.value }}</text>
          <view class="flex items-center gap-1 text-xs mt-1" :class="metric.trend >= 0 ? 'text-green-500' : 'text-red-400'">
            <text>{{ metric.trend >= 0 ? '↑' : '↓' }}</text>
            <text>{{ Math.abs(metric.trend) }}%</text>
          </view>
        </view>
      </view>

      <!-- Member Growth Trend Bar Chart -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="font-semibold text-sm text-foreground block mb-4">成员增长趋势</text>
        <view class="flex items-end gap-2 h-32">
          <view v-for="(item, index) in memberGrowthData" :key="index" class="flex-1 flex flex-col items-center gap-1">
            <text class="text-[10px] text-muted-foreground">{{ item.value }}</text>
            <view class="w-full bg-primary/80 rounded-t transition-all" :style="{ height: (item.value / maxGrowth * 100) + '%' }" />
            <text class="text-[10px] text-muted-foreground">{{ item.day }}</text>
          </view>
        </view>
      </view>

      <!-- Content Stats -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="font-semibold text-sm text-foreground block mb-4">内容互动概览</text>
        <view class="grid grid-cols-3 gap-4">
          <view v-for="(stat, key) in contentStats" :key="key" class="text-center">
            <text class="text-xl font-bold text-foreground block">{{ stat.value }}</text>
            <text class="text-xs text-muted-foreground block mt-1">{{ stat.label }}</text>
          </view>
        </view>
      </view>

      <!-- Revenue Sources Donut -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="font-semibold text-sm text-foreground block mb-4">收入来源分布</text>
        <view class="flex items-center gap-6">
          <view class="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" class="w-full h-full" style="transform:rotate(-90deg)">
              <circle v-for="(item, index) in revenueSourceData" :key="index"
                cx="50" cy="50" r="45" fill="none"
                stroke-width="10"
                :stroke="donutColors[index]"
                :stroke-dasharray="item.percent * 2.83 + ' ' + (283 - item.percent * 2.83)"
                :stroke-dashoffset="-getPrevRevenuePercent(index) * 2.83"
              />
            </svg>
            <view class="absolute inset-0 flex flex-col items-center justify-center">
              <text class="text-[10px] text-muted-foreground block">总计</text>
              <text class="text-sm font-semibold text-foreground block">¥{{ (totalRevenue / 10000).toFixed(1) }}万</text>
            </view>
          </view>
          <view class="flex-1 space-y-2">
            <view v-for="(item, index) in revenueSourceData" :key="index" class="flex items-center justify-between text-xs">
              <view class="flex items-center gap-2">
                <view class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: donutColors[index] }" />
                <text class="text-muted-foreground">{{ item.name }}</text>
              </view>
              <text class="text-foreground font-medium">¥{{ item.value.toLocaleString() }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Hot Content Top5 -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-sm text-foreground">热门内容 Top5</text>
          <view class="text-xs text-primary" @click="goAllContents"><text>查看全部</text></view>
        </view>
        <view class="space-y-3">
          <view v-for="(item, index) in hotContents" :key="item.id" class="flex items-start gap-3">
            <view class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              :class="index < 3 ? 'bg-accent text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
            >
              <text>{{ index + 1 }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block line-clamp-1">{{ item.title }}</text>
              <view class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <text class="text-[10px] px-1 py-0 border border-border rounded">{{ item.type === 'article' ? '文章' : '帖子' }}</text>
                <text class="flex items-center gap-0.5"> {{ item.likes }}</text>
                <text class="flex items-center gap-0.5"> {{ item.comments }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Active Members -->
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-sm text-foreground">活跃成员榜</text>
          <view class="text-xs text-primary" @click="goAllMembers"><text>查看全部</text></view>
        </view>
        <view class="space-y-3">
          <view v-for="(member, index) in activeMembers" :key="member.id" class="flex items-center gap-3">
            <view class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              :class="index < 3 ? 'bg-accent text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
            >
              <text>{{ index === 0 ? '👑' : index + 1 }}</text>
            </view>
            <view class="w-8 h-8 rounded-full" style="background:linear-gradient(135deg,#C41E3A,#E74C3C);display:flex;align-items:center;justify-content:center">
              <text class="text-white text-xs font-bold">{{ member.name[0] }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground block">{{ member.name }}</text>
              <text class="text-xs text-muted-foreground block">发帖 {{ member.posts }} · 互动 {{ member.interactions }}</text>
            </view>
            <view class="text-right">
              <text class="text-sm font-medium text-accent block">{{ member.contribution }}</text>
              <text class="text-[10px] text-muted-foreground block">贡献值</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const dateRanges = [
  { id: 'today', label: '今日' },
  { id: '7days', label: '近7天' },
  { id: '30days', label: '近30天' },
  { id: 'custom', label: '自定义' },
]

const coreMetrics = {
  totalMembers: { value: '1,280', label: '总成员数', trend: 12.5 },
  newMembers: { value: '86', label: '新增成员', trend: 23.1 },
  activeMembers: { value: '428', label: '活跃成员', trend: -5.2 },
  monthlyRevenue: { value: '¥12,680', label: '本月收入', trend: 18.6 },
}

const memberGrowthData = [
  { day: '周一', value: 12 }, { day: '周二', value: 8 },
  { day: '周三', value: 15 }, { day: '周四', value: 10 },
  { day: '周五', value: 18 }, { day: '周六', value: 14 },
  { day: '周日', value: 9 },
]

const contentStats = {
  posts: { value: '156', label: '帖子发布' },
  comments: { value: '892', label: '评论数' },
  likes: { value: '2,340', label: '点赞数' },
}

const hotContents = [
  { id: 1, title: '八字入门：如何看懂自己的命盘', type: 'article', views: 1280, likes: 356, comments: 89 },
  { id: 2, title: '今日分享：食神制杀格局详解', type: 'post', views: 986, likes: 234, comments: 67 },
  { id: 3, title: '紫微斗数与八字的区别与联系', type: 'article', views: 876, likes: 198, comments: 54 },
  { id: 4, title: '风水小知识：办公桌摆放禁忌', type: 'post', views: 765, likes: 167, comments: 42 },
  { id: 5, title: '学员案例分析：日主身弱如何补救', type: 'article', views: 654, likes: 145, comments: 38 },
]

const activeMembers = [
  { id: 1, name: '易学小白', avatar: '', posts: 28, interactions: 156, contribution: 184 },
  { id: 2, name: '命理爱好者', avatar: '', posts: 22, interactions: 134, contribution: 156 },
  { id: 3, name: '风水研究员', avatar: '', posts: 18, interactions: 128, contribution: 146 },
  { id: 4, name: '紫微新手', avatar: '', posts: 15, interactions: 112, contribution: 127 },
  { id: 5, name: '八字学徒', avatar: '', posts: 12, interactions: 98, contribution: 110 },
]

const revenueSourceData = [
  { name: '入圈费', value: 4860, percent: 38, color: 'bg-primary' },
  { name: '课程销售', value: 3580, percent: 28, color: 'bg-accent' },
  { name: '商品分佣', value: 2120, percent: 17, color: 'bg-blue-500' },
  { name: '直播打赏', value: 1280, percent: 10, color: 'bg-purple-500' },
  { name: '付费问答', value: 840, percent: 7, color: 'bg-green-500' },
]

const donutColors = ['#C41E3A', '#C9A96E', '#3B82F6', '#A855F7', '#22C55E']

const dateRange = ref('7days')
const showDatePicker = ref(false)

const maxGrowth = computed(() => Math.max(...memberGrowthData.map(d => d.value)))
const totalRevenue = computed(() => revenueSourceData.reduce((sum, s) => sum + s.value, 0))

function getPrevRevenuePercent(index: number): number {
  return revenueSourceData.slice(0, index).reduce((sum, s) => sum + s.percent, 0)
}

function getMetricIcon(key: string): string {
  const icons: Record<string, string> = { totalMembers: '', newMembers: '', activeMembers: '📊', monthlyRevenue: '' }
  return icons[key] || '📊'
}

function getMetricBg(key: string): string {
  const bgs: Record<string, string> = { totalMembers: 'bg-primary/10', newMembers: 'bg-accent/10', activeMembers: 'bg-blue-500/10', monthlyRevenue: 'bg-green-500/10' }
  return bgs[key] || 'bg-[#F0EDE8]'
}

function goBack() { uni.navigateBack() }
function goAllContents() { uni.navigateTo({ url: '/pages/circle/id-detail/home/index' }) }
function goAllMembers() { uni.navigateTo({ url: '/pages/circle/id-detail/members/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
