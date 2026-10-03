<script setup lang="ts">
/**
 * 【万年历子组件】老黄历详情表格（自 V0 components/yijing/wannianli/almanac-table.tsx 还原）
 * 传统黄历带框三列表格：朱红栏目名 + 墨色内容，宽行跨整行。
 */
import type { AlmanacRow } from '@/lib/paipan/types'

defineProps<{
  rows: AlmanacRow[]
}>()
</script>

<template>
  <view class="at">
    <view
      v-for="row in rows"
      :key="row.label"
      class="at-cell"
      :class="{ 'at-cell-wide': row.wide }"
    >
      <text class="at-label">{{ row.label }}</text>
      <text class="at-value" :class="`at-value-${row.tone ?? 'neutral'}`">{{ row.value }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.at {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  overflow: hidden;
  border-radius: 20rpx;
  border: 1rpx solid rgba(201, 169, 110, 0.5);
  background: var(--card);
}
.at-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  border-right: 1rpx solid rgba(201, 169, 110, 0.3);
  border-bottom: 1rpx solid rgba(201, 169, 110, 0.3);
}
.at-cell-wide { grid-column: 1 / -1; }
.at-label {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--brand);
}
.at-value {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 28rpx;
  line-height: 1.6;
}
.at-value-neutral { color: var(--text-ink); }
.at-value-good { color: #2f9d6a; }
.at-value-bad { color: var(--brand); }
</style>
