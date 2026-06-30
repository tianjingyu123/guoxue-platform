<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="20" color="#2D2A26" />
      </view>
      <text class="nav-title">我的申请</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 诚实降级：暂无用户侧申请记录聚合接口 -->
    <view class="empty">
      <view class="empty-icon">
        <app-icon name="file-text" :size="48" color="#C9A96E" />
      </view>
      <text class="empty-title">申请记录即将开放</text>
      <text class="empty-desc">您的各类申请记录将在此汇总，敬请期待</text>
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
  height: 88rpx;
  padding: 0 24rpx;
  background: #faf8f5;
  border-bottom: 1rpx solid rgba(201, 169, 110, 0.2);
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2d2a26;
}
.nav-placeholder {
  width: 64rpx;
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
