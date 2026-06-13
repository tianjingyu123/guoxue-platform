<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-2 -ml-2">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="text-base font-semibold text-foreground">修改手机号</text>
        <view class="w-9" />
      </view>
    </view>

    <!-- Step Indicator -->
    <view class="px-6 py-6">
      <view class="flex items-center justify-between">
        <view v-for="(item, index) in steps" :key="item.num" class="flex items-center flex-1">
          <view class="flex flex-col items-center">
            <view :class="['w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', step >= item.num ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">
              <text v-if="step > item.num">✓</text>
              <text v-else>{{ item.num }}</text>
            </view>
            <text :class="['text-xs mt-1', step >= item.num ? 'text-primary' : 'text-muted-foreground']">{{ item.label }}</text>
          </view>
          <view v-if="index < 2" :class="['flex-1 h-0.5 mx-2 mt-[-20px]', step > item.num ? 'bg-primary' : 'bg-muted']" />
        </view>
      </view>
    </view>

    <!-- Step 1: Verify Current Phone -->
    <view v-if="step === 1" class="px-4">
      <view class="bg-white rounded-2xl p-6 border border-border">
        <view class="flex items-center gap-3 mb-6">
          <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <text class="text-primary text-lg">🛡️</text>
          </view>
          <view>
            <text class="font-medium text-foreground block">验证当前手机号</text>
            <text class="text-sm text-muted-foreground">为保障账号安全，请先验证身份</text>
          </view>
        </view>

        <view class="bg-background rounded-xl p-4 mb-6">
          <view class="flex items-center gap-3">
            <text class="text-muted-foreground">📞</text>
            <text class="text-foreground font-medium">{{ currentPhone }}</text>
            <text class="text-xs text-muted-foreground ml-auto">当前绑定</text>
          </view>
        </view>

        <view class="space-y-4">
          <view>
            <text class="text-sm text-muted-foreground mb-2 block">短信验证码</text>
            <view class="flex gap-3">
              <input
                v-model="verifyCode"
                @input="error = ''"
                maxlength="6"
                placeholder="请输入验证码"
                type="text"
                class="flex-1 h-12 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <view
                @click="sendVerifyCode"
                :class="['px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap flex items-center justify-center', countdown > 0 ? 'bg-muted text-muted-foreground' : 'bg-primary text-white']"
              >
                <text>{{ countdown > 0 ? countdown + 's' : '获取验证码' }}</text>
              </view>
            </view>
          </view>

          <text v-if="error" class="text-sm text-danger">{{ error }}</text>

          <view
            @click="verifyCurrentPhone"
            :class="['w-full h-12 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2', (loading || verifyCode.length !== 6) ? 'opacity-50' : '']"
          >
            <text v-if="loading">验证中…</text>
            <text v-else>下一步 →</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Step 2: New Phone -->
    <view v-if="step === 2" class="px-4">
      <view class="bg-white rounded-2xl p-6 border border-border">
        <view class="flex items-center gap-3 mb-6">
          <view class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <text class="text-green-600 text-lg">📞</text>
          </view>
          <view>
            <text class="font-medium text-foreground block">绑定新手机号</text>
            <text class="text-sm text-muted-foreground">请输入新的手机号并验证</text>
          </view>
        </view>

        <view class="space-y-4">
          <view>
            <text class="text-sm text-muted-foreground mb-2 block">新手机号</text>
            <input
              v-model="newPhone"
              @input="error = ''"
              maxlength="11"
              placeholder="请输入新手机号"
              type="text"
              class="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </view>

          <view>
            <text class="text-sm text-muted-foreground mb-2 block">短信验证码</text>
            <view class="flex gap-3">
              <input
                v-model="newCode"
                @input="error = ''"
                maxlength="6"
                placeholder="请输入验证码"
                type="text"
                class="flex-1 h-12 px-4 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <view
                @click="sendNewCode"
                :class="['px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap flex items-center justify-center', newCountdown > 0 || newPhone.length !== 11 ? 'bg-muted text-muted-foreground' : 'bg-primary text-white']"
              >
                <text>{{ newCountdown > 0 ? newCountdown + 's' : '获取验证码' }}</text>
              </view>
            </view>
          </view>

          <text v-if="error" class="text-sm text-danger">{{ error }}</text>

          <view
            @click="submitNewPhone"
            :class="['w-full h-12 bg-primary text-white rounded-xl font-medium flex items-center justify-center', (loading || newPhone.length !== 11 || newCode.length !== 6) ? 'opacity-50' : '']"
          >
            <text>{{ loading ? '提交中…' : '确认绑定' }}</text>
          </view>

          <view @click="step = 1" class="w-full h-12 text-muted-foreground text-sm flex items-center justify-center">
            <text>返回上一步</text>
          </view>
        </view>
      </view>

      <view class="mt-4 px-2">
        <text class="text-xs text-muted-foreground">温馨提示：更换手机号后，原手机号将无法用于登录和找回密码</text>
      </view>
    </view>

    <!-- Step 3: Done -->
    <view v-if="step === 3" class="px-4">
      <view class="bg-white rounded-2xl p-8 border border-border text-center">
        <view class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <text class="text-green-600 text-3xl">✓</text>
        </view>
        <text class="text-xl font-semibold text-foreground mb-2 block">绑定成功</text>
        <text class="text-muted-foreground mb-2 block">新手机号已绑定</text>
        <text class="text-lg font-medium text-primary block">{{ maskedPhone }}</text>
        <text class="text-sm text-muted-foreground mt-6 block">页面即将自动返回…</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(1)
const currentPhone = ref('138****8888')
const verifyCode = ref('')
const newPhone = ref('')
const newCode = ref('')
const countdown = ref(0)
const newCountdown = ref(0)
const loading = ref(false)
const error = ref('')

const steps = [
  { num: 1, label: '验证身份' },
  { num: 2, label: '绑定新号' },
  { num: 3, label: '完成' },
]

const maskedPhone = computed(() => {
  const p = newPhone.value
  return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

// Countdown timers
let timerHandle: any
let timerHandle2: any

import { watch } from 'vue'

watch(countdown, (val) => {
  if (val > 0) {
    clearTimeout(timerHandle)
    timerHandle = setTimeout(() => countdown.value--, 1000)
  }
})

watch(newCountdown, (val) => {
  if (val > 0) {
    clearTimeout(timerHandle2)
    timerHandle2 = setTimeout(() => newCountdown.value--, 1000)
  }
})

function sendVerifyCode() {
  if (countdown.value > 0) return
  countdown.value = 60
}

function sendNewCode() {
  if (newCountdown.value > 0 || !newPhone.value || newPhone.value.length !== 11) return
  newCountdown.value = 60
}

function verifyCurrentPhone() {
  if (verifyCode.value.length !== 6) {
    error.value = '请输入6位验证码'
    return
  }
  loading.value = true
  error.value = ''
  setTimeout(() => {
    loading.value = false
    step.value = 2
  }, 1000)
}

function submitNewPhone() {
  if (!newPhone.value || newPhone.value.length !== 11) {
    error.value = '请输入正确的手机号'
    return
  }
  if (newCode.value.length !== 6) {
    error.value = '请输入6位验证码'
    return
  }
  loading.value = true
  error.value = ''
  setTimeout(() => {
    loading.value = false
    step.value = 3
    setTimeout(() => uni.navigateBack(), 2000)
  }, 1500)
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
