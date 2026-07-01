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
      :object-fit="objectFit"
      webkit-playsinline
      playsinline
    />
    <!-- #endif -->
    <!-- #ifdef MP-WEIXIN || APP-PLUS -->
    <live-player
      :src="lpSrc"
      mode="live"
      autoplay
      :object-fit="objectFit"
      :enable-auto-rotation="false"
      background-mute
      class="lp-media"
      @statechange="onStateChange"
      @error="onLpError"
    />
    <!-- #endif -->

    <view v-if="loadError" class="lp-error" @tap="retry">
      <text class="lp-error-txt">直播加载失败，点击重试</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{ flvUrl?: string; hlsUrl?: string; objectFit?: 'contain' | 'fillCrop' | 'cover' }>(),
  { objectFit: 'contain' },
)

const loadError = ref(false)

// 小程序/App：live-player 优先 FLV（低延时），无则退 HLS
const lpSrc = computed(() => props.flvUrl || props.hlsUrl || '')

let lpIndex = 0
const videoId = `lp-video-${(lpIndex = (lpIndex + 1) % 1e6)}-${Date.now().toString(36)}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onStateChange(e: any) {
  // 2004=开始拉流，-2301=断连
  const code = e?.detail?.code
  if (code === -2301) loadError.value = true
  else if (code === 2004) loadError.value = false
}
function onLpError() {
  loadError.value = true
}

/* ================= H5：flv.js 低延时 ================= */
// #ifdef H5
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let flvPlayer: any = null

async function initH5() {
  destroyH5()
  loadError.value = false
  // uni-app H5 的 <video> 会包一层 wrapper，真正的媒体元素是其内部的 <video>
  const wrapper = document.getElementById(videoId)
  const el = (wrapper?.querySelector('video') || wrapper) as HTMLVideoElement | null
  if (!el) return

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
        flvPlayer.on(flvjs.Events.ERROR, () => { loadError.value = true })
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
  // #ifdef H5
  initH5()
  // #endif
  // #ifndef H5
  loadError.value = false
  // #endif
}

onMounted(() => {
  // #ifdef H5
  if (props.flvUrl || props.hlsUrl) initH5()
  // #endif
})

// 播放地址变化（如直播开始后拿到地址）时重新初始化
watch(() => [props.flvUrl, props.hlsUrl], () => {
  // #ifdef H5
  if (props.flvUrl || props.hlsUrl) initH5()
  // #endif
})

onBeforeUnmount(() => {
  // #ifdef H5
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
</style>
