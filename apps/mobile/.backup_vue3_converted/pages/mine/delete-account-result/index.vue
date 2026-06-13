<template>
  <view class="min-h-screen bg-background">
    <!-- Show pending state -->
    <template v-if="status === 'pending'">
      <!-- Header -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center justify-between h-14 px-4">
          <view @click="goBack" class="p-2 -ml-2">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="font-semibold text-foreground">注销申请</text>
          <view class="w-9" />
        </view>
      </view>

      <view class="flex flex-col items-center px-6 pt-16 pb-8">
        <!-- Icon -->
        <view class="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-6">
          <text class="text-blue-500 text-3xl"></text>
        </view>

        <!-- Title -->
        <text class="text-xl font-bold text-foreground mb-2 block">注销申请已提交</text>
        <text class="text-sm text-muted-foreground text-center mb-8 block">您的账号将在7天冷静期后正式注销</text>

        <!-- Countdown -->
        <view class="w-full bg-blue-50 rounded-2xl p-6 mb-6">
          <text class="text-sm text-blue-600 text-center mb-4 block">冷静期剩余时间</text>
          <view class="flex justify-center gap-3">
            <view class="flex flex-col items-center">
              <view class="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <text class="text-2xl font-bold text-blue-600">{{ countdown.days }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">天</text>
            </view>
            <view class="flex flex-col items-center">
              <view class="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <text class="text-2xl font-bold text-blue-600">{{ pad(countdown.hours) }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">时</text>
            </view>
            <view class="flex flex-col items-center">
              <view class="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <text class="text-2xl font-bold text-blue-600">{{ pad(countdown.minutes) }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">分</text>
            </view>
            <view class="flex flex-col items-center">
              <view class="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <text class="text-2xl font-bold text-blue-600">{{ pad(countdown.seconds) }}</text>
              </view>
              <text class="text-xs text-muted-foreground mt-1">秒</text>
            </view>
          </view>
        </view>

        <!-- Info Card -->
        <view class="w-full bg-amber-50 rounded-xl p-4 mb-8">
          <view class="flex gap-3">
            <text class="text-amber-500 flex-shrink-0"></text>
            <view class="text-sm text-amber-700">
              <text class="font-medium mb-1 block">冷静期内您可以：</text>
              <text class="text-amber-600 block">• 重新登录账号撤销注销申请</text>
              <text class="text-amber-600 block">• 正常使用所有功能</text>
              <text class="text-amber-600 block">• 冷静期结束后账号将被永久注销</text>
            </view>
          </view>
        </view>

        <!-- What will happen -->
        <view class="w-full bg-white rounded-xl border border-border p-4 mb-8">
          <text class="font-medium text-foreground mb-3 block">注销后将发生</text>
          <view class="space-y-3">
            <view v-for="item in deleteInfo" :key="item.text" class="flex items-center gap-3 text-sm text-muted-foreground">
              <text>{{ item.icon }}</text>
              <text>{{ item.text }}</text>
            </view>
          </view>
        </view>

        <!-- Buttons -->
        <view class="w-full space-y-3">
          <view @click="showCancelDialog = true" class="w-full h-12 bg-primary text-white rounded-xl font-medium flex items-center justify-center">
            <text>撤销注销申请</text>
          </view>
          <view @click="goHome" class="w-full h-12 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center">
            <text>返回首页</text>
          </view>
          <view @click="showHelp" class="w-full h-12 text-muted-foreground text-sm flex items-center justify-center">
            <text>了解注销详情</text>
          </view>
        </view>
      </view>

      <!-- Cancel Dialog -->
      <view v-if="showCancelDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <view class="bg-white rounded-2xl p-6 mx-6 max-w-sm w-full">
          <view class="text-center">
            <view class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <text class="text-green-500 text-2xl">✓</text>
            </view>
            <text class="text-lg font-bold text-foreground mb-2 block">撤销注销申请</text>
            <text class="text-sm text-muted-foreground mb-6 block">确定要撤销注销申请吗？撤销后账号将恢复正常状态。</text>
            <view class="flex gap-3">
              <view @click="showCancelDialog = false" class="flex-1 h-11 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center text-sm">
                <text>取消</text>
              </view>
              <view @click="handleCancelDeletion" :class="['flex-1 h-11 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center text-sm', cancelling ? 'opacity-50' : '']">
                <text>{{ cancelling ? '处理中…' : '确定撤销' }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- Show completed state -->
    <template v-else>
      <!-- Header -->
      <view class="sticky top-0 z-10 bg-white border-b border-border">
        <view class="flex items-center justify-center h-14 px-4">
          <text class="font-semibold text-foreground">账号注销</text>
        </view>
      </view>

      <view class="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <!-- Icon -->
        <view class="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <view class="w-12 h-12 rounded-full bg-muted-foreground/30 flex items-center justify-center">
            <text class="text-muted-foreground text-xl">✕</text>
          </view>
        </view>

        <text class="text-xl font-bold text-foreground mb-2 block">账号已注销</text>
        <text class="text-sm text-muted-foreground text-center mb-8 max-w-xs block">所有数据将按隐私政策处理，感谢您一直以来的使用与支持</text>

        <!-- Info Card -->
        <view class="w-full bg-white rounded-xl border border-border p-4 mb-8">
          <text class="font-medium text-foreground mb-3 block">注销完成说明</text>
          <view class="space-y-3 text-sm text-muted-foreground">
            <view v-for="item in completedInfo" :key="item" class="flex items-start gap-3">
              <text class="text-green-500 flex-shrink-0">✓</text>
              <text>{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- Feedback -->
        <view class="w-full bg-blue-50 rounded-xl p-4 mb-8">
          <text class="text-sm text-blue-700 text-center block">如果您愿意告诉我们离开的原因，可以填写反馈问卷帮助我们改进服务</text>
        </view>

        <!-- Buttons -->
        <view class="w-full space-y-3">
          <view @click="reRegister" class="w-full h-12 bg-primary text-white rounded-xl font-medium flex items-center justify-center">
            <text>重新注册账号</text>
          </view>
          <view @click="handleCloseApp" class="w-full h-12 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center">
            <text>关闭应用</text>
          </view>
        </view>

        <text class="text-xs text-muted-foreground text-center mt-8">如有问题请联系客服：400-xxx-xxxx</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const status = ref('pending')
const expireTime = ref('')
const showCancelDialog = ref(false)
const cancelling = ref(false)

const countdown = ref({ days: 7, hours: 0, minutes: 0, seconds: 0 })

const deleteInfo = [
  { icon: '', text: '个人资料、发布内容将被删除' },
  { icon: '', text: '账户余额将被清零且不可恢复' },
  { icon: '🎁', text: '会员权益、优惠券将作废' },
  { icon: '', text: '手机号可重新注册新账号' },
]

const completedInfo = [
  '您的个人数据已按照隐私政策进行处理',
  '账户余额已按规定处理完毕',
  '该手机号可用于注册新账号',
  '原账号数据无法恢复',
]

let countdownTimer: any

// Simulate countdown for demo — set expire to 7 days from now
const targetTime = Date.now() + 7 * 24 * 60 * 60 * 1000

function updateCountdown() {
  const diff = targetTime - Date.now()
  if (diff <= 0) {
    status.value = 'completed'
    return
  }
  countdown.value = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

updateCountdown()
countdownTimer = setInterval(updateCountdown, 1000)

onUnmounted(() => {
  clearInterval(countdownTimer)
})

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function handleCancelDeletion() {
  cancelling.value = true
  setTimeout(() => {
    uni.showToast({ title: '已撤销', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  }, 1500)
}

function goBack() {
  uni.navigateBack()
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function showHelp() {
  // placeholder
}

function reRegister() {
  uni.reLaunch({ url: '/pages/auth/register/index' })
}

function handleCloseApp() {
  // In app context, just go back
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
