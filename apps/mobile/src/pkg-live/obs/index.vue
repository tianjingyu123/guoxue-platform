<template>
  <!-- 加载骨架屏 -->
  <view v-if="loading" class="skeleton-page">
    <view class="skeleton-nav" />
    <view class="skeleton-card" />
    <view class="skeleton-card skeleton-card-sm" />
    <view class="skeleton-card skeleton-card-sm" />
  </view>
  <!-- 错误状态 -->
  <view v-else-if="error" class="error-state">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="fetchData">重试</view>
  </view>
  <!-- 正常内容 -->
  <view v-else class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left">
          <view class="nav-btn" @tap="onBack">
            <AppIcon name="chevron-left" :size="40" color="#2C2C2C" />
          </view>
          <text class="nav-title">OBS推流设置</text>
        </view>
        <view class="nav-dl">
          <AppIcon name="external-link" :size="28" color="#666" />
          <text class="nav-dl-txt">下载OBS</text>
        </view>
      </view>
    </view>

    <view class="body">
      <!-- 推流状态卡片 -->
      <view class="card status-card" :class="statusClass">
        <view class="status-head">
          <view class="status-left">
            <AppIcon
              :name="streamStatus === 'offline' ? 'wifi-off' : 'wifi'"
              :size="40"
              :color="streamStatus === 'online' ? '#16a34a' : streamStatus === 'connecting' ? '#f59e0b' : '#999'"
              :class="{ pulse: streamStatus === 'connecting' }"
            />
            <text class="status-title">推流状态</text>
          </view>
          <view class="status-badge" :class="statusClass">
            <text class="status-badge-txt">{{ statusText }}</text>
          </view>
        </view>

        <template v-if="streamStatus === 'online'">
          <view class="stat-grid">
            <view class="stat-item">
              <view class="stat-label">
                <AppIcon name="clock" :size="24" color="#999" />
                <text class="stat-label-txt">时长</text>
              </view>
              <text class="stat-value mono">{{ formatDuration(duration) }}</text>
            </view>
            <view class="stat-item">
              <view class="stat-label">
                <AppIcon name="activity" :size="24" color="#999" />
                <text class="stat-label-txt">帧率</text>
              </view>
              <text class="stat-value">{{ stream.fps }} fps</text>
            </view>
            <view class="stat-item">
              <view class="stat-label">
                <AppIcon name="gauge" :size="24" color="#999" />
                <text class="stat-label-txt">码率</text>
              </view>
              <text class="stat-value">{{ stream.bitrate }} kbps</text>
            </view>
            <view class="stat-item">
              <view class="stat-label">
                <AppIcon name="monitor" :size="24" color="#999" />
                <text class="stat-label-txt">分辨率</text>
              </view>
              <text class="stat-value">{{ stream.resolution }}</text>
            </view>
          </view>
          <view class="drop-row">
            <text class="drop-label">丢帧率</text>
            <text class="drop-value" :class="{ good: dropRate < 0.001 }">
              {{ (dropRate * 100).toFixed(3) }}%
              <text class="drop-frames">({{ stream.droppedFrames }}帧)</text>
            </text>
          </view>
        </template>

        <text v-else-if="streamStatus === 'offline'" class="status-offline-tip">
          当前未检测到推流，请在OBS中开始推流
        </text>
      </view>

      <!-- 推流配置信息 -->
      <view class="card">
        <view class="card-head">
          <AppIcon name="settings" :size="32" color="#C41E3A" />
          <text class="card-head-txt">推流配置信息</text>
        </view>

        <!-- 服务器地址 -->
        <view class="field">
          <text class="field-label">服务器地址（Server URL）</text>
          <view class="field-row">
            <view class="field-value mono">{{ stream.serverUrl }}</view>
            <view class="field-btn" @tap="copyField(stream.serverUrl, 'server')">
              <AppIcon :name="copiedField === 'server' ? 'check' : 'copy'" :size="32" :color="copiedField === 'server' ? '#16a34a' : '#666'" />
            </view>
          </view>
        </view>

        <!-- 串流密钥 -->
        <view class="field">
          <text class="field-label">串流密钥（Stream Key）</text>
          <view class="field-row">
            <view class="field-value-wrap">
              <view class="field-value mono">{{ showKey ? stream.streamKey : maskedKey }}</view>
              <view class="field-eye" @tap="showKey = !showKey">
                <AppIcon :name="showKey ? 'eye-off' : 'eye'" :size="32" color="#999" />
              </view>
            </view>
            <view class="field-btn" @tap="copyField(stream.streamKey, 'key')">
              <AppIcon :name="copiedField === 'key' ? 'check' : 'copy'" :size="32" :color="copiedField === 'key' ? '#16a34a' : '#666'" />
            </view>
          </view>
        </view>

        <!-- 重新生成 -->
        <view class="reset-row">
          <text class="reset-tip">密钥泄露？点击重新生成</text>
          <view class="reset-btn" @tap="showResetDialog = true">
            <AppIcon name="refresh-cw" :size="28" color="#2C2C2C" />
            <text class="reset-btn-txt">重新生成</text>
          </view>
        </view>
      </view>

      <!-- OBS配置指南 -->
      <view class="card">
        <view class="card-head">
          <AppIcon name="info" :size="32" color="#3b82f6" />
          <text class="card-head-txt">OBS配置指南</text>
        </view>
        <view class="steps">
          <view v-for="item in obsSteps" :key="item.step" class="step-row">
            <view class="step-num">
              <text class="step-num-txt">{{ item.step }}</text>
            </view>
            <view class="step-info">
              <text class="step-title">{{ item.title }}</text>
              <text class="step-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
        <view class="warn-box">
          <AppIcon name="alert-triangle" :size="32" color="#f59e0b" />
          <view class="warn-text">
            <text class="warn-title">安全提示</text>
            <text class="warn-desc">请勿将串流密钥分享给他人，泄露可能导致直播间被盗用。如已泄露，请立即重新生成。</text>
          </view>
        </view>
      </view>

      <!-- 画质配置建议 -->
      <view class="card">
        <view class="card-head">
          <AppIcon name="zap" :size="32" color="#f59e0b" />
          <text class="card-head-txt">画质配置建议</text>
        </view>
        <text class="card-sub">根据您的网络情况选择合适的画质配置</text>

        <view class="quality-list">
          <view
            v-for="preset in qualityPresets"
            :key="preset.id"
            class="quality-item"
            :class="{ active: selectedQuality === preset.id }"
            @tap="selectedQuality = preset.id"
          >
            <view class="quality-head">
              <view class="quality-name-row">
                <text class="quality-name">{{ preset.name }}</text>
                <view v-if="preset.recommended" class="quality-rec">
                  <text class="quality-rec-txt">推荐</text>
                </view>
              </view>
              <view class="quality-radio" :class="{ active: selectedQuality === preset.id }">
                <AppIcon v-if="selectedQuality === preset.id" name="check" :size="24" color="#fff" />
              </view>
            </view>
            <text class="quality-desc">{{ preset.desc }}</text>
            <view class="quality-grid">
              <view class="quality-cell">
                <text class="quality-cell-label">分辨率</text>
                <text class="quality-cell-value">{{ preset.resolution }}</text>
              </view>
              <view class="quality-cell">
                <text class="quality-cell-label">码率</text>
                <text class="quality-cell-value">{{ preset.bitrate }}</text>
              </view>
              <view class="quality-cell">
                <text class="quality-cell-label">帧率</text>
                <text class="quality-cell-value">{{ preset.fps }}fps</text>
              </view>
              <view class="quality-cell">
                <text class="quality-cell-label">网络要求</text>
                <text class="quality-cell-value">{{ preset.network }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="speed-row">
          <view class="speed-left">
            <AppIcon name="signal" :size="32" color="#C41E3A" />
            <text class="speed-txt">不确定网络情况？</text>
          </view>
          <view class="speed-btn">
            <text class="speed-btn-txt">测试网速</text>
          </view>
        </view>
      </view>

      <!-- OBS输出设置参考 -->
      <view class="card">
        <view class="card-head">
          <AppIcon name="monitor" :size="32" color="#06b6d4" />
          <text class="card-head-txt">OBS输出设置参考</text>
        </view>
        <view class="output-list">
          <view
            v-for="(item, idx) in outputSettings"
            :key="item.label"
            class="output-row"
            :class="{ last: idx === outputSettings.length - 1 }"
          >
            <text class="output-label">{{ item.label }}</text>
            <text class="output-value">{{ item.value }}</text>
          </view>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="card">
        <text class="faq-title">常见问题</text>
        <view class="faq-list">
          <view v-for="(item, idx) in faq" :key="idx" class="faq-item">
            <view class="faq-q" @tap="toggleFaq(idx)">
              <text class="faq-q-txt">{{ item.q }}</text>
              <AppIcon name="chevron-left" :size="32" color="#999" :class="openFaq === idx ? 'rot-up' : 'rot-down'" />
            </view>
            <text v-if="openFaq === idx" class="faq-a">{{ item.a }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 重新生成确认对话框 -->
    <view v-if="showResetDialog" class="dialog-mask" @tap="closeReset">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">重新生成串流密钥？</text>
        <text class="dialog-desc">重新生成后，旧密钥将立即失效。如果正在推流，将会断开连接，需要使用新密钥重新配置OBS。</text>
        <view class="dialog-foot">
          <view class="dialog-btn cancel" :class="{ disabled: isResetting }" @tap="closeReset">
            <text class="dialog-btn-txt">取消</text>
          </view>
          <view class="dialog-btn confirm" :class="{ disabled: isResetting }" @tap="handleResetKey">
            <text class="dialog-btn-txt confirm-txt">{{ isResetting ? '生成中...' : '确认重新生成' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import {
  liveApi,
  obsQualityPresets,
  obsPageSteps,
  obsOutputSettings,
  obsPageFaq,
} from '@/lib/live-data'

// 三态UI
const loading = ref(true)
const error = ref('')

const statusBarHeight = ref(0)
const stream = ref({
  serverUrl: '',
  streamKey: '',
  status: 'offline' as 'online' | 'offline' | 'connecting',
  duration: 0,
  fps: 0,
  bitrate: 0,
  resolution: '',
  droppedFrames: 0,
  totalFrames: 0,
})
const obsSteps = ref(obsPageSteps)
const qualityPresets = ref(obsQualityPresets)
const outputSettings = ref(obsOutputSettings)
const faq = ref(obsPageFaq)

const showKey = ref(false)
const copiedField = ref<string | null>(null)
const showResetDialog = ref(false)
const isResetting = ref(false)
const selectedQuality = ref('high')
const streamStatus = ref<'online' | 'offline' | 'connecting'>('offline')
const duration = ref(0)
const openFaq = ref<number | null>(null)

let timer: ReturnType<typeof setInterval> | null = null

const statusText = computed(() =>
  streamStatus.value === 'online' ? '推流中' : streamStatus.value === 'connecting' ? '连接中' : '离线',
)
const statusClass = computed(() => `s-${streamStatus.value}`)
const dropRate = computed(() =>
  stream.value.totalFrames > 0 ? stream.value.droppedFrames / stream.value.totalFrames : 0,
)
const maskedKey = computed(() => '•'.repeat(stream.value.streamKey.length))

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await liveApi.getObsStream()
    stream.value = { ...data, status: data.status as 'online' | 'offline' | 'connecting' }
    streamStatus.value = data.status as 'online' | 'offline' | 'connecting'
    duration.value = data.duration
  } catch (e: any) {
    error.value = e?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

onLoad(async () => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
  } catch (e) {}
  await fetchData()
  if (streamStatus.value === 'online') {
    timer = setInterval(() => {
      duration.value += 1
    }, 1000)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function copyField(text: string, field: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      copiedField.value = field
      setTimeout(() => (copiedField.value = null), 2000)
    },
  })
}

function toggleFaq(idx: number) {
  openFaq.value = openFaq.value === idx ? null : idx
}

function closeReset() {
  if (isResetting.value) return
  showResetDialog.value = false
}

function handleResetKey() {
  if (isResetting.value) return
  isResetting.value = true
  setTimeout(() => {
    isResetting.value = false
    showResetDialog.value = false
  }, 1500)
}

function onBack() {
  goBack()
}
</script>

<style scoped>
/* 骨架屏 */
.skeleton-page {
  min-height: 100vh;
  background: #FAF8F5;
  padding: 32rpx;
}
.skeleton-nav {
  height: 88rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}
.skeleton-card {
  height: 360rpx;
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 32rpx;
}
.skeleton-card-sm {
  height: 240rpx;
}

/* 错误状态 */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FAF8F5;
  padding: 48rpx;
}
.error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}
.retry-btn {
  padding: 20rpx 64rpx;
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}

