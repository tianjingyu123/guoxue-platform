<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <text
          class="back-btn"
          @click="goBack"
        >
          ←
        </text>
        <text class="header-title">
          修改手机号
        </text>
        <view class="header-right" />
      </view>
    </view>

    <!-- 步骤指示器 -->
    <view class="stepper">
      <view
        v-for="(item, index) in steps"
        :key="item.num"
        class="stepper-item"
      >
        <view class="stepper-left">
          <view
            class="stepper-dot"
            :class="{ active: step >= item.num, done: step > item.num }"
          >
            <text
              v-if="step > item.num"
              class="stepper-check"
            >
              ✓
            </text>
            <text v-else>
              {{ item.num }}
            </text>
          </view>
          <text
            class="stepper-label"
            :class="{ active: step >= item.num }"
          >
            {{ item.label }}
          </text>
        </view>
        <view
          v-if="index < steps.length - 1"
          class="stepper-line"
          :class="{ done: step > item.num }"
        />
      </view>
    </view>

    <!-- 步骤1：验证当前手机号 -->
    <view
      v-if="step === 1"
      class="form-card"
    >
      <view class="form-header">
        <view class="form-header-icon">
          <text class="form-header-icon-text">
            🔒
          </text>
        </view>
        <view>
          <text class="form-header-title">
            验证当前手机号
          </text>
          <text class="form-header-desc">
            为保障账号安全，请先验证身份
          </text>
        </view>
      </view>

      <view class="phone-display">
        <text class="phone-display-icon">
          📱
        </text>
        <text class="phone-display-num">
          {{ currentPhone }}
        </text>
        <text class="phone-display-tag">
          当前绑定
        </text>
      </view>

      <view class="form-group">
        <text class="form-label">
          短信验证码
        </text>
        <view class="code-row">
          <input
            v-model="verifyCode"
            type="text"
            maxlength="6"
            class="form-input code-input"
            placeholder="请输入验证码"
            @input="onCodeInput"
          >
          <view
            class="btn-send"
            :class="{ disabled: countdown > 0 }"
            @click="sendVerifyCode"
          >
            {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
          </view>
        </view>
      </view>

      <text
        v-if="error"
        class="form-error"
      >
        {{ error }}
      </text>

      <view
        class="btn-primary"
        :class="{ disabled: loading || verifyCode.length !== 6 }"
        @click="verifyCurrentPhone"
      >
        {{ loading ? '验证中...' : '下一步 →' }}
      </view>
    </view>

    <!-- 步骤2：绑定新手机号 -->
    <view
      v-if="step === 2"
      class="form-card"
    >
      <view class="form-header">
        <view
          class="form-header-icon"
          style="background:#E8F5E9"
        >
          <text class="form-header-icon-text">
            📱
          </text>
        </view>
        <view>
          <text class="form-header-title">
            绑定新手机号
          </text>
          <text class="form-header-desc">
            请输入新的手机号并验证
          </text>
        </view>
      </view>

      <view class="form-group">
        <text class="form-label">
          新手机号
        </text>
        <input
          v-model="newPhone"
          type="text"
          maxlength="11"
          class="form-input"
          placeholder="请输入新手机号"
          @input="onPhoneInput"
        >
      </view>

      <view class="form-group">
        <text class="form-label">
          短信验证码
        </text>
        <view class="code-row">
          <input
            v-model="newCode"
            type="text"
            maxlength="6"
            class="form-input code-input"
            placeholder="请输入验证码"
            @input="onCodeInput2"
          >
          <view
            class="btn-send"
            :class="{ disabled: newCountdown > 0 || newPhone.length !== 11 }"
            @click="sendNewCode"
          >
            {{ newCountdown > 0 ? newCountdown + 's' : '获取验证码' }}
          </view>
        </view>
      </view>

      <text
        v-if="error"
        class="form-error"
      >
        {{ error }}
      </text>

      <view
        class="btn-primary"
        :class="{ disabled: loading || newPhone.length !== 11 || newCode.length !== 6 }"
        @click="submitNewPhone"
      >
        {{ loading ? '绑定中...' : '确认绑定' }}
      </view>

      <text
        class="btn-back"
        @click="step = 1"
      >
        返回上一步
      </text>

      <text class="form-tip">
        温馨提示：更换手机号后，原手机号将无法用于登录和找回密码
      </text>
    </view>

    <!-- 步骤3：完成 -->
    <view
      v-if="step === 3"
      class="result-card"
    >
      <view class="result-icon-wrap">
        <text class="result-icon">
          ✅
        </text>
      </view>
      <text class="result-title">
        绑定成功
      </text>
      <text class="result-desc">
        新手机号已绑定
      </text>
      <text class="result-phone">
        {{ maskedNewPhone }}
      </text>
      <text class="result-countdown">
        页面即将自动返回...
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(1)
const currentPhone = ref('138****8888')
const verifyCode = ref('')
const newPhone = ref('')
const newCode = ref('')
const countdown = ref(0)
const newCountdown = ref(0)
const loading = ref(false)
const error = ref('')

let countdownTimer: ReturnType<typeof setInterval> | null = null
let newCountdownTimer: ReturnType<typeof setInterval> | null = null

const steps = [
  { num: 1, label: '验证身份' },
  { num: 2, label: '绑定新号' },
  { num: 3, label: '完成' },
]

const maskedNewPhone = computed(() => {
  const p = newPhone.value
  if (p.length >= 7) {
    return p.slice(0, 3) + '****' + p.slice(-4)
  }
  return p
})

function onCodeInput(e: any) {
  verifyCode.value = e.detail.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''
}

function onCodeInput2(e: any) {
  newCode.value = e.detail.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''
}

function onPhoneInput(e: any) {
  newPhone.value = e.detail.value.replace(/\D/g, '').slice(0, 11)
  error.value = ''
}

function startCountdown(target: 'old' | 'new') {
  if (target === 'old') {
    countdown.value = 60
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer!)
        countdownTimer = null
      }
    }, 1000)
  } else {
    newCountdown.value = 60
    if (newCountdownTimer) clearInterval(newCountdownTimer)
    newCountdownTimer = setInterval(() => {
      newCountdown.value--
      if (newCountdown.value <= 0) {
        clearInterval(newCountdownTimer!)
        newCountdownTimer = null
      }
    }, 1000)
  }
}

