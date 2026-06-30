<template>
  <view class="downloads-page">
    <!-- 顶部导航 -->
    <view class="dl-header">
      <view class="dl-header-bar">
        <view class="dl-header-left">
          <view class="dl-back" @tap="goBack">
            <app-icon name="arrow-left" :size="44" color="#2D2A26" />
          </view>
          <text class="dl-title">下载管理</text>
        </view>
      </view>
    </view>

    <!-- 诚实降级：离线下载为端侧本地能力，后端暂无下载记录 -->
    <view class="dl-empty">
      <app-icon name="download" :size="96" color="rgba(201,169,110,0.5)" />
      <text class="dl-empty-text">离线下载功能即将开放</text>
      <text class="dl-empty-sub">下载的课程、古籍与电子书将在这里管理</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { goBack } from '@/utils/router'
</script>

<style lang="scss" scoped>
.downloads-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.dl-header {
  background: #faf8f5;
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.2);
  padding-top: var(--status-bar-height, 0);
}
.dl-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.dl-header-left { display: flex; align-items: center; gap: 24rpx; }
.dl-back { display: flex; align-items: center; }
.dl-title { font-size: 34rpx; font-weight: 600; color: #2d2a26; }

.dl-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 16rpx;
}
.dl-empty-text { font-size: 30rpx; color: #5c5c5c; margin-top: 24rpx; }
.dl-empty-sub { font-size: 24rpx; color: #999; }
</style>
