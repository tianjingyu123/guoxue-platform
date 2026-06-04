<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">‹</text>
      </view>
      <text class="nav-title">支付结果</text>
    </view>

    <!-- 橙色渐变背景 -->
    <view class="timeout-header">
      <view class="timeout-icon-group">
        <view class="timeout-icon-wrap">
          <text class="timeout-icon-clock">🕐</text>
        </view>
        <view class="timeout-ring" />
      </view>
      <text class="timeout-title">支付超时</text>
      <text class="timeout-desc">订单已超时，请重新发起支付</text>
      <view class="timeout-amount-row">
        <text class="timeout-amount-label">订单金额</text>
        <text class="timeout-amount-num">¥{{ amountStr }}</text>
      </view>
    </view>

    <!-- 内容 -->
    <view class="content-area">
      <!-- 可能原因 -->
      <view class="reasons-card">
        <view class="reasons-header">
          <text class="reasons-icon">⚠</text>
          <text class="reasons-title">可能的原因</text>
        </view>
        <view v-for="(reason, idx) in timeoutReasons" :key="idx" class="reason-item">
          <view class="reason-item-icon-wrap">
            <text class="reason-item-icon">{{ reason.icon }}</text>
          </view>
          <text class="reason-item-text">{{ reason.text }}</text>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="order-card">
        <text class="order-section-title">订单信息</text>
        <view class="order-detail-row">
          <text class="order-detail-label">订单编号</text>
          <text class="order-detail-value">{{ orderId }}</text>
        </view>
        <view class="order-detail-row">
          <text class="order-detail-label">超时时间</text>
          <text class="order-detail-time">{{ currentTime }}</text>
        </view>
        <view class="order-detail-row no-border">
          <text class="order-detail-label">订单状态</text>
          <text class="order-status">待支付</text>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="tips-card">
        <view class="tips-content">
          <view class="tips-icon-wrap">
            <text class="tips-icon-text">!</text>
          </view>
          <view class="tips-text">
            <text class="tips-title">温馨提示</text>
            <text class="tips-desc">如您已完成支付但显示超时，资金会在1-3个工作日内原路退回。如有疑问请联系客服。</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="btn-retry" @click="retryPay">
        <text class="btn-retry-icon">🔄</text>
        <text>重新支付</text>
      </view>
      <view class="btn-row">
        <view class="btn-switch" @click="switchPay">
          <text class="btn-switch-icon">🔄</text>
          <text>换个支付方式</text>
        </view>
        <view class="btn-order" @click="goOrder">
          <text class="btn-order-icon">🧾</text>
          <text>查看订单</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const orderId = ref('ORD20241201123456')
const amountStr = ref('344.00')
const currentTime = ref('')

const timeoutReasons = [
  { icon: '📶', text: '网络连接不稳定，请检查网络后重试' },
  { icon: '💳', text: '银行卡单笔/单日限额，请尝试换卡支付' },
  { icon: '📱', text: '支付App未响应，请确保支付App正常运行' },
]

onLoad((opts: any) => {
  orderId.value = opts?.orderId || 'ORD20241201123456'
  amountStr.value = opts?.amount || '344.00'
  currentTime.value = new Date().toLocaleString('zh-CN')
})

function goBack() { uni.navigateBack() }
function retryPay() { uni.navigateTo({ url: `/pages/shop/paying?orderId=${orderId.value}` }) }
function switchPay() { uni.navigateTo({ url: `/pages/shop/checkout?orderId=${orderId.value}` }) }
function goOrder() { uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderId.value}` }) }
</script>

<style scoped>
.page { background: #FAF8F5; min-height: 100vh; padding-bottom: 280rpx; }

.nav-bar { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-bottom: 2rpx solid #E8E3DB; padding: 24rpx 32rpx; display: flex; align-items: center; gap: 16rpx; }
.nav-back { padding: 8rpx; }
.nav-back-icon { font-size: 48rpx; color: #2C2C2C; }
.nav-title { font-size: 36rpx; font-weight: 500; color: #2C2C2C; }

/* 橙色头部 */
.timeout-header { background: linear-gradient(to bottom, #fb923c, #f97316); padding: 96rpx 32rpx 160rpx; text-align: center; }
.timeout-icon-group { position: relative; display: inline-block; margin-bottom: 48rpx; }
.timeout-icon-wrap { width: 160rpx; height: 160rpx; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15); }
.timeout-icon-clock { font-size: 80rpx; }
.timeout-ring { position: absolute; inset: 0; width: 160rpx; height: 160rpx; border: 8rpx solid transparent; border-top-color: rgba(255,255,255,0.5); border-radius: 50%; }
.timeout-title { font-size: 40rpx; font-weight: bold; color: #fff; margin-bottom: 12rpx; }
.timeout-desc { font-size: 26rpx; color: rgba(255,255,255,0.9); margin-bottom: 32rpx; }
.timeout-amount-row { color: rgba(255,255,255,0.8); font-size: 26rpx; }
.timeout-amount-label { }
.timeout-amount-num { font-size: 56rpx; font-weight: bold; color: #fff; margin-left: 12rpx; }

/* 内容 */
.content-area { padding: 0 24rpx; margin-top: -96rpx; display: flex; flex-direction: column; gap: 24rpx; }

.reasons-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.reasons-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; }
.reasons-icon { font-size: 36rpx; color: #f97316; }
.reasons-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.reason-item { display: flex; gap: 20rpx; padding: 20rpx; background: #FFF7ED; border-radius: 16rpx; margin-bottom: 12rpx; }
.reason-item-icon-wrap { width: 64rpx; height: 64rpx; background: #FED7AA; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.reason-item-icon { font-size: 28rpx; }
.reason-item-text { font-size: 26rpx; color: #666; line-height: 1.6; padding-top: 8rpx; }

.order-card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); }
.order-section-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 20rpx; }
.order-detail-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #E8E3DB; }
.order-detail-row.no-border { border-bottom: none; }
.order-detail-label { font-size: 26rpx; color: #999; }
.order-detail-value { font-size: 26rpx; color: #2C2C2C; font-family: monospace; }
.order-detail-time { font-size: 26rpx; color: #666; }
.order-status { font-size: 26rpx; color: #f97316; font-weight: 500; }

.tips-card { background: #EFF6FF; border-radius: 16rpx; padding: 32rpx; border: 2rpx solid #DBEAFE; }
.tips-content { display: flex; gap: 16rpx; }
.tips-icon-wrap { width: 40rpx; height: 40rpx; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.tips-icon-text { color: #fff; font-size: 24rpx; font-weight: bold; }
.tips-title { font-size: 26rpx; font-weight: 500; color: #1e40af; display: block; margin-bottom: 8rpx; }
.tips-desc { font-size: 24rpx; color: #1e40af; line-height: 1.6; }

/* 底部 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 2rpx solid #E8E3DB; padding: 24rpx 32rpx; display: flex; flex-direction: column; gap: 16rpx; }
.btn-retry { height: 88rpx; line-height: 88rpx; text-align: center; border-radius: 16rpx; background: linear-gradient(to right, #C41E3A, #E53935); color: #fff; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 12rpx; font-size: 30rpx; }
.btn-retry-icon { font-size: 36rpx; }
.btn-row { display: flex; gap: 16rpx; }
.btn-switch, .btn-order { flex: 1; height: 80rpx; line-height: 80rpx; text-align: center; border-radius: 16rpx; border: 2rpx solid #E8E3DB; color: #666; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8rpx; font-size: 26rpx; }
.btn-switch-icon, .btn-order-icon { font-size: 28rpx; }
</style>
