<template>
  <view class="page">
    <!-- 顶部渐变装饰 -->
    <view class="top-decor" />

    <!-- 返回按钮 -->
    <view class="navbar" :style="{ paddingTop: `max(${statusBarHeight}px, env(safe-area-inset-top))` }">
      <view
        class="back-btn"
        role="button"
        aria-label="返回上一页"
        tabindex="0"
        @tap="goBack"
        @keydown="activateOnKeyboard($event, goBack)"
      >
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
      <view class="tabs" role="tablist" aria-label="选择登录方式">
        <view
          class="tab"
          :class="{ active: loginType === 'phone' }"
          role="tab"
          :aria-selected="loginType === 'phone' ? 'true' : 'false'"
          :tabindex="loginType === 'phone' ? 0 : -1"
          @tap="switchType('phone')"
          @keydown="onLoginTypeKeydown($event, 'phone')"
        >
          <text class="tab-text" :class="{ 'tab-text-active': loginType === 'phone' }">验证码登录</text>
        </view>
        <view
          class="tab"
          :class="{ active: loginType === 'password' }"
          role="tab"
          :aria-selected="loginType === 'password' ? 'true' : 'false'"
          :tabindex="loginType === 'password' ? 0 : -1"
          @tap="switchType('password')"
          @keydown="onLoginTypeKeydown($event, 'password')"
        >
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
            aria-label="手机号"
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
            :aria-disabled="countdown > 0 || !isPhoneValid || isSendingCode ? 'true' : 'false'"
            tabindex="0"
            @tap="handleSendCode"
            @keydown="activateOnKeyboard($event, handleSendCode)"
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
            aria-label="登录密码"
            placeholder="请输入密码"
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

        <!-- 错误提示 -->
        <text v-if="error" class="error-text" role="alert" aria-live="polite">{{ error }}</text>

        <!-- 忘记密码 -->
        <view v-if="loginType === 'password'" class="forgot-row">
          <text
            class="forgot-link"
            role="link"
            tabindex="0"
            @tap="goForgot"
            @keydown="activateOnKeyboard($event, goForgot)"
          >忘记密码？</text>
        </view>

        <!-- 协议勾选 -->
        <!-- 整行可点切换勾选（协议链接 .stop 仍跳协议页）；checkbox 视觉不变，热区=整行 ≥88rpx -->
        <view
          class="terms-row"
          role="checkbox"
          :aria-checked="agreedTerms ? 'true' : 'false'"
          tabindex="0"
          @tap="agreedTerms = !agreedTerms"
          @keydown="activateOnKeyboard($event, () => agreedTerms = !agreedTerms)"
        >
          <view class="checkbox" :class="{ 'checkbox-checked': agreedTerms }">
            <AppIcon v-if="agreedTerms" name="check" :size="12" color="#ffffff" />
          </view>
          <view class="terms-text">
            <text class="terms-normal">我已阅读并同意</text>
            <text
              class="terms-link"
              role="link"
              tabindex="0"
              @tap.stop="navigateTo('/legal/user-agreement')"
              @keydown.stop="activateOnKeyboard($event, () => navigateTo('/legal/user-agreement'))"
            >《用户服务协议》</text>
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

        <!-- 登录按钮 -->
        <view
          class="submit-btn"
          :class="{ 'submit-btn-disabled': !canSubmit || isLoading }"
          role="button"
          :aria-busy="isLoading ? 'true' : 'false'"
          :aria-disabled="isLoading ? 'true' : 'false'"
          tabindex="0"
          @tap="handleLogin"
          @keydown="activateOnKeyboard($event, handleLogin)"
        >
          <AppIcon v-if="isLoading" name="loader-2" :size="16" color="#ffffff" class="spin" />
          <text class="submit-text">{{ isLoading ? '登录中...' : '登录' }}</text>
        </view>

        <!-- 注册入口 -->
        <view class="register-row">
          <text class="register-normal">还没有账号？</text>
          <text
            class="register-link"
            role="link"
            tabindex="0"
            @tap="goRegister"
            @keydown="activateOnKeyboard($event, goRegister)"
          >立即注册</text>
        </view>

        <view
          class="guest-entry"
          role="button"
          tabindex="0"
          aria-label="暂不登录，浏览公开内容"
          @tap="browseAsGuest"
          @keydown="activateOnKeyboard($event, browseAsGuest)"
        >
          <text>暂不登录，先逛逛</text>
        </view>
      </view>

      <!-- 第三方登录：iOS 同级提供 Apple 登录，满足 App Store 4.8。 -->
      <view v-if="showWechatLogin || showAppleLogin" class="third-party">
        <view class="divider">
          <view class="divider-line" />
          <text class="divider-text">其他登录方式</text>
          <view class="divider-line" />
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="mini-phone-login-btn"
          :open-type="agreedTerms ? 'getPhoneNumber' : ''"
          :disabled="isLoading"
          @tap="handleMiniPhoneTap"
          @getphonenumber="handleMiniPhoneLogin"
        >
          <text>{{ isLoading ? '登录中...' : '手机号快捷登录' }}</text>
        </button>
        <text class="mini-phone-login-hint">需本人授权，仅用于登录及安全绑定账号</text>
        <!-- #endif -->
        <!-- #ifdef APP-PLUS -->
        <view
          v-if="showAppleLogin"
          class="apple-login-btn"
          role="button"
          aria-label="通过 Apple 登录"
          tabindex="0"
          @tap="handleAppleLogin"
          @keydown="activateOnKeyboard($event, handleAppleLogin)"
        >
          <text class="apple-mark"></text>
          <text class="apple-label">通过 Apple 登录</text>
        </view>
        <!-- #endif -->
        <view v-if="showWechatLogin" class="third-icons" :class="{ 'third-icons-after-apple': showAppleLogin }">
          <view
            class="third-item"
            role="button"
            aria-label="使用微信登录"
            tabindex="0"
            @tap="handleThirdParty('wechat')"
            @keydown="activateOnKeyboard($event, () => handleThirdParty('wechat'))"
          >
            <view class="third-circle wechat-circle">
              <view class="wechat-mark" aria-hidden="true">
                <view class="wechat-bubble wechat-bubble-primary">
                  <view class="wechat-dot" />
                  <view class="wechat-dot" />
                </view>
                <view class="wechat-bubble wechat-bubble-secondary">
                  <view class="wechat-dot wechat-dot-small" />
                  <view class="wechat-dot wechat-dot-small" />
                </view>
              </view>
            </view>
            <text class="third-label">微信登录</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全提示 -->
    <view class="footer">
      <text class="footer-text">我们重视您的隐私与账号安全</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { authApi } from '@/lib/auth-data'
