<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'

type Step = 'enter_old' | 'enter_new' | 'confirm_new' | 'verify_phone' | 'done'

const pageLoading = ref(true)
const mode = ref<'set' | 'change'>('change') // set=首次设置 change=已设置
const phoneFull = ref('')
const isReset = ref(false) // 是否走「忘记密码→短信重置」流程

const step = ref<Step>('enter_old')
const oldPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
const submitting = ref(false)
const error = ref('')

const stepTitles = computed<Record<Step, string>>(() => ({
  enter_old: '验证当前支付密码',
  enter_new: '设置新支付密码',
  confirm_new: '再次确认新密码',
  verify_phone: '验证手机号',
  done: '设置成功',
}))
const stepSubtitles = computed<Record<Step, string>>(() => ({
  enter_old: '请输入当前6位支付密码',
  enter_new: mode.value === 'set' ? '请设置6位数字支付密码' : '请输入新的6位支付密码',
  confirm_new: '请再次输入新支付密码',
  verify_phone: '通过手机验证码重置支付密码',
  done: mode.value === 'set' ? '支付密码设置成功' : '支付密码修改成功',
}))

const progressSteps: Step[] = ['enter_old', 'enter_new', 'confirm_new']
const currentProgressIdx = computed(() => progressSteps.indexOf(step.value))

const activePin = computed({
  get() {
    if (step.value === 'enter_old') return oldPin.value
    if (step.value === 'enter_new') return newPin.value
    if (step.value === 'confirm_new') return confirmPin.value
    return ''
  },
  set(v: string) {
    const val = v.replace(/\D/g, '').slice(0, 6)
    if (step.value === 'enter_old') oldPin.value = val
    else if (step.value === 'enter_new') newPin.value = val
    else if (step.value === 'confirm_new') confirmPin.value = val
    error.value = ''
  },
})

function onPinInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  activePin.value = e.detail.value
}

let timer: ReturnType<typeof setInterval> | null = null
function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) clearInterval(timer)
  }, 1000)
}
async function handleSendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    error.value = '请输入正确的手机号'
    return
  }
  try {
    await mineApi.sendPhoneCode(phone.value, 'RESET_PAY_PWD')
    startCountdown()
    error.value = ''
  } catch (e) {
    error.value = (e as Error)?.message || '验证码发送失败'
  }
}
function handleForget() {
  isReset.value = true
  step.value = 'verify_phone'
  oldPin.value = ''
  error.value = ''
  if (!phone.value) phone.value = phoneFull.value
}

// confirm_new 完成后按场景提交真实接口
async function submitNewPassword() {
  submitting.value = true
  error.value = ''
  let res: { success: boolean; message?: string }
  if (isReset.value) {
    res = await mineApi.resetPaymentPassword(newPin.value, smsCode.value)
  } else if (mode.value === 'set') {
    // 后端首次设置不强制校验短信，占位满足 DTO 格式
    res = await mineApi.setPaymentPassword(newPin.value, '000000')
  } else {
    res = await mineApi.updatePaymentPassword(oldPin.value, newPin.value)
  }
  submitting.value = false
  if (res.success) {
    step.value = 'done'
  } else {
    error.value = res.message || '操作失败'
    confirmPin.value = ''
  }
}

async function advance() {
  if (submitting.value) return
  error.value = ''

  if (step.value === 'enter_old') {
    if (oldPin.value.length < 6) { error.value = '请输入完整的6位密码'; return }
    submitting.value = true
    const res = await mineApi.verifyPaymentPassword(oldPin.value)
    submitting.value = false
    if (!res.success) { oldPin.value = ''; error.value = res.message || '密码错误，请重试'; return }
    step.value = 'enter_new'
  } else if (step.value === 'enter_new') {
    if (newPin.value.length < 6) { error.value = '请输入完整的6位新密码'; return }
    step.value = 'confirm_new'
  } else if (step.value === 'confirm_new') {
    if (confirmPin.value.length < 6) { error.value = '请输入完整的确认密码'; return }
    if (confirmPin.value !== newPin.value) { confirmPin.value = ''; error.value = '两次密码不一致，请重新输入'; return }
    await submitNewPassword()
  } else if (step.value === 'verify_phone') {
    if (smsCode.value.length < 6) { error.value = '请输入6位验证码'; return }
    step.value = 'enter_new'
  }
}

