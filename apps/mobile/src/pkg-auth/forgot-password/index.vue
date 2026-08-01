<template>
  <view class="page">
    <!-- 顶部装饰 -->
    <view class="top-decor" />

    <!-- 返回按钮 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view
        v-if="step !== 3"
        class="back-btn"
        role="button"
        aria-label="返回上一步"
        tabindex="0"
        @tap="handleBack"
        @keydown="activateOnKeyboard($event, handleBack)"
      >
        <AppIcon name="arrow-left" :size="20" color="#2c2c2c" />
      </view>
    </view>

    <view class="body">
      <!-- 步骤指示(步骤1、2显示) -->
      <view v-if="step !== 3" class="steps">
        <view class="step-dot" :class="step >= 1 ? 'dot-active' : 'dot-todo'">
          <AppIcon v-if="step > 1" name="check" :size="16" color="#ffffff" />
          <text v-else class="dot-num" :class="{ 'dot-num-active': step >= 1 }">1</text>
        </view>
        <view class="step-line" :class="step >= 2 ? 'line-active' : 'line-todo'" />
        <view class="step-dot" :class="step >= 2 ? 'dot-active' : 'dot-todo'">
          <AppIcon v-if="step > 2" name="check" :size="16" color="#ffffff" />
          <text v-else class="dot-num" :class="{ 'dot-num-active': step >= 2 }">2</text>
        </view>
      </view>

      <!-- 步骤1：验证手机号 -->
      <view v-if="step === 1" class="form">
        <view class="form-head">
          <text class="form-title">找回密码</text>
          <text class="form-sub">请验证您的手机号</text>
        </view>
        <view class="fields">
          <!-- 手机号 -->
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="phone" :size="20" color="#999999" /></view>
            <input
              class="input"
              type="number"
              inputmode="numeric"
              :value="phone"
              maxlength="11"
              aria-label="找回密码手机号"
              placeholder="请输入手机号"
              placeholder-class="input-ph"
              @input="onPhoneInput"
            />
          </view>
          <!-- 验证码 -->
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="message-circle" :size="20" color="#999999" /></view>
            <input
              class="input input-code"
              type="number"
              inputmode="numeric"
              :value="code"
              maxlength="6"
              aria-label="短信验证码"
              placeholder="请输入验证码"
              placeholder-class="input-ph"
              @input="onCodeInput"
            />
            <view
              class="code-btn"
              :class="{ 'code-btn-disabled': countdown > 0 || !isPhoneValid || isSendingCode }"
              role="button"
              :aria-label="countdown > 0 ? `${countdown}秒后可重新获取验证码` : '获取验证码'"
              :aria-busy="isSendingCode ? 'true' : 'false'"
              :aria-disabled="countdown > 0 || !isPhoneValid || isSendingCode ? 'true' : 'false'"
              tabindex="0"
              @tap="sendCode"
              @keydown="activateOnKeyboard($event, sendCode)"
            >
              <text class="code-btn-text" :class="{ 'code-btn-text-disabled': countdown > 0 || !isPhoneValid || isSendingCode }">
                {{ isSendingCode ? '发送中...' : countdown > 0 ? countdown + 's' : '获取验证码' }}
              </text>
            </view>
          </view>
          <text v-if="error" class="error-text" role="alert" aria-live="polite">{{ error }}</text>
          <view
            class="btn"
            :class="{ 'btn-disabled': !isPhoneValid || !isCodeValid }"
            role="button"
            :aria-disabled="!isPhoneValid || !isCodeValid ? 'true' : 'false'"
            tabindex="0"
            @tap="verifyPhone"
            @keydown="activateOnKeyboard($event, verifyPhone)"
          >
            <text class="btn-text">下一步</text>
          </view>
        </view>
      </view>

      <!-- 步骤2：设置新密码 -->
      <view v-else-if="step === 2" class="form">
        <view class="form-head">
          <text class="form-title">设置新密码</text>
          <text class="form-sub">请设置6-20位新密码</text>
        </view>
        <view class="fields">
          <!-- 新密码 -->
          <view>
            <view class="input-wrap">
              <view class="input-icon"><AppIcon name="lock" :size="20" color="#999999" /></view>
              <input
                class="input input-pwd"
                :password="!showPassword"
                :value="password"
                aria-label="新密码"
                placeholder="请输入新密码"
                placeholder-class="input-ph"
                @input="onPasswordInput"
              />
              <view
                class="eye-btn"
                role="button"
                :aria-label="showPassword ? '隐藏新密码' : '显示新密码'"
                tabindex="0"
                @tap="showPassword = !showPassword"
                @keydown="activateOnKeyboard($event, () => showPassword = !showPassword)"
              >
                <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="20" color="#999999" />
              </view>
            </view>
            <!-- 密码强度 -->
            <view
              v-if="password"
              class="strength-row"
              role="meter"
              aria-label="密码强度"
              aria-valuemin="0"
              aria-valuemax="3"
              :aria-valuenow="passwordStrength.level"
              :aria-valuetext="passwordStrength.text"
            >
              <view class="strength-bars">
                <view
                  v-for="i in 3"
                  :key="i"
                  class="strength-bar"
                  :style="{ background: i <= passwordStrength.level ? passwordStrength.color : '#f5f1eb' }"
                />
              </view>
              <text class="strength-text" :style="{ color: passwordStrength.color }">{{ passwordStrength.text }}</text>
            </view>
            <text class="hint-text">6-20位，建议包含数字和字母</text>
          </view>
          <!-- 确认密码 -->
          <view class="input-wrap">
            <view class="input-icon"><AppIcon name="lock" :size="20" color="#999999" /></view>
            <input
              class="input input-pwd"
              :password="!showConfirmPassword"
              :value="confirmPassword"
              aria-label="确认新密码"
              placeholder="请再次输入新密码"
              placeholder-class="input-ph"
              @input="onConfirmInput"
            />
            <view
              class="eye-btn"
              role="button"
              :aria-label="showConfirmPassword ? '隐藏确认密码' : '显示确认密码'"
              tabindex="0"
              @tap="showConfirmPassword = !showConfirmPassword"
              @keydown="activateOnKeyboard($event, () => showConfirmPassword = !showConfirmPassword)"
            >
              <AppIcon :name="showConfirmPassword ? 'eye-off' : 'eye'" :size="20" color="#999999" />
            </view>
          </view>
          <text
            v-if="confirmPassword && password !== confirmPassword"
            class="error-text"
            role="alert"
            aria-live="polite"
          >两次输入的密码不一致</text>
          <text v-else-if="error" class="error-text" role="alert" aria-live="polite">{{ error }}</text>
          <view
            class="btn"
            :class="{ 'btn-disabled': !isPasswordValid || isLoading }"
            role="button"
            :aria-busy="isLoading ? 'true' : 'false'"
            :aria-disabled="!isPasswordValid || isLoading ? 'true' : 'false'"
            tabindex="0"
            @tap="resetPassword"
            @keydown="activateOnKeyboard($event, resetPassword)"
          >
            <text class="btn-text">{{ isLoading ? '设置中...' : '确认设置' }}</text>
          </view>
        </view>
      </view>

      <!-- 步骤3：成功 -->
      <view v-else class="success">
        <view class="success-icon">
          <AppIcon name="shield-check" :size="40" color="#22c55e" />
        </view>
        <text class="success-title">密码重置成功</text>
        <text class="success-sub">您的密码已重置成功{{ '\n' }}请使用新密码登录</text>
        <view
          class="btn success-btn"
          role="button"
          tabindex="0"
          @tap="goLogin"
          @keydown="activateOnKeyboard($event, goLogin)"
        >
          <text class="btn-text">去登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { authApi } from '@/lib/auth-data'