import { setToken, setRefreshToken, setUserInfo, clearAuthSession } from '@/utils/storage'
// #ifdef APP-PLUS
import { hydrateRemoteConfig, isClientFeatureEnabled } from '@/lib/remote-config'
// #endif
import { BRAND } from '@/lib/brand'
import { continueAfterLogin } from '@/utils/auth-journey'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}
const logoSrc = ref('/static/logo.webp')

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
const paipanEntry = ref(false)
const bindWechatAfterPhone = ref(false)
// App 端必须由服务端运行时开关显式放行；拉取失败时保持隐藏，避免密钥切换前误开放。
const showWechatLogin = ref(false)
const showAppleLogin = ref(false)

onLoad((query) => {
  paipanEntry.value = String(query?.paipan || '') === '1'
})

// H5 的模板条件表达式在部分 UniApp 编译器中不会定义 defined(H5)，改由可靠的脚本条件控制展示。
// #ifdef H5
showWechatLogin.value = true
// #endif
// #ifdef MP-WEIXIN
showWechatLogin.value = true
// #endif

// #ifdef APP-PLUS
onLoad(() => {
  try {
    const system = uni.getSystemInfoSync()
    showAppleLogin.value = String(system.platform || '').toLowerCase() === 'ios'
  } catch {
    showAppleLogin.value = false
  }
  void hydrateRemoteConfig(true).then(() => {
    showWechatLogin.value = isClientFeatureEnabled('client_wechat_app_login', false)
  })
})
// #endif

