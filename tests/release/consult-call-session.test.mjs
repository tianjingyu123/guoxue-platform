import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const source = fs.readFileSync('apps/mobile/src/lib/consult-call-session.ts', 'utf8')
const id = '00000000-0000-4000-8000-000000000001'
const input = { circleId: 'circle', expertId: 'expert', type: 'VOICE' }
const state = (status = 'WAITING', role = 'CALLER') => ({ id, status, role, type: 'VOICE', startAt: null, endAt: null })
const ticket = () => ({ id, rtcRoomId: 'consult_0123456789abcdef', trtc: {
  sdkAppId: 1, userId: `c_${'a'.repeat(30)}`, roomId: 'consult_0123456789abcdef', strRoomId: 'consult_0123456789abcdef',
  userSig: 'synthetic-user-ticket', privateMapKey: 'synthetic-room-ticket', configured: true, expiresAt: new Date(Date.now() + 600000).toISOString(),
} })
function fixture(overrides = {}) {
  const exports = {}, calls = [], views = []
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
  let current = state()
  const deps = { prepare: async () => calls.push('prepare'), connect: async () => calls.push('connect'), disconnect: () => calls.push('disconnect'),
    initiate: async () => { calls.push('initiate'); return ticket() }, accept: async () => { calls.push('accept'); return ticket() },
    read: async () => { calls.push('read'); return current },
    cancel: async () => { calls.push('cancel'); current = state('REFUNDED', current.role) },
    end: async () => { calls.push('end'); current = state('ENDED', current.role) },
    onChange: value => views.push(JSON.parse(JSON.stringify(value))), ...overrides }
  return { session: exports.createConsultCallSession(deps), calls, views, setState: value => { current = value } }
}
test('设备能力拒绝时不发起预扣，允许用户修复权限后重试', async () => {
  const f = fixture({ prepare: async () => { throw Error('denied') } }); await f.session.initiate(input)
  assert.equal(f.calls.includes('initiate'), false); assert.equal(f.session.snapshot().phase, 'IDLE')
  assert.equal(f.session.snapshot().error, 'DEVICE_UNAVAILABLE')
})
test('双击发起仅调用一次，视图与事件不携带入房凭据', async () => {
  const f = fixture(); await Promise.all([f.session.initiate(input), f.session.initiate(input)])
  assert.equal(f.calls.filter(c => c === 'initiate').length, 1); assert.equal(f.session.snapshot().phase, 'WAITING')
  assert.equal(JSON.stringify(f.views).includes('synthetic-'), false)
})
test('发起响应丢失后禁止重放扣费，必须核查历史记录', async () => {
  let count = 0; const f = fixture({ initiate: async () => { count++; throw Error('timeout') } })
  await f.session.initiate(input); await f.session.initiate(input)
  assert.equal(count, 1); assert.equal(f.session.snapshot().phase, 'RECOVERY_REQUIRED')
  assert.equal(f.session.snapshot().callId, null)
})
test('挂断根据最新状态选择结束而非使用等待阶段的旧状态取消', async () => {
  const f = fixture(); await f.session.initiate(input); f.setState(state('ONGOING'))
  await Promise.all([f.session.hangup(), f.session.hangup()])
  assert.equal(f.calls.filter(c => c === 'end').length, 1); assert.equal(f.calls.includes('cancel'), false)
  assert.equal(f.session.snapshot().phase, 'FINISHED')
})
test('拒接/取消等待通话确认服务端退款终态后才显示完成', async () => {
  const f = fixture(); await f.session.initiate(input); await f.session.hangup()
  assert.equal(f.calls.filter(c => c === 'cancel').length, 1); assert.equal(f.session.snapshot().phase, 'FINISHED')
})
test('媒体失败保留业务待处理，不虚报取消/退款或自动再次入房', async () => {
  const f = fixture({ connect: async () => { throw Error('native error') } })
  await f.session.initiate(input); f.session.observe(state('ONGOING'))
  assert.equal(f.session.snapshot().phase, 'RECOVERY_REQUIRED'); assert.equal(f.calls.includes('end'), false)
  assert.equal(f.calls.includes('cancel'), false)
})
test('双方身份不匹配或已取消时不进房', async () => {
  for (const value of [state('WAITING', 'EXPERT'), state('REFUNDED')]) {
    const f = fixture({ read: async () => value }); await f.session.initiate(input)
    assert.equal(f.calls.includes('connect'), false)
  }
})
test('已过期、跨房间或不完整票据不传给原生层', async () => {
  for (const change of [{ expiresAt: '2000-01-01T00:00:00Z' }, { strRoomId: 'other' }, { privateMapKey: null }]) {
    const result = ticket(); Object.assign(result.trtc, change)
    const f = fixture({ initiate: async () => result }); await f.session.initiate(input)
    assert.equal(f.calls.includes('connect'), false); assert.equal(f.session.snapshot().callId, id)
  }
})
test('离页时在途入房完成仍再次清理，迟到业务响应不复活页面', async () => {
  let finish; const f = fixture({ connect: () => new Promise(resolve => { finish = resolve }) })
  const pending = f.session.initiate(input)
  while (!finish) await Promise.resolve()
  f.session.dispose(); const count = f.views.length; finish(); await pending
  assert.equal(f.views.length, count); assert.equal(f.calls.at(-1), 'disconnect')
})
test('接听仅使用原通话票据且挂断失败不宣称结算成功', async () => {
  const f = fixture({ read: async () => state('ONGOING', 'EXPERT'), end: async () => { throw Error('timeout') } })
  await f.session.accept(id, 'VOICE'); assert.equal(f.session.snapshot().phase, 'ONGOING')
  await f.session.hangup(); assert.equal(f.session.snapshot().phase, 'RECOVERY_REQUIRED')
  assert.equal(f.session.snapshot().error, 'ACTION_UNCERTAIN')
})
test('来电状态轮询不把未接听页面切成恢复失败，仍可接听或拒绝', async () => {
  const f = fixture({ read: async () => state('WAITING', 'EXPERT') })
  await f.session.loadExisting(id); f.session.observe(state('WAITING', 'EXPERT'))
  assert.equal(f.session.snapshot().phase, 'IDLE'); await f.session.accept(id, 'VOICE')
  assert.equal(f.calls.filter(c => c === 'accept').length, 1)
})
test('切后台发生在权限准备期间，不继续发起预扣', async () => {
  let finish
  const f = fixture({ prepare: () => new Promise(resolve => { finish = resolve }) })
  const pending = f.session.initiate(input); f.session.mediaLost(); finish(); await pending
  assert.equal(f.calls.includes('initiate'), false); assert.equal(f.session.snapshot().phase, 'IDLE')
})
test('切后台发生在创建响应返回前，保留可核查记录但不再启动媒体', async () => {
  let finish
  const f = fixture({ initiate: () => new Promise(resolve => { finish = resolve }) })
  const pending = f.session.initiate(input)
  while (!finish) await Promise.resolve()
  f.session.mediaLost(); finish(ticket()); await pending
  assert.equal(f.calls.includes('connect'), false); assert.equal(f.session.snapshot().callId, id)
  assert.equal(f.session.snapshot().phase, 'RECOVERY_REQUIRED')
})
