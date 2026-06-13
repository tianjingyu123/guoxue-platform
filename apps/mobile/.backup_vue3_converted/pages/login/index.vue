<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部装饰 -->
    <view class="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

    <!-- 返回按钮 -->
    <view class="relative z-10 flex items-center px-4 h-14">
      <view class="p-1 -ml-1" @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
    </view>

    <view class="flex-1 px-6 relative z-10">
      <!-- Logo和标题 -->
      <view class="flex flex-col items-center pt-4 pb-8">
        <view class="w-24 h-24 rounded-2xl overflow-hidden shadow-xl shadow-primary/20 mb-4 bg-primary flex items-center justify-center">
          <text class="text-4xl">🏮</text>
        </view>
        <text class="text-2xl font-bold text-foreground font-serif">热卜国学</text>
        <text class="text-sm text-muted-foreground mt-1">探寻东方智慧</text>
      </view>

      <!-- 登录方式切换 -->
      <view class="flex items-center justify-center gap-6 mb-6">
        <text :class="['text-sm font-medium pb-2 border-b-2 transition-all duration-200', loginType === 'phone' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent']" @click="loginType = 'phone'; error = ''">验证码登录</text>
        <text :class="['text-sm font-medium pb-2 border-b-2 transition-all duration-200', loginType === 'password' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent']" @click="loginType = 'password'; error = ''">密码登录</text>
      </view>

      <!-- 登录表单 -->
      <view class="space-y-4">
        <!-- 手机号 -->
        <view class="relative">
          <text class="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input type="number" v-model="phone" @input="onPhoneInput" placeholder="请输入手机号" maxlength="11" class="w-full h-12 pl-12 pr-4 rounded-xl bg-[#F2EFEA] text-sm text-foreground placeholder:text-muted-foreground" />
        </view>

        <!-- 验证码或密码 -->
        <view v-if="loginType === 'phone'" class="relative">
          <text class="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input type="text" v-model="code" @input="onCodeInput" placeholder="请输入验证码" maxlength="6" class="w-full h-12 pl-12 pr-28 rounded-xl bg-[#F2EFEA] text-sm text-foreground placeholder:text-muted-foreground" />
          <view :class="['absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-sm font-medium', countdown > 0 || !isPhoneValid || isSendingCode ? 'bg-[#F2EFEA] text-muted-foreground' : 'bg-primary/10 text-primary']" @click="handleSendCode">
            <text>{{ isSendingCode ? '发送中' : countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
          </view>
        </view>

        <view v-else class="relative">
          <text class="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"></text>
          <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="请输入密码" class="w-full h-12 pl-12 pr-12 rounded-xl bg-[#F2EFEA] text-sm text-foreground placeholder:text-muted-foreground" />
          <text class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" @click="showPassword = !showPassword">{{ showPassword ? '️' : '️‍🗨️' }}</text>
        </view>

        <!-- 错误提示 -->
        <text v-if="error" class="text-sm text-primary px-1 block">{{ error }}</text>

        <!-- 忘记密码 -->
        <view v-if="loginType === 'password'" class="flex justify-end">
          <text class="text-sm text-primary" @click="goForgotPassword">忘记密码？</text>
        </view>

        <!-- 协议勾选 -->
        <view class="flex items-start gap-2 py-2">
          <view :class="['w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5', agreedTerms ? 'bg-primary border-primary' : 'border-[#999]']" @click="agreedTerms = !agreedTerms">
            <text v-if="agreedTerms" class="text-white text-xs">✓</text>
          </view>
          <text class="text-xs text-muted-foreground leading-relaxed">
            我已阅读并同意
            <text class="text-primary">《用户服务协议》</text>
            和
            <text class="text-primary">《隐私政策》</text>
          </text>
        </view>

        <!-- 登录按钮 -->
        <view :class="['w-full h-12 rounded-xl text-base font-medium flex items-center justify-center', (!canSubmit || isLoading) ? 'bg-[#E8E0D5] text-muted-foreground' : 'bg-gradient-to-r from-primary to-[#E74C3C] text-white']" @click="handleLogin">
          <text>{{ isLoading ? '登录中...' : '登录' }}</text>
        </view>

        <!-- 注册入口 -->
        <text class="block text-center text-sm text-muted-foreground">
          还没有账号？
          <text class="text-primary ml-1" @click="goRegister">立即注册</text>
        </text>
      </view>

      <!-- 第三方登录 -->
      <view class="mt-10">
        <view class="relative flex items-center justify-center mb-6">
          <view class="absolute inset-0 flex items-center">
            <view class="w-full border-t border-border" />
          </view>
          <text class="relative px-4 bg-background text-xs text-muted-foreground">其他登录方式</text>
        </view>

        <view class="flex items-center justify-center gap-8">
          <view class="flex flex-col items-center gap-2" @click="handleThirdPartyLogin('wechat')">
            <view class="w-12 h-12 rounded-full bg-[#07C160]/10 flex items-center justify-center">
              <text class="text-2xl">💚</text>
            </view>
            <text class="text-xs text-muted-foreground">微信</text>
          </view>
          <view class="flex flex-col items-center gap-2" @click="handleThirdPartyLogin('apple')">
            <view class="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
              <text class="text-2xl">🍎</text>
            </view>
            <text class="text-xs text-muted-foreground">Apple</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全提示 -->
    <view class="py-6 text-center">
      <text class="text-xs text-muted-foreground">登录即代表您同意遵守平台规则，共建和谐社区</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const loginType = ref<'phone' | 'password'>('phone')
const phone = ref('')
const code = ref('')
const password = ref('')
const showPassword = ref(false)
const countdown = ref(0)
const isLoading = ref(false)
const isSendingCode = ref(false)
const agreedTerms = ref(false)
const error = ref('')

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

const isPhoneValid = computed(() => phone.value.length === 11)
const isCodeValid = computed(() => code.value.length === 6)
const isPasswordValid = computed(() => password.value.length >= 6)
const canSubmit = computed(() => loginType.value === 'phone'
  ? isPhoneValid.value && isCodeValid.value && agreedTerms.value
  : isPhoneValid.value && isPasswordValid.value && agreedTerms.value
)

function onPhoneInput(e: any) {
  phone.value = e.target.value.replace(/\D/g, '').slice(0, 11)
  error.value = ''
}

function onCodeInput(e: any) {
  code.value = e.target.value.replace(/\D/g, '').slice(0, 6)
  error.value = ''
}

function handleSendCode() {
  if (!isPhoneValid.value) {
    error.value = '请输入正确的手机号'
    return
  }
  isSendingCode.value = true
  error.value = ''
  setTimeout(() => {
    isSendingCode.value = false
    countdown.value = 60
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  }, 1000)
}

function handleLogin() {
  if (!agreedTerms.value) {
    error.value = '请先阅读并同意相关协议'
    return
  }
  if (!isPhoneValid.value) {
    error.value = '请输入正确的手机号'
    return
  }
  if (loginType.value === 'phone' && !isCodeValid.value) {
    error.value = '请输入6位验证码'
    return
  }
  if (loginType.value === 'password' && !isPasswordValid.value) {
    error.value = '密码不能少于6位'
    return
  }

  error.value = ''
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000)
  }, 1000)
}

function handleThirdPartyLogin(type: string) {
  uni.showToast({ title: `${type === 'wechat' ? '微信' : 'Apple'}登录开发中`, icon: 'none' })
}

function goBack() { uni.navigateBack() }
function goRegister() { uni.navigateTo({ url: '/pages/register/index' }) }
function goForgotPassword() { uni.navigateTo({ url: '/pages/login/forgot-password/index' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
