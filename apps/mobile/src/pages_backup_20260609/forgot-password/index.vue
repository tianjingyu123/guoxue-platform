<template>
  <view class="forgot-page">
    <!-- 顶部装饰 -->
    <view class="top-decor" />

    <!-- 返回按钮 -->
    <view class="back-row" v-if="step !== 3">
      <text class="back-btn" @click="step === 1 ? uni.navigateBack() : (step = 1)">←</text>
    </view>

    <view class="page-body">
      <!-- 步骤指示 -->
      <view v-if="step !== 3" class="step-indicator">
        <view class="si-dot" :class="{ active: step >= 1 }">
          <text v-if="step > 1">✓</text>
          <text v-else>1</text>
        </view>
        <view class="si-line" :class="{ active: step >= 2 }" />
        <view class="si-dot" :class="{ active: step >= 2 }">
          <text v-if="step > 2">✓</text>
          <text v-else>2</text>
        </view>
      </view>

      <!-- 步骤1：验证手机号 -->
      <view v-if="step === 1" class="step-content">
        <view class="step-header">
          <text class="step-title">找回密码</text>
          <text class="step-desc">请验证您的手机号</text>
        </view>

        <view class="form-group">
          <!-- 手机号 -->
          <view class="input-row">
            <text class="ir-icon">📱</text>
            <input
              class="ir-input"
              type="tel"
              v-model="phone"
              placeholder="请输入手机号"
              maxlength="11"
              @input="phone = phone.replace(/\D/g, ''); error = ''"
            />
          </view>

          <!-- 验证码 -->
          <view class="input-row">
            <text class="ir-icon">💬</text>
            <input
              class="ir-input"
              type="text"
              v-model="code"
              placeholder="请输入验证码"
              maxlength="6"
              @input="code = code.replace(/\D/g, ''); error = ''"
            />
            <text
              class="ir-code-btn"
              :class="{ disabled: countdown > 0 || !isPhoneValid }"
              @click="sendCode"
            >{{ countdown > 0 ? countdown + 's' : '获取验证码' }}</text>
          </view>

          <text v-if="error" class="error-text">{{ error }}</text>

          <view
            class="submit-btn"
            :class="{ disabled: !isPhoneValid || !isCodeValid }"
            @click="verifyPhone"
          >
            <text>下一步</text>
          </view>
        </view>
      </view>

      <!-- 步骤2：设置新密码 -->
      <view v-if="step === 2" class="step-content">
        <view class="step-header">
          <text class="step-title">设置新密码</text>
          <text class="step-desc">请设置6-20位新密码</text>
        </view>

        <view class="form-group">
          <!-- 新密码 -->
          <view class="input-row">
            <text class="ir-icon">🔒</text>
            <input
              class="ir-input"
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="请输入新密码"
              @input="error = ''"
            />
            <text class="ir-eye" @click="showPassword = !showPassword">{{ showPassword ? '🙈' : '👁️' }}</text>
          </view>

          <!-- 密码强度 -->
          <view v-if="password" class="pw-strength">
            <view class="pws-bar">
              <view
                v-for="i in 3"
                :key="i"
                class="pws-seg"
                :class="i <= passwordStrength.level ? 'level-' + passwordStrength.level : ''"
              />
            </view>
            <text class="pws-text" :class="'level-' + passwordStrength.level">{{ passwordStrength.text }}</text>
          </view>
          <text class="input-hint">6-20位，建议包含数字和字母</text>

          <!-- 确认密码 -->
          <view class="input-row">
            <text class="ir-icon">🔒</text>
            <input
              class="ir-input"
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="confirmPassword"
              placeholder="请再次输入新密码"
              @input="error = ''"
            />
            <text class="ir-eye" @click="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? '🙈' : '👁️' }}</text>
          </view>
          <text v-if="confirmPassword && password !== confirmPassword" class="error-text">两次输入的密码不一致</text>

          <text v-if="error" class="error-text">{{ error }}</text>

          <view
            class="submit-btn"
            :class="{ disabled: !isPasswordValid || isLoading }"
            @click="resetPassword"
          >
            <text>{{ isLoading ? '设置中...' : '确认设置' }}</text>
          </view>
        </view>
      </view>

      <!-- 步骤3：成功 -->
      <view v-if="step === 3" class="step-content success-step">
        <view class="success-icon-wrap">
          <text class="success-icon">✅</text>
        </view>
        <text class="success-title">密码重置成功</text>
        <text class="success-desc">您的密码已重置成功，请使用新密码登录</text>

        <view class="submit-btn" @click="goPage('/pages/login/index')">
          <text>去登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref<1 | 2 | 3>(1)
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const countdown = ref(0)
const isLoading = ref(false)
const error = ref('')

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

  if (score <= 2) return { level: 1, text: '弱' }
  if (score <= 3) return { level: 2, text: '中' }
  return { level: 3, text: '强' }
})

