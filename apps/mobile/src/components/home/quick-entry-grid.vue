<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

interface Entry { id: string; name: string; icon: string; color: string; bg: string; badge?: string; url: string }

// 金刚区「学习 / 生活」双心智分组（首页信息架构重构 · 董事长拍板）
// 去掉原「圈子」入口（已有独立 tabBar），9 宫 = 学 4 + 用 5
interface EntryGroup { key: string; label: string; entries: Entry[] }

const groups: EntryGroup[] = [
  {
    key: 'study',
    label: '学',
    entries: [
      { id: 'courses',  name: '课程',   icon: 'graduation-cap', color: '#4A90D9', bg: 'rgba(74,144,217,0.1)',  url: '/pkg-course/home/index' },
      { id: 'classics', name: '古籍馆', icon: 'book-open',      color: '#C9A96E', bg: 'rgba(201,169,110,0.1)', url: '/pkg-classics/home/index' },
      { id: 'poetry',   name: '诗词',   icon: 'book-heart',     color: '#EB2F96', bg: 'rgba(235,47,150,0.1)',  url: '/pkg-poetry/index/index' },
      { id: 'agents',   name: '智能体', icon: 'bot',            color: '#722ED1', bg: 'rgba(114,46,209,0.1)',  url: '/pkg-agent/agents/index', badge: 'AI' },
    ],
  },
  {
    key: 'life',
    label: '用',
    entries: [
      { id: 'paipan',   name: '排盘',   icon: 'layout-grid',    color: '#1890FF', bg: 'rgba(24,144,255,0.1)',  url: '/pages/paipan/index' },
      { id: 'fortune',  name: '运势',   icon: 'compass',        color: '#9B59B6', bg: 'rgba(155,89,182,0.1)',  url: '/pkg-fortune/index/index' },
      { id: 'mall',     name: '商城',   icon: 'shopping-bag',   color: '#C41E3A', bg: 'rgba(196,30,58,0.1)',   url: '/pkg-mall/home/index', badge: '热' },
      { id: 'live',     name: '直播',   icon: 'radio',          color: '#E74C3C', bg: 'rgba(231,76,60,0.1)',   url: '/pkg-live/plaza/index' },
      { id: 'more',     name: '更多',   icon: 'more-horizontal',color: '#666666', bg: 'rgba(102,102,102,0.1)', url: '/pages/discover/index' },
    ],
  },
]
</script>

<template>
  <view class="entry-wrap">
    <view v-for="g in groups" :key="g.key" class="group">
      <!-- 轻量分组小标题（学 / 用） -->
      <view class="group-head">
        <text class="group-tag">{{ g.label }}</text>
        <view class="group-line" />
      </view>
      <view class="grid">
        <view v-for="e in g.entries" :key="e.id" class="cell" @tap="navigateTo(e.url)">
          <view class="icon-box" :style="{ background: e.bg }">
            <app-icon :name="e.icon" :size="48" :color="e.color" />
            <text v-if="e.badge" class="badge">{{ e.badge }}</text>
          </view>
          <text class="name">{{ e.name }}</text>
        </view>
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
