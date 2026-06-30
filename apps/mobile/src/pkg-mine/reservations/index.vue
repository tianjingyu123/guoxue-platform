<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <app-icon name="chevron-left" :size="44" color="#374151" />
      </view>
      <text class="nav-title">我的预约</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 诚实降级：暂无用户侧预约记录聚合接口 -->
    <view class="empty">
      <view class="empty-icon">
        <app-icon name="calendar-check" :size="48" color="#C9A96E" />
      </view>
      <text class="empty-title">预约记录即将开放</text>
      <text class="empty-desc">您的预约与占座记录将在此汇总，敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { goBack } from '@/utils/router'
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
  background: #fff;
  border-bottom: 2rpx solid #f3f4f6;
}
.nav-back {
  display: flex;
  align-items: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #111827;
}
.nav-placeholder {
  width: 44rpx;
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
  background: #f5f0e8;
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
