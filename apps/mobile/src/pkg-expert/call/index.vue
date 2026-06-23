<script setup lang="ts">
/**
 * 连麦通话页 /call/:id —— 1:1 迁移自原型 app/call/[id]/page.tsx
 * 状态机：booking(预约) -> waiting(等待) -> connecting(连接中) -> active(通话中) -> ended(结束)
 * 另含 lowBalance 余额不足弹窗 + 网络断连重连浮层(复用 agent/reconnecting-overlay)
 * 入口：reservations 页 href=`/call/${id}`
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import ReconnectingOverlay from '@/components/agent/reconnecting-overlay.vue'

// 达人数据（照抄原型 expertData）
const expertData = {
  id: 1,
  name: '周易大师',
  avatar: '',
  title: '八字命理资深讲师',
  status: 'online' as 'online' | 'busy' | 'offline',
  pricePerMinute: 10,
  packages: [
    { id: 1, duration: 15, price: 120, originalPrice: 150, discount: '8折', recommended: false },
    { id: 2, duration: 30, price: 220, originalPrice: 300, discount: '7.3折', recommended: true },
    { id: 3, duration: 60, price: 400, originalPrice: 600, discount: '6.7折', recommended: false },
  ],
  rating: 4.9,
  totalCalls: 856,
}

// 用户余额（照抄原型 userBalance）
const userBalance = 280

type CallState = 'booking' | 'waiting' | 'connecting' | 'active' | 'ended' | 'lowBalance'

const callState = ref<CallState>('booking')
const callType = ref<'audio' | 'video'>('audio')
const selectedPackage = ref<number | null>(2)
const usePerMinute = ref(false)
const questionDescription = ref('')

// 通话中状态
const isMuted = ref(false)
const isVideoOn = ref(true)
const useVirtualAvatar = ref(false)
const callDuration = ref(0)
const totalCost = ref(0)
const showLowBalanceWarning = ref(false)
const isReconnecting = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const callTypes = [
  { type: 'audio' as const, icon: 'phone', label: '语音连麦' },
  { type: 'video' as const, icon: 'video', label: '视频连麦' },
]

// 音频波形高度（照抄原型 Math.random()*24+8，逻辑一致）
const waveBars = Array.from({ length: 12 }, () => Math.random() * 24 + 8)

// 计算价格
const priceInfo = computed(() => {
  if (usePerMinute.value) {
    return { type: 'perMinute' as const, price: expertData.pricePerMinute }
  }
  const pkg = expertData.packages.find((p) => p.id === selectedPackage.value)
  return pkg ? { type: 'package' as const, price: pkg.price, duration: pkg.duration } : null
})

const startDisabled = computed(
  () => expertData.status !== 'online' || (!selectedPackage.value && !usePerMinute.value),
)

// 格式化时间
function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

function pkgPerMin(pkg: { price: number; duration: number }) {
  return Math.round(pkg.price / pkg.duration)
}

function togglePerMinute() {
  usePerMinute.value = !usePerMinute.value
  selectedPackage.value = null
}

// 开始通话
function startCall() {
  if (startDisabled.value) return
  callState.value = 'waiting'
  setTimeout(() => {
    callState.value = 'connecting'
    setTimeout(() => {
      callState.value = 'active'
    }, 1500)
  }, 2000)
}

// 挂断
function endCall() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  callState.value = 'ended'
}

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// 通话计时和扣费（重连期间暂停）
watch([callState, isReconnecting], () => {
  clearTimer()
  if (callState.value === 'active' && !isReconnecting.value) {
    timer = setInterval(() => {
      const newDuration = callDuration.value + 1
      callDuration.value = newDuration
      if (newDuration % 30 === 0 && usePerMinute.value) {
        totalCost.value += expertData.pricePerMinute / 2
      }
      if (newDuration === 60 && !showLowBalanceWarning.value) {
        showLowBalanceWarning.value = true
      }
    }, 1000)
  }
})

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index', fail: () => {} }) })
}

function goRecharge() {
  uni.navigateTo({ url: '/pkg-wallet/recharge/index', fail: () => uni.showToast({ title: '充值', icon: 'none' }) })
}

onUnmounted(() => clearTimer())
</script>

<template>
  <!-- ============ 预约界面 ============ -->
  <view v-if="callState === 'booking'" class="page">
    <!-- 顶部导航 -->
    <view class="navbar">
      <view class="nav-back" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
      </view>
      <text class="nav-title">预约连麦</text>
      <view class="nav-placeholder" />
    </view>

    <view class="content">
      <!-- 达人信息 -->
      <view class="card expert-card">
        <view class="expert-avatar-wrap">
          <view class="expert-avatar">
            <text class="avatar-letter">{{ expertData.name[0] }}</text>
          </view>
          <view
            class="status-dot"
            :class="expertData.status === 'online' ? 'dot-online' : expertData.status === 'busy' ? 'dot-busy' : 'dot-offline'"
          />
        </view>
        <view class="expert-info">
          <view class="expert-name-row">
            <text class="expert-name">{{ expertData.name }}</text>
            <text class="badge-v">V</text>
          </view>
          <text class="expert-title">{{ expertData.title }}</text>
          <view class="expert-meta">
            <view class="meta-item">
              <app-icon name="sparkles" :size="24" color="#C9A96E" />
              <text class="meta-text">{{ expertData.rating }}分</text>
            </view>
            <text class="meta-text">{{ expertData.totalCalls }}次连麦</text>
          </view>
        </view>
        <text
          class="status-badge"
          :class="expertData.status === 'online' ? 'sb-online' : expertData.status === 'busy' ? 'sb-busy' : 'sb-offline'"
        >
          {{ expertData.status === 'online' ? '在线' : expertData.status === 'busy' ? '忙碌' : '离线' }}
        </text>
      </view>

      <!-- 通话类型选择 -->
      <view class="section">
        <text class="section-title">选择通话方式</text>
        <view class="type-grid">
          <view
            v-for="item in callTypes"
            :key="item.type"
            class="type-btn"
            :class="{ 'type-active': callType === item.type }"
            @tap="callType = item.type"
          >
            <app-icon :name="item.icon" :size="40" :color="callType === item.type ? '#C41E3A' : '#999999'" />
            <text class="type-label" :class="{ 'label-active': callType === item.type }">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 时长套餐 -->
      <view class="section">
        <view class="section-head">
          <text class="section-title-inline">选择咨询时长</text>
          <text class="toggle-btn" :class="{ 'toggle-on': usePerMinute }" @tap="togglePerMinute">按分钟计费</text>
        </view>

        <view v-if="!usePerMinute" class="pkg-list">
          <view
            v-for="pkg in expertData.packages"
            :key="pkg.id"
            class="pkg-item"
            :class="{ 'pkg-active': selectedPackage === pkg.id }"
            @tap="selectedPackage = pkg.id"
          >
            <view class="pkg-left">
              <view class="pkg-icon">
                <app-icon name="clock" :size="36" color="#C41E3A" />
              </view>
              <view class="pkg-detail">
                <view class="pkg-title-row">
                  <text class="pkg-duration">{{ pkg.duration }}分钟</text>
                  <text class="badge-discount">{{ pkg.discount }}</text>
                  <text v-if="pkg.recommended" class="badge-recommend">推荐</text>
                </view>
                <text class="pkg-permin">约{{ pkgPerMin(pkg) }}币/分钟</text>
              </view>
            </view>
            <view class="pkg-right">
              <text class="pkg-price">{{ pkg.price }}币</text>
              <text class="pkg-origin">{{ pkg.originalPrice }}币</text>
            </view>
          </view>
        </view>

        <view v-else class="card permin-card">
          <view class="permin-left">
            <view class="permin-icon">
              <app-icon name="coins" :size="36" color="#C41E3A" />
            </view>
            <view>
              <text class="permin-title">按分钟计费</text>
              <text class="permin-desc">通话结束后自动结算</text>
            </view>
          </view>
          <text class="permin-price">{{ expertData.pricePerMinute }}币/分钟</text>
        </view>
      </view>

      <!-- 问题描述 -->
      <view class="section">
        <text class="section-title">问题描述（选填）</text>
        <textarea
          v-model="questionDescription"
          class="desc-textarea"
          placeholder="简要描述你想咨询的问题，帮助达人更好地准备..."
          placeholder-class="desc-placeholder"
          :maxlength="-1"
        />
      </view>

      <!-- 余额提示 -->
      <view class="card balance-card">
        <view class="balance-left">
          <app-icon name="coins" :size="32" color="#C9A96E" />
          <text class="balance-label">账户余额</text>
        </view>
        <view class="balance-right">
          <text class="balance-amount">{{ userBalance }}币</text>
          <text class="balance-recharge" @tap="goRecharge">充值</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view class="footer-row">
        <text class="footer-label">预计费用</text>
        <text v-if="priceInfo && priceInfo.type === 'package'" class="footer-price">{{ priceInfo.price }}币</text>
        <text v-else class="footer-price">{{ expertData.pricePerMinute }}币/分钟</text>
      </view>
      <view class="start-btn" :class="{ 'start-disabled': startDisabled }" @tap="startCall">
        <app-icon :name="callType === 'video' ? 'video' : 'phone'" :size="40" color="#ffffff" />
        <text class="start-text">{{ expertData.status === 'online' ? '开始连麦' : '达人不在线' }}</text>
      </view>
    </view>
  </view>

  <!-- ============ 等待接通 / 连接中 ============ -->
  <view v-else-if="callState === 'waiting' || callState === 'connecting'" class="page waiting-page">
    <view class="waiting-avatar-wrap">
      <view class="waiting-ring" :class="callState === 'connecting' ? 'ring-ping' : 'ring-pulse'" />
      <view class="waiting-avatar">
        <text class="waiting-letter">{{ expertData.name[0] }}</text>
      </view>
    </view>
    <text class="waiting-name">{{ expertData.name }}</text>
    <text class="waiting-tip">{{ callState === 'waiting' ? '正在等待对方接听...' : '正在连接中...' }}</text>
    <view class="hangup-btn" @tap="callState = 'booking'">
      <app-icon name="phone-off" :size="56" color="#ffffff" />
    </view>
    <text class="hangup-label">挂断</text>
  </view>

  <!-- ============ 通话中 ============ -->
  <view v-else-if="callState === 'active'" class="page active-page">
    <!-- 费用提示角标 -->
    <view class="cost-badge">
      <app-icon name="clock" :size="28" color="#ffffff" />
      <text class="cost-time">{{ formatDuration(callDuration) }}</text>
      <text class="cost-sep">|</text>
      <app-icon name="coins" :size="28" color="#C9A96E" />
      <text class="cost-coins">{{ usePerMinute ? totalCost.toFixed(0) : priceInfo?.price }}币</text>
    </view>

    <!-- 虚拟头像切换 -->
    <view class="avatar-toggle" :class="{ 'toggle-virtual': useVirtualAvatar }" @tap="useVirtualAvatar = !useVirtualAvatar">
      <app-icon name="user" :size="28" color="#ffffff" />
      <text class="toggle-text">{{ useVirtualAvatar ? '虚拟头像' : '真实画面' }}</text>
    </view>

    <!-- 视频/音频区域 -->
    <view class="media-area">
      <view v-if="callType === 'video' && isVideoOn && !useVirtualAvatar" class="video-placeholder">
        <text class="video-hint">视频画面区域</text>
      </view>
      <view v-else class="audio-mode">
        <view v-if="useVirtualAvatar" class="virtual-avatar">
          <app-icon name="user" :size="64" color="#ffffff" />
        </view>
        <view v-else class="big-avatar">
          <text class="big-letter">{{ expertData.name[0] }}</text>
        </view>
        <text class="active-name">{{ expertData.name }}</text>
        <view class="wave">
          <view
            v-for="(h, i) in waveBars"
            :key="i"
            class="wave-bar"
            :style="{ height: h + 'rpx', animationDelay: i * 0.1 + 's' }"
          />
        </view>
      </view>

      <!-- 小窗（自己的画面） -->
      <view v-if="callType === 'video'" class="self-window">
        <view v-if="isVideoOn" class="self-video">
          <app-icon name="user" :size="32" color="rgba(255,255,255,0.4)" />
        </view>
        <view v-else class="self-video">
          <app-icon name="video-off" :size="24" color="rgba(255,255,255,0.4)" />
        </view>
      </view>
    </view>

    <!-- 底部控制栏 -->
    <view class="active-footer">
      <view class="ctrl-row">
        <view class="ctrl-btn" :class="{ 'ctrl-danger': isMuted }" @tap="isMuted = !isMuted">
          <app-icon :name="isMuted ? 'mic-off' : 'mic'" :size="48" color="#ffffff" />
        </view>
        <view class="ctrl-btn ctrl-hangup" @tap="endCall">
          <app-icon name="phone-off" :size="56" color="#ffffff" />
        </view>
        <view v-if="callType === 'video'" class="ctrl-btn" :class="{ 'ctrl-danger': !isVideoOn }" @tap="isVideoOn = !isVideoOn">
          <app-icon :name="isVideoOn ? 'video' : 'video-off'" :size="48" color="#ffffff" />
        </view>
        <view class="ctrl-btn">
          <app-icon name="message-circle" :size="48" color="#ffffff" />
        </view>
      </view>

      <!-- 网络状态（点击模拟断连） -->
      <view class="net-status" @tap="isReconnecting = true">
        <app-icon name="volume-2" :size="28" color="rgba(255,255,255,0.4)" />
        <text class="net-text">网络正常 · 点此模拟断连</text>
      </view>
    </view>

    <!-- 网络断连重连浮层（复用公共组件） -->
    <reconnecting-overlay
      :open="isReconnecting"
      @reconnected="isReconnecting = false"
      @end-call="endCall"
    />

    <!-- 余额不足提醒弹窗 -->
    <view v-if="showLowBalanceWarning" class="low-balance-mask">
      <view class="low-balance-card">
        <view class="lb-head">
          <view class="lb-icon">
            <app-icon name="alert-triangle" :size="40" color="#EAB308" />
          </view>
          <view>
            <text class="lb-title">余额即将不足</text>
            <text class="lb-desc">预计还可通话约1分钟</text>
          </view>
        </view>
        <view class="lb-balance">
          <text class="lb-balance-label">当前余额</text>
          <text class="lb-balance-amount">{{ userBalance - totalCost }}币</text>
        </view>
        <view class="lb-actions">
          <view class="lb-btn lb-btn-ghost" @tap="showLowBalanceWarning = false">
            <text class="lb-btn-text-dark">稍后再说</text>
          </view>
          <view class="lb-btn lb-btn-primary" @tap="goRecharge">
            <text class="lb-btn-text-light">立即充值</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- ============ 通话结束 ============ -->
  <view v-else-if="callState === 'ended'" class="page ended-page">
    <view class="ended-check">
      <app-icon name="check" :size="80" color="#22C55E" />
    </view>
    <text class="ended-title">通话已结束</text>
    <text class="ended-sub">感谢你的咨询</text>

    <view class="card ended-card">
      <view class="ended-row">
        <text class="ended-row-label">通话时长</text>
        <text class="ended-row-value">{{ formatDuration(callDuration) }}</text>
      </view>
      <view class="ended-row">
        <text class="ended-row-label">本次消费</text>
        <text class="ended-row-cost">{{ usePerMinute ? totalCost : priceInfo?.price }}币</text>
      </view>
      <view class="ended-row">
        <text class="ended-row-label">咨询达人</text>
        <text class="ended-row-value">{{ expertData.name }}</text>
      </view>
    </view>

    <view class="ended-actions">
      <view class="ended-btn ended-btn-ghost" @tap="goBack">
        <text class="ended-btn-text-dark">返回</text>
      </view>
      <view class="ended-btn ended-btn-primary" @tap="callState = 'booking'">
        <text class="ended-btn-text-light">再次咨询</text>
      </view>
    </view>
  </view>

  </view>
  </view>
  </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  padding-top: var(--status-bar-height, 0);
  background: rgba(250, 248, 245, 0.95);
  border-bottom: 2rpx solid #e8e0d5;
}
.nav-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.nav-placeholder {
  width: 72rpx;
}

.content {
  padding: 32rpx;
  padding-bottom: 256rpx;
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
}

/* 达人信息卡 */
.expert-card {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}
.expert-avatar-wrap {
  position: relative;
}
.expert-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-letter {
  font-size: 44rpx;
  color: #c41e3a;
}
.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 4rpx solid #ffffff;
}
.dot-online {
  background: #22c55e;
}
.dot-busy {
  background: #eab308;
}
.dot-offline {
  background: #9ca3af;
}
.expert-info {
  flex: 1;
}
.expert-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.expert-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.badge-v {
  font-size: 20rpx;
  padding: 0 12rpx;
  line-height: 32rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
  border-radius: 8rpx;
}
.expert-title {
  display: block;
  font-size: 28rpx;
  color: #999999;
  margin-top: 4rpx;
}
.expert-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 8rpx;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.meta-text {
  font-size: 24rpx;
  color: #999999;
}
.status-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
}
.sb-online {
  background: rgba(34, 197, 94, 0.2);
  color: #16a34a;
}
.sb-busy {
  background: rgba(234, 179, 8, 0.2);
  color: #ca8a04;
}
.sb-offline {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

/* 通用 section */
.section {
  margin-bottom: 32rpx;
}
.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.section-title-inline {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.toggle-btn {
  font-size: 24rpx;
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: #f5f1eb;
  color: #999999;
}
.toggle-on {
  background: #c41e3a;
  color: #ffffff;
}

/* 通话类型 */
.type-grid {
  display: flex;
  gap: 24rpx;
}
.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #e8e0d5;
}
.type-active {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}
.type-label {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.label-active {
  color: #c41e3a;
}

/* 套餐 */
.pkg-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.pkg-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-radius: 24rpx;
  border: 4rpx solid #e8e0d5;
}
.pkg-active {
  border-color: #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}
.pkg-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.pkg-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pkg-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.pkg-duration {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.badge-discount {
  font-size: 20rpx;
  padding: 0 12rpx;
  line-height: 32rpx;
  background: rgba(201, 169, 110, 0.2);
  color: #c9a96e;
  border-radius: 8rpx;
}
.badge-recommend {
  font-size: 20rpx;
  padding: 0 12rpx;
  line-height: 32rpx;
  background: #c41e3a;
  color: #ffffff;
  border-radius: 8rpx;
}
.pkg-permin {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 4rpx;
}
.pkg-right {
  text-align: right;
}
.pkg-price {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #c41e3a;
}
.pkg-origin {
  font-size: 24rpx;
  color: #999999;
  text-decoration: line-through;
}

/* 按分钟卡片 */
.permin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border: 4rpx solid #c41e3a;
  background: rgba(196, 30, 58, 0.05);
}
.permin-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.permin-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.permin-title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.permin-desc {
  font-size: 24rpx;
  color: #999999;
}
.permin-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #c41e3a;
}

/* 问题描述 */
.desc-textarea {
  width: 100%;
  height: 192rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(245, 241, 235, 0.5);
  border: 2rpx solid #e8e0d5;
  font-size: 28rpx;
  color: #2c2c2c;
  box-sizing: border-box;
}
.desc-placeholder {
  color: #999999;
}

/* 余额卡 */
.balance-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: rgba(201, 169, 110, 0.05);
  border: 2rpx solid rgba(201, 169, 110, 0.2);
}
.balance-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.balance-label {
  font-size: 28rpx;
  color: #2c2c2c;
}
.balance-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.balance-amount {
  font-size: 30rpx;
  font-weight: 700;
  color: #c9a96e;
}
.balance-recharge {
  font-size: 24rpx;
  color: #c41e3a;
}

