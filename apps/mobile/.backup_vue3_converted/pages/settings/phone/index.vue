<template>
  <view class="min-h-screen bg-background">
    <!-- 成功页面 -->
    <view v-if="step === 3" class="flex flex-col min-h-screen bg-background">
      <view class="sticky top-0 z-40 bg-white/95 border-b border-border">
        <view class="flex items-center h-12 px-4">
          <view class="p-1 -ml-1" @click="goBack">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="flex-1 text-center font-semibold text-base text-foreground pr-9">修改手机号</text>
        </view>
      </view>

      <view class="flex-1 flex flex-col items-center justify-center px-6">
        <view class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <text class="text-4xl text-green-500">✓</text>
        </view>
        <text class="text-xl font-semibold text-foreground block mb-2">手机号修改成功</text>
        <text class="text-sm text-muted-foreground mb-1 block">新手机号：{{ maskedNewPhone }}</text>
        <text class="text-xs text-muted-foreground">3秒后自动返回设置页...</text>
      </view>
    </view>

    <!-- 主页面 -->
    <view v-else class="min-h-screen bg-background">
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-40 bg-white/95 border-b border-border">
        <view class="flex items-center h-12 px-4">
          <view class="p-1 -ml-1" @click="goBack">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="flex-1 text-center font-semibold text-base text-foreground pr-9">修改手机号</text>
        </view>
      </view>

      <!-- 步骤指示器 -->
      <view class="px-6 py-4">
        <view class="flex items-center justify-center gap-3">
          <view class="flex items-center gap-2">
            <view :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium', step >= 1 ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground']">
              <text v-if="step > 1">✓</text>
              <text v-else>1</text>
            </view>
            <text :class="['text-sm', step >= 1 ? 'text-foreground' : 'text-muted-foreground']">验证身份</text>
          </view>
          <view :class="['w-12 h-0.5', step >= 2 ? 'bg-primary' : 'bg-[#F2EFEA]']" />
          <view class="flex items-center gap-2">
            <view :class="['w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium', step >= 2 ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground']">
              <text>2</text>
            </view>
            <text :class="['text-sm', step >= 2 ? 'text-foreground' : 'text-muted-foreground']">绑定新号</text>
          </view>
        </view>
      </view>

      <view class="px-4 pb-24">
        <!-- 第一步：验证当前手机号 -->
        <view v-if="step === 1" class="bg-white rounded-xl p-5">
          <text class="font-medium text-foreground block mb-1">验证当前手机号</text>
          <text class="text-sm text-muted-foreground block mb-6">为保障账号安全，请先验证当前绑定的手机号</text>

          <view class="mb-4">
            <text class="text-xs text-muted-foreground mb-1.5 block">当前手机号</text>
            <view class="h-12 px-4 rounded-xl bg-[#F2EFEA] flex items-center">
              <text class="text-foreground font-medium">{{ currentPhone }}</text>
            </view>
          </view>

          <view class="mb-6">
            <text class="text-xs text-muted-foreground mb-1.5 block">验证码</text>
            <view class="flex gap-3">
              <input type="text" maxlength="6" v-model="currentCode" @input="onCurrentCodeInput" placeholder="请输入6位验证码" :class="['flex-1 h-12 px-4 rounded-xl bg-[#F2EFEA] text-foreground placeholder:text-muted-foreground outline-none border-2', currentCodeError ? 'border-red-500' : 'border-transparent']" />
              <view :class="['px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap flex items-center', currentCountdown > 0 || currentSending ? 'bg-[#F2EFEA] text-muted-foreground' : 'bg-primary/10 text-primary']" @click="sendCurrentCode">
                <text>{{ currentSending ? '发送中' : currentCountdown > 0 ? `${currentCountdown}s` : '获取验证码' }}</text>
              </view>
            </view>
            <text v-if="currentCodeError" class="flex items-center gap-1 text-xs text-red-500 mt-2">
              <text></text> {{ currentCodeError }}
            </text>
          </view>

          <view :class="['w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2', currentCode.length === 6 && !currentVerifying ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground']" @click="verifyCurrentPhone">
            <text>{{ currentVerifying ? '验证中...' : '下一步' }}</text>
          </view>
        </view>

        <!-- 第二步：绑定新手机号 -->
        <view v-if="step === 2" class="bg-white rounded-xl p-5">
          <text class="font-medium text-foreground block mb-1">绑定新手机号</text>
          <text class="text-sm text-muted-foreground block mb-6">请输入您要绑定的新手机号</text>

          <view class="mb-4">
            <text class="text-xs text-muted-foreground mb-1.5 block">新手机号</text>
            <input type="number" maxlength="11" v-model="newPhone" @input="onNewPhoneInput" placeholder="请输入新手机号" class="w-full h-12 px-4 rounded-xl bg-[#F2EFEA] text-foreground placeholder:text-muted-foreground outline-none border-2 border-transparent" />
          </view>

          <view class="mb-6">
            <text class="text-xs text-muted-foreground mb-1.5 block">验证码</text>
            <view class="flex gap-3">
              <input type="text" maxlength="6" v-model="newCode" @input="onNewCodeInput" placeholder="请输入6位验证码" :class="['flex-1 h-12 px-4 rounded-xl bg-[#F2EFEA] text-foreground placeholder:text-muted-foreground outline-none border-2', newCodeError ? 'border-red-500' : 'border-transparent']" />
              <view :class="['px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap flex items-center', newCountdown > 0 || newSending || !isNewPhoneValid ? 'bg-[#F2EFEA] text-muted-foreground' : 'bg-primary/10 text-primary']" @click="sendNewCode">
                <text>{{ newSending ? '发送中' : newCountdown > 0 ? `${newCountdown}s` : '获取验证码' }}</text>
              </view>
            </view>
            <text v-if="newCodeError" class="flex items-center gap-1 text-xs text-red-500 mt-2">
              <text></text> {{ newCodeError }}
            </text>
          </view>

          <view :class="['w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2', newCode.length === 6 && isNewPhoneValid && !newVerifying ? 'bg-primary text-white' : 'bg-[#F2EFEA] text-muted-foreground']" @click="bindNewPhone">
            <text>{{ newVerifying ? '绑定中...' : '确认绑定' }}</text>
          </view>

          <view class="w-full mt-3 text-sm text-muted-foreground text-center" @click="goBackStep1">
            <text>返回上一步</text>
          </view>
        </view>
      </view>

      <!-- 手机号已被绑定弹窗 -->
      <view v-if="phoneExistsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
        <view class="w-full max-w-sm bg-white rounded-xl p-5">
          <view class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <text class="text-xl text-red-500"></text>
          </view>
          <text class="text-center font-semibold text-foreground block mb-2">手机号已被绑定</text>
          <text class="text-center text-sm text-muted-foreground block mb-5">该手机号已被其他账号绑定，请更换其他手机号或找回原账号。</text>
          <view class="flex gap-3">
            <view class="flex-1 h-10 rounded-xl bg-[#F2EFEA] text-foreground font-medium flex items-center justify-center" @click="closePhoneModal">更换手机号</view>
            <view class="flex-1 h-10 rounded-xl bg-primary text-white font-medium flex items-center justify-center" @click="goRecover">找回原账号</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const step = ref<1 | 2 | 3>(1)
