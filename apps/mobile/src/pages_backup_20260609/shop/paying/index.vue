<template>
  <view class="page"><view class="body"><text class="icon">⏳</text><text class="t">正在支付中...</text><text class="d">请稍候，正在处理您的支付</text><text class="hint">支付环境安全 🔒</text><view class="b" @click="cancel">取消支付</view></view></view>
</template>
<script setup lang="ts">function cancel(){uni.navigateBack()}</script>
<style scoped>.page{background:#FAF8F5;min-height:100vh;display:flex;align-items:center;justify-content:center}.body{text-align:center;padding:48rpx}.icon{font-size:80rpx;display:block;margin-bottom:24rpx;animation:pulse 1.5s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}.t{font-size:32rpx;font-weight:600;color:#2C2C2C;display:block;margin-bottom:12rpx}.d{font-size:26rpx;color:#999;display:block;margin-bottom:32rpx}.hint{font-size:22rpx;color:#22c55e;display:block;margin-bottom:48rpx}.b{padding:24rpx 80rpx;border:1px solid #E8E0D5;border-radius:40rpx;font-size:26rpx;color:#666;display:inline-block;background:#fff}
</style>
