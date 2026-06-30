<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="nav-back" @tap="goBack">
          <AppIcon name="arrow-left" :size="20" color="#1f2937" />
        </view>
        <text class="nav-title">分站公告</text>
      </view>
    </view>

    <!-- 即将开放空态 -->
    <view class="empty" :style="{ paddingTop: navbarHeight + 'px' }">
      <view class="empty-icon"><AppIcon name="hammer" :size="36" color="#dc2626" /></view>
      <text class="empty-title">分站公告·功能完善中</text>
      <text class="empty-sub">分站公告功能即将开放</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'

const sys = uni.getSystemInfoSync()
const statusBarHeight = sys.statusBarHeight || 20
const navbarHeight = statusBarHeight + 44

function goBack() {
  navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f9fafb;
}

/* 顶部导航 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e7eb;
}
.navbar-inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 32rpx;
}
.nav-back {
  padding: 8rpx;
  margin-right: 24rpx;
}
.nav-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2937;
}

/* 即将开放空态 */
.empty {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-left: 64rpx;
  padding-right: 64rpx;
  gap: 24rpx;
}
.empty-icon {
  width: 144rpx;
  height: 144rpx;
  border-radius: 999rpx;
  background: rgba(220, 38, 38, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}
.empty-sub {
  font-size: 26rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
}
</style>
