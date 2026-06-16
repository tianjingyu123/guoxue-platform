<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view class="back-btn" @tap="handleBack">
          <AppIcon name="arrow-left" :size="20" color="#2c2c2c" />
        </view>
        <text class="navbar-title">注册账号</text>
      </view>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="main">
      <view class="sk-progress">
        <view class="sk-dot" /><view class="sk-line" /><view class="sk-dot" /><view class="sk-line" /><view class="sk-dot" />
      </view>
      <view class="sk-input" /><view class="sk-btn" />
    </view>

    <!-- 错误 -->
    <view v-else-if="error" class="main center">
      <AppIcon name="alert-circle" :size="80" color="#999" />
      <text class="error-msg">{{ error }}</text>
      <view class="btn" @tap="initPage"><text class="btn-text">重试</text></view>
    </view>

    <!-- 正常 -->
    <template v-else>
      <!-- 进度指示器 -->
      <view class="progress-section">
        <view class="progress-row">
          <template v-for="(s, index) in steps" :key="s">
            <view
              class="step-circle"
              :class="{
                'step-active': step === s,
                'step-done': index < currentStepIndex,
                'step-todo': index > currentStepIndex && step !== s,
              }"
            >
              <AppIcon v-if="index < currentStepIndex" name="check" :size="16" color="#ffffff" />
              <text v-else class="step-num" :class="{ 'step-num-active': step === s }">{{ index + 1 }}</text>
            </view>
            <view v-if="index < 2" class="step-line" :class="{ 'step-line-done': index < currentStepIndex }" />
          </template>
        </view>
        <view class="progress-labels">
          <text class="progress-label">输入手机号</text>
          <text class="progress-label">验证身份</text>
          <text class="progress-label">设置密码</text>
        </view>
      </view>

      <!-- 表单内容 -->
      <view class="main">
        <!-- 步骤1: 输入手机号 -->
        <view v-if="step === 'phone'" class="form">
          <view class="form-head">
            <text class="form-title">输入手机号</text>
            <text class="form-sub">我们将发送验证码到您的手机</text>
          </view>
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="phone" :size="20" color="#999999" /></view>
            <input
              class="input"
              type="number"
              :value="phone"
              maxlength="11"
              placeholder="请输入手机号"
              placeholder-class="input-ph"
              @input="onPhoneInput"
            />
          </view>
          <text v-if="formError" class="error-text">{{ formError }}</text>
          <view class="btn" :class="{ 'btn-disabled': phone.length !== 11 || sendingCode }" @tap="sendCode">
            <AppIcon v-if="sendingCode" name="loader-2" :size="16" color="#fff" class="spin" />
            <text v-else class="btn-text">获取验证码</text>
          </view>
        </view>

        <!-- 步骤2: 输入验证码 -->
        <view v-else-if="step === 'verify'" class="form">
          <view class="form-head">
            <text class="form-title">输入验证码</text>
            <text class="form-sub">验证码已发送至 {{ maskedPhone }}</text>
          </view>
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="shield" :size="20" color="#999999" /></view>
            <input
              class="input input-code"
              type="number"
              :value="code"
              maxlength="6"
              placeholder="请输入6位验证码"
              placeholder-class="input-ph"
              @input="onCodeInput"
            />
          </view>
          <view class="resend-row">
            <text class="resend-tip">{{ countdown > 0 ? countdown + '秒后可重发' : '没有收到验证码？' }}</text>
            <text class="resend-btn" :class="{ 'resend-disabled': countdown > 0 }" @tap="sendCode">重新发送</text>
          </view>
          <text v-if="formError" class="error-text">{{ formError }}</text>
          <view class="btn" :class="{ 'btn-disabled': code.length !== 6 || verifyingCode }" @tap="verifyCode">
            <AppIcon v-if="verifyingCode" name="loader-2" :size="16" color="#fff" class="spin" />
            <text v-else class="btn-text">下一步</text>
          </view>
        </view>

        <!-- 步骤3: 设置密码 -->
        <view v-else class="form">
          <view class="form-head">
            <text class="form-title">完善信息</text>
            <text class="form-sub">设置您的昵称和登录密码</text>
          </view>
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="user" :size="20" color="#999999" /></view>
            <input
              class="input"
              :value="nickname"
              maxlength="20"
              placeholder="请输入昵称"
              placeholder-class="input-ph"
              @input="onNicknameInput"
            />
          </view>
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="lock" :size="20" color="#999999" /></view>
            <input
              class="input input-pwd"
              :password="!showPassword"
              :value="password"
              placeholder="请设置密码（6-20位）"
              placeholder-class="input-ph"
              @input="onPasswordInput"
            />
            <view class="eye-btn" @tap="showPassword = !showPassword">
              <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="20" color="#999999" />
            </view>
          </view>
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="lock" :size="20" color="#999999" /></view>
            <input
              class="input input-pwd"
              :password="!showConfirmPassword"
              :value="confirmPassword"
              placeholder="请再次输入密码"
              placeholder-class="input-ph"
              @input="onConfirmInput"
            />
            <view class="eye-btn" @tap="showConfirmPassword = !showConfirmPassword">
              <AppIcon :name="showConfirmPassword ? 'eye-off' : 'eye'" :size="20" color="#999999" />
            </view>
          </view>
          <text v-if="confirmPassword && password !== confirmPassword" class="error-text">两次输入的密码不一致</text>
          <text v-else-if="formError" class="error-text">{{ formError }}</text>
          <view class="terms-row">
            <view class="checkbox" :class="{ 'checkbox-checked': agreed }" @tap="agreed = !agreed">
              <AppIcon v-if="agreed" name="check" :size="12" color="#ffffff" />
            </view>
            <view class="terms-text">
              <text class="terms-normal">我已阅读并同意</text>
              <text class="terms-link">《用户协议》</text>
              <text class="terms-normal">和</text>
              <text class="terms-link">《隐私政策》</text>
            </view>
          </view>
          <view class="btn" :class="{ 'btn-disabled': !canRegister || isSubmitting }" @tap="handleRegister">
            <AppIcon v-if="isSubmitting" name="loader-2" :size="16" color="#fff" class="spin" />
            <text v-else class="btn-text">完成注册</text>
          </view>
        </view>

        <!-- 底部链接 -->
        <view class="bottom-link">
          <text class="bottom-normal">已有账号？</text>
          <text class="bottom-strong" @tap="goLogin">立即登录</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, reLaunch } from '@/utils/router'