function sendVerifyCode() {
  if (countdown.value > 0) return
  startCountdown('old')
  uni.showToast({ title: '验证码已发送', icon: 'none' })
}

function sendNewCode() {
  if (newCountdown.value > 0 || newPhone.value.length !== 11) return
  startCountdown('new')
  uni.showToast({ title: '验证码已发送', icon: 'none' })
}

async function verifyCurrentPhone() {
  if (verifyCode.value.length !== 6) {
    error.value = '请输入6位验证码'
    return
  }
  loading.value = true
  error.value = ''
  await new Promise((r) => setTimeout(r, 1000))
  loading.value = false
  step.value = 2
}

async function submitNewPhone() {
  if (newPhone.value.length !== 11) {
    error.value = '请输入正确的手机号'
    return
  }
  if (newCode.value.length !== 6) {
    error.value = '请输入6位验证码'
    return
  }
  loading.value = true
  error.value = ''
  await new Promise((r) => setTimeout(r, 1500))
  loading.value = false
  step.value = 3
  setTimeout(() => goBack(), 2000)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* 顶部导航 */
.header {
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
}
.back-btn { font-size: 36rpx; color: #2C2C2C; padding: 8rpx; }
.header-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.header-right { width: 80rpx; }

/* 步骤指示器 */
.stepper {
  display: flex;
  align-items: flex-start;
  padding: 40rpx 48rpx;
}
.stepper-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stepper-left {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stepper-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #E8E3DB;
  color: #999;
  font-size: 26rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}
.stepper-dot.active {
  background: #C41E3A;
  color: #fff;
}
.stepper-dot.done {
  background: #22C55E;
  color: #fff;
}
.stepper-check { font-size: 28rpx; font-weight: bold; }
.stepper-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 12rpx;
  white-space: nowrap;
}
.stepper-label.active { color: #C41E3A; }
.stepper-line {
  width: 100%;
  height: 4rpx;
  background: #E8E3DB;
  margin-top: -32rpx;
  transition: all 0.3s;
}
.stepper-line.done { background: #22C55E; }

/* 表单卡片 */
.form-card {
  margin: 0 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}
.form-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 28rpx;
}
.form-header-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #FDE8E8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.form-header-icon-text { font-size: 40rpx; }
.form-header-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; }
.form-header-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }

.phone-display {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 28rpx;
}
.phone-display-icon { font-size: 28rpx; }
.phone-display-num { font-size: 28rpx; font-weight: 500; color: #2C2C2C; flex: 1; }
.phone-display-tag { font-size: 20rpx; color: #999; }

.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 10rpx; }
.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: #FAF8F5;
  border-radius: 16rpx;
  border: 1rpx solid #E8E3D7;
  font-size: 26rpx;
  color: #2C2C2C;
  box-sizing: border-box;
}
.code-row { display: flex; gap: 16rpx; }
.code-input { flex: 1; }
.btn-send {
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: 16rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-send.disabled { background: #E8E3DB; color: #999; }

.form-error { font-size: 22rpx; color: #EF4444; margin-bottom: 16rpx; display: block; }

.btn-primary {
  width: 100%;
  height: 88rpx;
  border-radius: 44rpx;
  background: #C41E3A;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}
.btn-primary.disabled { opacity: 0.5; }

.btn-back {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #666;
  margin-top: 24rpx;
  padding: 8rpx;
}

.form-tip {
  display: block;
  font-size: 20rpx;
  color: #999;
  margin-top: 24rpx;
  line-height: 1.5;
}

/* 结果卡片 */
.result-card {
  margin: 80rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 64rpx 32rpx;
  text-align: center;
}
.result-icon-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #E8F5E9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
}
.result-icon { font-size: 72rpx; }
.result-title { font-size: 36rpx; font-weight: 600; color: #2C2C2C; display: block; }
.result-desc { font-size: 26rpx; color: #666; margin-top: 8rpx; display: block; }
.result-phone { font-size: 32rpx; font-weight: 600; color: #C41E3A; margin-top: 16rpx; display: block; }
.result-countdown { font-size: 22rpx; color: #999; margin-top: 40rpx; display: block; }
</style>
