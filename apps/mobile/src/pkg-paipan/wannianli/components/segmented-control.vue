<script setup lang="ts">
/**
 * 【万年历子组件】分段切换器（自 V0 components/common/segmented-control.tsx 还原）
 * 用于日/月/年、流年/流月/流日/流时等互斥视图切换，选中项白底朱砂字。
 */
defineProps<{
  options: { key: string; label: string }[]
  activeKey: string
}>()

const emit = defineEmits<{
  (e: 'change', key: string): void
}>()
</script>

<template>
  <view class="seg">
    <view
      v-for="opt in options"
      :key="opt.key"
      class="seg-item"
      :class="{ 'seg-item-active': opt.key === activeKey }"
      @tap="emit('change', opt.key)"
    >
      <text class="seg-label" :class="{ 'seg-label-active': opt.key === activeKey }">{{ opt.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.seg {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  border-radius: 16rpx;
  background: var(--muted);
  padding: 8rpx;
}
.seg-item {
  border-radius: 12rpx;
  padding: 12rpx 32rpx;
  transition: background-color 0.2s;
}
.seg-item-active {
  background: var(--card);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}
.seg-label {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-soft);
}
.seg-label-active {
  color: var(--brand);
}
</style>
