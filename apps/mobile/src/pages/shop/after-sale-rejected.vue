<template>
  <view class="page">
    <view class="result"><text class="icon">📋</text><text class="title">售后申请被驳回</text><text class="reason">{{ reason }}</text></view>
    <view class="actions"><button class="btn" @click="reapply">重新申请</button><button class="btn outline" @click="goHome">返回</button></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const reason = ref('')
onMounted(() => { reason.value = (getCurrentPages().pop()?.options || {}).reason || '商家驳回了您的申请' })
function reapply() { uni.navigateBack() }
function goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.result { text-align: center; }
.icon { font-size: 56px; display: block; }
.title { font-size: 20px; font-weight: bold; display: block; margin-top: 12px; }
.reason { font-size: 13px; color: #666; margin-top: 8px; display: block; }
.actions { margin-top: 24px; display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 260px; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; text-align: center; line-height: 44px; }
.btn.outline { background: #fff; color: #C41E3A; border: 1px solid #C41E3A; }
</style>