let timer: ReturnType<typeof setInterval> | null = null

// #ifdef H5
const WECHAT_OAUTH_ATTEMPT_KEY = 'wechat:h5:oauth-attempt'
const WECHAT_OAUTH_MAX_AGE_MS = 10 * 60 * 1000
let h5OauthHandled = false

interface WechatOAuthAttempt {
  state: string
  createdAt: number
}
// #endif

const isPhoneValid = computed(() => phone.value.length === 11)
const isCodeValid = computed(() => code.value.length === 6)
const isPasswordValid = computed(() => password.value.length >= 6)
const canSubmit = computed(() =>
  loginType.value === 'phone'
    ? isPhoneValid.value && isCodeValid.value && agreedTerms.value
    : isPhoneValid.value && isPasswordValid.value && agreedTerms.value,
)

function activateOnKeyboard(event: KeyboardEvent, action: () => unknown) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

function onLoginTypeKeydown(event: KeyboardEvent, type: 'phone' | 'password') {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    switchType(type)
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  switchType(type === 'phone' ? 'password' : 'phone')
  void nextTick(() => {
    document.querySelector<HTMLElement>('.tab[aria-selected="true"]')?.focus()
  })
}

function switchType(t: 'phone' | 'password') {
  loginType.value = t
  error.value = ''
}

// #ifdef H5
function isWechatBrowser(): boolean {
  return /MicroMessenger/i.test(window.navigator.userAgent)
}

