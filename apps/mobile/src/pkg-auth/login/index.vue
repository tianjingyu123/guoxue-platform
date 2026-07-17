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
        <!-- 整行可点切换勾选（协议链接 .stop 仍跳协议页）；checkbox 视觉不变，热区=整行 ≥88rpx -->
        <view class="terms-row" @tap="agreedTerms = !agreedTerms">
          <view class="checkbox" :class="{ 'checkbox-checked': agreedTerms }">
            <AppIcon v-if="agreedTerms" name="check" :size="12" color="#ffffff" />
          </view>
          <view class="terms-text">
            <text class="terms-normal">我已阅读并同意</text>
            <text class="terms-link" @tap.stop="navigateTo('/legal/user-agreement')">《用户服务协议》</text>
            <text class="terms-normal">和</text>
            <text class="terms-link" @tap.stop="navigateTo('/legal/privacy-policy')">《隐私政策》</text>
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
import { goBack, navigateTo, reLaunch } from '@/utils/router'
import { authApi } from '@/lib/auth-data'
import { setToken, setRefreshToken, setUserInfo } from '@/utils/storage'
import { BRAND } from '@/lib/brand'
import { hasSelectedInterests } from '@/utils/interests'

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

/**
 * 登录成功后的统一去向：
 * 1) 新用户/未选兴趣 → 仍先走欢迎峰值页（welcome→兴趣引导），不被回跳打断注册引导流；
 * 2) 有 login:redirect（401 被踢时 request.ts 记录的原页面完整路径·含 query）→ reLaunch 回原页
 *    （项目为自定义底部导航非原生 tabBar，主 tab 页与普通页统一走 reLaunch，无需 switchTab 分叉）；
 * 3) 无 redirect → 维持原行为回首页。
 * 🔴 消费顺序：读取时不删。只在「真正 reLaunch 回原页」的分支里才 remove（一次性凭证被用掉）；
 * welcome 分支与非法值分支属明确放弃，也 remove（防残留下次登录误跳），但绝不"先删后判"——
 * 原实现读到即删，命中 welcome 分支时 redirect 已删未用，纯属白丢。
 * 拒绝 pkg-auth 自身路径防回跳成环。
 */
function goAfterLogin() {
  // SWR 首页 feed 缓存跨账号防串号：登录成功即清（覆盖"未退出直接换号"路径，
  // 与 settings 退出登录处的清理成对；两处都清=双保险）。key 与首页 FEED_CACHE_KEY 同名。
  try { uni.removeStorageSync('feed:home:cache') } catch { /* 清缓存失败不阻断登录流 */ }
  let redirect = ''
  try {
    redirect = uni.getStorageSync('login:redirect') || ''
  } catch {
    // 读取失败按无 redirect 处理
  }
  const consumeRedirect = () => {
    try { uni.removeStorageSync('login:redirect') } catch { /* 清除失败不阻断跳转 */ }
  }
  if (!hasSelectedInterests()) {
    // 欢迎峰值页优先于回跳：此处是「明确放弃」redirect（预期行为·引导流不被打断），
    // 放弃时同样 remove，避免残留到下次登录被误消费
    if (redirect) consumeRedirect()
    reLaunch('/welcome')
    return
  }
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('/pkg-auth/')) {
    // 唯一「真正消费」redirect 的分支：到这里才 remove（一次性）
    consumeRedirect()
    uni.reLaunch({
      url: redirect,
      // 回跳失败（目标页被下架等）兜底回首页，不让用户卡在登录页
      fail: () => uni.reLaunch({ url: '/pages/index/index' }),
    })
    return
  }
  // redirect 为空或非法（非 / 开头 / pkg-auth 自身路径被拒）：非法值也清掉，防脏数据长期滞留
  if (redirect) consumeRedirect()
  uni.reLaunch({ url: '/pages/index/index' })
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
    if (res.success && res.data?.token) {
      setToken(res.data.token)
      setRefreshToken(res.data.refreshToken || '')
      setUserInfo(res.data.user)
      // 新用户先走欢迎峰值页；老用户优先回被 401 打断的原页面，无则回首页（goAfterLogin 统一处理）
      goAfterLogin()
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
      // 新用户先走欢迎峰值页；老用户优先回被 401 打断的原页面，无则回首页（goAfterLogin 统一处理）
      goAfterLogin()
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
