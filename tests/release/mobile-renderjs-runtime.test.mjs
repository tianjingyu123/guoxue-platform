import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

function instantiate(file, globals) {
  const source = fs.readFileSync(file, 'utf8')
  const script = source.match(/<script module="[^"]+" lang="renderjs">([\s\S]*?)<\/script>/)[1]
  const component = vm.runInNewContext(`(${script.replace('export default', '')})`, globals)
  const state = component.data()
  for (const [name, method] of Object.entries(component.methods)) state[name] = method.bind(state)
  state.mount = component.mounted?.bind(state)
  return state
}

function playerFixture({ hostReady = true } = {}) {
  const nodes = new Map()
  const events = []
  const observers = []
  const host = { style: {}, isConnected: true, addEventListener() {}, appendChild(video) { this.child = video } }
  if (hostReady) nodes.set('new-player', host)
  const staleHost = { ...host }
  nodes.set('old-player', staleHost)
  const document = {
    body: {}, getElementById: (id) => nodes.get(id),
    createElement() {
      const handlers = new Map()
      return {
        handlers, style: {}, readyState: 0, videoWidth: 0, videoHeight: 0,
        setAttribute() {}, removeAttribute() {}, load() {}, pause() {}, remove() { this.removed = true },
        play: () => Promise.resolve(), addEventListener: (name, handler) => handlers.set(name, handler),
        requestVideoFrameCallback(callback) { this.frameCallback = callback; return 7 },
        cancelVideoFrameCallback() { this.frameCancelled = true },
      }
    },
  }
  const state = instantiate('apps/mobile/src/components/media/app-web-video.vue', {
    document, requestAnimationFrame: (callback) => callback(),
    MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this) } observe() {} disconnect() { this.disconnected = true } },
  })
  const owner = { callMethod: (_method, payload) => events.push(payload) }
  state.onPlayerStateChange(JSON.stringify({ hostId: 'new-player', src: 'https://test.invalid/one.mp4', autoplay: true }), null, owner)
  return { state, host, staleHost, events, observers, nodes }
}

test('首次属性通知早于 DOM 时，挂载后仍初始化第一条视频而不等待下一次切页', () => {
  const { state, host, nodes } = playerFixture({ hostReady: false })
  assert.equal(state.video, null)
  nodes.set('new-player', host)
  state.mount()
  assert.equal(host.child, state.video)
  assert.equal(state.video.src, 'https://test.invalid/one.mp4')
})

test('首条视频必须等视频帧进入合成器才揭开封面，声音/metadata 不等于有画面', () => {
  const { state, host, staleHost, events } = playerFixture()
  assert.equal(host.child, state.video)
  assert.equal(staleHost.child, undefined)
  assert.equal(state.video.style.opacity, '0')
  state.video.handlers.get('play')()
  assert.equal(state.video.style.opacity, '0')
  Object.assign(state.video, { readyState: 2, videoWidth: 720, videoHeight: 1280 })
  state.video.handlers.get('playing')()
  assert.equal(state.video.style.opacity, '0')
  state.video.frameCallback()
  assert.equal(state.video.style.opacity, '1')
  assert.equal(events.filter((event) => event.type === 'firstframe').length, 1)
})

test('切源后忽略上一条的延迟首帧，宿主移除后释放旧播放器', () => {
  const { state, host, events, observers } = playerFixture()
  Object.assign(state.video, { readyState: 2, videoWidth: 720, videoHeight: 1280 })
  state.revealDecodedFrame()
  const oldFrame = state.video.frameCallback
  state.onPlayerStateChange(JSON.stringify({ hostId: 'new-player', src: 'https://test.invalid/two.mp4' }))
  oldFrame()
  assert.equal(events.filter((event) => event.type === 'firstframe').length, 0)
  assert.equal(state.video.style.opacity, '0')
  const oldVideo = state.video
  host.isConnected = false
  observers[0].callback()
  assert.equal(oldVideo.removed, true)
  assert.equal(state.video, null)
  assert.equal(observers[0].disconnected, true)
})

test('主导航视图层仅接受单指左缘右滑，隐藏时注销监听', () => {
  const listeners = new Map()
  const calls = []
  const state = instantiate('apps/mobile/src/components/common/app-root-back-gesture.vue', {
    document: {
      addEventListener: (name, handler) => listeners.set(name, handler),
      removeEventListener: (name) => listeners.delete(name),
    },
  })
  state.onStateChange(true, false, { callMethod: (name) => calls.push(name) })
  const point = (x, y) => ({ changedTouches: [{ clientX: x, clientY: y }], touches: [{ clientX: x, clientY: y }] })
  listeners.get('touchstart')(point(10, 300))
  listeners.get('touchend')(point(180, 315))
  assert.deepEqual(calls, ['onBackGesture'])
  listeners.get('touchstart')(point(110, 300))
  listeners.get('touchend')(point(280, 315))
  listeners.get('touchstart')(point(10, 300))
  listeners.get('touchend')(point(180, 410))
  assert.equal(calls.length, 1)
  state.onStateChange(false)
  assert.equal(listeners.size, 0)
})
