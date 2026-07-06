<template>
  <view class="paying">
    <!-- 顶部导航 -->
    <app-nav-bar title="支付中" back-icon="x" :back-size="44" :title-weight="500" :bar-height="106" custom-back @back="handleCancel" />

    <view class="main">
      <!-- 加载中 -->
      <block v-if="status === 'loading'">
        <view class="spinner" />
        <text class="sub">正在准备支付...</text>
      </block>

      <!-- 支付中 -->
      <block v-else-if="status === 'paying'">
        <view class="pay-logo">
          <view class="ring r1" :style="{ background: methodColor + '15' }">
            <view class="ring r2" :style="{ background: methodColor + '25' }">
              <view class="ring r3" :style="{ background: methodColor }" />
            </view>
          </view>
          <view class="ping" :style="{ background: methodColor }" />
        </view>
        <text class="title">正在支付中...</text>
        <text class="method-name">{{ methodName }}</text>
        <text class="amount">¥{{ amount }}</text>
        <view class="countdown-box">
          <app-icon name="alert-circle" :size="30" color="#666666" />
          <text class="cd-text">请在 <text class="cd-num">{{ countdown }}</text> 秒内完成支付</text>
        </view>
        <text class="cancel-link" @tap="handleCancel">取消支付</text>
      </block>

      <!-- 成功 -->
      <block v-else-if="status === 'success'">
        <view class="result-icon green"><app-icon name="check-circle" :size="72" color="#4CAF50" /></view>
        <text class="title">支付成功</text>
        <text class="sub">正在跳转...</text>
      </block>

      <!-- 失败 -->
      <block v-else-if="status === 'failed'">
        <view class="result-icon red"><app-icon name="x-circle" :size="72" color="#E74C3C" /></view>
        <text class="title">支付失败</text>
        <text class="sub">{{ failReason || '请重新尝试' }}</text>
        <view class="btn-row">
          <view class="btn ghost" @tap="handleCancel"><text>返回订单</text></view>
          <view class="btn primary" @tap="handleRetry"><app-icon name="refresh-cw" :size="30" color="#fff" /><text>重新支付</text></view>
        </view>
      </block>

      <!-- 超时 -->
      <block v-else-if="status === 'timeout'">
        <view class="result-icon orange"><app-icon name="alert-circle" :size="72" color="#FF9800" /></view>
        <text class="title">支付超时</text>
        <text class="sub">未收到支付结果，请确认支付状态</text>
        <view class="btn-row">
          <view class="btn ghost" @tap="goOrder"><text>查看订单</text></view>
          <view class="btn primary" @tap="handleRetry"><app-icon name="refresh-cw" :size="30" color="#fff" /><text>重新支付</text></view>
        </view>
      </block>

      <!-- 已取消 -->
      <block v-else-if="status === 'cancelled'">
        <view class="result-icon gray"><app-icon name="x" :size="72" color="#999999" /></view>
        <text class="title">支付已取消</text>
        <text class="sub">您已取消本次支付</text>
        <view class="btn primary single" @tap="goOrder"><text>查看订单</text></view>
      </block>
    </view>

    <!-- 底部安全提示 -->
    <view class="footer">
      <view class="safe-row">
        <app-icon name="shield" :size="30" color="#999999" />
        <text class="safe-text">支付环境安全 · 资金加密保护</text>
      </view>
      <text class="brand-tip">{{ BRAND.name }} 提供安全支付保障</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { redirectTo, navigateTo } from '@/utils/router'
import { shopApi } from '@/lib/shop-data'
import { track } from '@/composables/useTrack'
import { BRAND } from '@/lib/brand'

type Status = 'loading' | 'paying' | 'success' | 'failed' | 'timeout' | 'cancelled'

const orderId = ref('')
const payMethod = ref('wechat')
const amount = ref('0')
const status = ref<Status>('loading')
const countdown = ref(30)
const failReason = ref('')
const submitting = ref(false)

let cdTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0
const maxPolls = 10

const methodName = computed(() => {
  if (payMethod.value === 'wechat') return '微信支付'
  if (payMethod.value === 'alipay') return '支付宝'
  if (payMethod.value === 'coins') return '学习币支付'
  return '在线支付'
})
const methodColor = computed(() => {
  if (payMethod.value === 'wechat') return '#07C160'
  if (payMethod.value === 'alipay') return '#1677FF'
  if (payMethod.value === 'coins') return '#C9A96E'
  return '#C41E3A'
})

onLoad((q) => {
  orderId.value = (q?.orderId as string) || ''
  payMethod.value = (q?.method as string) || 'wechat'
  amount.value = (q?.amount as string) || '0'
  if (!orderId.value) {
    status.value = 'failed'
    failReason.value = '缺少订单信息'
    return
  }
  startPaying()
})

