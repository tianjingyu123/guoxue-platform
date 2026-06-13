<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- Header -->
    <view class="flex items-center h-14 px-4 border-b border-border bg-white">
      <view @click="goBack" class="p-1 -ml-1 text-foreground">
        <text class="text-foreground text-lg">&#8592;</text>
      </view>
      <text class="flex-1 text-center font-semibold text-foreground">{{ mode === 'set' ? '设置支付密码' : '修改支付密码' }}</text>
    </view>

    <view class="flex-1 px-6 pt-10 pb-8 flex flex-col">
      <!-- Done State -->
      <view v-if="step === 'done'" class="flex-1 flex flex-col items-center justify-center text-center">
        <view class="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <text class="text-green-500 text-4xl">✔</text>
        </view>
        <text class="text-xl font-bold text-foreground mb-2">{{ mode === 'set' ? '支付密码设置成功' : '支付密码修改成功' }}</text>
        <text class="text-sm text-muted-foreground mb-8">您的支付密码已{{ mode === 'set' ? '设置' : '更新' }}，下次支付时将使用新密码验证</text>
        <view @click="goBack" class="w-full max-w-xs h-12 rounded-xl bg-primary text-white font-semibold flex items-center justify-center">
          <text>完成</text>
        </view>
      </view>

      <!-- Steps -->
      <template v-else>
        <!-- 步骤进度 -->
        <view v-if="mode === 'change'" class="flex items-center justify-center gap-2 mb-8">
          <view v-for="(s, idx) in stepList" :key="s" class="flex items-center gap-2">
            <view :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', getStepStyle(s)]">
              <text>{{ idx + 1 }}</text>
            </view>
            <view v-if="idx < 2" :class="['w-8 h-0.5', idx < currentStepIndex ? 'bg-primary' : 'bg-muted']" />
          </view>
        </view>

        <!-- Title -->
        <view class="text-center mb-8">
          <view class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <text class="text-primary text-2xl">🛡️</text>
          </view>
          <text class="text-lg font-semibold text-foreground block">{{ stepTitles[step] }}</text>
          <text class="text-sm text-muted-foreground mt-1 block">{{ stepSubtitles[step] }}</text>
        </view>

        <!-- Verify Phone -->
        <view v-if="step === 'verify_phone'" class="space-y-4">
          <view>
            <text class="text-sm font-medium text-foreground block mb-2">手机号</text>
            <view class="flex gap-2">
              <input type="text" v-model="phone" placeholder="请输入手机号" maxlength="11" class="flex-1 h-12 px-4 rounded-xl border border-border bg-white text-foreground text-sm" />
              <view @click="handleSendCode" :class="['h-12 px-4 rounded-xl bg-primary text-white text-sm font-medium flex items-center whitespace-nowrap', countdown > 0 ? 'opacity-50' : '']">
                <text>{{ countdown > 0 ? countdown + 's' : '发送验证码' }}</text>
              </view>
            </view>
          </view>
          <view>
            <text class="text-sm font-medium text-foreground block mb-2">验证码</text>
            <input type="text" v-model="smsCode" placeholder="请输入6位验证码" maxlength="6" class="w-full h-12 px-4 rounded-xl border border-border bg-white text-foreground text-sm" />
          </view>
          <text v-if="error" class="text-sm text-danger text-center block">{{ error }}</text>
          <view @click="advance" :class="['w-full h-12 rounded-xl bg-primary text-white font-semibold mt-2 flex items-center justify-center', loading ? 'opacity-50' : '']">
            <text>{{ loading ? '验证中...' : '下一步' }}</text>
          </view>
        </view>

        <!-- PIN Grid -->
        <view v-else :class="['space-y-2', shake ? 'animation-shake' : '']">
          <view class="flex justify-center gap-3" @click="focusPinInput">
            <view v-for="(_, i) in 6" :key="i" :class="['w-12 h-14 rounded-xl border-2 flex items-center justify-center', error ? 'border-danger' : 'border-border']">
              <text v-if="currentPin.length > i" class="w-3 h-3 rounded-full bg-foreground block" />
              <view v-else-if="currentPin.length === i" class="w-0.5 h-6 bg-primary" style="animation: blink 1s step-end infinite" />
            </view>
          </view>
          <!-- Hidden input for PIN capture -->
          <input
            ref="pinInputRef"
            type="text"
            inputmode="numeric"
            maxlength="6"
            :value="currentPin"
            @input="onPinInput"
            class="absolute opacity-0"
            style="width:0;height:0"
            :disabled="loading"
          />
          <text v-if="error" class="text-sm text-danger text-center pt-1 block">{{ error }}</text>
          <text v-if="loading" class="text-sm text-muted-foreground text-center pt-1 block">验证中...</text>
        </view>

        <!-- Forget Password -->
        <view v-if="step === 'enter_old'" @click="handleForget" class="text-primary text-sm text-center mt-6">
          <text>忘记支付密码？</text>
        </view>

        <!-- Tip -->
        <view class="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-100">
          <text class="text-xs text-amber-700 leading-5 block">
            支付密码为6位数字，用于支付订单、转账等敏感操作。请勿设置与登录密码相同的数字组合，避免使用生日、连续数字等。
          </text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

