<template>
  <view class="page">
    <view class="result success">
      <text class="icon">✓</text>
      <text class="title">支付成功</text>
      <text class="desc">感谢您的购买</text>
      <view class="info-card">
        <text class="label">订单金额</text>
        <text class="value">¥{{ amount }}</text>
        <text class="label">订单编号</text>
        <text class="value">{{ orderId }}</text>
      </view>
    </view>
    <view class="actions">
      <button class="btn primary" @click="goOrder">查看订单</button>
      <button class="btn" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const orderId = ref('')
const amount = ref('0')

onMounted(() => {
  const q = getCurrentPages().pop()?.options || {}
  orderId.value = q.orderId || q.id || ''
  amount.value = q.amount || '0'
})

function goOrder() { uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderId.value}` }) }
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.result { text-align: center; padding: 40px 20px; }
.icon { font-size: 56px; color: #4CAF50; display: block; }
.title { font-size: 24px; font-weight: bold; display: block; margin-top: 12px; }
.desc { font-size: 14px; color: #666; display: block; margin-top: 6px; }
.info-card { background: #fff; border-radius: 12px; padding: 16px; margin-top: 20px; text-align: left; }
.label { font-size: 12px; color: #999; display: block; margin-top: 8px; }
.value { font-size: 16px; font-weight: 500; display: block; }
.value:first-of-type { color: #C41E3A; font-size: 22px; }
.actions { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.btn { width: 100%; height: 44px; border-radius: 22px; font-size: 15px; border: 1px solid #C41E3A; background: #fff; color: #C41E3A; text-align: center; line-height: 44px; }
.btn.primary { background: #C41E3A; color: #fff; }
</style>
