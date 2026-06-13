<template>
  <view class="cl-page">
    <!-- ========== 预订界面 ========== -->
    <template v-if="callState === 'booking'">
      <view class="header-sticky">
        <view class="header-row">
          <text class="header-back" @click="uni.navigateBack()">‹</text>
          <text class="header-title">预约连麦</text>
          <view class="header-spacer" />
        </view>
      </view>

      <view class="cl-body">
        <!-- 达人信息 -->
        <view class="expert-card">
          <view class="ex-row">
            <view class="ex-avatar-wrap">
              <view class="ex-avatar">{{ expert.name[0] }}</view>
              <view class="ex-dot" :class="expert.status" />
            </view>
            <view class="ex-info">
              <view class="ex-name-row"><text class="ex-name">{{ expert.name }}</text><text class="ex-verify">V</text></view>
              <text class="ex-title">{{ expert.title }}</text>
              <view class="ex-meta">
                <text>⭐ {{ expert.rating }}分</text>
                <text>{{ expert.totalCalls }}次连麦</text>
              </view>
            </view>
            <view class="ex-status-tag" :class="expert.status"><text>{{ statusLabels[expert.status] }}</text></view>
          </view>
        </view>

        <!-- 通话类型 -->
        <view class="section">
          <text class="section-title">选择通话方式</text>
          <view class="type-grid">
            <view class="type-item" :class="{ active: callType === 'audio' }" @click="callType = 'audio'">
              <text class="ti-icon">📞</text>
              <text class="ti-label">语音连麦</text>
            </view>
            <view class="type-item" :class="{ active: callType === 'video' }" @click="callType = 'video'">
              <text class="ti-icon">📹</text>
              <text class="ti-label">视频连麦</text>
            </view>
          </view>
        </view>

        <!-- 时长套餐 -->
        <view class="section">
          <view class="section-header">
            <text class="section-title">选择咨询时长</text>
            <text class="per-min-btn" :class="{ active: usePerMinute }" @click="usePerMinute = !usePerMinute; selectedPackage = null">按分钟计费</text>
          </view>

          <template v-if="!usePerMinute">
            <view v-for="pkg in expert.packages" :key="pkg.id" class="pkg-item" :class="{ active: selectedPackage === pkg.id }" @click="selectedPackage = pkg.id">
              <view class="pkg-left">
                <view class="pkg-icon">🕐</view>
                <view class="pkg-info">
                  <view class="pkg-top">
                    <text class="pkg-dur">{{ pkg.duration }}分钟</text>
                    <text class="pkg-discount">{{ pkg.discount }}</text>
                    <text v-if="pkg.recommended" class="pkg-rec">推荐</text>
                  </view>
                  <text class="pkg-per">约{{ Math.round(pkg.price / pkg.duration) }}币/分钟</text>
                </view>
              </view>
              <view class="pkg-price">
                <text class="pkg-cur">{{ pkg.price }}币</text>
                <text class="pkg-orig">{{ pkg.originalPrice }}币</text>
              </view>
            </view>
          </template>
          <view v-else class="per-min-card">
            <view class="pm-left">
              <view class="pm-icon">🪙</view>
              <view class="pm-info">
                <text class="pm-title">按分钟计费</text>
                <text class="pm-desc">通话结束后自动结算</text>
              </view>
            </view>
            <text class="pm-price">{{ expert.pricePerMinute }}币/分钟</text>
          </view>
        </view>

        <!-- 问题描述 -->
        <view class="section">
          <text class="section-title">问题描述（选填）</text>
          <textarea v-model="questionDescription" class="qd-textarea" placeholder="简要描述你想咨询的问题，帮助达人更好地准备..." />
        </view>

        <!-- 余额 -->
        <view class="balance-card">
          <view class="bl-left"><text class="bl-icon">🪙</text><text class="bl-label">账户余额</text></view>
          <view class="bl-right"><text class="bl-num">{{ userBalance }}币</text><text class="bl-recharge" @click="goPage('/pages/wallet/recharge/index')">充值</text></view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar">
        <view class="bb-price-row">
          <text class="bb-pricel">预计费用</text>
          <text class="bb-pricer">{{ getPriceText() }}</text>
        </view>
        <view class="bb-start" :class="{ disabled: expert.status !== 'online' || (!selectedPackage && !usePerMinute) }" @click="startCall">
          <text>{{ callType === 'video' ? '📹' : '📞' }} {{ expert.status === 'online' ? '开始连麦' : '达人不在线' }}</text>
        </view>
      </view>
    </template>

    <!-- ========== 等待/连接界面 ========== -->
    <template v-if="callState === 'waiting' || callState === 'connecting'">
      <view class="waiting-view">
        <view class="wv-avatar-wrap">
          <view class="wv-ring" :class="{ connecting: callState === 'connecting' }" />
          <view class="wv-avatar">{{ expert.name[0] }}</view>
        </view>
        <text class="wv-name">{{ expert.name }}</text>
        <text class="wv-status">{{ callState === 'waiting' ? '正在等待对方接听...' : '正在连接中...' }}</text>
        <view class="wv-hangup" @click="callState = 'booking'">
          <text>📞</text>
        </view>
        <text class="wv-hint">挂断</text>
      </view>
    </template>

    <!-- ========== 通话中界面 ========== -->
    <template v-if="callState === 'active'">
      <view class="active-view">
        <!-- 费用角标 -->
        <view class="av-cost">
          <text>🕐 {{ formatDuration(callDuration) }}</text>
          <text class="av-div">|</text>
          <text>🪙 {{ usePerMinute ? totalCost.toFixed(0) : getPriceText() }}币</text>
        </view>

        <!-- 虚拟头像开关 -->
        <view class="av-virtual" :class="{ active: useVirtualAvatar }" @click="useVirtualAvatar = !useVirtualAvatar">
          <text>{{ useVirtualAvatar ? '虚拟头像' : '真实画面' }}</text>
        </view>

        <!-- 视频/音频区域 -->
        <view class="av-main">
          <template v-if="callType === 'video' && isVideoOn && !useVirtualAvatar">
            <view class="av-video-placeholder"><text class="av-vptext">视频画面区域</text></view>
          </template>
          <template v-else>
            <view class="av-audio-center">
              <view v-if="useVirtualAvatar" class="av-virtual-avatar">👤</view>
              <view v-else class="av-avatar-lg">{{ expert.name[0] }}</view>
              <text class="av-name-lg">{{ expert.name }}</text>
              <view class="av-waveform">
                <view v-for="j in 12" :key="j" class="av-bar" :style="{ height: (Math.random() * 32 + 12) + 'rpx', animationDelay: (j * 0.1) + 's' }" />
              </view>
            </view>
          </template>

          <!-- 小窗 -->
          <view v-if="callType === 'video'" class="av-pip">
            <text>👤</text>
          </view>
        </view>

        <!-- 底部控制栏 -->
        <view class="av-controls">
          <view class="av-ctrl" :class="{ off: isMuted }" @click="isMuted = !isMuted">
            <text>{{ isMuted ? '🔇' : '🎤' }}</text>
          </view>
          <view class="av-ctrl hangup" @click="endCall">
            <text>📞</text>
          </view>
          <view v-if="callType === 'video'" class="av-ctrl" :class="{ off: !isVideoOn }" @click="isVideoOn = !isVideoOn">
            <text>{{ isVideoOn ? '📹' : '📷' }}</text>
          </view>
          <view class="av-ctrl">
            <text>💬</text>
          </view>
        </view>

        <!-- 余额不足弹窗 -->
        <view v-if="showLowBalanceWarning" class="av-low-mask" @click="showLowBalanceWarning = false">
          <view class="av-low-card" @click.stop>
            <text class="alw-icon">⚠️</text>
            <text class="alw-title">余额即将不足</text>
            <text class="alw-desc">预计还可通话约1分钟</text>
            <view class="alw-balance"><text class="alw-bl">当前余额</text><text class="alw-bn">{{ userBalance - totalCost }}币</text></view>
            <view class="alw-btns">
              <view class="alw-btn" @click="showLowBalanceWarning = false"><text>稍后再说</text></view>
              <view class="alw-btn primary" @click="goPage('/pages/wallet/recharge/index')"><text>立即充值</text></view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- ========== 通话结束界面 ========== -->
    <template v-if="callState === 'ended'">
      <view class="ended-view">
        <view class="ev-check">✅</view>
        <text class="ev-title">通话已结束</text>
        <text class="ev-desc">感谢你的咨询</text>
        <view class="ev-card">
          <view class="ev-row"><text class="ev-label">通话时长</text><text class="ev-value">{{ formatDuration(callDuration) }}</text></view>
          <view class="ev-row"><text class="ev-label">本次消费</text><text class="ev-value gold">{{ usePerMinute ? totalCost : getPriceText() }}币</text></view>
          <view class="ev-row"><text class="ev-label">咨询达人</text><text class="ev-value">{{ expert.name }}</text></view>
        </view>
        <view class="ev-btns">
          <view class="ev-btn" @click="goPage('/pages/chat/index')"><text>返回</text></view>
          <view class="ev-btn primary" @click="resetCall"><text>再次咨询</text></view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

