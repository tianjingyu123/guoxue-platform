<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-white border-b border-border flex items-center px-4 h-12 gap-3 shadow-sm">
      <view @click="goBack">
        <text class="text-xl text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">OBS 推流教程</text>
      <view class="flex-1" />
      <text class="text-xs text-primary" @click="openHelp">❓ 帮助</text>
    </view>

    <!-- 加载骨架 -->
    <view v-if="loading" class="px-4 pt-4 animate-pulse space-y-6">
      <view class="h-24 bg-[#E8E0D5] rounded-xl" />
      <view>
        <view class="h-4 bg-[#E8E0D5] rounded w-1/4 mb-3" />
        <view v-for="i in 4" :key="i" class="flex gap-3 mb-4">
          <view class="w-8 h-8 rounded-full bg-[#E8E0D5] shrink-0" />
          <view class="flex-1">
            <view class="h-4 bg-[#E8E0D5] rounded w-2/3 mb-2" />
            <view class="h-3 bg-[#E8E0D5] rounded w-full mb-1" />
            <view class="h-3 bg-[#E8E0D5] rounded w-3/4" />
          </view>
        </view>
      </view>
      <view class="h-48 bg-[#E8E0D5] rounded-xl" />
    </view>

    <view v-else class="px-4 pt-4 pb-20 space-y-6">
      <!-- Hero -->
      <view class="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl flex items-center gap-4 shadow-lg">
        <view class="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-600">
          <text class="text-3xl">🖥</text>
        </view>
        <view class="flex-1 min-w-0">
          <text class="text-lg font-bold block mb-1">OBS Studio 直播推流</text>
          <text class="text-sm text-slate-300 leading-relaxed">适合知识授课类横屏直播，画质清晰稳定，专业推流工具。支持 Windows / macOS / Linux。</text>
        </view>
      </view>

      <!-- 配置步骤 -->
      <view>
        <view class="flex items-center justify-between mb-3">
          <text class="text-sm font-semibold text-foreground"> 配置步骤</text>
          <view class="flex items-center gap-2">
            <text class="text-xs text-primary" @click="copyAllSteps"> 复制全部</text>
          </view>
        </view>
        <view class="space-y-4">
          <view v-for="(s,i) in steps" :key="s.step" class="flex gap-3">
            <view class="flex flex-col items-center gap-1 flex-shrink-0">
              <view :class="'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all '+(s.completed ? 'bg-green-500 text-white shadow-sm' : 'bg-primary/10 text-primary')" @click="toggleStep(s)">
                <text>{{ s.completed ? '✓' : s.step }}</text>
              </view>
              <view v-if="i<steps.length-1" class="w-0.5 flex-1 bg-[#E8E0D5]" style="min-height:20px" />
            </view>
            <view class="flex-1 min-w-0 pb-5">
              <view class="flex items-center gap-2 mb-1.5">
                <text class="text-sm font-semibold text-foreground">{{ s.title }}</text>
                <text v-if="s.completed" class="text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">已完成</text>
              </view>
              <text class="text-xs text-ink-soft leading-relaxed block mb-2.5">{{ s.desc }}</text>

              <!-- 推流地址/密钥显示 -->
              <view v-if="s.showKey" class="bg-slate-50 rounded-xl p-3.5 mb-2 border border-border">
                <view class="flex items-center justify-between mb-1.5">
                  <text class="text-xs font-medium text-foreground">推流地址</text>
                  <text class="text-xs text-primary flex items-center gap-0.5" @click="copyText(streamUrl)"> 复制</text>
                </view>
                <view class="bg-white border border-border rounded-lg px-3 py-2 flex items-center justify-between">
                  <text class="text-xs text-foreground font-mono truncate">{{ streamUrl }}</text>
                </view>
                <view class="flex items-center justify-between mt-3 mb-1.5">
                  <text class="text-xs font-medium text-foreground">推流密钥</text>
                  <text class="text-xs text-primary flex items-center gap-0.5" @click="copyText(streamKey)"> 复制</text>
                </view>
                <view class="bg-white border border-border rounded-lg px-3 py-2 flex items-center justify-between">
                  <text class="text-xs text-foreground font-mono">{{ streamKeyVisible ? streamKey : '••••••••••••••••' }}</text>
                  <text class="text-xs text-muted-foreground ml-2" @click="streamKeyVisible = !streamKeyVisible">{{ streamKeyVisible ? '🙈' : '' }}</text>
                </view>
              </view>

              <text v-if="s.action" class="flex items-center gap-1 text-xs text-primary font-medium active:text-[#B01A31]" @click="handleAction(s.action)">{{ s.action }} ↗</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 推流参数预览 -->
      <view class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-lg">
        <view class="flex items-center gap-2 mb-3">
          <text class="text-white text-sm font-semibold"> 推流预览</text>
          <text class="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full font-medium">● 模拟画面</text>
          <view class="flex-1" />
          <text class="text-xs text-slate-400">1280×720</text>
        </view>
        <view class="bg-black/40 rounded-xl flex items-center justify-center overflow-hidden" style="aspect-ratio:16/9">
          <view class="text-center p-6">
            <text class="text-5xl block mb-3">🖥</text>
            <text class="text-white/60 text-sm block">推流画面预览</text>
            <view class="flex items-center justify-center gap-3 mt-2">
              <text class="text-white/40 text-[10px]">1280 × 720</text>
              <text class="text-white/40 text-[10px]">30 fps</text>
              <text class="text-white/40 text-[10px]">2500 kbps</text>
            </view>
          </view>
        </view>
        <view class="flex items-center gap-2 mt-3">
          <view class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <text class="text-xs text-green-400">推流配置就绪</text>
          <view class="flex-1" />
          <text class="text-xs text-slate-400">建议在测试房间先试推</text>
        </view>
      </view>

      <!-- 推荐配置 -->
      <view>
        <text class="text-sm font-semibold text-foreground block mb-3">🔧 推荐硬件配置</text>
        <view class="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <view v-for="(r,i) in requirements" :key="r.label" :class="'flex items-center justify-between px-4 py-3 text-sm ' + (i>0?'border-t border-border':'')">
            <text class="text-muted-foreground flex items-center gap-1.5">
              <text>{{ reqIcons[i] }}</text>
              <text>{{ r.label }}</text>
            </text>
            <text class="text-foreground font-medium">{{ r.value }}</text>
          </view>
        </view>
      </view>

      <!-- 常见问题（手风琴） -->
      <view>
        <text class="text-sm font-semibold text-foreground block mb-3">❓ 常见问题</text>
        <view class="space-y-2">
          <view v-for="(f, idx) in faqs" :key="idx" class="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
            <view class="flex items-center justify-between px-4 py-3.5 active:bg-background" @click="f.open = !f.open">
              <view class="flex items-center gap-2.5 flex-1 min-w-0">
                <view class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <text class="text-[10px] text-primary font-bold">Q</text>
                </view>
                <text class="text-sm font-medium text-foreground truncate">{{ f.q }}</text>
              </view>
              <text class="text-muted-foreground text-sm ml-2 transition-transform" :class="f.open ? 'rotate-45' : ''">+</text>
            </view>
            <view v-if="f.open" class="px-4 pb-4 pl-11 pr-4">
              <view class="flex items-start gap-2">
                <text class="text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-medium shrink-0 mt-0.5">A</text>
                <text class="text-xs text-ink-soft leading-relaxed whitespace-pre-line">{{ f.a }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 开始直播按钮 -->
      <view class="w-full h-12 bg-gradient-to-r from-primary to-[#E74C3C] text-white rounded-2xl text-base font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:opacity-90" @click="startLive">
        <text>▶</text>
        <text>开始直播</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(true)

const streamUrl = ref('rtmp://push.rebu.com/live/')
const streamKey = ref('REBU-XXXX-XXXX-XXXX-XXXX')
const streamKeyVisible = ref(false)

const reqIcons = ['💻', '🧠', '📡', '⚙', '🎮']

const steps = ref([
  { step: 1, title: '下载并安装 OBS Studio', desc: 'OBS Studio 是免费开源的直播推流软件，支持 Windows / macOS / Linux 平台。下载后按照安装向导完成安装即可开始使用。', action: '前往官网下载', completed: false, showKey: false },
  { step: 2, title: '添加视频和音频来源', desc: '在 OBS 「来源」面板中点击「+」号，添加「显示器采集」或「视频采集设备」作为视频来源，再添加「音频输入采集」作为麦克风来源。', action: null, completed: false, showKey: false },
  { step: 3, title: '配置推流设置', desc: '打开「设置」→「推流」，服务选择「自定义」，然后填入下方提供的推流地址和推流密钥。这是连接平台和 OBS 的关键步骤，请仔细核对。', action: null, completed: false, showKey: true },
  { step: 4, title: '调整编码参数', desc: '「输出」→「视频编码器」选 x264，码率建议 2500-4000 Kbps，分辨率 1280×720，帧率 30fps。如需更高画质可适当提高码率。', action: null, completed: false, showKey: false },
  { step: 5, title: '开始直播推流', desc: '回到 OBS 主界面，点击「开始推流」按钮。推流成功后，平台端即可看到直播画面。建议先录制测试确认音频视频正常。', action: null, completed: false, showKey: false },
])

const requirements = ref([
  { label: 'CPU', value: 'i5 / Ryzen 5 及以上' },
  { label: '内存', value: '8GB RAM 及以上' },
  { label: '上传网速', value: '≥ 6Mbps（推荐 10Mbps）' },
  { label: '操作系统', value: 'Windows 10 / macOS 10.15+' },
  { label: '显卡', value: '集成显卡即可，独立显卡更佳' },
])

const faqs = ref([
  { q: '推流密钥在哪里找？', a: '进入「开始直播」页面 → 点击「获取推流码」按钮即可查看和复制。推流密钥建议定期更换以保障直播安全。每个直播间有独立的推流地址和密钥。', open: false },
  { q: '直播卡顿怎么办？', a: '1) 降低码率至 2000Kbps\n2) 关闭其他占用带宽的程序\n3) 降低分辨率至 854×480\n4) 使用有线网络替代 Wi-Fi\n5) 联系运营商检查上行带宽', open: false },
  { q: 'OBS 显示推流失败？', a: '1) 检查推流地址是否正确（注意 rtmp:// 前缀）\n2) 确认推流码是否已过期或输入有误\n3) 检查防火墙是否阻止了 OBS 的网络请求\n4) 尝试重新启动 OBS Studio', open: false },
  { q: '如何测试推流效果？', a: 'OBS 自带预览功能，可在正式推流前点击「预览串流」测试画面和声音质量。建议先在测试直播间进行模拟推流，确认一切正常后再正式开播。', open: false },
  { q: '支持同时推送多个平台吗？', a: 'OBS Studio 支持通过安装第三方插件（如 OBS Multiplatform 插件）实现同时推流到多个平台。也可以使用 Restream 等聚合服务实现多平台分发。', open: false },
  { q: '直播延迟太高如何降低？', a: '在「设置」→「高级」中调整「串流延迟」参数。降低「关键帧间隔」到 1-2 秒，并启用「低延迟模式」。注意：降低延迟可能会增加 CPU 负载。', open: false },
])

setTimeout(() => { loading.value = false }, 600)

function toggleStep(s: any) {
  s.completed = !s.completed
}

function handleAction(action: string) {
  if (action.includes('下载')) {
    uni.showToast({ title: '正在打开 OBS 官网', icon: 'none' })
  } else {
    uni.showToast({ title: action, icon: 'none' })
  }
}

function copyText(text: string) {
  uni.setClipboardData({
    data: text,
    success: () => { uni.showToast({ title: '已复制到剪贴板', icon: 'success' }) }
  })
}

function copyAllSteps() {
  const text = steps.value.map(s => `${s.step}. ${s.title}：${s.desc}`).join('\n')
  copyText(text)
}

function openHelp() {
  uni.showToast({ title: '帮助文档开发中', icon: 'none' })
}

function startLive() {
  uni.showToast({ title: '正在连接推流服务器...', icon: 'none' })
}

function goBack() { uni.navigateBack() }
</script>
<style scoped>
/* 样式由 Tailwind 处理 */
</style>
