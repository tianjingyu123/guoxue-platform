<template>
  <view class="page">
    <view class="result fail">
      <text class="icon">😞</text>
      <text class="title">拼团失败</text>
      <text class="desc">未在有效期内凑齐人数，款项将自动退回</text>
    </view>
    <view class="actions">
      <button class="btn" @click="retry">重新拼团</button>
      <button class="btn outline" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
function retry() { uni.navigateBack() }
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.result { text-align: center; }
.icon { font-size: 64px; display: block; }
.title { font-size: 24px; font-weight: bold; display: block; margin-top: 12px; }
.desc { font-size: 14px; color: #666; display: block; margin-top: 6px; }
.actions { margin-top: 32px; display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; }
.btn { width: 100%; height: 44px; border-radius: 22px; font-size: 15px; border: none; text-align: center; line-height: 44px; background: #C41E3A; color: #fff; }
.btn.outline { background: #fff; color: #C41E3A; border: 1px solid #C41E3A; }
</style>
