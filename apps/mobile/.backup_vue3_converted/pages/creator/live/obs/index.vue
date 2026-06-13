<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1">
            <text class="text-lg text-foreground">&#8592;</text>
          </view>
          <text class="text-base font-semibold text-foreground">OBS推流设置</text>
        </view>
        <view @click="handleDownload" class="px-2.5 py-1.5 text-xs rounded-lg border border-border flex items-center gap-1 text-foreground">
          <text>&#128279;</text>
          <text>下载OBS</text>
        </view>
      </view>
    </header>

    <view class="px-4 pt-4 space-y-4">
      <!-- 推流状态卡片 -->
      <view :class="['p-4 rounded-xl border-2', streamStatus === 'online' ? 'border-green-500/30 bg-green-500/5' : streamStatus === 'connecting' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-white']">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text v-if="streamStatus === 'online'" class="text-green-500 text-lg">&#128246;</text>
            <text v-else-if="streamStatus === 'connecting'" class="text-amber-500 text-lg" :class="{ 'animate-pulse': true }">&#128246;</text>
            <text v-else class="text-muted-foreground text-lg">&#128245;</text>
            <text class="font-semibold text-foreground">推流状态</text>
          </view>
          <text :class="['text-xs px-2 py-0.5 rounded-full text-white', streamStatus === 'online' ? 'bg-green-500' : streamStatus === 'connecting' ? 'bg-amber-500' : 'bg-muted text-muted-foreground']">
            {{ streamStatus === 'online' ? '推流中' : streamStatus === 'connecting' ? '连接中' : '离线' }}
          </text>
        </view>

        <!-- 推流中状态指标 -->
        <view v-if="streamStatus === 'online'">
          <view class="grid grid-cols-4 gap-3">
            <view class="text-center p-2 rounded-lg bg-white">
              <view class="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <text class="text-[10px]">&#128339;</text>
                <text class="text-[10px]">时长</text>
              </view>
              <text class="text-sm font-bold font-mono text-foreground">{{ formatDuration(duration) }}</text>
            </view>
            <view class="text-center p-2 rounded-lg bg-white">
              <view class="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <text class="text-[10px]">&#128200;</text>
                <text class="text-[10px]">帧率</text>
              </view>
              <text class="text-sm font-bold text-foreground">{{ streamData.fps }} fps</text>
            </view>
            <view class="text-center p-2 rounded-lg bg-white">
              <view class="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <text class="text-[10px]">&#128200;</text>
                <text class="text-[10px]">码率</text>
              </view>
              <text class="text-sm font-bold text-foreground">{{ streamData.bitrate }} kbps</text>
            </view>
            <view class="text-center p-2 rounded-lg bg-white">
              <view class="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <text class="text-[10px]">&#128187;</text>
                <text class="text-[10px]">分辨率</text>
              </view>
              <text class="text-sm font-bold text-foreground">{{ streamData.resolution }}</text>
            </view>
          </view>

          <!-- 丢帧率 -->
          <view class="mt-3 pt-3 border-t border-border">
            <view class="flex items-center justify-between text-xs">
              <text class="text-muted-foreground">丢帧率</text>
              <text>
                <text :class="['font-medium', (streamData.droppedFrames / streamData.totalFrames) < 0.001 ? 'text-green-500' : 'text-amber-500']">{{ ((streamData.droppedFrames / streamData.totalFrames) * 100).toFixed(3) }}%</text>
                <text class="text-muted-foreground ml-1">({{ streamData.droppedFrames }}帧)</text>
              </text>
            </view>
          </view>
        </view>

        <!-- 离线状态提示 -->
        <text v-if="streamStatus === 'offline'" class="text-sm text-muted-foreground block">当前未检测到推流，请在OBS中开始推流</text>

        <!-- 连接中 -->
        <text v-if="streamStatus === 'connecting'" class="text-sm text-amber-600 block">正在检测推流信号，请稍候...</text>
      </view>

      <!-- 推流地址信息 -->
      <view class="p-4 rounded-xl bg-white border border-border">
        <text class="font-semibold text-foreground mb-4 flex items-center gap-2">
          <text class="text-primary">&#9881;</text>
          <text>推流配置信息</text>
        </text>

        <view class="space-y-4">
          <!-- 服务器地址 -->
          <view>
            <text class="text-xs text-muted-foreground mb-1.5 block">服务器地址（Server URL）</text>
            <view class="flex gap-2">
              <input disabled :value="streamData.serverUrl" class="flex-1 h-10 px-3 text-sm font-mono bg-secondary/50 rounded-lg border border-transparent text-foreground" />
              <view @click="copyToClipboard(streamData.serverUrl, 'server')" class="w-10 h-10 rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                <text v-if="copiedField === 'server'" class="text-green-500">&#10003;</text>
                <text v-else class="text-muted-foreground">&#128203;</text>
              </view>
            </view>
          </view>

          <!-- 串流密钥 -->
          <view>
            <text class="text-xs text-muted-foreground mb-1.5 block">串流密钥（Stream Key）</text>
            <view class="flex gap-2">
              <view class="relative flex-1">
                <input disabled :type="showStreamKey ? 'text' : 'password'" :value="streamData.streamKey" class="w-full h-10 px-3 text-sm font-mono bg-secondary/50 rounded-lg border border-transparent text-foreground pr-10" />
                <view @click="showStreamKey = !showStreamKey" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <text class="text-sm text-muted-foreground">{{ showStreamKey ? '&#128065;' : '&#128064;' }}</text>
                </view>
              </view>
              <view @click="copyToClipboard(streamData.streamKey, 'key')" class="w-10 h-10 rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                <text v-if="copiedField === 'key'" class="text-green-500">&#10003;</text>
                <text v-else class="text-muted-foreground">&#128203;</text>
              </view>
            </view>
          </view>

          <!-- 重新生成 -->
          <view class="flex items-center justify-between pt-2">
            <text class="text-xs text-muted-foreground">密钥泄露？点击重新生成</text>
            <view @click="showResetDialog = true" class="px-3 py-1.5 rounded-lg border border-border text-xs flex items-center gap-1.5 text-foreground">
              <text>&#128260;</text>
              <text>重新生成</text>
            </view>
          </view>
        </view>
      </view>

      <!-- OBS配置引导 -->
      <view class="p-4 rounded-xl bg-white border border-border">
        <text class="font-semibold text-foreground mb-3 flex items-center gap-2">
          <text class="text-blue-500">&#8505;&#65039;</text>
          <text>OBS配置指南</text>
        </text>

        <view class="space-y-3">
          <view v-for="(item) in obsSteps" :key="item.step" class="flex gap-3">
            <view class="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              <text>{{ item.step }}</text>
            </view>
            <view class="flex-1 pt-0.5">
              <text class="text-sm font-medium text-foreground block">{{ item.title }}</text>
              <text class="text-xs text-muted-foreground block mt-0.5">{{ item.desc }}</text>
            </view>
          </view>
        </view>

        <view class="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <view class="flex items-start gap-2">
            <text class="text-amber-500 flex-shrink-0 mt-0.5">&#9888;&#65039;</text>
            <view class="text-xs">
              <text class="font-medium text-amber-600 block">安全提示</text>
              <text class="text-muted-foreground block mt-0.5">请勿将串流密钥分享给他人，泄露可能导致直播间被盗用。如已泄露，请立即重新生成。</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 画质配置建议 -->
      <view class="p-4 rounded-xl bg-white border border-border">
        <text class="font-semibold text-foreground mb-3 flex items-center gap-2">
          <text class="text-amber-500">&#9889;</text>
          <text>画质配置建议</text>
        </text>
        <text class="text-xs text-muted-foreground mb-3 block">根据您的网络情况选择合适的画质配置</text>

        <view class="space-y-2">
          <view v-for="preset in qualityPresets" :key="preset.id"
            @click="selectedQuality = preset.id"
            :class="['w-full p-3 rounded-lg border-2 text-left transition-all', selectedQuality === preset.id ? 'border-primary bg-primary/5' : 'border-border']">
            <view class="flex items-center justify-between mb-2">
              <view class="flex items-center gap-2">
                <text class="font-medium text-sm text-foreground">{{ preset.name }}</text>
                <text v-if="preset.recommended" class="text-[10px] px-1.5 py-0.5 rounded bg-green-500 text-white">推荐</text>
              </view>
              <view :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center', selectedQuality === preset.id ? 'border-primary bg-primary' : 'border-[#999]/30']">
                <text v-if="selectedQuality === preset.id" class="text-white text-xs">&#10003;</text>
              </view>
            </view>
            <text class="text-xs text-muted-foreground mb-2 block">{{ preset.desc }}</text>
            <view class="grid grid-cols-4 gap-2 text-xs">
              <view>
                <text class="text-muted-foreground block">分辨率</text>
                <text class="font-medium text-foreground block">{{ preset.resolution }}</text>
              </view>
              <view>
                <text class="text-muted-foreground block">码率</text>
                <text class="font-medium text-foreground block">{{ preset.bitrate }}</text>
              </view>
              <view>
                <text class="text-muted-foreground block">帧率</text>
                <text class="font-medium text-foreground block">{{ preset.fps }}fps</text>
              </view>
              <view>
                <text class="text-muted-foreground block">网络要求</text>
                <text class="font-medium text-foreground block">{{ preset.network }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 网络测速入口 -->
        <view class="mt-4 p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
          <view class="flex items-center gap-2">
            <text class="text-primary">&#128246;</text>
            <text class="text-sm text-foreground">不确定网络情况？</text>
          </view>
          <view @click="handleSpeedTest" class="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground">测试网速</view>
        </view>
      </view>

      <!-- OBS输出设置建议 -->
      <view class="p-4 rounded-xl bg-white border border-border">
        <text class="font-semibold text-foreground mb-3 flex items-center gap-2">
          <text class="text-cyan-500">&#128187;</text>
          <text>OBS输出设置参考</text>
        </text>
        <view class="space-y-3 text-sm">
          <view class="flex justify-between py-2 border-b border-border">
            <text class="text-muted-foreground">输出模式</text>
            <text class="font-medium text-foreground">高级</text>
          </view>
          <view class="flex justify-between py-2 border-b border-border">
            <text class="text-muted-foreground">编码器</text>
            <text class="font-medium text-foreground">x264 / NVENC（N卡推荐）</text>
          </view>
          <view class="flex justify-between py-2 border-b border-border">
            <text class="text-muted-foreground">码率控制</text>
            <text class="font-medium text-foreground">CBR（恒定码率）</text>
          </view>
          <view class="flex justify-between py-2 border-b border-border">
            <text class="text-muted-foreground">关键帧间隔</text>
            <text class="font-medium text-foreground">2秒</text>
          </view>
          <view class="flex justify-between py-2 border-b border-border">
            <text class="text-muted-foreground">CPU预设</text>
            <text class="font-medium text-foreground">veryfast</text>
          </view>
          <view class="flex justify-between py-2">
            <text class="text-muted-foreground">音频采样率</text>
            <text class="font-medium text-foreground">44.1kHz / 48kHz</text>
          </view>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="p-4 rounded-xl bg-white border border-border">
        <text class="font-semibold text-foreground mb-3 block">常见问题</text>
        <view class="space-y-3">
          <view v-for="(faq, idx) in faqList" :key="idx">
            <view @click="toggleFaq(idx)" class="flex items-center justify-between py-2 text-sm cursor-pointer">
              <text class="text-foreground">{{ faq.q }}</text>
              <text :class="['text-muted-foreground transition-transform duration-200', faq.open ? '-rotate-90' : 'rotate-90']">&#8249;</text>
            </view>
            <text v-if="faq.open" class="text-xs text-muted-foreground pb-2 block pl-2 leading-relaxed">{{ faq.a }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 重新生成确认对话框 -->
    <view v-if="showResetDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <view class="mx-4 w-[320px] bg-white rounded-2xl overflow-hidden">
        <view class="p-6">
          <text class="text-base font-semibold text-foreground block mb-2">重新生成串流密钥？</text>
          <text class="text-sm text-muted-foreground leading-relaxed block">重新生成后，旧密钥将立即失效。如果正在推流，将会断开连接，需要使用新密钥重新配置OBS。</text>
        </view>
        <view class="flex border-t border-border">
          <view @click="isResetting ? null : (showResetDialog = false)" :class="['flex-1 py-3 text-center text-sm font-medium border-r border-border', isResetting ? 'text-muted-foreground' : 'text-foreground']">
            <text>取消</text>
          </view>
          <view @click="isResetting ? null : handleResetKey()" :class="['flex-1 py-3 text-center text-sm font-medium', isResetting ? 'text-muted-foreground' : 'text-primary']">
            <text>{{ isResetting ? '生成中...' : '确认重新生成' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface QualityPreset {
  id: string
  name: string
  resolution: string
  bitrate: string
  fps: number
  network: string
  recommended: boolean
  desc: string
}

interface ObsStep {
  step: number
  title: string
  desc: string
}

interface FaqItem {
  q: string
  a: string
  open: boolean
}

const streamData = {
  serverUrl: 'rtmp://live-push.rebu.cn/live',
  streamKey: 'rebu_live_8f7d6e5c4b3a2910_1698765432',
  fps: 30,
  bitrate: 4500,
  resolution: '1920x1080',
  droppedFrames: 12,
  totalFrames: 115350,
}

const qualityPresets: QualityPreset[] = [
  { id: 'high', name: '高清 1080P', resolution: '1920x1080', bitrate: '4500-6000', fps: 30, network: '上行 ≥ 10Mbps', recommended: true, desc: '适合知识授课，画面清晰细腻' },
  { id: 'medium', name: '标清 720P', resolution: '1280x720', bitrate: '2500-4000', fps: 30, network: '上行 ≥ 5Mbps', recommended: false, desc: '适合大部分场景，兼顾清晰度与流畅度' },
  { id: 'low', name: '流畅 480P', resolution: '854x480', bitrate: '1000-2000', fps: 30, network: '上行 ≥ 2Mbps', recommended: false, desc: '网络较差时使用，保证流畅性' },
]

const obsSteps: ObsStep[] = [
  { step: 1, title: '打开OBS设置', desc: '点击菜单栏「设置」或按快捷键 Ctrl+Shift+S' },
  { step: 2, title: '进入推流设置', desc: '在左侧菜单选择「推流」选项' },
  { step: 3, title: '选择服务类型', desc: '服务选择「自定义」，填入下方服务器地址' },
  { step: 4, title: '填写串流密钥', desc: '将下方串流密钥复制粘贴到对应输入框' },
  { step: 5, title: '开始推流', desc: '点击「开始推流」按钮，等待连接成功' },
]

const faqList = ref<FaqItem[]>([
  { q: '推流失败怎么办？', a: '1. 检查服务器地址和串流密钥是否正确复制\n2. 确认网络连接正常，防火墙未拦截OBS\n3. 尝试重新生成串流密钥', open: false },
  { q: '画面卡顿如何解决？', a: '1. 降低输出分辨率和码率\n2. 检查CPU/GPU占用率，关闭不必要的程序\n3. 使用有线网络替代WiFi', open: false },
  { q: '如何实现画中画效果？', a: '在OBS中添加「视频捕获设备」源获取摄像头画面，调整大小和位置叠加在课件画面上即可。', open: false },
])

const showStreamKey = ref(false)
const copiedField = ref<string | null>(null)
const showResetDialog = ref(false)
const isResetting = ref(false)
const selectedQuality = ref('high')
const streamStatus = ref<'online' | 'offline' | 'connecting'>('online')
const duration = ref(3845)

// 推流时长计时
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (streamStatus.value === 'online') {
    timer = setInterval(() => {
      duration.value++
    }, 1000)
  }
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const copyToClipboard = (text: string, field: string) => {
  uni.setClipboardData({ data: text })
  copiedField.value = field
  setTimeout(() => { copiedField.value = null }, 2000)
}

const handleResetKey = () => {
  isResetting.value = true
  setTimeout(() => {
    isResetting.value = false
    showResetDialog.value = false
    uni.showToast({ title: '密钥已重新生成', icon: 'none' })
  }, 1500)
}

const toggleFaq = (idx: number) => {
  faqList.value[idx].open = !faqList.value[idx].open
}

const handleDownload = () => {
  uni.showToast({ title: '正在跳转OBS官网', icon: 'none' })
}

const handleSpeedTest = () => {
  uni.showToast({ title: '网络测速中...', icon: 'none' })
}

const goBack = () => { uni.navigateBack() }
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
