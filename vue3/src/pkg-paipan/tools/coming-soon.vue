<script setup lang="ts">
/** 功能开发中占位页——从原型 app/paipan/tools/coming-soon/page.tsx 1:1 迁移 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateBack } from '@/utils/router'

const toolName = ref('此功能')

onLoad((options) => {
  const name = options?.name
  if (name) {
    try {
      toolName.value = decodeURIComponent(name)
    } catch {
      toolName.value = name
    }
  }
})

function goBack() {
  navigateBack()
}
</script>

<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="topbar">
      <view class="topbar-back" @tap="goBack"><app-icon name="chevron-left" :size="44" color="var(--text-ink)" /></view>
      <text class="topbar-title">{{ toolName }}</text>
      <view class="topbar-spacer" />
    </view>

    <!-- 主内容 -->
    <view class="main">
      <view class="icon-circle">
        <app-icon name="clock" :size="60" color="#c41e3a" />
      </view>

      <text class="title">开发中</text>
      <text class="subtitle">{{ toolName }}正在紧锣密鼓地开发中{{ '\n' }}敬请期待</text>

      <view class="pill">
        <app-icon name="sparkles" :size="26" color="#c41e3a" />
        <text class="pill-t">即将上线</text>
      </view>

      <view class="home-btn" @tap="goBack"><text class="home-btn-t">返回首页</text></view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: var(--bg-paper); display: flex; flex-direction: column; }

.topbar { display: flex; align-items: center; padding: 12rpx 24rpx; padding-top: calc(12rpx + var(--status-bar-height, 0)); border-bottom: 2rpx solid var(--border); background: var(--card); }
.topbar-back { padding: 4rpx; margin-left: -4rpx; }
.topbar-title { flex: 1; text-align: center; font-size: 30rpx; font-weight: 700; color: var(--text-ink); padding-right: 48rpx; }
.topbar-spacer { width: 0; }

.main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64rpx; }
.icon-circle { width: 192rpx; height: 192rpx; border-radius: 50%; background: rgba(196, 30, 58, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }

.title { font-size: 48rpx; font-weight: 700; color: var(--text-ink); margin-bottom: 24rpx; }
.subtitle { font-size: 28rpx; color: var(--text-soft); text-align: center; line-height: 1.6; margin-bottom: 64rpx; white-space: pre-line; }

.pill { display: flex; align-items: center; gap: 12rpx; background: rgba(196, 30, 58, 0.1); padding: 16rpx 32rpx; border-radius: 999rpx; }
.pill-t { font-size: 26rpx; color: var(--brand); }

.home-btn { margin-top: 64rpx; padding: 24rpx 64rpx; background: var(--brand); border-radius: 20rpx; box-shadow: 0 8rpx 24rpx rgba(196, 30, 58, 0.3); }
.home-btn-t { font-size: 30rpx; font-weight: 500; color: #fff; }
</style>
