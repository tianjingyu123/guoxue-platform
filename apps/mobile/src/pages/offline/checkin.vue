<template>
  <view class="page">
    <view class="section">
      <text class="title">到店签到</text>
      <text class="desc">请到达线下站点后扫描二维码或点击按钮签到</text>
      <view class="qr-area"><text class="qr-icon">📷</text><text>扫码签到</text></view>
      <button class="btn-checkin" @click="checkin">手动签到</button>
      <text v-if="result" class="result">{{ result }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { offlineApi } from '../../api'
const result = ref('')
async function checkin() {
  try { await offlineApi.checkin({}); result.value = '签到成功！' } catch { result.value = '签到失败，请确认位置' }
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 24px 16px; text-align: center; }
.title { font-size: 18px; font-weight: 600; display: block; margin-bottom: 8px; }
.desc { font-size: 13px; color: #666; display: block; margin-bottom: 20px; }
.qr-area { border: 2px dashed #ddd; border-radius: 12px; padding: 30px; margin-bottom: 16px; }
.qr-icon { font-size: 40px; display: block; margin-bottom: 8px; }
.btn-checkin { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; }
.result { display: block; margin-top: 12px; font-size: 14px; color: #4CAF50; }
</style>
