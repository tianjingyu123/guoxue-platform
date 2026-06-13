<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- Header -->
    <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border" style="padding-top:44px">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-1" @click="goBack"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">圈子收益</text>
        <view class="text-sm text-primary" @click="goAllDetail">全部明细</view>
      </view>
    </view>

    <!-- Revenue Overview Card -->
    <view class="p-4">
      <view class="relative overflow-hidden bg-gradient-to-br from-accent via-[#C9A96E]/90 to-primary rounded-2xl p-5">
        <!-- Decorative SVG bg -->
        <view class="absolute -right-8 -top-8 w-32 h-32 opacity-10">
          <view class="w-full h-full" style="color:white">
            <svg viewBox="0 0 100 100" class="w-full h-full fill-current">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2"/>
            </svg>
          </view>
        </view>
        <view class="relative z-10">
          <view class="flex items-center gap-2 mb-1">
            <text class="text-white/80 text-sm">累计收入</text>
            <text class="text-white/60 text-sm">ℹ️</text>
          </view>
          <text class="text-3xl font-bold text-white block mb-4">¥{{ earningsData.totalEarnings.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</text>
          <view class="grid grid-cols-2 gap-4">
            <view>
              <text class="text-white/70 text-xs block mb-1">本月收入</text>
              <view class="flex items-center gap-2">
                <text class="text-lg font-semibold text-white">¥{{ earningsData.monthlyEarnings.toLocaleString() }}</text>
                <text class="text-[10px] px-1.5 py-0 rounded" :class="earningsData.monthlyChange >= 0 ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'">
                  <text v-if="earningsData.monthlyChange >= 0" class="mr-0.5">↑</text>
                  <text v-else class="mr-0.5">↓</text>
                  {{ Math.abs(earningsData.monthlyChange) }}%
                </text>
              </view>
            </view>
            <view>
              <text class="text-white/70 text-xs block mb-1">可提现余额</text>
              <text class="text-lg font-semibold text-white">¥{{ earningsData.withdrawable.toLocaleString() }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Revenue Sources with Donut Chart -->
    <view class="px-4 pb-4">
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <text class="font-semibold text-sm text-foreground block mb-4">收入来源</text>
        <view class="flex gap-6">
          <!-- SVG Donut Chart -->
          <view class="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" class="w-full h-full" style="transform:rotate(-90deg)">
              <circle v-for="(source, index) in earningsData.sources" :key="source.type"
                cx="50" cy="50" r="45" fill="none"
                stroke-width="10"
                :stroke="donutColors[source.type]"
                :stroke-dasharray="source.percent * 2.83 + ' ' + (283 - source.percent * 2.83)"
                :stroke-dashoffset="-getPrevPercent(index) * 2.83"
              />
            </svg>
            <view class="absolute inset-0 flex flex-col items-center justify-center">
              <text class="text-[10px] text-muted-foreground block">总计</text>
              <text class="text-sm font-semibold text-foreground block">¥{{ (earningsData.totalEarnings / 10000).toFixed(1) }}万</text>
            </view>
          </view>
          <!-- Legend -->
          <view class="flex-1 space-y-2">
            <view v-for="source in earningsData.sources" :key="source.type" class="flex items-center justify-between">
              <view class="flex items-center gap-2">
                <view class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: donutColors[source.type] }" />
                <text class="text-xs text-muted-foreground">{{ source.name }}</text>
              </view>
              <view class="flex items-center gap-2">
                <text class="text-xs font-medium text-foreground">¥{{ source.amount.toLocaleString() }}</text>
                <text class="text-[10px] text-muted-foreground w-10 text-right">{{ source.percent }}%</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Revenue Trend -->
    <view class="px-4 pb-4">
      <view class="bg-white rounded-xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-sm text-foreground">收入趋势</text>
          <view class="flex items-center gap-1 text-xs text-muted-foreground">
            <text class="text-sm"></text>
            <text>近30天</text>
          </view>
        </view>
        <view class="flex items-end justify-between gap-2 h-24">
          <view v-for="(item, index) in earningsData.trend" :key="index" class="flex-1 flex flex-col items-center gap-1">
            <view class="w-full bg-gradient-to-t from-accent to-accent/60 rounded-t transition-all" :style="{ height: (item.amount / maxAmount * 100) + '%' }" />
            <text class="text-[10px] text-muted-foreground">{{ item.day.split('/')[1] }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Revenue Details -->
    <view class="px-4 pb-4">
      <view class="flex items-center justify-between mb-3">
        <text class="font-semibold text-sm text-foreground">收益明细</text>
        <view class="flex items-center gap-1 text-xs text-muted-foreground" @click="showFilter = !showFilter">
          <text class="text-sm"></text>
          <text>筛选</text>
        </view>
      </view>
      <!-- Filter bar -->
      <view v-if="showFilter" class="flex gap-2 mb-3 overflow-x-auto pb-1" style="scrollbar-width:none">
        <view v-for="type in filterTypes" :key="type.id"
          class="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors"
          :class="filterType === type.id ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
          @click="filterType = type.id"
        >
          <text>{{ type.name }}</text>
        </view>
      </view>
      <view class="bg-white rounded-xl" style="border:0">
        <view v-for="(detail, idx) in filteredDetails" :key="detail.id"
          class="flex items-center gap-3 p-3"
          :class="idx < filteredDetails.length - 1 ? '' : ''"
          style="border-bottom:1rpx solid #E8E0D5"
          v-bind:style="idx === filteredDetails.length - 1 ? 'border-bottom:none' : ''"
        >
          <view class="w-9 h-9 rounded-full flex items-center justify-center" :class="getDetailColor(detail.type)">
            <text class="text-sm">{{ getDetailIcon(detail.type) }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-sm text-foreground block line-clamp-1">{{ detail.desc }}</text>
            <text class="text-xs text-muted-foreground block mt-0.5">{{ detail.time }}</text>
          </view>
          <text class="text-sm font-medium text-green-500">+¥{{ detail.amount }}</text>
        </view>
        <view v-if="filteredDetails.length === 0" class="py-12 text-center">
          <text class="text-muted-foreground text-sm">暂无相关记录</text>
        </view>
      </view>
      <view v-if="filteredDetails.length > 0" class="flex items-center justify-center gap-1 mt-3 py-2 text-sm text-muted-foreground" @click="goAllDetail">
        <text>查看全部明细</text>
        <text class="text-lg">›</text>
      </view>
    </view>

    <!-- Bottom Withdraw Bar -->
    <view class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border" style="padding-bottom:34px">
      <view class="px-4 py-3">
        <text v-if="earningsData.withdrawable < earningsData.minWithdraw" class="text-xs text-muted-foreground text-center block mb-2">
          满¥{{ earningsData.minWithdraw }}可提现，还差¥{{ (earningsData.minWithdraw - earningsData.withdrawable).toFixed(2) }}
        </text>
        <view class="flex items-center gap-3">
          <view class="flex-1">
            <text class="text-xs text-muted-foreground block">可提现余额</text>
            <text class="text-lg font-bold text-foreground">¥{{ earningsData.withdrawable.toLocaleString() }}</text>
          </view>
          <view class="flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-colors"
            :class="earningsData.withdrawable >= earningsData.minWithdraw ? 'bg-primary text-white' : 'bg-[#F0EDE8] text-muted-foreground'"
            @click="handleWithdraw"
          >
            <text class="text-base"></text>
            <text>申请提现</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const earningsData = {
  circleName: '八字命理研习社',
  totalEarnings: 128680.50,
  monthlyEarnings: 12580.00,
  monthlyChange: 15.8,
  withdrawable: 45680.00,
  minWithdraw: 100,
  sources: [
    { type: 'join', name: '入圈收入', amount: 45800, percent: 35.6, color: 'bg-primary' },
    { type: 'course', name: '课程收入', amount: 38600, percent: 30.0, color: 'bg-accent' },
    { type: 'product', name: '商品收入', amount: 22400, percent: 17.4, color: 'bg-blue-500' },
    { type: 'live', name: '直播打赏', amount: 12880, percent: 10.0, color: 'bg-purple-500' },
    { type: 'qa', name: '付费问答', amount: 9000, percent: 7.0, color: 'bg-green-500' },
  ],
  trend: [
    { day: '05/01', amount: 380 },
    { day: '05/05', amount: 520 },
    { day: '05/10', amount: 680 },
    { day: '05/15', amount: 450 },
    { day: '05/20', amount: 890 },
    { day: '05/25', amount: 720 },
    { day: '05/30', amount: 580 },
  ],
  details: [
    { id: 1, type: 'join', desc: '用户「易学新人」加入圈子', amount: 199, time: '今天 14:32' },
    { id: 2, type: 'course', desc: '课程《八字入门》被购买', amount: 299, time: '今天 11:20' },
    { id: 3, type: 'qa', desc: '回答付费问题获得收益', amount: 50, time: '今天 09:15' },
    { id: 4, type: 'live', desc: '直播打赏收入', amount: 88, time: '昨天 21:30' },
    { id: 5, type: 'product', desc: '商品「罗盘」被购买', amount: 168, time: '昨天 16:45' },
    { id: 6, type: 'join', desc: '用户「命理爱好者」加入圈子', amount: 199, time: '昨天 10:20' },
    { id: 7, type: 'course', desc: '课程《紫微斗数》被购买', amount: 399, time: '前天 15:30' },
    { id: 8, type: 'live', desc: '直播打赏收入', amount: 128, time: '前天 22:10' },
  ],
}

const donutColors: Record<string, string> = {
  join: '#C41E3A',
  course: '#C9A96E',
  product: '#3B82F6',
  live: '#A855F7',
  qa: '#22C55E',
}

const filterTypes = [
  { id: 'all', name: '全部' },
  { id: 'join', name: '入圈' },
  { id: 'course', name: '课程' },
  { id: 'product', name: '商品' },
  { id: 'live', name: '直播' },
  { id: 'qa', name: '问答' },
]

const filterType = ref('all')
const showFilter = ref(false)

const filteredDetails = computed(() => {
  if (filterType.value === 'all') return earningsData.details
  return earningsData.details.filter(d => d.type === filterType.value)
})

const maxAmount = computed(() => Math.max(...earningsData.trend.map(t => t.amount)))

function getPrevPercent(index: number): number {
  return earningsData.sources.slice(0, index).reduce((sum, s) => sum + s.percent, 0)
}

function getDetailIcon(type: string): string {
  const icons: Record<string, string> = { join: '', course: '', product: '', live: '📡', qa: '' }
  return icons[type] || ''
}

function getDetailColor(type: string): string {
  const colors: Record<string, string> = {
    join: 'bg-primary/20', course: 'bg-accent/20', product: 'bg-blue-500/20',
    live: 'bg-purple-500/20', qa: 'bg-green-500/20',
  }
  return colors[type] || 'bg-[#F0EDE8]'
}

function goBack() { uni.navigateBack() }
function goAllDetail() { uni.navigateTo({ url: '/pages/wallet/index' }) }
function handleWithdraw() {
  if (earningsData.withdrawable >= earningsData.minWithdraw) {
    uni.navigateTo({ url: '/pages/wallet/withdraw/index' })
  }
}
</script>
