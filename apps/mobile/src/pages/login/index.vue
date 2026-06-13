<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

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
let timer: ReturnType<typeof setInterval> | null = null

const isPhoneValid = computed(() => /^1\d{10}$/.test(phone.value))
const canSubmit = computed(() => {
  if (!agreedTerms.value) return false
  if (loginType.value === 'phone') return isPhoneValid.value && code.value.length === 6
  return isPhoneValid.value && password.value.length >= 6
})

function switchType(t: 'phone' | 'password') { loginType.value = t; error.value = '' }

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => { if (--countdown.value <= 0) { clearInterval(timer!); timer = null } }, 1000)
}

async function handleSendCode() {
  if (!isPhoneValid.value || isSendingCode.value || countdown.value > 0) return
  if (!agreedTerms.value) { error.value = '请先阅读并同意相关协议'; return }
  isSendingCode.value = true
  await new Promise(r => setTimeout(r, 800))
  isSendingCode.value = false
  startCountdown()
}

async function handleLogin() {
  if (!canSubmit.value || isLoading.value) return
  isLoading.value = true; error.value = ''
  await new Promise(r => setTimeout(r, 1000))
  isLoading.value = false
  uni.switchTab({ url: '/pages/home/index' })
}

function handleThirdLogin(type: string) {
  if (!agreedTerms.value) { error.value = '请先阅读并同意相关协议'; return }
  uni.showToast({ title: `${type === 'wechat' ? '微信' : 'Apple'}登录开发中`, icon: 'none' })
}

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <view class="min-h-screen bg-background flex flex-col overflow-hidden">

    <!-- 顶部渐变装饰 -->
    <view class="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

    <!-- 返回按钮 -->
    <view class="pt-safe px-4 pt-4 z-10">
      <view @tap="() => uni.navigateBack()" class="w-10 h-10 rounded-full bg-card/80 flex items-center justify-center shadow-sm active:bg-secondary">
        <svg class="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </view>
    </view>

    <view class="flex-1 px-6 pt-6 pb-10 flex flex-col z-10">

      <!-- Logo 区域 -->
      <view class="items-center mb-8 flex flex-col">
        <view class="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3 overflow-hidden">
          <image src="/static/placeholder.svg" />
        </view>
        <text class="text-2xl font-bold text-foreground">热卜国学</text>
        <text class="text-sm text-muted-foreground mt-1">探寻东方智慧</text>
      </view>

      <!-- 切换标签 -->
      <view class="flex bg-secondary rounded-xl p-1 mb-6">
        <view v-for="t in [{ key: 'phone', label: '验证码登录' }, { key: 'password', label: '密码登录' }]" :key="t.key"
          @tap="switchType(t.key as any)"
          :class="['flex-1 py-2.5 rounded-lg text-center text-sm font-medium transition-all', loginType === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground']">
          <text>{{ t.label }}</text>
        </view>
      </view>

      <!-- 表单 -->
      <view class="flex flex-col gap-3">

        <!-- 手机号 -->
        <view class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.1a16 16 0 0 0 6 6l1.42-1.42a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <input v-model="phone" type="number" maxlength="11" placeholder="请输入手机号"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            class="flex-1 text-sm text-foreground bg-transparent h-full" />
        </view>

        <!-- 验证码 -->
        <view v-if="loginType === 'phone'" class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <input v-model="code" type="number" maxlength="6" placeholder="请输入验证码"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            class="flex-1 text-sm text-foreground bg-transparent h-full" />
          <view @tap="handleSendCode"
            :class="['px-3 py-1.5 rounded-lg text-xs font-medium shrink-0', countdown > 0 || !isPhoneValid || isSendingCode ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary']">
            <text>{{ isSendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
          </view>
        </view>

        <!-- 密码 -->
        <view v-else class="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 h-14 focus-within:border-primary">
          <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <input v-model="password" :password="!showPassword" placeholder="请输入密码"
            placeholder-style="color: #9CA3AF; font-size: 14px;"
            class="flex-1 text-sm text-foreground bg-transparent h-full" />
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

        <!-- 错误提示 -->
        <text v-if="error" class="text-xs text-destructive px-1">{{ error }}</text>

        <!-- 忘记密码 -->
        <view v-if="loginType === 'password'" class="flex justify-end">
          <view @tap="() => uni.navigateTo({ url: '/pages/auth/recover' })" class="py-1">
            <text class="text-sm text-primary">忘记密码？</text>
          </view>
        </view>

        <!-- 协议 -->
        <view class="flex items-start gap-2 mt-1">
          <view @tap="agreedTerms = !agreedTerms"
            :class="['w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5', agreedTerms ? 'bg-primary border-primary' : 'border-border bg-card']">
            <svg v-if="agreedTerms" class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </view>
          <view class="flex flex-wrap text-xs leading-5">
            <text class="text-muted-foreground">我已阅读并同意</text>
            <view @tap="() => uni.navigateTo({ url: '/pages/policy/user-agreement' })"><text class="text-primary">《用户服务协议》</text></view>
            <text class="text-muted-foreground">和</text>
            <view @tap="() => uni.navigateTo({ url: '/pages/policy/privacy-policy' })"><text class="text-primary">《隐私政策》</text></view>
          </view>
        </view>

        <!-- 登录按钮 -->
        <view @tap="handleLogin"
          :class="['h-13 rounded-2xl flex items-center justify-center mt-2', canSubmit && !isLoading ? 'bg-primary active:opacity-90' : 'bg-secondary']">
          <text :class="['text-sm font-semibold', canSubmit && !isLoading ? 'text-primary-foreground' : 'text-muted-foreground']">
            {{ isLoading ? '登录中...' : '登录' }}
          </text>
        </view>

        <!-- 注册入口 -->
        <view class="flex items-center justify-center gap-1 mt-1">
          <text class="text-sm text-muted-foreground">还没有账号？</text>
          <view @tap="() => uni.navigateTo({ url: '/pages/register/index' })">
            <text class="text-sm text-primary font-medium">立即注册</text>
          </view>
        </view>
      </view>

      <!-- 第三方登录 -->
      <view class="mt-8">
        <view class="flex items-center gap-3 mb-5">
          <view class="flex-1 h-px bg-border" />
          <text class="text-xs text-muted-foreground px-2">其他登录方式</text>
          <view class="flex-1 h-px bg-border" />
        </view>
        <view class="flex justify-center gap-8">
          <!-- 微信 -->
          <view @tap="() => handleThirdLogin('wechat')" class="flex flex-col items-center gap-2">
            <view class="w-12 h-12 rounded-full bg-[#07C160] flex items-center justify-center">
              <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.5 14.5c-.3 0-.5-.1-.7-.2L5.5 15.6l.5-2.4c-1-.9-1.6-2.1-1.6-3.4 0-2.8 2.6-5 5.9-5s5.9 2.2 5.9 5-2.6 5-5.9 5c-.3 0-.5 0-.8-.1l-.9-.2zm7.6-.6c.7.7 1.1 1.6 1.1 2.6 0 2.1-1.9 3.7-4.3 3.7-.7 0-1.4-.2-2-.4L9 20.8l.4-1.8c-.7-.6-1.2-1.5-1.2-2.5h.1c0 2.1 1.9 3.7 4.3 3.7.7 0 1.4-.2 2-.4"/>
              </svg>
            </view>
            <text class="text-xs text-muted-foreground">微信</text>
          </view>
          <!-- Apple -->
          <view @tap="() => handleThirdLogin('apple')" class="flex flex-col items-center gap-2">
            <view class="w-12 h-12 rounded-full bg-foreground flex items-center justify-center">
              <svg class="w-6 h-6 text-background" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </view>
            <text class="text-xs text-muted-foreground">Apple</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部安全提示 -->
    <view class="px-6 pb-safe pb-6 text-center">
      <text class="text-xs text-muted-foreground">登录即代表您同意遵守平台规则，共建和谐社区</text>
    </view>
  </view>
</template>
