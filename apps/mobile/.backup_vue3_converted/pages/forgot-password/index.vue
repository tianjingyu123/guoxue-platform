<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 顶部装饰 -->
    <view class="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

    <!-- 返回按钮 -->
    <view class="relative z-10 flex items-center px-4 h-14 pt-safe">
      <view v-if="step !== 3" class="p-2 -ml-2 rounded-full" @click="step === 1 ? goBack() : (step = 1)">
        <text class="text-lg text-foreground">←</text>
      </view>
    </view>

    <view class="flex-1 px-6 relative z-10">
      <!-- 步骤指示 -->
      <view v-if="step !== 3" class="flex items-center justify-center gap-2 py-6">
        <view class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-primary text-white transition-all duration-300">
          <text v-if="step > 1">✓</text>
          <text v-else>1</text>
        </view>
        <view class="w-12 h-0.5 transition-all duration-300" :class="step >= 2 ? 'bg-primary' : 'bg-[#F2EFEA]'" />
        <view class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300" :class="step >= 2 ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground'">
          <text>2</text>
        </view>
      </view>

      <!-- 步骤1：验证手机号 -->
      <view v-if="step === 1" class="space-y-6">
        <view class="text-center mb-8">
          <text class="text-2xl font-bold text-foreground block">找回密码</text>
          <text class="text-sm text-muted-foreground mt-2 block">请验证您的手机号</text>
        </view>

        <view class="space-y-4">
          <!-- 手机号 -->
          <view class="relative">
            <text class="absolute left-4 text-muted-foreground" style="top: 50%; transform: translateY(-50%)"></text>
            <input
              v-model="phone"
              type="tel"
              placeholder="请输入手机号"
              class="w-full h-12 pl-12 pr-4 rounded-xl bg-[#F2EFEA] text-foreground"
              maxlength="11"
              @input="phone = phone.replace(/\D/g, '').slice(0, 11); error = ''"
            />
          </view>

          <!-- 验证码 -->
          <view class="relative">
            <text class="absolute left-4 text-muted-foreground" style="top: 50%; transform: translateY(-50%)"></text>
            <input
              v-model="code"
              type="text"
              placeholder="请输入验证码"
              class="w-full h-12 pl-12 pr-28 rounded-xl bg-[#F2EFEA] text-foreground"
              maxlength="6"
              @input="code = code.replace(/\D/g, '').slice(0, 6); error = ''"
            />
            <view
              class="absolute right-2 px-4 py-1.5 rounded-lg text-sm font-medium"
              style="top: 50%; transform: translateY(-50%)"
              :class="countdown > 0 || !isPhoneValid ? 'bg-[#F2EFEA] text-muted-foreground' : 'bg-primary/10 text-primary'"
              @click="sendCode"
            >
              <text>{{ countdown > 0 ? countdown + 's' : '获取验证码' }}</text>
            </view>
          </view>

          <text v-if="error" class="text-sm text-red-500 px-1 block">{{ error }}</text>

          <view
            class="w-full h-12 rounded-xl text-base font-medium flex items-center justify-center active:scale-[0.98] transition-all duration-200"
            :class="isPhoneValid && isCodeValid ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground'"
            @click="verifyPhone"
          >
            <text>下一步</text>
          </view>
        </view>
      </view>

      <!-- 步骤2：设置新密码 -->
      <view v-if="step === 2" class="space-y-6">
        <view class="text-center mb-8">
          <text class="text-2xl font-bold text-foreground block">设置新密码</text>
          <text class="text-sm text-muted-foreground mt-2 block">请设置6-20位新密码</text>
        </view>

        <view class="space-y-4">
          <!-- 新密码 -->
          <view>
            <view class="relative">
              <text class="absolute left-4 text-muted-foreground" style="top: 50%; transform: translateY(-50%)"></text>
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="请输入新密码"
                class="w-full h-12 pl-12 pr-12 rounded-xl bg-[#F2EFEA] text-foreground"
                @input="error = ''"
              />
              <view class="absolute right-4" style="top: 50%; transform: translateY(-50%)" @click="showPassword = !showPassword">
                <text class="text-muted-foreground">{{ showPassword ? '🙈' : '' }}</text>
              </view>
            </view>

            <!-- 密码强度 -->
            <view v-if="password" class="flex items-center gap-2 mt-2 px-1">
              <view class="flex gap-1 flex-1">
                <view v-for="i in 3" :key="i" class="h-1 flex-1 rounded-full" :class="i <= passwordStrength.level ? passwordStrength.color : 'bg-[#F2EFEA]'" />
              </view>
              <text class="text-xs" :class="passwordStrength.level === 1 ? 'text-red-500' : passwordStrength.level === 2 ? 'text-accent' : 'text-green-500'">{{ passwordStrength.text }}</text>
            </view>
            <text class="text-xs text-muted-foreground mt-1 px-1 block">6-20位，建议包含数字和字母</text>
          </view>

          <!-- 确认密码 -->
          <view class="relative">
            <text class="absolute left-4 text-muted-foreground" style="top: 50%; transform: translateY(-50%)"></text>
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="confirmPassword"
              placeholder="请再次输入新密码"
              class="w-full h-12 pl-12 pr-12 rounded-xl bg-[#F2EFEA] text-foreground"
              @input="error = ''"
            />
            <view class="absolute right-4" style="top: 50%; transform: translateY(-50%)" @click="showConfirmPassword = !showConfirmPassword">
              <text class="text-muted-foreground">{{ showConfirmPassword ? '🙈' : '' }}</text>
            </view>
          </view>
          <text v-if="confirmPassword && password !== confirmPassword" class="text-sm text-red-500 px-1 block">两次输入的密码不一致</text>

          <text v-if="error" class="text-sm text-red-500 px-1 block">{{ error }}</text>

          <view
            class="w-full h-12 rounded-xl text-base font-medium flex items-center justify-center active:scale-[0.98] transition-all duration-200"
            :class="isPasswordValid && !isLoading ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground'"
            @click="resetPassword"
          >
            <text>{{ isLoading ? '设置中...' : '确认设置' }}</text>
          </view>
        </view>
      </view>

      <!-- 步骤3：成功 -->
      <view v-if="step === 3" class="flex flex-col items-center justify-center pt-20">
        <view class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-bounce">
          <text class="text-3xl">🛡</text>
        </view>
        <text class="text-2xl font-bold text-foreground block">密码重置成功</text>
        <text class="text-sm text-muted-foreground mt-2 text-center block">您的密码已重置成功<br />请使用新密码登录</text>

        <view class="w-full h-12 rounded-xl bg-primary text-white text-base font-medium flex items-center justify-center mt-8 active:scale-[0.98] transition-all duration-200" @click="goTo('/pages/login/index')">
          <text>去登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

