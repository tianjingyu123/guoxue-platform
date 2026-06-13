<template>
  <view class="min-h-screen bg-background">
    <!-- 成功页面 -->
    <view v-if="step === 'success'" class="flex flex-col min-h-screen bg-background">
      <view class="sticky top-0 z-40 bg-white/95 border-b border-border">
        <view class="flex items-center h-12 px-4">
          <view class="p-1 -ml-1" @click="goSettings">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="flex-1 text-center font-semibold text-base text-foreground pr-9">{{ isModifying ? '修改支付密码' : '设置支付密码' }}</text>
        </view>
      </view>

      <view class="flex-1 flex flex-col items-center justify-center px-6">
        <view class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <text class="text-4xl text-green-500">✓</text>
        </view>
        <text class="text-xl font-semibold text-foreground block mb-2">支付密码{{ isModifying ? '修改' : '设置' }}成功</text>
        <text class="text-sm text-muted-foreground text-center block mb-8">您可以使用支付密码进行安全支付</text>
        <view class="w-full max-w-xs py-3 bg-primary text-white text-sm font-medium rounded-xl text-center" @click="goSettings">
          <text>返回设置</text>
        </view>
      </view>
    </view>

    <!-- 主流程 -->
    <view v-else class="min-h-screen bg-background">
      <view class="sticky top-0 z-40 bg-white/95 border-b border-border">
        <view class="flex items-center h-12 px-4">
          <view class="p-1 -ml-1" @click="step === 'verify' ? goBack() : null">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="flex-1 text-center font-semibold text-base text-foreground pr-9">{{ isModifying ? '修改支付密码' : '设置支付密码' }}</text>
        </view>
      </view>

      <view class="p-4">
        <!-- 步骤 1：验证身份 -->
        <view v-if="step === 'verify'" class="space-y-6">
          <view class="text-center py-6">
            <view class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <text class="text-3xl text-primary">🛡️</text>
            </view>
            <text class="text-lg font-semibold text-foreground block">验证身份</text>
            <text class="text-sm text-muted-foreground block mt-1">为保障账号安全，请验证您的手机号</text>
          </view>

          <view class="bg-white rounded-xl p-4">
            <view class="text-center mb-4">
              <text class="text-sm text-muted-foreground">验证码将发送至</text>
              <text class="text-foreground font-medium ml-2">{{ phone }}</text>
            </view>

            <view class="flex gap-3 mb-4">
              <input
                type="text" maxlength="6" v-model="verifyCode"
                @input="onVerifyCodeInput"
                placeholder="请输入验证码"
                :class="['flex-1 h-12 px-4 rounded-xl bg-[#F2EFEA] text-foreground placeholder:text-muted-foreground outline-none border-2', codeError ? 'border-red-500' : 'border-transparent']"
              />
              <view
                :class="['px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap flex items-center', countdown > 0 ? 'bg-[#F2EFEA] text-muted-foreground' : 'bg-primary/10 text-primary']"
                @click="sendCode"
              >
                <text>{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
              </view>
            </view>

            <text v-if="codeError" class="text-xs text-red-500 text-center block mb-4">{{ codeError }}</text>

            <view
              :class="['w-full h-12 rounded-xl font-medium flex items-center justify-center', verifyCode.length === 6 ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground']"
              @click="verifyCurrentCode"
            >
              <text>下一步</text>
            </view>
          </view>
        </view>

        <!-- 步骤 2：设置密码 -->
        <view v-if="step === 'set'" class="space-y-6">
          <view class="text-center py-6">
            <view class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <text class="text-3xl text-primary">🛡️</text>
            </view>
            <text class="text-lg font-semibold text-foreground block">设置支付密码</text>
            <text class="text-sm text-muted-foreground block mt-1">请输入6位数字密码</text>
          </view>

          <view class="bg-white rounded-xl p-6">
            <view class="flex justify-center gap-3">
              <view
                v-for="(v, i) in 6" :key="i"
                :class="['w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold', passwordArr[i] ? 'border-primary bg-white' : 'border-transparent bg-[#F2EFEA]']"
                @click="focusHiddenInput('set')"
              >
                <text :class="passwordArr[i] ? 'text-foreground' : ''">{{ passwordArr[i] ? '●' : '' }}</text>
              </view>
            </view>
            <text class="text-xs text-muted-foreground text-center block mt-4">支付密码用于支付验证，请勿使用生日或简单数字</text>
          </view>

          <input
            ref="setInputRef"
            :focus="setInputFocus"
            type="number" maxlength="6"
            v-model="passwordStr"
            @input="onSetPasswordInput"
            class="absolute opacity-0"
            style="width:1px;height:1px;overflow:hidden;"
          />
        </view>

        <!-- 步骤 3：确认密码 -->
        <view v-if="step === 'confirm'" class="space-y-6">
          <view class="text-center py-6">
            <view class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <text class="text-3xl text-primary">🛡️</text>
            </view>
            <text class="text-lg font-semibold text-foreground block">确认支付密码</text>
            <text class="text-sm text-muted-foreground block mt-1">请再次输入密码确认</text>
          </view>

          <view class="bg-white rounded-xl p-6">
            <view class="flex justify-center gap-3">
              <view
                v-for="(v, i) in 6" :key="i"
                :class="['w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold', confirmArr[i] ? 'border-primary bg-white' : 'border-transparent bg-[#F2EFEA]']"
                @click="focusHiddenInput('confirm')"
              >
                <text class="text-foreground">{{ confirmArr[i] ? '●' : '' }}</text>
              </view>
            </view>

            <text v-if="confirmError" class="text-xs text-red-500 text-center block mt-4">{{ confirmError }}</text>

            <view
              :class="['w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2 mt-6', confirmStr.length === 6 && !isSubmitting ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground']"
              @click="handleConfirm"
            >
              <text>{{ isSubmitting ? '设置中...' : '确认设置' }}</text>
            </view>

            <view class="w-full mt-2 text-sm text-muted-foreground text-center" @click="backToSet">
              <text>返回上一步</text>
            </view>
          </view>

          <input
            ref="confirmInputRef"
            :focus="confirmInputFocus"
            type="number" maxlength="6"
            v-model="confirmStr"
            @input="onConfirmInput"
            class="absolute opacity-0"
            style="width:1px;height:1px;overflow:hidden;"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { smsApi, userApi } from '@/api'

const step = ref<'verify' | 'set' | 'confirm' | 'success'>('verify')
const isModifying = ref(true)
const phone = ref('138****8888')

// 验证码
const verifyCode = ref('')
const countdown = ref(0)
const codeError = ref('')
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 密码
const passwordStr = ref('')
const passwordArr = ref<string[]>(['', '', '', '', '', ''])
const setInputFocus = ref(false)
const setInputRef = ref<unknown>(null)

// 确认密码
const confirmStr = ref('')
const confirmArr = ref<string[]>(['', '', '', '', '', ''])
const confirmError = ref('')
const confirmInputFocus = ref(false)
const confirmInputRef = ref<unknown>(null)
const isSubmitting = ref(false)

// 验证码倒计时
watch(countdown, (val) => {
  if (val > 0 && !countdownTimer) {
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  }
})

// 密码输入监控 - 填充显示数组
watch(passwordStr, (val) => {
  const cleaned = val.replace(/\D/g, '').slice(0, 6)
  const arr = cleaned.split('')
  while (arr.length < 6) arr.push('')
  passwordArr.value = arr
  if (cleaned.length >= 6 && step.value === 'set') {
    setTimeout(() => { step.value = 'confirm' }, 100)
  }
})

// 确认密码监控
watch(confirmStr, (val) => {
  const cleaned = val.replace(/\D/g, '').slice(0, 6)
  const arr = cleaned.split('')
  while (arr.length < 6) arr.push('')
  confirmArr.value = arr
  if (confirmError.value) confirmError.value = ''
})

// 自动聚焦隐藏输入框
watch(step, async (val) => {
  if (val === 'set') {
    await nextTick()
    setInputFocus.value = false
    await nextTick()
    setInputFocus.value = true
  } else if (val === 'confirm') {
    await nextTick()
    confirmInputFocus.value = false
    await nextTick()
    confirmInputFocus.value = true
  }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function onVerifyCodeInput(e: any) {
  verifyCode.value = e.target.value.replace(/\D/g, '')
  codeError.value = ''
}

function onSetPasswordInput(e: any) {
  passwordStr.value = e.detail ? e.detail.value : e.target.value
}

function onConfirmInput(e: any) {
  confirmStr.value = e.detail ? e.detail.value : e.target.value
}

function focusHiddenInput(type: 'set' | 'confirm') {
  if (type === 'set') {
    setInputFocus.value = false
    nextTick(() => { setInputFocus.value = true })
  } else {
    confirmInputFocus.value = false
    nextTick(() => { confirmInputFocus.value = true })
  }
}

async function sendCode() {
  if (countdown.value > 0) return
  try {
    await smsApi.send(phone.value, 'PAYMENT_PASSWORD')
    countdown.value = 60
  } catch {
    codeError.value = '发送失败，请稍后重试'
  }
}

async function verifyCurrentCode() {
  if (verifyCode.value.length !== 6) return
  try {
    await smsApi.verify(phone.value, verifyCode.value, 'PAYMENT_PASSWORD')
    codeError.value = ''
    step.value = 'set'
  } catch {
    codeError.value = '验证码错误'
  }
}

async function handleConfirm() {
  if (confirmStr.value.replace(/\D/g, '').length !== 6 || isSubmitting.value) return
  if (passwordStr.value.replace(/\D/g, '') !== confirmStr.value.replace(/\D/g, '')) {
    confirmError.value = '两次输入的密码不一致'
    confirmStr.value = ''
    confirmArr.value = ['', '', '', '', '', '']
    return
  }
  isSubmitting.value = true
  try {
    await userApi.setPaymentPassword({ password: passwordStr.value.replace(/\D/g, '') })
    step.value = 'success'
  } catch {
    confirmError.value = '设置失败，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}

function backToSet() {
  step.value = 'set'
  confirmStr.value = ''
  confirmArr.value = ['', '', '', '', '', '']
  confirmError.value = ''
}

function goBack() { uni.navigateBack() }
function goSettings() { uni.navigateTo({ url: '/pages/settings/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
