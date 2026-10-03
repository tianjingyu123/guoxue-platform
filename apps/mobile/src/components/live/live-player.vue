<!--
  直播低延时播放器（多端）——C1 延时根治核心组件。
  - 小程序/App：原生 <live-player> + FLV(mode=live)，延时 2-3s（不用 HLS 的 10-30s）。
  - H5：flv.js 播放 FLV(低延时配置)，不支持时降级原生 <video> 播 HLS。
  用法：<LivePlayer :flv-url="url.flv" :hls-url="url.hls" object-fit="contain" />
  ⚠️ 沙箱无法验证：需真实推流 + 真机拉流验证低延时。
-->
<template>
  <view class="lp-root">
    <!-- #ifdef H5 -->
    <video
      :id="videoId"
      class="lp-media"
      autoplay
      muted
      :controls="false"
      :object-fit="h5ObjectFit"
      :style="{ objectFit: h5ObjectFit, objectPosition: 'center' }"
      webkit-playsinline
      playsinline
    />
    <!-- H5 静音解除（P1 修复）：video 写死 muted 过 autoplay 策略，此前从未解除→观众全程无声。
         首帧起播后先尝试有声自动播，被浏览器策略拦截才显示此胶囊，点击（手势上下文）解除静音 -->
    <view v-if="!mutedOnly && showUnmuteTip" class="lp-unmute" @tap.stop="onUnmuteTap">
      <text class="lp-unmute-txt">🔊 点击开启声音</text>
    </view>
    <!-- #endif -->
    <!-- #ifdef APP-PLUS -->
    <video
      :id="videoId"
      class="lp-media"
      :src="props.hlsUrl"
      autoplay
      :controls="false"
      :object-fit="h5ObjectFit"
      @play="onAppReady"
      @error="onAppError"
    />
    <!-- #endif -->
    <!-- #ifdef MP-WEIXIN -->
    <live-player
      :id="videoId"
      :src="lpSrc"
      mode="live"
      autoplay
      :object-fit="nativeObjectFit"
      :enable-auto-rotation="false"
      background-mute
      class="lp-media"
      @statechange="onStateChange"
      @error="onLpError"
    />
    <!-- #endif -->

    <view v-if="loadError && showError" class="lp-error" @tap="retry">
      <text class="lp-error-txt">直播加载失败，点击重试</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, getCurrentInstance } from 'vue'

const props = withDefaults(
  defineProps<{
    flvUrl?: string
    hlsUrl?: string
    objectFit?: 'contain' | 'fillCrop' | 'cover'
    /** 信息流预览只允许静音，不尝试自动开声，也不显示开声提示。 */
    mutedOnly?: boolean
    /** 是否显示播放器自身错误层；信息流卡片关闭后由封面静态兜底。 */
    showError?: boolean
  }>(),
  { objectFit: 'contain', mutedOnly: false, showError: true },
)
const emit = defineEmits<{ ready: []; error: [] }>()

const loadError = ref(false)
const h5ObjectFit = computed(() => props.objectFit === 'fillCrop' ? 'cover' : props.objectFit)
const nativeObjectFit = computed(() => props.objectFit === 'cover' ? 'fillCrop' : props.objectFit)

// 小程序原生 live-player 优先 FLV（低延时），无则退 HLS；App 使用 HLS video，避免与 TRTC SDK 类冲突。
const lpSrc = computed(() => props.flvUrl || props.hlsUrl || '')

let lpIndex = 0
const videoId = `lp-video-${(lpIndex = (lpIndex + 1) % 1e6)}-${Date.now().toString(36)}`

/* ===== 断流自动重连（退避重试，超上限才落手动态）===== */
const MAX_RETRY = 3
let retryCount = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null
function clearRetryTimer() { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null } }
function resetRetry() { retryCount = 0; clearRetryTimer() }

