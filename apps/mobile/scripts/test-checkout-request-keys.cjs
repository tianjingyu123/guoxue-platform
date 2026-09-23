const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/lib/checkout-request-keys.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const values = new Map()
let user = 'u1'
let now = 1000000
let nextId = 0
const storage = {
  getStorage: (key) => values.get(key) ?? null,
  setStorage: (key, value) => values.set(key, value),
  removeStorage: (key) => values.delete(key),
  getUserInfo: () => ({ id: user }),
}
function loadModule() {
  const exports = {}
  vm.runInNewContext(js, {
    exports,
    require: (name) => {
      assert.equal(name, '@/utils/storage')
      return storage
    },
    crypto: { randomUUID: () => `request-${++nextId}` },
    Date: { now: () => now },
  })
  return exports
}

const first = loadModule()
const keys = first.requestKeysFor('product-1/address-1', 2)
assert.equal(keys.length, 2)
assert.equal(first.hasPendingCheckoutAttempt(), true)
const reloaded = loadModule()
assert.deepEqual([...reloaded.requestKeysFor('product-1/address-1', 2)], [...keys], '页面重载沿用原键')
assert.throws(() => reloaded.requestKeysFor('product-1/address-2', 2), /核对/, '变更地址不能误复用')
user = 'u2'
assert.notDeepEqual([...reloaded.requestKeysFor('product-1/address-1', 2)], [...keys], '账户切换不复用')
reloaded.clearCheckoutAttempt()
assert.equal(reloaded.hasPendingCheckoutAttempt(), false)
const newPurchase = reloaded.requestKeysFor('product-1/address-1', 2)
assert.notDeepEqual([...newPurchase], [...keys], '完成后再次购买使用新键')
now += 31 * 60 * 1000
assert.notDeepEqual([...reloaded.requestKeysFor('product-1/address-1', 2)], [...newPurchase], '过期后另建尝试')
reloaded.clearCheckoutAttempt()
user = null
const beforeProfile = reloaded.requestKeysFor('product-1/address-1', 1)
user = 'u1'
assert.deepEqual([...reloaded.requestKeysFor('product-1/address-1', 1)], [...beforeProfile], '用户资料晚到时仍沿用原键')
process.stdout.write('checkout request keys: 7 synthetic checks passed\n')
