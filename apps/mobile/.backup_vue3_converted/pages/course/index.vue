<template>
  <!-- 重定向占位 — 课程列表统一入口为 /pages/courses/index -->
  <view class="min-h-screen bg-background flex items-center justify-center">
    <text class="text-sm text-muted-foreground">正在跳转...</text>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  uni.redirectTo({ url: '/pages/courses/index' })
})
</script>
