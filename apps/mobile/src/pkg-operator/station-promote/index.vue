<template>
  <view class="promote-page">
    <!-- 导航栏 -->
    <view class="promote-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="promote-nav-inner">
        <view class="promote-nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#374151" />
        </view>
        <text class="promote-nav-title">推广中心</text>
        <view class="promote-nav-btn" />
      </view>
    </view>

    <!-- 即将开放空态 -->
    <view class="promote-empty">
      <view class="promote-empty-icon"><app-icon name="hammer" :size="72" color="#8B5CF6" /></view>
      <text class="promote-empty-title">选品推广·功能完善中</text>
      <text class="promote-empty-sub">选品推广功能完善中——即将支持从平台课程/商品一键生成推广素材</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}
</script>

<style lang="scss" scoped>
.promote-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}
.promote-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1rpx solid #f3f4f6;
}
.promote-nav-inner {
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}
.promote-nav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.promote-nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #111827;
}

.promote-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 64rpx;
  gap: 24rpx;
}
.promote-empty-icon {
  width: 144rpx;
  height: 144rpx;
  border-radius: 999rpx;
  background: rgba(139, 92, 246, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.promote-empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #111827;
}
.promote-empty-sub {
  font-size: 26rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
}
</style>