function createWechatOAuthState(): string {
  if (!window.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全的微信登录')
  const bytes = new Uint8Array(24)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

function clearWechatCallbackParams(): void {
  const cleanUrl = new URL(window.location.href)
  cleanUrl.searchParams.delete('code')
  cleanUrl.searchParams.delete('state')
  cleanUrl.searchParams.delete('wx_login')
  window.history.replaceState({}, document.title, cleanUrl.toString())
}

function consumeWechatOAuthAttempt(receivedState: string): boolean {
  let attempt: WechatOAuthAttempt | null = null
  try {
    const raw = window.sessionStorage.getItem(WECHAT_OAUTH_ATTEMPT_KEY)
    if (raw) attempt = JSON.parse(raw) as WechatOAuthAttempt
  } catch {
    attempt = null
  } finally {
    window.sessionStorage.removeItem(WECHAT_OAUTH_ATTEMPT_KEY)
  }
  return Boolean(
    attempt?.state &&
    receivedState &&
    attempt.state === receivedState &&
    Number.isFinite(attempt.createdAt) &&
    Date.now() - attempt.createdAt >= 0 &&
    Date.now() - attempt.createdAt <= WECHAT_OAUTH_MAX_AGE_MS,
  )
}

async function startH5WechatLogin(): Promise<void> {
  if (!isWechatBrowser()) {
    uni.showToast({ title: '请在微信内打开本页后使用微信登录', icon: 'none' })
    return
  }
  isLoading.value = true
  error.value = ''
  try {
    const state = createWechatOAuthState()
    window.sessionStorage.setItem(
      WECHAT_OAUTH_ATTEMPT_KEY,
      JSON.stringify({ state, createdAt: Date.now() } satisfies WechatOAuthAttempt),
    )
    const callbackUrl = new URL(window.location.href)
    callbackUrl.searchParams.delete('code')
    callbackUrl.searchParams.delete('state')
    callbackUrl.searchParams.set('wx_login', '1')
    const oauthUrl = await authApi.getWechatOAuthUrl(callbackUrl.toString(), state)
    window.location.assign(oauthUrl)
  } catch (e) {
    window.sessionStorage.removeItem(WECHAT_OAUTH_ATTEMPT_KEY)
    error.value = (e as Error)?.message || '微信登录暂时不可用'
    isLoading.value = false
  }
}

async function completeH5WechatLogin(query: Record<string, string | undefined>): Promise<void> {
  if (h5OauthHandled || query.wx_login !== '1') return
  h5OauthHandled = true
  const oauthCode = String(query.code || '')
  const oauthState = String(query.state || '')
  const stateValid = consumeWechatOAuthAttempt(oauthState)
  clearWechatCallbackParams()

  if (!oauthCode) {
    error.value = '微信授权未完成，请重试'
    return
  }
  if (!stateValid) {
    error.value = '微信登录请求已失效，请重新发起'
    return
  }

  agreedTerms.value = true
  isLoading.value = true
  error.value = ''
  try {
    const res = await authApi.wechatLogin(oauthCode, 'h5', { createIfMissing: !paipanEntry.value })
    const loginData = res.data
    if (res.success && loginData && loginData.token) {
      clearAuthSession({ preserveLoginRedirect: true })
      setToken(loginData.token)
      setRefreshToken(loginData.refreshToken || '')
      setUserInfo(loginData.user)
      await goAfterLogin()
      return
    }
    if (paipanEntry.value && /尚未关联|手机号验证/u.test(res.message || '')) {
      loginType.value = 'phone'
      error.value = '首次使用请验证手机号；已关联账号后可使用微信快捷进入。'
    } else {
      error.value = res.message || '微信登录失败'
    }
  } catch (e) {
    error.value = (e as Error)?.message || '微信登录失败'
  } finally {
    isLoading.value = false
  }
}

onLoad((query) => {
  void completeH5WechatLogin((query || {}) as Record<string, string | undefined>)
})
// #endif
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

/** 所有登录方式共享服务端兴趣状态和安全回跳，不在欢迎页丢弃目标。 */
async function goAfterLogin() {
  await continueAfterLogin()
}

/** 置灰按钮点击不再静默：按填写顺序提示第一个缺项（校验口径与 canSubmit 完全一致） */
function showSubmitHint() {
  const toast = (title: string) => uni.showToast({ title, icon: 'none' })
  if (!phone.value) return toast('请输入手机号')
  if (!isPhoneValid.value) return toast('请输入正确的11位手机号')
  if (loginType.value === 'phone') {
    if (!code.value) return toast('请输入验证码')
    if (!isCodeValid.value) return toast('请输入6位验证码')
  } else {
    if (!password.value) return toast('请输入密码')
    if (!isPasswordValid.value) return toast('密码长度不能少于6位')
  }
  if (!agreedTerms.value) return toast('请先阅读并同意用户协议和隐私政策')
}

// @data-needs: 登录, 参数 {phone, code} 或 {phone, password}, 返回 {success, data:{token, user}, message}
async function handleLogin() {
  if (isLoading.value) return
  if (!canSubmit.value) {
    showSubmitHint()
    return
  }
  isLoading.value = true
  error.value = ''
  try {
    const res = await authApi.login(
      loginType.value === 'password'
        ? { phone: phone.value, password: password.value }
        : { phone: phone.value, code: code.value },
    )
    const loginData = res.data
    if (res.success && loginData && loginData.token) {
      clearAuthSession({ preserveLoginRedirect: true })
      setToken(loginData.token)
      setRefreshToken(loginData.refreshToken || '')
      setUserInfo(loginData.user)
      if (bindWechatAfterPhone.value) {
        const bound = await bindCurrentWechatIdentity()
        if (!bound) uni.showToast({ title: '已登录，微信快捷进入可稍后再试', icon: 'none' })
      }
      // 新用户先走欢迎峰值页；老用户优先回被 401 打断的原页面，无则回首页（goAfterLogin 统一处理）
      await goAfterLogin()
    } else {
      error.value = res.message || '登录失败'
    }
  } catch (e) {
    error.value = (e as Error)?.message || '登录失败'
  } finally {
    isLoading.value = false
  }
}

async function requestWechatLoginCode(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => (res.code ? resolve(res.code) : reject(new Error('未获取到微信授权 code'))),
      fail: (err: { errMsg?: string }) => reject(new Error(err?.errMsg || '微信授权失败')),
    })
  })
}

// #ifdef MP-WEIXIN
interface MiniPhoneEventDetail {
  code?: string
  encryptedData?: string
  iv?: string
  errMsg?: string
}