/* 顶部导航 */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1rpx solid #E8E3DB;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-dl {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
}
.nav-dl-txt {
  font-size: 24rpx;
  color: #666;
}

.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* 卡片基础 */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid #E8E3DB;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.card-head-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.card-sub {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 24rpx;
}

/* 推流状态卡 */
.status-card {
  border-width: 2rpx;
}
.status-card.s-online {
  border-color: rgba(22, 163, 74, 0.3);
  background: rgba(22, 163, 74, 0.05);
}
.status-card.s-connecting {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.05);
}
.status-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.status-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.status-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.status-badge {
  padding: 4rpx 20rpx;
  border-radius: 999rpx;
  background: #999;
}
.status-badge.s-online {
  background: #16a34a;
}
.status-badge.s-connecting {
  background: #f59e0b;
}
.status-badge-txt {
  font-size: 22rpx;
  color: #fff;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.stat-item {
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background: #fff;
}
.stat-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-bottom: 8rpx;
}
.stat-label-txt {
  font-size: 20rpx;
  color: #999;
}
.stat-value {
  font-size: 26rpx;
  font-weight: 700;
  color: #2C2C2C;
}
.mono {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
}
.drop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #E8E3DB;
}
.drop-label {
  font-size: 24rpx;
  color: #999;
}
.drop-value {
  font-size: 24rpx;
  font-weight: 500;
  color: #f59e0b;
}
.drop-value.good {
  color: #16a34a;
}
.drop-frames {
  font-size: 24rpx;
  color: #999;
  margin-left: 8rpx;
}
.status-offline-tip {
  font-size: 26rpx;
  color: #999;
}

