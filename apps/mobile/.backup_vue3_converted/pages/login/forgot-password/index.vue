<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-accent/10">
      <view class="flex items-center h-14 px-4">
        <view class="p-1 -ml-1" @click="handleBack">
          <text class="text-xl text-foreground">←</text>
        </view>
        <text class="flex-1 text-center text-lg font-medium text-foreground pr-7">忘记密码</text>
      </view>
    </view>

    <!-- 步骤指示器 -->
    <view class="px-6 pt-6 pb-4">
      <view class="flex items-center justify-center gap-2">
        <view v-for="s in [1, 2, 3]" :key="s" class="flex items-center">
          <view :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', step >= s ? 'bg-primary text-white' : 'bg-[#E8E0D5] text-muted-foreground']">
            <text v-if="step > s">✓</text>
            <text v-else>{{ s }}</text>
          </view>
          <view v-if="s < 3" :class="['w-12 h-0.5 mx-1', step > s ? 'bg-primary' : 'bg-[#E8E0D5]']" />
        </view>
      </view>
      <view class="flex justify-between text-xs text-ink-soft mt-2 px-2">
        <text :class="step >= 1 ? 'text-primary' : ''">验证手机</text>
        <text :class="step >= 2 ? 'text-primary' : ''">输入验证码</text>
        <text :class="step >= 3 ? 'text-primary' : ''">设置密码</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="flex-1 px-6 py-4">
      <!-- 步骤1: 输入手机号 -->
      <view v-if="step === 1" class="space-y-6">
        <view class="text-center mb-8">
          <view class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <text class="text-2xl text-primary"></text>
          </view>
          <text class="text-xl font-medium text-foreground block mb-2">验证手机号</text>
          <text class="text-sm text-ink-soft">请输入注册时使用的手机号</text>
        </view>

        <view class="space-y-4">
          <view class="relative">
            <input type="number" v-model="phone" @input="onPhoneInput" placeholder="请输入手机号" maxlength="11" class="w-full h-12 px-4 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground" />
          </view>

          <text v-if="phone && !isValidPhone" class="text-xs text-primary">请输入正确的手机号格式</text>

          <view :class="['w-full h-12 rounded-xl text-base font-medium flex items-center justify-center', (!isValidPhone || sendingCode) ? 'bg-[#E8E0D5] text-muted-foreground' : 'bg-primary text-white']" @click="handleSendCode">
            <text>{{ sendingCode ? '发送中...' : '获取验证码' }}</text>
          </view>
        </view>
      </view>

      <!-- 步骤2: 输入验证码 -->
      <view v-if="step === 2" class="space-y-6">
        <view class="text-center mb-8">
          <view class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <text class="text-2xl text-primary">🛡️</text>
          </view>
          <text class="text-xl font-medium text-foreground block mb-2">输入验证码</text>
          <text class="text-sm text-ink-soft">验证码已发送至 {{ maskedPhone }}</text>
        </view>

        <view class="space-y-4">
          <view class="relative">
            <input type="text" v-model="code" @input="onCodeInput" placeholder="请输入6位验证码" maxlength="6" class="w-full h-12 px-4 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground text-center tracking-widest" />
            <text :class="['absolute right-2 top-1/2 -translate-y-1/2 text-sm', countdown > 0 || sendingCode ? 'text-muted-foreground' : 'text-primary']" @click="handleSendCode">
              {{ countdown > 0 ? `${countdown}s` : sendingCode ? '发送中' : '重新发送' }}
            </text>
          </view>

          <view :class="['w-full h-12 rounded-xl text-base font-medium flex items-center justify-center', code.length !== 6 ? 'bg-[#E8E0D5] text-muted-foreground' : 'bg-primary text-white']" @click="handleVerifyCode">下一步</view>
        </view>
      </view>

      <!-- 步骤3: 设置新密码 -->
      <view v-if="step === 3" class="space-y-6">
        <view class="text-center mb-8">
          <view class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <text class="text-2xl text-primary"></text>
          </view>
          <text class="text-xl font-medium text-foreground block mb-2">设置新密码</text>
          <text class="text-sm text-ink-soft">请设置一个安全的新密码</text>
        </view>

        <view class="space-y-4">
          <!-- 新密码 -->
          <view class="relative">
            <input :type="showPassword ? 'text' : 'password'" v-model="newPassword" placeholder="请输入新密码" class="w-full h-12 px-4 pr-12 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground" />
            <text class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" @click="showPassword = !showPassword">{{ showPassword ? '️' : '️‍🗨️' }}</text>
          </view>

          <!-- 密码强度指示器 -->
          <view v-if="newPassword" class="space-y-2">
            <view class="flex gap-1">
              <view v-for="level in 3" :key="level" :class="['h-1 flex-1 rounded-full', passwordStrength.score >= level + 1 ? (passwordStrength.strength === 'strong' ? 'bg-green-500' : passwordStrength.strength === 'medium' ? 'bg-yellow-500' : 'bg-red-500') : 'bg-[#E8E0D5]']" />
            </view>
            <text :class="['text-xs', passwordStrength.strength === 'strong' ? 'text-green-600' : passwordStrength.strength === 'medium' ? 'text-yellow-600' : 'text-red-600']">
              密码强度：{{ passwordStrength.strength === 'strong' ? '强' : passwordStrength.strength === 'medium' ? '中' : '弱' }}
            </text>
            <view class="space-y-1">
              <view v-for="(check, index) in passwordStrength.checks" :key="index" class="flex items-center gap-2 text-xs">
                <text :class="check.passed ? 'text-green-500' : 'text-muted-foreground'">{{ check.passed ? '✓' : '✕' }}</text>
                <text :class="check.passed ? 'text-green-600' : 'text-muted-foreground'">{{ check.label }}</text>
              </view>
            </view>
          </view>

          <!-- 确认密码 -->
          <view class="relative">
            <input :type="showConfirmPassword ? 'text' : 'password'" v-model="confirmPassword" placeholder="请确认新密码" class="w-full h-12 px-4 pr-12 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground" />
            <text class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" @click="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? '️' : '️‍🗨️' }}</text>
          </view>

          <text v-if="confirmPassword && !passwordsMatch" class="text-xs text-primary">两次输入的密码不一致</text>

          <view :class="['w-full h-12 rounded-xl text-base font-medium flex items-center justify-center', (!canSubmitPassword || loading) ? 'bg-[#E8E0D5] text-muted-foreground' : 'bg-primary text-white']" @click="handleSubmit">
            <text>{{ loading ? '提交中...' : '确认重置' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="px-6 py-4 text-center">
      <text class="text-sm text-primary" @click="goLogin">返回登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const step = ref(1)
const phone = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const countdown = ref(0)
const loading = ref(false)
const sendingCode = ref(false)

let countdownTimer: ReturnType<typeof setInterval> | null = null

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

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

const isValidPhone = computed(() => /^1[3-9]\d{9}$/.test(phone.value))
const maskedPhone = computed(() => phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))
const passwordsMatch = computed(() => newPassword.value && confirmPassword.value && newPassword.value === confirmPassword.value)

const passwordStrength = computed(() => {
  const checks = [
    { label: '至少8位字符', passed: newPassword.value.length >= 8 },
    { label: '包含数字', passed: /\d/.test(newPassword.value) },
    { label: '包含小写字母', passed: /[a-z]/.test(newPassword.value) },
    { label: '包含大写字母', passed: /[A-Z]/.test(newPassword.value) },
    { label: '包含特殊字符', passed: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword.value) },
  ]
  const score = checks.filter(c => c.passed).length
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (score >= 4) strength = 'strong'
  else if (score >= 3) strength = 'medium'
  return { strength, score, checks }
})

const canSubmitPassword = computed(() => passwordStrength.value.score >= 3 && passwordsMatch.value)

function onPhoneInput(e: any) {
  phone.value = e.target.value.replace(/\D/g, '').slice(0, 11)
}

function onCodeInput(e: any) {
  code.value = e.target.value.replace(/\D/g, '').slice(0, 6)
}

function handleSendCode() {
  if (!isValidPhone.value || sendingCode.value || countdown.value > 0) return
  sendingCode.value = true
  setTimeout(() => {
    sendingCode.value = false
    countdown.value = 60
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    if (step.value === 1) step.value = 2
  }, 1000)
}

function handleVerifyCode() {
  if (code.value.length !== 6) {
    uni.showToast({ title: '请输入6位验证码', icon: 'none' })
    return
  }
  step.value = 3
}

function handleSubmit() {
  if (!canSubmitPassword.value) return
  loading.value = true
  setTimeout(() => {
    loading.value = false
    uni.showToast({ title: '密码重置成功', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/login/index' }), 1000)
  }, 1000)
}

function handleBack() {
  if (step.value > 1) step.value--
  else uni.navigateBack()
}

function goLogin() { uni.redirectTo({ url: '/pages/login/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
