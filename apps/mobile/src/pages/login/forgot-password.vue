<template>
  <view class="page">
    <view class="form">
      <view
        v-if="step === 1"
        class="step"
      >
        <text class="step-title">
          验证手机号
        </text>
        <view class="input-row">
          <input
            v-model="phone"
            placeholder="请输入手机号"
            class="input"
            type="number"
            maxlength="11"
          >
        </view>
        <view class="input-row">
          <input
            v-model="code"
            placeholder="验证码"
            class="input short"
            type="number"
            maxlength="6"
          >
          <button
            class="btn-code"
            :disabled="countdown > 0"
            @click="sendCode"
          >
            {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
          </button>
        </view>
        <button
          class="btn"
          @click="verifyCode"
        >
          下一步
        </button>
      </view>
      <view
        v-if="step === 2"
        class="step"
      >
        <text class="step-title">
          设置新密码
        </text>
        <view class="input-row">
          <input
            v-model="password"
            placeholder="新密码（6-20位）"
            class="input"
            type="password"
          >
        </view>
        <view class="input-row">
          <input
            v-model="confirmPwd"
            placeholder="确认新密码"
            class="input"
            type="password"
          >
        </view>
        <button
          class="btn"
          @click="resetPassword"
        >
          重置密码
        </button>
      </view>
      <view
        v-if="step === 3"
        class="step"
      >
        <text class="step-icon">
          ✓
        </text>
        <text class="step-title">
          密码重置成功
        </text>
        <button
          class="btn"
          @click="goLogin"
        >
          返回登录
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '../../api'

const step = ref(1)
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPwd = ref('')
const countdown = ref(0)
let timer: any = null

async function sendCode() {
  if (!phone.value) return
  try {
    await authApi.sendCode(phone.value, 'RESET_PASSWORD')
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    countdown.value = 60
    timer = setInterval(() => { countdown.value--; if (countdown.value <= 0) clearInterval(timer) }, 1000)
  } catch {}
}

async function verifyCode() {
  if (!code.value) return
  step.value = 2
}

async function resetPassword() {
  if (!password.value || password.value !== confirmPwd.value) {
    uni.showToast({ title: '密码不一致', icon: 'none' }); return
  }
  try {
    await authApi.changePassword({ oldPassword: '', newPassword: password.value } as any)
    step.value = 3
  } catch {}
}
function goLogin() { uni.navigateTo({ url: '/pages/login/login' }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 40px 20px; }
.form { background: #fff; border-radius: 16px; padding: 24px; }
.step { text-align: center; }
.step-icon { font-size: 48px; color: #4CAF50; display: block; margin-bottom: 12px; }
.step-title { font-size: 20px; font-weight: bold; display: block; margin-bottom: 20px; }
.input-row { margin-bottom: 14px; display: flex; gap: 8px; }
.input { border: 1px solid #ddd; border-radius: 10px; padding: 12px; font-size: 15px; background: #F5F0E8; flex: 1; }
.input.short { flex: 1; }
.btn-code { width: 110px; height: 44px; background: #C9A96E; color: #fff; border-radius: 22px; font-size: 13px; border: none; line-height: 44px; text-align: center; flex-shrink: 0; }
.btn-code[disabled] { background: #ccc; }
.btn { width: 100%; height: 46px; background: #C41E3A; color: #fff; border-radius: 23px; font-size: 16px; border: none; margin-top: 8px; text-align: center; line-height: 46px; }
</style>
