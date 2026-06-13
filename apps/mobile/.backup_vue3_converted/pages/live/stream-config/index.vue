<template>
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 h-14" />
    <view class="p-4 space-y-4">
      <view v-for="i in 3" :key="i" class="bg-white rounded-2xl h-32 animate-pulse" />
    </view>
  </view>

  <view v-else-if="!config" class="min-h-screen bg-background flex items-center justify-center">
    <view class="text-center">
      <text class="text-muted-foreground block">加载失败</text>
      <text @click="goBack" class="mt-4 text-primary block">返回</text>
    </view>
  </view>

  <view v-else class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-2xl text-foreground">←</text>
        </view>
        <text class="text-lg font-semibold text-foreground">推流配置</text>
        <view class="w-6" />
      </view>
    </view>

    <view class="p-4 space-y-4">
      <!-- 直播间信息 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center gap-3">
          <view class="w-12 h-12 bg-gradient-to-br from-primary to-[#E8546D] rounded-xl flex items-center justify-center">
            <text class="text-white text-2xl">🖥</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="font-semibold text-foreground truncate block">{{ config.roomTitle }}</text>
            <text class="text-sm text-muted-foreground block">直播间ID: {{ config.roomId }}</text>
          </view>
        </view>
      </view>

      <!-- 推流状态 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view v-if="status?.isStreaming" class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <text class="text-green-600 text-xl">📶</text>
            </view>
            <view v-else class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <text class="text-muted-foreground text-xl">📵</text>
            </view>
            <view v-if="status?.isStreaming">
              <text class="font-medium text-green-600 block">推流中</text>
              <text class="text-sm text-muted-foreground block">{{ status.viewers || 0 }}人观看 · {{ status.bitrate || 0 }} Kbps</text>
            </view>
            <view v-else>
              <text class="font-medium text-ink-soft block">未推流</text>
              <text class="text-sm text-muted-foreground block">等待OBS连接</text>
            </view>
          </view>
          <view
            @click="checkStatus"
            :class="['flex items-center gap-1 px-3 py-1.5 text-sm text-primary border border-primary rounded-full', checkingStatus ? 'opacity-50' : '']"
          >
            <text :class="checkingStatus ? 'animate-spin' : ''"></text>
            <text>刷新</text>
          </view>
        </view>

        <view v-if="status?.isStreaming" class="mt-4 pt-4 border-t border-border">
          <view class="aspect-video bg-black rounded-xl overflow-hidden relative">
            <view class="absolute inset-0 flex items-center justify-center text-white/50">
              直播预览
            </view>
            <view class="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
              <view class="w-2 h-2 bg-white rounded-full animate-pulse" />
              <text>LIVE</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 推流地址和密钥 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <text class="font-semibold text-foreground flex items-center gap-2">
          <text class="text-primary">⚙</text>
          推流信息
        </text>

        <!-- 推流地址 -->
        <view>
          <text class="text-sm text-ink-soft mb-1.5 block">推流地址（服务器）</text>
          <view class="flex items-center gap-2">
            <view class="flex-1 bg-background rounded-lg px-3 py-2.5 font-mono text-sm text-foreground break-all">
              {{ config.streamUrl }}
            </view>
            <view
              @click="copyText(config.streamUrl, 'url')"
              :class="['shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors', copiedUrl ? 'bg-green-100 text-green-600' : 'bg-background text-ink-soft']"
            >
              <text>{{ copiedUrl ? '✓' : '' }}</text>
            </view>
          </view>
        </view>

        <!-- 推流密钥 -->
        <view>
          <text class="text-sm text-ink-soft mb-1.5 block">推流密钥（串流密钥）</text>
          <view class="flex items-center gap-2">
            <view class="flex-1 bg-background rounded-lg px-3 py-2.5 font-mono text-sm text-foreground break-all">
              {{ showKey ? config.streamKey : '••••••••••••••••••••••' }}
            </view>
            <view
              @click="showKey = !showKey"
              class="shrink-0 w-10 h-10 bg-background rounded-lg flex items-center justify-center text-ink-soft"
            >
              <text>{{ showKey ? '🙈' : '' }}</text>
            </view>
            <view
              @click="copyText(config.streamKey, 'key')"
              :class="['shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors', copiedKey ? 'bg-green-100 text-green-600' : 'bg-background text-ink-soft']"
            >
              <text>{{ copiedKey ? '✓' : '' }}</text>
            </view>
          </view>
          <text class="text-xs text-orange-500 mt-1.5 block">请勿泄露推流密钥，否则他人可能冒用您的直播间</text>
        </view>
      </view>

      <!-- 推荐参数 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <text class="font-semibold text-foreground mb-3 block">推荐参数设置</text>
        <view class="grid grid-cols-2 gap-3">
          <view class="bg-background rounded-xl p-3">
            <text class="text-xs text-muted-foreground block">分辨率</text>
            <text class="font-medium text-foreground block">{{ config.recommendedSettings.resolution }}</text>
          </view>
          <view class="bg-background rounded-xl p-3">
            <text class="text-xs text-muted-foreground block">比特率</text>
            <text class="font-medium text-foreground block">{{ config.recommendedSettings.bitrate }}</text>
          </view>
          <view class="bg-background rounded-xl p-3">
            <text class="text-xs text-muted-foreground block">帧率</text>
            <text class="font-medium text-foreground block">{{ config.recommendedSettings.fps }} fps</text>
          </view>
          <view class="bg-background rounded-xl p-3">
            <text class="text-xs text-muted-foreground block">编码器</text>
            <text class="font-medium text-foreground block">{{ config.recommendedSettings.encoder }}</text>
          </view>
        </view>
      </view>

      <!-- OBS配置步骤 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-4">
          <text class="font-semibold text-foreground">OBS配置教程</text>
          <view @click="downloadOBS" class="text-sm text-primary flex items-center gap-1">
            <text>下载OBS</text>
            <text>↗</text>
          </view>
        </view>

        <!-- 步骤指示器 -->
        <view class="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
          <view
            v-for="(_, index) in obsSteps"
            :key="index"
            @click="currentStep = index"
            :class="['shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors', index === currentStep ? 'bg-primary text-white' : index < currentStep ? 'bg-green-100 text-green-600' : 'bg-background text-muted-foreground']"
          >
            <text v-if="index < currentStep">✓</text>
            <text v-else>{{ index + 1 }}</text>
          </view>
        </view>

        <!-- 当前步骤内容 -->
        <view class="bg-background rounded-xl p-4">
          <view class="aspect-video bg-[#E8E0D5] rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
            步骤 {{ currentStep + 1 }} 示意图
          </view>
          <text class="font-medium text-foreground mb-1 block">
            步骤 {{ currentStep + 1 }}: {{ obsSteps[currentStep].title }}
          </text>
          <text class="text-sm text-ink-soft block">{{ obsSteps[currentStep].description }}</text>
        </view>

        <!-- 步骤导航 -->
        <view class="flex items-center justify-between mt-4">
          <view
            @click="currentStep = Math.max(0, currentStep - 1)"
            :class="['px-4 py-2 text-sm', currentStep === 0 ? 'text-muted-foreground' : 'text-ink-soft']"
          >
            上一步
          </view>
          <view
            @click="currentStep = Math.min(obsSteps.length - 1, currentStep + 1)"
            :class="['px-4 py-2 text-sm font-medium', currentStep === obsSteps.length - 1 ? 'text-muted-foreground' : 'text-primary']"
          >
            下一步
          </view>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <text class="font-semibold text-foreground mb-3 block">常见问题</text>
        <view class="space-y-3">
          <view class="bg-background rounded-xl p-3">
            <text class="font-medium text-foreground text-sm mb-1 block">推流失败怎么办？</text>
            <text class="text-xs text-ink-soft block">请检查网络连接、推流地址和密钥是否正确，确保防火墙未阻止OBS</text>
          </view>
          <view class="bg-background rounded-xl p-3">
            <text class="font-medium text-foreground text-sm mb-1 block">画面卡顿怎么办？</text>
            <text class="text-xs text-ink-soft block">尝试降低比特率或分辨率，检查上行带宽是否足够</text>
          </view>
          <view class="bg-background rounded-xl p-3">
            <text class="font-medium text-foreground text-sm mb-1 block">可以使用其他推流软件吗？</text>
            <text class="text-xs text-ink-soft block">支持任何RTMP推流软件，如Streamlabs、XSplit等</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface StreamConfig {
  roomId: string; roomTitle: string; streamUrl: string; streamKey: string; playUrl: string
  recommendedSettings: { resolution: string; bitrate: string; fps: string; encoder: string }
}

