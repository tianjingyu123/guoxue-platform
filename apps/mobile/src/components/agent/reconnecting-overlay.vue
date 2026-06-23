<script setup lang="ts">
/**
 * 通话网络断连重连浮层（uni 跨端适配）
 * - 用 uni.onNetworkStatusChange 监听联网恢复（替代 web 的 online 事件）
 * - 自动重试倒计时 + 手动「立即重连」+ 多次失败提示结束
 * - 重连期间父组件应暂停计时与计费
 */
import { ref, watch, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'

const props = withDefaults(defineProps<{
  open: boolean
  retryInterval?: number
  maxAutoRetries?: number
}>(), {
  retryInterval: 5,
  maxAutoRetries: 3,
})

const emit = defineEmits<{
  (e: 'reconnected'): void
  (e: 'endCall'): void
}>()

const countdown = ref(props.retryInterval)
const attempt = ref(1)
const retrying = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function clearTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function isOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.getNetworkType({
      success: (res) => resolve(res.networkType !== 'none'),
      fail: () => resolve(true),
    })
  })
}

async function doReconnect() {
  clearTimer()
  retrying.value = true
  setTimeout(async () => {
    const online = await isOnline()
    if (online) {
      retrying.value = false
      emit('reconnected')
    } else {
      retrying.value = false
      attempt.value += 1
      countdown.value = props.retryInterval
      startCountdown()
    }
  }, 1500)
}

function startCountdown() {
  clearTimer()
  if (retrying.value || attempt.value > props.maxAutoRetries) return
  timer = setInterval(() => {
    if (countdown.value <= 1) {
      doReconnect()
      countdown.value = props.retryInterval
    } else {
      countdown.value -= 1
    }
  }, 1000)
}

// 监听网络恢复
function onNet(res: { isConnected: boolean }) {
  if (props.open && res.isConnected) doReconnect()
}

watch(() => props.open, (open) => {
  if (open) {
    countdown.value = props.retryInterval
    attempt.value = 1
    retrying.value = false
    uni.onNetworkStatusChange(onNet)
    startCountdown()
  } else {
    clearTimer()
    uni.offNetworkStatusChange?.(onNet)
  }
})

onUnmounted(() => {
  clearTimer()
  uni.offNetworkStatusChange?.(onNet)
})
</script>

<template>
  <view v-if="open" class="overlay">
    <view class="icon-wrap">
      <view class="icon-circle">
        <AppIcon v-if="retrying" name="loader" :size="36" color="#ffffff" class="ring-spin-slow" />
        <AppIcon v-else name="wifi-off" :size="36" color="rgba(255,255,255,0.8)" />
      </view>
      <view v-if="!retrying" class="ping-ring animate-ping-ring" />
    </view>

    <text class="title">{{ retrying ? '正在重新连接…' : attempt > maxAutoRetries ? '网络连接已断开' : '网络不稳定，连接中断' }}</text>
    <text class="desc">
      {{ retrying
        ? '请保持网络畅通'
        : attempt > maxAutoRetries
          ? '多次重连未成功，请检查网络后重试，通话计费已暂停'
          : `将在 ${countdown} 秒后自动重连（第 ${attempt}/${maxAutoRetries} 次），计费已暂停` }}
    </text>

    <view class="btn-group">
      <view class="btn btn-primary" :class="{ disabled: retrying }" @tap="!retrying && doReconnect()">
        <AppIcon name="wifi" :size="34" color="#ffffff" />
        <text class="btn-txt">{{ retrying ? '连接中…' : '立即重连' }}</text>
      </view>
      <view class="btn btn-ghost" @tap="emit('endCall')">
        <AppIcon name="phone-off" :size="34" color="#ffffff" />
        <text class="btn-txt">结束通话</text>
      </view>
    </view>
</template>

<style scoped lang="scss">
.overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 64rpx;
  background: rgba(0, 0, 0, 0.85);
}
.icon-wrap { position: relative; margin-bottom: 48rpx; }
.icon-circle {
  width: 160rpx; height: 160rpx;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.08);
}
.ping-ring {
  position: absolute; top: 0; left: 0;
  width: 160rpx; height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.2);
}
.title { color: #fff; font-size: 36rpx; font-weight: 600; margin-bottom: 12rpx; text-align: center; }
.desc { color: rgba(255, 255, 255, 0.6); font-size: 28rpx; line-height: 1.5; text-align: center; }
.btn-group { display: flex; flex-direction: column; gap: 24rpx; width: 100%; max-width: 480rpx; margin-top: 56rpx; }
.btn {
  width: 100%; height: 96rpx;
  border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
}
.btn-primary { background: #c41e3a; }
.btn-primary.disabled { opacity: 0.5; }
.btn-ghost { background: rgba(255, 255, 255, 0.1); }
.btn-txt { color: #fff; font-size: 30rpx; font-weight: 500; }
</style>
