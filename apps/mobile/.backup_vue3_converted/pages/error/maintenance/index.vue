<template>
  <view class="min-h-screen bg-gradient-to-b from-orange-50 to-background flex flex-col">
    <view v-if="loading" class="min-h-screen bg-background flex items-center justify-center">
      <view class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </view>
    <template v-else>
      <!-- 主内容 -->
      <view class="flex-1 flex flex-col items-center justify-center p-6">
        <!-- 维护图标 -->
        <view class="relative mb-8">
          <view class="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center">
            <text class="w-16 h-16 text-orange-500">🔧</text>
          </view>
          <!-- 旋转齿轮动画 -->
          <view class="absolute -right-2 -top-2 w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center" style="animation: spin 3s linear infinite">
            <text class="w-8 h-8 text-orange-600">⚙</text>
          </view>
        </view>

        <!-- 标题 -->
        <text class="text-2xl font-bold text-foreground mb-2">{{ info?.title || '系统维护中' }}</text>

        <!-- 维护说明 -->
        <text class="text-muted-foreground text-center max-w-sm mb-6">{{ info?.message }}</text>

        <!-- 进度条 -->
        <view v-if="info?.progress !== undefined" class="w-full max-w-xs mb-6">
          <view class="flex items-center justify-between text-sm mb-2">
            <text class="text-muted-foreground">升级进度</text>
            <text class="text-primary font-medium">{{ info.progress }}%</text>
          </view>
          <view class="h-2 bg-muted rounded-full overflow-hidden">
            <view class="h-full bg-gradient-to-r from-orange-400 to-primary rounded-full transition-all duration-500" :style="{ width: info.progress + '%' }" />
          </view>
        </view>

        <!-- 预计恢复时间 -->
        <view class="bg-white rounded-xl p-4 shadow-sm border border-border w-full max-w-sm mb-6">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <text class="w-5 h-5 text-primary">🕐</text>
            </view>
            <view class="flex-1">
              <text class="text-sm text-muted-foreground">预计恢复时间</text>
              <text class="font-semibold text-foreground">{{ info?.estimatedEndTime }}</text>
            </view>
            <view v-if="countdown" class="text-right">
              <text class="text-xs text-muted-foreground">剩余</text>
              <text class="text-sm font-medium text-primary">{{ countdown }}</text>
            </view>
          </view>
        </view>

        <!-- 受影响的服务 -->
        <view v-if="info?.affectedServices && info.affectedServices.length > 0" class="w-full max-w-sm mb-6">
          <text class="text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <text class="w-4 h-4"></text>
            本次维护影响以下服务
          </text>
          <view class="flex flex-wrap gap-2">
            <text v-for="(service, index) in info.affectedServices" :key="index" class="px-3 py-1 bg-orange-50 text-orange-600 text-sm rounded-full">{{ service }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="flex flex-col gap-3 w-full max-w-xs">
          <view class="w-full py-3 rounded-lg bg-primary text-white text-center text-sm font-medium" :class="checking ? 'opacity-50' : ''" @tap="checkStatus">
            <text v-if="checking" class="flex items-center justify-center gap-2">
              <text class="w-4 h-4 animate-spin"></text>
              检查中...
            </text>
            <text v-else class="flex items-center justify-center gap-2">
              <text class="w-4 h-4"></text>
              检查是否恢复
            </text>
          </view>

          <view v-if="info?.announcementId" class="w-full py-3 rounded-lg border border-border text-center text-sm flex items-center justify-center gap-2" @tap="goTo('/pages/notice/' + info.announcementId)">
            <text class="w-4 h-4"></text>
            查看维护公告
            <text class="w-4 h-4">›</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="p-6 text-center">
        <view class="bg-green-50 rounded-lg p-4 max-w-sm mx-auto">
          <view class="flex items-start gap-3">
            <text class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5">✓</text>
            <view class="text-left">
              <text class="text-sm font-medium text-green-700">维护完成后将自动跳转</text>
              <text class="text-xs text-green-600 mt-1 block">系统会每分钟自动检查维护状态，恢复后将自动返回首页</text>
            </view>
          </view>
        </view>

        <text class="text-xs text-muted-foreground mt-4 block">如有紧急问题，请联系客服：400-888-8888</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, onUnmounted } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

interface MaintenanceInfo {
  isUnderMaintenance: boolean
  title: string
  message: string
  estimatedEndTime: string
  affectedServices: string[]
  announcementId?: number
  progress?: number
}

// Mock 维护信息
const mockMaintenanceInfo: MaintenanceInfo = {
  isUnderMaintenance: true,
  title: '系统升级维护中',
  message: '我们正在进行系统升级，以提供更好的服务体验。给您带来的不便，敬请谅解。',
  estimatedEndTime: '2026-06-03 18:00',
  affectedServices: ['课程播放', '在线支付', '排盘工具', '社区互动'],
  announcementId: 1001,
  progress: 65,
}

// 组件逻辑
const info = ref<MaintenanceInfo | null>(null)
const loading = ref(true)
const checking = ref(false)
const countdown = ref('')

// 加载维护信息
onMounted(() => {
  const loadInfo = async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    info.value = mockMaintenanceInfo
    loading.value = false
  }
  loadInfo()
})

// 计算倒计时
watch(() => info.value?.estimatedEndTime, (newVal) => {
  if (!newVal) return

  const updateCountdown = () => {
    const end = new Date(info.value!.estimatedEndTime).getTime()
    const now = Date.now()
    const diff = end - now

    if (diff <= 0) {
      countdown.value = '即将恢复'
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    if (hours > 0) {
      countdown.value = `${hours}小时${minutes}分钟`
    } else if (minutes > 0) {
      countdown.value = `${minutes}分${seconds}秒`
    } else {
      countdown.value = `${seconds}秒`
    }
  }

  updateCountdown()
  const timer = setInterval(updateCountdown, 1000)
  onUnmounted(() => clearInterval(timer))
}, { immediate: false })

// 检查维护状态
const checkStatus = async () => {
  checking.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))

  // 模拟：随机决定是否维护结束
  const isStillMaintaining = Math.random() > 0.3

  if (!isStillMaintaining) {
    uni.navigateBack()
  } else {
    checking.value = false
  }
}

// 定期自动检查
let autoCheckTimer: ReturnType<typeof setInterval> | null = null
watch([checking], () => {
  autoCheckTimer = setInterval(() => {
    if (!checking.value) {
      checkStatus()
    }
  }, 60000) // 每分钟检查一次
  onUnmounted(() => {
    if (autoCheckTimer) clearInterval(autoCheckTimer)
  })
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>