import { authApi } from '@/lib/auth-data'

const statusBarHeight = ref(0)
const steps = ['phone', 'verify', 'password'] as const
type Step = (typeof steps)[number]

const step = ref<Step>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const nickname = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreed = ref(false)
const countdown = ref(0)
const sendingCode = ref(false)
const verifyingCode = ref(false)
const isSubmitting = ref(false)
const formError = ref('')
const loading = ref(true)
const error = ref('')

let timer: ReturnType<typeof setInterval> | null = null

const currentStepIndex = computed(() => steps.indexOf(step.value))
const maskedPhone = computed(() => phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
const canRegister = computed(
  () => password.value.length >= 6 && password.value === confirmPassword.value && !!nickname.value && agreed.value,
)

onMounted(() => { initPage() })

async function initPage() {
  loading.value = true
  error.value = ''
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 20
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onPhoneInput(e: any) { phone.value = String(e.detail.value).replace(/\D/g, '').slice(0, 11); formError.value = '' }
function onCodeInput(e: any) { code.value = String(e.detail.value).replace(/\D/g, '').slice(0, 6); formError.value = '' }
function onPasswordInput(e: any) { password.value = e.detail.value; formError.value = '' }
function onConfirmInput(e: any) { confirmPassword.value = e.detail.value; formError.value = '' }
function onNicknameInput(e: any) { nickname.value = String(e.detail.value).slice(0, 20) }

function handleBack() {
  if (step.value === 'phone') goBack()
  else if (step.value === 'verify') step.value = 'phone'
  else step.value = 'verify'
}

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) { clearInterval(timer); timer = null }
  }, 1000)
}

async function sendCode() {
  if (countdown.value > 0 || phone.value.length !== 11 || sendingCode.value) return
  sendingCode.value = true
  formError.value = ''
  try {
    const res = await authApi.sendCode(phone.value, 'register')
    if (res.success) {
      startCountdown()
      if (step.value === 'phone') step.value = 'verify'
    } else {
      formError.value = res.message || '发送失败'
    }
  } catch (e: any) {
    formError.value = e?.message || '网络异常'
  } finally {
    sendingCode.value = false
  }
}

async function verifyCode() {
  if (code.value.length !== 6 || verifyingCode.value) return
  verifyingCode.value = true
  formError.value = ''
  try {
    const res = await authApi.verifyCode(phone.value, code.value)
    if (res.success) {
      step.value = 'password'
    } else {
      formError.value = res.message || '验证失败'
    }
  } catch (e: any) {
    formError.value = e?.message || '网络异常'
  } finally {
    verifyingCode.value = false
  }
}

async function handleRegister() {
  if (!canRegister.value || isSubmitting.value) return
  isSubmitting.value = true
  formError.value = ''
  try {
    const res = await authApi.register({ phone: phone.value, code: code.value, password: password.value, nickname: nickname.value })
    if (res.success) {
      uni.setStorageSync('token', res.data?.token)
      uni.setStorageSync('user', JSON.stringify(res.data?.user))
      uni.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => reLaunch('/pages/index/index'), 800)
    } else {
      formError.value = res.message || '注册失败'
    }
  } catch (e: any) {
    formError.value = e?.message || '网络异常'
  } finally {
    isSubmitting.value = false
  }
}

