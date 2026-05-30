<template>
  <view class="page">
    <view class="result success">
      <text class="icon">🎉</text>
      <text class="title">拼团成功！</text>
      <text class="desc">{{ message }}</text>
    </view>
    <view class="actions">
      <button class="btn" @click="goOrder">查看订单</button>
      <button class="btn outline" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
const message = ref('')
onMounted(() => { message.value = (getCurrentPages().pop()?.options || {}).message || '您已成功参与拼团' })
function goOrder() { uni.navigateTo({ url: '/pages/orders/orders' }) }
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
