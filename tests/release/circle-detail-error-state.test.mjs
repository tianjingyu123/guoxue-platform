import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))
const ts = requireMobile('typescript')
const source = readFileSync(new URL('../../apps/mobile/src/lib/circle-detail-data.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

function createApi(apiGet) {
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.equal(name, '@/utils/request')
      return { apiGet }
    },
  })
  return exports.circleDetailApi
}

for (const method of ['posts', 'courses', 'postedArticles']) {
  test(`${method} 请求失败可传递给详情页，默认调用仍兼容空列表降级`, async () => {
    const failure = new Error('模拟网络失败')
    const api = createApi(async () => { throw failure })
    await assert.rejects(api[method]('qa-circle', { throwOnError: true }), (error) => error === failure)
    const fallback = await api[method]('qa-circle')
    assert.equal(JSON.stringify(fallback), method === 'posts' ? '{"data":[],"total":0}' : '[]')
  })

  test(`${method} 成功的空响应不会被误判为加载失败`, async () => {
    const api = createApi(async () => [])
    const result = await api[method]('qa-circle', { throwOnError: true })
    assert.equal(JSON.stringify(result), method === 'posts' ? '{"data":[],"total":0}' : '[]')
  })
}