async function startPaying() {
  status.value = 'paying'
  countdown.value = 30
  pollCount = 0
  failReason.value = ''
  startCountdown()
  // #ifdef MP-WEIXIN
  // 微信小程序内：走 JSAPI 支付，唤起微信收银台（到账以支付回调为准）
  try {
    const p = await shopApi.payOrderJsapi(orderId.value)
    await new Promise<void>((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: p.timeStamp,
        nonceStr: p.nonceStr,
        package: p.package,
        signType: p.signType as 'MD5' | 'HMAC-SHA256' | 'RSA',
        paySign: p.paySign,
        success: () => resolve(),
        fail: (err: { errMsg?: string }) => reject(new Error(err?.errMsg?.includes('cancel') ? '支付已取消' : (err?.errMsg || '支付失败'))),
      })
    })
  } catch (e) {
    const msg = (e as Error)?.message || ''
    if (msg.includes('取消') || msg.includes('cancel')) {
      status.value = 'cancelled'
      clearTimers('all')
      return
    }
    // 唤起/支付失败不阻断：继续轮询订单状态以等待支付确认
    console.warn('[paying] JSAPI 支付未完成，继续轮询订单状态', e)
  }
  // #endif
  // #ifndef MP-WEIXIN
  // 非微信小程序端：发起微信 Native 扫码支付（本地无商户证书会失败，不阻断；回调或管理员确认置 PAID 后轮询可见）
  try {
    await shopApi.payOrderNative(orderId.value)
  } catch (e) {
    console.warn('[paying] 发起支付失败，继续轮询订单状态以等待支付确认', e)
  }
  // #endif
  startPolling()
}

function startCountdown() {
  clearTimers('cd')
  cdTimer = setInterval(() => {
    if (countdown.value <= 1) {
      status.value = 'timeout'
      clearTimers('all')
      return
    }
    countdown.value -= 1
  }, 1000)
}

function startPolling() {
  // 真实轮询订单支付状态（读订单 status，不依赖微信查单）
  pollTimer = setTimeout(async () => {
    if (status.value !== 'paying') return
    pollCount += 1
    try {
      const st = await shopApi.getOrderPayState(orderId.value)
      if (st.paid) {
        status.value = 'success'
        track.purchase({ type: 'shop_order', orderId: orderId.value, amount: amount.value, method: payMethod.value })
        clearTimers('all')
        setTimeout(() => redirectTo(`/shop/pay-success?orderId=${orderId.value}`), 1200)
        return
      }
    } catch (e) {
      console.warn('[paying] 查询订单状态失败', e)
    }
    if (pollCount >= maxPolls) {
      status.value = 'timeout'
      clearTimers('all')
    } else {
      startPolling()
    }
  }, 3000)
}

function clearTimers(which: 'cd' | 'poll' | 'all') {
  if ((which === 'cd' || which === 'all') && cdTimer) { clearInterval(cdTimer); cdTimer = null }
  if ((which === 'poll' || which === 'all') && pollTimer) { clearTimeout(pollTimer); pollTimer = null }
}

function handleCancel() {
  if (submitting.value) return
  submitting.value = true
  clearTimers('all')
  navigateTo(`/shop/orders/${orderId.value}`)
  setTimeout(() => { submitting.value = false }, 500)
}
function handleRetry() {
  if (submitting.value) return
  failReason.value = ''
  startPaying()
}
function goOrder() {
  navigateTo(`/shop/orders/${orderId.value}`)
}

onUnmounted(() => clearTimers('all'))
</script>

<style lang="scss" scoped>
.paying {
  min-height: 100vh;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
}
.spinner {
  width: 96rpx;
  height: 96rpx;
  border: 8rpx solid #E8E3DB;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 40rpx;
}
@keyframes spin { to { transform: rotate(360deg); } }
.pay-logo { position: relative; width: 192rpx; height: 192rpx; margin-bottom: 56rpx; }
.ring {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.r1 { width: 192rpx; height: 192rpx; animation: breathe 1.5s ease-in-out infinite; }
.r2 { width: 128rpx; height: 128rpx; }
.r3 { width: 80rpx; height: 80rpx; }
@keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
.ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0.3;
  animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
}
@keyframes ping { 75%,100% { transform: scale(1.6); opacity: 0; } }
.title { font-size: 40rpx; font-weight: bold; color: #2C2C2C; margin-bottom: 16rpx; }
.method-name { font-size: 28rpx; color: #666666; margin-bottom: 16rpx; }
.amount { font-size: 48rpx; font-weight: bold; color: var(--brand); margin-bottom: 48rpx; }
.countdown-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 48rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
  margin-bottom: 48rpx;
}
.cd-text { font-size: 28rpx; color: #666666; }
.cd-num { color: var(--brand); font-weight: bold; }
.cancel-link { font-size: 26rpx; color: #666666; text-decoration: underline; }
.result-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
  &.green { background: #E8F5E9; }
  &.red { background: #FDECEA; }
  &.orange { background: #FFF3E0; }
  &.gray { background: #F0F0F0; }
}
.sub { font-size: 28rpx; color: #666666; margin-bottom: 48rpx; }
.btn-row { display: flex; gap: 32rpx; }
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 0 48rpx;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  &.ghost { border: 1rpx solid #E8E3DB; color: #666666; }
  &.primary { background: var(--brand); color: #FFFFFF; }
  &.single { margin-top: 0; }
}
.footer { padding: 0 48rpx 64rpx; }
.safe-row { display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.safe-text { font-size: 24rpx; color: #999999; }
.brand-tip { display: block; text-align: center; font-size: 22rpx; color: #999999; margin-top: 12rpx; }
</style>
