<template>
  <view class="ch-header">
    <view
      class="ch-back"
      @tap="$emit('back')"
    >
      <AppIcon
        name="chevron-left"
        :size="44"
        color="#2C2C2C"
      />
    </view>
    <text class="ch-title">
      {{ title }}
    </text>
    <view
      class="ch-right"
      @tap="$emit('right')"
    >
      <AppIcon
        v-if="rightType === 'share'"
        name="share-2"
        :size="40"
        color="#2C2C2C"
      />
      <AppIcon
        v-else-if="rightType === 'search'"
        name="search"
        :size="40"
        color="#2C2C2C"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
defineProps<{ title: string; rightType?: string }>()
defineEmits<{ back: []; right: [] }>()
</script>

<style scoped>
.ch-header {
  flex-direction: row; align-items: center; padding: 20rpx 32rpx;
}
.ch-title { flex: 1; text-align: center; font-size: 36rpx; font-weight: 600; }
.ch-back, .ch-right { width: 80rpx; }
</style>
