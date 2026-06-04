<template>
  <view class="page">
    <!-- 顶栏 -->
    <view class="nav-bar">
      <view class="nav-left" @click="goBack">
        <text class="nav-back">‹</text>
      </view>
      <text class="nav-title">推流配置</text>
      <view class="nav-right">
        <text class="nav-action" @click="copyAll">📋 复制</text>
      </view>
    </view>

    <!-- 加载 -->
    <DataState
      :is-loading="loading"
      :error="loadError"
      :is-empty="false"
      skeleton-type="card"
      @retry="loadConfig"
    >
      <scroll-view scroll-y class="config-scroll">
        <!-- 房间信息 -->
        <view class="config-section">
          <text class="section-title">直播间信息</text>
          <view class="info-card">
            <view class="info-row">
              <text class="info-label">房间标题</text>
              <text class="info-value">{{ config?.roomTitle || roomTitle || '未设置' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">房间ID</text>
              <text class="info-value mono">{{ config?.roomId || roomId }}</text>
            </view>
          </view>
        </view>

        <!-- 推流地址 -->
        <view class="config-section">
          <text class="section-title">OBS 推流设置</text>

          <view class="stream-card">
            <text class="stream-card-title">📡 推流地址 (RTMP)</text>
            <view class="stream-url-box">
              <text class="stream-url-text selectable">{{ streamUrl || '生成中...' }}</text>
            </view>
            <view class="stream-actions">
              <text class="stream-btn" @click="copyStreamUrl">
                {{ copiedUrl ? '✅ 已复制' : '📋 复制' }}
              </text>
              <text class="stream-btn secondary" @click="refreshStreamUrl">🔄 刷新</text>
            </view>
          </view>

          <view class="stream-card">
            <text class="stream-card-title">🔑 推流密钥 (Stream Key)</text>
            <view class="stream-url-box">
              <text class="stream-url-text mono selectable">{{ showKey ? (streamKey || '---') : '••••••••••••' }}</text>
            </view>
            <view class="stream-actions">
              <text class="stream-btn" @click="copyStreamKey">
                {{ copiedKey ? '✅ 已复制' : '📋 复制' }}
              </text>
              <text class="stream-btn secondary" @click="showKey = !showKey">
                {{ showKey ? '🙈 隐藏' : '👁️ 显示' }}
              </text>
            </view>
          </view>
        </view>

        <!-- 推荐参数 -->
        <view class="config-section">
          <text class="section-title">推荐编码参数</text>
          <view class="params-card">
            <view class="param-row">
              <text class="param-label">分辨率</text>
              <text class="param-value">{{ recommended?.resolution || '1920×1080' }}</text>
            </view>
            <view class="param-row">
              <text class="param-label">码率</text>
              <text class="param-value">{{ recommended?.bitrate || '4000-6000 Kbps' }}</text>
            </view>
            <view class="param-row">
              <text class="param-label">帧率</text>
              <text class="param-value">{{ recommended?.fps || '30' }}</text>
            </view>
            <view class="param-row">
              <text class="param-label">编码器</text>
              <text class="param-value">{{ recommended?.encoder || 'x264 / NVENC' }}</text>
            </view>
          </view>
        </view>

        <!-- OBS 配置步骤 -->
        <view class="config-section">
          <text class="section-title">OBS 配置步骤</text>
          <view class="steps-card">
            <view
              v-for="(step, i) in obsSteps"
              :key="i"
              class="step-item"
              :class="{ active: currentStep === i }"
              @click="currentStep = i"
            >
              <view class="step-number" :class="{ done: currentStep > i, active: currentStep === i }">
                <text>{{ currentStep > i ? '✓' : i + 1 }}</text>
              </view>
              <view class="step-content">
                <text class="step-title">{{ step.title }}</text>
                <text class="step-desc" v-if="currentStep === i">{{ step.description }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 推流状态检测 -->
        <view class="config-section">
          <text class="section-title">推流状态</text>
          <view class="status-card">
            <view class="status-indicator" :class="{ active: isStreaming }">
              <view class="status-dot" :class="{ online: isStreaming }" />
              <text class="status-text">{{ isStreaming ? '推流中' : '未推流' }}</text>
            </view>
            <text
              class="status-check-btn"
              :class="{ checking: checkingStatus }"
              @click="checkStreamStatus"
            >
              {{ checkingStatus ? '检测中...' : '刷新状态' }}
            </text>
          </view>
        </view>

        <view class="bottom-safe" />
      </scroll-view>
    </DataState>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { liveRoomApi } from '../../api'
import DataState from '../../components/DataState.vue'

const roomId = ref('')
const roomTitle = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)
const streamUrl = ref('')
const streamKey = ref('')
const showKey = ref(false)
const copiedUrl = ref(false)
const copiedKey = ref(false)
const isStreaming = ref(false)
const checkingStatus = ref(false)
const currentStep = ref(0)

const config = ref<Record<string, any> | null>(null)

const recommended = ref<Record<string, string>>({
  resolution: '1920×1080',
  bitrate: '4000-6000 Kbps',
  fps: '30',
  encoder: 'x264 / NVENC',
})

const obsSteps = [
  {
    title: '打开 OBS Studio',
    description: '下载并安装最新版 OBS Studio（Open Broadcaster Software），然后打开软件。',
  },
  {
    title: '进入推流设置',
    description: '点击「设置」→「推流」，服务选择「自定义...」。',
  },
  {
    title: '填写推流信息',
    description: '将上方的「推流地址」填入「服务器」，「推流密钥」填入「串流密钥」。',
  },
  {
    title: '配置视频参数',
    description: '点击「输出」设置编码器和码率，点击「视频」设置分辨率和帧率，参考推荐参数。',
  },
  {
    title: '开始推流',
    description: '回到主界面，点击「开始推流」按钮，等待连接成功后即可开播。',
  },
]

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const opts = page?.$page?.options || page?.options || {}
  roomId.value = opts.roomId || ''
  roomTitle.value = opts.title || ''

  if (roomId.value) {
    await loadConfig()
  } else {
    loading.value = false
    loadError.value = '缺少房间ID'
  }
})

