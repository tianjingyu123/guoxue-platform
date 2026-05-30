<template>
  <view class="page result-page">
    <view class="result-icon timeout">
      <text class="icon-clock">&#9201;</text>
    </view>
    <text class="result-title">支付超时</text>
    <text class="result-desc">订单已超过支付时限，已被自动取消</text>
    <view class="btn-group">
      <button class="btn-primary" @tap="reorder">重新下单</button>
      <button class="btn-outline" @tap="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
const orderId = ref('')
function reorder() { uni.redirectTo({ url: '/pages/shop/shop' }) }
function goHome() { uni.switchTab({ url: '/pages/index/index' }) }
onLoad((opts: any) => { orderId.value = opts?.orderId || '' })
</script>

<style>
.result-page { display: flex; flex-direction: column; align-items: center; padding: 80rpx 40rpx; }
.result-icon { width: 140rpx; height: 140rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 30rpx; }
.result-icon.timeout { background: linear-gradient(135deg, #faad14, #ffc53d); }
.icon-clock { color: #fff; font-size: 64rpx; }
.result-title { font-size: 36rpx; color: #333; font-weight: 600; margin-bottom: 16rpx; }
.result-desc { font-size: 26rpx; color: #999; text-align: center; margin-bottom: 60rpx; padding: 0 40rpx; }
.btn-group { width: 100%; }
.btn-primary { background: #C41E3A; color: #fff; border-radius: 44rpx; font-size: 28rpx; margin-bottom: 20rpx; }
.btn-outline { background: transparent; border: 2rpx solid #C41E3A; color: #C41E3A; border-radius: 44rpx; font-size: 28rpx; }
</style>
