<script setup lang="ts">
/**
 * 我的徽章（从原型 app/circles/badges/page.tsx 高保真迁移）
 * 已获得徽章网格 + 待解锁列表(进度条)；徽章图案=生成的国风圆形勋章图(跨端一致)
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

interface BadgeItem {
  id: string; name: string; desc: string; image: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  earned: boolean; earnedAt?: string; progress?: number; total?: number
}
const RARITY_CFG = {
  common: { label: '普通', cls: 'common' },
  rare: { label: '稀有', cls: 'rare' },
  epic: { label: '史诗', cls: 'epic' },
  legendary: { label: '传说', cls: 'legendary' },
}
const badges: BadgeItem[] = [
  { id: '1', name: '初入门径', desc: '加入第一个圈子', image: '/static/badges/badge-1.png', rarity: 'common', earned: true, earnedAt: '2023-10-01' },
  { id: '2', name: '活跃探索', desc: '连续7天发帖', image: '/static/badges/badge-2.png', rarity: 'common', earned: true, earnedAt: '2023-10-15' },
  { id: '3', name: '知识布道', desc: '发布10篇精华内容', image: '/static/badges/badge-3.png', rarity: 'rare', earned: true, earnedAt: '2023-11-05' },
  { id: '4', name: '百人追随', desc: '获得100个粉丝', image: '/static/badges/badge-4.png', rarity: 'rare', earned: true, earnedAt: '2023-12-01' },
  { id: '5', name: '命理宗师', desc: '回答500个命理问题', image: '/static/badges/badge-5.png', rarity: 'epic', earned: false, progress: 342, total: 500 },
  { id: '6', name: '圈主传奇', desc: '圈子成员突破10000', image: '/static/badges/badge-6.png', rarity: 'legendary', earned: false, progress: 1280, total: 10000 },
  { id: '7', name: '月度达人', desc: '单月获赞超500', image: '/static/badges/badge-7.png', rarity: 'epic', earned: false, progress: 210, total: 500 },
  { id: '8', name: '古籍守护', desc: '收藏50部古籍', image: '/static/badges/badge-8.png', rarity: 'rare', earned: false, progress: 28, total: 50 },
]
const earned = computed(() => badges.filter(b => b.earned))
const locked = computed(() => badges.filter(b => !b.earned))
function pct(b: BadgeItem) { return Math.min(100, (b.progress! / b.total!) * 100) }
</script>

<template>
  <view class="bg">
    <view class="bg-header">
      <view @tap="goBack"><app-icon name="arrow-left" :size="40" color="#2C2C2C" /></view>
      <text class="bg-title">我的徽章</text>
      <text class="bg-count">{{ earned.length }}/{{ badges.length }}</text>
    </view>

    <view class="bg-body">
      <!-- 已获得 -->
      <text class="bg-section">已获得 {{ earned.length }} 枚</text>
      <view class="bg-grid">
        <view v-for="b in earned" :key="b.id" class="bg-card" :class="RARITY_CFG[b.rarity].cls">
          <image class="bg-badge-img" :src="b.image" mode="aspectFit" />
          <text class="bg-name">{{ b.name }}</text>
          <text class="bg-rarity" :class="RARITY_CFG[b.rarity].cls">{{ RARITY_CFG[b.rarity].label }}</text>
          <text class="bg-date">{{ b.earnedAt }}</text>
        </view>
      </view>

      <!-- 待解锁 -->
      <text class="bg-section mt">待解锁 {{ locked.length }} 枚</text>
      <view class="bg-locked-list">
        <view v-for="b in locked" :key="b.id" class="bg-locked">
          <view class="bg-locked-icon"><image class="bg-locked-img" :src="b.image" mode="aspectFit" /></view>
          <view class="bg-locked-main">
            <view class="bg-locked-top">
              <text class="bg-locked-name">{{ b.name }}</text>
              <text class="bg-rarity-tag" :class="RARITY_CFG[b.rarity].cls">{{ RARITY_CFG[b.rarity].label }}</text>
            </view>
            <text class="bg-locked-desc">{{ b.desc }}</text>
            <view v-if="b.progress !== undefined" class="bg-progress-row">
              <view class="bg-progress"><view class="bg-progress-bar" :style="{ width: pct(b) + '%' }" /></view>
              <text class="bg-progress-txt">{{ b.progress }}/{{ b.total }}</text>
            </view>
          </view>
          <app-icon name="lock" :size="28" color="#999999" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bg { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.bg-header { position: sticky; top: 0; z-index: 10; background: var(--bg-paper, #FAF8F5); border-bottom: 2rpx solid var(--border, #EDE8E0); display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 96rpx; padding-top: var(--status-bar-height, 0px); }
.bg-title { flex: 1; font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.bg-count { font-size: 24rpx; color: #999; }
.bg-body { padding: 0 32rpx 160rpx; }
.bg-section { display: block; font-size: 22rpx; font-weight: 600; color: #999; letter-spacing: 2rpx; margin: 40rpx 0 24rpx; }
.bg-section.mt { margin-top: 64rpx; }
.bg-grid { display: flex; flex-wrap: wrap; gap: 24rpx; }
.bg-card { width: calc((100% - 48rpx) / 3); display: flex; flex-direction: column; align-items: center; padding: 24rpx; border-radius: 24rpx; border: 2rpx solid; box-sizing: border-box; }
.bg-card.common { background: #F8FAFC; border-color: #E2E8F0; }
.bg-card.rare { background: #EFF6FF; border-color: #BFDBFE; }
.bg-card.epic { background: #FAF5FF; border-color: #E9D5FF; }
.bg-card.legendary { background: #FFFBEB; border-color: #FCD34D; }
.bg-badge-img { width: 96rpx; height: 96rpx; margin-bottom: 16rpx; }
.bg-name { font-size: 24rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); text-align: center; }
.bg-rarity { font-size: 20rpx; margin-top: 8rpx; }
.bg-rarity.common { color: #475569; }
.bg-rarity.rare { color: #2563EB; }
.bg-rarity.epic { color: #9333EA; }
.bg-rarity.legendary { color: #D97706; }
.bg-date { font-size: 20rpx; color: #999; margin-top: 8rpx; }
.bg-locked-list { display: flex; flex-direction: column; gap: 16rpx; }
.bg-locked { display: flex; align-items: center; gap: 24rpx; padding: 24rpx; background: rgba(240,235,227,0.4); border: 2rpx solid var(--border, #EDE8E0); border-radius: 24rpx; }
.bg-locked-icon { width: 88rpx; height: 88rpx; border-radius: 20rpx; background: #F0EBE3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: 0.5; }
.bg-locked-img { width: 72rpx; height: 72rpx; filter: grayscale(1); }
.bg-locked-main { flex: 1; min-width: 0; }
.bg-locked-top { display: flex; align-items: center; gap: 16rpx; flex-wrap: wrap; }
.bg-locked-name { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.bg-rarity-tag { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 999rpx; border: 2rpx solid; }
.bg-rarity-tag.common { background: #F8FAFC; border-color: #E2E8F0; color: #475569; }
.bg-rarity-tag.rare { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }
.bg-rarity-tag.epic { background: #FAF5FF; border-color: #E9D5FF; color: #9333EA; }
.bg-rarity-tag.legendary { background: #FFFBEB; border-color: #FCD34D; color: #D97706; }
.bg-locked-desc { display: block; font-size: 24rpx; color: #999; margin-top: 4rpx; }
.bg-progress-row { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.bg-progress { flex: 1; height: 12rpx; background: #F0EBE3; border-radius: 999rpx; overflow: hidden; }
.bg-progress-bar { height: 100%; background: rgba(196,30,58,0.5); border-radius: 999rpx; }
.bg-progress-txt { font-size: 20rpx; color: #999; flex-shrink: 0; }
</style>
