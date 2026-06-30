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
            type="text"
            :value="phone"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-class="input-ph"
            @input="onPhoneInput"
          />
        </view>
        <view class="btn" :class="{ 'btn-disabled': phone.length !== 11 }" @tap="sendCode">
          <text class="btn-text">获取验证码</text>
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
            type="text"
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
        <view class="btn" :class="{ 'btn-disabled': code.length !== 6 }" @tap="verifyCode">
          <text class="btn-text">下一步</text>
        </view>
      </view>

      <!-- 步骤3: 设置密码 -->
      <view v-else class="form">
        <view class="form-head">
          <text class="form-title">完善信息</text>
          <text class="form-sub">设置您的昵称和登录密码</text>
        </view>
        <!-- 昵称 -->
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
        <!-- 密码 -->
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
        <!-- 确认密码 -->
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
        <!-- 密码不一致提示 -->
        <text v-if="confirmPassword && password !== confirmPassword" class="error-text">两次输入的密码不一致</text>
        <!-- 协议 -->
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
        <view class="btn" :class="{ 'btn-disabled': !canRegister || isLoading }" @tap="handleRegister">
          <text class="btn-text">{{ isLoading ? '注册中...' : '完成注册' }}</text>
        </view>
      </view>

      <!-- 底部链接 -->
      <view class="bottom-link">
        <text class="bottom-normal">已有账号？</text>
        <text class="bottom-strong" @tap="goLogin">立即登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { authApi } from '@/lib/auth-data'
import { setToken, setUserInfo } from '@/utils/storage'

const statusBarHeight = ref(0)
const steps = ['phone', 'verify', 'password'] as const
type Step = (typeof steps)[number]

// UI 临时状态
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
const isLoading = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const currentStepIndex = computed(() => steps.indexOf(step.value))
const maskedPhone = computed(() => phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
const canRegister = computed(
  () => password.value.length >= 6 && password.value === confirmPassword.value && !!nickname.value && agreed.value,
)

function onPhoneInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  phone.value = String(e.detail.value).replace(/\D/g, '').slice(0, 11)
}
function onCodeInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  code.value = String(e.detail.value).replace(/\D/g, '').slice(0, 6)
}
function onPasswordInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  password.value = e.detail.value
}
function onConfirmInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  confirmPassword.value = e.detail.value
}
function onNicknameInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  nickname.value = String(e.detail.value).slice(0, 20)
}

function handleBack() {
  if (step.value === 'phone') goBack()
  else if (step.value === 'verify') step.value = 'phone'
  else step.value = 'verify'
}

// @data-needs: 发送注册验证码, 参数 {phone, scene:'register'}, 返回 {success, message}
async function sendCode() {
  if (countdown.value > 0 || phone.value.length !== 11) return
  try {
    const res = await authApi.sendCode(phone.value, 'register')
    if (!res.success) { uni.showToast({ title: res.message || '发送失败', icon: 'none' }); return }
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) clearInterval(timer)
    }, 1000)
    if (step.value === 'phone') step.value = 'verify'
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '发送失败', icon: 'none' })
  }
}

// @data-needs: 校验验证码, 参数 {phone, code}, 返回 {success, message}
function verifyCode() {
  if (code.value.length !== 6) return
  step.value = 'password'
}

// @data-needs: 注册, 参数 {phone, code, password, nickname}, 返回 {success, data:{token, user}, message}
async function handleRegister() {
  if (!canRegister.value || isLoading.value) return
  isLoading.value = true
  try {
    const res = await authApi.register({
      phone: phone.value,
      code: code.value,
      password: password.value,
      nickname: nickname.value,
    })
    if (res.success && res.data?.token) {
      setToken(res.data.token)
      setUserInfo(res.data.user)
      uni.reLaunch({ url: '/pages/index/index' })
    } else {
      uni.showToast({ title: res.message || '注册失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '注册失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

function goLogin() {
  navigateTo('/login')
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* 导航 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 1px solid #e8e0d5;
}
.navbar-inner {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  height: 112rpx;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
  margin-left: -16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 进度指示器 */
.progress-section {
  padding: 32rpx 48rpx;
}
.progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.step-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-active {
  background: var(--brand);
}
.step-done {
  background: #52c41a;
}
.step-todo {
  background: #f0ebe3;
}
.step-num {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.step-num-active {
  color: #ffffff;
}
.step-line {
  flex: 1;
  height: 2px;
  margin: 0 16rpx;
  background: #e8e0d5;
}
.step-line-done {
  background: #52c41a;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
}
.progress-label {
  font-size: 22rpx;
  color: #999999;
}

/* 表单 */
.main {
  flex: 1;
  padding: 32rpx 48rpx;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}
.form-head {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.form-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.form-sub {
  font-size: 26rpx;
  color: #999999;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 96rpx;
  background: #f5f1eb;
  border-radius: 24rpx;
}
.input-icon {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}
.input {
  flex: 1;
  height: 96rpx;
  padding-left: 88rpx;
  padding-right: 32rpx;
  font-size: 30rpx;
  color: #2c2c2c;
  background: transparent;
}
.input-code {
  text-align: center;
  letter-spacing: 0.5em;
}
.input-pwd {
  padding-right: 88rpx;
}
.input-ph {
  color: #999999;
  letter-spacing: normal;
}
.eye-btn {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
}

.resend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -24rpx;
}
.resend-tip {
  font-size: 26rpx;
  color: #999999;
}
.resend-btn {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--brand);
}
.resend-disabled {
  color: #999999;
}

.error-text {
  font-size: 26rpx;
  color: #ff4d4f;
  margin-top: -24rpx;
}

/* 协议 */
.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 2rpx solid #999999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}
.checkbox-checked {
  background: var(--brand);
  border-color: var(--brand);
}
.terms-text {
  flex: 1;
  line-height: 1.6;
}
.terms-normal {
  font-size: 26rpx;
  color: #999999;
}
.terms-link {
  font-size: 26rpx;
  color: var(--brand);
}

/* 按钮 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--brand);
}
.btn-disabled {
  opacity: 0.5;
}
.btn-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 底部链接 */
.bottom-link {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 64rpx;
}
.bottom-normal {
  font-size: 28rpx;
  color: #999999;
}
.bottom-strong {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--brand);
  margin-left: 8rpx;
}
</style>
