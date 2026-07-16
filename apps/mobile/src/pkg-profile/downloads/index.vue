<template>
  <view class="page">
    <view class="header">
      <view class="nav">
        <view class="nav-back" @tap="back"><app-icon name="arrow-left" :size="40" color="#2c2c2c" /></view>
        <text class="nav-title">下载管理</text>
        <view class="nav-ph" />
      </view>
    </view>

    <!-- 诚实降级：离线下载为端侧本地能力，后端暂无下载记录与真实下载能力 -->
    <view class="empty">
      <app-icon name="download" :size="96" color="rgba(201,169,110,0.5)" />
      <text class="empty-text">离线下载功能即将开放</text>
      <text class="empty-sub">下载的课程、古籍与电子书将在这里管理</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { goBack } from '@/utils/router'
function back() { goBack() }
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid #e8e3db;
}
.nav { display: flex; align-items: center; justify-content: space-between; height: 112rpx; padding: 0 32rpx; }
.nav-back { width: 56rpx; }
.nav-title { font-size: 32rpx; font-weight: 600; color: #2c2c2c; }
.nav-ph { width: 56rpx; }
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 16rpx;
}
.empty-text { font-size: 30rpx; color: #5c5c5c; margin-top: 24rpx; }
.empty-sub { font-size: 24rpx; color: #999; }
</style>
