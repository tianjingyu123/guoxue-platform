import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('../../apps/mobile/node_modules/typescript')
const code = ts.transpileModule(readFileSync(new URL('../../apps/mobile/src/lib/publish-permission.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
function harness(reply) {
  const exports = {}, calls = []
  vm.runInNewContext(code, { exports, require: () => ({ apiGet: async url => { calls.push(url); return reply(url) }, apiPost: () => { throw Error('不允许写入') } }) })
  return { check: exports.checkVideoPublishPermission, checkCapability: exports.checkCirclePublishPermission, calls }
}
test('个人直授只读新状态，不要求旧圈主申请', async () => {
  const h = harness(() => ({ circleId: 'circle', capability: 'SHORT_VIDEO', canPublish: true }))
  assert.equal(await h.check('circle'), true)
  assert.equal(h.calls.length, 1); assert.match(h.calls[0], /circle-capabilities\/circles\/circle\/use-status/)
})
test('旧圈级批准不能替代新授权，平台管理员保留既有入口', async () => {
  for (const admin of [false, true]) {
    const h = harness(url => url.includes('use-status') ? { circleId: 'circle', capability: 'SHORT_VIDEO', canPublish: false } : { isPlatformAdmin: admin, canPublish: true })
    assert.equal(await h.check('circle'), admin)
  }
})
test('圈子或能力错配、字符串true、网络故障不放行', async () => {
  for (const row of [null, { circleId: 'other', capability: 'SHORT_VIDEO', canPublish: true }, { circleId: 'circle', capability: 'LIVE', canPublish: true }, { circleId: 'circle', capability: 'SHORT_VIDEO', canPublish: 'true' }]) {
    const h = harness(() => row)
    assert.equal(await h.check('circle'), false)
  }
  assert.equal(await harness(() => { throw Error('NETWORK') }).check('circle'), false)
})
test('未选圈子不能凭旧全平台批准投稿', async () => {
  assert.equal(await harness(() => ({ isPlatformAdmin: false, canPublish: true })).check(), false)
})
test('直播查询精确LIVE，不能拿短视频资格开播', async () => {
  const ok = harness(() => ({ circleId: 'circle', capability: 'LIVE', canPublish: true }))
  assert.equal(await ok.checkCapability('LIVE', 'circle'), true)
  assert.match(ok.calls[0], /capability=LIVE$/)
  const wrong = harness(() => ({ circleId: 'circle', capability: 'SHORT_VIDEO', canPublish: true }))
  assert.equal(await wrong.checkCapability('LIVE', 'circle'), false)
})
