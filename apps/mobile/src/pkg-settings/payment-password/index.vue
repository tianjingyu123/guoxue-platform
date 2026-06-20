<template>
  <view class="page">
    <app-nav-bar
      :title="isModifying ? '修改支付密码' : '设置支付密码'"
      :back-icon="'arrow-left'"
      :back-size="40"
      :title-size="32"
      :title-weight="600"
      :bar-height="112"
    />

    <view class="container">
      <!-- 验证身份 -->
      <view
        v-if="step === 'verify' && isModifying"
        class="block"
      >
        <view class="head">
          <view class="head-ic">
            <app-icon
              name="shield"
              :size="40"
              color="#c41e3a"
            />
          </view>
          <text class="head-title">
            验证身份
          </text>
          <text class="head-sub">
            为保障账号安全，请验证您的手机号
          </text>
        </view>
        <view class="card">
          <view class="send-to">
            <text class="send-to-label">
              验证码将发送至
            </text>
            <text class="send-to-phone">
              {{ phone }}
            </text>
          </view>
          <view class="code-row">
            <input
              v-model="verifyCode"
              class="code-input"
              type="number"
              maxlength="6"
              placeholder="请输入验证码"
              placeholder-class="ph"
              @input="error = ''"
            >
            <view
              class="code-btn"
              :class="{ 'btn-dis': countdown > 0 }"
              @click="handleSendCode"
            >
              <text
                class="code-btn-txt"
                :class="{ 'txt-dis': countdown > 0 }"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </text>
            </view>
          </view>
          <text
            v-if="error"
            class="err-center"
          >
            {{ error }}
          </text>
          <view
            class="next-btn"
            :class="{ 'next-on': verifyCode.length === 6 }"
            @click="handleVerifyCode"
          >
            <text
              class="next-txt"
              :class="{ 'next-txt-on': verifyCode.length === 6 }"
            >
              下一步
            </text>
          </view>
        </view>
      </view>

      <!-- 设置密码 -->
      <view
        v-if="step === 'set'"
        class="block"
      >
        <view class="head">
          <view class="head-ic head-ic-accent">
            <app-icon
              name="shield"
              :size="40"
              color="#c41e3a"
            />
          </view>
          <text class="head-title">
            设置支付密码
          </text>
          <text class="head-sub">
            请输入6位数字密码
          </text>
        </view>
        <view class="card card-pad">
          <view
            class="dots"
            @click="focusHidden('set')"
          >
            <view
              v-for="i in 6"
              :key="i"
              class="dot-box"
              :class="{ 'dot-box-on': password.length >= i }"
            >
              <view
                v-if="password.length >= i"
                class="dot-fill"
              />
            </view>
          </view>
          <input
            ref="setInput"
            class="hidden-input"
            type="number"
            maxlength="6"
            :value="password"
            @input="onSetInput"
          >
          <text class="hint">
            支付密码用于支付验证，请勿使用生日或简单数字
          </text>
        </view>
      </view>

      <!-- 确认密码 -->
      <view
        v-if="step === 'confirm'"
        class="block"
      >
        <view class="head">
          <view class="head-ic head-ic-accent">
            <app-icon
              name="shield"
              :size="40"
              color="#c41e3a"
            />
          </view>
          <text class="head-title">
            确认支付密码
          </text>
          <text class="head-sub">
            请再次输入密码确认
          </text>
        </view>
        <view class="card card-pad">
          <view
            class="dots"
            @click="focusHidden('confirm')"
          >
            <view
              v-for="i in 6"
              :key="i"
              class="dot-box"
              :class="{ 'dot-box-on': confirmPwd.length >= i }"
            >
              <view
                v-if="confirmPwd.length >= i"
                class="dot-fill"
              />
            </view>
          </view>
          <input
            ref="confirmInput"
            class="hidden-input"
            type="number"
            maxlength="6"
            :value="confirmPwd"
            @input="onConfirmInput"
          >
          <text
            v-if="error"
            class="err-center"
          >
            {{ error }}
          </text>
          <view
            class="confirm-btn"
            :class="{ 'confirm-on': confirmPwd.length === 6 && !isLoading }"
            @click="handleConfirmPassword"
          >
            <app-icon
              v-if="isLoading"
              name="loader-2"
              :size="28"
              color="#fff"
              class="spin"
            />
            <text class="confirm-txt">
              {{ isLoading ? '设置中...' : '确认设置' }}
            </text>
          </view>
          <view
            class="back-step"
            @click="backToSet"
          >
            <text class="back-step-txt">
              返回上一步
            </text>
          </view>
        </view>
      </view>

      <!-- 成功 -->
      <view
        v-if="step === 'success'"
        class="success"
      >
        <view class="success-ic">
          <app-icon
            name="check"
            :size="56"
            color="#2ecc71"
          />
        </view>
        <text class="success-title">
          支付密码设置成功
        </text>
        <text class="success-sub">
          您可以使用支付密码进行安全支付
        </text>
        <view
          class="back-settings"
          @click="go('/settings')"
        >
          <text class="back-settings-txt">
            返回设置
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import AppNavBar from '@/components/common/app-nav-bar.vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

type Step = 'verify' | 'set' | 'confirm' | 'success'
const step = ref<Step>('verify')
const isModifying = ref(true)
const phone = '138****8888'
const verifyCode = ref('')
const countdown = ref(0)
const password = ref('')
const confirmPwd = ref('')
const error = ref('')
const isLoading = ref(false)

