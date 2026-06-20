<template>
  <view class="page">
    <!-- 顶部装饰 -->
    <view class="top-decor" />

    <!-- 返回按钮 -->
    <view
      class="navbar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        v-if="step !== 3"
        class="back-btn"
        @tap="handleBack"
      >
        <AppIcon
          name="arrow-left"
          :size="20"
          color="#2c2c2c"
        />
      </view>
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="loading"
      class="body"
    >
      <view class="sk-steps">
        <view class="sk-dot" /><view class="sk-line" /><view class="sk-dot" />
      </view>
      <view class="sk-title" />
      <view class="sk-input" /><view class="sk-input sk-input-short" />
    </view>

    <!-- 错误 -->
    <view
      v-else-if="error"
      class="body center"
    >
      <AppIcon
        name="alert-circle"
        :size="80"
        color="#999"
      />
      <text class="error-msg">
        {{ error }}
      </text>
      <view
        class="btn"
        @tap="initPage"
      >
        <text class="btn-text">
          重试
        </text>
      </view>
    </view>

    <view
      v-else
      class="body"
    >
      <!-- 步骤指示(步骤1、2显示) -->
      <view
        v-if="step !== 3"
        class="steps"
      >
        <view
          class="step-dot"
          :class="step >= 1 ? 'dot-active' : 'dot-todo'"
        >
          <AppIcon
            v-if="step > 1"
            name="check"
            :size="16"
            color="#ffffff"
          />
          <text
            v-else
            class="dot-num"
            :class="{ 'dot-num-active': step >= 1 }"
          >
            1
          </text>
        </view>
        <view
          class="step-line"
          :class="step >= 2 ? 'line-active' : 'line-todo'"
        />
        <view
          class="step-dot"
          :class="step >= 2 ? 'dot-active' : 'dot-todo'"
        >
          <AppIcon
            v-if="step > 2"
            name="check"
            :size="16"
            color="#ffffff"
          />
          <text
            v-else
            class="dot-num"
            :class="{ 'dot-num-active': step >= 2 }"
          >
            2
          </text>
        </view>
      </view>

      <!-- 步骤1：验证手机号 -->
      <view
        v-if="step === 1"
        class="form"
      >
        <view class="form-head">
          <text class="form-title">
            找回密码
          </text>
          <text class="form-sub">
            请验证您的手机号
          </text>
        </view>
        <view class="fields">
          <view class="input-wrap">
            <view class="input-icon">
              <AppIcon
                name="phone"
                :size="20"
                color="#999999"
              />
            </view>
            <input
              class="input"
              type="number"
              :value="phone"
              maxlength="11"
              placeholder="请输入手机号"
              placeholder-class="input-ph"
              @input="onPhoneInput"
            >
          </view>
          <view class="input-wrap">
            <view class="input-icon">
              <AppIcon
                name="message-circle"
                :size="20"
                color="#999999"
              />
            </view>
            <input
              class="input input-code"
              type="number"
              :value="code"
              maxlength="6"
              placeholder="请输入验证码"
              placeholder-class="input-ph"
              @input="onCodeInput"
            >
            <view
              class="code-btn"
              :class="{ 'code-btn-disabled': countdown > 0 || !isPhoneValid || sendingCode }"
              @tap="sendCode"
            >
              <AppIcon
                v-if="sendingCode"
                name="loader-2"
                :size="16"
                color="#999"
                class="spin"
              />
              <text
                v-else
                class="code-btn-text"
                :class="{ 'code-btn-text-disabled': countdown > 0 || !isPhoneValid }"
              >
                {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
              </text>
            </view>
          </view>
          <text
            v-if="formError"
            class="error-text"
          >
            {{ formError }}
          </text>
          <view
            class="btn"
            :class="{ 'btn-disabled': !isPhoneValid || !isCodeValid || verifyingCode }"
            @tap="verifyPhone"
          >
            <AppIcon
              v-if="verifyingCode"
              name="loader-2"
              :size="16"
              color="#fff"
              class="spin"
            />
            <text
              v-else
              class="btn-text"
            >
              下一步
            </text>
          </view>
        </view>
      </view>

      <!-- 步骤2：设置新密码 -->
      <view
        v-else-if="step === 2"
        class="form"
      >
        <view class="form-head">
          <text class="form-title">
            设置新密码
          </text>
          <text class="form-sub">
            请设置6-20位新密码
          </text>
        </view>
        <view class="fields">
          <view>
            <view class="input-wrap">
              <view class="input-icon">
                <AppIcon
                  name="lock"
                  :size="20"
                  color="#999999"
                />
              </view>
              <input
                class="input input-pwd"
                :password="!showPassword"
                :value="password"
                placeholder="请输入新密码"
                placeholder-class="input-ph"
                @input="onPasswordInput"
              >
              <view
                class="eye-btn"
                @tap="showPassword = !showPassword"
              >
                <AppIcon
                  :name="showPassword ? 'eye-off' : 'eye'"
                  :size="20"
                  color="#999999"
                />
              </view>
            </view>
            <view
              v-if="password"
              class="strength-row"
            >
              <view class="strength-bars">
                <view
                  v-for="i in 3"
                  :key="i"
                  class="strength-bar"
                  :style="{ background: i <= passwordStrength.level ? passwordStrength.color : '#f5f1eb' }"
                />
              </view>
              <text
                class="strength-text"
                :style="{ color: passwordStrength.color }"
              >
                {{ passwordStrength.text }}
              </text>
            </view>
            <text class="hint-text">
              6-20位，建议包含数字和字母
            </text>
          </view>
          <view class="input-wrap">
            <view class="input-icon">
              <AppIcon
                name="lock"
                :size="20"
                color="#999999"
              />
            </view>
            <input
              class="input input-pwd"
              :password="!showConfirmPassword"
              :value="confirmPassword"
              placeholder="请再次输入新密码"
              placeholder-class="input-ph"
              @input="onConfirmInput"
            >
            <view
              class="eye-btn"
              @tap="showConfirmPassword = !showConfirmPassword"
            >
              <AppIcon
                :name="showConfirmPassword ? 'eye-off' : 'eye'"
                :size="20"
                color="#999999"
              />
            </view>
          </view>
          <text
            v-if="confirmPassword && password !== confirmPassword"
            class="error-text"
          >
            两次输入的密码不一致
          </text>
          <text
            v-else-if="formError"
            class="error-text"
          >
            {{ formError }}
          </text>
          <view
            class="btn"
            :class="{ 'btn-disabled': !isPasswordValid || isSubmitting }"
            @tap="resetPassword"
          >
            <AppIcon
              v-if="isSubmitting"
              name="loader-2"
              :size="16"
              color="#fff"
              class="spin"
            />
            <text
              v-else
              class="btn-text"
            >
              确认设置
            </text>
          </view>
        </view>
      </view>

      <!-- 步骤3：成功 -->
      <view
        v-else
        class="success"
      >
        <view class="success-icon">
          <AppIcon
            name="shield-check"
            :size="40"
            color="#22c55e"
          />
        </view>
        <text class="success-title">
          密码重置成功
        </text>
        <text class="success-sub">
          您的密码已重置成功{{ '\n' }}请使用新密码登录
        </text>
        <view
          class="btn success-btn"
          @tap="goLogin"
        >
          <text class="btn-text">
            去登录
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { authApi } from '@/lib/auth-data'

const statusBarHeight = ref(0)

const step = ref<1 | 2 | 3>(1)
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const countdown = ref(0)
const sendingCode = ref(false)
const verifyingCode = ref(false)
const isSubmitting = ref(false)
const formError = ref('')
const loading = ref(true)
const error = ref('')

let timer: ReturnType<typeof setInterval> | null = null

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

function handleBack() {
  if (step.value === 1) goBack()
  else step.value = 1
}

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) { clearInterval(timer); timer = null }
  }, 1000)
}