type Step = 'enter_old' | 'enter_new' | 'confirm_new' | 'verify_phone' | 'done'

const hasPaymentPwd = ref(true)
const mode = computed(() => hasPaymentPwd.value ? 'change' : 'set')
const step = ref<Step>(hasPaymentPwd.value ? 'enter_old' : 'enter_new')
const oldPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
const loading = ref(false)
const error = ref('')
const shake = ref(false)
const pinInputRef = ref<any>(null)

const currentPin = computed(() => {
  if (step.value === 'enter_old') return oldPin.value
  if (step.value === 'enter_new') return newPin.value
  if (step.value === 'confirm_new') return confirmPin.value
  return ''
})

const stepList = ['enter_old', 'enter_new', 'confirm_new']
const currentStepIndex = computed(() => stepList.indexOf(step.value))

const stepTitles: Record<Step, string> = {
  enter_old: '验证当前支付密码',
  enter_new: '设置新支付密码',
  confirm_new: '再次确认新密码',
  verify_phone: '验证手机号',
  done: '设置成功',
}

const stepSubtitles: Record<Step, string> = {
  enter_old: '请输入当前6位支付密码',
  enter_new: mode.value === 'set' ? '请设置6位数字支付密码' : '请输入新的6位支付密码',
  confirm_new: '请再次输入新支付密码',
  verify_phone: '通过手机验证码重置支付密码',
  done: mode.value === 'set' ? '支付密码设置成功' : '支付密码修改成功',
}

function getStepStyle(s: string): string {
  const idx = stepList.indexOf(s)
  if (step.value === s) return 'bg-primary text-white'
  if (currentStepIndex.value > idx) return 'bg-primary/20 text-primary'
  return 'bg-muted text-muted-foreground'
}

function focusPinInput() {
  pinInputRef.value?.focus()
}

function onPinInput(e: any) {
  error.value = ''
  const raw = (e.detail?.value || e.target?.value || '') as string
  const pin = raw.replace(/\D/g, '').slice(0, 6)
  if (step.value === 'enter_old') oldPin.value = pin
  else if (step.value === 'enter_new') newPin.value = pin
  else if (step.value === 'confirm_new') confirmPin.value = pin

  if (pin.length === 6) {
    advance()
  }
}

function triggerError(msg: string) {
  error.value = msg
  shake.value = true
  setTimeout(() => { shake.value = false }, 600)
}

function handleSendCode() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    error.value = '请输入正确的手机号'
    return
  }
  countdown.value = 60
  const t = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(t)
  }, 1000)
  error.value = ''
}

function handleForget() {
  step.value = 'verify_phone'
  oldPin.value = ''
  error.value = ''
}

async function advance() {
  error.value = ''
  loading.value = true
  await new Promise(r => setTimeout(r, 600))
  loading.value = false

  if (step.value === 'enter_old') {
    if (oldPin.value.length < 6) { triggerError('请输入完整的6位密码'); return }
    if (oldPin.value !== '123456') { oldPin.value = ''; triggerError('密码错误，请重试'); return }
    step.value = 'enter_new'
  } else if (step.value === 'enter_new') {
    if (newPin.value.length < 6) { triggerError('请输入完整的6位新密码'); return }
    step.value = 'confirm_new'
  } else if (step.value === 'confirm_new') {
    if (confirmPin.value.length < 6) { triggerError('请输入完整的确认密码'); return }
    if (confirmPin.value !== newPin.value) { confirmPin.value = ''; triggerError('两次密码不一致，请重新输入'); return }
    step.value = 'done'
  } else if (step.value === 'verify_phone') {
    if (smsCode.value.length < 6) { triggerError('请输入6位验证码'); return }
    step.value = 'enter_new'
  }
  nextTick(() => { focusPinInput() })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.animation-shake {
  animation: shake 0.5s ease-in-out;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 50%, 90% { transform: translateX(-6px); }
  30%, 70% { transform: translateX(6px); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
