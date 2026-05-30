<template>
  <view class="page">
    <view class="poster-container">
      <view class="poster-mock">
        <text class="poster-title">分享海报</text>
        <text class="poster-sub">长按保存图片</text>
      </view>
      <button class="btn-save">保存到相册</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const posterUrl = ref('')
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.poster-container { text-align: center; }
.poster-mock { width: 300px; height: 400px; background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
.poster-title { font-size: 24px; font-family: 'Noto Serif SC', serif; }
.poster-sub { font-size: 14px; opacity: 0.8; margin-top: 8px; }
.btn-save { width: 200px; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 16px; text-align: center; line-height: 44px; }
</style>
