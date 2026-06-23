<script setup lang="ts">
/** 回到顶部按钮（原型 FloatingAssistant，滚动超阈值后淡入） */
import AppIcon from '@/components/common/app-icon.vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'tap'): void }>()
</script>

<template>
  <view v-if="visible" class="back-top animate-fade-in" @tap="emit('tap')">
    <app-icon name="arrow-up" :size="36" color="#999999" />
</template>

<style scoped lang="scss">
.back-top {
  position: fixed; right: 28rpx; bottom: 144rpx; z-index: 40;
  width: 80rpx; height: 80rpx; border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.95);
  border: 2rpx solid var(--line, #e8e0d5);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  display: flex; align-items: center; justify-content: center;
}
</style>
