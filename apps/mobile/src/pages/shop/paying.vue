<template>
  <view class="page">
    <view class="status" :class="status">
      <text class="status-icon">{{ statusIcon }}</text>
      <text class="status-text">{{ statusText }}</text>
      <text class="status-desc">{{ statusDesc }}</text>
    </view>
    <view class="actions">
      <button v-if="status === 'success'" class="btn" @click="goHome">返回首页</button>
      <button v-if="status === 'success'" class="btn outline" @click="goOrder">查看订单</button>
      <button v-if="status === 'fail'" class="btn" @click="retry">重新支付</button>
      <button v-if="status === 'timeout'" class="btn" @click="retry">重新下单</button>
      <button v-if="status !== 'paying'" class="btn outline" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const status = ref('paying')
const orderId = ref('')
const statusIcon = computed(() => status.value === 'success' ? '✓' : status.value === 'fail' ? '✗' : '⏳')
const statusText = computed(() => status.value === 'success' ? '支付成功' : status.value === 'fail' ? '支付失败' : status.value === 'timeout' ? '支付超时' : '支付中...')
const statusDesc = computed(() =>
  status.value === 'success' ? '感谢您的购买' :
  status.value === 'fail' ? '请重试或选择其他支付方式' :
  status.value === 'timeout' ? '订单已超时，请重新下单' : '请稍候，正在确认支付结果')

onMounted(() => {
  const q = getCurrentPages().pop()?.options || {}
  if (q.status) status.value = q.status
  orderId.value = q.orderId || q.id || ''
})

function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
function goOrder() { uni.navigateTo({ url: `/pages/orders/order-detail?id=${orderId.value}` }) }
function retry() { uni.navigateBack() }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.status { text-align: center; }
.status-icon { font-size: 64px; display: block; }
.status.success .status-icon { color: #4CAF50; }
.status.fail .status-icon, .status.timeout .status-icon { color: #C41E3A; }
.status.paying .status-icon { color: #C9A96E; animation: spin 2s linear infinite; }
.status-text { font-size: 22px; font-weight: bold; display: block; margin-top: 16px; }
.status-desc { font-size: 14px; color: #666; display: block; margin-top: 8px; }
.actions { margin-top: 32px; display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; text-align: center; line-height: 44px; }
.btn.outline { background: #fff; color: #C41E3A; border: 1px solid #C41E3A; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
