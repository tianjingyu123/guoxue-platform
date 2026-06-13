<template>
  <view class="register-page">
    <!-- 顶部 -->
    <view class="header">
      <text class="header-back" @click="goBack">‹</text>
      <text class="header-title">注册账号</text>
    </view>

    <!-- 进度条 -->
    <view class="progress-area">
      <view class="progress-bar">
        <view class="step" v-for="(s, i) in steps" :key="s.key">
          <view class="step-dot" :class="{ active: stepIdx >= i, done: stepIdx > i }">
            <text v-if="stepIdx > i">✓</text>
            <text v-else>{{ i + 1 }}</text>
          </view>
          <view v-if="i < 2" class="step-line" :class="{ done: stepIdx > i }" />
        </view>
      </view>
      <view class="step-labels">
        <text v-for="(s, i) in steps" :key="s.key" class="step-label" :class="{ active: stepIdx >= i }">{{ s.label }}</text>
      </view>
    </view>

    <!-- 步骤1: 手机号 -->
    <view v-if="stepIdx === 0" class="step-body">
      <view class="step-title">{{ steps[0].title }}</view>
      <view class="step-desc">{{ steps[0].desc }}</view>
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
      <view class="step-btn" :class="{ disabled: phone.length !== 11 }" @click="sendCode">
        <text>获取验证码</text>
      </view>
    </view>

    <!-- 步骤2: 验证码 -->
    <view v-if="stepIdx === 1" class="step-body">
      <view class="step-title">{{ steps[1].title }}</view>
      <view class="step-desc">验证码已发送至 {{ maskedPhone }}</view>
      <view class="input-group">
        <text class="input-icon">🛡</text>
        <input
          v-model="code"
          type="number"
          class="input-field code-input"
          placeholder="请输入6位验证码"
          maxlength="6"
          @input="code = code.replace(/[^\d]/g, '').slice(0, 6)"
        />
      </view>
      <view class="resend-row">
        <text v-if="countdown > 0" class="resend-text">{{ countdown }}秒后可重发</text>
        <text v-else class="resend-text">没有收到验证码？</text>
        <text class="resend-link" :class="{ disabled: countdown > 0 }" @click="sendCode">重新发送</text>
      </view>
      <view class="step-btn" :class="{ disabled: code.length !== 6 }" @click="verifyCode">
        <text>下一步</text>
      </view>
    </view>

    <!-- 步骤3: 设置密码 -->
    <view v-if="stepIdx === 2" class="step-body">
      <view class="step-title">{{ steps[2].title }}</view>
      <view class="step-desc">{{ steps[2].desc }}</view>

      <!-- 昵称 -->
      <view class="input-group">
        <text class="input-icon">👤</text>
        <input v-model="nickname" class="input-field" placeholder="请输入昵称" maxlength="20" />
      </view>

      <!-- 密码 -->
      <view class="input-group">
        <text class="input-icon">🔒</text>
        <input
          :type="showPwd ? 'text' : 'password'"
          v-model="password"
          class="input-field"
          placeholder="请设置密码（6-20位）"
        />
        <text class="pwd-toggle" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁' }}</text>
      </view>

      <!-- 确认密码 -->
      <view class="input-group">
        <text class="input-icon">🔒</text>
        <input
          :type="showConfirm ? 'text' : 'password'"
          v-model="confirmPassword"
          class="input-field"
          placeholder="请再次输入密码"
        />
        <text class="pwd-toggle" @click="showConfirm = !showConfirm">{{ showConfirm ? '🙈' : '👁' }}</text>
      </view>

      <view v-if="confirmPassword && password !== confirmPassword" class="err-hint">
        <text>两次输入的密码不一致</text>
      </view>

      <!-- 协议 -->
      <view class="agree-row">
        <view class="agree-check" :class="{ checked: agreed }" @click="agreed = !agreed">
          <text v-if="agreed" class="check-mark">✓</text>
        </view>
        <text class="agree-text">
          我已阅读并同意
          <text class="agree-link" @click="goPage('/pages/policy/user-agreement/index')">《用户协议》</text>
          和
          <text class="agree-link" @click="goPage('/pages/policy/privacy-policy/index')">《隐私政策》</text>
        </text>
      </view>

      <!-- 错误 -->
      <view v-if="errMsg" class="err-hint"><text>{{ errMsg }}</text></view>

      <view class="step-btn" :class="{ disabled: !canRegister || loading }" @click="handleRegister">
        <text>{{ loading ? '注册中...' : '完成注册' }}</text>
      </view>
    </view>

    <!-- 底部 -->
    <view class="bottom-link">
      <text class="bottom-text">已有账号？</text>
      <text class="bottom-action" @click="uni.navigateTo({ url: '/pages/login/index' })">立即登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { authApi } from '../../api'

const steps = [
  { key: 'phone', label: '输入手机号', title: '输入手机号', desc: '我们将发送验证码到您的手机' },
  { key: 'verify', label: '验证身份', title: '输入验证码', desc: '' },
  { key: 'password', label: '设置密码', title: '完善信息', desc: '设置您的昵称和登录密码' },
]