// #ifdef MP-WEIXIN
const mpInstance = getCurrentInstance()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mpCtx: any = null
// live-player 断流退避重连：stop→play 重新拉流，超上限落手动态
function mpReconnect() {
  if (retryCount >= MAX_RETRY) { loadError.value = true; return }
  clearRetryTimer()
  const delay = 1000 * (retryCount + 1) // 1s / 2s / 3s 递增退避
  retryCount++
  retryTimer = setTimeout(() => {
    try {
      if (!mpCtx) mpCtx = uni.createLivePlayerContext(videoId, mpInstance?.proxy as never)
      mpCtx.stop({ complete: () => mpCtx.play({}) })
    } catch { loadError.value = true }
  }, delay)
}
// #endif

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onStateChange(e: any) {
  // 2004=开始拉流（视为恢复），-2301=网络断连
  const code = e?.detail?.code
  if (code === -2301) {
    // #ifdef MP-WEIXIN
    mpReconnect()
    // #endif
    // #ifndef MP-WEIXIN
    loadError.value = true
    // #endif
  } else if (code === 2004) {
    resetRetry()
    loadError.value = false
    emit('ready')
  }
}
function onLpError() {
  emit('error')
  // #ifdef MP-WEIXIN
  mpReconnect()
  // #endif
  // #ifndef MP-WEIXIN
  loadError.value = true
  // #endif
}

// #ifdef APP-PLUS
function onAppReady() {
  resetRetry()
  loadError.value = false
  emit('ready')
}

function onAppError() {
  loadError.value = true
  emit('error')
}
// #endif

/* ================= H5：flv.js 低延时 ================= */
// #ifdef H5
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let flvPlayer: any = null

/* ===== H5 静音解除（P1）：muted 只为过 autoplay 策略，首帧后尽力恢复有声 ===== */
const showUnmuteTip = ref(false)
let mediaEl: HTMLVideoElement | null = null
// 自动解除静音只尝试一次：失败回退静音续播会再次派发 playing → onFirstFrame，无守卫则反复翻转 muted 死循环
let unmuteAttempted = false

/** 首帧起播（playing 事件）：仍处静音则尝试有声自动播 */
function onFirstFrame() {
  emit('ready')
  if (props.mutedOnly) {
    showUnmuteTip.value = false
    return
  }
  if (mediaEl?.muted) {
    if (unmuteAttempted) return // 已自动尝试过 → 保持胶囊提示，等用户手动点击，不再自动重试
    unmuteAttempted = true
    attemptAutoUnmute()
  } else {
    showUnmuteTip.value = false // 已是有声（用户此前点过/重连保留）→ 确保浮层不残留
  }
}

/** 尝试有声播放：浏览器允许→静默解除并隐藏浮层；被 autoplay 策略拦→回退静音续播 + 显示提示胶囊 */
function attemptAutoUnmute() {
  const el = mediaEl
  if (!el) return
  el.muted = false
  el.volume = 1
  Promise.resolve(el.play()).then(() => {
    if (el.muted || el.paused) {
      // 个别浏览器解除静音后把视频暂停 → 回退静音保画面，等用户手动开声
      el.muted = true
      el.play().catch(() => {})
      showUnmuteTip.value = true
    } else {
      showUnmuteTip.value = false
    }
  }).catch(() => {
    // 无手势有声起播被拦 → 回退静音继续播，浮层等用户点击
    el.muted = true
    el.play().catch(() => {})
    showUnmuteTip.value = true
  })
}

/** 用户点击浮层：手势上下文内解除静音（浏览器必然放行），浮层消失 */
function onUnmuteTap() {
  if (mediaEl) {
    mediaEl.muted = false
    mediaEl.volume = 1
    mediaEl.play().catch(() => {})
  }
  showUnmuteTip.value = false
}

// H5 flv 断流退避重连：destroy→init 重新拉流，超上限落手动态
function scheduleH5Reconnect() {
  if (retryCount >= MAX_RETRY) { loadError.value = true; return }
  clearRetryTimer()
  const delay = 1000 * (retryCount + 1) // 1s / 2s / 3s 递增退避
  retryCount++
  retryTimer = setTimeout(() => { initH5(true) }, delay)
}

