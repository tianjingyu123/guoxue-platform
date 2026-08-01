<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="navbar-inner">
        <view
          class="back-btn"
          role="button"
          aria-label="返回上一步"
          tabindex="0"
          @tap="handleBack"
          @keydown="activateOnKeyboard($event, handleBack)"
        >
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
            type="number"
            inputmode="numeric"
            :value="phone"
            maxlength="11"
            aria-label="注册手机号"
            placeholder="请输入手机号"
            placeholder-class="input-ph"
            @input="onPhoneInput"
          />
        </view>
        <view
          class="btn"
          :class="{ 'btn-disabled': phone.length !== 11 || isSendingCode }"
          role="button"
          :aria-busy="isSendingCode ? 'true' : 'false'"
          :aria-disabled="phone.length !== 11 || isSendingCode ? 'true' : 'false'"
          tabindex="0"
          @tap="sendCode"
          @keydown="activateOnKeyboard($event, sendCode)"
        >
          <text class="btn-text">{{ isSendingCode ? '发送中...' : '获取验证码' }}</text>
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
            inputmode="numeric"
            :value="code"
            maxlength="6"
            aria-label="注册短信验证码"
            placeholder="请输入6位验证码"
            placeholder-class="input-ph"
            @input="onCodeInput"
          />
        </view>
        <view class="resend-row">
          <text class="resend-tip">{{ countdown > 0 ? countdown + '秒后可重发' : '没有收到验证码？' }}</text>
          <text
            class="resend-btn"
            :class="{ 'resend-disabled': countdown > 0 || isSendingCode }"
            role="button"
            :aria-disabled="countdown > 0 || isSendingCode ? 'true' : 'false'"
            tabindex="0"
            @tap="sendCode"
            @keydown="activateOnKeyboard($event, sendCode)"
          >{{ isSendingCode ? '发送中...' : '重新发送' }}</text>
        </view>
        <view
          class="btn"
          :class="{ 'btn-disabled': code.length !== 6 || isVerifying }"
          role="button"
          :aria-busy="isVerifying ? 'true' : 'false'"
          :aria-disabled="code.length !== 6 || isVerifying ? 'true' : 'false'"
          tabindex="0"
          @tap="verifyCode"
          @keydown="activateOnKeyboard($event, verifyCode)"
        >
          <text class="btn-text">{{ isVerifying ? '校验中...' : '下一步' }}</text>
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
            aria-label="昵称"
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
            aria-label="注册密码"
            placeholder="请设置密码（6-20位）"
            placeholder-class="input-ph"
            @input="onPasswordInput"
          />
          <view
            class="eye-btn"
            role="button"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            tabindex="0"
            @tap="showPassword = !showPassword"
            @keydown="activateOnKeyboard($event, () => showPassword = !showPassword)"
          >
            <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="20" color="#999999" />
          </view>
        </view>
        <!-- 密码字段级校验提示 -->
        <text v-if="passwordError" class="error-text" role="alert" aria-live="polite">{{ passwordError }}</text>
        <!-- 确认密码 -->
        <view class="input-wrap">
          <view class="input-icon"><AppIcon name="lock" :size="20" color="#999999" /></view>
          <input
            class="input input-pwd"
            :password="!showConfirmPassword"
            :value="confirmPassword"
            aria-label="确认注册密码"
            placeholder="请再次输入密码"
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
        <!-- 密码不一致提示 -->
        <text
          v-if="confirmPassword && password !== confirmPassword"
          class="error-text"
          role="alert"
          aria-live="polite"
        >两次输入的密码不一致</text>
        <!-- 协议 -->
        <!-- 整行可点切换勾选（协议链接 .stop 仍跳协议页）；checkbox 视觉不变，热区=整行 ≥88rpx -->
        <view
          class="terms-row"
          role="checkbox"
          :aria-checked="agreed ? 'true' : 'false'"
          tabindex="0"
          @tap="agreed = !agreed"
          @keydown="activateOnKeyboard($event, () => agreed = !agreed)"
        >
          <view class="checkbox" :class="{ 'checkbox-checked': agreed }">
            <AppIcon v-if="agreed" name="check" :size="12" color="#ffffff" />
          </view>
          <view class="terms-text">
            <text class="terms-normal">我已阅读并同意</text>
            <text
              class="terms-link"
              role="link"
              tabindex="0"
              @tap.stop="navigateTo('/legal/user-agreement')"
              @keydown.stop="activateOnKeyboard($event, () => navigateTo('/legal/user-agreement'))"
            >《用户协议》</text>
            <text class="terms-normal">和</text>
            <text
              class="terms-link"
              role="link"
              tabindex="0"
              @tap.stop="navigateTo('/legal/privacy-policy')"
              @keydown.stop="activateOnKeyboard($event, () => navigateTo('/legal/privacy-policy'))"
            >《隐私政策》</text>
          </view>
        </view>
        <view
          class="btn"
          :class="{ 'btn-disabled': !canRegister || isLoading }"
          role="button"
          :aria-busy="isLoading ? 'true' : 'false'"
          :aria-disabled="!canRegister || isLoading ? 'true' : 'false'"
          tabindex="0"
          @tap="handleRegister"
          @keydown="activateOnKeyboard($event, handleRegister)"
        >
          <text class="btn-text">{{ isLoading ? '注册中...' : '完成注册' }}</text>
        </view>
      </view>

      <!-- 底部链接 -->
      <view
        class="bottom-link"
        role="link"
        tabindex="0"
        @tap="goLogin"
        @keydown="activateOnKeyboard($event, goLogin)"
      >
        <text class="bottom-normal">已有账号？</text>
        <text class="bottom-strong">立即登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, reLaunch } from '@/utils/router'
