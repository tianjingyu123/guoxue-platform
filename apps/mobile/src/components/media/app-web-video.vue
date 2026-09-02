<template>
  <!-- App-vue 原生 video 会覆盖 Vue 互动层；renderjs 让播放器回到同一 WebView 层。 -->
  <!-- @vue-ignore renderjs 模块只在 App 视图层注入，不属于 Vue 逻辑层类型。 -->
  <view
    :id="playerId"
    class="app-web-video"
    :player-state="playerState"
    :change:player-state="webPlayer.onPlayerStateChange"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

let nextPlayerId = 0

export type AppWebVideoCommand = {
  seq: number
  type: 'play' | 'pause' | 'rate' | 'seek'
  value?: number
}

export default defineComponent({
  name: 'AppWebVideo',
  data() { return { playerId: `app-short-video-web-player-${++nextPlayerId}` } },
  props: {
    src: { type: String, default: '' },
    poster: { type: String, default: '' },
    loop: { type: Boolean, default: true },
    autoplay: { type: Boolean, default: true },
    objectFit: { type: String as PropType<'cover' | 'contain'>, default: 'cover' },
    command: {
      type: Object as PropType<AppWebVideoCommand>,
      default: () => ({ seq: 0, type: 'pause' as const }),
    },
  },
  emits: ['play', 'pause', 'error', 'timeupdate', 'loadedmetadata', 'firstframe', 'ended', 'gesture'],
  computed: {
    playerState() {
      return JSON.stringify({
        hostId: this.playerId,
        src: this.src,
        poster: this.poster,
        loop: this.loop,
        autoplay: this.autoplay,
        objectFit: this.objectFit,
        command: this.command,
      })
    },
  },
  methods: {
    onRenderPlayerEvent(payload: { type?: string; detail?: Record<string, unknown> }) {
      const type = String(payload?.type || '')
      if (type === 'gesture') {
        this.$emit('gesture', payload?.detail || {})
        return
      }
      if (!['play', 'pause', 'error', 'timeupdate', 'loadedmetadata', 'firstframe', 'ended'].includes(type)) return
      this.$emit(type as 'play', { detail: payload?.detail || {} })
    },
  },
})
</script>

