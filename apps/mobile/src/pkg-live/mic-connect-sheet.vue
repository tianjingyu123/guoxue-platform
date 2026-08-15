<template>
  <!-- 通话中：紧凑悬浮条 -->
  <view v-if="open && state === 'connected'" class="mic-bar" :style="micBarStyle">
    <view class="mic-bar__inner">
      <view class="mic-bar__avatar-wrap">
        <view class="mic-bar__avatar"><text class="mic-bar__avatar-emoji">🎙️</text></view>
        <view class="mic-bar__ping" />
      </view>
      <view class="mic-bar__info">
        <text class="mic-bar__name">与「{{ hostName }}」连麦中</text>
        <text class="mic-bar__timer">{{ fmt(duration) }}</text>
      </view>
      <view class="mic-bar__btn" :class="{ 'mic-bar__btn--muted': effectiveMuted }" @tap="toggleMute">
        <AppIcon :name="effectiveMuted ? 'mic-off' : 'mic'" :size="16" color="#fff" />
      </view>
      <view class="mic-bar__btn mic-bar__btn--hangup" @tap="hangUp">
        <AppIcon name="phone-off" :size="16" color="#fff" />
      </view>
    </view>
  </view>

  <!-- 申请/等待/超时/结束 半屏弹窗 -->
  <view v-else-if="open" class="mic-mask" @tap="reset">
    <view class="mic-overlay" />
    <view class="mic-sheet" @tap.stop>
      <view class="mic-handle-row"><view class="mic-handle" /></view>

      <!-- 申请前 -->
      <view v-if="state === 'idle'" class="mic-state">
        <view class="mic-icon mic-icon--blue"><AppIcon name="phone" :size="28" color="#93C5FD" /></view>
        <text class="mic-title">申请与主播连麦</text>
        <text class="mic-sub">向「{{ hostName }}」发起申请，主播批准后将进入 TRTC 语音房间。</text>
        <view class="mic-primary" @tap="requestMic">
          <AppIcon name="phone" :size="20" color="#fff" />
          <text class="mic-primary-txt">申请连麦</text>
        </view>
        <view class="mic-ghost" @tap="reset"><text class="mic-ghost-txt">取消</text></view>
      </view>

      <!-- 等待主播同意 -->
      <view v-else-if="state === 'requesting'" class="mic-state">
        <view class="mic-icon mic-icon--blue-soft"><AppIcon name="loader-2" :size="28" color="#93C5FD" class="mic-spin" /></view>
        <text class="mic-title">等待主播同意…</text>
        <text class="mic-sub">已向「{{ hostName }}」发送连麦申请</text>
        <view class="mic-secondary" @tap="closeAndLeave"><text class="mic-secondary-txt">取消申请</text></view>
      </view>

      <view v-else-if="state === 'connecting'" class="mic-state">
        <view class="mic-icon mic-icon--blue-soft"><AppIcon name="loader-2" :size="28" color="#93C5FD" class="mic-spin" /></view>
        <text class="mic-title">主播已同意</text>
        <text class="mic-sub">正在建立安全语音链路…</text>
      </view>

      <!-- 超时未响应 -->
      <view v-else-if="state === 'timeout'" class="mic-state">
        <view class="mic-icon mic-icon--amber"><AppIcon name="alert-circle" :size="28" color="#FBBF24" /></view>
        <text class="mic-title">主播暂未响应</text>
        <text class="mic-sub">主播正在忙碌，可稍后再试</text>
        <view class="mic-primary" @tap="requestMic"><text class="mic-primary-txt">重新申请</text></view>
        <view class="mic-ghost" @tap="reset"><text class="mic-ghost-txt">关闭</text></view>
      </view>

      <view v-else-if="state === 'error'" class="mic-state">
        <view class="mic-icon mic-icon--amber"><AppIcon name="alert-circle" :size="28" color="#FBBF24" /></view>
        <text class="mic-title">连麦未建立</text>
        <text class="mic-sub">{{ errorMessage }}</text>
        <view class="mic-secondary" @tap="reset"><text class="mic-secondary-txt">关闭</text></view>
      </view>

      <!-- 挂断总结 -->
      <view v-else-if="state === 'ended'" class="mic-state">
        <view class="mic-icon mic-icon--gray"><AppIcon name="phone" :size="28" color="rgba(255,255,255,0.7)" /></view>
        <text class="mic-title">连麦已结束</text>
        <view class="mic-summary">
          <text class="mic-summary-label">通话时长</text>
          <text class="mic-summary-val">{{ fmt(duration) }}</text>
        </view>
        <view class="mic-secondary" @tap="reset"><text class="mic-secondary-txt">完成</text></view>
      </view>
      <view class="mic-safe" :style="{ height: safeBottom + 'px' }" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { useAppSafeArea } from '@/pkg-live/use-app-safe-area'
