<template>
  <!-- App-vue 原生 video 会覆盖 Vue 互动层；renderjs 让播放器回到同一 WebView 层。 -->
  <!-- @vue-ignore renderjs 模块只在 App 视图层注入，不属于 Vue 逻辑层类型。 -->
  <view
    id="app-short-video-web-player"
    class="app-web-video"
    :player-state="playerState"
    :change:player-state="webPlayer.onPlayerStateChange"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export type AppWebVideoCommand = {
  seq: number
  type: 'play' | 'pause' | 'rate' | 'seek'
  value?: number
}

export default defineComponent({
  name: 'AppWebVideo',
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
  emits: ['play', 'pause', 'error', 'timeupdate', 'loadedmetadata', 'ended'],
  computed: {
    playerState() {
      return JSON.stringify({
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
      if (!['play', 'pause', 'error', 'timeupdate', 'loadedmetadata', 'ended'].includes(type)) return
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
      lastCommandSeq: -1,
      lastTimeEventAt: 0,
    }
  },
  mounted() {
    this.ensureVideo()
  },
  beforeDestroy() {
    if (!this.video) return
    this.video.pause()
    this.video.removeAttribute('src')
    this.video.load()
    this.video.remove()
    this.video = null
  },
  methods: {
    ensureVideo() {
      if (this.video) return this.video
      const host = document.getElementById('app-short-video-web-player')
      if (!host) return null
      const video = document.createElement('video')
      video.className = 'app-short-video-web-player__media'
      video.controls = false
      video.preload = 'metadata'
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.setAttribute('x5-playsinline', 'true')
      video.setAttribute('x-webkit-airplay', 'allow')
      video.style.position = 'absolute'
      video.style.inset = '0'
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.background = '#000'
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
      video.addEventListener('timeupdate', () => {
        const now = Date.now()
        if (now - this.lastTimeEventAt < 250) return
        this.lastTimeEventAt = now
        this.emitToOwner('timeupdate', {
          currentTime: Number(video.currentTime) || 0,
          duration: Number(video.duration) || 0,
        })
      })
      host.appendChild(video)
      this.video = video
      return video
    },
    emitToOwner(type, detail) {
      if (!this.owner) return
      this.owner.callMethod('onRenderPlayerEvent', { type, detail: detail || {} })
    },
    onPlayerStateChange(raw, _oldValue, ownerInstance) {
      this.owner = ownerInstance || this.owner
      const video = this.ensureVideo()
      if (!video) return
      let state = null
      try { state = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return }
      if (!state || typeof state !== 'object') return

      const src = String(state.src || '')
      video.loop = Boolean(state.loop)
      video.autoplay = Boolean(state.autoplay)
      video.poster = String(state.poster || '')
      video.style.objectFit = state.objectFit === 'contain' ? 'contain' : 'cover'
      if (src !== this.currentSrc) {
        this.currentSrc = src
        this.lastCommandSeq = -1
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
  background: #000;
  pointer-events: none;
}
</style>
