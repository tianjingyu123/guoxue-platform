<template>
  <view class="page">
    <!-- 顶部渐变装饰 -->
    <view class="top-decor" />

    <!-- 返回按钮 -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="back-btn" @tap="goBack">
        <AppIcon name="chevron-left" :size="24" color="#2c2c2c" />
      </view>
    </view>

    <view class="body">
      <!-- Logo和标题 -->
      <view class="logo-section">
        <view class="logo-box">
          <image lazy-load class="logo-img" :src="logoSrc" mode="aspectFill" />
        </view>
        <text class="app-title">{{ BRAND.name }}</text>
        <text class="app-subtitle">{{ BRAND.slogan }}</text>
      </view>

      <!-- 登录方式：手机验证码 + 密码 -->
      <view class="tabs">
        <view class="tab" :class="{ active: loginType === 'phone' }" @tap="switchType('phone')">
          <text class="tab-text" :class="{ 'tab-text-active': loginType === 'phone' }">验证码登录</text>
        </view>
        <view class="tab" :class="{ active: loginType === 'password' }" @tap="switchType('password')">
          <text class="tab-text" :class="{ 'tab-text-active': loginType === 'password' }">密码登录</text>
        </view>
      </view>

      <!-- 登录表单 -->
      <view class="form">
        <!-- 手机号 -->
        <view class="input-wrap">
          <view class="input-icon">
            <AppIcon name="phone" :size="20" color="#999999" />
          </view>
          <input
            class="input"
            type="number"
            inputmode="numeric"
            :value="phone"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-class="input-ph"
            @input="onPhoneInput"
          />
        </view>

        <!-- 验证码 -->
        <view v-if="loginType === 'phone'" class="input-wrap">
          <view class="input-icon">
            <AppIcon name="message-circle" :size="20" color="#999999" />
          </view>
          <input
            class="input input-code"
            type="number"
            inputmode="numeric"
            :value="code"
            maxlength="6"
            placeholder="请输入验证码"
            placeholder-class="input-ph"
            @input="onCodeInput"
          />
          <view
            class="code-btn"
            :class="{ 'code-btn-disabled': countdown > 0 || !isPhoneValid || isSendingCode }"
            @tap="handleSendCode"
          >
            <AppIcon v-if="isSendingCode" name="loader-2" :size="16" color="#999999" class="spin" />
            <text v-else class="code-btn-text" :class="{ 'code-btn-text-disabled': countdown > 0 || !isPhoneValid }">
              {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
            </text>
          </view>
        </view>

        <!-- 密码 -->
        <view v-else class="input-wrap">
          <view class="input-icon">
            <AppIcon name="lock" :size="20" color="#999999" />
          </view>
          <input
            class="input input-pwd"
            :password="!showPassword"
            :value="password"
            placeholder="请输入密码"
            placeholder-class="input-ph"
            @input="onPasswordInput"
          />
          <view class="eye-btn" @tap="showPassword = !showPassword">
            <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="20" color="#999999" />
          </view>
        </view>

        <!-- 错误提示 -->
        <text v-if="error" class="error-text">{{ error }}</text>

        <!-- 忘记密码 -->
        <view v-if="loginType === 'password'" class="forgot-row">
          <text class="forgot-link" @tap="goForgot">忘记密码？</text>
        </view>

        <!-- 协议勾选 -->
        <view class="terms-row">
          <view class="checkbox" :class="{ 'checkbox-checked': agreedTerms }" @tap="agreedTerms = !agreedTerms">
            <AppIcon v-if="agreedTerms" name="check" :size="12" color="#ffffff" />
          </view>
          <view class="terms-text">
            <text class="terms-normal">我已阅读并同意</text>
            <text class="terms-link">《用户服务协议》</text>
            <text class="terms-normal">和</text>
            <text class="terms-link">《隐私政策》</text>
          </view>
        </view>

        <!-- 登录按钮 -->
        <view class="submit-btn" :class="{ 'submit-btn-disabled': !canSubmit || isLoading }" @tap="handleLogin">
          <AppIcon v-if="isLoading" name="loader-2" :size="16" color="#ffffff" class="spin" />
          <text class="submit-text">{{ isLoading ? '登录中...' : '登录' }}</text>
        </view>

        <!-- 注册入口 -->
        <view class="register-row">
          <text class="register-normal">还没有账号？</text>
          <text class="register-link" @tap="goRegister">立即注册</text>
        </view>
      </view>

      <!-- 第三方登录 -->
      <view class="third-party">
        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">其他登录方式</text>
          <view class="divider-line" />
        </view>
        <view class="third-icons">
          <view class="third-item" @tap="handleThirdParty('wechat')">
            <view class="third-circle wechat-circle">
              <AppIcon name="wechat" :size="28" color="#07C160" />
            </view>
            <text class="third-label">微信登录</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全提示 -->
    <view class="footer">
      <text class="footer-text">登录即代表您同意遵守平台规则，共建和谐社区</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { authApi } from '@/lib/auth-data'
import { setToken, setRefreshToken, setUserInfo } from '@/utils/storage'
import { BRAND } from '@/lib/brand'

const statusBarHeight = ref(0)
const logoSrc = ref('/static/logo.jpg')

// UI 临时状态
const loginType = ref<'phone' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const showPassword = ref(false)
const countdown = ref(0)
const isLoading = ref(false)
const isSendingCode = ref(false)
const agreedTerms = ref(false)
const error = ref('')

let timer: ReturnType<typeof setInterval> | null = null

const isPhoneValid = computed(() => phone.value.length === 11)
const isCodeValid = computed(() => code.value.length === 6)
const isPasswordValid = computed(() => password.value.length >= 6)
const canSubmit = computed(() =>
  loginType.value === 'phone'
    ? isPhoneValid.value && isCodeValid.value && agreedTerms.value
    : isPhoneValid.value && isPasswordValid.value && agreedTerms.value,
)

function switchType(t: 'phone' | 'password') {
  loginType.value = t
  error.value = ''
}
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

// @data-needs: 发送验证码, 参数 {phone, scene:'login'}, 返回 {success, message}
async function handleSendCode() {
  if (countdown.value > 0 || !isPhoneValid.value || isSendingCode.value) return
  isSendingCode.value = true
  error.value = ''
  try {
    const res = await authApi.sendCode(phone.value, 'login')
    if (res.success) {
      countdown.value = 60
      timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0 && timer) clearInterval(timer)
      }, 1000)
    } else {
      error.value = res.message || '验证码发送失败'
    }
  } catch (e) {
    error.value = (e as Error)?.message || '验证码发送失败'
  } finally {
    isSendingCode.value = false
  }
}

