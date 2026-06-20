<template>
  <view class="page">
    <!-- 顶部渐变装饰 -->
    <view class="top-decor" />

    <!-- 返回按钮 -->
    <view
      class="navbar"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view
        class="back-btn"
        @tap="goBack"
      >
        <AppIcon
          name="chevron-left"
          :size="24"
          color="#2c2c2c"
        />
      </view>
    </view>

    <!-- 加载骨架 -->
    <view
      v-if="loading"
      class="body"
    >
      <view class="sk-logo" />
      <view class="sk-title" />
      <view class="sk-subtitle" />
      <view class="sk-input" />
      <view class="sk-input sk-input-short" />
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

    <!-- 正常 -->
    <view
      v-else
      class="body"
    >
      <!-- Logo和标题 -->
      <view class="logo-section">
        <view class="logo-box">
          <image
            class="logo-img"
            :src="logoSrc"
            mode="aspectFill"
          />
        </view>
        <text class="app-title">
          热卜国学
        </text>
        <text class="app-subtitle">
          探寻东方智慧
        </text>
      </view>

      <!-- 登录方式切换 -->
      <view class="tabs">
        <view
          class="tab"
          :class="{ active: loginType === 'phone' }"
          @tap="switchType('phone')"
        >
          <text
            class="tab-text"
            :class="{ 'tab-text-active': loginType === 'phone' }"
          >
            验证码登录
          </text>
        </view>
        <view
          class="tab"
          :class="{ active: loginType === 'password' }"
          @tap="switchType('password')"
        >
          <text
            class="tab-text"
            :class="{ 'tab-text-active': loginType === 'password' }"
          >
            密码登录
          </text>
        </view>
      </view>

      <!-- 登录表单 -->
      <view class="form">
        <!-- 手机号 -->
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

        <!-- 验证码 -->
        <view
          v-if="loginType === 'phone'"
          class="input-wrap"
        >
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
            :class="{ 'code-btn-disabled': countdown > 0 || !isPhoneValid || isSendingCode }"
            @tap="handleSendCode"
          >
            <AppIcon
              v-if="isSendingCode"
              name="loader-2"
              :size="16"
              color="#999999"
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

        <!-- 密码 -->
        <view
          v-else
          class="input-wrap"
        >
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
            placeholder="请输入密码"
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

        <!-- 错误提示 -->
        <text
          v-if="formError"
          class="error-text"
        >
          {{ formError }}
        </text>

        <!-- 忘记密码 -->
        <view
          v-if="loginType === 'password'"
          class="forgot-row"
        >
          <text
            class="forgot-link"
            @tap="goForgot"
          >
            忘记密码？
          </text>
        </view>

        <!-- 协议勾选 -->
        <view class="terms-row">
          <view
            class="checkbox"
            :class="{ 'checkbox-checked': agreedTerms }"
            @tap="agreedTerms = !agreedTerms"
          >
            <AppIcon
              v-if="agreedTerms"
              name="check"
              :size="12"
              color="#ffffff"
            />
          </view>
          <view class="terms-text">
            <text class="terms-normal">
              我已阅读并同意
            </text>
            <text class="terms-link">
              《用户服务协议》
            </text>
            <text class="terms-normal">
              和
            </text>
            <text class="terms-link">
              《隐私政策》
            </text>
          </view>
        </view>

        <!-- 登录按钮 -->
        <view
          class="submit-btn"
          :class="{ 'submit-btn-disabled': !canSubmit || isSubmitting }"
          @tap="handleLogin"
        >
          <AppIcon
            v-if="isSubmitting"
            name="loader-2"
            :size="16"
            color="#ffffff"
            class="spin"
          />
          <text class="submit-text">
            {{ isSubmitting ? '登录中...' : '登录' }}
          </text>
        </view>

        <!-- 注册入口 -->
        <view class="register-row">
          <text class="register-normal">
            还没有账号？
          </text>
          <text
            class="register-link"
            @tap="goRegister"
          >
            立即注册
          </text>
        </view>
      </view>

      <!-- 第三方登录 -->
      <view class="third-party">
        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">
            其他登录方式
          </text>
          <view class="divider-line" />
        </view>
        <view class="third-icons">
          <view
            class="third-item"
            @tap="handleThirdParty('wechat')"
          >
            <view class="third-circle wechat-circle">
              <AppIcon
                name="wechat"
                :size="28"
                color="#07C160"
              />
            </view>
            <text class="third-label">
              微信
            </text>
          </view>
          <view
            class="third-item"
            @tap="handleThirdParty('apple')"
          >
            <view class="third-circle apple-circle">
              <AppIcon
                name="apple"
                :size="28"
                color="#2c2c2c"
              />
            </view>
            <text class="third-label">
              Apple
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全提示 -->
    <view class="footer">
      <text class="footer-text">
        登录即代表您同意遵守平台规则，共建和谐社区
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo, reLaunch } from '@/utils/router'
import { authApi } from '@/lib/auth-data'

