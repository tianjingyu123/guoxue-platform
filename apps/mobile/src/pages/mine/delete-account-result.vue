<template>
  <view class="page"><view class="result"><text class="icon">⏳</text><text class="title">注销申请已提交</text><text class="desc">账号将在7天冷静期后正式注销，期间登录可自动撤销</text></view><button class="btn" @click="cancel">撤销注销申请</button></view>
</template>
<script setup lang="ts">
import { authApi } from '../../api'
async function cancel() { try { await authApi.cancelDeleteAccount(); uni.showToast({ title: '已撤销', icon: 'success' }) } catch {} }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.result { text-align: center; }
.icon { font-size: 56px; display: block; }
.title { font-size: 22px; font-weight: bold; display: block; margin-top: 12px; }
.desc { font-size: 14px; color: #666; display: block; margin-top: 8px; }
.btn { width: 200px; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; margin-top: 24px; text-align: center; line-height: 44px; }
</style>
