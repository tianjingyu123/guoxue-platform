<template>
  <view
    class="fc-card"
    :style="{ backgroundColor: coverColor || '#C41E3A' }"
  >
    <text
      class="fc-title"
      :style="{ fontSize: titleSize || '28rpx' }"
    >
      {{ title }}
    </text>
    <text
      v-if="label"
      class="fc-label"
    >
      {{ label }}
    </text>
  </view>
</template>

<script setup lang="ts">
defineProps<{ title: string; label?: string; coverColor?: string; titleSize?: string }>()
</script>

<style scoped>
.fc-card {
  width: 120rpx; height: 160rpx; border-radius: 12rpx;
  flex-direction: column; align-items: center; justify-content: center;
}
.fc-title { color: #fff; font-weight: 600; text-align: center; padding: 8rpx; }
.fc-label { color: rgba(255,255,255,.7); font-size: 20rpx; margin-top: 4rpx; }
</style>
