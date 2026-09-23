const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/pkg-order/lib/order-data.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
let rows = []
let pathUsed = ''
const moduleExports = {}
vm.runInNewContext(js, {
  exports: moduleExports,
  require: (name) => {
    assert.equal(name, '@/utils/request')
    return { apiGet: async (url) => { pathUsed = url; return { items: rows } }, apiPost() {}, apiPut() {} }
  },
  Date,
})

async function run() {
  const statuses = {
    PENDING: ['merchant_review', '审核中'],
    APPROVED: ['return_pending', '待退货'],
    PROCESSING: ['refunding', '退款处理中'],
    COMPLETED: ['completed', '退款处理完成'],
    REJECTED: ['rejected', '申请未通过'],
    CANCELLED: ['cancelled', '申请已撤销'],
  }
  for (const [raw, [status, title]] of Object.entries(statuses)) {
    rows = [
      { id: 'exchange', orderId: 'order-1', type: 'exchange', status: 'COMPLETED' },
      { id: 'refund', orderId: 'order-1', type: 'refund_with_return', status: raw, amount: 12 },
    ]
    const result = await moduleExports.orderApi.refundProgress('order-1')
    assert.equal(result.id, 'refund', '换货不能当作退款')
    assert.equal(result.status, status)
    assert.equal(result.type, 'return_refund')
    assert.equal(result.timeline.at(-1).title, title)
    assert(pathUsed.includes('orderId=order-1'))
  }
  rows = [{ id: 'exchange', orderId: 'order-1', type: 'exchange', status: 'COMPLETED' }]
  await assert.rejects(moduleExports.orderApi.refundProgress('order-1'), /暂无该订单的退款记录/)
  process.stdout.write('refund status: 7 synthetic cases passed\n')
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
