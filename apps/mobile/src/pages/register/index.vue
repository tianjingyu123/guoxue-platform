<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref<'phone' | 'verify' | 'password'>('phone')
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

const steps = ['phone', 'verify', 'password'] as const
const activeStep = computed(() => steps.indexOf(step.value))

const maskedPhone = computed(() =>
  phone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
)

const canRegister = computed(() =>
  !!password.value &&
  password.value.length >= 6 &&
  password.value === confirmPassword.value &&
  !!nickname.value &&
  agreed.value &&
  !isLoading.value
)

function isStepPassed(index: number) {
  return index < activeStep.value
}

function onPhoneInput(e: any) {
  phone.value = e.detail.value.replace(/\D/g, '').slice(0, 11)
}

function onCodeInput(e: any) {
  code.value = e.detail.value.replace(/\D/g, '').slice(0, 6)
}

function sendCode() {
  if (countdown.value > 0 || phone.value.length !== 11) return
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
  step.value = 'verify'
}

function verifyCode() {
  if (code.value.length !== 6) return
  step.value = 'password'
}

async function handleRegister() {
  if (!canRegister.value) return
  isLoading.value = true
  try {
    await new Promise(r => setTimeout(r, 1500))
    uni.redirectTo({ url: '/pages/login/index?registered=true' })
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  if (step.value === 'phone') uni.navigateBack()
  else if (step.value === 'verify') step.value = 'phone'
  else step.value = 'verify'
}
function goLogin() { uni.navigateTo({ url: '/pages/login/index' }) }
function goTerms() { uni.navigateTo({ url: '/pages/policy/user-agreement' }) }
function goPrivacy() { uni.navigateTo({ url: '/pages/policy/privacy-policy' }) }
</script>

<template>
  <view class="min-h-screen bg-background flex flex-col">

    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background border-b border-border">
      <view class="flex items-center gap-3 px-4 h-14">
        <view @tap="goBack" class="p-2 rounded-full active:bg-secondary">
          <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </view>
        <text class="font-semibold text-lg text-foreground">注册账号</text>
      </view>
    </view>

    <!-- 进度指示器 -->
    <view class="px-6 py-4">
      <view class="flex items-center justify-between">
        <view v-for="(s, index) in steps" :key="s" class="flex items-center">
          <!-- 步骤圆圈 -->
          <view
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              isStepPassed(index) ? 'bg-chart-4' : activeStep === index ? 'bg-primary' : 'bg-secondary'
            ]"
          >
            <svg v-if="isStepPassed(index)" class="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <text v-else :class="activeStep === index ? 'text-primary-foreground' : 'text-muted-foreground'">{{ index + 1 }}</text>
          </view>
          <!-- 连接线 -->
          <view
            v-if="index < 2"
            :class="['w-16 h-0.5 mx-2', isStepPassed(index) ? 'bg-chart-4' : 'bg-border']"
          />
        </view>
      </view>
      <view class="flex justify-between mt-2">
        <text class="text-xs text-muted-foreground">输入手机号</text>
        <text class="text-xs text-muted-foreground">验证身份</text>
        <text class="text-xs text-muted-foreground">设置密码</text>
      </view>
    </view>

    <!-- 表单区域 -->
    <view class="flex-1 px-6 py-4">

      <!-- 步骤1：输入手机号 -->
      <view v-if="step === 'phone'" class="flex flex-col gap-6">
        <view>
          <text class="text-xl font-bold text-foreground block mb-2">输入手机号</text>
          <text class="text-sm text-muted-foreground">我们将发送验证码到您的手机</text>
        </view>

        <view class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <input
            v-model="phone"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            @input="onPhoneInput"
            class="flex-1 text-sm text-foreground bg-transparent h-full"
          />
        </view>

        <view
          @tap="sendCode"
          :class="['h-12 rounded-2xl flex items-center justify-center', phone.length === 11 ? 'bg-primary active:opacity-90' : 'bg-secondary']"
        >
          <text :class="phone.length === 11 ? 'text-primary-foreground font-medium' : 'text-muted-foreground font-medium'">获取验证码</text>
        </view>
      </view>

      <!-- 步骤2：输入验证码 -->
      <view v-if="step === 'verify'" class="flex flex-col gap-6">
        <view>
          <text class="text-xl font-bold text-foreground block mb-2">输入验证码</text>
          <text class="text-sm text-muted-foreground">验证码已发送至 {{ maskedPhone }}</text>
        </view>

        <view class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <input
            v-model="code"
            type="number"
            maxlength="6"
            placeholder="请输入6位验证码"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            @input="onCodeInput"
            class="flex-1 text-sm text-foreground bg-transparent h-full text-center tracking-widest"
          />
        </view>

        <view class="flex items-center justify-between">
          <text class="text-sm text-muted-foreground">{{ countdown > 0 ? `${countdown}秒后可重发` : '没有收到验证码？' }}</text>
          <view @tap="countdown === 0 ? sendCode() : undefined">
            <text :class="['text-sm font-medium', countdown > 0 ? 'text-muted-foreground' : 'text-primary']">重新发送</text>
          </view>
        </view>

        <view
          @tap="verifyCode"
          :class="['h-12 rounded-2xl flex items-center justify-center', code.length === 6 ? 'bg-primary active:opacity-90' : 'bg-secondary']"
        >
          <text :class="code.length === 6 ? 'text-primary-foreground font-medium' : 'text-muted-foreground font-medium'">下一步</text>
        </view>
      </view>

      <!-- 步骤3：完善信息 -->
      <view v-if="step === 'password'" class="flex flex-col gap-4">
        <view class="mb-2">
          <text class="text-xl font-bold text-foreground block mb-2">完善信息</text>
          <text class="text-sm text-muted-foreground">设置您的昵称和登录密码</text>
        </view>

        <!-- 昵称 -->
        <view class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <input
            v-model="nickname"
            type="text"
            maxlength="20"
            placeholder="请输入昵称"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            class="flex-1 text-sm text-foreground bg-transparent h-full"
          />
        </view>

        <!-- 密码 -->
        <view class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <input
            v-model="password"
            :password="!showPassword"
            placeholder="请设置密码（6-20位）"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            class="flex-1 text-sm text-foreground bg-transparent h-full"
          />
          <view @tap="showPassword = !showPassword" class="p-1 shrink-0">
            <svg v-if="showPassword" class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <svg v-else class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </view>
        </view>

        <!-- 确认密码 -->
        <view class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <input
            v-model="confirmPassword"
            :password="!showConfirmPassword"
            placeholder="请再次输入密码"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            class="flex-1 text-sm text-foreground bg-transparent h-full"
          />
          <view @tap="showConfirmPassword = !showConfirmPassword" class="p-1 shrink-0">
            <svg v-if="showConfirmPassword" class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <svg v-else class="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </view>
        </view>

        <!-- 密码不一致提示 -->
        <text v-if="confirmPassword && password !== confirmPassword" class="text-xs text-destructive px-1">两次输入的密码不一致</text>

        <!-- 协议同意 -->
        <view class="flex items-start gap-2 mt-1">
          <view
            @tap="agreed = !agreed"
            :class="['w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5', agreed ? 'bg-primary border-primary' : 'border-border bg-card']"
          >
            <svg v-if="agreed" class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </view>
          <view class="flex flex-wrap text-xs leading-5">
            <text class="text-muted-foreground">我已阅读并同意</text>
            <view @tap="goTerms"><text class="text-primary">《用户协议》</text></view>
            <text class="text-muted-foreground">和</text>
            <view @tap="goPrivacy"><text class="text-primary">《隐私政策》</text></view>
          </view>
        </view>

        <!-- 注册按钮 -->
        <view
          @tap="handleRegister"
          :class="['h-12 rounded-2xl flex items-center justify-center mt-2', canRegister ? 'bg-primary active:opacity-90' : 'bg-secondary']"
        >
          <text :class="canRegister ? 'text-primary-foreground text-sm font-semibold' : 'text-muted-foreground text-sm font-semibold'">
            {{ isLoading ? '注册中...' : '完成注册' }}
          </text>
        </view>
      </view>

      <!-- 底部跳转登录 -->
      <view class="mt-8 flex items-center justify-center gap-1">
        <text class="text-sm text-muted-foreground">已有账号？</text>
        <view @tap="goLogin">
          <text class="text-sm text-primary font-medium">立即登录</text>
        </view>
      </view>

    </view>
  </view>
</template>