const stepIdx = ref(0)
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const nickname = ref('')
const showPwd = ref(false)
const showConfirm = ref(false)
const agreed = ref(false)
const countdown = ref(0)
const loading = ref(false)
const errMsg = ref('')

let timer: ReturnType<typeof setInterval> | null = null

const maskedPhone = computed(() => phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
const canRegister = computed(() =>
  password.value.length >= 6 && password.value === confirmPassword.value && nickname.value && agreed.value
)

function startCountdown() {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (countdown.value > 0) countdown.value--
    else { if (timer) clearInterval(timer); timer = null }
  }, 1000)
}

async function sendCode() {
  if (countdown.value > 0 || phone.value.length !== 11) return
  try {
    // @ts-ignore
    const res = await authApi.sendCode({ phone: phone.value, type: 'register' }) as any
    if (res?.code === 200 || res?.ok || !res?.code) {
      startCountdown()
      stepIdx.value = 1
    } else {
      errMsg.value = res?.message || '发送失败'
    }
  } catch { errMsg.value = '网络错误，请重试' }
}

function verifyCode() {
  if (code.value.length !== 6) return
  stepIdx.value = 2
}

async function handleRegister() {
  if (!canRegister.value || loading.value) return
  loading.value = true
  errMsg.value = ''
  try {
    // @ts-ignore
    const res = await authApi.register({
      phone: phone.value,
      code: code.value,
      password: password.value,
      nickname: nickname.value,
    }) as any
    if (res?.code === 200 || res?.ok || !res?.code) {
      uni.navigateTo({ url: '/pages/login/index?registered=true' })
    } else {
      errMsg.value = res?.message || '注册失败'
    }
  } catch { errMsg.value = '网络错误，请重试' }
  finally { loading.value = false }
}

function goBack() {
  if (stepIdx.value === 0) uni.navigateBack()
  else stepIdx.value--
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.register-page { min-height: 100vh; background: #FAF8F5; }

.header {
  display: flex; align-items: center; padding: 0 24rpx; height: 100rpx;
  border-bottom: 1px solid #E8E0D5;
}
.header-back { font-size: 48rpx; color: #333; width: 64rpx; }
.header-title { font-size: 34rpx; font-weight: 700; color: #2C2C2C; }

/* 进度条 */
.progress-area { padding: 40rpx 48rpx 24rpx; }
.progress-bar { display: flex; align-items: center; }
.step { display: flex; align-items: center; flex: 1; }
.step:last-child { flex: 0; }
.step-dot {
  width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 26rpx; font-weight: 600; color: #999; background: #F5F1EB;
}
.step-dot.active { background: #C41E3A; color: #fff; }
.step-dot.done { background: #52C41A; color: #fff; }
.step-line { flex: 1; height: 3rpx; background: #E8E0D5; margin: 0 8rpx; }
.step-line.done { background: #52C41A; }
.step-labels { display: flex; justify-content: space-between; margin-top: 12rpx; }
.step-label { font-size: 22rpx; color: #999; }
.step-label.active { color: #C41E3A; }

/* 步骤内容 */
.step-body { padding: 40rpx 48rpx; }
.step-title { font-size: 40rpx; font-weight: 700; color: #2C2C2C; margin-bottom: 8rpx; }
.step-desc { font-size: 26rpx; color: #999; margin-bottom: 40rpx; }

.input-group {
  display: flex; align-items: center; height: 96rpx;
  background: #F5F1EB; border-radius: 20rpx; padding: 0 24rpx;
  margin-bottom: 20rpx;
}
.input-icon { font-size: 36rpx; margin-right: 16rpx; }
.input-field { flex: 1; font-size: 28rpx; color: #2C2C2C; }
.input-field::placeholder { color: #999; }
.code-input { letter-spacing: 12rpx; }
.pwd-toggle { font-size: 32rpx; padding: 8rpx; }

.resend-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.resend-text { font-size: 24rpx; color: #999; }
.resend-link { font-size: 24rpx; color: #C41E3A; }
.resend-link.disabled { color: #999; }

.step-btn {
  height: 96rpx; border-radius: 24rpx; margin-top: 24rpx;
  background: linear-gradient(135deg, #C41E3A, #A01830);
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: 600; color: #fff;
}
.step-btn.disabled { opacity: 0.5; }

.agree-row { display: flex; align-items: flex-start; gap: 12rpx; margin: 20rpx 0; }
.agree-check {
  width: 36rpx; height: 36rpx; border-radius: 8rpx; border: 3rpx solid #CCC;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 4rpx;
}
.agree-check.checked { background: #C41E3A; border-color: #C41E3A; }
.check-mark { font-size: 24rpx; color: #fff; font-weight: 700; }
.agree-text { font-size: 22rpx; color: #999; line-height: 1.6; }
.agree-link { color: #C41E3A; }

.err-hint { padding: 0 8rpx; margin-bottom: 8rpx; }
.err-hint text { font-size: 24rpx; color: #C41E3A; }

.bottom-link { text-align: center; padding: 40rpx 0; }
.bottom-text { font-size: 26rpx; color: #999; }
.bottom-action { font-size: 26rpx; color: #C41E3A; margin-left: 4rpx; }
</style>
