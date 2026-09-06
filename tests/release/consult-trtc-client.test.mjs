import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const leaseSource = compile('apps/mobile/src/lib/native-rtc-owner.ts')
const clientSource = compile('apps/mobile/src/pkg-circle/circles/consult-trtc-client.ts')
function fixture() {
  const lease = {}, exports = {}, calls = [], listeners = new Map(), connections = []
  vm.runInNewContext(leaseSource, { exports: lease })
  const trtc = Object.fromEntries(['sharedInstance', 'enterRoom', 'exitRoom', 'startLocalAudio', 'stopLocalAudio', 'muteLocalAudio', 'destroySharedInstance', 'startLocalPreview', 'stopLocalPreview', 'startRemoteView', 'stopRemoteView', 'switchCamera', 'muteLocalVideo'].map(name => [name, (...args) => calls.push([name, ...args])]))
  const events = { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) }
  let setting = { microphoneAuthorized: 'authorized', cameraAuthorized: 'authorized' }
  vm.runInNewContext(clientSource, { exports, setTimeout, clearTimeout, require: name => name.includes('native-rtc-owner') ? lease : {
    ensureLiveCapturePermissions: async () => calls.push(['videoPermission']), ensureLiveAudioPermission: async () => calls.push(['audioPermission']),
  }, uni: { requireNativePlugin: name => name === 'globalEvent' ? events : trtc, getAppAuthorizeSetting: () => setting } })
  const client = exports.createConsultTrtcClient({ localViewId: 'local', remoteViewId: 'remote', onPeer: () => {}, onConnection: state => connections.push(state) })
  return { client, calls, listeners, lease, trtc, connections, setSetting: value => { setting = value } }
}
const ticket = { sdkAppId: 1, userId: 'c_synthetic', userSig: 'synthetic', strRoomId: 'consult_synthetic', privateMapKey: 'synthetic' }

test('iOS相机用途覆盖视频咨询和连麦，不误称仅用于主播开播', () => {
  const source = fs.readFileSync('apps/mobile/src/manifest.json', 'utf8')
  const description = source.match(/"NSCameraUsageDescription"\s*:\s*"([^"]+)"/)?.[1]
  assert.ok(description)
  for (const term of ['视频直播', '视频连麦', '实时视频咨询', '主动', '预览']) assert.ok(description.includes(term))
  assert.equal(description.includes('仅在用户主动开播'), false)
})
test('原生单例拒绝另一路业务抢占，非持有人清理不销毁当前连接', async () => {
  const f = fixture(), other = Symbol('live'); f.lease.claimNativeRtc(other)
  await assert.rejects(f.client.prepare('VOICE')); f.client.disconnect()
  assert.equal(f.calls.length, 0); assert.equal(f.lease.ownsNativeRtc(other), true)
})
test('语音预检不申请相机、不入房；完成后关闭预检麦克风', async () => {
  const f = fixture(); await f.client.prepare('VOICE')
  assert.equal(f.calls.some(c => c[0] === 'videoPermission' || c[0] === 'enterRoom'), false)
  assert.equal(f.calls.at(-1)[0], 'stopLocalAudio'); f.client.disconnect()
})
test('权限拒绝或插件方法缺失释放占用，不进入房间', async () => {
  for (const broken of ['permission', 'plugin']) {
    const f = fixture()
    if (broken === 'permission') f.setSetting({ microphoneAuthorized: 'denied', cameraAuthorized: 'authorized' })
    else delete f.trtc.enterRoom
    await assert.rejects(f.client.prepare('VOICE'))
    assert.equal(f.calls.some(c => c[0] === 'enterRoom'), false)
    assert.doesNotThrow(() => f.lease.claimNativeRtc(Symbol('next')))
  }
})
test('进房使用完整字符串房间票据，成功回调后才开始上行音频', async () => {
  const f = fixture(); await f.client.prepare('VOICE'); const before = f.calls.length
  const pending = f.client.connect(ticket, 'VOICE')
  const enter = f.calls.find(c => c[0] === 'enterRoom')[1]
  assert.equal(enter.strRoomId, ticket.strRoomId); assert.equal(enter.privateMapKey, ticket.privateMapKey)
  assert.equal(f.calls.slice(before).some(c => c[0] === 'startLocalAudio'), false)
  f.listeners.get('onEnterRoom')({ data: [10] }); await pending
  assert.equal(f.calls.at(-1)[0], 'startLocalAudio'); f.client.disconnect()
  assert.equal(f.listeners.size, 0)
})
test('退出时未完成的入房立即拒绝，不保留超时器和原生监听', async () => {
  const f = fixture(); await f.client.prepare('VOICE'); const pending = f.client.connect(ticket, 'VOICE')
  f.client.disconnect(); await assert.rejects(pending)
  assert.equal(f.listeners.size, 0); assert.doesNotThrow(() => f.lease.claimNativeRtc(Symbol('next')))
})

