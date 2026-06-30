<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="nav-bar">
        <view class="back-btn" @click="goBack">
          <app-icon name="arrow-left" :size="22" color="#1a1a1a" />
        </view>
        <text class="nav-title">草稿箱</text>
        <view class="nav-placeholder" />
      </view>
    </view>

    <!-- 诚实降级：内容草稿后端暂未提供，空态引导 -->
    <view class="content">
      <view class="empty">
        <view class="empty-icon">
          <app-icon name="file-text" :size="40" color="#d1d5db" />
        </view>
        <text class="empty-title">草稿功能即将开放</text>
        <text class="empty-desc">发布内容时保存的草稿将在这里展示</text>
        <view class="empty-btn" @click="goPublish">
          <text class="empty-btn-text">去发布内容</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { navigateBack, navigateTo } from '@/utils/router'

function goPublish() {
  navigateTo('/publish')
}
function goBack() {
  navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(245, 245, 245, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1rpx solid #ececec;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 112rpx;
}
.back-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.nav-placeholder {
  width: 72rpx;
}
.content {
  padding: 32rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}
.empty-icon {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  background: #ececec;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.empty-title {
  font-size: 28rpx;
  color: #888;
  margin-bottom: 8rpx;
}
.empty-desc {
  font-size: 24rpx;
  color: #aaa;
  margin-bottom: 32rpx;
}
.empty-btn {
  padding: 20rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.empty-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
</style>
