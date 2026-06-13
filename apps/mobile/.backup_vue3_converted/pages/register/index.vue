<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border" style="backdrop-filter:blur(12px);padding-top:env(safe-area-inset-top)">
      <view class="flex items-center gap-3 px-4 h-14">
        <view class="p-2 -ml-2 rounded-full" @click="handleBack">
          <text class="text-xl text-foreground">&#8592;</text>
        </view>
        <text class="font-semibold text-lg text-foreground">注册账号</text>
      </view>
    </view>

    <!-- 进度指示器 -->
    <view class="px-6 py-4">
      <view class="flex items-center justify-between">
        <view v-for="(s, index) in steps" :key="s" class="flex items-center">
          <view :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', step === s ? 'bg-primary text-white' : stepIndex(s) < currentStepIndex ? 'bg-green-500 text-white' : 'bg-[#F2EFEA] text-muted-foreground']">
            <text v-if="stepIndex(s) < currentStepIndex">&#10003;</text>
            <text v-else>{{ stepIndex(s) + 1 }}</text>
          </view>
          <view v-if="index < steps.length - 1" :class="['w-16 h-0.5 mx-2', stepIndex(s) < currentStepIndex ? 'bg-green-500' : 'bg-[#E8E0D5]']" />
        </view>
      </view>
      <view class="flex justify-between mt-2 text-xs text-muted-foreground">
        <text>输入手机号</text>
        <text>验证身份</text>
        <text>设置密码</text>
      </view>
    </view>

    <!-- 表单内容 -->
    <view class="flex-1 px-6 py-4">
      <!-- 步骤1: 输入手机号 -->
      <view v-if="step === 'phone'" class="space-y-6">
        <view>
          <text class="text-xl font-bold text-foreground block mb-2">输入手机号</text>
          <text class="text-sm text-muted-foreground">我们将发送验证码到您的手机</text>
        </view>

        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128241;</text>
          <input type="number" v-model="phone" @input="onPhoneInput" placeholder="请输入手机号" maxlength="11" class="w-full h-12 pl-10 rounded-xl bg-white border border-border text-sm text-foreground placeholder:text-muted-foreground" />
        </view>

        <view @click="sendCode" :class="['w-full h-12 rounded-xl bg-primary text-white text-base font-medium flex items-center justify-center', phone.length !== 11 ? 'opacity-50' : '']">
          <text>获取验证码</text>
        </view>
      </view>

      <!-- 步骤2: 输入验证码 -->
      <view v-if="step === 'verify'" class="space-y-6">
        <view>
          <text class="text-xl font-bold text-foreground block mb-2">输入验证码</text>
          <text class="text-sm text-muted-foreground">验证码已发送至 {{ maskedPhone }}</text>
        </view>

        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128737;&#65039;</text>
          <input type="text" v-model="code" @input="onCodeInput" placeholder="请输入6位验证码" maxlength="6" class="w-full h-12 pl-10 rounded-xl bg-white border border-border text-sm text-foreground placeholder:text-muted-foreground text-center tracking-[0.5em]" />
        </view>

        <view class="flex items-center justify-between text-sm">
          <text class="text-muted-foreground">{{ countdown > 0 ? `${countdown}秒后可重发` : '没有收到验证码？' }}</text>
          <text :class="['font-medium', countdown > 0 ? 'text-muted-foreground' : 'text-primary']" @click="sendCode">重新发送</text>
        </view>

        <view @click="verifyCode" :class="['w-full h-12 rounded-xl bg-primary text-white text-base font-medium flex items-center justify-center', code.length !== 6 ? 'opacity-50' : '']">
          <text>下一步</text>
        </view>
      </view>

      <!-- 步骤3: 设置密码 -->
      <view v-if="step === 'password'" class="space-y-6">
        <view>
          <text class="text-xl font-bold text-foreground block mb-2">完善信息</text>
          <text class="text-sm text-muted-foreground">设置您的昵称和登录密码</text>
        </view>

        <!-- 昵称 -->
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128100;</text>
          <input type="text" v-model="nickname" placeholder="请输入昵称" maxlength="20" class="w-full h-12 pl-10 rounded-xl bg-white border border-border text-sm text-foreground placeholder:text-muted-foreground" />
        </view>

        <!-- 密码 -->
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128274;</text>
          <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="请设置密码（6-20位）" class="w-full h-12 pl-10 pr-10 rounded-xl bg-white border border-border text-sm text-foreground placeholder:text-muted-foreground" />
          <text class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" @click="showPassword = !showPassword">{{ showPassword ? '&#128065;' : '&#128065;&#65039;' }}</text>
        </view>

        <!-- 确认密码 -->
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#128274;</text>
          <input :type="showConfirmPassword ? 'text' : 'password'" v-model="confirmPassword" placeholder="请再次输入密码" class="w-full h-12 pl-10 pr-10 rounded-xl bg-white border border-border text-sm text-foreground placeholder:text-muted-foreground" />
          <text class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" @click="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? '&#128065;' : '&#128065;&#65039;' }}</text>
        </view>

        <!-- 密码不一致提示 -->
        <text v-if="confirmPassword && password !== confirmPassword" class="text-sm text-primary block">两次输入的密码不一致</text>

        <!-- 协议勾选 -->
        <view class="flex items-start gap-2">
          <view :class="['w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5', agreed ? 'bg-primary border-primary' : 'border-[#999]']" @click="agreed = !agreed">
            <text v-if="agreed" class="text-white text-xs">&#10003;</text>
          </view>
          <text class="text-sm text-muted-foreground leading-relaxed">
            我已阅读并同意
            <text class="text-primary" @click="goToAgreement">&#12298;用户协议&#12299;</text>
            和
            <text class="text-primary" @click="goToPrivacy">&#12298;隐私政策&#12299;</text>
          </text>
        </view>

        <view @click="handleRegister" :class="['w-full h-12 rounded-xl text-base font-medium flex items-center justify-center', (!password || password.length < 6 || password !== confirmPassword || !nickname || !agreed || isLoading) ? 'bg-[#E8E0D5] text-muted-foreground' : 'bg-primary text-white']">
          <text>{{ isLoading ? '注册中...' : '完成注册' }}</text>
        </view>
      </view>

      <!-- 底部链接 -->
      <view class="mt-8 text-center">
        <text class="text-sm text-muted-foreground">
          已有账号？
          <text class="text-primary font-medium ml-1" @click="goLogin">立即登录</text>
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const step = ref<'phone' | 'verify' | 'password'>('phone')
const steps = ['phone', 'verify', 'password']
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const nickname = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreed = ref(false)
const countdown = ref(0)
const isLoading = ref(false)

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

