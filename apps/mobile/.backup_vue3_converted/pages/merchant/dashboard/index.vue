<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- 顶部店铺信息 -->
    <view class="bg-gradient-to-br from-primary to-primary/80 text-white p-4 pb-16">
      <view class="flex items-center justify-between mb-4">
        <text class="text-lg font-semibold">商家工作台</text>
        <view class="flex items-center gap-2">
          <view @click="goPreview" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <text></text>
          </view>
          <view class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center relative">
            <text></text>
            <view class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </view>
        </view>
      </view>
      <view class="flex items-center gap-3">
        <view class="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
          <text class="text-2xl">🏪</text>
        </view>
        <view class="flex-1">
          <view class="flex items-center gap-2">
            <text class="font-semibold text-lg">{{ shopData.shopName }}</text>
            <text class="px-1.5 py-0.5 bg-amber-500/90 text-white rounded text-[10px]">{{ shopData.level }}</text>
          </view>
          <view class="flex items-center gap-2 mt-1 text-sm text-white/80">
            <text class="flex items-center gap-1">
              <text class="w-2 h-2 rounded-full bg-green-400 inline-block" />
              {{ shopData.status }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据概览卡片 -->
    <view class="px-4 -mt-12">
      <view class="bg-white rounded-2xl p-4 shadow-lg">
        <view class="flex items-center justify-between mb-4">
          <text class="text-sm font-medium">今日数据</text>
          <view @click="goAnalytics" class="text-xs text-primary flex items-center">
            <text>查看详情 ›</text>
          </view>
        </view>

        <!-- 主要指标 -->
        <view class="grid grid-cols-2 gap-4 mb-4">
          <view class="p-3 bg-background rounded-xl">
            <view class="flex items-center justify-between mb-1">
              <text class="text-xs text-muted-foreground">订单数</text>
              <text :class="['text-[10px] flex items-center', shopData.todayStats.orders.trend === 'up' ? 'text-green-600' : 'text-red-500']">
                {{ shopData.todayStats.orders.trend === 'up' ? '↗' : '↘' }}{{ Math.abs(shopData.todayStats.orders.change) }}%
              </text>
            </view>
            <text class="text-2xl font-bold block">{{ shopData.todayStats.orders.value }}</text>
            <view class="mt-2 flex items-end gap-0.5 h-6">
              <view v-for="(v, i) in shopData.weeklyTrend.orders" :key="i" class="w-2 rounded-t-sm bg-primary" :style="{ height: (v / maxOrder * 100) + '%' }" />
            </view>
          </view>
          <view class="p-3 bg-background rounded-xl">
            <view class="flex items-center justify-between mb-1">
              <text class="text-xs text-muted-foreground">销售额</text>
              <text :class="['text-[10px] flex items-center', shopData.todayStats.sales.trend === 'up' ? 'text-green-600' : 'text-red-500']">
                {{ shopData.todayStats.sales.trend === 'up' ? '↗' : '↘' }}{{ Math.abs(shopData.todayStats.sales.change) }}%
              </text>
            </view>
            <text class="text-2xl font-bold block">¥{{ shopData.todayStats.sales.value }}</text>
            <view class="mt-2 flex items-end gap-0.5 h-6">
              <view v-for="(v, i) in shopData.weeklyTrend.sales" :key="i" class="w-2 rounded-t-sm bg-green-500" :style="{ height: (v / maxSales * 100) + '%' }" />
            </view>
          </view>
        </view>

        <!-- 折线趋势图 -->
        <view class="mb-4 p-3 bg-background rounded-xl">
          <view class="flex items-center justify-between mb-1">
            <text class="text-xs text-muted-foreground">本周订单趋势</text>
          </view>
          <svg viewBox="0 0 100 30" class="w-full h-8">
            <polyline :points="trendPoints" fill="none" stroke="#C41E3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </view>

        <!-- 次要指标 -->
        <view class="grid grid-cols-2 gap-4">
          <view class="flex items-center justify-between">
            <view>
              <text class="text-xs text-muted-foreground block">访客数</text>
              <text class="text-lg font-semibold">{{ shopData.todayStats.visitors.value }}</text>
            </view>
            <text :class="['text-xs px-1.5 py-0.5 rounded', shopData.todayStats.visitors.trend === 'up' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50']">
              {{ shopData.todayStats.visitors.trend === 'up' ? '↑' : '↓' }}{{ Math.abs(shopData.todayStats.visitors.change) }}%
            </text>
          </view>
          <view class="flex items-center justify-between">
            <view>
              <text class="text-xs text-muted-foreground block">转化率</text>
              <text class="text-lg font-semibold">{{ shopData.todayStats.conversion.value }}%</text>
            </view>
            <text :class="['text-xs px-1.5 py-0.5 rounded', shopData.todayStats.conversion.trend === 'up' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50']">
              {{ shopData.todayStats.conversion.trend === 'up' ? '↑' : '↓' }}{{ Math.abs(shopData.todayStats.conversion.change) }}%
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 待处理事项 -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <text class="text-sm font-medium mb-3 block">待处理事项</text>
        <view class="grid grid-cols-4 gap-2">
          <view @click="goOrders('toship')" class="text-center p-2 rounded-lg">
            <view class="relative inline-block">
              <text class="text-2xl text-muted-foreground"></text>
              <text v-if="pending.toShip > 0" class="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">{{ pending.toShip }}</text>
            </view>
            <text class="text-xs text-muted-foreground mt-1 block">待发货</text>
          </view>
          <view @click="goOrders('refunding')" class="text-center p-2 rounded-lg">
            <view class="relative inline-block">
              <text class="text-2xl text-muted-foreground"></text>
              <text v-if="pending.refund > 0" class="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">{{ pending.refund }}</text>
            </view>
            <text class="text-xs text-muted-foreground mt-1 block">退款中</text>
          </view>
          <view @click="goReviews('pending')" class="text-center p-2 rounded-lg">
            <view class="relative inline-block">
              <text class="text-2xl text-muted-foreground"></text>
              <text v-if="pending.review > 0" class="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">{{ pending.review }}</text>
            </view>
            <text class="text-xs text-muted-foreground mt-1 block">待回复</text>
          </view>
          <view @click="goInquiries" class="text-center p-2 rounded-lg">
            <view class="relative inline-block">
              <text class="text-2xl text-muted-foreground"></text>
              <text v-if="pending.inquiry > 0" class="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">{{ pending.inquiry }}</text>
            </view>
            <text class="text-xs text-muted-foreground mt-1 block">咨询</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 常用功能 -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <text class="text-sm font-medium mb-3 block">常用功能</text>
        <view class="grid grid-cols-3 gap-3">
          <view v-for="action in quickActions" :key="action.label" @click="goPage(action.href)" class="flex flex-col items-center p-3 rounded-xl">
            <view :class="['w-10 h-10 rounded-full flex items-center justify-center', action.color]">
              <text class="text-lg">{{ action.icon }}</text>
            </view>
            <text class="text-xs mt-2 text-foreground">{{ action.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 平台公告 -->
    <view class="px-4 mt-4">
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-medium">平台公告</text>
          <view @click="goNotices" class="text-xs text-primary">更多</view>
        </view>
        <view class="space-y-3">
          <view v-for="notice in shopData.notices" :key="notice.id" class="flex items-start gap-3">
            <text :class="['px-1.5 py-0.5 rounded text-[10px]', notice.type === '活动' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700']">{{ notice.type }}</text>
            <view class="flex-1 min-w-0">
              <text class="text-sm text-foreground truncate block">{{ notice.title }}</text>
              <text class="text-xs text-muted-foreground mt-0.5 block">{{ notice.time }}</text>
            </view>
            <text class="text-muted-foreground">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 经营建议 -->
    <view class="px-4 mt-4">
      <view class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200/50">
        <view class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <text class="text-lg text-amber-600">📈</text>
          </view>
          <view class="flex-1">
            <text class="text-sm font-medium block">经营小贴士</text>
            <text class="text-xs text-ink-soft mt-1 block">您的商品详情页转化率较低，建议优化商品主图和详情描述，可提升约20%的转化率。</text>
            <text class="text-xs text-amber-600 mt-2 inline-block">查看优化建议 ›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const shopData = {
  shopName: '国学堂官方店',
  level: '金牌商家',
  status: '正常营业',
  todayStats: {
    orders: { value: 12, change: 20, trend: 'up' as const },
    sales: { value: 2680, change: 15.5, trend: 'up' as const },
    visitors: { value: 156, change: -8, trend: 'down' as const },
    conversion: { value: 7.7, change: 2.3, trend: 'up' as const },
  },
  weeklyTrend: {
    orders: [8, 12, 15, 10, 18, 22, 12],
    sales: [1200, 1800, 2200, 1500, 2800, 3500, 2680],
    visitors: [120, 145, 168, 132, 178, 195, 156],
  },
  notices: [
    { id: '1', title: '双十一活动报名开始', type: '活动', time: '2小时前' },
    { id: '2', title: '新版商品发布规则已更新', type: '规则', time: '1天前' },
  ],
}

const maxOrder = computed(() => Math.max(...shopData.weeklyTrend.orders))
const maxSales = computed(() => Math.max(...shopData.weeklyTrend.sales))

const trendPoints = computed(() => {
  const data = shopData.weeklyTrend.orders
  const len = data.length
  if (len === 0) return ''
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = 100 / (len - 1)
  return data.map((v, i) => {
    const x = i * stepX
    const y = 30 - ((v - min) / range) * 30
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
})

const pending = { toShip: 8, refund: 2, review: 5, inquiry: 3 }

const quickActions = [
  { icon: '📦', label: '发布商品', href: 'product-edit', color: 'text-blue-600 bg-blue-50' },
  { icon: '', label: '订单管理', href: 'orders', color: 'text-orange-600 bg-orange-50' },
  { icon: '', label: '评价管理', href: 'reviews', color: 'text-amber-600 bg-amber-50' },
  { icon: '', label: '收入管理', href: 'revenue', color: 'text-green-600 bg-green-50' },
  { icon: '📊', label: '数据分析', href: 'analytics', color: 'text-purple-600 bg-purple-50' },
  { icon: '⚙️', label: '店铺设置', href: 'profile', color: 'text-gray-600 bg-gray-50' },
]

function goPreview() { uni.navigateTo({ url: '/pages/merchant/shop-preview/index' }) }
function goAnalytics() { uni.navigateTo({ url: '/pages/merchant/analytics/index' }) }
function goOrders(status?: string) { uni.navigateTo({ url: '/pages/merchant/orders/index' + (status ? '?status=' + status : '') }) }
function goReviews(status?: string) { uni.navigateTo({ url: '/pages/merchant/reviews/index' + (status ? '?status=' + status : '') }) }
function goInquiries() { uni.navigateTo({ url: '/pages/merchant/inquiries/index' }) }
function goNotices() { uni.navigateTo({ url: '/pages/merchant/notices/index' }) }
function goPage(href: string) { uni.navigateTo({ url: '/pages/merchant/' + href + '/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
