<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, toastComingSoon } from '@/utils/router'

interface Entry { id: string; name: string; icon: string; color: string; bg: string; badge?: string; url?: string; comingSoon?: boolean }

// 十宫格入口（与原型 quick-entry-grid 1:1）
const entries: Entry[] = [
  { id: 'courses',  name: '课程',   icon: 'graduation-cap', color: '#4A90D9', bg: 'rgba(74,144,217,0.1)',  url: '/pkg-course/home/index' },
  { id: 'circles',  name: '圈子',   icon: 'users',          color: '#52C41A', bg: 'rgba(82,196,26,0.1)',   url: '/pages/circles/index' },
  { id: 'classics', name: '古籍馆', icon: 'book-open',      color: '#C9A96E', bg: 'rgba(201,169,110,0.1)', comingSoon: true },
  { id: 'mall',     name: '商城',   icon: 'shopping-bag',   color: '#C41E3A', bg: 'rgba(196,30,58,0.1)',   url: '/pages/mall/home/index', badge: '热' },
  { id: 'live',     name: '直播',   icon: 'radio',          color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',   url: '/pkg-live/plaza/index' },
  { id: 'fortune',  name: '运势',   icon: 'compass',        color: '#9B59B6', bg: 'rgba(155,89,182,0.1)',  comingSoon: true },
  { id: 'paipan',   name: '排盘',   icon: 'layout-grid',    color: '#1890FF', bg: 'rgba(24,144,255,0.1)',  url: '/pages/paipan/index' },
  { id: 'agents',   name: '智能体', icon: 'bot',            color: '#722ED1', bg: 'rgba(114,46,209,0.1)',  url: '/pages/agent/main', badge: 'AI' },
  { id: 'poetry',   name: '诗词',   icon: 'book-heart',     color: '#EB2F96', bg: 'rgba(235,47,150,0.1)',  comingSoon: true },
  { id: 'more',     name: '更多',   icon: 'more-horizontal',color: '#666666', bg: 'rgba(102,102,102,0.1)', url: '/pages/discover/index' },
]
</script>

<template>
  <view class="grid">
    <view v-for="e in entries" :key="e.id" class="cell" @tap="e.comingSoon || !e.url ? toastComingSoon() : navigateTo(e.url)">
      <view class="icon-box" :style="{ background: e.bg }">
        <app-icon :name="e.icon" :size="48" :color="e.color" />
        <text v-if="e.badge" class="badge">{{ e.badge }}</text>
      </view>
      <text class="name">{{ e.name }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  row-gap: 24rpx;
  margin: 0 32rpx 32rpx;
}
.cell { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.icon-box {
  position: relative;
  width: 96rpx; height: 96rpx;
  border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
}
.badge {
  position: absolute; top: -8rpx; right: -8rpx;
  padding: 2rpx 10rpx; border-radius: 999rpx;
  font-size: 18rpx; font-weight: 700; color: #fff;
  background: #c41e3a;
}
.name { font-size: 22rpx; color: #333; font-weight: 500; }
</style>