const statusBarHeight = ref(0)
const logoSrc = ref('/static/images/logo.jpg')

const loginType = ref<'phone' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const showPassword = ref(false)
const countdown = ref(0)
const isSubmitting = ref(false)
const isSendingCode = ref(false)
const agreedTerms = ref(false)
const formError = ref('')
const loading = ref(true)
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

function switchType(t: 'phone' | 'password') {
  loginType.value = t
  formError.value = ''
}
function onPhoneInput(e: any) {
  phone.value = String(e.detail.value).replace(/\D/g, '').slice(0, 11)
  formError.value = ''
}
function onCodeInput(e: any) {
  code.value = String(e.detail.value).replace(/\D/g, '').slice(0, 6)
  formError.value = ''
}
function onPasswordInput(e: any) {
  password.value = e.detail.value
  formError.value = ''
}

async function handleSendCode() {
  if (countdown.value > 0 || !isPhoneValid.value || isSendingCode.value) return
  isSendingCode.value = true
  formError.value = ''
  try {
    const res = await authApi.sendCode(phone.value, 'login')
    if (res.success) {
      countdown.value = 60
      timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0 && timer) { clearInterval(timer); timer = null }
      }, 1000)
    } else {
      formError.value = res.message || '发送失败'
    }
  } catch (e: any) {
    formError.value = e?.message || '网络异常'
  } finally {
    isSendingCode.value = false
  }
}

async function handleLogin() {
  if (!canSubmit.value || isSubmitting.value) return
  isSubmitting.value = true
  formError.value = ''
  try {
    const params: { phone: string; code?: string; password?: string } = { phone: phone.value }
    if (loginType.value === 'phone') params.code = code.value
    else params.password = password.value

    const res = await authApi.login(params)
    if (res.success) {
      uni.setStorageSync('token', res.data?.token)
      uni.setStorageSync('user', JSON.stringify(res.data?.user))
      reLaunch('/pages/index/index')
    } else {
      formError.value = res.message || '登录失败'
    }
  } catch (e: any) {
    formError.value = e?.message || '网络异常'
  } finally {
    isSubmitting.value = false
  }
}

function handleThirdParty(_type: 'wechat' | 'apple') {
  uni.showToast({ title: '敬请期待', icon: 'none' })
}

function goForgot() { navigateTo('/pkg-auth/forgot-password/index') }
function goRegister() { navigateTo('/pkg-auth/register/index') }

onUnmounted(() => {
  if (timer) { clearInterval(timer); timer = null }
})
</script>

<style scoped>
.page { position: relative; min-height: 100vh; background: #faf8f5; display: flex; flex-direction: column; }

.top-decor { position: absolute; top: 0; left: 0; right: 0; height: 512rpx; background: linear-gradient(to bottom, rgba(196, 30, 58, 0.1), transparent); pointer-events: none; }

.navbar { position: relative; z-index: 10; display: flex; align-items: center; padding-left: 16rpx; height: 112rpx; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }

.body { flex: 1; position: relative; z-index: 10; padding: 0 48rpx; }
.body.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32rpx; }

