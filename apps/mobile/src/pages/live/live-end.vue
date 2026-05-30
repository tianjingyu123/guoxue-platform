<template>
  <view class="page">
    <view class="end-card">
      <text class="end-icon">📡</text>
      <text class="end-title">直播已结束</text>
      <view class="end-stats">
        <text>观看 {{ stats.views || 0 }} · 点赞 {{ stats.likes || 0 }} · 收入 ¥{{ stats.revenue || 0 }}</text>
      </view>
      <button class="btn" @click="goReplay">查看回放</button>
      <button class="btn outline" @click="goHome">返回首页</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const stats = ref({ views: 0, likes: 0, revenue: 0 })
function goReplay() { uni.navigateTo({ url: '/pages/live/replays' }) }
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px; }
.end-card { text-align: center; }
.end-icon { font-size: 48px; }
.end-title { font-size: 22px; font-weight: bold; display: block; margin-top: 12px; }
.end-stats { font-size: 13px; color: #666; margin-top: 8px; }
.btn { width: 200px; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin: 16px auto 0; text-align: center; line-height: 44px; }
.btn.outline { background: #fff; color: #C41E3A; border: 1px solid #C41E3A; }
</style>
