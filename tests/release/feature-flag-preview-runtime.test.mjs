import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const ts = createRequire(resolve('apps/server/package.json'))('typescript')
const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/server/src/modules/feature-flag/feature-flag.service.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
}).outputText, { exports, require: name => {
  if (name === 'crypto') return crypto
  if (name === '@nestjs/common') return { Injectable: () => value => value, Logger: class {}, BadRequestException: Error, ConflictException: Error }
  if (name === './feature-flag.dto') return { FEATURE_FLAG_KEY_PATTERN: /^[a-z][a-z0-9._-]{1,63}$/ }
  if (name === '@prisma/client') return { Prisma: { PrismaClientKnownRequestError: class extends Error {}, TransactionIsolationLevel: { Serializable: 'Serializable' } } }
  throw new Error(`未声明依赖 ${name}`)
} })

function setup(existing = null) {
  let reads = 0
  const forbid = new Proxy({}, { get: (_, key) => { throw new Error(`禁止缓存操作 ${String(key)}`) } })
  const service = new exports.FeatureFlagService({ featureFlag: { findUnique: async () => { reads++; return existing } } }, forbid)
  return { service, reads: () => reads }
}
test('新开关预览不创建、不发布、不操作缓存', async () => {
  const { service, reads } = setup()
  const result = await service.preview('client_test', {})
  assert.equal(result.previewOnly, true)
  assert.equal(result.published, false)
  assert.equal(result.anonymousEnabled, false)
  assert.equal(result.sampleEnabled, null)
  assert.equal(reads(), 1)
})
test('继承已存字段并按实际白名单优先级评估，不输出账号列表', async () => {
  const existing = { key: 'client_test', name: '测试', description: null, enabled: true, percentage: 0, targetUserIds: ['qa-only'] }
  const { service } = setup(existing)
  const result = await service.preview('client_test', { sampleUserId: 'qa-only' })
  assert.equal(result.sampleEnabled, true)
  assert.equal(result.anonymousEnabled, false)
  assert.equal(result.baseFingerprint, result.candidateFingerprint)
  assert.equal(JSON.stringify(result).includes('qa-only'), false)
  const changed = await service.preview('client_test', { enabled: false, sampleUserId: 'qa-only' })
  assert.equal(changed.sampleEnabled, false)
  assert.notEqual(changed.baseFingerprint, changed.candidateFingerprint)
  assert.equal(existing.enabled, true)
})
test('白名单规范化与公开可见范围一致', async () => {
  const { service } = setup()
  const result = await service.preview('internal_test', { enabled: true, percentage: 0, targetUserIds: [' qa ', 'qa', ''], sampleUserId: 'qa' })
  assert.equal(result.targetUserCount, 1)
  assert.equal(result.sampleEnabled, true)
  assert.equal(result.clientVisible, false)
})
test('灰度预览与实际评估算法逐个用户一致', async () => {
  const { service } = setup()
  for (const percentage of [0, 25, 100]) {
    for (const user of ['alpha', 'beta', 'gamma']) {
      const result = await service.preview('client_test', { enabled: true, percentage, sampleUserId: user })
      const bucket = parseInt(crypto.createHash('md5').update(`${user}:client_test`).digest('hex').slice(0, 8), 16) % 100
      assert.equal(result.sampleEnabled, bucket < percentage)
    }
  }
})

test('预览后其他管理员修改，发布在任何写入前被拒绝', async () => {
  let writes = 0
  const existing = { key: 'client_test', name: '测试', description: null, enabled: true, percentage: 50, targetUserIds: [] }
  const tx = { featureFlag: { findUnique: async () => existing, upsert: async () => { writes++; return existing } } }
  const service = new exports.FeatureFlagService({ $transaction: callback => callback(tx) }, {})
  await assert.rejects(service.upsert('client_test', { enabled: false, expectedFingerprint: '0'.repeat(64) }), /其他管理员修改/)
  assert.equal(writes, 0)
})

test('匹配指纹的发布使用Serializable事务，成功后才清缓存', async () => {
  const existing = { key: 'client_test', name: '测试', description: null, enabled: true, percentage: 50, targetUserIds: [] }
  const events = []
  const tx = { featureFlag: { findUnique: async () => existing, upsert: async () => { events.push('write'); return existing } } }
  const service = new exports.FeatureFlagService({ $transaction: async (callback, options) => {
    assert.equal(options.isolationLevel, 'Serializable')
    const result = await callback(tx); events.push('commit'); return result
  } }, { del: async key => { events.push(key) } })
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(existing)).digest('hex')
  await service.upsert('client_test', { expectedFingerprint: fingerprint })
  assert.deepEqual(events, ['write', 'commit', 'feature:client_test', 'feature:list'])
})
