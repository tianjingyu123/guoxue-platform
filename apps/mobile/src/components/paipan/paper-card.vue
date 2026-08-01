<script setup lang="ts">
/**
 * 【排盘通用组件】宣纸卡片容器（自 V0 components/common/paper-card.tsx 还原）
 * 统一卡片外框，可选珠宝金描边（强调/Pro 区块）。
 */
withDefaults(defineProps<{
  /** 珠宝金描边 */
  gold?: boolean
  /** 内边距档位 */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}>(), {
  gold: false,
  padding: 'md',
})
</script>

<template>
  <view class="pc" :class="[gold ? 'pc-gold' : '', `pc-p-${padding}`]">
    <slot />
  </view>
</template>

<style scoped lang="scss">
.pc {
  border-radius: 24rpx;
  background: var(--card);
  border: 1rpx solid var(--line);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.pc-gold {
  border-color: rgba(201, 169, 110, 0.4);
  box-shadow: 0 0 0 2rpx rgba(201, 169, 110, 0.15), 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.pc-p-none { padding: 0; }
.pc-p-sm { padding: 24rpx; }
.pc-p-md { padding: 32rpx; }
.pc-p-lg { padding: 40rpx; }
</style>