async function sendCode() {
  if (countdown.value > 0 || !isPhoneValid.value || sendingCode.value) {
    if (!isPhoneValid.value) formError.value = '请输入正确的手机号'
    return
  }
  sendingCode.value = true
  formError.value = ''
  try {
    const res = await authApi.sendCode(phone.value, 'reset')
    if (res.success) {
      startCountdown()
    } else {
      formError.value = res.message || '发送失败'
    }
  } catch (e: any) {
    formError.value = e?.message || '网络异常'
  } finally {
    sendingCode.value = false
  }
}

async function verifyPhone() {
  if (!isPhoneValid.value || !isCodeValid.value || verifyingCode.value) return
  verifyingCode.value = true
  formError.value = ''
  try {
    const res = await authApi.verifyCode(phone.value, code.value)
    if (res.success) {
      step.value = 2
    } else {
      formError.value = res.message || '验证失败'
    }
  } catch (e: any) {
    formError.value = e?.message || '网络异常'
  } finally {
    verifyingCode.value = false
  }
}

async function resetPassword() {
  if (!isPasswordValid.value || isSubmitting.value) return
  isSubmitting.value = true
  formError.value = ''
  try {
    const res = await authApi.resetPassword({ phone: phone.value, code: code.value, password: password.value })
    if (res.success) {
      step.value = 3
    } else {
      formError.value = res.message || '重置失败'
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
.page { position: relative; min-height: 100vh; background: #faf8f5; display: flex; flex-direction: column; }

.top-decor { position: absolute; top: 0; left: 0; right: 0; height: 512rpx; background: linear-gradient(to bottom, rgba(196, 30, 58, 0.1), transparent); pointer-events: none; }

.navbar { position: relative; z-index: 10; display: flex; align-items: center; padding-left: 16rpx; height: 112rpx; }
.back-btn { width: 64rpx; height: 64rpx; margin-left: -8rpx; display: flex; align-items: center; justify-content: center; }

.body { flex: 1; position: relative; z-index: 10; padding: 0 48rpx; }
.body.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }

/* 步骤指示 */
.steps { display: flex; align-items: center; justify-content: center; gap: 16rpx; padding: 48rpx 0; }
.step-dot { width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.dot-active { background: #c41e3a; }
.dot-todo { background: #f5f1eb; }
.dot-num { font-size: 28rpx; font-weight: 500; color: #999999; }
.dot-num-active { color: #ffffff; }
.step-line { width: 96rpx; height: 2px; }
.line-active { background: #c41e3a; }
.line-todo { background: #f5f1eb; }

/* 表单 */
.form-head { text-align: center; margin-bottom: 64rpx; }
.form-title { display: block; font-size: 48rpx; font-weight: 700; color: #2c2c2c; }
.form-sub { display: block; font-size: 26rpx; color: #999999; margin-top: 16rpx; }
.fields { display: flex; flex-direction: column; gap: 32rpx; }

.input-wrap { position: relative; display: flex; align-items: center; height: 96rpx; background: #f5f1eb; border-radius: 24rpx; }
.input-icon { position: absolute; left: 32rpx; top: 50%; transform: translateY(-50%); z-index: 1; }
.input { flex: 1; height: 96rpx; padding-left: 96rpx; padding-right: 32rpx; font-size: 30rpx; color: #2c2c2c; background: transparent; }
.input-code { padding-right: 216rpx; }
.input-pwd { padding-right: 96rpx; }
.input-ph { color: #999999; }
.code-btn { position: absolute; right: 16rpx; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; padding: 12rpx 28rpx; border-radius: 16rpx; background: rgba(196, 30, 58, 0.1); }
.code-btn-disabled { background: #f5f1eb; }
.code-btn-text { font-size: 26rpx; font-weight: 500; color: #c41e3a; }
.code-btn-text-disabled { color: #999999; }
.eye-btn { position: absolute; right: 32rpx; top: 50%; transform: translateY(-50%); }

/* 密码强度 */
.strength-row { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; padding: 0 8rpx; }
.strength-bars { display: flex; gap: 8rpx; flex: 1; }
.strength-bar { height: 8rpx; flex: 1; border-radius: 999rpx; }
.strength-text { font-size: 22rpx; }
.hint-text { display: block; font-size: 22rpx; color: #999999; margin-top: 8rpx; padding: 0 8rpx; }

.error-text { font-size: 26rpx; color: #ff4d4f; padding: 0 8rpx; }
.error-msg { font-size: 28rpx; color: #999; }

/* 按钮 */
.btn { display: flex; align-items: center; justify-content: center; gap: 12rpx; width: 100%; height: 96rpx; border-radius: 24rpx; background: #c41e3a; }
.btn-disabled { opacity: 0.5; }
.btn-text { font-size: 32rpx; font-weight: 500; color: #ffffff; }

/* 成功态 */
.success { display: flex; flex-direction: column; align-items: center; padding-top: 160rpx; }
.success-icon { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(34, 197, 94, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.success-title { font-size: 48rpx; font-weight: 700; color: #2c2c2c; }
.success-sub { font-size: 26rpx; color: #999999; margin-top: 16rpx; text-align: center; line-height: 1.6; }
.success-btn { margin-top: 64rpx; }

/* 骨架 */
@keyframes sk-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
.sk-steps { display: flex; align-items: center; justify-content: center; gap: 16rpx; margin-bottom: 64rpx; }
.sk-dot { width: 64rpx; height: 64rpx; border-radius: 50%; background: #e8e3db; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-line { width: 96rpx; height: 2px; background: #e8e3db; }
.sk-title { width: 240rpx; height: 48rpx; border-radius: 8rpx; background: #e8e3db; margin: 0 auto 64rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-input { width: 100%; height: 96rpx; border-radius: 24rpx; background: #e8e3db; margin-bottom: 32rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-input-short { width: 60%; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
