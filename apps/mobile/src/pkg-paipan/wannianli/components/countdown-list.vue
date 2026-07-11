<script setup lang="ts">
/**
 * 【万年历子组件】倒计时列表（自 V0 components/common/countdown-list.tsx 还原）
 * 节假日 / 24节气等"距今天数"列表。
 * 取舍：图标库无 sprout/flag，用 leaf/award 近似替代。
 */
import type { CountdownItem } from '@/lib/paipan/types'
import AppIcon from '@/components/common/app-icon.vue'

defineProps<{
  items: CountdownItem[]
}>()

const ICON_MAP: Record<string, string> = {
  moon: 'moon',
  sun: 'sun',
  flag: 'award',
  sprout: 'leaf',
  flame: 'flame',
  gift: 'gift',
}

function iconOf(item: CountdownItem): string {
  return (item.icon && ICON_MAP[item.icon]) || 'calendar-days'
}

function deltaText(delta: number): string {
  if (delta === 0) return '就在今天'
  if (delta < 0) return `已过 ${Math.abs(delta)} 天`
  return `还有 ${delta} 天`
}
</script>

<template>
  <view class="cl">
    <view
      v-for="(item, i) in items"
      :key="item.name"
      class="cl-row"
      :class="{ 'cl-row-line': i !== items.length - 1 }"
    >
      <view class="cl-icon">
        <app-icon :name="iconOf(item)" :size="36" color="var(--gold)" />
      </view>
      <view class="cl-main">
        <view class="cl-title-row">
          <text class="cl-name">{{ item.name }}</text>
          <view v-if="item.badge" class="cl-badge">
            <text class="cl-badge-text">{{ item.badge }}</text>
          </view>
        </view>
        <text class="cl-date">{{ item.dateLabel }}</text>
      </view>
      <text class="cl-delta" :class="{ 'cl-delta-past': item.deltaDays < 0 }">{{ deltaText(item.deltaDays) }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cl { display: flex; flex-direction: column; }
.cl-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
}
.cl-row-line { border-bottom: 1rpx solid var(--line); }
.cl-icon {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.15);
}
.cl-main { min-width: 0; flex: 1; }
.cl-title-row { display: flex; align-items: center; gap: 16rpx; }
.cl-name {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-ink);
}
.cl-badge {
  border-radius: 8rpx;
  background: rgba(196, 30, 58, 0.1);
  padding: 4rpx 12rpx;
}
.cl-badge-text { font-size: 22rpx; color: var(--brand); }
.cl-date {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cl-delta {
  flex-shrink: 0;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--brand);
}
.cl-delta-past { color: var(--text-soft); }
</style>
