<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { BRAND } from '@/lib/brand'
import { navigateTo } from '@/utils/router'
</script>

<template>
  <view class="app-header">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: 'var(--status-bar-height, 44rpx)' }" />
    <view class="bar">
      <view class="brand">
        <view class="logo"><text class="logo-text">热</text></view>
        <text class="brand-name">{{ BRAND.name }}</text>
      </view>
      <view class="search" @tap="navigateTo('/pkg-im/search/index')">
        <app-icon name="search" :size="32" color="#999" />
        <text class="ph">搜索国学内容</text>
      </view>
      <view class="bell" @tap="navigateTo('/pkg-im/conversations/index')">
        <app-icon name="bell" :size="40" color="#2c2c2c" />
        <view class="dot" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 40;
  background: rgba(250, 248, 245, 0.95);
  backdrop-filter: blur(10rpx);
  border-bottom: 2rpx solid var(--line, #e8e0d5);
}
.bar { display: flex; align-items: center; gap: 20rpx; height: 88rpx; padding: 0 24rpx; max-width: 800rpx; margin: 0 auto; }
.brand { display: flex; align-items: center; gap: 12rpx; flex-shrink: 0; }
.logo { width: 56rpx; height: 56rpx; border-radius: 16rpx; background: var(--brand, #c41e3a); display: flex; align-items: center; justify-content: center; }
.logo-text { color: #fff; font-weight: 700; font-size: 28rpx; }
.brand-name { font-family: var(--font-serif); font-weight: 700; font-size: 32rpx; color: var(--text-ink, #2c2c2c); }
.search { flex: 1; display: flex; align-items: center; gap: 12rpx; height: 64rpx; padding: 0 24rpx; border-radius: 999rpx; background: var(--surface-sunken, #f2efea); }
.ph { font-size: 24rpx; color: #999; }
.bell { position: relative; padding: 8rpx; }
.dot { position: absolute; top: 6rpx; right: 6rpx; width: 12rpx; height: 12rpx; border-radius: 50%; background: var(--danger, #ff4d4f); }
</style>