const statusBarHeight = ref(0)

// UI 临时状态
const step = ref<1 | 2 | 3>(1)
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const countdown = ref(0)
const isSendingCode = ref(false)
const isLoading = ref(false)
const error = ref('')

let timer: ReturnType<typeof setInterval> | null = null

function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

const isPhoneValid = computed(() => phone.value.length === 11)
const isCodeValid = computed(() => code.value.length === 6)
const isPasswordValid = computed(() => password.value.length >= 6 && password.value === confirmPassword.value)

const passwordStrength = computed(() => {
  const pwd = password.value
  if (!pwd) return { level: 0, text: '', color: '' }
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[!@#$%^&*]/.test(pwd)) score++
  if (score <= 2) return { level: 1, text: '弱', color: '#ff4d4f' }
  if (score <= 3) return { level: 2, text: '中', color: '#c9a96e' }
  return { level: 3, text: '强', color: '#22c55e' }
})

function onPhoneInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  phone.value = String(e.detail.value).replace(/\D/g, '').slice(0, 11)
  error.value = ''
}
function onCodeInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  code.value = String(e.detail.value).replace(/\D/g, '').slice(0, 6)
  error.value = ''
}
function onPasswordInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  password.value = e.detail.value
  error.value = ''
}
function onConfirmInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  confirmPassword.value = e.detail.value
  error.value = ''
}

