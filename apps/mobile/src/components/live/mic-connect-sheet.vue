<template>
  <!-- 通话中：紧凑悬浮条 -->
  <view v-if="open && state === 'connected'" class="mic-bar">
    <view class="mic-bar__inner">
      <view class="mic-bar__avatar-wrap">
        <view class="mic-bar__avatar"><text class="mic-bar__avatar-emoji">🎙️</text></view>
        <view class="mic-bar__ping" />
      </view>
      <view class="mic-bar__info">
        <text class="mic-bar__name">与「{{ hostName }}」连麦中</text>
        <text class="mic-bar__timer">{{ fmt(duration) }}</text>
      </view>
      <view class="mic-bar__btn" :class="{ 'mic-bar__btn--muted': muted }" @tap="muted = !muted">
        <AppIcon :name="muted ? 'mic-off' : 'mic'" :size="16" color="#fff" />
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
        <text class="mic-sub">向「{{ hostName }}」发起连麦申请，主播同意后即可开始语音互动，连麦内容将对全场观众公开。</text>
        <view class="mic-primary" @tap="state = 'requesting'">
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
        <view class="mic-secondary" @tap="reset"><text class="mic-secondary-txt">取消申请</text></view>
      </view>

      <!-- 超时未响应 -->
      <view v-else-if="state === 'timeout'" class="mic-state">
        <view class="mic-icon mic-icon--amber"><AppIcon name="alert-circle" :size="28" color="#FBBF24" /></view>
        <text class="mic-title">主播暂未响应</text>
        <text class="mic-sub">主播正在忙碌，可稍后再试</text>
        <view class="mic-primary" @tap="state = 'requesting'"><text class="mic-primary-txt">重新申请</text></view>
        <view class="mic-ghost" @tap="reset"><text class="mic-ghost-txt">关闭</text></view>
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
      <view class="mic-safe" />
    </view>

  </view>
  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

type MicState = 'idle' | 'requesting' | 'connected' | 'ended' | 'timeout'

const props = defineProps<{
  open: boolean
  hostName: string
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const state = ref<MicState>('idle')
const muted = ref(false)
const duration = ref(0)
let waitTimer: ReturnType<typeof setTimeout> | null = null
let timeoutTimer: ReturnType<typeof setTimeout> | null = null
let durTimer: ReturnType<typeof setInterval> | null = null

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function clearAll() {
  if (waitTimer) { clearTimeout(waitTimer); waitTimer = null }
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = null }
  if (durTimer) { clearInterval(durTimer); durTimer = null }
}

// 申请连麦：模拟主播 3.5s 后同意；15s 无响应则超时
watch(state, (s) => {
  clearAll()
  if (s === 'requesting') {
    waitTimer = setTimeout(() => { if (state.value === 'requesting') state.value = 'connected' }, 3500)
    timeoutTimer = setTimeout(() => { if (state.value === 'requesting') state.value = 'timeout' }, 15000)
  } else if (s === 'connected') {
    durTimer = setInterval(() => { duration.value += 1 }, 1000)
  }
})

// 弹窗关闭时重置内部状态
watch(() => props.open, (o) => { if (!o) doReset() })

function doReset() {
  clearAll()
  state.value = 'idle'
  duration.value = 0
  muted.value = false
}
function reset() { doReset(); emit('close') }
function hangUp() { state.value = 'ended' }

onUnmounted(clearAll)
</script>

<style scoped>
/* ===== 通话中悬浮条 ===== */
.mic-bar {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 160rpx;
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
  height: env(safe-area-inset-bottom, 0px);
}
</style>