const step = ref<1 | 2 | 3>(1)
const phone = ref("")
const code = ref("")
const password = ref("")
const confirmPassword = ref("")
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const countdown = ref(0)
const isLoading = ref(false)
const error = ref("")

const passwordStrength = computed(() => {
  const pwd = password.value
  if (!pwd) return { level: 0, text: "", color: "" }
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[!@#$%^&*]/.test(pwd)) score++

  if (score <= 2) return { level: 1, text: "弱", color: "bg-red-500" }
  if (score <= 3) return { level: 2, text: "中", color: "bg-accent" }
  return { level: 3, text: "强", color: "bg-green-500" }
})

const isPhoneValid = computed(() => phone.value.length === 11)
const isCodeValid = computed(() => code.value.length === 6)
const isPasswordValid = computed(() => password.value.length >= 6 && password.value === confirmPassword.value)

let timer: ReturnType<typeof setInterval> | null = null

function sendCode() {
  if (!phone.value || phone.value.length !== 11) {
    error.value = "请输入正确的手机号"
    return
  }
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (countdown.value <= 1) {
      if (timer) clearInterval(timer)
      countdown.value = 0
    } else {
      countdown.value--
    }
  }, 1000)
}

async function verifyPhone() {
  if (code.value !== "123456") {
    error.value = "验证码错误"
    return
  }
  error.value = ""
  step.value = 2
}

async function resetPassword() {
  if (password.value !== confirmPassword.value) {
    error.value = "两次输入的密码不一致"
    return
  }
  if (password.value.length < 6) {
    error.value = "密码长度至少6位"
    return
  }

  error.value = ""
  isLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  isLoading.value = false
  step.value = 3
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
