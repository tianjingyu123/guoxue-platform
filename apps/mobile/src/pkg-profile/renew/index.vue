<template>
  <app-safe-area-top />
  <!-- 续费已并入会员中心（/vip 同页选套餐续费），本页仅作历史入口的薄重定向防断链 -->
  <view class="page">
    <text class="tip">正在前往会员中心…</text>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { redirectTo } from '@/utils/router'

onMounted(() => {
  redirectTo('/vip')
})
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #FAF8F5; display: flex; align-items: center; justify-content: center; }
.tip { font-size: 28rpx; color: #8A8478; }
</style>
