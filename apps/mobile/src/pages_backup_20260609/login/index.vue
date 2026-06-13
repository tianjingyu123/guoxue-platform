<template>
  <view class="login-page">
    <!-- 顶部装饰渐变 -->
    <view class="top-gradient" />

    <!-- 返回按钮 -->
    <view class="header">
      <text class="back-btn" @click="uni.navigateBack()">‹</text>
    </view>

    <view class="login-body">
      <!-- Logo和标题 -->
      <view class="logo-area">
        <image
          v-if="brandLogo"
          :src="brandLogo"
          class="logo-img"
          mode="aspectFill"
        />
        <view v-else class="logo-placeholder">
          <text class="logo-emoji">🏮</text>
        </view>
        <text class="app-name">{{ brandName }}</text>
        <text class="app-slogan">{{ brandSlogan }}</text>
      </view>

      <!-- 登录方式切换 -->
      <view class="login-tabs">
        <text
          class="tab-item"
          :class="{ active: loginType === 'phone' }"
          @click="loginType = 'phone'; error = ''"
        >验证码登录</text>
        <text
          class="tab-item"
          :class="{ active: loginType === 'password' }"
          @click="loginType = 'password'; error = ''"
        >密码登录</text>
      </view>

      <!-- 表单 -->
      <view class="form-area">
        <!-- 手机号 -->
        <view class="input-group">
          <text class="input-icon">📱</text>
          <input
            v-model="phone"
            type="number"
            class="input-field"
            placeholder="请输入手机号"
            maxlength="11"
            @input="phone = phone.replace(/[^\d]/g, '').slice(0, 11)"
          />
        </view>

        <!-- 验证码输入 -->
        <view v-if="loginType === 'phone'" class="input-group">
          <text class="input-icon">💬</text>
          <input
            v-model="code"
            type="number"
            class="input-field"
            placeholder="请输入验证码"
            maxlength="6"
            @input="code = code.replace(/[^\d]/g, '').slice(0, 6)"
          />
          <text
            class="code-btn"
            :class="{ disabled: countdown > 0 || phone.length !== 11 || sendingCode }"
            @click="sendCode"
          >
            {{ sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </text>
        </view>

        <!-- 密码输入 -->
        <view v-else class="input-group">
          <text class="input-icon">🔒</text>
          <input
            v-model="password"
            :type="showPwd ? 'text' : 'password'"
            class="input-field"
            placeholder="请输入密码"
          />
          <text class="pwd-toggle" @click="showPwd = !showPwd">
            {{ showPwd ? '🙈' : '👁' }}
          </text>
        </view>

        <!-- 错误提示 -->
        <view v-if="error" class="err-msg">
          <text>{{ error }}</text>
        </view>

        <!-- 忘记密码 -->
        <view v-if="loginType === 'password'" class="forgot-row">
          <text class="forgot-link" @click="goForgotPwd">忘记密码？</text>
        </view>

        <!-- 协议勾选 -->
        <view class="agree-row">
          <view
            class="agree-check"
            :class="{ checked: agreedTerms }"
            @click="agreedTerms = !agreedTerms"
          >
            <text v-if="agreedTerms" class="check-mark">✓</text>
          </view>
          <text class="agree-text">
            我已阅读并同意
            <text class="agree-link" @click="goPage('/pages/policy/user-agreement/index')">《用户服务协议》</text>
            和
            <text class="agree-link" @click="goPage('/pages/policy/privacy-policy/index')">《隐私政策》</text>
          </text>
        </view>

        <!-- 登录按钮 -->
        <view
          class="login-btn"
          :class="{ disabled: !canSubmit || isLoading }"
          @click="handleLogin"
        >
          <text v-if="isLoading" class="btn-loading">⏳ 登录中...</text>
          <text v-else>登录</text>
        </view>

        <!-- 注册入口 -->
        <view class="register-row">
          <text class="register-text">还没有账号？</text>
          <text class="register-link" @click="goPage('/pages/register/index')">立即注册</text>
        </view>
      </view>

      <!-- 第三方登录 -->
      <view class="third-party">
        <view class="divider-row">
          <view class="divider-line" />
          <text class="divider-text">其他登录方式</text>
          <view class="divider-line" />
        </view>

        <view class="third-icons">
          <view class="third-item" @click="thirdLogin('wechat')">
            <view class="third-icon wechat">微</view>
            <text class="third-label">微信</text>
          </view>
          <view class="third-item" @click="thirdLogin('apple')">
            <view class="third-icon apple">A</view>
            <text class="third-label">Apple</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部 -->
    <view class="bottom-tip">
      <text>登录即代表您同意遵守平台规则，共建和谐社区</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { authApi } from '../../api'

const loginType = ref<'phone' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const showPwd = ref(false)
const countdown = ref(0)
const isLoading = ref(false)
const sendingCode = ref(false)
const agreedTerms = ref(false)
const error = ref('')

const brandName = ref('热卜国学')
const brandSlogan = ref('探寻东方智慧')
const brandLogo = ref('/static/images/logo.png')

let countdownTimer: ReturnType<typeof setInterval> | null = null

const canSubmit = computed(() => {
  if (loginType.value === 'phone') {
    return phone.value.length === 11 && code.value.length === 6 && agreedTerms.value
  }
  return phone.value.length === 11 && password.value.length >= 6 && agreedTerms.value
})

function startCountdown() {
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      if (countdownTimer) clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function sendCode() {
  if (countdown.value > 0 || phone.value.length !== 11 || sendingCode.value) return
  sendingCode.value = true
  error.value = ''
  try {
    // @ts-ignore
    const res = await authApi.sendCode({ phone: phone.value, type: 'login' }) as any
    if (res?.code === 200 || res?.ok || !res?.code) {
      startCountdown()
    } else {
      error.value = res?.message || '发送失败，请重试'
    }
  } catch {
    error.value = '网络错误，请重试'
  } finally {
    sendingCode.value = false
  }
}

async function handleLogin() {
  if (!canSubmit.value || isLoading.value) return
  error.value = ''
  isLoading.value = true
  try {
    const params: Record<string, any> = { phone: phone.value }
    if (loginType.value === 'phone') {
      params.code = code.value
    } else {
      params.password = password.value
    }
    // @ts-ignore
    const res = await authApi.login(params) as any
    if (res?.code === 200 || res?.token || res?.data?.token) {
      const token = res?.token || res?.data?.token
      if (token) {
        uni.setStorageSync('token', token)
      }
      uni.switchTab({ url: '/pages/index/index' })
    } else {
      error.value = res?.message || '登录失败，请重试'
    }
  } catch {
    error.value = '网络错误，请重试'
  } finally {
    isLoading.value = false
  }
}

function thirdLogin(type: string) {
  if (!agreedTerms.value) {
    error.value = '请先阅读并同意相关协议'
    return
  }
  error.value = `${type === 'wechat' ? '微信' : 'Apple'}登录功能开发中`
}

function goPage(url: string) {
  uni.navigateTo({ url })
}

function goForgotPwd() {
  uni.navigateTo({ url: '/pages/forgot-password/index' })
}

onMounted(() => {
  // 检查是否已登录
  const token = uni.getStorageSync('token')
  if (token) {
    uni.switchTab({ url: '/pages/index/index' })
  }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #FAF8F5;
  display: flex;
  flex-direction: column;
  position: relative;
}

.top-gradient {
  position: absolute;
  top: 0; left: 0; right: 0; height: 260rpx;
  background: linear-gradient(180deg, rgba(196,30,58,0.1), transparent);
  pointer-events: none;
}

.header {
  position: relative;
  z-index: 10;
  padding: 0 24rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
}

.back-btn {
  font-size: 52rpx;
  color: #333;
  padding: 8rpx;
}

.login-body {
  flex: 1;
  padding: 0 48rpx;
  position: relative;
  z-index: 10;
}

/* Logo */
.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40rpx;
  padding-bottom: 60rpx;
}

.logo-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(196,30,58,0.2);
  margin-bottom: 20rpx;
}

.logo-placeholder {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(196,30,58,0.2);
  margin-bottom: 20rpx;
}

.logo-emoji {
  font-size: 72rpx;
}

.app-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #2C2C2C;
}

.app-slogan {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

/* 切换Tab */
.login-tabs {
  display: flex;
  justify-content: center;
  gap: 48rpx;
  margin-bottom: 40rpx;
}

.tab-item {
  font-size: 28rpx;
  color: #999;
  padding-bottom: 12rpx;
  border-bottom: 4rpx solid transparent;
  transition: all 0.2s;
}

.tab-item.active {
  color: #C41E3A;
  border-bottom-color: #C41E3A;
  font-weight: 600;
}

/* 表单 */
.form-area {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
  height: 96rpx;
  background: #F5F1EB;
  border-radius: 20rpx;
  padding: 0 24rpx;
}

.input-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: #2C2C2C;
}

.input-field::placeholder {
  color: #999;
}

.code-btn {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #C41E3A;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  background: rgba(196,30,58,0.08);
}

.code-btn.disabled {
  color: #999;
  background: #E8E0D5;
}

.pwd-toggle {
  font-size: 32rpx;
  padding: 8rpx;
}

/* 错误 */
.err-msg {
  padding: 0 8rpx;
}

.err-msg text {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 忘记密码 */
.forgot-row {
  display: flex;
  justify-content: flex-end;
}

.forgot-link {
  font-size: 24rpx;
  color: #C41E3A;
}

/* 协议 */
.agree-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 16rpx 0;
}

.agree-check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 3rpx solid #CCC;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
}

