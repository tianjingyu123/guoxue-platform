<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mineSettingsApi } from '@/lib/mine-data'

const loading = ref(true)
const loadError = ref('')
const step = ref(1)
const phone = ref('')
const verifyCode = ref('')

async function loadData() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await mineSettingsApi.profile()
    phone.value = res.profile.phone
  } catch {
    loadError.value = '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
const newPhone = ref('')
const newCode = ref('')
const countdown = ref(0)
const newCountdown = ref(0)
const submitting = ref(false)
const formError = ref('')

const steps = [
  { num: 1, label: '验证身份' },
  { num: 2, label: '绑定新号' },
  { num: 3, label: '完成' },
]

let timer1: ReturnType<typeof setInterval> | null = null
let timer2: ReturnType<typeof setInterval> | null = null

function sendVerifyCode() {
  if (countdown.value > 0) return
  countdown.value = 60
  timer1 = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer1) clearInterval(timer1)
  }, 1000)
}
function sendNewCode() {
  if (newCountdown.value > 0 || newPhone.value.length !== 11) return
  newCountdown.value = 60
  timer2 = setInterval(() => {
    newCountdown.value--
    if (newCountdown.value <= 0 && timer2) clearInterval(timer2)
  }, 1000)
}
function onVerifyInput(e: any) {
  verifyCode.value = e.detail.value.replace(/\D/g, '')
  formError.value = ''
}
function onNewPhoneInput(e: any) {
  newPhone.value = e.detail.value.replace(/\D/g, '')
  formError.value = ''
}
function onNewCodeInput(e: any) {
  newCode.value = e.detail.value.replace(/\D/g, '')
  formError.value = ''
}

