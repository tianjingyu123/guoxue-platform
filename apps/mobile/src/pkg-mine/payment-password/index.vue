<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { mineApi } from '@/lib/mine-data'

type Step = 'enter_old' | 'enter_new' | 'confirm_new' | 'verify_phone' | 'done'

// 模拟：已设置过支付密码
const hasPaymentPwd = true
const mode = hasPaymentPwd ? 'change' : 'set'

const step = ref<Step>(hasPaymentPwd ? 'enter_old' : 'enter_new')
const oldPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
const loading = ref(false)
const error = ref('')

const stepTitles: Record<Step, string> = {
  enter_old: '验证当前支付密码',
  enter_new: '设置新支付密码',
  confirm_new: '再次确认新密码',
  verify_phone: '验证手机号',
  done: '设置成功',
}
const stepSubtitles: Record<Step, string> = {
  enter_old: '请输入当前6位支付密码',
  enter_new: mode === 'set' ? '请设置6位数字支付密码' : '请输入新的6位支付密码',
  confirm_new: '请再次输入新支付密码',
  verify_phone: '通过手机验证码重置支付密码',
  done: mode === 'set' ? '支付密码设置成功' : '支付密码修改成功',
}

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

function onPinInput(e: any) {
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
  const res = await mineApi.sendSmsCode(phone.value, 'payment_password')
  if (res.success) {
    startCountdown()
    error.value = ''
  } else {
    error.value = res.message || '发送失败'
  }
}
function handleForget() {
  step.value = 'verify_phone'
  oldPin.value = ''
  error.value = ''
}

async function advance() {
  error.value = ''
  loading.value = true

  if (step.value === 'enter_old') {
    if (oldPin.value.length < 6) { error.value = '请输入完整的6位密码'; loading.value = false; return }
    const res = await mineApi.verifyPayPassword(oldPin.value)
    loading.value = false
    if (res.success) {
      step.value = 'enter_new'
    } else {
      oldPin.value = ''
      error.value = res.message || '密码错误，请重试'
    }
  } else if (step.value === 'enter_new') {
    if (newPin.value.length < 6) { error.value = '请输入完整的6位新密码'; loading.value = false; return }
    loading.value = false
    step.value = 'confirm_new'
  } else if (step.value === 'confirm_new') {
    if (confirmPin.value.length < 6) { error.value = '请输入完整的确认密码'; loading.value = false; return }
    if (confirmPin.value !== newPin.value) { confirmPin.value = ''; error.value = '两次密码不一致，请重新输入'; loading.value = false; return }
    const res = mode === 'set'
      ? await mineApi.setPayPassword(newPin.value, smsCode.value)
      : await mineApi.updatePayPassword(oldPin.value, newPin.value)
    loading.value = false
    if (res.success) {
      step.value = 'done'
    } else {
      error.value = res.message || '操作失败'
    }
  } else if (step.value === 'verify_phone') {
    if (smsCode.value.length < 6) { error.value = '请输入6位验证码'; loading.value = false; return }
    loading.value = false
    step.value = 'enter_new'
  }
}

// PIN 输满 6 位自动推进
watch([oldPin, newPin, confirmPin], () => {
  if (step.value === 'enter_old' && oldPin.value.length === 6) advance()
  else if (step.value === 'enter_new' && newPin.value.length === 6) advance()
  else if (step.value === 'confirm_new' && confirmPin.value.length === 6) advance()
})

function onPhoneInput(e: any) {
  phone.value = e.detail.value.replace(/\D/g, '').slice(0, 11)
}
function onSmsInput(e: any) {
  smsCode.value = e.detail.value.replace(/\D/g, '').slice(0, 6)
}
</script>

