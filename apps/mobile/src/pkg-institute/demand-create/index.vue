<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-back" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="nav-title">发布师资需求</text>
        <view class="nav-placeholder" />
      </view>
    </view>
    <view class="empty" :style="{ paddingTop: navHeight + 'px' }">
      <app-icon name="hammer" :size="56" color="#d1d5db" />
      <text class="empty-title">发布师资需求</text>
      <text class="empty-desc">驿站发布授课师资需求归属「线下驿站」模块，正在对接中，敬请期待。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
// 该页本质属于 offline 线下驿站模块（驿站发起师资需求），本轮研究院模块仅占位降级，待 offline 模块上线时真连。
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(255,255,255,0.95); border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; padding: 0 12px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-placeholder { width: 32px; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120px 40px 0; gap: 14px; }
.empty-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.empty-desc { font-size: 13px; color: #9ca3af; line-height: 1.6; text-align: center; }
</style>