import { authApi } from '@/lib/auth-data'
import { setToken, setRefreshToken, setUserInfo } from '@/utils/storage'
import { hasCompletedInterestGuide } from '@/utils/interests'

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
// 第 2 步验证码真校验中（防重复提交）
const isVerifying = ref(false)
// 发码请求在途锁（防快速双击连发短信·与 login 页同范式）
const isSendingCode = ref(false)
// 与 request.ts 同源的 API 地址（BASE_URL/PREFIX 未导出，此处按同一规则拼装）
const API_BASE = `${(import.meta as any).env?.VITE_API_URL || ''}/api/v1`

let timer: ReturnType<typeof setInterval> | null = null

function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

const currentStepIndex = computed(() => steps.indexOf(step.value))
const maskedPhone = computed(() => phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
const canRegister = computed(
  () => password.value.length >= 6 && password.value === confirmPassword.value && !!nickname.value && agreed.value,
)
// 密码字段级校验：未输入时不打扰，输入后给出置灰按钮的具体原因（与 canRegister 的 >=6 门槛一致）
const passwordError = computed(() => {
  const pwd = password.value
  if (!pwd) return ''
  if (pwd.length < 6) return '密码长度不能少于6位'
  return ''
})

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
// 防重锁（照抄 login 的 isSendingCode 范式）：请求在途期间快速双击不再连发两条短信
async function sendCode() {
  if (countdown.value > 0 || phone.value.length !== 11 || isSendingCode.value) return
  isSendingCode.value = true
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
  } finally {
    isSendingCode.value = false
  }
}

/**
 * 第 2 步「下一步」真校验验证码 — POST /sms/verify（公开端点·仅限流保护）。
 * 错码当步就报，不再等到最后一步注册时才失败。
 * 🔴 不走 apiPost：后端错码返回 HTTP 401（AUTH_SMS_CODE_INVALID=200004 → mod 200 → 401），
 * 而 /sms/verify 不在 request.ts 的 isAuthEntryPath 白名单里，走 apiPost 会触发
 * refresh→handleUnauthorized 把未登录用户踢出注册流，故此处用裸 uni.request 自行处理。
 * 注：后端校验成功即消费验证码，但 /auth/register/phone 注册端点不收也不验 code，不会被阻断。
 */
function verifyCode() {
  if (!code.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  if (code.value.length !== 6) {
    uni.showToast({ title: '请输入6位验证码', icon: 'none' })
    return
  }
  if (isVerifying.value) return
  isVerifying.value = true
  uni.request({
    url: `${API_BASE}/sms/verify`,
    method: 'POST',
    // scene 必须与发码时一致（sendCode 用的 'register'，后端按 sms:code:register:{phone} 存取）
    data: { phone: phone.value, code: code.value, scene: 'register' },
    timeout: 15000,
    success: (res) => {
      // 成功契约与 request.ts apiFetch 一致：ResponseInterceptor 包壳 body.code === 200
      const body = res.data as { code?: number; message?: string } | undefined
      if (body && body.code === 200) {
        step.value = 'password'
      } else {
        uni.showToast({ title: body?.message || '验证码错误', icon: 'none' })
      }
    },
    fail: () => {
      uni.showToast({ title: '网络连接失败，请检查网络后重试', icon: 'none' })
    },
    complete: () => {
      isVerifying.value = false
    },
  })
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
      setRefreshToken(res.data.refreshToken || '')
      setUserInfo(res.data.user)
      // 未完成兴趣引导 → 先走欢迎峰值页；已选择或明确跳过的用户直接进首页
      if (hasCompletedInterestGuide()) {
        uni.reLaunch({ url: '/pages/index/index' })
      } else {
        reLaunch('/welcome')
      }
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
  width: 88rpx;
  height: 88rpx;
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
/* 热区扩到 88×88rpx（图标 40rpx 视觉位置不变：right = 24 - (88-40)/2 = 0） */
.eye-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
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
  min-height: 88rpx;
  padding-left: 24rpx;
  display: flex;
  align-items: center;
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

/* 协议：整行是勾选热区，padding+min-height 撑到 ≥88rpx（checkbox 视觉尺寸不变） */
.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  min-height: 88rpx;
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
  min-height: 88rpx;
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