<template>
  <view class="page">
    <!-- 导航 -->
    <app-nav-bar :title="mode === 'set' ? '设置支付密码' : '修改支付密码'" />

    <view class="body">
      <template v-if="step !== 'done'">
        <!-- 进度 -->
        <view
          v-if="mode === 'change'"
          class="progress"
        >
          <view
            v-for="(s, idx) in progressSteps"
            :key="s"
            class="progress-cell"
          >
            <view
              class="progress-dot"
              :class="{ active: step === s, passed: currentProgressIdx > idx }"
            >
              <text
                class="progress-num"
                :class="{ active: step === s || currentProgressIdx > idx }"
              >
                {{ idx + 1 }}
              </text>
            </view>
            <view
              v-if="idx < 2"
              class="progress-line"
              :class="{ active: currentProgressIdx > idx }"
            />
          </view>
        </view>

        <!-- 标题 -->
        <view class="title-block">
          <view class="title-icon">
            <AppIcon
              name="shield"
              :size="32"
              color="#C41E3A"
            />
          </view>
          <text class="title">
            {{ stepTitles[step] }}
          </text>
          <text class="subtitle">
            {{ stepSubtitles[step] }}
          </text>
        </view>

        <!-- 验证手机号 -->
        <view
          v-if="step === 'verify_phone'"
          class="phone-form"
        >
          <view class="field">
            <text class="field-label">
              手机号
            </text>
            <view class="code-row">
              <input
                class="full-input"
                type="number"
                :value="phone"
                placeholder="请输入手机号"
                placeholder-class="ph"
                @input="onPhoneInput"
              >
              <view
                class="code-btn"
                :class="{ disabled: countdown > 0 }"
                @tap="handleSendCode"
              >
                <text class="code-btn-text">
                  {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
                </text>
              </view>
            </view>
          </view>
          <view class="field">
            <text class="field-label">
              验证码
            </text>
            <input
              class="full-input"
              type="number"
              :maxlength="6"
              :value="smsCode"
              placeholder="请输入6位验证码"
              placeholder-class="ph"
              @input="onSmsInput"
            >
          </view>
          <text
            v-if="error"
            class="err center"
          >
            {{ error }}
          </text>
          <view
            class="primary-btn"
            @tap="advance"
          >
            <text class="primary-btn-text">
              {{ loading ? '验证中...' : '下一步' }}
            </text>
          </view>
        </view>

        <!-- PIN 格子 -->
        <view
          v-else
          class="pin-block"
        >
          <view class="pin-wrap">
            <input
              class="pin-hidden"
              type="number"
              :maxlength="6"
              :value="activePin"
              :focus="true"
              @input="onPinInput"
            >
            <view class="pin-grid">
              <view
                v-for="i in 6"
                :key="i"
                class="pin-cell"
                :class="{ err: !!error }"
              >
                <view
                  v-if="activePin.length >= i"
                  class="pin-dot"
                />
                <view
                  v-else-if="activePin.length === i - 1"
                  class="pin-caret"
                />
              </view>
            </view>
          </view>
          <text
            v-if="error"
            class="err center"
          >
            {{ error }}
          </text>
          <text
            v-else-if="loading"
            class="loading-text"
          >
            验证中...
          </text>

          <view
            v-if="step === 'enter_old'"
            class="forget"
            @tap="handleForget"
          >
            <text class="forget-text">
              忘记支付密码？
            </text>
          </view>
        </view>

        <!-- 提示 -->
        <view class="tip">
          <text class="tip-text">
            支付密码为6位数字，用于支付订单、转账等敏感操作。请勿设置与登录密码相同的数字组合，避免使用生日、连续数字等。
          </text>
        </view>
      </template>

      <!-- 成功态 -->
      <view
        v-else
        class="done-block"
      >
        <view class="done-icon">
          <AppIcon
            name="check-circle"
            :size="48"
            color="#22c55e"
          />
        </view>
        <text class="done-title">
          {{ mode === 'set' ? '支付密码设置成功' : '支付密码修改成功' }}
        </text>
        <text class="done-sub">
          您的支付密码已{{ mode === 'set' ? '设置' : '更新' }}，下次支付时将使用新密码验证
        </text>
        <view
          class="done-btn"
          @tap="goBack"
        >
          <text class="done-btn-text">
            完成
          </text>
        </view>
      </view>
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
  background: #c41e3a;
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
  color: #c41e3a;
}
.progress-line {
  width: 64rpx;
  height: 4rpx;
  background: #e8e3db;
  margin: 0 12rpx;
}
.progress-line.active {
  background: #c41e3a;
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
  background: #c41e3a;
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
  color: #c41e3a;
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
  background: #c41e3a;
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
  background: #c41e3a;
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
  background: #c41e3a;
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
