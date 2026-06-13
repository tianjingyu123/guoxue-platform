<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-white flex items-center justify-between px-4 py-3" style="border-bottom:1px solid #E8E0D5">
      <view @click="handleCancel" class="p-1">
        <text class="text-lg text-foreground">✕</text>
      </view>
      <text class="font-medium text-foreground">支付中</text>
      <view class="w-6" />
    </view>

    <!-- Main Content -->
    <view class="flex-1 flex flex-col items-center justify-center px-6">

      <!-- Paying -->
      <template v-if="status === 'paying'">
        <view class="relative mb-8">
          <view class="w-24 h-24 rounded-full flex items-center justify-center animate-pulse" :style="{ backgroundColor: getPayMethodColor() + '15' }">
            <view class="w-16 h-16 rounded-full flex items-center justify-center" :style="{ backgroundColor: getPayMethodColor() + '25' }">
              <view class="w-10 h-10 rounded-full" :style="{ backgroundColor: getPayMethodColor() }" />
            </view>
          </view>
          <view class="absolute inset-0 rounded-full animate-ping opacity-30" :style="{ backgroundColor: getPayMethodColor() }" />
        </view>
        <text class="text-xl font-bold text-foreground mb-2">正在支付中...</text>
        <text class="text-ink-soft mb-2">{{ getPayMethodName() }}</text>
        <text class="text-2xl font-bold text-primary mb-6">¥{{ amount }}</text>
        <view class="bg-white rounded-xl px-6 py-4 shadow-sm mb-6">
          <view class="flex items-center gap-2 text-ink-soft">
            <text class="text-sm"></text>
            <text>请在 <text class="text-primary font-bold">{{ countdown }}</text> 秒内完成支付</text>
          </view>
        </view>
        <view @click="handleCancel" class="text-ink-soft text-sm underline">取消支付</view>
      </template>

      <!-- Loading -->
      <template v-if="status === 'loading'">
        <view class="w-16 h-16 border-4 border-border border-t-[#C41E3A] rounded-full animate-spin mb-6" />
        <text class="text-ink-soft">正在准备支付...</text>
      </template>

      <!-- Success -->
      <template v-if="status === 'success'">
        <view class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <text class="text-4xl text-green-500"></text>
        </view>
        <text class="text-xl font-bold text-foreground mb-2">支付成功</text>
        <text class="text-ink-soft">正在跳转...</text>
      </template>

      <!-- Failed -->
      <template v-if="status === 'failed'">
        <view class="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <text class="text-4xl text-red-500"></text>
        </view>
        <text class="text-xl font-bold text-foreground mb-2">支付失败</text>
        <text class="text-ink-soft mb-6">{{ failReason || '请重新尝试' }}</text>
        <view class="flex gap-4">
          <view @click="goOrder" class="px-6 py-2 border border-border rounded-full text-ink-soft text-sm">返回订单</view>
          <view @click="handleRetry" class="px-6 py-2 bg-primary text-white rounded-full flex items-center gap-2 text-sm">
            <text class="text-sm"></text>
            <text>重新支付</text>
          </view>
        </view>
      </template>

      <!-- Timeout -->
      <template v-if="status === 'timeout'">
        <view class="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6">
          <text class="text-4xl text-orange-500"></text>
        </view>
        <text class="text-xl font-bold text-foreground mb-2">支付超时</text>
        <text class="text-ink-soft mb-6">未收到支付结果，请确认支付状态</text>
        <view class="flex gap-4">
          <view @click="goOrder" class="px-6 py-2 border border-border rounded-full text-ink-soft text-sm">查看订单</view>
          <view @click="handleRetry" class="px-6 py-2 bg-primary text-white rounded-full flex items-center gap-2 text-sm">
            <text class="text-sm"></text>
            <text>重新支付</text>
          </view>
        </view>
      </template>

      <!-- Cancelled -->
      <template v-if="status === 'cancelled'">
        <view class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <text class="text-4xl text-gray-500">✕</text>
        </view>
        <text class="text-xl font-bold text-foreground mb-2">支付已取消</text>
        <text class="text-ink-soft mb-6">您已取消本次支付</text>
        <view @click="goOrder" class="px-6 py-2 bg-primary text-white rounded-full text-sm">查看订单</view>
      </template>
    </view>

    <!-- Bottom Security -->
    <view class="pb-8 px-6">
      <view class="flex items-center justify-center gap-2 text-muted-foreground text-sm">
        <text class="text-sm">🛡️</text>
        <text>支付环境安全 · 资金加密保护</text>
      </view>
      <view class="mt-2 text-center text-xs text-muted-foreground">
        热卜国学 提供安全支付保障
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const orderId = ref('')
const payMethod = ref('wechat')
const amount = ref('0')
const status = ref<'loading' | 'paying' | 'success' | 'failed' | 'timeout' | 'cancelled'>('loading')
const countdown = ref(30)
const pollCount = ref(0)
const failReason = ref('')

const maxPolls = 10
const pollInterval = 3000
let pollTimer: ReturnType<typeof setTimeout> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

function clearAllTimers() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
}

onMounted(() => {
  // @ts-ignore
  const pages = getCurrentPages()
  // @ts-ignore
  const page = pages[pages.length - 1]
  // @ts-ignore
  if (page?.options) {
    orderId.value = page.options.orderId || ''
    payMethod.value = page.options.method || 'wechat'
    amount.value = page.options.amount || '0'
  }

  if (!orderId.value) {
    uni.redirectTo({ url: '/pages/shop/cart/index' })
    return
  }

  // Initialize payment after brief delay to show loading
  setTimeout(() => {
    status.value = 'paying'
    startPolling()
    startCountdown()
  }, 800)
})

onBeforeUnmount(() => {
  clearAllTimers()
})

function startPolling() {
  pollTimer = setTimeout(() => {
    if (pollCount.value >= maxPolls) {
      clearAllTimers()
      status.value = 'timeout'
      return
    }
    // Simulate polling
    const rand = Math.random()
    if (rand < 0.3) {
      clearAllTimers()
      status.value = 'success'
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/shop/pay-success/index?orderId=' + orderId.value })
      }, 1500)
    } else {
      pollCount.value++
      startPolling()
    }
  }, pollInterval)
}

function startCountdown() {
  countdownTimer = setInterval(() => {
    if (countdown.value <= 0) {
      clearAllTimers()
      status.value = 'timeout'
      return
    }
    countdown.value--
  }, 1000)
}

function getPayMethodName(): string {
  switch (payMethod.value) {
    case 'wechat': return '微信支付'
    case 'alipay': return '支付宝'
    case 'coins': return '学习币支付'
    default: return '在线支付'
  }
}

function getPayMethodColor(): string {
  switch (payMethod.value) {
    case 'wechat': return '#07C160'
    case 'alipay': return '#1677FF'
    case 'coins': return '#C9A96E'
    default: return '#C41E3A'
  }
}

function handleCancel() {
  clearAllTimers()
  status.value = 'cancelled'
  // Navigate after brief delay to show cancelled state
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/orders/id-detail/index?id=' + orderId.value })
  }, 500)
}

function handleRetry() {
  clearAllTimers()
  status.value = 'paying'
  countdown.value = 30
  pollCount.value = 0
  failReason.value = ''
  startPolling()
  startCountdown()
}

function goOrder() {
  clearAllTimers()
  uni.redirectTo({ url: '/pages/orders/id-detail/index?id=' + orderId.value })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
