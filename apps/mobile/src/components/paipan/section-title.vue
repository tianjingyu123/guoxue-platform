<script setup lang="ts">
/**
 * 【排盘通用组件】区块标题（自 V0 components/common/section-title.tsx 还原）
 * 朱砂竖条 + 衬线标题 + 可选副标题/右侧操作（slot: action）。
 */
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <view class="st">
    <view class="st-main">
      <view class="st-bar" />
      <view class="st-texts">
        <text class="st-title">{{ title }}</text>
        <text v-if="subtitle" class="st-subtitle">{{ subtitle }}</text>
      </view>
    </view>
    <view class="st-action">
      <slot name="action" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.st {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
}
.st-main { display: flex; align-items: center; gap: 20rpx; }
.st-bar {
  width: 8rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: var(--brand);
}
.st-texts { display: flex; flex-direction: column; }
.st-title {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-ink);
}
.st-subtitle {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--text-soft);
}
.st-action { flex-shrink: 0; }
</style>
