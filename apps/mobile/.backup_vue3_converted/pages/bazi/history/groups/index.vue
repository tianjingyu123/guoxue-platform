<template>
  <view class="min-h-screen bg-background flex items-center justify-center">
    <text class="text-sm text-muted-foreground">正在跳转...</text>
  </view>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  uni.redirectTo({ url: '/pages/paipan/bazi/history/groups/index' })
})
</script>
