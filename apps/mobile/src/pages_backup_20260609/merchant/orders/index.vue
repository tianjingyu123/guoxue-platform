<template>
  <view class="page" data-v0-route="merchant/orders">
    
        <view class="placeholder">
          <view class="ph-icon">🏮</view>
          <text class="ph-title">订单</text>
          <text class="ph-sub">复杂度: 7/8</text>
          <text class="ph-route">路由: merchant/orders</text>
          <view class="ph-notice">
            <text class="ph-notice-text">此页面包含复杂交互组件</text>
            <text class="ph-notice-text">完整版本请查看 V0 源码或使用 v0-preview 页面</text>
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 48rpx;
  text-align: center;
}
.ph-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.ph-title { font-size: 36rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.ph-sub { font-size: 24rpx; color: #C9A96E; margin-bottom: 16rpx; }
.ph-route { font-size: 20rpx; color: #999; margin-bottom: 32rpx; }
.ph-notice { background: #FFF9F0; border: 1px solid #F0D89D; border-radius: 12rpx; padding: 24rpx; max-width: 600rpx; }
.ph-notice-text { font-size: 22rpx; color: #8B6914; display: block; margin-bottom: 8rpx; }

.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>