const currentPhone = '138****8888'

// 第一步状态
const currentCode = ref('')
const currentCodeError = ref('')
const currentCountdown = ref(0)
const currentSending = ref(false)
const currentVerifying = ref(false)

// 第二步状态
const newPhone = ref('')
const newCode = ref('')
const newCodeError = ref('')
const newCountdown = ref(0)
const newSending = ref(false)
const newVerifying = ref(false)
const phoneExistsModal = ref(false)

let step3Timer: ReturnType<typeof setTimeout> | null = null
let currentTimer: ReturnType<typeof setInterval> | null = null
let newTimer: ReturnType<typeof setInterval> | null = null

const isNewPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(newPhone.value))
const maskedNewPhone = computed(() => newPhone.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'))

watch(currentCountdown, (val) => {
  if (val > 0 && !currentTimer) {
    currentTimer = setInterval(() => {
      currentCountdown.value--
      if (currentCountdown.value <= 0 && currentTimer) {
        clearInterval(currentTimer); currentTimer = null
      }
    }, 1000)
  }
})

watch(newCountdown, (val) => {
  if (val > 0 && !newTimer) {
    newTimer = setInterval(() => {
      newCountdown.value--
      if (newCountdown.value <= 0 && newTimer) {
        clearInterval(newTimer); newTimer = null
      }
    }, 1000)
  }
})

watch(step, (val) => {
  if (val === 3) {
    step3Timer = setTimeout(() => goBack(), 3000)
  }
})

onUnmounted(() => {
  if (currentTimer) clearInterval(currentTimer)
  if (newTimer) clearInterval(newTimer)
  if (step3Timer) clearTimeout(step3Timer)
})

function onCurrentCodeInput(e: any) {
  currentCode.value = e.target.value.replace(/\D/g, '')
  currentCodeError.value = ''
}

function onNewPhoneInput(e: any) {
  newPhone.value = e.target.value.replace(/\D/g, '')
}

function onNewCodeInput(e: any) {
  newCode.value = e.target.value.replace(/\D/g, '')
  newCodeError.value = ''
}

function sendCurrentCode() {
  if (currentSending.value) return
  currentSending.value = true
  currentCodeError.value = ''
  setTimeout(() => {
    currentSending.value = false
    currentCountdown.value = 60
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  }, 1000)
}

function verifyCurrentPhone() {
  if (currentCode.value.length !== 6) return
  currentVerifying.value = true
  currentCodeError.value = ''

  setTimeout(() => {
    currentVerifying.value = false
    if (currentCode.value === '123456') {
      step.value = 2
    } else if (currentCode.value === '000000') {
      currentCodeError.value = '验证码已过期，请重新获取'
    } else {
      currentCodeError.value = '验证码错误，请重新输入'
    }
  }, 1500)
}

function sendNewCode() {
  if (!isNewPhoneValid.value) return
  newSending.value = true
  newCodeError.value = ''
  setTimeout(() => {
    newSending.value = false
    newCountdown.value = 60
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  }, 1000)
}

function bindNewPhone() {
  if (newCode.value.length !== 6 || !isNewPhoneValid.value) return
  newVerifying.value = true
  newCodeError.value = ''

  setTimeout(() => {
    newVerifying.value = false
    if (newPhone.value === '13900001111') {
      phoneExistsModal.value = true
      return
    }
    if (newCode.value === '123456') {
      step.value = 3
    } else if (newCode.value === '000000') {
      newCodeError.value = '验证码已过期，请重新获取'
    } else {
      newCodeError.value = '验证码错误，请重新输入'
    }
  }, 1500)
}

function closePhoneModal() {
  phoneExistsModal.value = false
  newPhone.value = ''
  newCode.value = ''
}

function goBackStep1() {
  step.value = 1
  currentCode.value = ''
  currentCodeError.value = ''
}

function goBack() { uni.navigateBack() }
function goRecover() { uni.showToast({ title: '找回账号功能开发中', icon: 'none' }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