<!-- #ifdef APP-PLUS -->
<script module="webPlayer" lang="renderjs">
export default {
  data() {
    return {
      owner: null,
      video: null,
      currentSrc: '',
      revealedSrc: '',
      hostId: '',
      pendingState: null,
      pendingFrameSrc: '',
      frameRequestId: null,
      removalObserver: null,
      lastCommandSeq: -1,
      lastTimeEventAt: 0,
    }
  },
  mounted() {
    // 首次属性通知可能早于宿主 DOM，挂载后重放最新状态，不能等用户滑到第二条才初始化。
    if (this.pendingState) this.onPlayerStateChange(this.pendingState)
  },
  methods: {
    disposeVideo() {
      this.removalObserver && this.removalObserver.disconnect()
      this.removalObserver = null
      if (!this.video) return
      if (this.frameRequestId !== null && this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this.frameRequestId)
      this.frameRequestId = null
      this.pendingFrameSrc = ''
      this.video.pause()
      this.video.removeAttribute('src')
      this.video.load()
      this.video.remove()
      this.video = null
    },
    ensureVideo() {
      if (this.video) return this.video
      // swiper 切页时新旧组件会短暂共存，固定 id 会把新视频挂到待销毁的旧容器。
      const host = this.hostId && document.getElementById(this.hostId)
      if (!host) return null
      host.style.pointerEvents = 'auto'
      host.style.touchAction = 'none'
      host.style.background = 'transparent'
      const video = document.createElement('video')
      video.className = 'app-short-video-web-player__media'
      video.controls = false
      video.preload = 'auto'
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('x5-playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
      video.style.position = 'absolute'
      video.style.inset = '0'
      video.style.width = '100%'
      video.style.height = '100%'
      // 首帧真正解码前保持透明，让下层封面继续可见，避免 iOS 首条视频“有声黑屏”。
      video.style.background = 'transparent'
      video.style.opacity = '0'
      video.style.pointerEvents = 'none'

      video.addEventListener('play', () => this.emitToOwner('play'))
      video.addEventListener('pause', () => this.emitToOwner('pause'))
      video.addEventListener('ended', () => this.emitToOwner('ended'))
      video.addEventListener('error', () => this.emitToOwner('error', {
        code: Number(video.error && video.error.code) || 0,
        networkState: Number(video.networkState) || 0,
        readyState: Number(video.readyState) || 0,
      }))
      video.addEventListener('loadedmetadata', () => this.emitToOwner('loadedmetadata', {
        width: Number(video.videoWidth) || 0,
        height: Number(video.videoHeight) || 0,
        duration: Number(video.duration) || 0,
      }))
      video.addEventListener('loadeddata', () => this.revealDecodedFrame())
      video.addEventListener('canplay', () => this.revealDecodedFrame())
      video.addEventListener('playing', () => this.revealDecodedFrame())
      video.addEventListener('timeupdate', () => {
        this.revealDecodedFrame()
        const now = Date.now()
        if (now - this.lastTimeEventAt < 250) return
        this.lastTimeEventAt = now
        this.emitToOwner('timeupdate', {
          currentTime: Number(video.currentTime) || 0,
          duration: Number(video.duration) || 0,
        })
      })
      const gesturePoint = (event, changed) => {
        const point = (changed ? event.changedTouches && event.changedTouches[0] : event.touches && event.touches[0])
          || (event.changedTouches && event.changedTouches[0])
          || (event.touches && event.touches[0])
          || {}
        return { x: Number(point.clientX) || 0, y: Number(point.clientY) || 0 }
      }
      host.addEventListener('touchstart', (event) => {
        event.stopPropagation()
        const point = gesturePoint(event, false)
        this.emitToOwner('gesture', { phase: 'start', ...point })
      }, { passive: true })
      host.addEventListener('touchmove', (event) => {
        event.stopPropagation()
        event.preventDefault()
        const point = gesturePoint(event, false)
        this.emitToOwner('gesture', { phase: 'move', ...point })
      }, { passive: false })
      host.addEventListener('touchend', (event) => {
        event.stopPropagation()
        const point = gesturePoint(event, true)
        this.emitToOwner('gesture', { phase: 'end', ...point })
      }, { passive: true })
      host.addEventListener('touchcancel', (event) => {
        event.stopPropagation()
        const point = gesturePoint(event, true)
        this.emitToOwner('gesture', { phase: 'cancel', ...point })
      }, { passive: true })
      host.appendChild(video)
      this.video = video
      // renderjs 不支持 beforeUnmount/beforeDestroy，观察宿主移除后确定性释放解码器。
      if (typeof MutationObserver === 'function') {
        this.removalObserver = new MutationObserver(() => {
          if (!host.isConnected) this.disposeVideo()
        })
        this.removalObserver.observe(document.body, { childList: true, subtree: true })
      }
      return video
    },
    revealDecodedFrame() {
      const video = this.video
      const src = this.currentSrc
      if (!video || !src || this.revealedSrc === src) return
      if (Number(video.readyState) < 2 || Number(video.videoWidth) <= 0 || Number(video.videoHeight) <= 0) return
      const reveal = () => {
        if (!this.video || this.currentSrc !== src || this.revealedSrc === src) return
        if (Number(this.video.readyState) < 2 || Number(this.video.videoWidth) <= 0 || Number(this.video.videoHeight) <= 0) return
        this.revealedSrc = src
        this.video.style.opacity = '1'
        this.emitToOwner('firstframe', {
          width: Number(this.video.videoWidth) || 0,
          height: Number(this.video.videoHeight) || 0,
        })
      }
      if (this.pendingFrameSrc === src) return
      this.pendingFrameSrc = src
      const showFrame = () => {
        this.pendingFrameSrc = ''
        this.frameRequestId = null
        reveal()
      }
      // iOS 优先等实际提交到合成器的视频帧，不把“开始出声”或 metadata 当画面就绪。
      if (typeof video.requestVideoFrameCallback === 'function') this.frameRequestId = video.requestVideoFrameCallback(showFrame)
      else if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(showFrame))
      else showFrame()
    },
    emitToOwner(type, detail) {
      if (!this.owner) return
      this.owner.callMethod('onRenderPlayerEvent', { type, detail: detail || {} })
    },
    onPlayerStateChange(raw, _oldValue, ownerInstance) {
      this.owner = ownerInstance || this.owner
      let state = null
      try { state = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return }
      if (!state || typeof state !== 'object') return
      this.pendingState = state
      this.hostId = String(state.hostId || '')
      const video = this.ensureVideo()
      if (!video) return

      const src = String(state.src || '')
      video.loop = Boolean(state.loop)
      video.autoplay = Boolean(state.autoplay)
      video.poster = String(state.poster || '')
      video.style.objectFit = state.objectFit === 'contain' ? 'contain' : 'cover'
      if (src !== this.currentSrc) {
        this.currentSrc = src
        this.revealedSrc = ''
        if (this.frameRequestId !== null && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(this.frameRequestId)
        this.frameRequestId = null
        this.pendingFrameSrc = ''
        this.lastCommandSeq = -1
        video.style.opacity = '0'
        video.pause()
        video.removeAttribute('src')
        if (src) video.src = src
        video.load()
        if (src && state.autoplay) {
          const pending = video.play()
          if (pending && typeof pending.catch === 'function') pending.catch(() => {})
        }
      }

      const command = state.command || {}
      const seq = Number(command.seq)
      if (!Number.isFinite(seq) || seq === this.lastCommandSeq) return
      this.lastCommandSeq = seq
      if (command.type === 'play') {
        const pending = video.play()
        if (pending && typeof pending.catch === 'function') pending.catch(() => {})
      } else if (command.type === 'pause') {
        video.pause()
      } else if (command.type === 'rate') {
        const rate = Number(command.value)
        if (Number.isFinite(rate) && rate > 0) video.playbackRate = rate
      } else if (command.type === 'seek') {
        const target = Number(command.value)
        if (Number.isFinite(target) && target >= 0) video.currentTime = target
      }
    },
  },
}
</script>
<!-- #endif -->

<style scoped>
.app-web-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
  pointer-events: auto;
  touch-action: none;
}
</style>
