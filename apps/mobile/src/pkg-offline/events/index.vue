<template>
  <view class="ev-page">
    <view class="ev-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="ev-nav-bar">
        <view class="ev-back" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="ev-title">线下活动</text>
        <view class="ev-placeholder" />
      </view>
    </view>
    <view class="ev-empty" :style="{ paddingTop: navHeight + 'px' }">
      <app-icon name="calendar" :size="56" color="#d1d5db" />
      <text class="ev-empty-title">线下活动</text>
      <text class="ev-empty-desc">驿站线下活动报名功能正在筹备中。当前可在「线下课程」浏览并报名各驿站的线下课程。</text>
      <view class="ev-btn" @tap="goCourses"><text class="ev-btn-text">去看线下课程</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 后端暂无独立「线下活动 OfflineEvent」模型，且与驿站课程概念高度重叠，本轮占位降级。
// 线下课程（OfflineCourse）已覆盖线下活动性质的报名场景。
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

function goCourses() {
  navigateTo('/offline/courses')
}
</script>

<style scoped>
.ev-page { min-height: 100vh; background: #f5f5f7; }
.ev-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); border-bottom: 1px solid #ededed; }
.ev-nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.ev-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.ev-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.ev-placeholder { width: 32px; }
.ev-empty { display: flex; flex-direction: column; align-items: center; padding: 120px 40px 0; gap: 14px; }
.ev-empty-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.ev-empty-desc { font-size: 13px; color: #9ca3af; line-height: 1.6; text-align: center; }
.ev-btn { margin-top: 8px; padding: 10px 28px; background: var(--brand); border-radius: 999px; }
.ev-btn-text { font-size: 14px; color: #fff; }
</style>