function sendCode() {
  if (!phone.value || phone.value.length !== 11) {
    error.value = '请输入正确的手机号'
    return
  }
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      countdown.value = 0
    }
  }, 1000)
}

function verifyPhone() {
  if (code.value !== '123456') {
    error.value = '验证码错误'
    return
  }
  error.value = ''
  step.value = 2
}

function resetPassword() {
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  if (password.value.length < 6) {
    error.value = '密码长度至少6位'
    return
  }
  error.value = ''
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    step.value = 3
  }, 1500)
}

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.forgot-page {
  min-height: 100vh;
  background: #FAF8F5;
  position: relative;
}

.top-decor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 360rpx;
  background: linear-gradient(to bottom, rgba(196,30,58,0.08), transparent);
  pointer-events: none;
}

.back-row {
  position: relative;
  z-index: 10;
  padding: 0 32rpx;
  height: 100rpx;
  display: flex;
  align-items: center;
}
.back-btn {
  font-size: 44rpx;
  color: #2C2C2C;
  padding: 8rpx 16rpx;
  margin-left: -16rpx;
  border-radius: 50%;
}

.page-body {
  position: relative;
  z-index: 10;
  padding: 0 48rpx;
}

/* 步骤指示 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 32rpx 0 48rpx;
}
.si-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 500;
  background: #F5F1EB;
  color: #999;
}
.si-dot.active {
  background: #C41E3A;
  color: #fff;
}
.si-line {
  width: 96rpx;
  height: 6rpx;
  background: #F5F1EB;
}
.si-line.active {
  background: #C41E3A;
}

/* 步骤内容 */
.step-header {
  text-align: center;
  margin-bottom: 64rpx;
}
.step-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #2C2C2C;
  display: block;
}
.step-desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 16rpx;
  display: block;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.input-row {
  position: relative;
  display: flex;
  align-items: center;
}
.ir-icon {
  position: absolute;
  left: 24rpx;
  font-size: 32rpx;
  z-index: 2;
}
.ir-input {
  width: 100%;
  height: 96rpx;
  padding: 0 24rpx 0 80rpx;
  background: #F5F1EB;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #2C2C2C;
}
.ir-code-btn {
  position: absolute;
  right: 12rpx;
  padding: 12rpx 24rpx;
  border-radius: 14rpx;
  font-size: 24rpx;
  font-weight: 500;
  background: rgba(196,30,58,0.08);
  color: #C41E3A;
  z-index: 2;
}
.ir-code-btn.disabled {
  background: #F5F1EB;
  color: #999;
}
.ir-eye {
  position: absolute;
  right: 24rpx;
  font-size: 32rpx;
  z-index: 2;
}

.error-text {
  font-size: 24rpx;
  color: #C41E3A;
  padding: 0 8rpx;
}

.input-hint {
  font-size: 22rpx;
  color: #BBB;
  padding: 0 8rpx;
  margin-top: -16rpx;
}

/* 密码强度 */
.pw-strength {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 8rpx;
  margin-top: -16rpx;
}
.pws-bar {
  display: flex;
  gap: 8rpx;
  flex: 1;
}
.pws-seg {
  height: 8rpx;
  flex: 1;
  border-radius: 4rpx;
  background: #F5F1EB;
}
.pws-seg.level-1 { background: #C41E3A; }
.pws-seg.level-2 { background: #C9A96E; }
.pws-seg.level-3 { background: #22C55E; }
.pws-text {
  font-size: 22rpx;
  font-weight: 500;
}
.pws-text.level-1 { color: #C41E3A; }
.pws-text.level-2 { color: #C9A96E; }
.pws-text.level-3 { color: #22C55E; }

.submit-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  text-align: center;
  margin-top: 16rpx;
}
.submit-btn.disabled {
  background: #CCC;
}

/* 成功步骤 */
.success-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}
.success-icon-wrap {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: rgba(34,197,94,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}
.success-icon {
  font-size: 64rpx;
}
.success-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #2C2C2C;
  display: block;
}
.success-desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 16rpx;
  text-align: center;
  line-height: 1.5;
  display: block;
}
.success-step .submit-btn {
  margin-top: 56rpx;
}
</style>
