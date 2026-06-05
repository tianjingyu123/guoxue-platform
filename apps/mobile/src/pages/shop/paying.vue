<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view
        class="nav-close"
        @click="handleCancel"
      >
        <text class="nav-close-icon">
          ✕
        </text>
      </view>
      <text class="nav-title">
        支付中
      </text>
      <view class="nav-spacer" />
    </view>

    <!-- 主内容 -->
    <view class="main-content">
      <!-- 支付中 -->
      <template v-if="status === 'paying'">
        <view class="paying-animation">
          <view
            class="paying-ring-outer"
            :style="{ backgroundColor: getPayMethodColor() + '15' }"
          >
            <view
              class="paying-ring-inner"
              :style="{ backgroundColor: getPayMethodColor() + '25' }"
            >
              <view
                class="paying-dot"
                :style="{ backgroundColor: getPayMethodColor() }"
              />
            </view>
          </view>
          <view
            class="paying-pulse"
            :style="{ backgroundColor: getPayMethodColor() }"
          />
        </view>
        <text class="status-title">
          正在支付中...
        </text>
        <text class="status-pay-method">
          {{ getPayMethodName() }}
        </text>
        <text class="status-amount">
          ¥{{ amountStr }}
        </text>

        <view class="countdown-card">
          <view class="countdown-content">
            <text class="countdown-icon">
              ⚠
            </text>
            <text>
              请在 <text class="countdown-num">
                {{ countdown }}
              </text> 秒内完成支付
            </text>
          </view>
        </view>

        <text
          class="cancel-link"
          @click="handleCancel"
        >
          取消支付
        </text>
      </template>

      <!-- 加载中 -->
      <template v-if="status === 'loading'">
        <view class="loading-spinner" />
        <text class="loading-text">
          正在准备支付...
        </text>
      </template>

      <!-- 支付成功 -->
      <template v-if="status === 'success'">
        <view class="result-icon-wrap green">
          <text class="result-icon-large">
            ✓
          </text>
        </view>
        <text class="status-title">
          支付成功
        </text>
        <text class="status-sub">
          正在跳转...
        </text>
      </template>

      <!-- 支付失败 -->
      <template v-if="status === 'failed'">
        <view class="result-icon-wrap red">
          <text class="result-icon-large">
            ✕
          </text>
        </view>
        <text class="status-title">
          支付失败
        </text>
        <text class="status-sub">
          {{ failReason || '请重新尝试' }}
        </text>
        <view class="result-actions">
          <view
            class="btn-outline"
            @click="handleCancel"
          >
            返回订单
          </view>
          <view
            class="btn-primary-sm"
            @click="handleRetry"
          >
            <text class="btn-retry-icon">
              🔄
            </text>
            <text>重新支付</text>
          </view>
        </view>
      </template>

      <!-- 支付超时 -->
      <template v-if="status === 'timeout'">
        <view class="result-icon-wrap orange">
          <text class="result-icon-large">
            ⚠
          </text>
        </view>
        <text class="status-title">
          支付超时
        </text>
        <text class="status-sub">
          未收到支付结果，请确认支付状态
        </text>
        <view class="result-actions">
          <view
            class="btn-outline"
            @click="goOrder"
          >
            查看订单
          </view>
          <view
            class="btn-primary-sm"
            @click="handleRetry"
          >
            <text class="btn-retry-icon">
              🔄
            </text>
            <text>重新支付</text>
          </view>
        </view>
      </template>

      <!-- 已取消 -->
      <template v-if="status === 'cancelled'">
        <view class="result-icon-wrap gray">
          <text class="result-icon-large">
            ✕
          </text>
        </view>
        <text class="status-title">
          支付已取消
        </text>
        <text class="status-sub">
          您已取消本次支付
        </text>
        <view
          class="btn-primary-sm"
          @click="goOrder"
        >
          查看订单
        </view>
      </template>
    </view>

    <!-- 底部安全提示 -->
    <view class="footer-safe">
      <view class="safe-row">
        <text class="safe-icon">
          🛡
        </text>
        <text class="safe-text">
          支付环境安全 · 资金加密保护
        </text>
      </view>
      <text class="safe-brand">
        热卜国学 提供安全支付保障
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { shopApi } from '../../api'

const orderId = ref('')
const method = ref('wechat')
const amountStr = ref('0')
const status = ref<'loading' | 'paying' | 'success' | 'failed' | 'timeout' | 'cancelled'>('loading')
const countdown = ref(30)
const pollCount = ref(0)
const failReason = ref('')

const maxPolls = 10
const pollInterval = 3000
let pollingTimer: ReturnType<typeof setTimeout> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.options || {}
  orderId.value = opts.orderId || ''
  method.value = opts.method || 'wechat'
  amountStr.value = opts.amount || '0'

  if (!orderId.value) {
    uni.redirectTo({ url: '/pages/shop/cart' })
    return
  }

  initPayment()
})

