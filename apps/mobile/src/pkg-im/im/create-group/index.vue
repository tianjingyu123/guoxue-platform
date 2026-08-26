<template>
  <app-safe-area-top />
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="back-btn" @tap="goBack">
        <AppIcon name="arrow-left" :size="40" color="#2c2c2c" />
      </view>
      <text class="nav-title">创建群聊</text>
      <view class="nav-placeholder" />
    </view>

    <!-- 诚实降级说明：C 端用户不能自建群聊 -->
    <!-- 后端 POST /im/groups 为 ADMIN only（SUPER_ADMIN/OPERATION_ADMIN），群聊由圈主/管理员创建，
         C 端建群走不通，故引导到圈子而非提供假建群按钮（见记忆 guoxue-im-progress 群管理坑）。 -->
    <view class="guide">
      <view class="guide-icon">
        <AppIcon name="users" :size="72" color="#c41e3a" />
      </view>
      <text class="guide-title">群聊由圈主 / 管理员创建</text>
      <text class="guide-desc">为保障群秩序，本平台群聊统一由圈主或平台管理员创建。你可以进入感兴趣的圈子，加入对应的学习交流群。</text>

      <view class="guide-actions">
        <view class="guide-btn primary" @tap="goCircles">
          <text class="guide-btn-text light">去圈子看看</text>
        </view>
        <view class="guide-btn" @tap="goGroupList">
          <text class="guide-btn-text">我加入的群聊</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

function goCircles() {
  // 圈子为群聊的业务入口（圈主在圈内建群）；navigateTo 命中主 tab 自动 reLaunch
  navigateTo('/pages/circles/index')
}

function goGroupList() {
  navigateTo('/im/group-list')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: var(--status-bar-height, 0px);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 24rpx;
  height: 96rpx;
  padding: 0 32rpx;
  background: #faf8f5;
  border-bottom: 2rpx solid #e8e0d5;
}
.back-btn {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-placeholder {
  width: 40rpx;
}

/* 引导 */
.guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx 0;
}
.guide-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}
.guide-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 20rpx;
}
.guide-desc {
  font-size: 28rpx;
  color: #8a8178;
  line-height: 1.7;
  text-align: center;
  margin-bottom: 64rpx;
}
.guide-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.guide-btn {
  height: 96rpx;
  border-radius: 16rpx;
  border: 2rpx solid #e8e0d5;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.guide-btn.primary {
  background: var(--brand);
  border-color: var(--brand);
}
.guide-btn-text {
  font-size: 30rpx;
  color: #2c2c2c;
}
.guide-btn-text.light {
  color: #ffffff;
}
</style>
