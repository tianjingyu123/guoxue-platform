<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'

withDefaults(defineProps<{
  icon?: string
  title?: string
  desc?: string
  retryText?: string
}>(), {
  icon: 'wifi-off',
  title: '加载失败',
  desc: '网络异常，请稍后重试',
  retryText: '重新加载',
})

const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <view class="app-error">
    <view class="app-error__icon">
      <AppIcon
        :name="icon"
        :size="56"
        color="#D9CFC2"
      />
    </view>
    <text class="app-error__title">
      {{ title }}
    </text>
    <text
      v-if="desc"
      class="app-error__desc"
    >
      {{ desc }}
    </text>
    <view
      class="app-error__action"
      @tap="emit('retry')"
    >
      <AppIcon
        name="refresh-cw"
        :size="28"
        color="#C41E3A"
      />
      <text class="app-error__action-text">
        {{ retryText }}
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.app-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 120rpx 48rpx;
}
.app-error__icon {
  width: 160rpx; height: 160rpx; border-radius: 50%; background: #F5F1EB;
  display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx;
}
.app-error__title { font-size: 30rpx; color: #2C2C2C; font-weight: 600; margin-bottom: 12rpx; }
.app-error__desc { font-size: 26rpx; color: #999; text-align: center; line-height: 1.5; }
.app-error__action {
  margin-top: 40rpx; padding: 0 48rpx; height: 80rpx; border-radius: 40rpx;
  border: 2rpx solid #C41E3A; display: flex; align-items: center; gap: 12rpx;
}
.app-error__action-text { font-size: 28rpx; color: #C41E3A; font-weight: 600; }
</style>