function handleBack() {
  if (step.value === 1) goBack()
  else step.value = 1
}

// @data-needs: 发送找回密码验证码, 参数 {phone, scene:'reset'}, 返回 {success, message}
async function sendCode() {
  if (countdown.value > 0 || !isPhoneValid.value || isSendingCode.value) {
    if (!isPhoneValid.value) error.value = '请输入正确的手机号'
    return
  }
  isSendingCode.value = true
  try {
    const res = await authApi.sendCode(phone.value, 'reset')
    if (!res.success) { error.value = res.message || '发送失败'; return }
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) clearInterval(timer)
    }, 1000)
  } catch (e) {
    error.value = (e as Error)?.message || '发送失败'
  } finally {
    isSendingCode.value = false
  }
}

// @data-needs: 校验找回密码验证码, 参数 {phone, code}, 返回 {success, message}
function verifyPhone() {
  if (!isPhoneValid.value || !isCodeValid.value) return
  error.value = ''
  step.value = 2
}

// @data-needs: 重置密码, 参数 {phone, code, password}, 返回 {success, message}
async function resetPassword() {
  if (!isPasswordValid.value || isLoading.value) return
  error.value = ''
  isLoading.value = true
  try {
    const res = await authApi.resetPassword({ phone: phone.value, code: code.value, password: password.value })
    if (res.success) {
      step.value = 3
    } else {
      error.value = res.message || '重置失败'
    }
  } catch (e) {
    error.value = (e as Error)?.message || '重置失败'
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
  position: relative;
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
}

/* 顶部装饰 */
.top-decor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 512rpx;
  background: linear-gradient(to bottom, rgba(196, 30, 58, 0.1), transparent);
  pointer-events: none;
}

/* 导航 */
.navbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  padding-left: 16rpx;
  height: 112rpx;
}
.back-btn {
  width: 88rpx;
  height: 88rpx;
  margin-left: -8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.body {
  flex: 1;
  position: relative;
  z-index: 10;
  padding: 0 48rpx;
}

/* 步骤指示 */
.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 48rpx 0;
}
.step-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dot-active {
  background: var(--brand);
}
.dot-todo {
  background: #f5f1eb;
}
.dot-num {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.dot-num-active {
  color: #ffffff;
}
.step-line {
  width: 96rpx;
  height: 2px;
}
.line-active {
  background: var(--brand);
}
.line-todo {
  background: #f5f1eb;
}

/* 表单 */
.form-head {
  text-align: center;
  margin-bottom: 64rpx;
}
.form-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.form-sub {
  display: block;
  font-size: 26rpx;
  color: #999999;
  margin-top: 16rpx;
}
.fields {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
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
  left: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}
.input {
  flex: 1;
  height: 96rpx;
  padding-left: 96rpx;
  padding-right: 32rpx;
  font-size: 30rpx;
  color: #2c2c2c;
  background: transparent;
}
.input-code {
  padding-right: 216rpx;
}
.input-pwd {
  padding-right: 96rpx;
}
.input-ph {
  color: #999999;
}
.code-btn {
  position: absolute;
  right: 8rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 128rpx;
  height: 88rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: rgba(196, 30, 58, 0.1);
}
.code-btn-disabled {
  background: #f5f1eb;
}
.code-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--brand);
}
.code-btn-text-disabled {
  color: #999999;
}
.eye-btn {
  position: absolute;
  right: 8rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 密码强度 */
.strength-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
  padding: 0 8rpx;
}
.strength-bars {
  display: flex;
  gap: 8rpx;
  flex: 1;
}
.strength-bar {
  height: 8rpx;
  flex: 1;
  border-radius: 999rpx;
}
.strength-text {
  font-size: 22rpx;
}
.hint-text {
  display: block;
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
  padding: 0 8rpx;
}

.error-text {
  font-size: 26rpx;
  color: #ff4d4f;
  padding: 0 8rpx;
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

/* 成功态 */
.success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
}
.success-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.success-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.success-sub {
  font-size: 26rpx;
  color: #999999;
  margin-top: 16rpx;
  text-align: center;
  line-height: 1.6;
}
.success-btn {
  margin-top: 64rpx;
}
</style>
