import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/admin/src/lib/circle-direct-grant-session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports })
const target = { circleId: 'circle-a', capability: 'LIVE' }
const terms = { reason: '战略伙伴授权', expiresAt: '2026-10-01T00:00:00Z', maxUnits: 10, maxConcurrent: 1 }
function setup() {
  let now = Date.parse('2026-09-05T00:00:00Z')
  const session = exports.createDirectGrantSession(() => now)
  const ticket = session.select(target)
  const preview = { target, circleName: '测试圈', subjectName: '测试圈主', latestRevision: 0 }
  return { session, ticket, preview, advance: n => { now += n } }
}
test('旧查询和其他对象结果不能覆盖新选择', () => {
  const { session, ticket, preview } = setup()
  const next = session.select({ ...target, circleId: 'circle-b' })
  assert.equal(session.acceptPreview(ticket, preview), false)
  assert.equal(session.acceptPreview(next, preview), false)
  assert.throws(() => session.begin(terms), /重新查询/)
})
test('拒绝缺失对象名及不一致的授权修订', () => {
  const { session, ticket, preview } = setup()
  for (const patch of [{ circleName: '' }, { subjectName: '' }, { latestRevision: 1 },
    { latestId: 'grant-a' }, { latestRevision: -1 }, { latestRevision: 2147483647 }]) {
    assert.equal(session.acceptPreview(ticket, { ...preview, ...patch }), false)
  }
})
test('双击、提交中切换对象均被阻断；失败后不得自动重发', () => {
  const { session, ticket, preview } = setup()
  assert.equal(session.acceptPreview(ticket, preview), true)
  const request = session.begin(terms)
  assert.throws(() => session.begin(terms), /重复提交/)
  assert.throws(() => session.select(target), /正在提交/)
  assert.equal(session.settle(Symbol('另一请求')), false)
  assert.equal(session.settle(request.token), true)
  assert.throws(() => session.begin(terms), /重新查询/)
  assert.equal(session.acceptPreview(ticket, preview), false)
})
test('预览超时或时钟倒退必须重新查询', () => {
  for (const elapsed of [60001, -1]) {
    const { session, ticket, preview, advance } = setup()
    session.acceptPreview(ticket, preview)
    advance(elapsed)
    assert.throws(() => session.begin(terms), /重新查询/)
  }
})
test('理由、期限和额度不提供静默默认值', () => {
  const { session, ticket, preview } = setup()
  session.acceptPreview(ticket, preview)
  for (const patch of [{ reason: ' ' }, { reason: '字'.repeat(501) }, { expiresAt: '2026-10-01' },
    { expiresAt: '2000-01-01T00:00:00Z' }, { maxUnits: 0 }, { maxConcurrent: 1.2 }, { maxUnits: Infinity }, { maxConcurrent: 11 }]) {
    assert.throws(() => session.begin({ ...terms, ...patch }))
  }
})
test('提交白名单绑定最新修订，快照不受调用方修改影响', () => {
  const { session, ticket, preview } = setup()
  session.acceptPreview(ticket, { ...preview, latestId: 'grant-a', latestRevision: 4 })
  preview.target = { ...target, circleId: 'changed' }
  const request = session.begin({ ...terms, source: 'UNTRUSTED', actorId: 'fake' })
  assert.equal(request.circleId, 'circle-a')
  assert.equal(request.body.expectedLatestRevision, 4)
  assert.equal(request.body.expectedLatestId, 'grant-a')
  assert.equal(request.body.source, undefined)
  assert.equal(request.body.actorId, undefined)
})
