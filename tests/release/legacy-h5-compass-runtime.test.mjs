import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const source = fs.readFileSync('apps/mobile/src/pkg-common/compass/compass.ts', 'utf8')
const stack = [true]
const h5Source = source.split('\n').filter(line => {
  const start = line.match(/\/\/ #ifdef (.+)/)
  if (start) { stack.push(stack.at(-1) && start[1].trim() === 'H5'); return false }
  if (/\/\/ #endif/.test(line)) { stack.pop(); return false }
  return stack.at(-1)
}).join('\n')
function fixture(permission) {
  const exports = {}, headings = [], statuses = [], listeners = [], removed = [], timers = []
  const window = {
    DeviceOrientationEvent: permission ? { requestPermission: permission } : {},
    addEventListener(type, callback) { listeners.push({ type, callback }) },
    removeEventListener(type, callback) { removed.push({ type, callback }) },
  }
  vm.runInNewContext(ts.transpileModule(h5Source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, window, setTimeout: callback => { timers.push(callback); return timers.length }, clearTimeout() {},
  })
  const handle = exports.createCompass({ throttle: 0, onHeading: n => headings.push(n), onStatus: s => statuses.push(s) })
  const event = value => listeners.at(-1).callback({ type: 'deviceorientation', ...value })
  return { handle, headings, statuses, listeners, removed, timers, event }
}
test('H5相对旋转不冒充北向，绝对方向及iOS指南针优先级明确', () => {
  const f = fixture(); f.handle.start()
  f.event({ alpha: 90, absolute: false })
  assert.deepEqual(f.headings, [])
  f.event({ alpha: 90, absolute: true }); assert.deepEqual(f.headings, [270])
  f.event({ webkitCompassHeading: 120 }); f.event({ alpha: 180, absolute: true })
  assert.deepEqual(f.headings, [270, 120])
})

test('H5北向读数中断后失效，恢复后重新激活，取消的旧超时不得污染状态', () => {
  const f = fixture(); f.handle.start()
  const startupTimeout = f.timers.at(-1)
  f.event({ webkitCompassHeading: 120 }); const sampleTimeout = f.timers.at(-1)
  startupTimeout(); assert.equal(f.statuses.at(-1), 'active')
  sampleTimeout(); assert.equal(f.statuses.at(-1), 'unavailable')
  f.event({ webkitCompassHeading: 140 }); assert.equal(f.statuses.at(-1), 'active')
  sampleTimeout(); assert.equal(f.statuses.at(-1), 'active')
  assert.deepEqual(f.headings, [120, 140])
})
test('旧授权请求在退出后返回，不恢复监听或覆盖新会话状态', async () => {
  let resolvePermission
  const f = fixture(() => new Promise(resolve => { resolvePermission = resolve }))
  f.handle.start(); const pending = f.handle.requestPermission()
  f.handle.stop(); f.handle.start(); const before = [...f.statuses]
  resolvePermission('granted'); await pending
  assert.equal(f.listeners.length, 0); assert.deepEqual(f.statuses, before)
})

test('首选北向来源断流后允许绝对来源恢复，但相对旋转仍被拒绝', () => {
  const f = fixture(); f.handle.start()
  f.event({ webkitCompassHeading: 120 })
  const expired = f.timers.at(-1)
  f.event({ alpha: 90, absolute: true })
  assert.deepEqual(f.headings, [120])
  expired(); assert.equal(f.statuses.at(-1), 'unavailable')
  f.event({ alpha: 90, absolute: false })
  assert.deepEqual(f.headings, [120])
  assert.equal(f.statuses.at(-1), 'unavailable')
  f.event({ type: 'deviceorientationabsolute', alpha: 90 })
  assert.deepEqual(f.headings, [120, 270])
  assert.equal(f.statuses.at(-1), 'active')
  f.event({ webkitCompassHeading: 140 })
  expired()
  f.event({ alpha: 180, absolute: true })
  assert.deepEqual(f.headings, [120, 270, 140])
  assert.equal(f.statuses.at(-1), 'active')
})
test('重新进入后的旧事件被拒绝，新会话重置读数来源', () => {
  const f = fixture(); f.handle.start()
  f.event({ webkitCompassHeading: 120 }); const old = f.listeners.at(-1).callback
  f.handle.stop(); f.handle.start()
  old({ webkitCompassHeading: 240 })
  f.event({ type: 'deviceorientationabsolute', alpha: 90 })
  assert.deepEqual(f.headings, [120, 270]); assert.equal(f.removed.length, 2)
})
test('有效手势授权后启动，停止后的迟到超时不修改状态', async () => {
  const f = fixture(async () => 'granted'); f.handle.start()
  await f.handle.requestPermission(); assert.equal(f.listeners.length, 2)
  f.handle.stop(); const before = [...f.statuses]; f.timers.forEach(callback => callback())
  assert.deepEqual(f.statuses, before)
})
