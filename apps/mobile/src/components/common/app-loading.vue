<script setup lang="ts">
/**
 * 全平台统一加载态（视觉签名系统批0）。
 * 太极图快旋（复用 animations.scss 的 taiji-rotate-fast）+ 品牌声线文案"研墨中…"。
 * 用法：<app-loading />  或  <app-loading :text="VOICE.LOADING_PAIPAN" />
 */
import { VOICE } from '@/lib/voice'

withDefaults(defineProps<{
  /** 加载文案，默认"研墨中…"（排盘/AI 场景请传 voice.ts 对应常量） */
  text?: string
}>(), {
  text: VOICE.LOADING,
})
</script>

<template>
  <view class="app-loading">
    <image src="/static/taiji.svg" class="app-loading__taiji taiji-rotate-fast" mode="aspectFit" />
    <text class="app-loading__text">{{ text }}</text>
  </view>
</template>

<style scoped lang="scss">
.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  gap: 24rpx;
}
.app-loading__taiji {
  width: 56rpx;
  height: 56rpx;
}
.app-loading__text {
  font-size: 26rpx;
  color: var(--text-tertiary);
  letter-spacing: 2rpx;
}
</style>