const setInput = ref<any>(null)
const confirmInput = ref<any>(null)

let timer: any = null
function handleSendCode() {
  if (countdown.value > 0) return
  countdown.value = 60
  timer = setInterval(() => {
    if (countdown.value > 0) countdown.value--
    else clearInterval(timer)
  }, 1000)
}

function handleVerifyCode() {
  if (verifyCode.value.length !== 6) { error.value = '请输入6位验证码'; return }
  if (verifyCode.value !== '123456') { error.value = '验证码错误'; return }
  error.value = ''
  step.value = 'set'
}

function onSetInput(e: any) {
  const v = String(e.detail.value).replace(/\D/g, '').slice(0, 6)
  password.value = v
  error.value = ''
  if (v.length === 6) setTimeout(() => { step.value = 'confirm' }, 150)
}
function onConfirmInput(e: any) {
  confirmPwd.value = String(e.detail.value).replace(/\D/g, '').slice(0, 6)
  error.value = ''
}

function handleConfirmPassword() {
  if (confirmPwd.value.length !== 6) { error.value = '请输入完整的6位密码'; return }
  if (password.value !== confirmPwd.value) {
    error.value = '两次输入的密码不一致'
    confirmPwd.value = ''
    return
  }
  isLoading.value = true
  setTimeout(() => { isLoading.value = false; step.value = 'success' }, 1200)
}

function backToSet() {
  step.value = 'set'
  password.value = ''
  confirmPwd.value = ''
  error.value = ''
}

function focusHidden(which: 'set' | 'confirm') {
  const el = which === 'set' ? setInput.value : confirmInput.value
  el && el.$el && (el.$el.querySelector('input')?.focus())
}

watch(step, (v) => {
  nextTick(() => {
    if (v === 'set') focusHidden('set')
    else if (v === 'confirm') focusHidden('confirm')
  })
})

function go(path: string) { navigateTo(path) }
</script>

<style scoped>
.page { min-height: 100vh; background: #faf8f5; }
.container { padding: 32rpx; }
.block { display: flex; flex-direction: column; gap: 48rpx; }
.head { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0 0; }
.head-ic { width: 128rpx; height: 128rpx; border-radius: 50%; background: rgba(196,30,46,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 32rpx; }
.head-title { font-size: 34rpx; font-weight: 600; color: #2c2c2c; }
.head-sub { font-size: 26rpx; color: #999; margin-top: 8rpx; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; box-shadow: 0 2rpx 16rpx rgba(0,0,0,0.03); }
.card-pad { padding: 48rpx 32rpx; }
.send-to { text-align: center; margin-bottom: 32rpx; }
.send-to-label { font-size: 26rpx; color: #999; }
.send-to-phone { font-size: 26rpx; color: #2c2c2c; font-weight: 500; margin-left: 12rpx; }
.code-row { display: flex; gap: 20rpx; margin-bottom: 32rpx; }
.code-input { flex: 1; height: 88rpx; padding: 0 28rpx; background: #f5f1ea; border-radius: 18rpx; font-size: 28rpx; color: #2c2c2c; }
.ph { color: #bbb; }
.code-btn { padding: 0 28rpx; height: 88rpx; border-radius: 18rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.code-btn.btn-dis { background: #f0ece5; }
.code-btn-txt { font-size: 26rpx; color: #fff; font-weight: 500; white-space: nowrap; }
.code-btn-txt.txt-dis { color: #bbb; }
.err-center { font-size: 26rpx; color: #e74c3c; text-align: center; display: block; margin-bottom: 24rpx; }
.next-btn { width: 100%; height: 88rpx; border-radius: 18rpx; background: #f0ece5; display: flex; align-items: center; justify-content: center; }
.next-on { background: #c41e3a; }
.next-txt { font-size: 30rpx; font-weight: 500; color: #bbb; }
.next-txt-on { color: #fff; }
.dots { display: flex; justify-content: center; gap: 24rpx; }
.dot-box { width: 84rpx; height: 96rpx; background: #f5f1ea; border-radius: 18rpx; border: 3rpx solid transparent; display: flex; align-items: center; justify-content: center; }
.dot-box-on { border-color: #c41e3a; }
.dot-fill { width: 28rpx; height: 28rpx; border-radius: 50%; background: #2c2c2c; }
.hidden-input { position: absolute; opacity: 0; width: 1rpx; height: 1rpx; pointer-events: none; }
.hint { font-size: 22rpx; color: #999; text-align: center; display: block; margin-top: 32rpx; }
.confirm-btn { width: 100%; height: 88rpx; border-radius: 18rpx; background: #f0ece5; display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 48rpx; }
.confirm-on { background: #c41e3a; }
.confirm-txt { font-size: 30rpx; font-weight: 500; color: #fff; }
.back-step { margin-top: 24rpx; display: flex; justify-content: center; }
.back-step-txt { font-size: 26rpx; color: #999; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.success { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 128rpx; }
.success-ic { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(46,204,113,0.18); display: flex; align-items: center; justify-content: center; margin-bottom: 48rpx; }
.success-title { font-size: 38rpx; font-weight: 600; color: #2c2c2c; margin-bottom: 16rpx; }
.success-sub { font-size: 26rpx; color: #999; margin-bottom: 64rpx; }
.back-settings { padding: 0 64rpx; height: 88rpx; border-radius: 18rpx; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.back-settings-txt { font-size: 28rpx; font-weight: 500; color: #fff; }
</style>
