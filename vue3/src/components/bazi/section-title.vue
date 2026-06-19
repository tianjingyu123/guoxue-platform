<script setup lang="ts">
/** 区块标题（左侧红竖条 + 标题, 右侧可选 extra slot）——对应原型 SectionTitle */
defineProps<{ title: string }>()
</script>
<template>
  <view class="st">
    <view class="st-l"><view class="st-bar" /><text class="st-text">{{ title }}</text></view>
    <slot name="extra" />
  </view>
</template>
<style scoped lang="scss">
.st { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; }
.st-l { display: flex; align-items: center; gap: 12rpx; }
.st-bar { width: 4rpx; height: 28rpx; background: var(--brand); border-radius: 999rpx; }
.st-text { font-size: 28rpx; font-weight: 600; color: var(--text-ink); }
</style>