// @data-needs: 登录, 参数 {phone, code} 或 {phone, password}, 返回 {success, data:{token, user}, message}
async function handleLogin() {
  if (!canSubmit.value || isLoading.value) return
  isLoading.value = true
  error.value = ''
  try {
    const res = await authApi.login(
      loginType.value === 'password'
        ? { phone: phone.value, password: password.value }
        : { phone: phone.value, code: code.value },
    )
    if (res.success && res.data?.token) {
      setToken(res.data.token)
      setRefreshToken(res.data.refreshToken || '')
      setUserInfo(res.data.user)
      uni.reLaunch({ url: '/pages/index/index' })
    } else {
      error.value = res.message || '登录失败'
    }
  } catch (e) {
    error.value = (e as Error)?.message || '登录失败'
  } finally {
    isLoading.value = false
  }
}

// @data-needs: 微信登录, uni.login 拿 code → POST /auth/login/wechat, 返回 {token, user}
async function handleThirdParty(_type: 'wechat') {
  if (isLoading.value) return
  // #ifdef MP-WEIXIN
  isLoading.value = true
  error.value = ''
  try {
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (res) => (res.code ? resolve(res.code) : reject(new Error('未获取到微信授权 code'))),
        fail: (err: { errMsg?: string }) => reject(new Error(err?.errMsg || '微信授权失败')),
      })
    })
    const res = await authApi.wechatLogin(code)
    if (res.success && res.data?.token) {
      setToken(res.data.token)
      setRefreshToken(res.data.refreshToken || '')
      setUserInfo(res.data.user)
      uni.reLaunch({ url: '/pages/index/index' })
    } else {
      uni.showToast({ title: res.message || '微信登录失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '微信登录失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序内使用微信登录', icon: 'none' })
  // #endif
}

function goForgot() {
  navigateTo('/forgot-password')
}
function goRegister() {
  navigateTo('/register')
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

/* 顶部渐变装饰 */
.top-decor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 512rpx;
  background: linear-gradient(to bottom, rgba(196, 30, 58, 0.1), transparent);
  pointer-events: none;
}

/* 导航栏 */
.navbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  padding-left: 16rpx;
  height: 112rpx;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
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

/* Logo */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 64rpx;
  padding-bottom: 80rpx;
}
.logo-box {
  width: 192rpx;
  height: 192rpx;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 40rpx rgba(196, 30, 58, 0.2);
  margin-bottom: 32rpx;
}
.logo-img {
  width: 100%;
  height: 100%;
}
.app-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #2c2c2c;
  font-family: 'Noto Serif SC', serif;
}
.app-subtitle {
  font-size: 28rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 切换 tab */
.tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  margin-bottom: 48rpx;
}
.tab {
  padding-bottom: 16rpx;
  border-bottom: 4rpx solid transparent;
}
.tab.active {
  border-bottom-color: var(--brand);
}
.tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #999999;
}
.tab-text-active {
  color: var(--brand);
}

/* 表单 */
.form {
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
  padding-right: 224rpx;
}
.input-pwd {
  padding-right: 96rpx;
}
.input-ph {
  color: #999999;
}
.code-btn {
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 128rpx;
  height: 60rpx;
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
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
}

/* 错误提示 */
.error-text {
  font-size: 26rpx;
  color: #ff4d4f;
  padding-left: 4rpx;
}

/* 忘记密码 */
.forgot-row {
  display: flex;
  justify-content: flex-end;
}
.forgot-link {
  font-size: 26rpx;
  color: var(--brand);
}

/* 协议 */
.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
}
.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 4rpx solid #999999;
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
  font-size: 24rpx;
  color: #999999;
}
.terms-link {
  font-size: 24rpx;
  color: var(--brand);
}

/* 登录按钮 */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--brand);
}
.submit-btn-disabled {
  opacity: 0.5;
}
.submit-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}

/* 注册 */
.register-row {
  display: flex;
  align-items: center;
  justify-content: center;
}
.register-normal {
  font-size: 28rpx;
  color: #999999;
}
.register-link {
  font-size: 28rpx;
  color: var(--brand);
  margin-left: 8rpx;
}

/* 第三方 */
.third-party {
  margin-top: 80rpx;
}
.divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: #e8e0d5;
}
.divider-text {
  padding: 0 32rpx;
  font-size: 24rpx;
  color: #999999;
}
.third-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 64rpx;
}
.third-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.third-circle {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wechat-circle {
  background: rgba(7, 193, 96, 0.1);
}
.third-label {
  font-size: 24rpx;
  color: #999999;
}

/* 底部 */
.footer {
  padding: 48rpx 0;
  text-align: center;
}
.footer-text {
  font-size: 24rpx;
  color: #999999;
}

.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