onUnmounted(() => {
  if (pollingTimer) clearTimeout(pollingTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})

function getPayMethodName() {
  switch (method.value) {
    case 'wechat': return '微信支付'
    case 'alipay': return '支付宝'
    case 'coins': return '学习币支付'
    default: return '在线支付'
  }
}

function getPayMethodColor() {
  switch (method.value) {
    case 'wechat': return '#07C160'
    case 'alipay': return '#1677FF'
    case 'coins': return '#C9A96E'
    default: return '#C41E3A'
  }
}

function getOpenid(): string {
  return uni.getStorageSync('openid') || ''
}

function getNotifyUrl(): string {
  return '/api/v1/shop/payments/notify'
}

async function initPayment() {
  try {
    await shopApi.jsapiPay(orderId.value, { openid: getOpenid(), notifyUrl: getNotifyUrl() })
    status.value = 'paying'
  } catch {
    status.value = 'paying'
  }
  startPolling()
  startCountdown()
}

function startPolling() {
  if (status.value !== 'paying') return
  if (pollCount.value >= maxPolls) {
    status.value = 'timeout'
    return
  }
  pollingTimer = setTimeout(async () => {
    const result = await checkPayment()
    if (result === 'pending') {
      pollCount.value++
      startPolling()
    }
  }, pollInterval)
}

async function checkPayment(): Promise<string> {
  if (!orderId.value) return 'pending'
  try {
    const result = await shopApi.queryPaymentStatus(orderId.value)
    if (result.status === 'paid') {
      status.value = 'success'
      setTimeout(() => {
        uni.redirectTo({ url: `/pages/shop/pay-success?orderId=${orderId.value}` })
      }, 1500)
      return 'paid'
    } else if (result.status === 'failed') {
      status.value = 'failed'
      failReason.value = result.failReason || '支付失败'
      return 'failed'
    } else if (result.status === 'cancelled') {
      status.value = 'cancelled'
      return 'cancelled'
    } else if (result.status === 'expired') {
      status.value = 'timeout'
      return 'expired'
    }
    return 'pending'
  } catch {
    return 'pending'
  }
}

function startCountdown() {
  if (status.value !== 'paying') return
  if (countdown.value <= 0) {
    status.value = 'timeout'
    return
  }
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer)
      status.value = 'timeout'
    }
  }, 1000)
}

function handleCancel() {
  if (pollingTimer) clearTimeout(pollingTimer)
  if (countdownTimer) clearInterval(countdownTimer)
  uni.redirectTo({ url: `/pages/orders/order-detail?id=${orderId.value}` })
}

function handleRetry() {
  status.value = 'paying'
  countdown.value = 30
  pollCount.value = 0
  failReason.value = ''
  startPolling()
  startCountdown()
}

function goOrder() {
  uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderId.value}` })
}
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; display: flex; flex-direction: column; }

.nav-bar { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 2rpx solid #E8E3DB; padding: 24rpx 32rpx; display: flex; align-items: center; justify-content: space-between; }
.nav-close { padding: 8rpx; }
.nav-close-icon { font-size: 48rpx; color: #2C2C2C; }
.nav-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.nav-spacer { width: 48rpx; }

.main-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 48rpx; }

.paying-animation { position: relative; margin-bottom: 64rpx; }
.paying-ring-outer { width: 192rpx; height: 192rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.paying-ring-inner { width: 128rpx; height: 128rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.paying-dot { width: 80rpx; height: 80rpx; border-radius: 50%; }
.paying-pulse { position: absolute; inset: 0; border-radius: 50%; opacity: 0.3; }

.loading-spinner { width: 128rpx; height: 128rpx; border: 8rpx solid #E8E3DB; border-top-color: #C41E3A; border-radius: 50%; animation: pay-spin 0.8s linear infinite; margin-bottom: 48rpx; }
@keyframes pay-spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 28rpx; color: #666; }

.status-title { font-size: 40rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 12rpx; }
.status-pay-method { font-size: 28rpx; color: #666; margin-bottom: 12rpx; }
.status-amount { font-size: 56rpx; font-weight: bold; color: #C41E3A; margin-bottom: 48rpx; }
.status-sub { font-size: 28rpx; color: #666; margin-bottom: 48rpx; }

.countdown-card { background: #fff; border-radius: 16rpx; padding: 32rpx 48rpx; margin-bottom: 48rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.countdown-content { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; color: #666; }
.countdown-icon { font-size: 28rpx; }
.countdown-num { color: #C41E3A; font-weight: bold; }

.cancel-link { font-size: 26rpx; color: #666; text-decoration: underline; }

.result-icon-wrap { width: 160rpx; height: 160rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.result-icon-wrap.green { background: #dcfce7; }
.result-icon-wrap.red { background: #fee2e2; }
.result-icon-wrap.orange { background: #FEF3C7; }
.result-icon-wrap.gray { background: #f3f4f6; }
.result-icon-large { font-size: 96rpx; }
.result-icon-wrap.green .result-icon-large { color: #22c55e; }
.result-icon-wrap.red .result-icon-large { color: #ef4444; }
.result-icon-wrap.orange .result-icon-large { color: #f59e0b; }
.result-icon-wrap.gray .result-icon-large { color: #9ca3af; }

.result-actions { display: flex; gap: 24rpx; margin-top: 16rpx; }
.btn-outline { padding: 16rpx 48rpx; border: 2rpx solid #E8E3DB; border-radius: 50rpx; font-size: 26rpx; color: #666; }
.btn-primary-sm { padding: 16rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 50rpx; font-size: 26rpx; display: flex; align-items: center; gap: 8rpx; }
.btn-retry-icon { font-size: 28rpx; }

.footer-safe { padding: 32rpx 48rpx 64rpx; text-align: center; }
.safe-row { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-bottom: 8rpx; }
.safe-icon { font-size: 28rpx; }
.safe-text { font-size: 26rpx; color: #999; }
.safe-brand { font-size: 22rpx; color: #999; }
</style>
