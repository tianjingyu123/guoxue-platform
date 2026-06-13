<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="p-1" @click="goBack">
          <text class="text-xl">←</text>
        </view>
        <text class="text-lg font-semibold">积分兑换</text>
        <text class="text-xs text-primary" @click="goToHistory">记录</text>
      </view>
    </view>

    <!-- Loading骨架 -->
    <view v-if="loading">
      <view class="p-4 space-y-4">
        <view class="h-20 rounded-2xl" style="background: #e5e5e5; animation: pulse 2s infinite" />
        <view class="grid grid-cols-2 gap-3">
          <view v-for="i in 4" :key="i" class="h-36 rounded-xl" style="background: #e5e5e5; animation: pulse 2s infinite" />
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="flex flex-col items-center justify-center py-20">
      <text class="text-3xl mb-3">⚠</text>
      <text class="text-muted-foreground mb-4">{{ error }}</text>
      <view class="px-6 py-2 bg-primary text-white rounded-full text-sm" @click="loadData">重试</view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="exchangeItems.length === 0" class="flex flex-col items-center justify-center py-20">
      <text class="text-3xl mb-3">📦</text>
      <text class="text-muted-foreground">暂无兑换商品</text>
    </view>

    <template v-else-if="pointsInfo">
      <view class="pb-20">
        <!-- 积分余额 -->
        <view class="mx-4 mt-4 p-4 rounded-2xl flex items-center justify-between" style="background: #fffbeb; border: 1px solid #fde68a">
          <view>
            <text class="text-xs block mb-0.5" style="color: #b45309">当前积分</text>
            <text class="text-3xl font-bold block" style="color: #92400e">{{ pointsInfo.balance.toLocaleString() }}</text>
          </view>
          <view class="text-xs px-3 py-1.5 rounded-full" style="background: #fde68a; color: #b45309" @click="goToTasks">
            去做任务获取积分
          </view>
        </view>

        <!-- 分类筛选 -->
        <view class="mt-4 px-4">
          <view class="flex gap-2 overflow-x-auto pb-1">
            <view v-for="tab in tabs" :key="tab.key" class="px-3 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0" :class="activeType === tab.key ? 'text-white' : 'bg-muted'" :style="activeType === tab.key ? 'background: #f59e0b' : ''" @click="activeType = tab.key">{{ tab.label }}</view>
          </view>
        </view>

        <!-- 兑换商品网格 -->
        <view class="mx-4 mt-4 grid grid-cols-2 gap-3">
          <view v-for="item in filteredItems" :key="item.id" class="p-4 flex flex-col items-center text-center rounded-xl border" :class="TYPE_COLORS[item.type]" :style="{ opacity: pointsInfo.balance >= item.points ? 1 : 0.6 }">
            <view class="w-12 h-12 rounded-full flex items-center justify-center mb-2 bg-white/80">
              <text class="text-2xl">{{ ITEM_ICONS[item.icon] || '📦' }}</text>
            </view>
            <text class="text-sm font-semibold mb-1">{{ item.title }}</text>
            <text class="text-[10px] px-1.5 py-0.5 rounded mb-3 bg-muted">{{ TYPE_LABELS[item.type] }}</text>
            <text class="text-lg font-bold mb-1" style="color: #d97706">{{ item.points.toLocaleString() }} 积分</text>
            <text class="text-xs text-muted-foreground mb-3">库存 {{ item.stock > 100 ? '充足' : item.stock }}</text>
            <view class="w-full h-8 rounded-lg text-xs text-white flex items-center justify-center" :class="successId === item.id ? 'bg-green-500' : pointsInfo.balance >= item.points ? 'bg-amber-500' : 'bg-muted text-muted-foreground'" @click="handleExchange(item)">
              <text v-if="successId === item.id">✓ 兑换成功</text>
              <text v-else-if="exchanging === item.id">兑换中...</text>
              <text v-else-if="pointsInfo.balance >= item.points">立即兑换</text>
              <text v-else>积分不足</text>
            </view>
          </view>
        </view>

        <!-- 说明 -->
        <view class="mx-4 mt-6 p-4 rounded-xl bg-muted/50">
          <text class="text-sm font-semibold mb-2 block">兑换说明</text>
          <view class="text-xs text-muted-foreground space-y-1">
            <text class="block">• 优惠券和国学币兑换后实时到账</text>
            <text class="block">• 实物奖品将在 3-7 个工作日内寄出</text>
            <text class="block">• 兑换不支持退换，请谨慎操作</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface PointsInfo {
  balance: number; totalEarned: number; totalSpent: number; todayEarned: number
}

