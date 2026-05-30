<template>
  <view class="page">
    <view class="warn"><text class="warn-title">⚠ 账号注销须知</text><text class="warn-text">注销后所有数据将被清除，7天冷静期内可撤销。请确认您已知晓相关后果。</text></view>
    <input v-model="password" class="input" type="password" placeholder="请输入登录密码确认" />
    <input v-model="reason" class="input" placeholder="注销原因（选填）" />
    <button class="btn" @click="submit">提交注销申请</button>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '../../api'
const password = ref(''); const reason = ref('')
async function submit() {
  if (!password.value) { uni.showToast({ title: '请输入密码', icon: 'none' }); return }
  try { await authApi.deleteAccount({ password: password.value, reason: reason.value }); uni.navigateTo({ url: '/pages/mine/delete-account-result' }) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 16px; }
.warn { background: #FFF0F0; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
.warn-title { font-size: 16px; font-weight: bold; color: #C41E3A; display: block; }
.warn-text { font-size: 13px; color: #666; display: block; margin-top: 8px; line-height: 1.6; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 12px; font-size: 14px; background: #fff; margin-bottom: 12px; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 12px; text-align: center; line-height: 44px; }
</style>
