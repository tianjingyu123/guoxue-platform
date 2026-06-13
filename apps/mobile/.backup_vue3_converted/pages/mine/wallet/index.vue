<template>
  <view class="min-h-screen bg-background pb-20">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="font-semibold text-foreground">我的钱包</text>
        <view class="w-8" />
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-48 bg-muted rounded-2xl animate-pulse" />
      <view class="space-y-3">
        <view v-for="i in 3" :key="i" class="h-24 bg-muted rounded-xl animate-pulse" />
      </view>
    </view>

    <template v-else>
      <!-- Balance Card -->
      <view class="mx-4 mt-4 p-6 bg-gradient-to-br from-primary to-red-700 rounded-2xl text-white">
        <view class="flex items-start justify-between mb-6">
          <view>
            <text class="text-sm opacity-80 mb-1 block">国学币余额</text>
            <text class="text-4xl font-bold block">{{ walletInfo.balance }}</text>
            <text class="text-sm opacity-70 mt-1 block">≈ ¥{{ walletInfo.rmb }}</text>
          </view>
          <view class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <text class="text-white text-2xl">⚡</text>
          </view>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view @click="goRecharge" class="py-2.5 bg-white/20 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1">
            <text></text>
            <text>充值</text>
          </view>
          <view @click="goWithdraw" class="py-2.5 bg-white/20 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1">
            <text></text>
            <text>提现</text>
          </view>
        </view>
      </view>

      <!-- Level Card -->
      <view class="mx-4 mt-4 p-4 bg-white rounded-xl border border-border">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-3">
            <view class="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
              <text>{{ walletInfo.level }}</text>
            </view>
            <view>
              <text class="font-semibold text-foreground block">会员 {{ walletInfo.level }} 级</text>
              <text class="text-sm text-muted-foreground block">已累积 {{ walletInfo.growthValue }} 成长值</text>
            </view>
          </view>
          <text class="text-amber-500 text-lg">📈</text>
        </view>
        <view class="space-y-2">
          <view class="flex items-center justify-between text-sm">
            <text class="text-muted-foreground">升级进度</text>
            <text class="text-foreground font-medium">{{ walletInfo.growthValue }}/{{ walletInfo.nextLevelGrowth }}</text>
          </view>
          <view class="h-2 bg-muted rounded-full overflow-hidden">
            <view class="h-full bg-primary rounded-full" :style="{ width: levelProgress + '%' }" />
          </view>
        </view>
      </view>

      <!-- Stats -->
      <view class="mx-4 mt-4 grid grid-cols-2 gap-3">
        <view class="bg-white rounded-xl p-4 text-center border border-border">
          <text class="text-xs text-muted-foreground mb-1 block">累计充值</text>
          <text class="text-2xl font-bold text-foreground block">¥{{ walletInfo.totalRecharge }}</text>
        </view>
        <view class="bg-white rounded-xl p-4 text-center border border-border">
          <text class="text-xs text-muted-foreground mb-1 block">累计消费</text>
          <text class="text-2xl font-bold text-foreground block">¥{{ walletInfo.totalSpent }}</text>
        </view>
      </view>

      <view class="mx-4 mt-3 grid grid-cols-2 gap-3">
        <view class="bg-white rounded-xl p-4 text-center border border-border">
          <text class="text-xs text-muted-foreground mb-1 block">积分</text>
          <text class="text-2xl font-bold text-foreground block">{{ walletInfo.points }}</text>
        </view>
        <view class="bg-white rounded-xl p-4 text-center border border-border">
          <text class="text-xs text-muted-foreground mb-1 block">成长值</text>
          <text class="text-2xl font-bold text-foreground block">{{ walletInfo.growthValue }}</text>
        </view>
      </view>

      <!-- Quick Recharge -->
      <view class="mx-4 mt-6">
        <text class="text-sm font-semibold text-foreground mb-3 block">快速充值</text>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="(opt, idx) in rechargeOptions" :key="idx" @click="goRecharge" :class="['p-3 rounded-xl border', opt.popular ? 'border-primary bg-primary/5' : 'border-border']">
            <text v-if="opt.popular" class="text-xs font-medium text-primary block mb-1">推荐</text>
            <text class="font-semibold text-foreground block">{{ opt.coins }}</text>
            <text class="text-xs text-muted-foreground block">¥{{ opt.price }}</text>
            <text v-if="opt.bonus > 0" class="text-xs text-amber-500 mt-1 block">+送{{ opt.bonus }}币</text>
          </view>
        </view>
        <view @click="goRecharge" class="w-full mt-4 py-3 bg-primary text-white rounded-xl text-sm flex items-center justify-center">
          <text>查看更多充值方案</text>
        </view>
      </view>

      <!-- Recent Transactions -->
      <view v-if="transactions.length > 0" class="mx-4 mt-6">
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-semibold text-foreground">最近交易</text>
          <view @click="goTransactions" class="text-xs text-primary">
            <text>查看全部</text>
          </view>
        </view>
        <view class="space-y-2">
          <view v-for="t in transactions.slice(0, 5)" :key="t.id" @click="goTransactions" class="flex items-center gap-3 p-3 bg-white rounded-lg border border-border">
            <view class="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <text>{{ getTxIcon(t.type) }}</text>
            </view>
            <view class="flex-1">
              <text class="text-sm font-medium text-foreground block">{{ t.title }}</text>
              <text class="text-xs text-muted-foreground block">{{ t.time }}</text>
            </view>
            <text :class="['text-sm font-semibold', t.amount > 0 ? 'text-green-600' : 'text-foreground']">{{ t.amount > 0 ? '+' : '' }}{{ t.amount }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const loading = ref(true)

const walletInfo = ref({
  balance: 888.88,
  rmb: 888.88,
  level: 4,
  growthValue: 3250,
  nextLevelGrowth: 5000,
  totalRecharge: 2999.00,
  totalSpent: 1280.50,
  points: 2580,
})

const rechargeOptions = [
  { coins: '50 币', price: 50, bonus: 0, popular: false },
  { coins: '100 币', price: 98, bonus: 5, popular: true },
  { coins: '300 币', price: 288, bonus: 20, popular: false },
  { coins: '500 币', price: 468, bonus: 50, popular: false },
]

const transactions = ref([
  { id: '1', type: 'recharge', title: '充值', amount: 100, time: '2024-01-15 10:30' },
  { id: '2', type: 'spend', title: '购买课程', amount: -59.9, time: '2024-01-14 14:20' },
  { id: '3', type: 'bonus', title: '奖励', amount: 20, time: '2024-01-13 09:00' },
])

const levelProgress = computed(() => Math.round((walletInfo.value.growthValue / walletInfo.value.nextLevelGrowth) * 100))

function getTxIcon(type: string): string {
  const map: Record<string, string> = { recharge: '', spend: '️', bonus: '🎁', refund: '↩️' }
  return map[type] || '⚡'
}

function goBack() { uni.navigateBack() }
function goRecharge() { uni.navigateTo({ url: '/pages/wallet/recharge/index' }) }
function goWithdraw() { uni.navigateTo({ url: '/pages/wallet/withdraw/index' }) }
function goTransactions() { uni.navigateTo({ url: '/pages/wallet/transactions/index' }) }

setTimeout(() => { loading.value = false }, 400)
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
