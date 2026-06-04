<template>
  <view class="page">
    <view class="error-zone">
      <view class="error-icon-wrap">
        <text class="error-icon">
          🔍
        </text>
      </view>
      <text class="error-title">
        404
      </text>
      <text class="error-desc">
        页面不存在或已被移除
      </text>
      <text class="error-tip">
        请检查链接是否正确，或返回首页重新浏览
      </text>
      <view class="action-group">
        <view
          class="btn"
          @click="goHome"
        >
          返回首页
        </view>
        <view
          class="btn outline"
          @click="goBack"
        >
          返回上一页
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.error-zone { text-align: center; padding: 64rpx; }
.error-icon-wrap { width: 160rpx; height: 160rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 32rpx; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.06); }
.error-icon { font-size: 64rpx; }
.error-title { font-size: 64rpx; font-weight: bold; color: #C41E3A; display: block; }
.error-desc { font-size: 28rpx; color: #666; display: block; margin-top: 12rpx; }
.error-tip { font-size: 24rpx; color: #999; display: block; margin-top: 24rpx; }
.action-group { display: flex; gap: 20rpx; justify-content: center; margin-top: 48rpx; }
.btn { padding: 18rpx 48rpx; background: #C41E3A; color: #fff; border-radius: 48rpx; font-size: 28rpx; }
.btn.outline { background: transparent; color: #C41E3A; border: 2rpx solid #C41E3A; }
</style>
