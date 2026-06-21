<template>
  <view
    class="fbc-card"
    :style="{ backgroundColor: color || '#1a5276' }"
  >
    <text class="fbc-title">
      {{ title }}
    </text>
  </view>
</template>

<script setup lang="ts">
defineProps<{ color?: string; title: string }>()
</script>

<style scoped>
.fbc-card {
  width: 100rpx; height: 140rpx; border-radius: 10rpx;
  align-items: center; justify-content: center;
}
.fbc-title { color: #fff; font-size: 22rpx; font-weight: 600; text-align: center; padding: 6rpx; }
</style>
