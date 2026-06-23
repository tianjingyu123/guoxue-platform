<template>
  <view class="pay-fail">
    <!-- 红色顶部背景 -->
    <view class="hero" :style="{ paddingTop: 'calc(120rpx + var(--status-bar-height, 0px))' }">
      <view class="deco deco1" />
      <view class="deco deco2" />
      <view class="hero-inner">
        <view class="fail-icon-wrap">
          <view class="fail-ping" />
          <view class="fail-icon">
            <app-icon name="x" :size="72" color="#C41E3A" />
          </view>
        </view>
        <text class="hero-title">{{ failInfo.title }}</text>
        <view class="hero-amount">
          <text class="yen">¥</text>
          <text class="amt">{{ amountText }}</text>
        </view>
      </view>
    </view>

    <!-- 失败原因卡片 -->
    <view class="card-wrap">
      <view class="fail-card">
        <view class="reason-head">
          <view class="reason-icon"><app-icon :name="failInfo.icon" :size="36" color="#C41E3A" /></view>
          <view class="reason-text">
            <text class="reason-title">{{ failInfo.title }}</text>
            <text class="reason-desc">{{ failInfo.desc }}</text>
          </view>
        </view>
        <view class="order-info">
          <view class="oi-row">
            <text class="oi-label">订单编号</text>
            <text class="oi-value mono">{{ orderId || '—' }}</text>
          </view>
          <view class="oi-row">
            <text class="oi-label">失败时间</text>
            <text class="oi-value">{{ failTime }}</text>
          </view>
        </view>
        <view class="actions">
          <view class="btn primary" @tap="goRePay">
            <app-icon name="refresh-cw" :size="34" color="#fff" />
            <text>重新支付</text>
          </view>
          <view class="btn ghost" @tap="goChangeMethod">
            <app-icon name="credit-card" :size="34" color="#2C2C2C" />
            <text>换个方式支付</text>
          </view>
          <view class="btn text" @tap="goOrder">
            <app-icon name="file-text" :size="34" color="#666666" />
            <text>查看订单详情</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 温馨提示 -->
    <view class="tips-wrap">
      <view class="tip-box">
        <app-icon name="alert-circle" :size="34" color="#FB923C" />
        <view class="tip-content">
          <text class="tip-title">温馨提示</text>
          <text class="tip-li">• 请检查支付账户余额是否充足</text>
          <text class="tip-li">• 确保网络连接稳定后重试</text>
          <text class="tip-li">• 如多次失败，请尝试其他支付方式</text>
          <text class="tip-li">• 订单将保留30分钟，请尽快完成支付</text>
        </view>
      </view>
    </view>

    <view class="bottom-back">
      <text @tap="goShop">返回商城首页</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, redirectTo } from '@/utils/router'
import { shopApi, payFailReasons } from '@/lib/shop-data'

const orderId = ref('')
const reason = ref('default')
const amount = ref('0')
const failTime = ref('')

onLoad((q) => {
  orderId.value = (q?.orderId as string) || ''
  reason.value = (q?.reason as string) || 'default'
  amount.value = (q?.amount as string) || '344'
  const d = new Date()
  failTime.value = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

const failInfo = computed(() => payFailReasons[reason.value] || payFailReasons.default)
const amountText = computed(() => parseFloat(amount.value || '0').toFixed(2))

function goRePay() { redirectTo(`/shop/paying?orderId=${orderId.value}`) }
function goChangeMethod() { navigateTo(`/shop/checkout?orderId=${orderId.value}`) }
function goOrder() { navigateTo(`/orders/${orderId.value}`) }
function goShop() { navigateTo('/shop') }
</script>

<style lang="scss" scoped>
.pay-fail { min-height: 100vh; background: #FAF8F5; }
.hero {
  position: relative;
  background: linear-gradient(180deg, #C41E3A 0%, #E8534A 100%);
  padding-bottom: 192rpx;
  overflow: hidden;
}
.deco { position: absolute; border: 1rpx solid rgba(255,255,255,0.1); border-radius: 50%; }
.deco1 { top: 80rpx; right: 80rpx; width: 256rpx; height: 256rpx; }
.deco2 { top: 160rpx; right: 160rpx; width: 160rpx; height: 160rpx; }
.hero-inner { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
.fail-icon-wrap { position: relative; width: 192rpx; height: 192rpx; }
.fail-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;
}
@keyframes ping { 75%,100% { transform: scale(1.6); opacity: 0; } }
.fail-icon {
  position: relative;
  width: 192rpx;
  height: 192rpx;
  background: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15);
  animation: shake 0.5s ease-in-out;
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  10%,30%,50%,70%,90% { transform: translateX(-10rpx); }
  20%,40%,60%,80% { transform: translateX(10rpx); }
}
.hero-title { margin-top: 48rpx; font-size: 44rpx; font-weight: bold; color: #FFFFFF; }
.hero-amount { margin-top: 16rpx; display: flex; align-items: baseline; color: rgba(255,255,255,0.9); }
.yen { font-size: 26rpx; }
.amt { font-size: 60rpx; font-weight: bold; margin-left: 8rpx; }
.card-wrap { padding: 0 32rpx; margin-top: -96rpx; position: relative; z-index: 10; }
.fail-card { background: #FFFFFF; border-radius: 24rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.06); padding: 40rpx; }
.reason-head { display: flex; align-items: center; gap: 20rpx; padding-bottom: 32rpx; border-bottom: 1rpx solid #E8E3DB; }
.reason-icon { width: 88rpx; height: 88rpx; border-radius: 50%; background: #FDECEA; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.reason-text { display: flex; flex-direction: column; gap: 6rpx; }
.reason-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.reason-desc { font-size: 24rpx; color: #999999; }
.order-info { margin-top: 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
.oi-row { display: flex; justify-content: space-between; align-items: center; }
.oi-label { font-size: 26rpx; color: #999999; }
.oi-value { font-size: 26rpx; color: #2C2C2C; }
.mono { font-family: monospace; }
.actions { margin-top: 48rpx; display: flex; flex-direction: column; gap: 24rpx; }
.btn {
  height: 92rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 500;
  &.primary { background: linear-gradient(90deg, #C41E3A, #E8534A); color: #FFFFFF; }
  &.ghost { background: #FAF8F5; color: #2C2C2C; }
  &.text { color: #666666; }
}
.tips-wrap { padding: 32rpx 32rpx 0; }
.tip-box { background: #FFF7ED; border-radius: 20rpx; padding: 28rpx; display: flex; gap: 16rpx; }
.tip-content { display: flex; flex-direction: column; gap: 8rpx; flex: 1; }
.tip-title { font-size: 26rpx; font-weight: 500; color: #C2410C; }
.tip-li { font-size: 24rpx; color: #EA580C; line-height: 1.5; }
.bottom-back { padding: 48rpx; text-align: center; }
.bottom-back text { font-size: 26rpx; color: #999999; }
</style>
