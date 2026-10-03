<script setup lang="ts">
/**
 * 【万年历子组件】方位罗盘（自 V0 components/common/direction-compass.tsx 还原）
 * 3x3 宫格布局展示八方吉凶与用途（喜神/财神/贵人/煞方等）。
 * X5 红线：不用 aspect-ratio，格子用固定高度。
 */
import type { DirectionItem } from '@/lib/paipan/types'

withDefaults(defineProps<{
  directions: DirectionItem[]
  /** 中宫显示文字，如日期或"中宫" */
  centerLabel?: string
}>(), {
  centerLabel: '中宫',
})

// 3x3 宫格位置映射（上北下南布局：NW N NE / W 中 E / SW S SE）
const GRID_POS: Record<DirectionItem['key'], { col: number; row: number }> = {
  NW: { col: 1, row: 1 }, N: { col: 2, row: 1 }, NE: { col: 3, row: 1 },
  W: { col: 1, row: 2 }, E: { col: 3, row: 2 },
  SW: { col: 1, row: 3 }, S: { col: 2, row: 3 }, SE: { col: 3, row: 3 },
}
</script>

<template>
  <view class="dc">
    <view
      v-for="dir in directions"
      :key="dir.key"
      class="dc-cell"
      :class="`dc-cell-${dir.luck}`"
      :style="{ gridColumn: String(GRID_POS[dir.key].col), gridRow: String(GRID_POS[dir.key].row) }"
    >
      <text class="dc-name" :class="`dc-text-${dir.luck}`">{{ dir.name }}</text>
      <text v-if="dir.tag" class="dc-tag" :class="`dc-text-${dir.luck}`">{{ dir.tag }}</text>
    </view>
    <!-- 中宫 -->
    <view class="dc-center">
      <text class="dc-center-text">{{ centerLabel }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
$good: #2f9d6a;

.dc {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 176rpx);
  gap: 12rpx;
  width: 100%;
  max-width: 560rpx;
}
.dc-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  border-radius: 16rpx;
  border: 1rpx solid var(--line);
  padding: 8rpx;
  text-align: center;
}
.dc-cell-good { background: rgba(47, 157, 106, 0.12); border-color: rgba(47, 157, 106, 0.25); }
.dc-cell-bad { background: rgba(196, 30, 58, 0.1); border-color: rgba(196, 30, 58, 0.25); }
.dc-cell-neutral { background: var(--muted); }
.dc-name {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
}
.dc-tag { font-size: 22rpx; line-height: 1.3; opacity: 0.9; }
.dc-text-good { color: $good; }
.dc-text-bad { color: var(--brand); }
.dc-text-neutral { color: var(--text-soft); }
.dc-center {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.1);
  box-shadow: inset 0 0 0 2rpx rgba(196, 30, 58, 0.2);
}
.dc-center-text {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand);
}
</style>
