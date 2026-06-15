<template>
  <view class="error-state">
    <view class="es-icon">
      <app-icon name="wifi-off" :size="80" color="#c9c2b6" />
    </view>
    <text class="es-text">{{ message }}</text>
    <view class="es-btn" @tap="$emit('retry')">
      <app-icon name="refresh-cw" :size="28" color="#c41e3a" />
      <text class="es-btn-text">点击重试</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
defineProps<{ message?: string }>()
defineEmits<{ retry: [] }>()
</script>

<style scoped lang="scss">
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
}
.es-text {
  font-size: 26rpx;
  color: #999;
  margin: 24rpx 0;
  text-align: center;
}
.es-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 40rpx;
  border: 2rpx solid #c41e3a;
  border-radius: 80rpx;
  margin-top: 16rpx;
}
.es-btn-text {
  font-size: 28rpx;
  color: #c41e3a;
  font-weight: 500;
}
</style>
