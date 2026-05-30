<template>
  <view class="page">
    <view class="result fail">
      <text class="icon">✗</text>
      <text class="title">支付失败</text>
      <text class="desc">{{ reason }}</text>
    </view>
    <view class="actions">
      <button class="btn primary" @click="retry">重新支付</button>
      <button class="btn" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const reason = ref('支付未完成，请重试')

onMounted(() => {
  const q = getCurrentPages().pop()?.options || {}
  if (q.reason) reason.value = q.reason
})

function retry() { uni.navigateBack() }
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.result { text-align: center; }
.icon { font-size: 56px; color: #C41E3A; display: block; }
.title { font-size: 24px; font-weight: bold; display: block; margin-top: 12px; }
.desc { font-size: 14px; color: #666; display: block; margin-top: 6px; }
.actions { margin-top: 32px; display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; }
.btn { width: 100%; height: 44px; border-radius: 22px; font-size: 15px; border: 1px solid #C41E3A; background: #fff; color: #C41E3A; text-align: center; line-height: 44px; }
.btn.primary { background: #C41E3A; color: #fff; }
</style>
