<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view
      class="nav"
      :style="{ paddingTop: statusBarHeight + 'px' }"
    >
      <view class="nav-bar">
        <view
          class="nav-btn"
          @tap="goBack"
        >
          <AppIcon
            name="chevron-left"
            :size="48"
            color="#2C2C2C"
          />
        </view>
        <text class="nav-title">
          推流配置
        </text>
        <view class="nav-spacer" />
      </view>
    </view>

    <view class="body">
      <!-- 直播间信息 -->
      <view class="card">
        <view class="room-row">
          <view class="room-icon">
            <AppIcon
              name="monitor"
              :size="48"
              color="#fff"
            />
          </view>
          <view class="room-info">
            <text class="room-title">
              {{ config.roomTitle }}
            </text>
            <text class="room-id">
              直播间ID: {{ config.roomId }}
            </text>
          </view>
        </view>
      </view>

      <!-- 推流状态(默认未推流) -->
      <view class="card">
        <view class="status-row">
          <view class="status-left">
            <view class="status-icon off">
              <AppIcon
                name="wifi-off"
                :size="40"
                color="#999"
              />
            </view>
            <view class="status-text">
              <text class="status-title off">
                未推流
              </text>
              <text class="status-note">
                等待OBS连接
              </text>
            </view>
          </view>
          <view
            class="refresh-btn"
            @tap="handleRefresh"
          >
            <AppIcon
              name="refresh-cw"
              :size="32"
              color="#C41E3A"
              :class="{ spin: checking }"
            />
            <text class="refresh-txt">
              刷新
            </text>
          </view>
        </view>
      </view>

      <!-- 推流地址和密钥 -->
      <view class="card">
        <view class="info-head">
          <AppIcon
            name="settings"
            :size="40"
            color="#C41E3A"
          />
          <text class="info-head-txt">
            推流信息
          </text>
        </view>

        <view class="field">
          <text class="field-label">
            推流地址（服务器）
          </text>
          <view class="field-row">
            <view class="field-value">
              {{ config.streamUrl }}
            </view>
            <view
              class="field-btn"
              :class="{ copied: copiedUrl }"
              @tap="copyUrl"
            >
              <AppIcon
                :name="copiedUrl ? 'check' : 'copy'"
                :size="40"
                :color="copiedUrl ? '#16a34a' : '#666'"
              />
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">
            推流密钥（串流密钥）
          </text>
          <view class="field-row">
            <view class="field-value">
              {{ showKey ? config.streamKey : '••••••••••••••••••••••' }}
            </view>
            <view
              class="field-btn"
              @tap="showKey = !showKey"
            >
              <AppIcon
                :name="showKey ? 'eye-off' : 'eye'"
                :size="40"
                color="#666"
              />
            </view>
            <view
              class="field-btn"
              :class="{ copied: copiedKey }"
              @tap="copyKey"
            >
              <AppIcon
                :name="copiedKey ? 'check' : 'copy'"
                :size="40"
                :color="copiedKey ? '#16a34a' : '#666'"
              />
            </view>
          </view>
          <text class="field-warn">
            请勿泄露推流密钥，否则他人可能冒用您的直播间
          </text>
        </view>
      </view>

      <!-- 推荐参数 -->
      <view class="card">
        <text class="card-title">
          推荐参数设置
        </text>
        <view class="param-grid">
          <view class="param-item">
            <text class="param-label">
              分辨率
            </text>
            <text class="param-value">
              {{ config.recommendedSettings.resolution }}
            </text>
          </view>
          <view class="param-item">
            <text class="param-label">
              比特率
            </text>
            <text class="param-value">
              {{ config.recommendedSettings.bitrate }}
            </text>
          </view>
          <view class="param-item">
            <text class="param-label">
              帧率
            </text>
            <text class="param-value">
              {{ config.recommendedSettings.fps }} fps
            </text>
          </view>
          <view class="param-item">
            <text class="param-label">
              编码器
            </text>
            <text class="param-value">
              {{ config.recommendedSettings.encoder }}
            </text>
          </view>
        </view>
      </view>

      <!-- OBS配置步骤 -->
      <view class="card">
        <view class="obs-head">
          <text class="card-title nomb">
            OBS配置教程
          </text>
          <view class="obs-download">
            <text class="obs-download-txt">
              下载OBS
            </text>
            <AppIcon
              name="external-link"
              :size="32"
              color="#C41E3A"
            />
          </view>
        </view>

        <!-- 步骤指示器 -->
        <scroll-view
          scroll-x
          class="step-indicator"
        >
          <view
            v-for="(_, idx) in obsSteps"
            :key="idx"
            class="step-dot"
            :class="idx === currentStep ? 'active' : idx < currentStep ? 'done' : ''"
            @tap="currentStep = idx"
          >
            <AppIcon
              v-if="idx < currentStep"
              name="check"
              :size="32"
              color="#16a34a"
            />
            <text v-else>
              {{ idx + 1 }}
            </text>
          </view>
        </scroll-view>

        <!-- 当前步骤内容 -->
        <view class="step-box">
          <view class="step-img">
            步骤 {{ currentStep + 1 }} 示意图
          </view>
          <text class="step-box-title">
            步骤 {{ currentStep + 1 }}: {{ obsSteps[currentStep].title }}
          </text>
          <text class="step-box-desc">
            {{ obsSteps[currentStep].description }}
          </text>
        </view>

        <!-- 步骤导航 -->
        <view class="step-nav">
          <text
            class="step-nav-btn prev"
            :class="{ disabled: currentStep === 0 }"
            @tap="prevStep"
          >
            上一步
          </text>
          <text
            class="step-nav-btn next"
            :class="{ disabled: currentStep === obsSteps.length - 1 }"
            @tap="nextStep"
          >
            下一步
          </text>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="card">
        <text class="card-title">
          常见问题
        </text>
        <view class="faq-list">
          <view
            v-for="f in faq"
            :key="f.q"
            class="faq-item"
          >
            <text class="faq-q">
              {{ f.q }}
            </text>
            <text class="faq-a">
              {{ f.a }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { streamConfig, obsConfigSteps, streamConfigFaq } from '@/lib/live-data'

const statusBarHeight = ref(0)
const config = ref(streamConfig)
const obsSteps = ref(obsConfigSteps)
const faq = ref(streamConfigFaq)

// UI 临时状态
const showKey = ref(false)
const copiedUrl = ref(false)
const copiedKey = ref(false)
const checking = ref(false)
const currentStep = ref(0)

function copyUrl() {
  copiedUrl.value = true
  setTimeout(() => (copiedUrl.value = false), 2000)
}
function copyKey() {
  copiedKey.value = true
  setTimeout(() => (copiedKey.value = false), 2000)
}
function handleRefresh() {}
function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}
function nextStep() {
  if (currentStep.value < obsSteps.value.length - 1) currentStep.value++
}
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
  background: linear-gradient(135deg, #C41E3A, #E8546D);
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
.status-note {
  font-size: 28rpx;
  color: #999;
}
.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border: 1rpx solid #C41E3A;
  border-radius: 999rpx;
}
.refresh-txt {
  font-size: 28rpx;
  color: #C41E3A;
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
  color: #C41E3A;
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
  background: #C41E3A;
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
  align-items: center;
  justify-content: center;
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
  color: #C41E3A;
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
</style>