/* 底部操作栏 */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border-top: 2rpx solid #e8e0d5;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.footer-label {
  font-size: 28rpx;
  color: #999999;
}
.footer-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #c41e3a;
}
.start-btn {
  width: 100%;
  height: 100rpx;
  border-radius: 24rpx;
  background: #c41e3a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.start-disabled {
  background: #f5f1eb;
}
.start-text {
  font-size: 32rpx;
  font-weight: 500;
  color: #ffffff;
}
.start-disabled .start-text {
  color: #999999;
}

/* ============ 等待/连接中 ============ */
.waiting-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  background: linear-gradient(to bottom, rgba(196, 30, 58, 0.2), #faf8f5 40%, #faf8f5);
}
.waiting-avatar-wrap {
  position: relative;
  margin-bottom: 64rpx;
}
.waiting-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 256rpx;
  height: 256rpx;
  margin-top: -128rpx;
  margin-left: -128rpx;
  border-radius: 50%;
  transform: scale(1.3);
}
.ring-pulse {
  background: rgba(196, 30, 58, 0.2);
  animation: pulse 2s ease-in-out infinite;
}
.ring-ping {
  background: rgba(196, 30, 58, 0.3);
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.waiting-avatar {
  position: relative;
  width: 256rpx;
  height: 256rpx;
  border-radius: 50%;
  border: 8rpx solid rgba(196, 30, 58, 0.3);
  background: rgba(196, 30, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.waiting-letter {
  font-size: 72rpx;
  color: #c41e3a;
}
.waiting-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.waiting-tip {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 64rpx;
}
.hangup-btn {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hangup-label {
  font-size: 28rpx;
  color: #999999;
  margin-top: 24rpx;
}

/* ============ 通话中 ============ */
.active-page {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #000000;
}
.cost-badge {
  position: absolute;
  top: calc(32rpx + var(--status-bar-height, 0));
  right: 32rpx;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.6);
}
.cost-time {
  font-size: 28rpx;
  color: #ffffff;
  font-family: monospace;
}
.cost-sep {
  color: rgba(255, 255, 255, 0.6);
}
.cost-coins {
  font-size: 28rpx;
  color: #c9a96e;
  font-family: monospace;
}
.avatar-toggle {
  position: absolute;
  top: calc(32rpx + var(--status-bar-height, 0));
  left: 32rpx;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
}
.toggle-virtual {
  background: #c9a96e;
}
.toggle-text {
  font-size: 24rpx;
  color: #ffffff;
}
.media-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 70vh;
}
.video-placeholder {
  width: 100%;
  height: 100%;
  min-height: 70vh;
  background: linear-gradient(to bottom, #1f2937, #111827);
  display: flex;
  align-items: center;
  justify-content: center;
}
.video-hint {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.4);
}
.audio-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.virtual-avatar {
  width: 256rpx;
  height: 256rpx;
  border-radius: 50%;
  background: linear-gradient(to bottom right, #c41e3a, #c9a96e);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.big-avatar {
  width: 256rpx;
  height: 256rpx;
  border-radius: 50%;
  background: rgba(196, 30, 58, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.big-letter {
  font-size: 72rpx;
  color: #c41e3a;
}
.active-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 16rpx;
}
.wave {
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  height: 64rpx;
  margin-top: 32rpx;
}
.wave-bar {
  width: 8rpx;
  background: #c41e3a;
  border-radius: 999rpx;
  animation: pulse 1.5s ease-in-out infinite;
}
.self-window {
  position: absolute;
  top: 160rpx;
  right: 32rpx;
  width: 192rpx;
  height: 256rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #374151;
  border: 4rpx solid rgba(255, 255, 255, 0.2);
}
.self-video {
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, #4b5563, #374151);
  display: flex;
  align-items: center;
  justify-content: center;
}
.active-footer {
  padding: 48rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  position: relative;
  z-index: 10;
}
.ctrl-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
}
.ctrl-btn {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ctrl-danger {
  background: #ef4444;
}
.ctrl-hangup {
  width: 128rpx;
  height: 128rpx;
  background: #ef4444;
}
.net-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 32rpx;
}
.net-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
}

/* 余额不足弹窗 */
.low-balance-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 48rpx;
}
.low-balance-card {
  width: 100%;
  max-width: 640rpx;
  padding: 40rpx;
  border-radius: 24rpx;
  background: #ffffff;
}
.lb-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.lb-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(234, 179, 8, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lb-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}
.lb-desc {
  font-size: 28rpx;
  color: #999999;
}
.lb-balance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #f5f1eb;
}
.lb-balance-label {
  font-size: 28rpx;
  color: #999999;
}
.lb-balance-amount {
  font-size: 30rpx;
  font-weight: 700;
  color: #c9a96e;
}
.lb-actions {
  display: flex;
  gap: 24rpx;
}
.lb-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lb-btn-ghost {
  background: #f5f1eb;
}
.lb-btn-primary {
  background: #c41e3a;
}
.lb-btn-text-dark {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.lb-btn-text-light {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}

/* ============ 通话结束 ============ */
.ended-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.ended-check {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}
.ended-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
}
.ended-sub {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 48rpx;
}
.ended-card {
  width: 100%;
  max-width: 640rpx;
  padding: 32rpx;
  margin-bottom: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.ended-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ended-row-label {
  font-size: 28rpx;
  color: #999999;
}
.ended-row-value {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.ended-row-cost {
  font-size: 28rpx;
  font-weight: 700;
  color: #c41e3a;
}
.ended-actions {
  display: flex;
  gap: 32rpx;
  width: 100%;
  max-width: 640rpx;
}
.ended-btn {
  flex: 1;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ended-btn-ghost {
  background: #f5f1eb;
}
.ended-btn-primary {
  background: #c41e3a;
}
.ended-btn-text-dark {
  font-size: 30rpx;
  font-weight: 500;
  color: #2c2c2c;
}
.ended-btn-text-light {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes ping {
  0% { transform: scale(1.3); opacity: 0.8; }
  75%, 100% { transform: scale(2); opacity: 0; }
}
</style>
