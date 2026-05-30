<template>
  <view class="page">
    <view class="error-zone">
      <text class="error-icon">🔍</text>
      <text class="error-title">404</text>
      <text class="error-desc">页面不存在或已被移除</text>
      <button class="btn" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.error-zone { text-align: center; }
.error-icon { font-size: 48px; display: block; }
.error-title { font-size: 48px; font-weight: bold; color: #C41E3A; display: block; margin-top: 8px; }
.error-desc { font-size: 14px; color: #666; display: block; margin-top: 8px; }
.btn { width: 160px; height: 40px; background: #C41E3A; color: #fff; border-radius: 20px; font-size: 15px; border: none; margin: 20px auto 0; text-align: center; line-height: 40px; }
</style>
