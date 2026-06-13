<template>
  <view class="min-h-screen" :class="notice ? 'bg-gradient-to-b from-primary/10 via-[#C41E3A]/5 to-[#FAF8F5]' : 'bg-background'">
    <!-- 加载中 -->
    <view v-if="isLoading" class="min-h-screen flex items-center justify-center">
      <text class="text-primary"></text>
    </view>

    <!-- 暂无公告 -->
    <view v-else-if="!notice" class="min-h-screen flex flex-col items-center justify-center p-6">
      <text class="text-6xl mb-4"></text>
      <text class="text-base text-muted-foreground mb-6">暂无新版本公告</text>
      <view @click="goBack" class="px-6 py-2 bg-primary text-white rounded-full text-sm">返回</view>
    </view>

    <view v-else>
      <!-- 顶部装饰背景 -->
      <view class="relative h-48 overflow-hidden">
        <!-- 装饰图案 -->
        <view class="absolute inset-0 opacity-10">
          <view class="absolute top-4 left-4 w-20 h-20 border-2 border-primary rounded-full" />
          <view class="absolute top-12 right-8 w-12 h-12 border border-primary rounded-full" />
          <view class="absolute bottom-8 left-1/4 w-8 h-8 bg-primary rounded-full" />
          <view class="absolute top-20 right-1/3 w-6 h-6 bg-primary/50 rounded-full" />
        </view>

        <!-- Logo和版本 -->
        <view class="absolute inset-0 flex flex-col items-center justify-center">
          <view class="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <text class="text-2xl font-bold text-white">热卜</text>
          </view>
          <view class="text-center">
            <text class="text-xs text-muted-foreground block mb-1">版本更新</text>
            <text class="text-2xl font-bold text-primary">v{{ notice.version }}</text>
            <text v-if="notice.versionName" class="text-sm text-muted-foreground mt-1 block">{{ notice.versionName }}</text>
          </view>
        </view>

        <!-- 关闭/倒计时按钮 -->
        <view
          :class="['absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center', canClose ? 'bg-black/10' : 'bg-black/10']"
        >
          <text v-if="canClose" @click="handleClose" class="text-lg text-foreground">✕</text>
          <text v-else class="text-sm font-medium text-foreground">{{ countdown }}</text>
        </view>
      </view>

      <!-- 主要内容区 -->
      <view class="px-4 pb-24 -mt-6">
        <view class="bg-white rounded-2xl shadow-lg p-5">
          <!-- 标题 -->
          <view class="text-center mb-6">
            <text class="text-xl font-bold text-foreground block mb-2">{{ notice.title }}</text>
            <text v-if="notice.subtitle" class="text-sm text-muted-foreground">{{ notice.subtitle }}</text>
          </view>

          <!-- 维护时间提示 -->
          <view v-if="notice.maintenanceStart && notice.maintenanceEnd" class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <view class="flex items-center gap-2 text-amber-700">
              <text class="text-sm">🕐</text>
              <text class="text-sm font-medium">系统维护时间</text>
            </view>
            <text class="text-sm text-amber-600 mt-1 block pl-6">{{ notice.maintenanceStart }} ~ {{ notice.maintenanceEnd }}</text>
            <text class="text-xs text-amber-500 mt-1 block pl-6">维护期间部分功能可能无法使用，请提前做好准备</text>
          </view>

          <!-- 新功能 -->
          <view v-if="notice.features && notice.features.length > 0" class="mb-6">
            <view class="flex items-center gap-2 mb-3">
              <view class="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <text class="text-xs text-primary"></text>
              </view>
              <text class="text-base font-semibold text-foreground">新功能</text>
              <view class="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">{{ notice.features.length }}</view>
            </view>
            <view v-for="(item, index) in notice.features" :key="index" class="flex items-start gap-3 py-2">
              <view class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <text class="text-xs"></text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium text-foreground block">{{ item.title }}</text>
                <text v-if="item.description" class="text-xs text-muted-foreground mt-0.5 block">{{ item.description }}</text>
              </view>
            </view>
          </view>

          <!-- 体验优化 -->
          <view v-if="notice.optimizations && notice.optimizations.length > 0" class="mb-6">
            <view class="flex items-center gap-2 mb-3">
              <view class="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                <text class="text-xs text-blue-600">⚡</text>
              </view>
              <text class="text-base font-semibold text-foreground">体验优化</text>
              <view class="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">{{ notice.optimizations.length }}</view>
            </view>
            <view v-for="(item, index) in notice.optimizations" :key="index" class="flex items-start gap-3 py-2">
              <view class="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <text class="text-xs">⚡</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium text-foreground block">{{ item.title }}</text>
                <text v-if="item.description" class="text-xs text-muted-foreground mt-0.5 block">{{ item.description }}</text>
              </view>
            </view>
          </view>

          <!-- 问题修复 -->
          <view v-if="notice.fixes && notice.fixes.length > 0" class="mb-6">
            <view class="flex items-center gap-2 mb-3">
              <view class="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                <text class="text-xs text-green-600">🔧</text>
              </view>
              <text class="text-base font-semibold text-foreground">问题修复</text>
              <view class="bg-green-50 text-green-600 text-xs px-1.5 py-0.5 rounded">{{ notice.fixes.length }}</view>
            </view>
            <view v-for="(item, index) in notice.fixes" :key="index" class="flex items-start gap-3 py-2">
              <view class="w-7 h-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <text class="text-xs">🔧</text>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-medium text-foreground block">{{ item.title }}</text>
                <text v-if="item.description" class="text-xs text-muted-foreground mt-0.5 block">{{ item.description }}</text>
              </view>
            </view>
          </view>

          <!-- 发布时间 -->
          <view class="text-center pt-4 border-t border-border">
            <text class="text-xs text-muted-foreground">发布于 {{ notice.publishedAt }}</text>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view class="fixed bottom-0 left-0 right-0 px-4 py-4 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5] to-transparent">
        <view
          @click="handleClose"
          :class="['w-full py-3.5 rounded-full text-base font-medium flex items-center justify-center gap-2', canClose ? 'bg-primary text-white shadow-lg' : 'bg-muted text-muted-foreground']"
        >
          <text v-if="canClose">✓</text>
          <text v-else>🕐</text>
          <text>{{ canClose ? '我知道了' : `请等待 ${countdown} 秒` }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface UpgradeItem {
  title: string
  description?: string
  type: 'feature' | 'optimization' | 'fix' | 'security'
}

interface UpgradeNotice {
  id: number
  version: string
  versionName?: string
  title: string
  subtitle?: string
  mode: 'optional' | 'forced'
  forcedCountdown?: number
  publishedAt: string
  maintenanceStart?: string
  maintenanceEnd?: string
  features: UpgradeItem[]
  optimizations: UpgradeItem[]
  fixes: UpgradeItem[]
}

const notice = ref<UpgradeNotice | null>(null)
const isLoading = ref(true)
const countdown = ref(0)
const canClose = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

async function loadNotice() {
  isLoading.value = true
  try {
    const response = await getLatestUpgradeNotice()
    if (response.code === 200 && response.data) {
      notice.value = response.data
      if (response.data.mode === 'forced' && response.data.forcedCountdown) {
        countdown.value = response.data.forcedCountdown
        canClose.value = false
      } else {
        canClose.value = true
      }
    }
  } finally {
    isLoading.value = false
  }
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    if (countdown.value <= 1) {
      canClose.value = true
      countdown.value = 0
      if (countdownTimer) clearInterval(countdownTimer)
    } else {
      countdown.value--
    }
  }, 1000)
}

async function handleClose() {
  if (!canClose.value || !notice.value) return
  await markUpgradeNoticeRead(notice.value.id)
  goBack()
}

function goBack() { uni.navigateBack() }

// API 桩函数
async function getLatestUpgradeNotice(): Promise<any> {
  return { code: 200, data: null }
}
async function markUpgradeNoticeRead(id: number): Promise<any> {
  return { code: 200 }
}

onMounted(() => {
  loadNotice()
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
