<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-btn" @tap="goBack">
          <AppIcon name="chevron-left" :size="48" color="#2C2C2C" />
        </view>
        <text class="nav-title">推流配置</text>
        <view class="nav-spacer" />
      </view>
    </view>

    <!-- 加载骨架屏 -->
    <view v-if="loading" class="body">
      <view class="card skeleton-card">
        <view class="skeleton-row"><view class="skeleton skeleton-icon" /><view class="skeleton skeleton-text skeleton-text-lg" /></view>
      </view>
      <view class="card skeleton-card"><view class="skeleton skeleton-text" /><view class="skeleton skeleton-text skeleton-text-sm" /></view>
      <view class="card skeleton-card"><view class="skeleton skeleton-text" /><view class="skeleton skeleton-field" /><view class="skeleton skeleton-field" /></view>
      <view class="card skeleton-card"><view class="skeleton skeleton-text" /><view class="skeleton-params"><view class="skeleton skeleton-param" v-for="i in 4" :key="i" /></view></view>
      <view class="card skeleton-card"><view class="skeleton skeleton-text" /><view class="skeleton skeleton-step" /></view>
      <view class="card skeleton-card"><view class="skeleton skeleton-text" /><view class="skeleton skeleton-faq" v-for="i in 3" :key="i" /></view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="body">
      <view class="card error-card">
        <text class="error-text">{{ error }}</text>
        <view class="retry-btn" @tap="fetchData"><text class="retry-btn-txt">重新加载</text></view>
      </view>
    </view>

    <!-- 正常内容 -->
    <view v-else class="body">
      <!-- 直播间信息 -->
      <view class="card">
        <view class="room-row">
          <view class="room-icon">
            <AppIcon name="monitor" :size="48" color="#fff" />
          </view>
          <view class="room-info">
            <text class="room-title">{{ config.roomTitle || 'OBS 推流账户' }}</text>
            <text class="room-id">推流标识: {{ config.roomId || '暂未生成' }}</text>
          </view>
        </view>
      </view>

      <!-- 这里只能确认推流凭据是否就绪，实际连接状态以 OBS 为准 -->
      <view class="card">
        <view class="status-row">
          <view class="status-left">
            <view class="status-icon" :class="configReady ? 'ready' : 'off'">
              <AppIcon :name="configReady ? 'check' : 'wifi-off'" :size="40" :color="configReady ? '#16a34a' : '#999'" />
            </view>
            <view class="status-text">
              <text class="status-title" :class="configReady ? 'ready' : 'off'">{{ configReady ? '推流信息已就绪' : '推流服务未配置' }}</text>
              <text class="status-note">{{ configReady ? '连接状态请以 OBS 显示为准' : '请联系管理员配置直播域名' }}</text>
            </view>
          </view>
          <view class="refresh-btn" :class="{ disabled: checking }" @tap="handleRefresh">
            <AppIcon name="refresh-cw" :size="32" color="#C41E3A" :class="{ spin: checking }" />
            <text class="refresh-txt">{{ checking ? '更新中' : '更新地址' }}</text>
          </view>
        </view>
      </view>

      <!-- 推流地址和密钥 -->
      <view class="card">
        <view class="info-head">
          <AppIcon name="settings" :size="40" color="#C41E3A" />
          <text class="info-head-txt">推流信息</text>
        </view>

        <view class="field">
          <text class="field-label">推流地址（服务器）</text>
          <view class="field-row">
            <view class="field-value">{{ config.streamUrl || '暂未配置' }}</view>
            <view class="field-btn" :class="{ copied: copiedUrl, disabled: !config.streamUrl }" @tap="copyUrl">
              <AppIcon :name="copiedUrl ? 'check' : 'copy'" :size="40" :color="copiedUrl ? '#16a34a' : '#666'" />
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">推流密钥（串流密钥）</text>
          <view class="field-row">
            <view class="field-value">{{ config.streamKey ? (showKey ? config.streamKey : '••••••••••••••••••••••') : '暂未配置' }}</view>
            <view class="field-btn" @tap="showKey = !showKey">
              <AppIcon :name="showKey ? 'eye-off' : 'eye'" :size="40" color="#666" />
            </view>
            <view class="field-btn" :class="{ copied: copiedKey, disabled: !config.streamKey }" @tap="copyKey">
              <AppIcon :name="copiedKey ? 'check' : 'copy'" :size="40" :color="copiedKey ? '#16a34a' : '#666'" />
            </view>
          </view>
          <text class="field-warn">请勿泄露推流密钥，否则他人可能冒用您的直播间</text>
        </view>
      </view>

      <!-- 推荐参数 -->
      <view class="card">
        <text class="card-title">推荐参数设置</text>
        <view class="param-grid">
          <view class="param-item">
            <text class="param-label">分辨率</text>
            <text class="param-value">{{ config.recommendedSettings.resolution }}</text>
          </view>
          <view class="param-item">
            <text class="param-label">比特率</text>
            <text class="param-value">{{ config.recommendedSettings.bitrate }}</text>
          </view>
          <view class="param-item">
            <text class="param-label">帧率</text>
            <text class="param-value">{{ config.recommendedSettings.fps }} fps</text>
          </view>
          <view class="param-item">
            <text class="param-label">编码器</text>
            <text class="param-value">{{ config.recommendedSettings.encoder }}</text>
          </view>
        </view>
      </view>

      <!-- OBS配置步骤 -->
      <view class="card">
        <view class="obs-head">
          <text class="card-title nomb">OBS配置教程</text>
          <view class="obs-download" @tap="openObsDownload">
            <text class="obs-download-txt">下载OBS</text>
            <AppIcon name="external-link" :size="32" color="#C41E3A" />
          </view>
        </view>

        <!-- 步骤指示器 -->
        <scroll-view scroll-x class="step-indicator">
          <view
            v-for="(_, idx) in obsSteps"
            :key="idx"
            class="step-dot"
            :class="idx === currentStep ? 'active' : idx < currentStep ? 'done' : ''"
            @tap="currentStep = idx"
          >
            <AppIcon v-if="idx < currentStep" name="check" :size="32" color="#16a34a" />
            <text v-else>{{ idx + 1 }}</text>
          </view>
        </scroll-view>

        <!-- 当前步骤内容 -->
        <view class="step-box">
          <view class="step-img">
            <AppIcon name="settings" :size="48" color="#a98b60" />
            <text>请在 OBS 设置中完成本步骤</text>
          </view>
          <text class="step-box-title">步骤 {{ currentStep + 1 }}: {{ obsSteps[currentStep].title }}</text>
          <text class="step-box-desc">{{ obsSteps[currentStep].description }}</text>
        </view>

        <!-- 步骤导航 -->
        <view class="step-nav">
          <text class="step-nav-btn prev" :class="{ disabled: currentStep === 0 }" @tap="prevStep">上一步</text>
          <text class="step-nav-btn next" :class="{ disabled: currentStep === obsSteps.length - 1 }" @tap="nextStep">下一步</text>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="card">
        <text class="card-title">常见问题</text>
        <view class="faq-list">
          <view v-for="f in faq" :key="f.q" class="faq-item">
            <text class="faq-q">{{ f.q }}</text>
            <text class="faq-a">{{ f.a }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { liveApi, obsConfigSteps, streamConfigFaq, type StreamConfig } from '@/lib/live-data'

const statusBarHeight = ref(0)
const loading = ref(true)
const error = ref('')
const config = ref<StreamConfig>({
  roomId: '',
  roomTitle: '',
  streamUrl: '',
  streamKey: '',
  playUrl: '',
  recommendedSettings: { resolution: '', bitrate: '', fps: '', encoder: '' },
})
const obsSteps = ref(obsConfigSteps)
const faq = ref(streamConfigFaq)

// UI 临时状态
const showKey = ref(false)
const copiedUrl = ref(false)
const copiedKey = ref(false)
const checking = ref(false)
const currentStep = ref(0)
const configReady = computed(() => Boolean(config.value.streamUrl && config.value.streamKey))

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await liveApi.getStreamConfig()
    config.value = res
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败，请重试'
  } finally {
    loading.value = false
  }
}

