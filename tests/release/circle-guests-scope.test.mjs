import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
const ts = createRequire(new URL('../../apps/mobile/package.json', import.meta.url))('typescript')
const source = readFileSync(new URL('../../apps/mobile/src/lib/circle-guests-data.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
function setup() {
  const exports = {}, requests = []
  vm.runInNewContext(compiled, { exports, require() { return {
    apiGet: async url => { requests.push({ url }); return [] },
    apiPut: async (url, body) => { requests.push({ url, body }); return { success: true } },
  } } })
  return { api: exports.circleGuestsApi, requests }
}
test('嘉宾查询和修改都携带当前圈子，切换圈子不沿用旧目标', async () => {
  const { api, requests } = setup()
  await api.list('circle-a')
  await api.list('circle-b')
  await api.setShareRate('guest', 30, 'circle-b')
  assert.equal(requests[0].url, '/circle-backend/guests?circleId=circle-a')
  assert.equal(requests[1].url, '/circle-backend/guests?circleId=circle-b')
  assert.equal(requests[2].body.circleId, 'circle-b')
  assert.equal(requests[2].body.shareRate, 30)
})
test('缺少圈子时在发出请求前拒绝', async () => {
  const { api, requests } = setup()
  await assert.rejects(api.list(''))
  await assert.rejects(api.setShareRate('guest', 30, ''))
  assert.equal(requests.length, 0)
})
