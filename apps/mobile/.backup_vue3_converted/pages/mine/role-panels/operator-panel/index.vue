<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- Loading -->
    <view v-if="loading" class="min-h-screen bg-background">
      <view class="sticky top-0 z-10 bg-primary text-white px-4 py-3">
        <view class="flex items-center gap-3">
          <view class="w-6 h-6 bg-white/20 rounded animate-pulse" />
          <view class="flex-1">
            <view class="h-5 w-32 bg-white/20 rounded animate-pulse mb-1" />
            <view class="h-3 w-24 bg-white/20 rounded animate-pulse" />
          </view>
        </view>
      </view>
      <view class="p-4 space-y-4">
        <view class="grid grid-cols-2 gap-3">
          <view v-for="i in 6" :key="i" class="bg-white rounded-lg p-3 border">
            <view class="h-3 w-16 bg-muted rounded animate-pulse mb-2" />
            <view class="h-6 w-20 bg-muted rounded animate-pulse" />
          </view>
        </view>
        <view class="grid grid-cols-4 gap-3">
          <view v-for="i in 8" :key="i" class="flex flex-col items-center gap-2">
            <view class="w-12 h-12 bg-muted rounded-lg animate-pulse" />
            <view class="h-3 w-10 bg-muted rounded animate-pulse" />
          </view>
        </view>
      </view>
    </view>

    <template v-else>
      <!-- Header -->
      <view class="sticky top-0 z-10 bg-primary text-white">
        <view class="px-4 py-3">
          <view class="flex items-center gap-3">
            <view @click="goBack" class="p-1 -ml-2">
              <text class="text-white text-lg">←</text>
            </view>
            <view class="flex-1">
              <text class="text-lg font-semibold block">{{ operatorInfo.name }}</text>
              <view class="flex items-center gap-2 text-sm text-white/80">
                <text class="text-accent text-sm">👑</text>
                <text>{{ operatorInfo.level }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Data Overview -->
      <view class="p-4">
        <view class="grid grid-cols-2 gap-3">
          <view v-for="item in overviewItems" :key="item.key" @click="goPage(item.key)" class="bg-white rounded-xl p-3.5 border border-border">
            <text class="text-xs text-muted-foreground mb-1.5 block">{{ item.label }}</text>
            <text class="text-xl font-bold text-primary block">{{ formatValue(item.value, item.unit) }}</text>
            <view v-if="item.trend !== undefined" :class="['flex items-center gap-1 mt-1', item.trend >= 0 ? 'text-green-600' : 'text-red-500']">
              <text class="text-xs">{{ item.trend >= 0 ? '↑' : '↓' }}{{ Math.abs(item.trend) }}%</text>
              <text v-if="item.trendLabel" class="text-xs text-muted-foreground">{{ item.trendLabel }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Quick Actions -->
      <view class="px-4 pb-4">
        <view class="bg-white rounded-xl p-4 border border-border">
          <text class="font-semibold mb-3 block">快捷功能</text>
          <view class="grid grid-cols-4 gap-3">
            <view v-for="action in quickActions" :key="action.key" @click="handleAction(action)" class="flex flex-col items-center gap-1.5 relative">
              <view class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                <text>{{ actionIcon(action.icon) }}</text>
              </view>
              <text v-if="action.badge && action.badge > 0" class="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{{ action.badge > 99 ? '99+' : action.badge }}</text>
              <text class="text-xs text-muted-foreground text-center">{{ action.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Team Ranking -->
      <view class="px-4 pb-4">
        <view class="bg-white rounded-xl border border-border overflow-hidden">
          <view class="p-4 pb-2 flex items-center justify-between">
            <view class="flex items-center gap-2">
              <text class="text-lg"></text>
              <text class="font-semibold">团队排行</text>
            </view>
            <view class="flex bg-muted rounded-lg overflow-hidden">
              <view v-for="p in rankingPeriods" :key="p.key" @click="rankingPeriod = p.key" :class="['px-3 py-1 text-xs', rankingPeriod === p.key ? 'bg-primary text-white' : 'text-muted-foreground']">
                <text>{{ p.label }}</text>
              </view>
            </view>
          </view>
          <view class="divide-y">
            <view v-for="member in teamRanking" :key="member.userId" :class="['flex items-center gap-3 px-4 py-3', member.isSelf ? 'bg-primary/5' : '']">
              <view :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', getRankStyle(member.rank)]">
                <text>{{ member.rank }}</text>
              </view>
              <view class="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <text class="text-sm text-muted-foreground">{{ member.nickname[0] }}</text>
              </view>
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-1.5">
                  <text class="font-medium text-sm truncate block">{{ member.nickname }}</text>
                  <text v-if="member.isSelf" class="text-[10px] h-4 px-1 border border-primary text-primary rounded inline-flex items-center leading-none">我</text>
                </view>
                <text v-if="member.change !== undefined" :class="['text-xs', member.change >= 0 ? 'text-green-600' : 'text-red-500']">{{ member.change >= 0 ? '+' : '' }}{{ member.change }}%</text>
              </view>
              <view class="text-right">
                <text class="font-bold text-primary block">{{ member.performance.toLocaleString() }}</text>
                <text class="text-xs text-muted-foreground block">{{ member.performanceUnit }}</text>
              </view>
            </view>
          </view>
          <view @click="goFullRanking" class="p-3 text-center text-sm text-primary border-t border-border">
            <text>查看完整排行 ›</text>
          </view>
        </view>
      </view>

      <!-- Quota Usage -->
      <view class="px-4 pb-4">
        <view class="bg-white rounded-xl p-4 border border-border">
          <text class="font-semibold mb-3 block">配额使用</text>
          <view class="space-y-4">
            <view v-for="quota in quotaUsage" :key="quota.key">
              <view class="flex items-center justify-between mb-1.5">
                <view class="flex items-center gap-1.5">
                  <text class="text-sm">{{ quota.label }}</text>
                  <text v-if="quota.isLow" class="text-amber-500 text-xs"></text>
                </view>
                <text class="text-sm">
                  <text :class="quota.isLow ? 'text-amber-500 font-medium' : ''">{{ quota.used }}</text>
                  <text class="text-muted-foreground">/{{ quota.total }}{{ quota.unit }}</text>
                </text>
              </view>
              <view class="h-2 bg-muted rounded-full overflow-hidden">
                <view :class="['h-full rounded-full', quota.isLow ? 'bg-amber-500' : 'bg-primary']" :style="{ width: (quota.used / quota.total * 100) + '%' }" />
              </view>
              <text v-if="quota.expireAt" class="text-xs text-muted-foreground mt-1 block">有效期至 {{ quota.expireAt }}</text>
            </view>
          </view>
          <view @click="goUpgradeQuota" class="w-full mt-4 py-2.5 border border-primary text-primary rounded-xl text-sm text-center">
            <text>升级配额</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(true)
const rankingPeriod = ref<'day' | 'week' | 'month'>('month')

const operatorInfo = ref({
  name: '张运营',
  level: '高级运营专员',
})

const rankingPeriods = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
]

const overviewItems = [
  { key: 'content', label: '内容发布量', value: 286, unit: '篇', trend: 12, trendLabel: '较上月' },
  { key: 'users', label: '新增用户', value: 1280, unit: '人', trend: 8, trendLabel: '较上月' },
  { key: 'orders', label: '订单处理', value: 456, unit: '单', trend: -3, trendLabel: '较昨日' },
  { key: 'reviews', label: '审核通过率', value: 94.5, unit: '%', trend: 2.1, trendLabel: '较上月' },
  { key: 'interact', label: '用户互动', value: 3890, unit: '次', trend: 15, trendLabel: '较上月' },
  { key: 'quality', label: '内容质量分', value: 88, unit: '分', trend: 5, trendLabel: '较上月' },
]

const quickActions = [
  { key: 'publish', icon: 'megaphone', label: '内容发布', badge: 3, href: '/mine/operator/publish' },
  { key: 'audit', icon: 'user-check', label: '内容审核', badge: 12, href: '/mine/operator/audit' },
  { key: 'banner', icon: 'image', label: '轮播管理', badge: 0, href: '/mine/operator/banner' },
  { key: 'stats', icon: 'bar-chart', label: '数据报表', badge: 0, href: '/mine/operator/stats' },
  { key: 'course', icon: 'book-open', label: '课程管理', badge: 2, href: '/mine/operator/course' },
  { key: 'finance', icon: 'credit-card', label: '财务对账', badge: 0, href: '/mine/operator/finance' },
  { key: 'users', icon: 'users', label: '用户管理', badge: 0, href: '/mine/operator/users' },
  { key: 'wallet', icon: 'wallet', label: '钱包管理', badge: 1, href: '/mine/operator/wallet' },
]

const teamRanking = [
  { userId: 1, rank: 1, nickname: '李明轩', isSelf: false, change: 15, performance: 12800, performanceUnit: '分' },
  { userId: 2, rank: 2, nickname: '王德华', isSelf: true, change: 5, performance: 9600, performanceUnit: '分' },
  { userId: 3, rank: 3, nickname: '陈易卿', isSelf: false, change: -2, performance: 7200, performanceUnit: '分' },
  { userId: 4, rank: 4, nickname: '赵启明', isSelf: false, change: 8, performance: 5400, performanceUnit: '分' },
  { userId: 5, rank: 5, nickname: '钱学礼', isSelf: false, change: 0, performance: 3800, performanceUnit: '分' },
]

const quotaUsage = [
  { key: 'publish', label: '内容发布配额', used: 286, total: 500, unit: '篇', isLow: false },
  { key: 'banner', label: '轮播位配额', used: 8, total: 10, unit: '个', isLow: true, expireAt: '2024-06-30' },
  { key: 'storage', label: '存储空间', used: 45.2, total: 100, unit: 'GB', isLow: false, expireAt: '2025-01-01' },
  { key: 'api', label: 'API调用次数', used: 28500, total: 50000, unit: '次', isLow: false },
]

function formatValue(value: number | string, unit?: string): string {
  if (typeof value === 'number') {
    if (value >= 10000) return (value / 10000).toFixed(1) + '万' + (unit || '')
    return value.toLocaleString() + (unit || '')
  }
  return String(value)
}

function getRankStyle(rank: number): string {
  if (rank === 1) return 'bg-amber-500 text-white'
  if (rank === 2) return 'bg-gray-400 text-white'
  if (rank === 3) return 'bg-amber-700 text-white'
  return 'bg-muted text-muted-foreground'
}

function actionIcon(icon: string): string {
  const map: Record<string, string> = {
    megaphone: '', 'user-check': '', image: '️', 'bar-chart': '📊',
    'book-open': '', 'credit-card': '', users: '', wallet: '',
  }
  return map[icon] || '📌'
}

function goBack() { uni.navigateBack() }
function goPage(key: string) { uni.navigateTo({ url: `/mine/operator/${key}` }) }
function handleAction(action: any) { uni.navigateTo({ url: action.href }) }
function goFullRanking() { uni.navigateTo({ url: '/mine/operator/team-ranking' }) }
function goUpgradeQuota() { uni.navigateTo({ url: '/mine/operator/upgrade-quota' }) }

setTimeout(() => { loading.value = false }, 400)
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