/* 字段 */
.field {
  margin-bottom: 32rpx;
}
.field-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.field-value-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.field-value {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  line-height: 48rpx;
  padding: 12rpx 24rpx;
  background: rgba(232, 227, 219, 0.4);
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #2C2C2C;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.field-value-wrap .field-value {
  padding-right: 72rpx;
}
.field-eye {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
}
.field-btn {
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.reset-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8rpx;
}
.reset-tip {
  font-size: 24rpx;
  color: #999;
}
.reset-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 12rpx;
}
.reset-btn-txt {
  font-size: 24rpx;
  color: #2C2C2C;
}

/* 步骤 */
.steps {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.step-row {
  display: flex;
  gap: 24rpx;
}
.step-num {
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-num-txt {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--brand);
}
.step-info {
  flex: 1;
  padding-top: 4rpx;
}
.step-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.step-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}
.warn-box {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 32rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: rgba(245, 158, 11, 0.1);
  border: 1rpx solid rgba(245, 158, 11, 0.2);
}
.warn-text {
  flex: 1;
}
.warn-title {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #d97706;
}
.warn-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  line-height: 1.5;
}

/* 画质预设 */
.quality-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.quality-item {
  padding: 24rpx;
  border-radius: 16rpx;
  border: 2rpx solid #E8E3DB;
}
.quality-item.active {
  border-color: var(--brand);
  background: rgba(196, 30, 58, 0.05);
}
.quality-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.quality-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.quality-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}
.quality-rec {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #16a34a;
}
.quality-rec-txt {
  font-size: 20rpx;
  color: #fff;
}
.quality-radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(153, 153, 153, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.quality-radio.active {
  border-color: var(--brand);
  background: var(--brand);
}
.quality-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}
.quality-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}
.quality-cell-label {
  display: block;
  font-size: 22rpx;
  color: #999;
}
.quality-cell-value {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-top: 2rpx;
}
.speed-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 32rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: rgba(232, 227, 219, 0.4);
}
.speed-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.speed-txt {
  font-size: 26rpx;
  color: #2C2C2C;
}
.speed-btn {
  padding: 10rpx 24rpx;
  border: 1rpx solid #E8E3DB;
  border-radius: 12rpx;
  background: #fff;
}
.speed-btn-txt {
  font-size: 24rpx;
  color: #2C2C2C;
}