async function initH5(isRetry = false) {
  destroyH5()
  if (!isRetry) { resetRetry(); unmuteAttempted = false } // 首次/换源/手动重试清零计数与自动开声守卫，重连不清
  loadError.value = false
  // uni-app H5 的 <video> 会包一层 wrapper，真正的媒体元素是其内部的 <video>
  const wrapper = document.getElementById(videoId)
  const el = (wrapper?.querySelector('video') || wrapper) as HTMLVideoElement | null
  if (!el) return
  // 首帧起播钩子（flv 与 HLS 降级共用同一媒体元素）：先移除再挂，避免重连时重复注册
  mediaEl = el
  el.removeEventListener('playing', onFirstFrame)
  el.addEventListener('playing', onFirstFrame)

  if (props.flvUrl) {
    try {
      const flvjs = (await import('flv.js')).default
      if (flvjs.isSupported()) {
        // 低延时：关闭缓冲堆积 + 追帧（liveBufferLatencyChasing 是 flv.js 1.6+ 运行时选项，类型定义滞后，断言保留）
        const flvConfig = { enableStashBuffer: false, stashInitialSize: 128, liveBufferLatencyChasing: true, autoCleanupSourceBuffer: true }
        flvPlayer = flvjs.createPlayer(
          { type: 'flv', isLive: true, url: props.flvUrl },
          flvConfig as Parameters<typeof flvjs.createPlayer>[1],
        )
        flvPlayer.attachMediaElement(el)
        // 断流 → 退避自动重连；拿到流信息 = 连接成功，重连计数清零
        flvPlayer.on(flvjs.Events.ERROR, () => { scheduleH5Reconnect() })
        flvPlayer.on(flvjs.Events.MEDIA_INFO, () => { resetRetry(); loadError.value = false })
        flvPlayer.load()
        el.play().catch(() => { /* 自动播放被拦截，等用户交互 */ })
        return
      }
    } catch {
      // flv.js 加载失败 → 降级 HLS
    }
  }
  // 降级：原生 <video> 播 HLS
  if (props.hlsUrl) {
    el.src = props.hlsUrl
    el.play().catch(() => {})
  }
}

function destroyH5() {
  if (flvPlayer) {
    try { flvPlayer.pause(); flvPlayer.unload(); flvPlayer.detachMediaElement(); flvPlayer.destroy() } catch { /* ignore */ }
    flvPlayer = null
  }
}
// #endif

function retry() {
  resetRetry() // 手动重试清零退避计数
  loadError.value = false
  // #ifdef H5
  initH5()
  // #endif
  // #ifdef MP-WEIXIN || APP-PLUS
  try {
    if (!mpCtx) mpCtx = uni.createLivePlayerContext(videoId, mpInstance?.proxy as never)
    mpCtx.stop({ complete: () => mpCtx.play({}) })
  } catch { /* ignore */ }
  // #endif
}

onMounted(() => {
  // #ifdef H5
  if (props.flvUrl || props.hlsUrl) initH5()
  // #endif
})

// 播放地址变化（如直播开始后拿到地址）时重新初始化
watch(() => [props.flvUrl, props.hlsUrl], () => {
  resetRetry() // 换源清零退避计数
  // #ifdef H5
  if (props.flvUrl || props.hlsUrl) initH5()
  // #endif
})

onBeforeUnmount(() => {
  clearRetryTimer()
  // #ifdef H5
  if (mediaEl) { mediaEl.removeEventListener('playing', onFirstFrame); mediaEl = null }
  destroyH5()
  // #endif
})
</script>

<style scoped>
.lp-root {
  position: relative;
  width: 100%;
  height: 100%;
}
.lp-media {
  width: 100%;
  height: 100%;
  background-color: #000000;
}
.lp-error {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
}
.lp-error-txt {
  color: rgba(255, 255, 255, 0.9);
  font-size: 28rpx;
}
/* H5 静音解除胶囊：居中偏下，醒目但不挡主播画面核心区/底部互动栏 */
.lp-unmute {
  position: absolute;
  left: 50%;
  bottom: 25%;
  transform: translateX(-50%);
  z-index: 5;
  padding: 16rpx 40rpx;
  border-radius: 999rpx;
  background-color: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.35);
}
.lp-unmute-txt {
  color: #ffffff;
  font-size: 27rpx;
}
</style>