type CallState = 'booking' | 'waiting' | 'connecting' | 'active' | 'ended' | 'lowBalance'

const expert = {
  id: 1, name: '周易大师', avatar: '', title: '八字命理资深讲师', status: 'online' as string,
  pricePerMinute: 10,
  packages: [
    { id: 1, duration: 15, price: 120, originalPrice: 150, discount: '8折' },
    { id: 2, duration: 30, price: 220, originalPrice: 300, discount: '7.3折', recommended: true },
    { id: 3, duration: 60, price: 400, originalPrice: 600, discount: '6.7折' },
  ],
  rating: 4.9, totalCalls: 856,
}
const userBalance = 280
const statusLabels: Record<string, string> = { online: '在线', busy: '忙碌', offline: '离线' }

const callState = ref<CallState>('booking')
const callType = ref<'audio' | 'video'>('audio')
const selectedPackage = ref<number | null>(2)
const usePerMinute = ref(false)
const questionDescription = ref('')
const isMuted = ref(false)
const isVideoOn = ref(true)
const useVirtualAvatar = ref(false)
const callDuration = ref(0)
const totalCost = ref(0)
const showLowBalanceWarning = ref(false)

let timer: any = null

function getPriceText() {
  if (usePerMinute.value) return `${expert.pricePerMinute}币/分钟`
  const pkg = expert.packages.find(p => p.id === selectedPackage.value)
  return pkg ? `${pkg.price}币` : '--'
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function startCall() {
  callState.value = 'waiting'
  setTimeout(() => { callState.value = 'connecting' }, 2000)
  setTimeout(() => {
    callState.value = 'active'
    timer = setInterval(() => {
      callDuration.value++
      if (callDuration.value % 30 === 0 && usePerMinute.value) {
        totalCost.value += expert.pricePerMinute / 2
      }
      if (callDuration.value === 60 && !showLowBalanceWarning.value) {
        showLowBalanceWarning.value = true
      }
    }, 1000)
  }, 3500)
}

function endCall() {
  if (timer) clearInterval(timer)
  callState.value = 'ended'
}

function resetCall() {
  callDuration.value = 0
  totalCost.value = 0
  showLowBalanceWarning.value = false
  callState.value = 'booking'
}

function goPage(url: string) { uni.navigateTo({ url }) }

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.cl-page { min-height: 100vh; background: #FAF8F5; }

.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.cl-body { padding: 24rpx 24rpx 180rpx; }

/* 达人卡片 */
.expert-card { background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; }
.ex-row { display: flex; align-items: center; gap: 14rpx; }
.ex-avatar-wrap { position: relative; flex-shrink: 0; }
.ex-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #C41E3A; }
.ex-dot { position: absolute; bottom: 2rpx; right: 2rpx; width: 20rpx; height: 20rpx; border-radius: 50%; border: 2rpx solid #fff; }
.ex-dot.online { background: #52C41A; }
.ex-dot.busy { background: #FAAD14; }
.ex-dot.offline { background: #CCC; }
.ex-info { flex: 1; }
.ex-name-row { display: flex; align-items: center; gap: 6rpx; }
.ex-name { font-size: 28rpx; font-weight: 600; color: #333; }
.ex-verify { font-size: 16rpx; padding: 2rpx 6rpx; border-radius: 4rpx; background: rgba(240,160,48,0.15); color: #F0A030; }
.ex-title { font-size: 22rpx; color: #999; display: block; margin-top: 2rpx; }
.ex-meta { display: flex; gap: 16rpx; margin-top: 6rpx; }
.ex-meta text { font-size: 20rpx; color: #BBB; }
.ex-status-tag { padding: 6rpx 14rpx; border-radius: 12rpx; }
.ex-status-tag text { font-size: 20rpx; }
.ex-status-tag.online { background: rgba(82,196,26,0.1); }
.ex-status-tag.online text { color: #52C41A; }
.ex-status-tag.busy { background: rgba(250,173,20,0.1); }
.ex-status-tag.busy text { color: #FAAD14; }
.ex-status-tag.offline { background: #F5F1EB; }
.ex-status-tag.offline text { color: #BBB; }

.section { margin-bottom: 24rpx; }
.section-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; margin-bottom: 14rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.per-min-btn { font-size: 20rpx; padding: 6rpx 16rpx; border-radius: 14rpx; background: #F5F1EB; color: #999; }
.per-min-btn.active { background: #C41E3A; color: #fff; }

.type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.type-item { display: flex; align-items: center; justify-content: center; gap: 10rpx; padding: 22rpx; border-radius: 14rpx; border: 2rpx solid #E8E0D5; }
.type-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.ti-icon { font-size: 28rpx; }
.ti-label { font-size: 24rpx; font-weight: 500; color: #333; }
.type-item.active .ti-label { color: #C41E3A; }

/* 套餐项 */
.pkg-item { display: flex; justify-content: space-between; align-items: center; padding: 18rpx; border-radius: 14rpx; border: 2rpx solid #E8E0D5; margin-bottom: 10rpx; }
.pkg-item.active { border-color: #C41E3A; background: rgba(196,30,58,0.03); }
.pkg-left { display: flex; align-items: center; gap: 14rpx; }
.pkg-icon { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(196,30,58,0.06); display: flex; align-items: center; justify-content: center; font-size: 26rpx; }
.pkg-top { display: flex; align-items: center; gap: 8rpx; }
.pkg-dur { font-size: 26rpx; font-weight: 500; color: #333; }
.pkg-discount { font-size: 18rpx; padding: 2rpx 6rpx; border-radius: 4rpx; background: rgba(240,160,48,0.15); color: #F0A030; }
.pkg-rec { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; background: #C41E3A; color: #fff; }
.pkg-per { font-size: 20rpx; color: #BBB; display: block; }
.pkg-price { text-align: right; }
.pkg-cur { font-size: 30rpx; font-weight: 700; color: #C41E3A; display: block; }
.pkg-orig { font-size: 20rpx; color: #BBB; text-decoration: line-through; }

/* 按分钟 */
.per-min-card { display: flex; justify-content: space-between; align-items: center; padding: 18rpx; border-radius: 14rpx; border: 2rpx solid #C41E3A; background: rgba(196,30,58,0.03); }
.pm-left { display: flex; align-items: center; gap: 14rpx; }
.pm-icon { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(196,30,58,0.1); display: flex; align-items: center; justify-content: center; font-size: 26rpx; }
.pm-title { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.pm-desc { font-size: 20rpx; color: #BBB; }
.pm-price { font-size: 30rpx; font-weight: 700; color: #C41E3A; }

.qd-textarea { width: 100%; height: 160rpx; background: #fff; border: 1px solid #E8E0D5; border-radius: 14rpx; padding: 16rpx 18rpx; font-size: 24rpx; color: #333; box-sizing: border-box; }

.balance-card { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 18rpx; border-radius: 14rpx; background: rgba(240,160,48,0.05); }
.bl-left { display: flex; align-items: center; gap: 10rpx; }
.bl-icon { font-size: 24rpx; }
.bl-label { font-size: 24rpx; color: #333; }
.bl-right { display: flex; align-items: center; gap: 12rpx; }
.bl-num { font-size: 24rpx; font-weight: 700; color: #F0A030; }
.bl-recharge { font-size: 20rpx; color: #C41E3A; }

/* 底部 */
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #E8E0D5; padding: 16rpx 24rpx; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); }
.bb-price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.bb-pricel { font-size: 24rpx; color: #999; }
.bb-pricer { font-size: 32rpx; font-weight: 700; color: #C41E3A; }
.bb-start { padding: 24rpx; border-radius: 16rpx; background: #C41E3A; text-align: center; }
.bb-start text { font-size: 28rpx; font-weight: 600; color: #fff; }
.bb-start.disabled { background: #F5F1EB; }
.bb-start.disabled text { color: #BBB; }

/* 等待界面 */
.waiting-view { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(180deg, rgba(196,30,58,0.1), #FAF8F5 40%); padding: 48rpx; }
.wv-avatar-wrap { position: relative; margin-bottom: 32rpx; }
.wv-avatar { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 60rpx; color: #C41E3A; border: 4rpx solid rgba(196,30,58,0.15); position: relative; z-index: 1; }
.wv-ring { position: absolute; inset: -20rpx; border-radius: 50%; background: rgba(196,30,58,0.06); animation: pulse 2s infinite; }
.wv-ring.connecting { animation: ping 1s infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 0.8; } }
@keyframes ping { 0% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.6; } }
.wv-name { font-size: 36rpx; font-weight: 600; color: #333; margin-bottom: 12rpx; }
.wv-status { font-size: 26rpx; color: #999; margin-bottom: 48rpx; }
.wv-hangup { width: 80rpx; height: 80rpx; border-radius: 50%; background: #FF4D4F; display: flex; align-items: center; justify-content: center; font-size: 36rpx; transform: rotate(135deg); }
.wv-hint { font-size: 22rpx; color: #BBB; margin-top: 12rpx; }

/* 通话中 */
.active-view { min-height: 100vh; background: #1a1a2e; display: flex; flex-direction: column; position: relative; }
.av-cost { position: absolute; top: 48rpx; right: 20rpx; z-index: 10; padding: 10rpx 18rpx; border-radius: 16rpx; background: rgba(0,0,0,0.5); display: flex; align-items: center; gap: 8rpx; font-size: 22rpx; color: #fff; }
.av-div { color: rgba(255,255,255,0.3); }
.av-virtual { position: absolute; top: 48rpx; left: 20rpx; z-index: 10; padding: 10rpx 20rpx; border-radius: 20rpx; background: rgba(255,255,255,0.15); display: flex; align-items: center; gap: 6rpx; }
.av-virtual text { font-size: 20rpx; color: #fff; }
.av-virtual.active { background: #F0A030; }

.av-main { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
.av-video-placeholder { width: 100%; height: 100%; background: linear-gradient(180deg, #2a2a3e, #1a1a2e); display: flex; align-items: center; justify-content: center; }
.av-vptext { font-size: 24rpx; color: rgba(255,255,255,0.25); }
.av-audio-center { display: flex; flex-direction: column; align-items: center; }
.av-avatar-lg { width: 160rpx; height: 160rpx; border-radius: 50%; background: rgba(196,30,58,0.12); display: flex; align-items: center; justify-content: center; font-size: 56rpx; color: #C41E3A; margin-bottom: 24rpx; }
.av-virtual-avatar { width: 160rpx; height: 160rpx; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #F0A030); display: flex; align-items: center; justify-content: center; font-size: 72rpx; color: #fff; margin-bottom: 24rpx; }
.av-name-lg { font-size: 36rpx; font-weight: 600; color: #fff; margin-bottom: 24rpx; }
.av-waveform { display: flex; align-items: flex-end; gap: 4rpx; height: 48rpx; }
.av-bar { width: 6rpx; background: #C41E3A; border-radius: 2rpx; animation: wave 1s ease-in-out infinite; }
@keyframes wave { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.av-pip { position: absolute; top: 120rpx; right: 20rpx; width: 120rpx; height: 170rpx; border-radius: 14rpx; background: #333; border: 2rpx solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 40rpx; }

.av-controls { display: flex; justify-content: center; align-items: center; gap: 36rpx; padding: 32rpx 24rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); }
.av-ctrl { width: 68rpx; height: 68rpx; border-radius: 50%; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.av-ctrl.hangup { width: 80rpx; height: 80rpx; background: #FF4D4F; font-size: 34rpx; transform: rotate(135deg); }
.av-ctrl.off { background: #FF4D4F; }

/* 余额不足弹窗 */
.av-low-mask { position: absolute; inset: 0; z-index: 50; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.av-low-card { background: #fff; border-radius: 20rpx; padding: 28rpx; width: 100%; max-width: 560rpx; }
.alw-icon { font-size: 48rpx; display: block; text-align: center; margin-bottom: 16rpx; }
.alw-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; text-align: center; margin-bottom: 8rpx; }
.alw-desc { font-size: 22rpx; color: #999; display: block; text-align: center; margin-bottom: 20rpx; }
.alw-balance { display: flex; justify-content: space-between; padding: 16rpx 18rpx; background: #F5F1EB; border-radius: 10rpx; margin-bottom: 20rpx; }
.alw-bl { font-size: 22rpx; color: #999; }
.alw-bn { font-size: 24rpx; font-weight: 700; color: #F0A030; }
.alw-btns { display: flex; gap: 14rpx; }
.alw-btn { flex: 1; padding: 20rpx; border-radius: 14rpx; background: #F5F1EB; text-align: center; }
.alw-btn text { font-size: 24rpx; color: #333; font-weight: 500; }
.alw-btn.primary { background: #C41E3A; }
.alw-btn.primary text { color: #fff; }

/* 结束界面 */
.ended-view { display: flex; flex-direction: column; align-items: center; padding: 100rpx 48rpx 48rpx; }
.ev-check { width: 108rpx; height: 108rpx; border-radius: 50%; background: rgba(82,196,26,0.1); display: flex; align-items: center; justify-content: center; font-size: 54rpx; margin-bottom: 24rpx; }
.ev-title { font-size: 36rpx; font-weight: 700; color: #333; margin-bottom: 8rpx; }
.ev-desc { font-size: 24rpx; color: #999; margin-bottom: 32rpx; }
.ev-card { width: 100%; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 32rpx; }
.ev-row { display: flex; justify-content: space-between; padding: 14rpx 0; border-bottom: 1px solid #F5F1EB; }
.ev-row:last-child { border-bottom: none; }
.ev-label { font-size: 24rpx; color: #999; }
.ev-value { font-size: 24rpx; color: #333; font-weight: 500; }
.ev-value.gold { color: #C9A96E; }
.ev-btns { display: flex; gap: 16rpx; width: 100%; }
.ev-btn { flex: 1; padding: 22rpx; border-radius: 14rpx; background: #F5F1EB; text-align: center; }
.ev-btn text { font-size: 24rpx; color: #333; font-weight: 500; }
.ev-btn.primary { background: #C41E3A; }
.ev-btn.primary text { color: #fff; }
</style>
