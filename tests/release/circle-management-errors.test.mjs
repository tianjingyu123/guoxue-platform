import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const ts = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))('typescript')
const cases = [
  ['circle-data', 'circleApi', 'getMyStats', [false], '{"joinedCount":0,"postCount":0,"likeReceived":0}'],
  ['circle-invite-data', 'inviteApi', 'listCodes', ['qa'], '[]'],
  ['circle-knowledge-data', 'knowledgeApi', 'candidates', ['qa'], '[]'],
  ['circle-refund-data', 'refundApi', 'ownerPending', [], '[]'],
  ['circle-refund-data', 'refundApi', 'myRefunds', [], '[]'],
]
for (const [file, name, method, args, fallback] of cases) {
  test(`${method} 严格读取上抛原错误，旧调用保留兼容`, async () => {
    const source = readFileSync(new URL(`../../apps/mobile/src/lib/${file}.ts`, import.meta.url), 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const exports = {}, failure = new Error('隔离网络故障')
    const apiGet = async () => { throw failure }
    vm.runInNewContext(compiled, { exports, require(path) { assert.equal(path, '@/utils/request'); return { apiGet, apiGetOptionalAuth: apiGet } } })
    await assert.rejects(exports[name][method](...args, { throwOnError: true }), error => error === failure)
    assert.equal(JSON.stringify(await exports[name][method](...args)), fallback)
  })
}