interface PointsExchangeItem {
  id: number; title: string; points: number; stock: number
  type: 'coupon' | 'coin' | 'vip' | 'gift'
  icon: string; color: string
}

const ITEM_ICONS: Record<string, string> = { Ticket: '🎫', Coins: '', Crown: '👑', Package: '📦' }
const TYPE_LABELS: Record<string, string> = { coupon: '优惠券', coin: '国学币', vip: '会员', gift: '实物' }
const TYPE_COLORS: Record<string, string> = {
  coupon: 'bg-red-50 border-red-100', coin: 'bg-amber-50 border-amber-100',
  vip: 'bg-yellow-50 border-yellow-100', gift: 'bg-green-50 border-green-100',
}

const tabs = [
  { key: 'all', label: '全部' }, { key: 'coupon', label: '优惠券' },
  { key: 'coin', label: '国学币' }, { key: 'vip', label: '会员' }, { key: 'gift', label: '实物' },
]

const loading = ref(true)
const error = ref<string | null>(null)
const pointsInfo = ref<PointsInfo | null>(null)
const exchangeItems = ref<PointsExchangeItem[]>([])
const exchanging = ref<number | null>(null)
const successId = ref<number | null>(null)
const activeType = ref<string>('all')

const filteredItems = computed(() =>
  activeType.value === 'all' ? exchangeItems.value : exchangeItems.value.filter(i => i.type === activeType.value)
)

onMounted(() => { loadData() })

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    await new Promise(r => setTimeout(r, 500))
    pointsInfo.value = { balance: 680, totalEarned: 1200, totalSpent: 520, todayEarned: 15 }
    exchangeItems.value = [
      { id: 1, title: '国学币10元兑换券', points: 100, stock: 999, type: 'coin', icon: 'Coins', color: 'text-amber-500' },
      { id: 2, title: '课程9折优惠券', points: 200, stock: 50, type: 'coupon', icon: 'Ticket', color: 'text-red-500' },
      { id: 3, title: '平台会员月卡', points: 500, stock: 30, type: 'vip', icon: 'Crown', color: 'text-yellow-500' },
      { id: 4, title: '国学书籍盲盒', points: 800, stock: 20, type: 'gift', icon: 'Package', color: 'text-green-500' },
      { id: 5, title: '50元国学币', points: 450, stock: 999, type: 'coin', icon: 'Coins', color: 'text-amber-500' },
    ]
  } catch {
    error.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

const handleExchange = async (item: PointsExchangeItem) => {
  if (!pointsInfo.value || pointsInfo.value.balance < item.points || exchanging.value !== null) return
  exchanging.value = item.id
  try {
    await new Promise(r => setTimeout(r, 1000))
    pointsInfo.value = {
      ...pointsInfo.value,
      balance: pointsInfo.value.balance - item.points,
      totalSpent: pointsInfo.value.totalSpent + item.points,
    }
    successId.value = item.id
    setTimeout(() => { successId.value = null }, 2000)
  } finally {
    exchanging.value = null
  }
}

function goBack() { uni.navigateBack() }
function goToHistory() { uni.navigateTo({ url: '/pages/points/history/index' }) }
function goToTasks() { uni.navigateTo({ url: '/pages/points/tasks/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
