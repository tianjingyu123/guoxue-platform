<script setup lang="ts">
/**
 * 全平台统一「上拉加载更多」页脚。
 * 病灶：各列表页各写「加载中/没有更多了」文案，样式不一。
 * 解药：统一组件，三态：loading（加载中）/ nomore（没有更多）/ more（默认留白，由 onReachBottom 触发）。
 *
 * 用法：<app-load-more :status="loadStatus" />   // 'loading' | 'nomore' | 'more'
 */
withDefaults(defineProps<{
  status?: 'loading' | 'nomore' | 'more'
  nomoreText?: string
}>(), {
  status: 'more',
  nomoreText: '— 没有更多了 —',
})
</script>

<template>
  <view class="load-more">
    <view v-if="status === 'loading'" class="load-more__loading">
      <view class="load-more__spinner" />
      <text class="load-more__text">加载中…</text>
    </view>
    <text v-else-if="status === 'nomore'" class="load-more__nomore">{{ nomoreText }}</text>
  </view>
</template>

<style scoped lang="scss">
.load-more {
  @include flex-center;
  min-height: 80rpx;
  padding: $space-md 0;
  @include safe-area-bottom();
}
.load-more__loading {
  @include flex-center;
  gap: $space-xs;
}
.load-more__spinner {
  width: 28rpx;
  height: 28rpx;
  border: 4rpx solid var(--line);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: load-more-spin 0.8s linear infinite;
}
.load-more__text,
.load-more__nomore {
  font-size: $font-sm;
  color: var(--text-soft);
}
@keyframes load-more-spin {
  to { transform: rotate(360deg); }
}
</style>
