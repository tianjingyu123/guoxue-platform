<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#E8546D] text-white">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-1"><text class="text-white text-xl">←</text></view>
        <text class="text-lg font-semibold">邀请好友</text>
        <view class="w-10" />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="p-4 space-y-4">
      <view class="h-28 bg-muted rounded-xl animate-pulse" />
      <view class="h-10 bg-muted rounded-xl animate-pulse" />
      <view class="h-40 bg-muted rounded-xl animate-pulse" />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="text-center py-20">
      <text class="text-4xl text-[#E8E0D5] block mb-3">⚠</text>
      <text class="text-muted-foreground text-sm block mb-4">{{ error }}</text>
      <view @click="loadData" class="inline-block px-6 py-2 bg-primary text-white rounded-full text-sm">重试</view>
    </view>

    <view v-else class="p-4 space-y-4">
      <!-- 邀请奖励说明 -->
      <view class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
        <view class="flex items-center gap-2 mb-2">
          <text class="text-amber-600 text-xl">🎁</text>
          <text class="font-semibold text-amber-800">邀请奖励</text>
        </view>
        <text class="text-sm text-amber-700 block">• 好友注册即得 <text class="font-semibold">10积分</text></text>
        <text class="text-sm text-amber-700 block">• 好友首次付费返佣 <text class="font-semibold">10%</text></text>
        <text class="text-sm text-amber-700 block">• 好友开通会员再得 <text class="font-semibold">20元</text></text>
      </view>

      <!-- Tab切换 -->
      <view class="flex bg-white rounded-xl p-1 border border-border">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="['flex-1 py-2 text-center text-sm font-medium rounded-lg', activeTab === tab.key ? 'bg-primary text-white' : 'text-ink-soft']"
        >
          <text v-if="tab.key === 'link'" class="inline"> 推荐链接</text>
          <text v-else-if="tab.key === 'qrcode'" class="inline"> 二维码</text>
          <text v-else class="inline"> 分享海报</text>
        </view>
      </view>

      <!-- 推荐链接 -->
      <view v-if="activeTab === 'link'" class="space-y-4">
        <view class="bg-white rounded-xl p-4 border border-border">
          <text class="text-sm text-muted-foreground block mb-2">我的邀请码</text>
          <view class="flex items-center justify-between">
            <text class="text-2xl font-bold text-primary tracking-widest">{{ linkInfo?.inviteCode }}</text>
            <view @click="copyCode" class="px-3 py-1.5 border border-border rounded-lg text-sm flex items-center gap-1">
              <text></text>
              <text class="text-ink-soft">复制</text>
            </view>
          </view>
        </view>
        <view class="bg-white rounded-xl p-4 border border-border">
          <text class="text-sm text-muted-foreground block mb-2">邀请链接</text>
          <view class="bg-secondary rounded-lg p-3 text-sm text-ink-soft break-all">{{ linkInfo?.inviteLink }}</view>
          <view
            @click="copyLink"
            :class="['w-full mt-3 py-3 rounded-xl text-center text-sm font-medium', copied ? 'bg-green-100 text-green-600' : 'bg-primary text-white']"
          >
            <text>{{ copied ? '✓ 已复制' : ' 复制链接' }}</text>
          </view>
        </view>
      </view>

      <!-- 二维码 -->
      <view v-if="activeTab === 'qrcode'" class="bg-white rounded-xl p-6 border border-border text-center">
        <view class="inline-block p-4 bg-white rounded-xl shadow-sm border border-border">
          <image
            :src="linkInfo?.qrCodeUrl || '/static/qr-placeholder.png'"
            mode="aspectFit"
            class="w-48 h-48"
          />
        </view>
        <text class="mt-4 text-sm text-muted-foreground block">长按或扫描二维码加入</text>
        <text class="mt-1 text-primary font-semibold block">邀请码: {{ linkInfo?.inviteCode }}</text>
        <view class="mt-4 flex gap-3">
          <view @click="saveQrCode" class="flex-1 py-2.5 border border-border rounded-xl text-sm text-center text-ink-soft">
            <text>💾 保存二维码</text>
          </view>
          <view @click="copyLink" class="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm text-center">
            <text> 复制链接</text>
          </view>
        </view>
      </view>

      <!-- 分享海报 -->
      <view v-if="activeTab === 'poster'" class="bg-white rounded-xl p-4 border border-border">
        <!-- 背景选择 -->
        <view class="mb-4">
          <text class="text-sm text-muted-foreground mb-2 block">选择背景</text>
          <scroll-view scroll-x class="flex gap-2 whitespace-nowrap">
            <view
              v-for="(bg, index) in posterConfig?.backgroundImages || []"
              :key="index"
              @click="selectedBg = index"
              :class="['w-16 h-24 rounded-lg overflow-hidden inline-block mr-2 border-2', selectedBg === index ? 'border-primary' : 'border-transparent']"
            >
              <image :src="bg" mode="aspectFill" class="w-full h-full" />
            </view>
          </scroll-view>
        </view>

        <!-- 海报预览 -->
        <view class="relative flex justify-center bg-secondary/30 rounded-lg p-4">
          <view v-if="generatingPoster" class="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg z-10">
            <text class="text-primary">生成中...</text>
          </view>
          <canvas
            canvas-id="posterCanvas"
            class="w-72 h-[480px] rounded-lg shadow-lg"
            style="max-height: 400px;"
          />
        </view>

        <!-- 操作按钮 -->
        <view class="mt-4 flex gap-3">
          <view @click="generatePoster" :class="['flex-1 py-2.5 border border-border rounded-xl text-sm text-center', generatingPoster ? 'opacity-50' : '']">
            <text> 重新生成</text>
          </view>
          <view @click="savePoster" :class="['flex-1 py-2.5 bg-primary text-white rounded-xl text-sm text-center', !posterGenerated ? 'opacity-50' : '']">
            <text>💾 保存海报</text>
          </view>
        </view>
      </view>

      <!-- 分享渠道 -->
      <view class="bg-white rounded-xl p-4 border border-border">
        <text class="text-sm text-muted-foreground mb-3 block">分享到</text>
        <view class="grid grid-cols-4 gap-4">
          <view @click="shareTo('wechat')" class="flex flex-col items-center gap-1.5">
            <view class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center"><text class="text-white text-2xl"></text></view>
            <text class="text-xs text-muted-foreground">微信</text>
          </view>
          <view @click="shareTo('moments')" class="flex flex-col items-center gap-1.5">
            <view class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center"><text class="text-white text-2xl"></text></view>
            <text class="text-xs text-muted-foreground">朋友圈</text>
          </view>
          <view @click="shareTo('qq')" class="flex flex-col items-center gap-1.5">
            <view class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center"><text class="text-white text-2xl"></text></view>
            <text class="text-xs text-muted-foreground">QQ</text>
          </view>
          <view @click="copyLink" class="flex flex-col items-center gap-1.5">
            <view class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"><text class="text-muted-foreground text-2xl"></text></view>
            <text class="text-xs text-muted-foreground">复制链接</text>
          </view>
        </view>
      </view>

      <!-- 查看邀请记录 -->
      <view @click="goToRecords" class="flex items-center justify-between bg-white rounded-xl p-4 border border-border">
        <text class="text-sm text-foreground">查看邀请记录</text>
        <text class="text-base text-muted-foreground">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type TabType = 'link' | 'qrcode' | 'poster'