async function verifyCurrentPhone() {
  if (verifyCode.value.length !== 6) {
    formError.value = '请输入6位验证码'
    return
  }
  submitting.value = true
  formError.value = ''
  await new Promise((r) => setTimeout(r, 1000))
  submitting.value = false
  step.value = 2
}
async function submitNewPhone() {
  if (newPhone.value.length !== 11) {
    formError.value = '请输入正确的手机号'
    return
  }
  if (newCode.value.length !== 6) {
    formError.value = '请输入6位验证码'
    return
  }
  submitting.value = true
  formError.value = ''
  await new Promise((r) => setTimeout(r, 1500))
  submitting.value = false
  step.value = 3
  setTimeout(() => goBack(), 2000)
}
function maskedNewPhone() {
  return newPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

onUnmounted(() => {
  if (timer1) clearInterval(timer1)
  if (timer2) clearInterval(timer2)
})
</script>

<template>
  <view class="page">
    <!-- 导航 -->
    <view class="nav">
      <view
        class="nav-btn"
        @tap="goBack"
      >
        <AppIcon
          name="chevron-left"
          :size="22"
          color="#2C2C2C"
        />
      </view>
      <text class="nav-title">
        修改手机号
      </text>
      <view class="nav-btn" />
    </view>

    <!-- 步骤指示器 -->
    <view class="steps">
      <view
        v-for="(item, idx) in steps"
        :key="item.num"
        class="step-cell"
      >
        <view class="step-col">
          <view
            class="step-dot"
            :class="{ active: step >= item.num }"
          >
            <AppIcon
              v-if="step > item.num"
              name="check-circle"
              :size="20"
              color="#fff"
            />
            <text
              v-else
              class="step-num"
              :class="{ active: step >= item.num }"
            >
              {{ item.num }}
            </text>
          </view>
          <text
            class="step-label"
            :class="{ active: step >= item.num }"
          >
            {{ item.label }}
          </text>
        </view>
        <view
          v-if="idx < 2"
          class="step-line"
          :class="{ active: step > item.num }"
        />
      </view>
    </view>

    <!-- 加载状态 -->
    <view
      v-if="loading"
      class="load-wrap"
    >
      <view class="loading-spinner" />
      <text class="loading-text">
        加载中...
      </text>
    </view>
    <!-- 错误状态 -->
    <view
      v-else-if="loadError"
      class="load-wrap"
    >
      <text class="load-error-text">
        {{ loadError }}
      </text>
      <view
        class="retry-btn"
        @tap="loadData"
      >
        <text class="retry-btn-text">
          重试
        </text>
      </view>
    </view>
    <template v-else>
      <!-- 步骤1 -->
      <view
        v-if="step === 1"
        class="body"
      >
        <view class="card">
          <view class="card-head">
            <view class="head-icon red">
              <AppIcon
                name="shield"
                :size="24"
                color="#C41E3A"
              />
            </view>
            <view>
              <text class="head-title">
                验证当前手机号
              </text>
              <text class="head-sub">
                为保障账号安全，请先验证身份
              </text>
            </view>
          </view>
          <view class="phone-box">
            <AppIcon
              name="phone"
              :size="20"
              color="#666"
            />
            <text class="phone-text">
              {{ phone }}
            </text>
            <text class="phone-tag">
              当前绑定
            </text>
          </view>
          <view class="form">
            <text class="form-label">
              短信验证码
            </text>
            <view class="code-row">
              <input
                class="code-input"
                type="number"
                :maxlength="6"
                :value="verifyCode"
                placeholder="请输入验证码"
                placeholder-class="ph"
                @input="onVerifyInput"
              >
              <view
                class="code-btn"
                :class="{ disabled: countdown > 0 }"
                @tap="sendVerifyCode"
              >
                <text
                  class="code-btn-text"
                  :class="{ disabled: countdown > 0 }"
                >
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </text>
              </view>
            </view>
            <text
              v-if="formError"
              class="err"
            >
              {{ formError }}
            </text>
            <view
              class="primary-btn"
              :class="{ disabled: submitting || verifyCode.length !== 6 }"
              @tap="verifyCurrentPhone"
            >
              <text class="primary-btn-text">
                {{ submitting ? '验证中...' : '下一步' }}
              </text>
              <AppIcon
                v-if="!submitting"
                name="arrow-right"
                :size="16"
                color="#fff"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- 步骤2 -->
      <view
        v-if="step === 2"
        class="body"
      >
        <view class="card">
          <view class="card-head">
            <view class="head-icon green">
              <AppIcon
                name="phone"
                :size="24"
                color="#16a34a"
              />
            </view>
            <view>
              <text class="head-title">
                绑定新手机号
              </text>
              <text class="head-sub">
                请输入新的手机号并验证
              </text>
            </view>
          </view>
          <view class="form">
            <text class="form-label">
              新手机号
            </text>
            <input
              class="full-input"
              type="number"
              :maxlength="11"
              :value="newPhone"
              placeholder="请输入新手机号"
              placeholder-class="ph"
              @input="onNewPhoneInput"
            >
            <text class="form-label">
              短信验证码
            </text>
            <view class="code-row">
              <input
                class="code-input"
                type="number"
                :maxlength="6"
                :value="newCode"
                placeholder="请输入验证码"
                placeholder-class="ph"
                @input="onNewCodeInput"
              >
              <view
                class="code-btn"
                :class="{ disabled: newCountdown > 0 || newPhone.length !== 11 }"
                @tap="sendNewCode"
              >
                <text
                  class="code-btn-text"
                  :class="{ disabled: newCountdown > 0 || newPhone.length !== 11 }"
                >
                  {{ newCountdown > 0 ? `${newCountdown}s` : '获取验证码' }}
                </text>
              </view>
            </view>
            <text
              v-if="formError"
              class="err"
            >
              {{ formError }}
            </text>
            <view
              class="primary-btn"
              :class="{ disabled: submitting || newPhone.length !== 11 || newCode.length !== 6 }"
              @tap="submitNewPhone"
            >
              <text class="primary-btn-text">
                {{ submitting ? '提交中...' : '确认绑定' }}
              </text>
            </view>
            <view
              class="back-btn"
              @tap="step = 1"
            >
              <text class="back-btn-text">
                返回上一步
              </text>
            </view>
          </view>
        </view>
        <text class="foot-tip">
          温馨提示：更换手机号后，原手机号将无法用于登录和找回密码
        </text>
      </view>

      <!-- 步骤3 -->
      <view
        v-if="step === 3"
        class="body"
      >
        <view class="card done-card">
          <view class="done-icon">
            <AppIcon
              name="check-circle"
              :size="40"
              color="#16a34a"
            />
          </view>
          <text class="done-title">
            绑定成功
          </text>
          <text class="done-sub">
            新手机号已绑定
          </text>
          <text class="done-phone">
            {{ maskedNewPhone() }}
          </text>
          <text class="done-tip">
            页面即将自动返回...
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e3db;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.steps {
  display: flex;
  align-items: flex-start;
  padding: 48rpx;
}
.step-cell {
  display: flex;
  align-items: center;
  flex: 1;
}
.step-cell:last-child {
  flex: none;
}
.step-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.step-dot {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #e8e3db;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-dot.active {
  background: #c41e3a;
}
.step-num {
  font-size: 28rpx;
  font-weight: 500;
  color: #999;
}
.step-num.active {
  color: #fff;
}
.step-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 12rpx;
}
.step-label.active {
  color: #c41e3a;
}
.step-line {
  flex: 1;
  height: 2rpx;
  background: #e8e3db;
  margin: 32rpx 16rpx 0;
}
.step-line.active {
  background: #c41e3a;
}
.body {
  padding: 0 32rpx;
}
.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 48rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.head-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.head-icon.red {
  background: rgba(196, 30, 58, 0.1);
}
.head-icon.green {
  background: #dcfce7;
}
.head-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.head-sub {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-top: 4rpx;
}
.phone-box {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #faf8f5;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 48rpx;
}
.phone-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.phone-tag {
  margin-left: auto;
  font-size: 22rpx;
  color: #999;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.form-label {
  font-size: 26rpx;
  color: #666;
}
.full-input {
  height: 88rpx;
  padding: 0 28rpx;
  background: #faf8f5;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #2c2c2c;
}
.code-row {
  display: flex;
  gap: 24rpx;
}
.code-input {
  flex: 1;
  height: 88rpx;
  padding: 0 28rpx;
  background: #faf8f5;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #2c2c2c;
}
.ph {
  color: #ccc;
}
.code-btn {
  padding: 0 28rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.code-btn.disabled {
  background: #e8e3db;
}
.code-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.code-btn-text.disabled {
  color: #999;
}
.err {
  font-size: 24rpx;
  color: #ef4444;
}
.primary-btn {
  height: 88rpx;
  border-radius: 20rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.primary-btn.disabled {
  opacity: 0.5;
}
.primary-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}
.back-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-btn-text {
  font-size: 26rpx;
  color: #666;
}
.foot-tip {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 24rpx;
  padding: 0 8rpx;
}
.done-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 48rpx;
}
.done-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.done-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.done-sub {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}
.done-phone {
  font-size: 32rpx;
  font-weight: 500;
  color: #c41e3a;
}
.done-tip {
  font-size: 24rpx;
  color: #999;
  margin-top: 48rpx;
}
.load-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
}
.loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid #e8e3db;
  border-top-color: #c41e3a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-text {
  font-size: 28rpx;
  color: #999;
}
.load-error-text {
  font-size: 28rpx;
  color: #ef4444;
  margin-bottom: 24rpx;
}
.retry-btn {
  padding: 16rpx 48rpx;
  border-radius: 16rpx;
  background: #c41e3a;
}
.retry-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}
</style>
