<script setup lang="ts">
/**
 * 【排盘工具通用】结果页缺参 / 参数无效统一空态
 * 统一：info 图标 + 文案 + 主色胶囊按钮，替代各 result 页各写一套的 .status / .invalid 块。
 * 用法：<param-error :text="loadError" action-text="重新排盘" @action="goInput" />
 */
import AppIcon from '@/components/common/app-icon.vue'

withDefaults(
  defineProps<{
    /** 提示文案（如「缺少排盘参数」「参数无效，请重新排盘」） */
    text: string
    /** 按钮文案 */
    actionText?: string
  }>(),
  { actionText: '重新排盘' },
)

defineEmits<{ (e: 'action'): void }>()
</script>

<template>
  <view class="pe">
    <app-icon name="info" :size="64" color="#d1d5db" />
    <text class="pe-text">{{ text }}</text>
    <view class="pe-btn" @tap="$emit('action')">
      <text class="pe-btn-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.pe {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 80rpx 48rpx;
}
.pe-text {
  font-size: 28rpx;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.6;
}
.pe-btn {
  padding: 20rpx 56rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.pe-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
</style>
