<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { coreEntries } from '@/lib/discover-data'
import { navigateTo } from '@/utils/router'

function openEntry(href: string) {
  navigateTo(href)
}
</script>

<template>
  <view class="core-entry-grid">
    <view
      v-for="entry in coreEntries"
      :key="entry.id"
      class="core-entry"
      hover-class="core-entry-press"
      @tap="openEntry(entry.href)"
    >
      <view class="core-entry-icon">
        <AppIcon :name="entry.icon" :size="44" color="#C41E3A" />
      </view>
      <text class="core-entry-label">{{ entry.label }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.core-entry-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 24rpx 24rpx 4rpx;
}

.core-entry {
  width: 20%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 24rpx;
}

.core-entry-press {
  opacity: 0.6;
  transform: translateY(2rpx);
}

.core-entry-icon {
  width: 88rpx;
  height: 88rpx;
  border: 2rpx solid rgba(201, 169, 110, 0.16);
  border-radius: 24rpx;
  background: linear-gradient(145deg, #FFFFFF, #F6F1E7);
  box-shadow: 0 4rpx 14rpx rgba(60, 50, 40, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.core-entry-label {
  max-width: 100%;
  padding: 0 4rpx;
  color: #6B655B;
  font-size: 22rpx;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
