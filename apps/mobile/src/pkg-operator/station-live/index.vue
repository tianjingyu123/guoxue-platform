<template>
  <view class="lv-page">
    <!-- 导航栏 (渐变) -->
    <view class="lv-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="lv-nav">
        <view class="lv-hbtn" @tap="goBack"><app-icon name="arrow-left" :size="40" color="#ffffff" /></view>
        <view class="lv-station">
          <text class="lv-station-name">分站直播</text>
        </view>
        <view class="lv-hbtn" />
      </view>
    </view>

    <!-- 即将开放空态 -->
    <view class="lv-empty">
      <view class="lv-empty-icon"><app-icon name="hammer" :size="72" color="#C41E3A" /></view>
      <text class="lv-empty-title">站长直播·功能完善中</text>
      <text class="lv-empty-sub">站长直播功能完善中——正在打通平台直播模块，敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const statusBarHeight = ref(20)
uni.getSystemInfo({ success: (r) => { statusBarHeight.value = r.statusBarHeight || 20 } })

function goBack() { uni.navigateBack({ fail: () => navigateTo('/pages/index/index') }) }
</script>

<style scoped lang="scss">
.lv-page { min-height: 100vh; background: #FAF8F5; display: flex; flex-direction: column; }

.lv-header { position: sticky; top: 0; z-index: 50; background: linear-gradient(90deg, var(--brand), #A01830); }
.lv-nav { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 16rpx; }
.lv-hbtn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.lv-station { display: flex; align-items: center; gap: 12rpx; }
.lv-station-name { font-size: 30rpx; font-weight: 500; color: #fff; }

.lv-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 64rpx; gap: 24rpx; }
.lv-empty-icon { width: 144rpx; height: 144rpx; border-radius: 999rpx; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; }
.lv-empty-title { font-size: 32rpx; font-weight: 600; color: #111827; }
.lv-empty-sub { font-size: 26rpx; color: #9ca3af; text-align: center; line-height: 1.6; }
</style>