interface InviteLinkInfo {
  inviteCode: string
  inviteLink: string
  qrCodeUrl: string
}

interface InvitePosterConfig {
  backgroundImages: string[]
  userAvatar: string
  userName: string
  title: string
  subtitle: string
  benefits: string[]
  qrCodeUrl: string
  inviteCode: string
}

const tabs = [
  { key: 'link', label: '推荐链接' },
  { key: 'qrcode', label: '二维码' },
  { key: 'poster', label: '分享海报' },
]

const activeTab = ref<TabType>('link')
const loading = ref(true)
const error = ref<string | null>(null)
const copied = ref(false)
const selectedBg = ref(0)
const posterGenerated = ref(false)
const generatingPoster = ref(false)

const linkInfo = ref<InviteLinkInfo | null>(null)
const posterConfig = ref<InvitePosterConfig | null>(null)

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [linkRes, posterRes] = await Promise.all([
      getInviteLinkInfo(),
      getInvitePosterConfig(),
    ])
    if (linkRes.code === 200) linkInfo.value = linkRes.data
    if (posterRes.code === 200) posterConfig.value = posterRes.data
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

function copyLink() {
  if (!linkInfo.value) return
  uni.setClipboardData({
    data: linkInfo.value.inviteLink,
    success: () => {
      copied.value = true
      uni.showToast({ title: '链接已复制', icon: 'success' })
      recordShare('copy', 'invite')
      setTimeout(() => { copied.value = false }, 2000)
    }
  })
}

