<script setup lang="ts">
/** 老师邀约管理（诚实降级）
 *  后端 station 模块无师资邀约模型 → 不展示任何假数据，仅保留框架 + 「即将开放」空态。 */
import { ref } from 'vue'

const statusBarHeight = ref(20)
try {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
} catch (e) {}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => {} })
}
</script>

<template>
  <view class="tm">
    <!-- 顶部导航 -->
    <view class="tm-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="tm-header-inner">
        <view class="tm-header-left">
          <view class="tm-back" @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1f1f1f" /></view>
          <text class="tm-title">老师邀约管理</text>
        </view>
      </view>
    </view>

    <!-- 即将开放空态 -->
    <view class="tm-empty">
      <view class="tm-empty-icon"><app-icon name="hammer" :size="72" color="#C41E3A" /></view>
      <text class="tm-empty-title">师资邀约·功能完善中</text>
      <text class="tm-empty-sub">师资邀约功能完善中——正在打通研究院/线下师资库，敬请期待</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.tm { min-height: 100vh; background: var(--bg-paper, #faf8f5); display: flex; flex-direction: column; }

/* 顶部导航 */
.tm-header { position: sticky; top: 0; z-index: 50; background: var(--bg-paper, #faf8f5); border-bottom: 1rpx solid var(--line, #e8e0d5); }
.tm-header-inner { height: 96rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; }
.tm-header-left { display: flex; align-items: center; gap: 24rpx; }
.tm-back { padding: 8rpx; }
.tm-title { font-size: 30rpx; font-weight: 500; color: var(--text-strong, #1f1f1f); }

/* 即将开放空态 */
.tm-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 64rpx; gap: 24rpx; }
.tm-empty-icon { width: 144rpx; height: 144rpx; border-radius: 999rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; }
.tm-empty-title { font-size: 32rpx; font-weight: 600; color: var(--text-strong, #1f1f1f); }
.tm-empty-sub { font-size: 26rpx; color: var(--text-soft, #999); text-align: center; line-height: 1.6; }
</style>
