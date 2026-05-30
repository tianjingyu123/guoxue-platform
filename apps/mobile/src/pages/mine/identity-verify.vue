<template>
  <view class="page">
    <view class="form">
      <text class="step-title">实名认证</text>
      <input v-model="name" class="input" placeholder="真实姓名" />
      <input v-model="idCard" class="input" placeholder="身份证号码" />
      <view class="face-btn" @click="faceVerify"><text>人脸识别验证</text></view>
      <button class="btn" @click="submit">提交认证</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { identityApi } from '../../api'
const name = ref(''); const idCard = ref('')
async function faceVerify() { uni.showToast({ title: '人脸识别（演示）', icon: 'none' }) }
async function submit() {
  if (!name.value || !idCard.value) { uni.showToast({ title: '请填写完整', icon: 'none' }); return }
  try { await identityApi.verify({ name: name.value, idCard: idCard.value }); uni.showToast({ title: '认证已提交', icon: 'success' }) } catch {}
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.form { background: #fff; border-radius: 12px; padding: 16px; }
.step-title { font-size: 18px; font-weight: bold; display: block; margin-bottom: 16px; text-align: center; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 12px; font-size: 14px; background: #F5F0E8; margin-bottom: 12px; }
.face-btn { padding: 14px; background: #F5F0E8; border-radius: 10px; text-align: center; font-size: 14px; color: #C41E3A; margin-bottom: 12px; }
.btn { width: 100%; height: 44px; background: #C41E3A; color: #fff; border-radius: 22px; font-size: 15px; border: none; text-align: center; line-height: 44px; }
</style>
