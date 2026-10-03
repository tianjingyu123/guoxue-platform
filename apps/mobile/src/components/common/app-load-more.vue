<script setup lang="ts">
/**
 * 全平台统一「上拉加载更多」页脚。
 * 病灶：各列表页各写「加载中/没有更多了」文案，样式不一。
 * 解药：统一组件，三态：loading（加载中）/ nomore（没有更多）/ more（默认留白，由 onReachBottom 触发）。
 * 视觉签名批0：spinner 换 28rpx 太极图旋转；nomore 默认文案改"已到卷尾"+ 两侧墨线（.scroll-end）。
 * 已接入页面若传了自定义 nomoreText，不受默认值变更影响。
 *
 * 用法：<app-load-more :status="loadStatus" />   // 'loading' | 'nomore' | 'more'
 */
import { VOICE } from '@/lib/voice'

withDefaults(defineProps<{
  status?: 'loading' | 'nomore' | 'more'
  nomoreText?: string
}>(), {
  status: 'more',
  nomoreText: VOICE.END,
})
</script>

<template>
  <view class="load-more">
    <view v-if="status === 'loading'" class="load-more__loading">
      <image src="/static/taiji.svg" class="load-more__taiji taiji-rotate-fast" mode="aspectFit" />
      <text class="load-more__text">加载中…</text>
    </view>
    <view v-else-if="status === 'nomore'" class="load-more__nomore scroll-end">
      <text>{{ nomoreText }}</text>
    </view>
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
.load-more__taiji {
  width: 28rpx;
  height: 28rpx;
}
.load-more__text {
  font-size: $font-sm;
  color: var(--text-soft);
}
.load-more__nomore {
  /* 布局与墨线来自全局 .scroll-end（signature.scss），此处只收窄间距适配页脚 */
  flex: 1;
  padding: 0 48rpx;
  font-size: $font-sm;
}
</style>