// PIN 输满 6 位自动推进
watch([oldPin, newPin, confirmPin], () => {
  if (submitting.value) return
  if (step.value === 'enter_old' && oldPin.value.length === 6) advance()
  else if (step.value === 'enter_new' && newPin.value.length === 6) advance()
  else if (step.value === 'confirm_new' && confirmPin.value.length === 6) advance()
})

function onPhoneInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  phone.value = e.detail.value.replace(/\D/g, '').slice(0, 11)
}
function onSmsInput(e: any /* uni 表单事件经 vue-tsc 按原生签名校验，参数须 any */) {
  smsCode.value = e.detail.value.replace(/\D/g, '').slice(0, 6)
}

onMounted(async () => {
  try {
    const profile = await mineApi.getProfile()
    mode.value = profile.paymentPasswordSet ? 'change' : 'set'
    phoneFull.value = profile.phoneFull || ''
    step.value = mode.value === 'set' ? 'enter_new' : 'enter_old'
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
    step.value = 'enter_old'
  } finally {
    pageLoading.value = false
  }
})
</script>

<template>
  <view class="page">
    <!-- 导航 -->
    <app-nav-bar :title="mode === 'set' ? '设置支付密码' : '修改支付密码'" />

    <view class="body">
      <view v-if="pageLoading" class="title-block">
        <view class="title-icon"><AppIcon name="shield" :size="32" color="#C41E3A" /></view>
        <text class="subtitle">加载中…</text>
      </view>
      <template v-else>
      <template v-if="step !== 'done'">
        <!-- 进度 -->
        <view v-if="mode === 'change'" class="progress">
          <view v-for="(s, idx) in progressSteps" :key="s" class="progress-cell">
            <view class="progress-dot" :class="{ active: step === s, passed: currentProgressIdx > idx }">
              <text class="progress-num" :class="{ active: step === s || currentProgressIdx > idx }">{{ idx + 1 }}</text>
            </view>
            <view v-if="idx < 2" class="progress-line" :class="{ active: currentProgressIdx > idx }" />
          </view>
        </view>

        <!-- 标题 -->
        <view class="title-block">
          <view class="title-icon"><AppIcon name="shield" :size="32" color="#C41E3A" /></view>
          <text class="title">{{ stepTitles[step] }}</text>
          <text class="subtitle">{{ stepSubtitles[step] }}</text>
        </view>

        <!-- 验证手机号 -->
        <view v-if="step === 'verify_phone'" class="phone-form">
          <view class="field">
            <text class="field-label">手机号</text>
            <view class="code-row">
              <input class="full-input" type="text" :value="phone" @input="onPhoneInput" placeholder="请输入手机号" placeholder-class="ph" />
              <view class="code-btn" :class="{ disabled: countdown > 0 }" @tap="handleSendCode">
                <text class="code-btn-text">{{ countdown > 0 ? `${countdown}s` : '发送验证码' }}</text>
              </view>
            </view>
          </view>
          <view class="field">
            <text class="field-label">验证码</text>
            <input class="full-input" type="text" :maxlength="6" :value="smsCode" @input="onSmsInput" placeholder="请输入6位验证码" placeholder-class="ph" />
          </view>
          <text v-if="error" class="err center">{{ error }}</text>
          <view class="primary-btn" @tap="advance"><text class="primary-btn-text">{{ submitting ? '验证中...' : '下一步' }}</text></view>
        </view>

        <!-- PIN 格子 -->
        <view v-else class="pin-block">
          <view class="pin-wrap">
            <input
              class="pin-hidden"
              type="text"
              :maxlength="6"
              :value="activePin"
              :focus="true"
              @input="onPinInput"
            />
            <view class="pin-grid">
              <view v-for="i in 6" :key="i" class="pin-cell" :class="{ err: !!error }">
                <view v-if="activePin.length >= i" class="pin-dot" />
                <view v-else-if="activePin.length === i - 1" class="pin-caret" />
              </view>
            </view>
          </view>
          <text v-if="error" class="err center">{{ error }}</text>
          <text v-else-if="submitting" class="loading-text">验证中...</text>

          <view v-if="step === 'enter_old'" class="forget" @tap="handleForget">
            <text class="forget-text">忘记支付密码？</text>
          </view>
        </view>

        <!-- 提示 -->
        <view class="tip">
          <text class="tip-text">支付密码为6位数字，用于支付订单、转账等敏感操作。请勿设置与登录密码相同的数字组合，避免使用生日、连续数字等。</text>
        </view>
      </template>

      <!-- 成功态 -->
      <view v-else class="done-block">
        <view class="done-icon"><AppIcon name="check-circle" :size="48" color="#22c55e" /></view>
        <text class="done-title">{{ mode === 'set' ? '支付密码设置成功' : '支付密码修改成功' }}</text>
        <text class="done-sub">您的支付密码已{{ mode === 'set' ? '设置' : '更新' }}，下次支付时将使用新密码验证</text>
        <view class="done-btn" @tap="goBack"><text class="done-btn-text">完成</text></view>
      </view>
      </template>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #faf8f5;
}
.body {
  padding: 64rpx 48rpx;
}
.progress {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 64rpx;
}
.progress-cell {
  display: flex;
  align-items: center;
}
.progress-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #e8e3db;
  display: flex;
  align-items: center;
  justify-content: center;
}
.progress-dot.active {
  background: var(--brand);
}
.progress-dot.passed {
  background: rgba(196, 30, 58, 0.2);
}
.progress-num {
  font-size: 22rpx;
  font-weight: 700;
  color: #999;
}
.progress-num.active {
  color: #fff;
}
.progress-dot.passed .progress-num {
  color: var(--brand);
}
.progress-line {
  width: 64rpx;
  height: 4rpx;
  background: #e8e3db;
  margin: 0 12rpx;
}
.progress-line.active {
  background: var(--brand);
}
.title-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
}
.title-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
}
.pin-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pin-wrap {
  position: relative;
  width: 100%;
}
.pin-hidden {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 112rpx;
  opacity: 0;
  z-index: 2;
}
.pin-grid {
  display: flex;
  border: 1rpx solid #e8e3db;
  border-radius: 20rpx;
  overflow: hidden;
}
.pin-cell {
  flex: 1;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1rpx solid #e8e3db;
  background: #fff;
}
.pin-cell:first-child {
  border-left: none;
}
.pin-cell.err {
  border-color: #ef4444;
}
.pin-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #2c2c2c;
}
.pin-caret {
  width: 4rpx;
  height: 48rpx;
  background: var(--brand);
}
.err {
  font-size: 24rpx;
  color: #ef4444;
}
.err.center {
  text-align: center;
  margin-top: 16rpx;
}
.loading-text {
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}
.forget {
  margin-top: 48rpx;
}
.forget-text {
  font-size: 26rpx;
  color: var(--brand);
}
.phone-form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.field-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.code-row {
  display: flex;
  gap: 16rpx;
}
.full-input {
  flex: 1;
  height: 88rpx;
  padding: 0 28rpx;
  background: #fff;
  border: 1rpx solid #e8e3db;
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
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.code-btn.disabled {
  opacity: 0.5;
}
.code-btn-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
}
.primary-btn {
  height: 88rpx;
  border-radius: 20rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}
.primary-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
.tip {
  margin-top: 64rpx;
  padding: 28rpx;
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 20rpx;
}
.tip-text {
  font-size: 22rpx;
  color: #b45309;
  line-height: 1.6;
}
.done-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 96rpx;
}
.done-icon {
  width: 176rpx;
  height: 176rpx;
  border-radius: 50%;
  background: #f0fdf4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.done-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.done-sub {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 64rpx;
}
.done-btn {
  width: 100%;
  max-width: 480rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.done-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
</style>
