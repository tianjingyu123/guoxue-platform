<template>
  <view class="ah-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">对话历史</text>
        <view class="header-spacer" />
      </view>
    </view>

    <view class="ah-body">
      <view class="ah-empty">
        <text class="ah-empty-icon">💬</text>
        <text class="ah-empty-title">暂无对话记录</text>
        <text class="ah-empty-desc">去智能体广场探索各类AI助手，开启你的国学之旅</text>
        <view class="ah-empty-btn" @click="goPage('/pages/agents/index')">
          <text>探索智能体广场</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.ah-page { min-height: 100vh; background: #FAF8F5; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.ah-body { padding: 24rpx; }
.ah-empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.ah-empty-icon { font-size: 120rpx; opacity: 0.3; margin-bottom: 24rpx; }
.ah-empty-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 10rpx; }
.ah-empty-desc { font-size: 24rpx; color: #999; text-align: center; margin-bottom: 32rpx; }
.ah-empty-btn { padding: 16rpx 40rpx; background: #C41E3A; border-radius: 28rpx; }
.ah-empty-btn text { font-size: 26rpx; color: #fff; }
</style>