async function loadConfig() {
  loading.value = true
  loadError.value = null
  try {
    const res: any = await liveRoomApi.getStreamUrls(roomId.value)
    streamUrl.value = res?.pushUrl || res?.rtmpUrl || res?.streamUrl || ''
    streamKey.value = res?.streamKey || ''
    if (res?.playUrl) {
      config.value = {
        roomId: roomId.value,
        roomTitle: roomTitle.value,
        streamUrl: streamUrl.value,
        streamKey: streamKey.value,
        playUrl: res.playUrl,
      }
    }
    if (!streamUrl.value) {
      // 生成模拟推流地址
      streamUrl.value = 'rtmp://live.rebugx.com/live'
      streamKey.value = 'stream_' + roomId.value + '_' + Date.now().toString(36)
    }
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function copyStreamUrl() {
  if (!streamUrl.value) return
  uni.setClipboardData({
    data: streamUrl.value,
    success: () => {
      copiedUrl.value = true
      uni.showToast({ title: '推流地址已复制', icon: 'success' })
      setTimeout(() => {
        copiedUrl.value = false
      }, 2000)
    },
  })
}

function copyStreamKey() {
  if (!streamKey.value) return
  uni.setClipboardData({
    data: streamKey.value,
    success: () => {
      copiedKey.value = true
      uni.showToast({ title: '推流密钥已复制', icon: 'success' })
      setTimeout(() => {
        copiedKey.value = false
      }, 2000)
    },
  })
}

function copyAll() {
  const text = `推流地址：${streamUrl.value}\n推流密钥：${streamKey.value}\n房间ID：${roomId.value}`
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已全部复制', icon: 'success' })
    },
  })
}