const currentStepIndex = computed(() => steps.indexOf(step.value))
const maskedPhone = computed(() => phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))

function stepIndex(s: string) { return steps.indexOf(s) }

function onPhoneInput(e: any) {
  phone.value = e.target.value.replace(/\D/g, '').slice(0, 11)
}

function onCodeInput(e: any) {
  code.value = e.target.value.replace(/\D/g, '').slice(0, 6)
}

function sendCode() {
  if (countdown.value > 0 || phone.value.length !== 11) return
  countdown.value = 60
  step.value = 'verify'
  uni.showToast({ title: '验证码已发送', icon: 'success' })
}

function verifyCode() {
  if (code.value.length !== 6) return
  step.value = 'password'
}

function handleRegister() {
  if (!password.value || password.value !== confirmPassword.value || !nickname.value || !agreed.value) return
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/login/index' }), 1000)
  }, 1500)
}

function handleBack() {
  if (step.value === 'phone') uni.navigateBack()
  else if (step.value === 'verify') step.value = 'phone'
  else step.value = 'verify'
}

function goLogin() { uni.redirectTo({ url: '/pages/login/index' }) }
function goToAgreement() { uni.navigateTo({ url: '/pages/policy/user-agreement/index' }) }
function goToPrivacy() { uni.navigateTo({ url: '/pages/policy/privacy-policy/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
