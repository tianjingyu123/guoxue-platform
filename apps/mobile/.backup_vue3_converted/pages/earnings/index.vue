<template>
<view class="min-h-screen bg-background pb-24">
  <!-- 顶部导航 -->
  <view class="sticky top-0 z-50 bg-background/95 border-b border-border" style="backdrop-filter:blur(12px)">
    <view class="flex items-center justify-between px-4 h-14">
      <view @click="goBack" class="p-2 -ml-2">
        <text class="text-foreground">&#8592;</text>
      </view>
      <text class="font-semibold text-base text-foreground">推广收益</text>
      <view class="w-9"></view>
    </view>
  </view>

  <view class="p-4 space-y-4">
    <!-- 收益总览卡片 -->
    <view class="p-5 rounded-2xl text-white relative overflow-hidden" style="background: linear-gradient(to bottom right, #C9A96E, #C9A96E, #C41E3A);">
      <view class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"></view>
      <view class="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5"></view>

      <view class="relative z-10">
        <text class="text-sm text-white/80">累计收益</text>
        <view class="flex items-baseline gap-1 mt-2">
          <text class="text-sm">&#165;</text>
          <text class="text-4xl font-bold tracking-tight">{{ totalEarnings.toFixed(2) }}</text>
        </view>

        <view class="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
          <view>
            <text class="text-xs text-white/70">可提现余额</text>
            <text class="text-lg font-semibold mt-0.5 block">&#165;{{ withdrawableBalance.toFixed(2) }}</text>
          </view>
          <view @click="goTo('/pages/earnings/withdraw')" class="px-5 py-2 bg-white text-accent font-medium text-sm rounded-full">
            提现
          </view>
        </view>
      </view>
    </view>

    <!-- 收入来源拆分 -->
    <view class="bg-white rounded-xl p-4">
      <view class="flex items-center justify-between mb-4">
        <text class="font-semibold text-foreground">收入来源</text>
        <text @click="goTo('/pages/earnings/breakdown')" class="text-xs text-muted-foreground flex items-center gap-0.5">
          详情 &#8250;
        </text>
      </view>

      <view class="flex items-center gap-6">
        <!-- 环形图 -->
        <view class="w-28 h-28 rounded-full flex-shrink-0 relative" style="background: conic-gradient(#C41E3A 0% 42%, #C9A96E 42% 62%, #10b981 62% 75%, #3b82f6 75% 90%, #a855f7 90% 100%);">
          <view class="absolute inset-2 rounded-full bg-white flex items-center justify-center">
            <text class="text-2xl text-accent">&#128176;</text>
          </view>
        </view>

        <!-- 图例 -->
        <view class="flex-1 space-y-2">
          <view v-for="source in incomeSourcesData.slice(0, 4)" :key="source.name" class="flex items-center justify-between text-sm">
            <view class="flex items-center gap-2">
              <view :class="['w-2.5 h-2.5 rounded-full', source.color]"></view>
              <text class="text-muted-foreground">{{ source.name }}</text>
            </view>
            <text class="font-medium text-foreground">{{ source.percentage }}%</text>
          </view>
          <text v-if="incomeSourcesData.length > 4" class="text-xs text-muted-foreground">+{{ incomeSourcesData.length - 4 }}项其他收入</text>
        </view>
      </view>
    </view>

    <!-- 收益趋势图 -->
    <view class="bg-white rounded-xl p-4">
      <view class="flex items-center justify-between mb-4">
        <text class="font-semibold text-foreground">近7天收益趋势</text>
        <view class="flex items-center gap-1 text-emerald-500 text-xs">
          <text>&#9650;</text>
          <text>+12.5%</text>
        </view>
      </view>

      <view class="flex items-end justify-between gap-2" style="height: 128px;">
        <view v-for="(item, index) in trendData" :key="item.day" class="flex-1 flex flex-col items-center gap-2">
          <view class="w-full flex flex-col items-center">
            <text class="text-[10px] text-muted-foreground mb-1">{{ item.amount >= 1000 ? (item.amount / 1000).toFixed(1) + 'k' : item.amount }}</text>
            <view :class="['w-full rounded-t-sm', index === trendData.length - 2 ? 'bg-accent' : 'bg-primary/60']" :style="{ height: (item.amount / maxTrendAmount) * 80 + 'px' }"></view>
          </view>
          <text class="text-[10px] text-muted-foreground">{{ item.day }}</text>
        </view>
      </view>
    </view>

    <!-- 收入明细 -->
    <view>
      <view class="flex items-center justify-between mb-3">
        <text class="font-semibold text-foreground">收入明细</text>
        <text @click="showFilterSheet = true" class="flex items-center gap-1 text-xs text-muted-foreground">
          筛选
        </text>
      </view>

      <!-- 筛选标签 -->
      <view class="flex gap-2 mb-3 overflow-x-auto">
        <view v-for="filter in filters" :key="filter.id" @click="activeFilter = filter.id" :class="['px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap', activeFilter === filter.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']">
          {{ filter.label }}
        </view>
      </view>

      <!-- 明细列表 -->
      <view class="space-y-2">
        <view v-for="record in filteredRecords" :key="record.id" class="bg-white rounded-xl p-4 flex items-center gap-3 transition-colors">
          <view :class="['w-10 h-10 rounded-xl flex items-center justify-center', record.color]">
            <text>{{ getRecordIcon(record.type) }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-sm font-medium text-foreground line-clamp-1 block">{{ record.title }}</text>
            <text class="text-xs text-muted-foreground">{{ record.time }}</text>
          </view>
          <text class="text-base font-semibold text-emerald-500">+&#165;{{ record.amount.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 查看更多 -->
      <view @click="goTo('/pages/earnings/records')" class="w-full py-3 text-sm text-muted-foreground text-center mt-2">
        查看全部记录
      </view>
    </view>
  </view>

  <!-- 底部固定操作栏 -->
  <view class="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-border p-4" style="backdrop-filter:blur(12px)">
    <view class="flex items-center gap-3">
      <view @click="goTo('/pages/earnings/records')" class="flex-1 py-3 text-center text-sm font-medium text-foreground bg-secondary rounded-xl">
        全部明细
      </view>
      <view @click="goTo('/pages/earnings/withdraw')" class="flex-1 py-3 text-center text-sm font-medium text-white bg-primary rounded-xl flex items-center justify-center gap-2">
        <text>申请提现</text>
      </view>
    </view>
  </view>
</view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

const incomeSourcesData = [
  { name: '课程分成', amount: 3280.50, percentage: 42, color: 'bg-primary' },
  { name: '商品分佣', amount: 1560.00, percentage: 20, color: 'bg-accent' },
  { name: '入圈收入', amount: 980.00, percentage: 13, color: 'bg-emerald-500' },
  { name: '推广佣金', amount: 1200.00, percentage: 15, color: 'bg-blue-500' },
  { name: '管理奖励', amount: 780.00, percentage: 10, color: 'bg-purple-500' },
]

const incomeRecords = [
  { id: 1, type: 'course', title: '课程《八字入门》销售分佣', amount: 29.90, time: '今天 14:30', color: 'text-primary bg-primary/10' },
  { id: 2, type: 'product', title: '商品「开运手串」销售分佣', amount: 15.00, time: '今天 11:20', color: 'text-accent bg-accent/10' },
  { id: 3, type: 'circle', title: '用户加入「命理研习社」', amount: 9.90, time: '昨天 18:45', color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 4, type: 'promote', title: '推广用户购买会员', amount: 50.00, time: '昨天 15:30', color: 'text-blue-500 bg-blue-500/10' },
  { id: 5, type: 'course', title: '课程《紫微斗数精讲》销售分佣', amount: 99.00, time: '昨天 10:15', color: 'text-primary bg-primary/10' },
  { id: 6, type: 'award', title: '本周管理奖励结算', amount: 200.00, time: '3天前', color: 'text-purple-500 bg-purple-500/10' },
  { id: 7, type: 'product', title: '商品「风水罗盘」销售分佣', amount: 45.00, time: '3天前', color: 'text-accent bg-accent/10' },
  { id: 8, type: 'circle', title: '用户加入「风水实战班」', amount: 199.00, time: '4天前', color: 'text-emerald-500 bg-emerald-500/10' },
]

const trendData = [
  { day: '周一', amount: 320 },
  { day: '周二', amount: 580 },
  { day: '周三', amount: 420 },
  { day: '周四', amount: 890 },
  { day: '周五', amount: 650 },
  { day: '周六', amount: 1200 },
  { day: '周日', amount: 980 },
]

const maxTrendAmount = Math.max(...trendData.map(d => d.amount))

const activeFilter = ref('all')
const showFilterSheet = ref(false)
const totalEarnings = 7800.50
const withdrawableBalance = 5280.00

const filters = [
  { id: 'all', label: '全部' },
  { id: 'course', label: '课程' },
  { id: 'product', label: '商品' },
  { id: 'circle', label: '圈子' },
  { id: 'promote', label: '推广' },
]

const filteredRecords = computed(() => {
  if (activeFilter.value === 'all') return incomeRecords
  return incomeRecords.filter(r => r.type === activeFilter.value)
})

const getRecordIcon = (type: string) => {
  const icons: Record<string, string> = {
    course: '',
    product: '',
    circle: '',
    promote: '',
    award: '',
  }
  return icons[type] || ''
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