test('服务端移出或解散房间关闭音视频采集，迟到退出事件不干扰新持有人', async () => {
  for (const reason of [1, 2]) {
    const f = fixture(); await f.client.prepare('VIDEO')
    const pending = f.client.connect(ticket, 'VIDEO')
    f.listeners.get('onEnterRoom')({ data: [10] }); await pending
    const exit = f.listeners.get('onExitRoom'), before = f.calls.length
    exit({ data: [reason] })
    assert.deepEqual(f.connections, ['lost'])
    for (const method of ['stopLocalPreview', 'stopLocalAudio', 'exitRoom', 'destroySharedInstance']) {
      assert.equal(f.calls.slice(before).filter(c => c[0] === method).length, 1)
    }
    assert.equal(f.listeners.size, 0)
    const other = Symbol('next'); f.lease.claimNativeRtc(other)
    const after = f.calls.length; exit({ data: [reason] })
    assert.equal(f.calls.length, after); assert.equal(f.lease.ownsNativeRtc(other), true)
    assert.deepEqual(f.connections, ['lost'])
  }
})

test('入房尚未完成即收到退出事件会立即失败并清理', async () => {
  const f = fixture(); await f.client.prepare('VOICE')
  const pending = f.client.connect(ticket, 'VOICE')
  f.listeners.get('onExitRoom')({ data: [1] })
  await assert.rejects(pending, /通话房间已退出/)
  assert.equal(f.listeners.size, 0); assert.deepEqual(f.connections, [])
  assert.doesNotThrow(() => f.lease.claimNativeRtc(Symbol('next')))
})

test('原生错误或断网在入房前后均关闭采集，不依赖页面代为清理', async () => {
  for (const event of ['onError', 'onConnectionLost']) for (const entered of [false, true]) {
    const f = fixture(); await f.client.prepare('VIDEO')
    const pending = f.client.connect(ticket, 'VIDEO')
    if (entered) { f.listeners.get('onEnterRoom')({ data: [10] }); await pending }
    f.listeners.get(event)({ data: [-1] })
    if (!entered) await assert.rejects(pending)
    assert.equal(f.listeners.size, 0)
    assert.equal(f.calls.filter(c => c[0] === 'destroySharedInstance').length, 1)
    assert.equal(f.calls.filter(c => c[0] === 'stopLocalPreview').length, 1)
    assert.deepEqual(f.connections, entered ? ['lost'] : [])
    assert.doesNotThrow(() => f.lease.claimNativeRtc(Symbol('next')))
  }
})

test('旧通话排队事件不能中断或篡改同适配器的新通话', async () => {
  const f = fixture(); await f.client.prepare('VOICE')
  const first = f.client.connect(ticket, 'VOICE'); f.listeners.get('onEnterRoom')({ data: [10] }); await first
  const stale = [...f.listeners.values()]; f.client.disconnect()
  await f.client.prepare('VOICE')
  const next = f.client.connect(ticket, 'VOICE'), before = f.calls.length
  for (const callback of stale) callback({ data: [10] })
  assert.equal(f.calls.length, before); assert.deepEqual(f.connections, [])
  f.listeners.get('onEnterRoom')({ data: [10] }); await next
  assert.equal(f.calls.at(-1)[0], 'startLocalAudio'); f.client.disconnect()
})

test('旧入房Promise迟到拒绝不能销毁下一代设备准备', async () => {
  const f = fixture(); await f.client.prepare('VOICE')
  const first = f.client.connect(ticket, 'VOICE')
  f.client.disconnect()
  const preparing = f.client.prepare('VOICE')
  await assert.rejects(first); await preparing
  assert.equal(f.calls.filter(c => c[0] === 'destroySharedInstance').length, 1)
  const next = f.client.connect(ticket, 'VOICE')
  f.listeners.get('onEnterRoom')({ data: [10] }); await next; f.client.disconnect()
})