function handleMiniPhoneTap() {
  if (!agreedTerms.value) {
    uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
  }
}

/** 用户主动授权后，用当次手机号 code 与新的 wx.login code 完成登录/注册。 */
async function handleMiniPhoneLogin(event: { detail?: MiniPhoneEventDetail }) {
  if (isLoading.value) return
  if (!agreedTerms.value) {
    uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
    return
  }

  const detail = event?.detail || {}
  const denied = /deny|fail/u.test(String(detail.errMsg || ''))
  const phoneCode = String(detail.code || detail.encryptedData || '')
  if (denied || !phoneCode) {
    uni.showToast({ title: '未获得手机号授权，可继续使用其他登录方式', icon: 'none' })
    return
  }

  isLoading.value = true
  error.value = ''
  try {
    const wxCode = await requestWechatLoginCode()
    const result = await authApi.miniPhoneLogin(
      wxCode,
      phoneCode,
      detail.code ? undefined : detail.iv,
    )
    const loginData = result.data
    if (!result.success || !loginData?.token) {
      error.value = result.message || '手机号快捷登录失败'
      return
    }
    clearAuthSession({ preserveLoginRedirect: true })
    setToken(loginData.token)
    setRefreshToken(loginData.refreshToken || '')
    setUserInfo(loginData.user)
    await goAfterLogin()
  } catch (e) {
    error.value = (e as Error)?.message || '手机号快捷登录失败'
  } finally {
    isLoading.value = false
  }
}
// #endif

async function bindCurrentWechatIdentity(): Promise<boolean> {
  // #if defined(MP-WEIXIN) || defined(APP-PLUS)
  try {
    const wxCode = await requestWechatLoginCode()
    let channel: 'miniprogram' | 'app' = 'miniprogram'
    // #ifdef APP-PLUS
    channel = 'app'
    // #endif
    const result = await authApi.bindWechat(wxCode, channel)
    return result.success
  } catch { return false }
  // #endif
  // #ifndef MP-WEIXIN
  // #ifndef APP-PLUS
  return false
  // #endif
  // #endif
}

