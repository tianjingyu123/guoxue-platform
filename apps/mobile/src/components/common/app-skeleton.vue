<script setup lang="ts">
/**
 * 通用骨架屏占位块
 * 用法：<AppSkeleton width="200rpx" height="32rpx" radius="8rpx" />
 *      <AppSkeleton circle :size="80" />
 */
withDefaults(defineProps<{
  width?: string
  height?: string
  radius?: string
  circle?: boolean
  size?: number
  mb?: string
}>(), {
  width: '100%',
  height: '32rpx',
  radius: '8rpx',
  circle: false,
  size: 80,
  mb: '0',
})
</script>

<template>
  <view
    class="skeleton"
    :style="circle
      ? { width: size + 'rpx', height: size + 'rpx', borderRadius: '50%', marginBottom: mb }
      : { width, height, borderRadius: radius, marginBottom: mb }"
  />

  </view>
</template>
