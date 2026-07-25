<script setup lang="ts">
/**
 * 直播卡片媒体层：
 * - LIVING：进入视口后才取播放地址并静音自动播放，首帧就绪前保留静态封面。
 * - REPLAY：有封面优先；无封面时交给 SmartCover 读取回放第一帧。
 * - WAITING：只显示发布时必填的预告首图。
 */
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import SmartCover from '@/components/common/smart-cover.vue'
import LivePlayer from '@/components/live/live-player.vue'
import { liveApi, type LiveStatus } from '@/lib/live-data'

const props = withDefaults(defineProps<{
  roomId: string
  title?: string
  cover?: string | null
  status?: LiveStatus
  replayUrl?: string | null
  deco?: boolean
}>(), {
  title: '',
  cover: '',
  status: 'upcoming',
  replayUrl: '',
  deco: false,
})

const playUrls = ref<{ flv: string; hls: string } | null>(null)
const streamReady = ref(false)
const streamFailed = ref(false)
const inView = ref(false)
let loadingRoomId = ''
let io: ReturnType<typeof uni.createIntersectionObserver> | null = null

const isLive = computed(() => props.status === 'live')
const replayVideoUrl = computed(() => props.status === 'replay' ? props.replayUrl || '' : '')

async function loadLivePreview() {
  const roomId = props.roomId
  if (!inView.value || !isLive.value || !roomId || streamFailed.value || loadingRoomId === roomId) return
  loadingRoomId = roomId
  try {
    playUrls.value = await liveApi.getPlayUrl(roomId)
  } catch {
    streamFailed.value = true
  } finally {
    loadingRoomId = ''
  }
}

function resetMedia() {
  playUrls.value = null
  streamReady.value = false
  streamFailed.value = false
  loadingRoomId = ''
  void loadLivePreview()
}

watch(() => [props.roomId, props.status], resetMedia)
watch(inView, () => { void loadLivePreview() })

onMounted(() => {
  const inst = getCurrentInstance()
  io = uni.createIntersectionObserver(inst as any)
  io.relativeToViewport({ top: 160, bottom: 160 }).observe('.lcm-root', (res) => {
    if (res.intersectionRatio > 0) {
      inView.value = true
      io?.disconnect()
      io = null
    }
  })
})

onUnmounted(() => {
  io?.disconnect()
  io = null
})
</script>

<template>
  <view class="lcm-root">
    <smart-cover
      class="lcm-layer"
      :src="cover"
      :title="title"
      type="live"
      :video-url="replayVideoUrl"
      :deco="deco"
    />
    <LivePlayer
      v-if="isLive && playUrls"
      class="lcm-layer lcm-stream"
      :class="{ ready: streamReady }"
      :flv-url="playUrls.flv"
      :hls-url="playUrls.hls"
      object-fit="cover"
      muted-only
      :show-error="false"
      @ready="streamReady = true"
      @error="streamFailed = true"
    />
  </view>
</template>

<style scoped>
.lcm-root { position: relative; width: 100%; height: 100%; overflow: hidden; }
.lcm-layer { position: absolute; inset: 0; width: 100%; height: 100%; }
.lcm-stream { opacity: 0; transition: opacity .22s ease-out; pointer-events: none; }
.lcm-stream.ready { opacity: 1; }
.lcm-layer :deep(img),
.lcm-layer :deep(video),
.lcm-layer :deep(.lp-media) {
  width: 100%;
  height: 100%;
  object-fit: cover !important;
  object-position: center !important;
}
@media (prefers-reduced-motion: reduce) {
  .lcm-stream { transition: none; }
}
</style>
