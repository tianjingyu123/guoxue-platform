import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'

export const videoPage = fs.readFileSync('apps/mobile/src/pkg-video/detail/index.vue', 'utf8')
export const sampleVideo = (id = 'test-video') => ({ id, title: '测试视频', videoUrl: 'https://media.invalid/test.mp4', likes: 7,
  isLiked: false, isCollected: false, collectCount: 2, author: { id: 'test-author', isFollowed: false }, products: [], comments: 0 })

// 运行真实页面逻辑与 renderjs，所有媒体、时间和网络均在内存中，不连接设备或业务环境。
export function videoRuntime(api = {}) {
  let now = 1000, sequence = 0
  const timers = new Map(), watches = [], hidden = [], unmounted = [], commands = [], toasts = []
  const clock = {
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, at: now + delay }); return id },
    clearTimeout(id) { timers.delete(id) },
    advance(ms) {
      const end = now + ms
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        now = next[1].at; timers.delete(next[0]); next[1].fn()
      }
      now = end
    },
  }
  const context = vm.createContext({
    Date: class extends Date { static now() { return now } },
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    ref: (value) => ({ value }), computed: (getter) => ({ get value() { return getter() } }),
    watch: (source, callback) => watches.push({ source, callback }),
    onHide: (callback) => hidden.push(callback), onBeforeUnmount: (callback) => unmounted.push(callback),
    onMounted() {}, onLoad() {}, onShareAppMessage() {}, onShareTimeline() {},
    getCurrentInstance: () => null, nextTick: (callback) => callback(),
    useShare: () => ({}), useOverlayScrollLock() {}, getUserInfo: () => null,
    uni: { getSystemInfoSync: () => ({ windowHeight: 800, windowWidth: 375, statusBarHeight: 44 }),
      showToast: (options) => toasts.push(options), hideKeyboard() {}, offWindowResize() {} },
    videoApi: { getById: async (id) => sampleVideo(id), getComments: async () => ({ items: [], total: 0 }), ...api },
    window: { visualViewport: { removeEventListener() {} } },
    recordCommand: (type) => commands.push(type),
  })
  const layout = fs.readFileSync('apps/mobile/src/utils/video-comment-layout.ts', 'utf8').replace(/\bexport\s+/g, '')
  vm.runInContext(stripTypeScriptTypes(layout), context)
  const script = videoPage.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import[^\r\n]*$/gm, '')
  vm.runInContext(stripTypeScriptTypes(script), context)
  vm.runInContext("safePlay = () => { recordCommand('play'); isPlaying.value = true }; safePause = () => { recordCommand('pause'); isPlaying.value = false }; setPlaybackRate = (rate) => recordCommand('rate:' + rate)", context)
  const state = vm.runInContext('({videos,currentIndex,currentVideo,isPlaying,playError,commentPanelStyle,commentInputFocused,showComments,onCommentKeyboardHeight,onVideoWindowResize,openComments,closeComments,onAppPlayerGesture,onLayerTap,onSingleTap,resumePausedVideo,cancelVideoTap,onLike,onCollect,onFollow,ensureViewerState})', context)
  state.videos.value = [sampleVideo(), sampleVideo('next-video')]
  state.isPlaying.value = true
  const switchTo = (index) => {
    state.currentIndex.value = index
    const cancel = watches.find((watch) => String(watch.callback).includes('activeAppGestureId = 0'))
    cancel.callback()
  }
  return { ...state, context, clock, watches, hidden, unmounted, commands, toasts, switchTo }
}

export function rendererFixture(onGesture) {
  const listeners = new Map(), events = []
  const host = { style: {}, isConnected: true, addEventListener: (name, fn) => listeners.set(name, fn), appendChild() {} }
  const script = fs.readFileSync('apps/mobile/src/components/media/app-web-video.vue', 'utf8').match(/<script module="[^"]+" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  const component = vm.runInNewContext(`(${script.replace('export default', '')})`, { document: {
    getElementById: () => host,
    createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {}, pause() {}, removeAttribute() {}, load() {}, play: () => Promise.resolve() }),
  } })
  const state = component.data()
  for (const [name, method] of Object.entries(component.methods)) state[name] = method.bind(state)
  state.onPlayerStateChange({ hostId: 'test-player', src: 'https://media.invalid/test.mp4' }, null, { callMethod: (_name, event) => {
    events.push(event)
    if (event.type === 'gesture') onGesture(event.detail)
  } })
  const dispatch = (type, x = 180, y = 320) => {
    const event = { touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }],
      stopPropagation() { this.stopped = true }, preventDefault() { this.prevented = true } }
    listeners.get(type)(event)
    return event
  }
  return { state, dispatch, events }
}