import { ensureLiveAudioPermission } from '@/pkg-live/app-capture-permissions'
import { liveMicApi, type LiveMicItem } from '@/pkg-live/live-mic-data'
import { isLiveTrtcSupported, joinLiveAudio, leaveLiveAudio, setLiveAudioMuted } from '@/pkg-live/live-trtc-client'

type MicState = 'idle' | 'requesting' | 'connecting' | 'connected' | 'ended' | 'timeout' | 'error'

const props = defineProps<{
  open: boolean
  hostName: string
  roomId: string
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const state = ref<MicState>('idle')
const localMuted = ref(false)
const hostMuted = ref(false)
const duration = ref(0)
const errorMessage = ref('')
const effectiveMuted = computed(() => localMuted.value || hostMuted.value)
const { safeRight, safeBottom, safeLeft } = useAppSafeArea()
const micBarStyle = computed(() => ({
  left: `${safeLeft.value + uni.upx2px(24)}px`,
  right: `${safeRight.value + uni.upx2px(24)}px`,
  bottom: `${safeBottom.value + uni.upx2px(160)}px`,
}))
let micUserId = ''
let hadRemoteRequest = false
let polling = false
let pollTimer: ReturnType<typeof setInterval> | null = null
let timeoutTimer: ReturnType<typeof setTimeout> | null = null
let durTimer: ReturnType<typeof setInterval> | null = null

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function clearTimers() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
  if (durTimer) { clearInterval(durTimer); durTimer = null }
}

async function pollMic() {
  if (polling || !props.roomId) return
  polling = true
  try {
    const items = await liveMicApi.list(props.roomId)
    const mic = items[0]
    if (!mic) {
      if (hadRemoteRequest && state.value === 'requesting') fail('主播未接受本次申请')
      else if (state.value === 'connected') await finishCall()
      return
    }
    micUserId = mic.userId
    if (mic.status === 'PENDING') return
    if (state.value === 'requesting') await connectRtc(mic)
    if (state.value === 'connected') {
      hostMuted.value = mic.status === 'MUTED'
      setLiveAudioMuted(effectiveMuted.value)
    }
  } catch (error) {
    if (state.value === 'requesting' || state.value === 'connecting') {
      fail((error as Error)?.message || '查询连麦状态失败')
    }
  } finally {
    polling = false
  }
}

async function connectRtc(mic: LiveMicItem) {
  state.value = 'connecting'
  hostMuted.value = mic.status === 'MUTED'
  try {
    const config = await liveMicApi.getRtcConfig(props.roomId)
    await joinLiveAudio(config)
    hostMuted.value = !config.canPublishAudio || mic.status === 'MUTED'
    setLiveAudioMuted(effectiveMuted.value)
    state.value = 'connected'
    if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
    if (!durTimer) durTimer = setInterval(() => { duration.value += 1 }, 1000)
  } catch (error) {
    leaveLiveAudio()
    fail((error as Error)?.message || '语音链路建立失败')
  }
}

async function requestMic() {
  if (!isLiveTrtcSupported()) {
    fail('当前安装包未包含 TRTC 原生插件，请升级到最新正式 App')
    return
  }
  errorMessage.value = ''
  state.value = 'requesting'
  try {
    await ensureLiveAudioPermission()
    const mic = await liveMicApi.request(props.roomId, 1)
    micUserId = mic.userId
    hadRemoteRequest = true
    pollTimer ||= setInterval(() => { void pollMic() }, 2000)
    timeoutTimer = setTimeout(() => {
      if (state.value !== 'requesting') return
      state.value = 'timeout'
      void removeRemoteRequest()
    }, 60_000)
  } catch (error) {
    fail((error as Error)?.message || '连麦申请失败')
  }
}

function fail(message: string) {
  clearTimers()
  errorMessage.value = message
  state.value = 'error'
}