function copyUrl() {
  const value = config.value.streamUrl
  if (!value) {
    uni.showToast({ title: '推流地址暂未配置', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: value,
    success: () => {
      copiedUrl.value = true
      uni.showToast({ title: '推流地址已复制', icon: 'none' })
      setTimeout(() => (copiedUrl.value = false), 2000)
    },
    fail: () => uni.showToast({ title: '复制失败，请长按复制', icon: 'none' }),
  })
}
function copyKey() {
  const value = config.value.streamKey
  if (!value) {
    uni.showToast({ title: '推流密钥暂未配置', icon: 'none' })
    return
  }
  uni.setClipboardData({
    data: value,
    success: () => {
      copiedKey.value = true
      uni.showToast({ title: '推流密钥已复制', icon: 'none' })
      setTimeout(() => (copiedKey.value = false), 2000)
    },
    fail: () => uni.showToast({ title: '复制失败，请长按复制', icon: 'none' }),
  })
}
async function handleRefresh() {
  if (checking.value) return
  checking.value = true
  try {
    config.value = await liveApi.getStreamConfig()
    uni.showToast({ title: '推流信息已更新', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error)?.message || '更新失败，请重试', icon: 'none' })
  } finally {
    checking.value = false
  }
}
function openObsDownload() {
  const url = 'https://obsproject.com/download'
  // #ifdef H5
  window.open(url, '_blank', 'noopener,noreferrer')
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '下载地址已复制，请在浏览器打开', icon: 'none' }),
    fail: () => uni.showToast({ title: '请访问 obsproject.com 下载', icon: 'none' }),
  })
  // #endif
}
function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}
function nextStep() {
  if (currentStep.value < obsSteps.value.length - 1) currentStep.value++
}