/* 输出参考 */
.output-list {
  display: flex;
  flex-direction: column;
}
.output-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E8E3DB;
}
.output-row.last {
  border-bottom: none;
}
.output-label {
  font-size: 26rpx;
  color: #999;
}
.output-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #2C2C2C;
}

/* FAQ */
.faq-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.faq-q-txt {
  font-size: 26rpx;
  color: #2C2C2C;
}
.faq-a {
  display: block;
  font-size: 24rpx;
  color: #999;
  padding: 0 0 16rpx 16rpx;
  line-height: 1.6;
  white-space: pre-line;
}
.rot-down {
  transform: rotate(-90deg);
}
.rot-up {
  transform: rotate(90deg);
}

/* 对话框 */
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.dialog {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
}
.dialog-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 16rpx;
}
.dialog-desc {
  display: block;
  font-size: 26rpx;
  color: #999;
  line-height: 1.6;
  margin-bottom: 40rpx;
}
.dialog-foot {
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
}
.dialog-btn {
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
}
.dialog-btn.cancel {
  border: 1rpx solid #E8E3DB;
  background: #fff;
}
.dialog-btn.confirm {
  background: #ef4444;
}
.dialog-btn.disabled {
  opacity: 0.5;
}
.dialog-btn-txt {
  font-size: 26rpx;
  color: #2C2C2C;
}
.confirm-txt {
  color: #fff;
}

/* 动画 */
.pulse {
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