async function removeRemoteRequest() {
  if (!micUserId || !props.roomId) return
  const userId = micUserId
  micUserId = ''
  try { await liveMicApi.leave(props.roomId, userId) } catch {}
}

function toggleMute() {
  if (hostMuted.value) {
    uni.showToast({ title: '主播已将你静音', icon: 'none' })
    return
  }
  localMuted.value = !localMuted.value
  setLiveAudioMuted(localMuted.value)
}

async function finishCall() {
  clearTimers()
  leaveLiveAudio()
  state.value = 'ended'
}

// 弹窗关闭时重置内部状态
watch(() => props.open, (o) => { if (!o) void cleanup() })

function doReset() {
  clearTimers()
  leaveLiveAudio()
  state.value = 'idle'
  duration.value = 0
  localMuted.value = false
  hostMuted.value = false
  errorMessage.value = ''
  micUserId = ''
  hadRemoteRequest = false
}
async function reset() { await cleanup(); emit('close') }
async function cleanup() {
  clearTimers()
  leaveLiveAudio()
  await removeRemoteRequest()
  doReset()
}
async function closeAndLeave() { await cleanup(); emit('close') }
async function hangUp() {
  await removeRemoteRequest()
  await finishCall()
}

onUnmounted(() => { void cleanup() })
</script>

<style scoped>
/* ===== 通话中悬浮条 ===== */
.mic-bar {
  position: absolute;
  z-index: 55;
}
.mic-bar__inner {
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-radius: 32rpx;
  background-color: rgba(17, 24, 39, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20rpx 24rpx;
}
.mic-bar__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.mic-bar__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(to bottom right, rgba(59, 130, 246, 0.5), rgba(6, 182, 212, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-bar__avatar-emoji {
  font-size: 32rpx;
}
.mic-bar__ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(96, 165, 250, 0.6);
  animation: mic-ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes mic-ping {
  75%, 100% { transform: scale(1.6); opacity: 0; }
}
.mic-bar__info {
  flex: 1;
  min-width: 0;
}
.mic-bar__name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mic-bar__timer {
  font-size: 24rpx;
  color: #93C5FD;
  font-variant-numeric: tabular-nums;
}
.mic-bar__btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.1);
}
.mic-bar__btn--muted {
  background-color: rgba(245, 158, 11, 0.8);
}
.mic-bar__btn--hangup {
  background-color: #EF4444;
}

/* ===== 半屏弹窗 ===== */
.mic-mask {
  position: absolute;
  inset: 0;
  z-index: 55;
}
.mic-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
}
.mic-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(17, 24, 39, 0.95), #000);
  border-radius: 48rpx 48rpx 0 0;
  padding: 48rpx;
}
.mic-handle-row {
  display: flex;
  justify-content: center;
  margin-bottom: 32rpx;
}
.mic-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 9999rpx;
  background-color: rgba(255, 255, 255, 0.2);
}
.mic-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.mic-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.mic-icon--blue { background: linear-gradient(to bottom right, rgba(59, 130, 246, 0.4), rgba(6, 182, 212, 0.3)); }
.mic-icon--blue-soft { background-color: rgba(59, 130, 246, 0.2); }
.mic-icon--amber { background-color: rgba(245, 158, 11, 0.2); }
.mic-icon--gray { background-color: rgba(255, 255, 255, 0.1); }
.mic-spin { animation: mic-rotate 1s linear infinite; }
@keyframes mic-rotate { to { transform: rotate(360deg); } }
.mic-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}
.mic-sub {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 12rpx;
  line-height: 1.5;
}
.mic-primary {
  width: 100%;
  height: 96rpx;
  margin-top: 48rpx;
  border-radius: 32rpx;
  background: linear-gradient(to right, #3B82F6, #06B6D4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}
.mic-primary-txt {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.mic-secondary {
  width: 100%;
  height: 96rpx;
  margin-top: 48rpx;
  border-radius: 32rpx;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-secondary-txt {
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
}
.mic-ghost {
  width: 100%;
  height: 88rpx;
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mic-ghost-txt {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
}
.mic-summary {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 32rpx;
  padding: 32rpx;
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mic-summary-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
}
.mic-summary-val {
  font-size: 36rpx;
  color: #fff;
  font-variant-numeric: tabular-nums;
}
.mic-safe {
  height: 0;
}
</style>
