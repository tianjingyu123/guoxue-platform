<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

const entries = [
  { id: 'station', icon: 'building-2', label: '分站', href: '/join/station' },
  { id: 'operator', icon: 'briefcase', label: '运营商', href: '/join/operator' },
  { id: 'institute', icon: 'graduation-cap', label: '研究院', href: '/institute' },
  { id: 'offline', icon: 'map-pin', label: '线下驿站', href: '/offline/stations' },
  { id: 'competition', icon: 'trophy', label: '赛事', href: '/competition' },
]

function openEntry(href: string) {
  navigateTo(href)
}
</script>

<template>
  <view class="business-entry-grid">
    <view
      v-for="entry in entries"
      :key="entry.id"
      class="business-entry"
      hover-class="business-entry-press"
      @tap="openEntry(entry.href)"
    >
      <view class="business-entry-icon">
        <view class="business-entry-mark" />
        <AppIcon :name="entry.icon" :size="42" color="#A64A42" />
      </view>
      <text class="business-entry-label">{{ entry.label }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.business-entry-grid {
  position: relative;
  display: flex;
  margin: 14rpx 24rpx 16rpx;
  padding: 22rpx 10rpx 18rpx;
  overflow: hidden;
  border: 2rpx solid rgba(201, 169, 110, 0.18);
  border-radius: 28rpx;
  background:
    linear-gradient(90deg, rgba(201, 169, 110, 0.04) 1rpx, transparent 1rpx),
    linear-gradient(180deg, #FFFFFF 0%, #FAF6EE 100%);
  background-size: 52rpx 100%, 100% 100%;
  box-shadow: 0 6rpx 20rpx rgba(59, 48, 36, 0.05);
}

.business-entry {
  width: 20%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.business-entry-press {
  opacity: 0.68;
  transform: translateY(2rpx);
}

.business-entry-icon {
  position: relative;
  width: 82rpx;
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 2rpx solid rgba(184, 119, 90, 0.15);
  border-radius: 24rpx;
  background: rgba(255, 253, 249, 0.92);
  box-shadow:
    inset 0 0 0 4rpx rgba(255, 255, 255, 0.72),
    0 4rpx 12rpx rgba(107, 76, 53, 0.06);
}

.business-entry-mark {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: #C9A96E;
  box-shadow: 0 0 0 3rpx rgba(201, 169, 110, 0.12);
}

.business-entry-label {
  max-width: 100%;
  padding: 0 2rpx;
  overflow: hidden;
  color: #5D554B;
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
