import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync('apps/mobile/src/pkg-institute/lib/institute-data.ts', 'utf8')
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText

test('研究院列表请求在没有 URLSearchParams 的小程序运行时仍能生成正确查询参数', async () => {
  const urls = []
  const exports = {}
  const request = {
    apiGet: async url => {
      urls.push(url)
      return url.startsWith('/institute/events') ? { events: [] } : []
    },
    apiGetPaged: async url => {
      urls.push(url)
      return { items: [], total: 0 }
    },
    apiPost: async () => undefined,
    apiPut: async () => undefined,
  }
  vm.runInNewContext(compiled, {
    exports,
    require: name => {
      assert.equal(name, '@/utils/request')
      return request
    },
    encodeURIComponent,
  })

  await exports.instituteApi.getMembers({ role: 'A&B', joinYear: 2026 })
  await exports.instituteApi.getEvents({ type: 'LIVE', upcoming: true })
  await exports.instituteApi.getContents({ type: 'VIDEO', page: 2, pageSize: 10 })
  await exports.instituteApi.getLectures({ page: 3 })

  assert.deepEqual(urls, [
    '/institute/members?role=A%26B&joinYear=2026&pageSize=100',
    '/institute/events?type=LIVE&upcoming=true&pageSize=100',
    '/institute/contents?type=VIDEO&page=2&pageSize=10',
    '/institute/lectures?page=3&pageSize=20',
  ])
  assert.doesNotMatch(source, /new URLSearchParams/u)
})
