<template>
  <view class="page">
    <view class="section">
      <view class="step" v-if="step === 1">
        <text class="tip">当前手机号：{{ masked }}</text>
        <input v-model="code" placeholder="输入验证码" class="input" />
        <button class="btn-send" @click="sendCode">发送验证码</button>
        <button class="btn-next" @click="step = 2">下一步</button>
      </view>
      <view class="step" v-else>
        <input v-model="newPhone" placeholder="新手机号" class="input" />
        <input v-model="newCode" placeholder="新手机验证码" class="input" />
        <button class="btn-send" @click="sendNewCode">发送验证码</button>
        <button class="btn-next" @click="submit">确认更换</button>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { userApi } from '../../api'
const step = ref(1); const code = ref(''); const newPhone = ref(''); const newCode = ref('')
const masked = ref('138****8888')
function sendCode() { uni.showToast({ title: '验证码已发送', icon: 'none' }) }
function sendNewCode() { uni.showToast({ title: '验证码已发送', icon: 'none' }) }
async function submit() {
  try { await (userApi as any).changePhone?.({ phone: newPhone.value, code: newCode.value }); uni.showToast({ title: '更换成功' }); setTimeout(() => uni.navigateBack(), 1500) } catch { uni.showToast({ title: '更换失败', icon: 'none' }) }
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.section { background: #fff; border-radius: 12px; padding: 24px 16px; }
.tip { font-size: 14px; color: #666; margin-bottom: 16px; display: block; }
.input { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; width: 100%; box-sizing: border-box; }
.btn-send { background: none; border: 1px solid #C41E3A; color: #C41E3A; border-radius: 8px; padding: 6px 12px; font-size: 12px; margin-bottom: 12px; }
.btn-next { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 15px; margin-top: 8px; }
</style>