// @data-needs: 微信登录, uni.login 拿 code → POST /auth/login/wechat, 返回 {token, user}
async function handleThirdParty(_type: 'wechat') {
  if (isLoading.value) return
  if (!agreedTerms.value) {
    uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
    return
  }
  // #ifdef H5
  if (typeof window !== 'undefined') {
    await startH5WechatLogin()
    return
  }
  // #endif
  // #if defined(MP-WEIXIN) || defined(APP-PLUS)
  isLoading.value = true
  error.value = ''
  try {
    const code = await requestWechatLoginCode()
    let channel: 'miniprogram' | 'app' = 'miniprogram'
    // #ifdef APP-PLUS
    channel = 'app'
    // #endif
    const res = await authApi.wechatLogin(code, channel, { createIfMissing: !paipanEntry.value })
    const loginData = res.data
    if (res.success && loginData && loginData.token) {
      clearAuthSession({ preserveLoginRedirect: true })
      setToken(loginData.token)
      setRefreshToken(loginData.refreshToken || '')
      setUserInfo(loginData.user)
      // 新用户先走欢迎峰值页；老用户优先回被 401 打断的原页面，无则回首页（goAfterLogin 统一处理）
      await goAfterLogin()
    } else if (paipanEntry.value && /尚未关联|手机号验证/u.test(res.message || '')) {
      bindWechatAfterPhone.value = true
      loginType.value = 'phone'
      error.value = '首次使用请验证手机号；验证完成后会自动关联微信，下次可快捷进入。'
    } else {
      uni.showToast({ title: res.message || '微信登录失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '微信登录失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
  // #endif
}

// #ifdef APP-PLUS
interface AppleFullName {
  familyName?: string
  givenName?: string
}

async function handleAppleLogin() {
  if (isLoading.value) return
  if (!agreedTerms.value) {
    uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
    return
  }

  isLoading.value = true
  error.value = ''
  try {
    const appleInfo = await new Promise<UniApp.AppleLoginAppleInfo>((resolve, reject) => {
      uni.login({
        provider: 'apple',
        success: (result) => {
          if (result.appleInfo?.identityToken) resolve(result.appleInfo)
          else reject(new Error('未获取到 Apple 身份凭证'))
        },
        fail: (result: { code?: number; errMsg?: string }) => {
          const message = result?.code === 1001 ? '已取消 Apple 登录' : (result?.errMsg || 'Apple 授权失败')
          reject(new Error(message))
        },
      })
    })
    const fullName = (appleInfo.fullName || {}) as AppleFullName
    const res = await authApi.appleLogin({
      identityToken: appleInfo.identityToken!,
      familyName: fullName.familyName,
      givenName: fullName.givenName,
    })
    const loginData = res.data
    if (res.success && loginData?.token) {
      clearAuthSession({ preserveLoginRedirect: true })
      setToken(loginData.token)
      setRefreshToken(loginData.refreshToken || '')
      setUserInfo(loginData.user)
      await goAfterLogin()
      return
    }
    error.value = res.message || 'Apple 登录失败'
  } catch (e) {
    error.value = (e as Error)?.message || 'Apple 登录失败'
  } finally {
    isLoading.value = false
  }
}
// #endif

function goForgot() {
  navigateTo('/forgot-password')
}
function goRegister() {
  navigateTo('/register')
}
function browseAsGuest() {
  try { uni.removeStorageSync('login:redirect') } catch { /* 清理失败不阻断返回公开页面 */ }
  // 登录页可能由 401 使用 reLaunch 打开；redirectTo 在部分 iOS WebView 栈上首次点击无响应。
  // 游客退出鉴权流只做一次 reLaunch，直接建立稳定的公开首页根栈。
  uni.reLaunch({ url: '/pages/index/index' })
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
  width: 88rpx;
  height: 88rpx;
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
  min-height: 88rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  box-sizing: border-box;
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
/* 热区扩到 88×88rpx（图标 40rpx 视觉位置不变：right = 32 - (88-40)/2 = 8rpx） */
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
  min-height: 88rpx;
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: var(--brand);
}

/* 协议：整行是勾选热区，min-height 撑到 ≥88rpx（checkbox 视觉尺寸不变） */
.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  min-height: 88rpx;
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
  min-height: 88rpx;
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
.guest-entry {
  min-height: max(44px, 96rpx);
  padding: 8rpx 24rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #76695f;
  font-size: max(16px, 32rpx);
  text-decoration: underline;
  text-underline-offset: 6rpx;
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
.third-icons-after-apple {
  margin-top: 32rpx;
}
.mini-phone-login-btn {
  width: 100%;
  min-height: 88rpx;
  margin: 0;
  padding: 0 32rpx;
  border: 0;
  border-radius: 12rpx;
  background: #07c160;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 88rpx;
}
.mini-phone-login-btn::after {
  border: 0;
}
.mini-phone-login-btn[disabled] {
  background: #9ddfba;
  color: #ffffff;
}
.mini-phone-login-hint {
  display: block;
  margin-top: 14rpx;
  margin-bottom: 32rpx;
  text-align: center;
  color: #8b8178;
  font-size: 22rpx;
  line-height: 1.5;
}
.apple-login-btn {
  width: 100%;
  min-height: 88rpx;
  border-radius: 12rpx;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.apple-mark {
  color: #ffffff;
  font-size: 42rpx;
  line-height: 1;
}
.apple-label {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 500;
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
.wechat-mark {
  position: relative;
  width: 58rpx;
  height: 48rpx;
}
.wechat-bubble {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #07c160;
}
.wechat-bubble-primary {
  left: 0;
  top: 0;
  width: 42rpx;
  height: 34rpx;
  border-radius: 50%;
}
.wechat-bubble-secondary {
  right: 0;
  bottom: 0;
  width: 34rpx;
  height: 28rpx;
  border: 3rpx solid #e8f8ef;
  border-radius: 50%;
}
.wechat-dot {
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: #ffffff;
}
.wechat-dot-small {
  width: 4rpx;
  height: 4rpx;
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
