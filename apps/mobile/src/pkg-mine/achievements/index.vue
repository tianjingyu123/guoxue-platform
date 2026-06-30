<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <AppIcon name="arrow-left" :size="48" color="#2D2A26" />
      </view>
      <text class="nav-title">成就墙</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 诚实降级：成就系统后端暂未提供 -->
    <view class="empty">
      <view class="empty-icon">
        <AppIcon name="trophy" :size="48" color="#c9a96e" />
      </view>
      <text class="empty-title">成就系统即将开放</text>
      <text class="empty-desc">学习、社交、创作的里程碑成就将在这里点亮</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2a26;
}
.nav-placeholder {
  width: 48rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 220rpx 0;
  gap: 16rpx;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #fff9e6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}
.empty-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2d2a26;
}
.empty-desc {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  padding: 0 48rpx;
}
</style>
