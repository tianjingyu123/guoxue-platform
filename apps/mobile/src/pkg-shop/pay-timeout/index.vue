<template>
  <view class="pay-timeout">
    <!-- 顶部导航 -->
    <app-nav-bar title="支付结果" :back-size="44" :title-size="36" :title-weight="500" title-align="left" :bar-height="106" />

    <!-- 橙色渐变背景 -->
    <view class="hero">
      <view class="clock-wrap">
        <view class="clock-bg"><app-icon name="clock" :size="56" color="#FB923C" /></view>
        <view class="clock-ring" />
      </view>
      <text class="hero-title">支付超时</text>
      <text class="hero-sub">订单已超时，请重新发起支付</text>
      <view class="hero-amount">
        <text class="amt-label">订单金额</text>
        <text class="amt">¥{{ amount }}</text>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="content">
      <!-- 可能原因 -->
      <view class="card">
        <view class="card-head">
          <app-icon name="alert-circle" :size="34" color="#FB923C" />
          <text class="card-title">可能的原因</text>
        </view>
        <view class="reasons">
          <view v-for="(r, i) in reasons" :key="i" class="reason-item">
            <view class="reason-icon"><app-icon :name="r.icon" :size="28" color="#EA580C" /></view>
            <text class="reason-text">{{ r.text }}</text>
          </view>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="card">
        <text class="card-title block">订单信息</text>
        <view class="oi-row">
          <text class="oi-label">订单编号</text>
          <text class="oi-value mono">{{ orderId }}</text>
        </view>
        <view class="oi-row bordered">
          <text class="oi-label">超时时间</text>
          <text class="oi-value">{{ timeoutTime }}</text>
        </view>
        <view class="oi-row bordered">
          <text class="oi-label">订单状态</text>
          <text class="oi-value orange">待支付</text>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="blue-tip">
        <view class="blue-dot"><text>!</text></view>
        <view class="blue-content">
          <text class="blue-title">温馨提示</text>
          <text class="blue-text">如您已完成支付但显示超时，资金会在1-3个工作日内原路退回。如有疑问请联系客服。</text>
        </view>
      </view>
    </view>

    <!-- 底部固定按钮 -->
    <view class="footer">
      <view class="btn primary" @tap="goRePay">
        <app-icon name="refresh-cw" :size="34" color="#fff" />
        <text>重新支付</text>
      </view>
      <view class="btn-row">
        <view class="btn ghost" @tap="goChangeMethod">
          <app-icon name="repeat" :size="30" color="#666666" />
          <text>换个支付方式</text>
        </view>
        <view class="btn ghost" @tap="goOrder">
          <app-icon name="file-text" :size="30" color="#666666" />
          <text>查看订单</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, redirectTo } from '@/utils/router'
import { shopApi, payTimeoutReasons } from '@/lib/shop-data'

const orderId = ref('ORD20241201123456')
const amount = ref('344.00')
const timeoutTime = ref('')
const reasons = payTimeoutReasons

onLoad((q) => {
  if (q?.orderId) orderId.value = q.orderId as string
  if (q?.amount) amount.value = q.amount as string
  const d = new Date()
  timeoutTime.value = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function goRePay() { redirectTo(`/shop/paying?orderId=${orderId.value}`) }
function goChangeMethod() { navigateTo(`/shop/checkout?orderId=${orderId.value}`) }
function goOrder() { navigateTo(`/shop/orders/${orderId.value}`) }
</script>

<style lang="scss" scoped>
.pay-timeout { min-height: 100vh; background: #FAF8F5; padding-bottom: 280rpx; }
.hero {
  background: linear-gradient(180deg, #FB923C 0%, #F97316 100%);
  padding: 64rpx 32rpx 160rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.clock-wrap { position: relative; width: 160rpx; height: 160rpx; margin-bottom: 48rpx; }
.clock-bg {
  width: 160rpx;
  height: 160rpx;
  background: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.12);
}
.clock-ring {
  position: absolute;
  inset: 0;
  border: 8rpx solid transparent;
  border-top-color: rgba(255,255,255,0.5);
  border-radius: 50%;
  animation: spin 2s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.hero-title { font-size: 44rpx; font-weight: bold; color: #FFFFFF; margin-bottom: 16rpx; }
.hero-sub { font-size: 26rpx; color: rgba(255,255,255,0.9); margin-bottom: 32rpx; }
.hero-amount { display: flex; align-items: baseline; gap: 16rpx; }
.amt-label { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.amt { font-size: 60rpx; font-weight: bold; color: #FFFFFF; }
.content { padding: 0 32rpx; margin-top: -96rpx; display: flex; flex-direction: column; gap: 32rpx; }
.card { background: #FFFFFF; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 28rpx; }
.card-title { font-size: 30rpx; font-weight: 500; color: #2C2C2C; }
.card-title.block { display: block; margin-bottom: 24rpx; }
.reasons { display: flex; flex-direction: column; gap: 20rpx; }
.reason-item { display: flex; align-items: flex-start; gap: 16rpx; padding: 20rpx; background: #FFF7ED; border-radius: 16rpx; }
.reason-icon { width: 56rpx; height: 56rpx; background: #FFEDD5; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.reason-text { font-size: 26rpx; color: #666666; line-height: 1.5; flex: 1; }
.oi-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.oi-row.bordered { border-top: 1rpx solid #E8E3DB; }
.oi-label { font-size: 26rpx; color: #999999; }
.oi-value { font-size: 26rpx; color: #2C2C2C; }
.oi-value.orange { color: #F97316; font-weight: 500; }
.mono { font-family: monospace; }
.blue-tip { background: #EFF6FF; border: 1rpx solid #DBEAFE; border-radius: 20rpx; padding: 28rpx; display: flex; gap: 16rpx; }
.blue-dot { width: 36rpx; height: 36rpx; background: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.blue-dot text { color: #FFFFFF; font-size: 24rpx; font-weight: bold; }
.blue-content { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.blue-title { font-size: 26rpx; font-weight: 500; color: #1D4ED8; }
.blue-text { font-size: 24rpx; color: #1D4ED8; line-height: 1.6; }
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E3DB;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.btn {
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  &.primary { background: linear-gradient(90deg, #C41E3A, #E53935); color: #FFFFFF; }
  &.ghost { flex: 1; border: 1rpx solid #E8E3DB; color: #666666; }
}
.btn-row { display: flex; gap: 24rpx; }
</style>
