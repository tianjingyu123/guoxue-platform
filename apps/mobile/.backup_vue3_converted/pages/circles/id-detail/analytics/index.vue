<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40" style="background:rgba(250,248,245,0.95);border-bottom:1px solid #E8E0D5">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
          <text class="font-semibold text-lg text-foreground">圈子数据</text>
        </view>
        <!-- 日期选择 -->
        <view class="relative">
          <view class="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-lg text-sm text-foreground" @click="showDatePicker = !showDatePicker">
            <text>{{ currentDateLabel }}</text>
            <text class="text-xs">▼</text>
          </view>
          <view v-if="showDatePicker">
            <view class="fixed inset-0 z-40" @click="showDatePicker = false" />
            <view class="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-50">
              <view
                v-for="range in dateRanges"
                :key="range.id"
                @click="dateRange = range.id; showDatePicker = false"
                class="w-full px-3 py-2 text-sm text-left"
                :style="{ color: dateRange === range.id ? '#C41E3A' : '#2C2C2C', background: dateRange === range.id ? 'rgba(196,30,58,0.1)' : 'transparent' }"
              >
                <text>{{ range.label }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="flex-1 overflow-y-auto">
      <view class="p-4 pb-8 space-y-6">
        <!-- 核心数据网格 2x2 -->
        <view class="grid grid-cols-2 gap-3">
          <!-- 总成员数 -->
          <view class="bg-white rounded-xl p-4 shadow-sm">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(196,30,58,0.1)">
                <text class="text-sm"></text>
              </view>
              <text class="text-xs" style="color:#999">总成员数</text>
            </view>
            <text class="text-2xl font-bold text-foreground block">{{ coreMetrics.totalMembers.value.toLocaleString() }}</text>
            <view class="flex items-center gap-1 text-xs mt-1" :class="coreMetrics.totalMembers.trend === 'up' ? 'text-green-500' : 'text-red-500'">
              <text>{{ coreMetrics.totalMembers.trend === 'up' ? '↑' : '↓' }}</text>
              <text>{{ coreMetrics.totalMembers.change }}%</text>
            </view>
          </view>

          <!-- 新增成员 -->
          <view class="bg-white rounded-xl p-4 shadow-sm">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(201,169,110,0.1)">
                <text class="text-sm">➕</text>
              </view>
              <text class="text-xs" style="color:#999">新增成员</text>
            </view>
            <text class="text-2xl font-bold text-foreground block">{{ coreMetrics.newMembers.value }}</text>
            <view class="flex items-center gap-1 text-xs mt-1" :class="coreMetrics.newMembers.trend === 'up' ? 'text-green-500' : 'text-red-500'">
              <text>{{ coreMetrics.newMembers.trend === 'up' ? '↑' : '↓' }}</text>
              <text>{{ coreMetrics.newMembers.change }}%</text>
            </view>
          </view>

          <!-- 活跃成员 -->
          <view class="bg-white rounded-xl p-4 shadow-sm">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(59,130,246,0.1)">
                <text class="text-sm">📊</text>
              </view>
              <text class="text-xs" style="color:#999">活跃成员</text>
            </view>
            <text class="text-2xl font-bold text-foreground block">{{ coreMetrics.activeMembers.value }}</text>
            <view class="flex items-center gap-1 text-xs mt-1" :class="coreMetrics.activeMembers.trend === 'up' ? 'text-green-500' : 'text-red-500'">
              <text>{{ coreMetrics.activeMembers.trend === 'up' ? '↑' : '↓' }}</text>
              <text>{{ Math.abs(coreMetrics.activeMembers.change) }}%</text>
            </view>
          </view>

          <!-- 本月收入 -->
          <view class="bg-white rounded-xl p-4 shadow-sm">
            <view class="flex items-center gap-2 mb-2">
              <view class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(34,197,94,0.1)">
                <text class="text-sm"></text>
              </view>
              <text class="text-xs" style="color:#999">本月收入</text>
            </view>
            <text class="text-2xl font-bold text-foreground block">¥{{ coreMetrics.monthlyRevenue.value.toLocaleString() }}</text>
            <view class="flex items-center gap-1 text-xs mt-1" :class="coreMetrics.monthlyRevenue.trend === 'up' ? 'text-green-500' : 'text-red-500'">
              <text>{{ coreMetrics.monthlyRevenue.trend === 'up' ? '↑' : '↓' }}</text>
              <text>{{ coreMetrics.monthlyRevenue.change }}%</text>
            </view>
          </view>
        </view>

        <!-- 成员增长趋势图 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <text class="font-semibold text-sm text-foreground block mb-4">成员增长趋势</text>
          <view class="flex items-end gap-2" style="height:128px">
            <view v-for="(item, index) in memberGrowthData" :key="index" class="flex-1 flex flex-col items-center gap-1">
              <text class="text-[10px]" style="color:#999">{{ item.value }}</text>
              <view
                class="w-full rounded-t transition-all"
                :style="{
                  height: (item.value / maxGrowth) * 100 + '%',
                  background: 'rgba(196,30,58,0.8)'
                }"
              />
              <text class="text-[10px]" style="color:#999">{{ item.day }}</text>
            </view>
          </view>
        </view>

        <!-- 内容互动概览 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <text class="font-semibold text-sm text-foreground block mb-4">内容互动概览</text>
          <view class="grid grid-cols-3 gap-4">
            <view v-for="stat in contentStatsList" :key="stat.key" class="text-center">
              <text class="text-xl font-bold text-foreground block">{{ stat.value.toLocaleString() }}</text>
              <text class="text-xs mt-1 block" style="color:#999">{{ stat.label }}</text>
            </view>
          </view>
        </view>

        <!-- 收入来源分布 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <text class="font-semibold text-sm text-foreground block mb-4">收入来源分布</text>
          <view class="flex items-center gap-6">
            <!-- 简化饼图 SVG -->
            <view class="relative flex-shrink-0" style="width:96px;height:96px">
              <svg viewBox="0 0 36 36" class="w-full h-full" style="transform:rotate(-90deg)">
                <circle
                  v-for="(seg, i) in donutSegments"
                  :key="i"
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  :stroke="seg.color"
                  stroke-width="4"
                  :stroke-dasharray="seg.dashArray"
                  :stroke-dashoffset="seg.dashOffset"
                />
              </svg>
            </view>
            <!-- 图例 -->
            <view class="flex-1" style="space-y:8px">
              <view v-for="(item, index) in revenueSourceData" :key="index" class="flex items-center justify-between text-xs mb-2 last:mb-0">
                <view class="flex items-center gap-2">
                  <view class="w-2 h-2 rounded-full" :style="{ background: revenueColors[index] }" />
                  <text style="color:#999">{{ item.name }}</text>
                </view>
                <text class="font-medium text-foreground">¥{{ item.value.toLocaleString() }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 热门内容Top5 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center justify-between mb-4">
            <text class="font-semibold text-sm text-foreground">热门内容 Top5</text>
            <text class="text-xs text-primary" @click="goContentsList">查看全部</text>
          </view>
          <view class="space-y-3">
            <view v-for="(item, index) in hotContents" :key="item.id" class="flex items-start gap-3">
              <view
                class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                :class="index < 3 ? 'text-accent' : 'text-muted-foreground'"
                :style="{ background: index < 3 ? 'rgba(201,169,110,0.2)' : '#F5F1EB' }"
              >
                <text>{{ index + 1 }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm text-foreground line-clamp-1 block">{{ item.title }}</text>
                <view class="flex items-center gap-3 mt-1 text-xs" style="color:#999">
                  <text
                    class="text-[10px] px-1 py-0 inline-block border rounded"
                    :style="{ borderColor: '#E8E0D5', color: '#999' }"
                  >{{ item.type === 'article' ? '文章' : '帖子' }}</text>
                  <text class="flex items-center gap-0.5"> {{ item.likes }}</text>
                  <text class="flex items-center gap-0.5"> {{ item.comments }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 活跃成员榜 -->
        <view class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex items-center justify-between mb-4">
            <text class="font-semibold text-sm text-foreground">活跃成员榜</text>
            <text class="text-xs text-primary" @click="goMembers">查看全部</text>
          </view>
          <view class="space-y-3">
            <view v-for="(member, index) in activeMembers" :key="member.id" class="flex items-center gap-3">
              <view
                class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                :class="index < 3 ? 'text-accent' : 'text-muted-foreground'"
                :style="{ background: index < 3 ? 'rgba(201,169,110,0.2)' : '#F5F1EB' }"
              >
                <text v-if="index === 0">👑</text>
                <text v-else>{{ index + 1 }}</text>
              </view>
              <view class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style="background:linear-gradient(135deg,#C41E3A,#E74C3C)">
                <text>{{ member.name[0] }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm text-foreground block">{{ member.name }}</text>
                <text class="text-xs" style="color:#999">发帖 {{ member.posts }} · 互动 {{ member.interactions }}</text>
              </view>
              <view class="text-right">
                <text class="text-sm font-medium text-accent block">{{ member.contribution }}</text>
                <text class="text-[10px]" style="color:#999">贡献值</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const dateRange = ref('7days')
const showDatePicker = ref(false)

const dateRanges = [
  { id: 'today', label: '今日' },
  { id: '7days', label: '近7天' },
  { id: '30days', label: '近30天' },
  { id: 'custom', label: '自定义' },
]

const currentDateLabel = computed(() => dateRanges.find(r => r.id === dateRange.value)?.label || '')

// 核心数据
const coreMetrics = {
  totalMembers: { value: 1280, change: 12.5, trend: 'up' },
  newMembers: { value: 86, change: 23.1, trend: 'up' },
  activeMembers: { value: 428, change: -5.2, trend: 'down' },
  monthlyRevenue: { value: 12680, change: 18.6, trend: 'up' },
}

// 成员增长数据（近7天）
const memberGrowthData = [
  { day: '周一', value: 12 },
  { day: '周二', value: 8 },
  { day: '周三', value: 15 },
  { day: '周四', value: 10 },
  { day: '周五', value: 18 },
  { day: '周六', value: 14 },
  { day: '周日', value: 9 },
]

const maxGrowth = computed(() => Math.max(...memberGrowthData.map(d => d.value)))

// 内容互动数据
const contentStatsList = [
  { key: 'posts', value: 156, label: '帖子发布' },
  { key: 'comments', value: 892, label: '评论数' },
  { key: 'likes', value: 2340, label: '点赞数' },
]

// 收入来源数据
const revenueSourceData = [
  { name: '入圈费', value: 4860, percent: 38 },
  { name: '课程销售', value: 3580, percent: 28 },
  { name: '商品分佣', value: 2120, percent: 17 },
  { name: '直播打赏', value: 1280, percent: 10 },
  { name: '付费问答', value: 840, percent: 7 },
]

const revenueColors = ['#C41E3A', '#C9A96E', '#3b82f6', '#a855f7', '#22c55e']

const donutSegments = computed(() => {
  let offset = 0
  return revenueSourceData.map((item, index) => ({
    ...item,
    color: revenueColors[index],
    dashArray: `${item.percent} ${100 - item.percent}`,
    dashOffset: -offset,
  }))
})

// 热门内容Top5
const hotContents = [
  { id: 1, title: '八字入门：如何看懂自己的命盘', type: 'article', views: 1280, likes: 356, comments: 89 },
  { id: 2, title: '今日分享：食神制杀格局详解', type: 'post', views: 986, likes: 234, comments: 67 },
  { id: 3, title: '紫微斗数与八字的区别与联系', type: 'article', views: 876, likes: 198, comments: 54 },
  { id: 4, title: '风水小知识：办公桌摆放禁忌', type: 'post', views: 765, likes: 167, comments: 42 },
  { id: 5, title: '学员案例分析：日主身弱如何补救', type: 'article', views: 654, likes: 145, comments: 38 },
]

// 活跃成员榜
const activeMembers = [
  { id: 1, name: '易学小白', avatar: '', posts: 28, interactions: 156, contribution: 184 },
  { id: 2, name: '命理爱好者', avatar: '', posts: 22, interactions: 134, contribution: 156 },
  { id: 3, name: '风水研究员', avatar: '', posts: 18, interactions: 128, contribution: 146 },
  { id: 4, name: '紫微新手', avatar: '', posts: 15, interactions: 112, contribution: 127 },
  { id: 5, name: '八字学徒', avatar: '', posts: 12, interactions: 98, contribution: 110 },
]

function goBack() { uni.navigateBack() }
function goContentsList() { uni.navigateTo({ url: '/pages/circles/id-detail/analytics/contents/index' }) }
function goMembers() { uni.navigateTo({ url: '/pages/circles/id-detail/members/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
