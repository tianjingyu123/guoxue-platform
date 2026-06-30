<script setup lang="ts">
/**
 * 错误态（兼容历史 API <error-state :message @retry>）。
 * 现已收编为 app-error 的薄封装，视觉与全平台统一；保留本组件避免改动 52 处调用页。
 */
import AppError from '@/components/common/app-error.vue'
defineProps<{ message?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <app-error
    :title="message || '加载失败'"
    desc=""
    retry-text="点击重试"
    @retry="$emit('retry')"
  />
</template>
