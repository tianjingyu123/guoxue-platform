<template>
  <view class="min-h-screen bg-background">
    <!-- 加载骨架屏 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-12 bg-muted rounded-lg" />
      <view class="h-10 bg-muted rounded-lg" />
      <view class="h-80 bg-muted rounded-xl" />
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <view class="flex items-center justify-between px-4 h-12">
          <view class="p-2 -ml-2 rounded-full" @tap="goBack">
            <text class="text-xl text-foreground">←</text>
          </view>
          <text class="font-semibold text-base text-foreground">错误页面演示</text>
          <view class="w-9" />
        </view>
      </view>

      <!-- 类型选择 -->
      <view class="px-4 py-4">
        <text class="text-xs text-muted-foreground mb-3 block">选择错误类型：</text>
        <view class="flex flex-wrap gap-2">
          <view
            v-for="type in types" :key="type"
            class="px-4 py-2 rounded-full text-sm font-medium transition-colors"
            :class="activeType === type ? 'bg-primary text-white' : 'bg-secondary text-foreground'"
            @tap="activeType = type"
          >
            <text>{{ errorConfigs[type].title }}</text>
          </view>
        </view>
      </view>

      <!-- 错误页面预览 -->
      <view class="border-t border-border flex-1">
        <view class="min-h-[70vh] bg-background flex flex-col items-center justify-center px-6 py-10">
          <!-- 错误图标 -->
          <view class="w-28 h-28 rounded-full flex items-center justify-center mb-6" :class="errorConfigs[activeType].iconBg">
            <text class="text-5xl">{{ errorConfigs[activeType].icon }}</text>
          </view>

          <!-- 错误码 -->
          <text class="text-4xl font-black text-foreground mb-2">{{ errorConfigs[activeType].code }}</text>

          <!-- 错误信息 -->
          <text class="text-lg font-semibold text-foreground mb-2">{{ errorConfigs[activeType].title }}</text>
          <text class="text-sm text-muted-foreground text-center mb-8 max-w-xs leading-relaxed">{{ errorConfigs[activeType].description }}</text>

          <!-- 建议 -->
          <view class="bg-white border border-border rounded-xl p-4 w-full max-w-xs mb-8">
            <text class="text-xs font-medium text-foreground block mb-2"> 您可以尝试：</text>
            <text class="text-xs text-muted-foreground block leading-relaxed">{{ errorConfigs[activeType].suggestion }}</text>
          </view>

          <!-- 操作按钮 -->
          <view class="flex flex-col gap-3 w-full max-w-xs">
            <view
              class="w-full py-3 rounded-xl bg-primary text-white text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              @tap="handlePrimary"
            >
              <text class="text-base">{{ errorConfigs[activeType].primaryIcon }}</text>
              <text>{{ errorConfigs[activeType].primaryAction }}</text>
            </view>
            <view
              class="w-full py-3 rounded-xl border border-border text-center text-sm font-medium text-foreground bg-white"
              @tap="handleSecondary"
            >
              <text>{{ errorConfigs[activeType].secondaryAction }}</text>
            </view>
          </view>

          <!-- 页脚 -->
          <text class="text-[10px] text-[#ccc] mt-8">如果问题持续，请联系客服 help@rebugx.cn</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 500)
})

type ErrorType = 'network' | 'server' | 'notfound' | 'forbidden' | 'timeout'

interface ErrorConfig {
  icon: string
  code: string
  iconColor: string
  iconBg: string
  title: string
  description: string
  suggestion: string
  primaryAction: string
  primaryIcon: string
  secondaryAction: string
}

const errorConfigs: Record<string, ErrorConfig> = {
  network: {
    icon: '📶',
    code: 'NET-001',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50',
    title: '网络连接异常',
    description: '您的网络似乎出现了问题，请检查网络连接后重试。',
    suggestion: '1. 检查Wi-Fi或移动数据是否开启\n2. 尝试切换网络环境\n3. 关闭飞行模式后重试',
    primaryAction: '重新加载',
    primaryIcon: '',
    secondaryAction: '返回首页'
  },
  server: {
    icon: '🖥',
    code: '500',
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    title: '服务器开小差了',
    description: '我们的服务器暂时无法处理您的请求，请稍后再试。技术人员已在处理。',
    suggestion: '1. 请等待1-2分钟后再试\n2. 清除浏览器缓存\n3. 如果持续出现请联系客服',
    primaryAction: '重试',
    primaryIcon: '',
    secondaryAction: '联系客服'
  },
  notfound: {
    icon: '',
    code: '404',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
    title: '页面不存在',
    description: '您访问的页面已被移除、更名或暂时不可用。请检查链接是否正确。',
    suggestion: '1. 检查URL是否输入正确\n2. 从导航菜单重新进入\n3. 搜索您需要的内容',
    primaryAction: '返回首页',
    primaryIcon: '🏠',
    secondaryAction: '搜索内容'
  },
  forbidden: {
    icon: '',
    code: '403',
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-50',
    title: '无访问权限',
    description: '您没有权限访问此内容，可能需要登录或升级您的会员等级。',
    suggestion: '1. 请先登录您的账号\n2. 升级会员以获取更多权限\n3. 联系管理员申请权限',
    primaryAction: '去登录',
    primaryIcon: '',
    secondaryAction: '开通会员'
  },
  timeout: {
    icon: '',
    code: '408',
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-50',
    title: '请求超时',
    description: '服务器响应时间过长，可能由于网络问题或服务器负载过高。',
    suggestion: '1. 检查您的网络连接速度\n2. 刷新页面重试\n3. 错峰访问减少服务器压力',
    primaryAction: '刷新重试',
    primaryIcon: '',
    secondaryAction: '返回上页'
  }
}

const activeType = ref<ErrorType>('network')
const types: ErrorType[] = ['network', 'server', 'notfound', 'forbidden', 'timeout']

function goBack() { uni.navigateBack() }

const handlePrimary = () => {
  const cfg = errorConfigs[activeType.value]
  if (activeType.value === 'forbidden') {
    uni.navigateTo({ url: '/pages/auth/login' })
  } else if (activeType.value === 'notfound') {
    uni.navigateTo({ url: '/pages/index/index' })
  } else if (activeType.value === 'server') {
    uni.showToast({ title: '正在重试...', icon: 'none' })
  } else {
    uni.showToast({ title: cfg.primaryAction, icon: 'none' })
  }
}

const handleSecondary = () => {
  const cfg = errorConfigs[activeType.value]
  if (cfg.secondaryAction === '联系客服') {
    uni.showToast({ title: '客服热线: 400-123-4567', icon: 'none' })
  } else if (cfg.secondaryAction === '搜索内容') {
    uni.navigateTo({ url: '/pages/search/index' })
  } else if (cfg.secondaryAction === '开通会员') {
    uni.navigateTo({ url: '/pages/vip/index' })
  } else {
    uni.showToast({ title: cfg.secondaryAction, icon: 'none' })
  }
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
