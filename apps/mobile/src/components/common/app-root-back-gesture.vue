<template>
  <!-- App 逻辑层没有 document；触摸监听必须在 renderjs 视图层安装。 -->
  <!-- @vue-ignore renderjs 由 App 视图层提供。 -->
  <view class="root-back-gesture" :gesture-state="enabled" :change:gesture-state="edgeBack.onStateChange" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: { enabled: { type: Boolean, default: false } },
  methods: {
    onBackGesture() {
      if (!this.enabled) return
      const pages = getCurrentPages() as Array<{ route?: string }>
      // 嵌套页面只由原生返回栈处理，防止一次侧滑返回两层。
      if (pages.length !== 1) return
      const route = String(pages[0]?.route || '').replace(/^\//u, '')
      if (['pages/circles/index', 'pages/paipan/index', 'pages/discover/index', 'pages/profile/index'].includes(route)) {
        uni.redirectTo({ url: '/pages/index/index' })
      }
    },
  },
})
</script>

<!-- #ifdef APP-PLUS -->
<script module="edgeBack" lang="renderjs">
export default {
  data() { return { owner: null, enabled: false, listeners: null } },
  mounted() { if (this.enabled) this.install() },
  methods: {
    onStateChange(enabled, _previous, owner) {
      this.owner = owner || this.owner
      this.enabled = Boolean(enabled)
      if (this.enabled) this.install()
      else this.cleanup()
    },
    install() {
      if (this.listeners) return
      let start = null
      const cancel = () => { start = null }
      const begin = (event) => {
        const point = event.changedTouches && event.changedTouches[0]
        start = this.enabled && point && point.clientX <= 26 && event.touches.length === 1
          ? { x: point.clientX, y: point.clientY, at: Date.now() } : null
      }
      const end = (event) => {
        const origin = start
        start = null
        const point = event.changedTouches && event.changedTouches[0]
        if (!this.enabled || !origin || !point || !this.owner) return
        if (point.clientX - origin.x < 82 || Math.abs(point.clientY - origin.y) > 56 || Date.now() - origin.at > 850) return
        this.owner.callMethod('onBackGesture')
      }
      this.listeners = { touchstart: begin, touchend: end, touchcancel: cancel }
      Object.keys(this.listeners).forEach((name) => document.addEventListener(name, this.listeners[name], { capture: true, passive: true }))
    },
    cleanup() {
      if (!this.listeners) return
      Object.keys(this.listeners).forEach((name) => document.removeEventListener(name, this.listeners[name], true))
      this.listeners = null
      this.owner = null
    },
  },
}
</script>
<!-- #endif -->

<style scoped>
.root-back-gesture { position: fixed; width: 0; height: 0; pointer-events: none; }
</style>