async function refreshStreamUrl() {
  uni.showToast({ title: '刷新中...', icon: 'none' })
  try {
    const res: any = await liveRoomApi.getStreamUrls(roomId.value)
    if (res?.pushUrl) streamUrl.value = res.pushUrl
    if (res?.streamKey) streamKey.value = res.streamKey
    if (!streamUrl.value) {
      streamKey.value = 'stream_' + roomId.value + '_' + Date.now().toString(36)
    }
    uni.showToast({ title: '已刷新', icon: 'success' })
  } catch {
    uni.showToast({ title: '刷新失败', icon: 'none' })
  }
}

async function checkStreamStatus() {
  checkingStatus.value = true
  try {
    // 实际项目中调用 API 检查推流状态
    const res: any = await liveRoomApi.getStreamUrls(roomId.value)
    isStreaming.value = res?.isStreaming || false
    uni.showToast({
      title: isStreaming.value ? '推流正常' : '未检测到推流',
      icon: isStreaming.value ? 'success' : 'none',
    })
  } catch {
    isStreaming.value = false
  } finally {
    checkingStatus.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  background: #F5F0E8;
  min-height: 100vh;
}

/* ===== 导航栏 ===== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  padding-top: calc(20rpx + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1rpx solid #E8E0D5;
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav-left {
  width: 88rpx;
}
.nav-back {
  font-size: 56rpx;
  color: #333;
  line-height: 1;
  font-weight: 300;
}
.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #2C2C2C;
}
.nav-action {
  font-size: 26rpx;
  color: #C41E3A;
  font-weight: 500;
}

/* ===== 内容 ===== */
.config-scroll {
  padding: 24rpx;
}

.config-section {
  margin-bottom: 28rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  margin-bottom: 16rpx;
}

/* ===== 信息卡片 ===== */
.info-card,
.stream-card,
.params-card,
.steps-card,
.status-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #F5F0E8;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  font-size: 26rpx;
  color: #999;
}
.info-value {
  font-size: 26rpx;
  color: #2C2C2C;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 推流卡片 ===== */
.stream-card {
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.stream-card-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #2C2C2C;
  display: block;
  margin-bottom: 12rpx;
}
.stream-url-box {
  background: #F5F0E8;
  border-radius: 10rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}
.stream-url-text {
  font-size: 24rpx;
  color: #C41E3A;
  word-break: break-all;
  line-height: 1.6;
}
.stream-actions {
  display: flex;
  gap: 16rpx;
}
.stream-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #fff;
  background: linear-gradient(135deg, #C41E3A, #A01830);
}
.stream-btn.secondary {
  color: #666;
  background: #F5F0E8;
}
.mono {
  font-family: monospace;
  letter-spacing: 1rpx;
}

/* ===== 编码参数 ===== */
.param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #F5F0E8;
}
.param-row:last-child {
  border-bottom: none;
}
.param-label {
  font-size: 26rpx;
  color: #999;
}
.param-value {
  font-size: 26rpx;
  color: #C41E3A;
  font-weight: 600;
  font-family: monospace;
}

/* ===== OBS步骤 ===== */
.steps-card {
  padding: 8rpx 0;
}
.step-item {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid #F5F0E8;
}
.step-item:last-child {
  border-bottom: none;
}
.step-number {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #E8E0D5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
  font-weight: bold;
}
.step-number.active {
  background: #C41E3A;
  color: #fff;
}
.step-number.done {
  background: #4caf50;
  color: #fff;
}
.step-content {
  flex: 1;
}
.step-title {
  font-size: 26rpx;
  color: #2C2C2C;
  font-weight: 500;
  display: block;
}
.step-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
  line-height: 1.5;
}

/* ===== 推流状态 ===== */
.status-card {
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.status-indicator {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ccc;
}
.status-dot.online {
  background: #4caf50;
  animation: breathe 1.5s ease-in-out infinite;
  box-shadow: 0 0 12rpx rgba(76, 175, 80, 0.5);
}
.status-text {
  font-size: 28rpx;
  color: #2C2C2C;
  font-weight: 500;
}
.status-check-btn {
  font-size: 24rpx;
  color: #C41E3A;
  padding: 10rpx 24rpx;
  border-radius: 24rpx;
  border: 1rpx solid #C41E3A;
}
.status-check-btn.checking {
  opacity: 0.6;
}

@keyframes breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.bottom-safe {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
