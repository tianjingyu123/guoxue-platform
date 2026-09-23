const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const evidenceSource = fs.readFileSync(path.join(__dirname, '../src/utils/after-sale-evidence.ts'), 'utf8')
const evidenceModule = { exports: {} }
vm.runInNewContext(ts.transpileModule(evidenceSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: evidenceModule, exports: evidenceModule.exports })

const source = fs.readFileSync(path.join(__dirname, '../src/pkg-order/lib/order-data.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const sandboxModule = { exports: {} }
let posted
const paged = []
vm.runInNewContext(compiled, {
  module: sandboxModule,
  exports: sandboxModule.exports,
  require: (id) => {
    if (id === '@/utils/after-sale-evidence') return evidenceModule.exports
    assert.equal(id, '@/utils/request')
    return {
      apiGet: async () => ({}), apiPut: async () => ({}),
      apiGetPaged: async (url) => { paged.push(url); return { items: [], total: 45, page: 2, pageSize: 20 } },
      apiPost: async (url, body) => { posted = { url, body }; return {} },
    }
  },
})

async function main() {
  await sandboxModule.exports.orderApi.submitDispute('synthetic-order', 'quality_issue', '商品有破损', '希望核查', [
    'https://assets.example.invalid/evidence.jpg',
  ])
  assert.equal(posted.url, '/shop/orders/synthetic-order/after-sale')
  assert.equal(posted.body.type, 'quality_issue')
  assert.equal(posted.body.images[0], 'https://assets.example.invalid/evidence.jpg')
  assert.match(posted.body.reason, /商品有破损/)
  const page = await sandboxModule.exports.orderApi.getDisputesPage(2)
  assert.equal(paged[0], '/shop/after-sales?page=2&pageSize=20')
  assert.equal(page.total, 45)
  const parsed = evidenceModule.exports.parseAfterSaleEvidence('质量问题\n[凭证图片] https://assets.example.invalid/evidence.jpg')
  assert.equal(parsed.reason, '质量问题')
  assert.equal(parsed.images[0], 'https://assets.example.invalid/evidence.jpg')
  const legacy = evidenceModule.exports.parseAfterSaleEvidence('旧记录，无图片')
  assert.equal(legacy.images.length, 0)
  process.stdout.write('dispute evidence and pagination: 9 synthetic checks passed\n')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
