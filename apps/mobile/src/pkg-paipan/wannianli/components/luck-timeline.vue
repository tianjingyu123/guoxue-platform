<script setup lang="ts">
/**
 * 【万年历子组件】时辰吉凶时间轴（自 V0 components/common/luck-timeline.tsx 还原）
 * 十二时辰的吉凶排布 + 时辰干支/值神，高亮当前时辰。
 */
import type { HourLuck } from '@/lib/paipan/types'
import LuckBadge from './luck-badge.vue'

defineProps<{
  hours: HourLuck[]
}>()
</script>

<template>
  <view class="lt">
    <view
      v-for="(hour, i) in hours"
      :key="hour.name"
      class="lt-row"
      :class="{ 'lt-row-current': hour.current, 'lt-row-line': i !== 0 }"
    >
      <view class="lt-time">
        <text class="lt-name">{{ hour.name }}</text>
        <text class="lt-range">{{ hour.range }}</text>
      </view>
      <luck-badge :luck="hour.luck" size="sm" />
      <view class="lt-info">
        <text v-if="hour.ganzhi" class="lt-ganzhi">{{ hour.ganzhi }}</text>
        <text v-if="hour.note" class="lt-note">{{ hour.note }}</text>
      </view>
      <view v-if="hour.current" class="lt-now">
        <text class="lt-now-text">此刻</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.lt { display: flex; flex-direction: column; }
.lt-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 0;
}
.lt-row-line { border-top: 1rpx solid var(--line); }
.lt-row-current {
  margin: 0 -16rpx;
  padding-left: 16rpx;
  padding-right: 16rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.05);
  box-shadow: inset 0 0 0 2rpx rgba(196, 30, 58, 0.2);
  border-top-color: transparent;
}
.lt-time {
  display: flex;
  flex-direction: column;
  width: 128rpx;
  flex-shrink: 0;
}
.lt-name {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-ink);
}
.lt-range { font-size: 22rpx; color: var(--text-soft); }
.lt-info {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  overflow: hidden;
}
.lt-ganzhi {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 24rpx;
  color: var(--text);
}
.lt-note {
  font-size: 24rpx;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lt-now {
  flex-shrink: 0;
  border-radius: 999rpx;
  background: var(--brand);
  padding: 4rpx 16rpx;
}
.lt-now-text { font-size: 22rpx; color: #ffffff; }
</style>