function goLogin() { navigateTo('/pkg-auth/login/index') }

onUnmounted(() => {
  if (timer) { clearInterval(timer); timer = null }
})
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; display: flex; flex-direction: column; }

.navbar { position: sticky; top: 0; z-index: 40; background: rgba(250, 248, 245, 0.95); border-bottom: 1px solid #e8e0d5; }
.navbar-inner { display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 112rpx; }
.back-btn { width: 64rpx; height: 64rpx; margin-left: -16rpx; display: flex; align-items: center; justify-content: center; }
.navbar-title { font-size: 36rpx; font-weight: 600; color: #2c2c2c; }

/* 进度 */
.progress-section { padding: 32rpx 48rpx; }
.progress-row { display: flex; align-items: center; justify-content: space-between; }
.step-circle { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-active { background: #c41e3a; }
.step-done { background: #52c41a; }
.step-todo { background: #f0ebe3; }
.step-num { font-size: 28rpx; font-weight: 500; color: #999999; }
.step-num-active { color: #ffffff; }
.step-line { flex: 1; height: 2px; margin: 0 16rpx; background: #e8e0d5; }
.step-line-done { background: #52c41a; }
.progress-labels { display: flex; justify-content: space-between; margin-top: 16rpx; }
.progress-label { font-size: 22rpx; color: #999999; }

/* 表单 */
.main { flex: 1; padding: 32rpx 48rpx; }
.main.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }
.form { display: flex; flex-direction: column; gap: 48rpx; }
.form-head { display: flex; flex-direction: column; gap: 16rpx; }
.form-title { font-size: 40rpx; font-weight: 700; color: #2c2c2c; }
.form-sub { font-size: 26rpx; color: #999999; }

.input-wrap { position: relative; display: flex; align-items: center; height: 96rpx; background: #f5f1eb; border-radius: 24rpx; }
.input-icon { position: absolute; left: 24rpx; top: 50%; transform: translateY(-50%); z-index: 1; }
.input { flex: 1; height: 96rpx; padding-left: 88rpx; padding-right: 32rpx; font-size: 30rpx; color: #2c2c2c; background: transparent; }
.input-code { text-align: center; letter-spacing: 0.5em; }
.input-pwd { padding-right: 88rpx; }
.input-ph { color: #999999; letter-spacing: normal; }
.eye-btn { position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%); }

.resend-row { display: flex; align-items: center; justify-content: space-between; margin-top: -24rpx; }
.resend-tip { font-size: 26rpx; color: #999999; }
.resend-btn { font-size: 26rpx; font-weight: 500; color: #c41e3a; }
.resend-disabled { color: #999999; }

.error-text { font-size: 26rpx; color: #ff4d4f; margin-top: -24rpx; }

.terms-row { display: flex; align-items: flex-start; gap: 16rpx; }
.checkbox { width: 36rpx; height: 36rpx; border-radius: 8rpx; border: 2rpx solid #999999; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.checkbox-checked { background: #c41e3a; border-color: #c41e3a; }
.terms-text { flex: 1; line-height: 1.6; }
.terms-normal { font-size: 26rpx; color: #999999; }
.terms-link { font-size: 26rpx; color: #c41e3a; }

.btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; width: 100%; height: 96rpx; border-radius: 24rpx; background: #c41e3a; }
.btn-disabled { opacity: 0.5; }
.btn-text { font-size: 32rpx; font-weight: 500; color: #ffffff; }

.bottom-link { display: flex; align-items: center; justify-content: center; margin-top: 64rpx; }
.bottom-normal { font-size: 28rpx; color: #999999; }
.bottom-strong { font-size: 28rpx; font-weight: 500; color: #c41e3a; margin-left: 8rpx; }

.error-msg { font-size: 28rpx; color: #999; }

/* 骨架 */
@keyframes sk-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
.sk-progress { display: flex; align-items: center; justify-content: center; gap: 16rpx; margin-bottom: 64rpx; }
.sk-dot { width: 64rpx; height: 64rpx; border-radius: 50%; background: #e8e3db; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-line { width: 96rpx; height: 2px; background: #e8e3db; }
.sk-input { width: 100%; height: 96rpx; border-radius: 24rpx; background: #e8e3db; margin-bottom: 48rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-btn { width: 100%; height: 96rpx; border-radius: 24rpx; background: #e8e3db; animation: sk-pulse 1.5s ease-in-out infinite; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