interface StreamStatus {
  roomId: string; isStreaming: boolean; viewers?: number; bitrate?: number
}

const mockConfig: StreamConfig = {
  roomId: 'room1',
  roomTitle: '周易六十四卦深度解读',
  streamUrl: 'rtmp://live.rebu.com/live',
  streamKey: 'stream_key_abc123xyz789',
  playUrl: 'https://live.rebu.com/play/room1.flv',
  recommendedSettings: { resolution: '1920x1080', bitrate: '4000-6000 Kbps', fps: '30', encoder: 'x264 / NVENC' }
}

const obsSteps = [
  { title: '打开OBS Studio', description: '下载并安装最新版OBS Studio，打开软件' },
  { title: '进入推流设置', description: '点击「设置」→「推流」，服务选择「自定义」' },
  { title: '填写推流信息', description: '将下方的「推流地址」填入服务器，「推流密钥」填入串流密钥' },
  { title: '配置视频参数', description: '点击「输出」→「流」，设置编码器和比特率；点击「视频」设置分辨率' },
  { title: '开始推流', description: '点击主界面的「开始推流」按钮，等待连接成功后即可开播' },
]

const loading = ref(true)
const config = ref<StreamConfig | null>(null)
const status = ref<StreamStatus | null>(null)
const showKey = ref(false)
const copiedUrl = ref(false)
const copiedKey = ref(false)
const checkingStatus = ref(false)
const currentStep = ref(0)

onMounted(() => {
  setTimeout(() => {
    config.value = mockConfig
    status.value = { roomId: 'room1', isStreaming: false }
    loading.value = false
  }, 500)
})

function copyText(text: string, type: 'url' | 'key') {
  uni.setClipboardData({
    data: text,
    success: () => {
      if (type === 'url') {
        copiedUrl.value = true
        setTimeout(() => { copiedUrl.value = false }, 2000)
      } else {
        copiedKey.value = true
        setTimeout(() => { copiedKey.value = false }, 2000)
      }
      uni.showToast({ title: '已复制', icon: 'success' })
    }
  })
}

function checkStatus() {
  checkingStatus.value = true
  setTimeout(() => {
    status.value = { roomId: 'room1', isStreaming: Math.random() > 0.5 }
    checkingStatus.value = false
  }, 1500)
}

function downloadOBS() {
  uni.setClipboardData({ data: 'https://obsproject.com/download', success: () => {
    uni.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'success' })
  }})
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
