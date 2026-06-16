<script setup lang="ts">
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
</template>