.agree-check.checked {
  background: #C41E3A;
  border-color: #C41E3A;
}

.check-mark {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
}

.agree-text {
  font-size: 22rpx;
  color: #999;
  line-height: 1.6;
}

.agree-link {
  color: #C41E3A;
}

/* 登录按钮 */
.login-btn {
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3);
}

.login-btn.disabled {
  opacity: 0.5;
  box-shadow: none;
}

.btn-loading {
  font-size: 26rpx;
}

/* 注册 */
.register-row {
  display: flex;
  justify-content: center;
  gap: 4rpx;
  padding: 20rpx 0;
}

.register-text {
  font-size: 26rpx;
  color: #999;
}

.register-link {
  font-size: 26rpx;
  color: #C41E3A;
}

/* 第三方登录 */
.third-party {
  margin-top: 80rpx;
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 40rpx;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #E8E0D5;
}

.divider-text {
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
}

.third-icons {
  display: flex;
  justify-content: center;
  gap: 80rpx;
}

.third-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.third-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 700;
}

.third-icon.wechat {
  background: rgba(7,193,96,0.1);
  color: #07C160;
}

.third-icon.apple {
  background: rgba(0,0,0,0.06);
  color: #333;
}

.third-label {
  font-size: 22rpx;
  color: #999;
}

/* 底部 */
.bottom-tip {
  text-align: center;
  padding: 40rpx 48rpx;
  position: relative;
  z-index: 10;
}

.bottom-tip text {
  font-size: 22rpx;
  color: #CCC;
}
</style>
