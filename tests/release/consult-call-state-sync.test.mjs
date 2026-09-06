import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const source = fs.readFileSync('apps/mobile/src/lib/consult-call-state-sync.ts', 'utf8')
const state = (status = 'WAITING', extra = {}) => ({ id: 'call', status, type: 'VOICE', role: 'CALLER', startAt: null, endAt: null, ...extra })
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }
function fixture() {
  const exports = {}, requests = [], timers = new Map(), values = [], errors = []; let sequence = 0
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, setTimeout: callback => { timers.set(++sequence, callback); return sequence }, clearTimeout: id => timers.delete(id) })
  const sync = exports.createConsultCallStateSync({ callId: 'call',
    read: id => new Promise((resolve, reject) => requests.push({ id, resolve, reject })),
    onState: value => values.push(JSON.parse(JSON.stringify(value))), onError: code => errors.push(code) })
  const next = () => { const [id, callback] = timers.entries().next().value; timers.delete(id); callback() }
  return { sync, requests, timers, values, errors, next }
}

test('重复开始不并发请求，等待/接通/结束有序推进，终态不可复活', async () => {
  const f = fixture(); f.sync.start(); f.sync.start(); assert.equal(f.requests.length, 1)
  f.requests[0].resolve(state()); await flush(); assert.equal(f.timers.size, 1)
  f.next(); f.requests[1].resolve(state('ONGOING')); await flush()
  f.next(); f.requests[2].resolve(state('ENDED')); await flush()
  f.sync.start(); assert.equal(f.requests.length, 3); assert.equal(f.timers.size, 0)
  assert.deepEqual(f.values.map(v => v.status), ['WAITING', 'ONGOING', 'ENDED'])
})
test('离页后的迟到响应无效，重新进入也不接受上一代请求', async () => {
  const f = fixture(); f.sync.start(); f.sync.stop(); f.sync.start()
  f.requests[0].resolve(state('ENDED')); await flush(); assert.equal(f.values.length, 0)
  f.requests[1].resolve(state()); await flush(); assert.equal(f.values.length, 1)
  f.sync.stop(); assert.equal(f.timers.size, 0)
})
test('断网不假定结束、不循环重试，明确重试后可恢复', async () => {
  const f = fixture(); f.sync.start(); f.requests[0].reject(new Error('敏感网络详情')); await flush()
  assert.deepEqual(f.errors, ['STATE_UNAVAILABLE']); assert.equal(f.values.length, 0); assert.equal(f.timers.size, 0)
  f.sync.start(); assert.equal(f.requests.length, 2)
})
for (const bad of [{ id: 'other' }, { status: 'UNKNOWN' }, { role: 'ADMIN' }, { startAt: 'invalid' }]) {
  test(`非法状态停止同步：${JSON.stringify(bad)}`, async () => {
    const f = fixture(); f.sync.start(); f.requests[0].resolve(state('WAITING', bad)); await flush()
    assert.deepEqual(f.errors, ['STATE_INVALID']); assert.equal(f.values.length, 0); assert.equal(f.timers.size, 0)
  })
}
test('已接通不得退回等待，响应中的票据等额外字段不向页面传播', async () => {
  const f = fixture(); f.sync.start(); f.requests[0].resolve(state('ONGOING', { userSig: 'synthetic-secret' })); await flush()
  assert.equal('userSig' in f.values[0], false)
  f.next(); f.requests[1].resolve(state()); await flush()
  assert.deepEqual(f.errors, ['STATE_INVALID']); assert.equal(f.values.length, 1)
})
