<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

interface Entry { id: string; name: string; icon: string; color: string; bg: string; badge?: string; url: string }

// 金刚区统一 10 宫格（5列×2行）：去掉原「学/用」分组标题——用户反馈分组显得乱·2026-07-06

// R4 合规：小程序端无占卜类目，「排盘/运势」入口改民俗/历法表述（仅展示文案·路由不变）
let paipanName = '排盘'
let fortuneName = '运势'
// #ifdef MP-WEIXIN
paipanName = '民俗研究'
fortuneName = '历法参考'
// #endif

// 统一 10 宫格（5列×2行整齐排布，不再分「学/用」组标题——用户反馈分组显得乱）
const allEntries: Entry[] = [
  { id: 'courses',  name: '课程',   icon: 'graduation-cap', color: '#4A90D9', bg: 'rgba(74,144,217,0.1)',  url: '/pkg-course/home/index' },
  { id: 'classics', name: '古籍馆', icon: 'book-open',      color: '#C9A96E', bg: 'rgba(201,169,110,0.1)', url: '/pkg-classics/home/index' },
  { id: 'poetry',   name: '诗词',   icon: 'book-heart',     color: '#EB2F96', bg: 'rgba(235,47,150,0.1)',  url: '/pkg-poetry/index/index' },
  { id: 'agents',   name: '智能体', icon: 'bot',            color: '#722ED1', bg: 'rgba(114,46,209,0.1)',  url: '/pkg-agent/agents/index', badge: 'AI' },
  { id: 'paipan',   name: paipanName,  icon: 'layout-grid', color: '#1890FF', bg: 'rgba(24,144,255,0.1)',  url: '/pages/paipan/index' },
  { id: 'fortune',  name: fortuneName, icon: 'compass',     color: '#9B59B6', bg: 'rgba(155,89,182,0.1)',  url: '/pkg-fortune/index/index' },
  { id: 'mall',     name: '商城',   icon: 'shopping-bag',   color: '#C41E3A', bg: 'rgba(196,30,58,0.1)',   url: '/pkg-mall/home/index' },
  { id: 'live',     name: '直播',   icon: 'radio',          color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',   url: '/pkg-live/plaza/index' },
  { id: 'classics2',name: '听书',   icon: 'headphones',     color: '#13C2C2', bg: 'rgba(19,194,194,0.1)',  url: '/pkg-classics/audiobooks/index' },
  { id: 'more',     name: '更多',   icon: 'more-horizontal',color: '#666666', bg: 'rgba(102,102,102,0.1)', url: '/pages/discover/index' },
]
</script>

<template>
  <view class="entry-wrap">
    <view class="grid">
      <view v-for="e in allEntries" :key="e.id" class="cell" @tap="navigateTo(e.url)">
        <view class="icon-box" :style="{ background: e.bg }">
          <app-icon :name="e.icon" :size="48" :color="e.color" />
          <text v-if="e.badge" class="badge">{{ e.badge }}</text>
        </view>
        <text class="name">{{ e.name }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.entry-wrap { margin: 0 32rpx 32rpx; }
.group { margin-bottom: 20rpx; }
.group:last-child { margin-bottom: 0; }
.group-head {
  display: flex; align-items: center; gap: 12rpx;
  margin-bottom: 14rpx;
}
.group-tag {
  font-size: 20rpx; font-weight: 400; color: var(--text-soft, #999);
  letter-spacing: 4rpx;
}
.group-line { flex: 1; height: 1rpx; background: var(--line, #eee6d9); opacity: 0.7; }
/* 两行统一 5 列栅格，保证上下图标纵向对齐（第一行 4 项自然占前 4 列） */
.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  row-gap: 24rpx;
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
  background: var(--brand);
}
.name { font-size: 22rpx; color: #333; font-weight: 500; }
</style>
