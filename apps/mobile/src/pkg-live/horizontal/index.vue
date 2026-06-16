<template>
  <view class="page">
    <!-- 横屏提示 - 手机竖屏时显示 -->
    <view class="rotate-tip">
      <view class="tip-inner">
        <view class="tip-icon">
          <AppIcon name="smartphone" :size="32" color="#fff" />
        </view>
        <text class="tip-title">请将手机横屏观看</text>
        <text class="tip-desc">或使用平板/电脑获得更好的学习体验</text>
        <view class="tip-back" @tap="goBack">返回直播列表</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppError from '@/components/common/app-error.vue'
import { goBack } from '@/utils/router'
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0f0f0f;
}
.rotate-tip {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tip-inner {
  text-align: center;
  padding: 0 64rpx;
}
.tip-icon {
  width: 128rpx;
  height: 128rpx;
  margin: 0 auto 32rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tip-title {
  display: block;
  font-size: 36rpx;
  font-weight: 500;
  color: #fff;
  margin-bottom: 16rpx;
}
.tip-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.6);
}
.tip-back {
  display: inline-block;
  margin-top: 48rpx;
  padding: 16rpx 48rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #fff;
}
</style>
