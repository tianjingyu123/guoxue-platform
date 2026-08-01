<script setup lang="ts">
/**
 * 【万年历子组件】数据方块（自 V0 components/common/stat-tile.tsx 还原）
 * label + value 的紧凑信息单元，用于神煞、空亡、胎神等键值信息。
 * tone 可选给内容着吉凶色（对应 V0 传入带色 JSX 的用法）。
 */
withDefaults(defineProps<{
  label: string
  value: string
  /** 次要说明 */
  hint?: string
  align?: 'center' | 'left'
  /** 内容吉凶着色 */
  tone?: 'good' | 'bad' | 'neutral'
}>(), {
  align: 'center',
  tone: 'neutral',
})
</script>

<template>
  <view class="st" :class="`st-${align}`">
    <text class="st-label">{{ label }}</text>
    <text class="st-value" :class="`st-value-${tone}`">{{ value }}</text>
    <text v-if="hint" class="st-hint">{{ hint }}</text>
  </view>
</template>

<style scoped lang="scss">
.st {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  border-radius: 16rpx;
  background: rgba(240, 235, 229, 0.4);
  padding: 24rpx;
}
.st-center { align-items: center; text-align: center; }
.st-left { align-items: flex-start; text-align: left; }
.st-label { font-size: 24rpx; color: var(--text-soft); }
.st-value {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-ink);
  line-height: 1.5;
}
.st-value-good { color: #2f9d6a; }
.st-value-bad { color: var(--brand); }
.st-hint { font-size: 22rpx; color: var(--text-soft); }
</style>