function copyCode() {
  if (!linkInfo.value) return
  uni.setClipboardData({
    data: linkInfo.value.inviteCode,
    success: () => uni.showToast({ title: '邀请码已复制', icon: 'success' })
  })
}

function saveQrCode() {
  if (!linkInfo.value?.qrCodeUrl) return
  uni.downloadFile({
    url: linkInfo.value.qrCodeUrl,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '二维码已保存', icon: 'success' })
      })
    }
  })
}

async function generatePoster() {
  if (!posterConfig.value) return
  generatingPoster.value = true

  try {
    const ctx = uni.createCanvasContext('posterCanvas')
    const config = posterConfig.value!
    const width = 400
    const height = 600

    // 绘制背景
    ctx.setFillStyle('#C41E3A')
    ctx.fillRect(0, 0, width, height)

    // 半透明遮罩
    ctx.setFillStyle('rgba(0, 0, 0, 0.3)')
    ctx.fillRect(0, 0, width, height)

    // 标题
    ctx.setFillStyle('#FFFFFF')
    ctx.setFontSize(24)
    ctx.setTextAlign('center')
    ctx.fillText(config.title, 200, 100)

    // 副标题
    ctx.setFontSize(16)
    ctx.setGlobalAlpha(0.8)
    ctx.fillText(config.subtitle, 200, 140)

    // 用户名
    ctx.setGlobalAlpha(1)
    ctx.setFontSize(18)
    ctx.fillText(config.userName, 200, 190)

    // 权益列表
    ctx.setFontSize(14)
    ctx.setTextAlign('left')
    config.benefits.forEach((benefit, index) => {
      ctx.fillText(`• ${benefit}`, 60, 240 + index * 30)
    })

    // 二维码区域
    ctx.setFillStyle('#FFFFFF')
    ctx.fillRect(130, 380, 140, 160)

    // 扫码提示
    ctx.setFillStyle('#666666')
    ctx.setFontSize(12)
    ctx.setTextAlign('center')
    ctx.fillText('扫码加入', 200, 560)

    // 邀请码
    ctx.setFillStyle('#C41E3A')
    ctx.setFontSize(14)
    ctx.fillText(`邀请码: ${config.inviteCode}`, 200, 580)

    ctx.draw()
    posterGenerated.value = true
  } catch {
    uni.showToast({ title: '海报生成失败', icon: 'none' })
  } finally {
    generatingPoster.value = false
  }
}

function savePoster() {
  if (!posterGenerated.value) return
  uni.canvasToTempFilePath({
    canvasId: 'posterCanvas',
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => {
          uni.showToast({ title: '海报已保存', icon: 'success' })
          recordShare('save', 'poster')
        }
      })
    }
  })
}

function shareTo(channel: string) {
  const msgs: Record<string, string> = {
    wechat: '请在微信中打开分享',
    moments: '请在微信朋友圈中打开分享',
    qq: '请在QQ中打开分享',
  }
  if (channel === 'copy') {
    copyLink()
  } else {
    uni.showToast({ title: msgs[channel] || '分享功能', icon: 'none' })
  }
  recordShare(channel, 'invite')
}

function goToRecords() {
  uni.navigateTo({ url: '/pages/mine/invite-records/index' })
}

function goBack() { uni.navigateBack() }

// API 桩函数
async function getInviteLinkInfo(): Promise<any> {
  return { code: 200, data: { inviteCode: 'GUOXUE2024', inviteLink: 'https://guoxue.rebu.cn/invite?code=GUOXUE2024', qrCodeUrl: '' } }
}
async function getInvitePosterConfig(): Promise<any> {
  return { code: 200, data: { backgroundImages: [], userAvatar: '', userName: '用户', title: '邀请好友', subtitle: '与好友一起探索国学智慧', benefits: ['好友注册即得10积分', '好友首次付费返佣10%', '好友开通会员再得20元'], qrCodeUrl: '', inviteCode: 'GUOXUE2024' } }
}
function recordShare(channel: string, scene: string) { /* 记录分享 */ }

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