onMounted(() => { fetchData() })
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FAF8F5;
  padding-bottom: 48rpx;
}
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 1rpx solid #E8E3DB;
}
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
}
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.nav-spacer {
  width: 48rpx;
}
.body {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* Card */
.card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
  margin-bottom: 24rpx;
}
.card-title.nomb {
  margin-bottom: 0;
}

/* 直播间信息 */
.room-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.room-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--brand), #E8546D);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.room-info {
  flex: 1;
  min-width: 0;
}
.room-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.room-id {
  font-size: 28rpx;
  color: #999;
}

/* 推流状态 */
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.status-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.status-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-icon.off {
  background: #f3f4f6;
}
.status-icon.ready {
  background: #dcfce7;
}
.status-text {
  display: flex;
  flex-direction: column;
}
.status-title {
  font-size: 28rpx;
  font-weight: 500;
}
.status-title.off {
  color: #666;
}
.status-title.ready {
  color: #15803d;
}
.status-note {
  font-size: 28rpx;
  color: #999;
}
.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border: 1rpx solid var(--brand);
  border-radius: 999rpx;
}
.refresh-btn.disabled {
  opacity: 0.55;
}
.refresh-txt {
  font-size: 28rpx;
  color: var(--brand);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 推流信息 */
.info-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.info-head-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #2C2C2C;
}
.field {
  margin-bottom: 32rpx;
}
.field:last-child {
  margin-bottom: 0;
}
.field-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.field-value {
  flex: 1;
  background: #FAF8F5;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-family: monospace;
  font-size: 28rpx;
  color: #2C2C2C;
  word-break: break-all;
}
.field-btn {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.field-btn.copied {
  background: #dcfce7;
}
.field-btn.disabled {
  opacity: 0.45;
}
.field-warn {
  display: block;
  font-size: 24rpx;
  color: #f97316;
  margin-top: 12rpx;
}

/* 推荐参数 */
.param-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}
.param-item {
  background: #FAF8F5;
  border-radius: 24rpx;
  padding: 24rpx;
}
.param-label {
  display: block;
  font-size: 24rpx;
  color: #999;
}
.param-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
}

/* OBS步骤 */
.obs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.obs-download {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.obs-download-txt {
  font-size: 28rpx;
  color: var(--brand);
}
.step-indicator {
  white-space: nowrap;
  margin-bottom: 32rpx;
}
.step-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #FAF8F5;
  color: #999;
  font-size: 28rpx;
  font-weight: 500;
  margin-right: 8rpx;
  flex-shrink: 0;
}
.step-dot.active {
  background: var(--brand);
  color: #fff;
}
.step-dot.done {
  background: #dcfce7;
  color: #16a34a;
}
.step-box {
  background: #FAF8F5;
  border-radius: 24rpx;
  padding: 32rpx;
}
.step-img {
  aspect-ratio: 16 / 9;
  background: #E8E3DB;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.step-img text {
  font-size: 28rpx;
  color: #999;
}
.step-box-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 8rpx;
}
.step-box-desc {
  font-size: 28rpx;
  color: #666;
}
.step-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 32rpx;
}
.step-nav-btn {
  padding: 16rpx 32rpx;
  font-size: 28rpx;
}
.step-nav-btn.prev {
  color: #666;
}
.step-nav-btn.next {
  color: var(--brand);
  font-weight: 500;
}
.step-nav-btn.disabled {
  opacity: 0.5;
}

/* FAQ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.faq-item {
  background: #FAF8F5;
  border-radius: 24rpx;
  padding: 24rpx;
}
.faq-q {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2C2C2C;
  margin-bottom: 8rpx;
}
.faq-a {
  font-size: 24rpx;
  color: #666;
}

/* 骨架屏 */
.skeleton-card { display: flex; flex-direction: column; gap: 24rpx; }
.skeleton { background: linear-gradient(90deg, #e8e3db 25%, #f0ede6 50%, #e8e3db 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12rpx; }
.skeleton-row { display: flex; align-items: center; gap: 24rpx; }
.skeleton-icon { width: 96rpx; height: 96rpx; border-radius: 24rpx; flex-shrink: 0; }
.skeleton-text { height: 32rpx; width: 60%; }
.skeleton-text-lg { height: 40rpx; width: 80%; }
.skeleton-text-sm { height: 28rpx; width: 45%; }
.skeleton-field { height: 80rpx; width: 100%; }
.skeleton-params { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.skeleton-param { height: 100rpx; width: 100%; }
.skeleton-step { height: 300rpx; width: 100%; }
.skeleton-faq { height: 80rpx; width: 100%; margin-bottom: 24rpx; }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

/* 错误状态 */
.error-card { display: flex; flex-direction: column; align-items: center; gap: 32rpx; padding: 80rpx 32rpx; }
.error-text { font-size: 28rpx; color: #999; text-align: center; }
.error-icon { width: 80rpx; height: 80rpx; }
.retry-btn { padding: 16rpx 48rpx; border: 1rpx solid var(--brand); border-radius: 999rpx; }
.retry-btn-txt { font-size: 28rpx; color: var(--brand); }
</style>