.error-msg { font-size: 28rpx; color: #999; }

/* Logo */
.logo-section { display: flex; flex-direction: column; align-items: center; padding-top: 64rpx; padding-bottom: 80rpx; }
.logo-box { width: 192rpx; height: 192rpx; border-radius: 32rpx; overflow: hidden; box-shadow: 0 20rpx 40rpx rgba(196, 30, 58, 0.2); margin-bottom: 32rpx; }
.logo-img { width: 100%; height: 100%; }
.app-title { font-size: 48rpx; font-weight: 700; color: #2c2c2c; font-family: 'Noto Serif SC', serif; }
.app-subtitle { font-size: 28rpx; color: #999999; margin-top: 8rpx; }

/* tab */
.tabs { display: flex; align-items: center; justify-content: center; gap: 48rpx; margin-bottom: 48rpx; }
.tab { padding-bottom: 16rpx; border-bottom: 4rpx solid transparent; }
.tab.active { border-bottom-color: #c41e3a; }
.tab-text { font-size: 28rpx; font-weight: 500; color: #999999; }
.tab-text-active { color: #c41e3a; }

/* 表单 */
.form { display: flex; flex-direction: column; gap: 32rpx; }
.input-wrap { position: relative; display: flex; align-items: center; height: 96rpx; background: #f5f1eb; border-radius: 24rpx; }
.input-icon { position: absolute; left: 32rpx; top: 50%; transform: translateY(-50%); z-index: 1; }
.input { flex: 1; height: 96rpx; padding-left: 96rpx; padding-right: 32rpx; font-size: 30rpx; color: #2c2c2c; background: transparent; }
.input-code { padding-right: 224rpx; }
.input-pwd { padding-right: 96rpx; }
.input-ph { color: #999999; }
.code-btn { position: absolute; right: 16rpx; top: 50%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; min-width: 128rpx; height: 60rpx; padding: 0 24rpx; border-radius: 16rpx; background: rgba(196, 30, 58, 0.1); }
.code-btn-disabled { background: #f5f1eb; }
.code-btn-text { font-size: 26rpx; font-weight: 500; color: #c41e3a; }
.code-btn-text-disabled { color: #999999; }
.eye-btn { position: absolute; right: 32rpx; top: 50%; transform: translateY(-50%); }

.error-text { font-size: 26rpx; color: #ff4d4f; padding-left: 4rpx; }

.forgot-row { display: flex; justify-content: flex-end; }
.forgot-link { font-size: 26rpx; color: #c41e3a; }

.terms-row { display: flex; align-items: flex-start; gap: 16rpx; padding: 16rpx 0; }
.checkbox { width: 40rpx; height: 40rpx; border-radius: 8rpx; border: 4rpx solid #999999; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.checkbox-checked { background: #c41e3a; border-color: #c41e3a; }
.terms-text { flex: 1; line-height: 1.6; }
.terms-normal { font-size: 24rpx; color: #999999; }
.terms-link { font-size: 24rpx; color: #c41e3a; }

.submit-btn { display: flex; align-items: center; justify-content: center; gap: 16rpx; width: 100%; height: 96rpx; border-radius: 24rpx; background: #c41e3a; }
.submit-btn-disabled { opacity: 0.5; }
.submit-text { font-size: 32rpx; font-weight: 500; color: #ffffff; }

.register-row { display: flex; align-items: center; justify-content: center; }
.register-normal { font-size: 28rpx; color: #999999; }
.register-link { font-size: 28rpx; color: #c41e3a; margin-left: 8rpx; }

/* 第三方 */
.third-party { margin-top: 80rpx; }
.divider { display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.divider-line { flex: 1; height: 1px; background: #e8e0d5; }
.divider-text { padding: 0 32rpx; font-size: 24rpx; color: #999999; }
.third-icons { display: flex; align-items: center; justify-content: center; gap: 64rpx; }
.third-item { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.third-circle { width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.wechat-circle { background: rgba(7, 193, 96, 0.1); }
.apple-circle { background: rgba(44, 44, 44, 0.1); }
.third-label { font-size: 24rpx; color: #999999; }

.footer { padding: 48rpx 0; text-align: center; }
.footer-text { font-size: 24rpx; color: #999999; }

/* 按钮 */
.btn { display: flex; align-items: center; justify-content: center; width: 320rpx; height: 96rpx; border-radius: 24rpx; background: #c41e3a; }
.btn-text { font-size: 32rpx; font-weight: 500; color: #ffffff; }

/* 骨架 */
@keyframes sk-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
.sk-logo { width: 192rpx; height: 192rpx; border-radius: 32rpx; background: #e8e3db; margin: 64rpx auto 32rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-title { width: 240rpx; height: 48rpx; border-radius: 8rpx; background: #e8e3db; margin: 0 auto 16rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-subtitle { width: 180rpx; height: 28rpx; border-radius: 8rpx; background: #e8e3db; margin: 0 auto 80rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-input { width: 100%; height: 96rpx; border-radius: 24rpx; background: #e8e3db; margin-bottom: 32rpx; animation: sk-pulse 1.5s ease-in-out infinite; }
.sk-input-short { width: 60%; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
