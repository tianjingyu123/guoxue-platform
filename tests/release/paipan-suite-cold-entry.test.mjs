import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
function fixture(pathname) {
  const exports = {}, replaced = []; let token = 'local'
  const window = { location: { pathname, search: '?id=synthetic' }, history: { state: { local: true }, replaceState: (...args) => replaced.push(args) } }
  const modules = {}
  function load(file) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, window, require: id => modules[id] })
    return exports
  }
  modules['@/utils/storage'] = { getToken: () => token }
  modules['@/lib/legacy-paipan-data'] = {}
  modules['@/lib/paipan-suite-navigation'] = load('apps/mobile/src/lib/paipan-suite-navigation.ts')
  Object.assign(exports, load('apps/mobile/src/lib/paipan-suite-cold-entry.ts'))
  return { ...exports, replaced, token: value => { token = value } }
}
test('H5自研冷链接先改当前历史项，原目标仅同账号消费一次', () => {
  const f = fixture('/h5/pkg-paipan/bazi/result')
  f.preparePaipanH5ColdEntry()
  assert.equal(f.replaced.length, 1); assert.equal(f.replaced[0][2], '/h5/pages/paipan/index')
  assert.equal(f.consumePaipanColdTarget(), '/pkg-paipan/bazi/result?id=synthetic')
  assert.equal(f.consumePaipanColdTarget(), null)
})
test('共用罗盘、第三方及其他板块不改历史；换账号不重放', () => {
  for (const path of ['/h5/pkg-common/compass/index', '/h5/pkg-paipan3/luopan/index', '/h5/pkg-common/legacy-paipan/index', '/h5/pages/circles/index']) {
    const f = fixture(path); f.preparePaipanH5ColdEntry(); assert.equal(f.replaced.length, 0)
  }
  const f = fixture('/h5/pkg-paipan2/liuyao/index'); f.preparePaipanH5ColdEntry(); f.token('changed')
  assert.equal(f.consumePaipanColdTarget(), null)
})
test('初始化改写发生在Vue应用创建前，不使用全局reLaunch', () => {
  const main = fs.readFileSync('apps/mobile/src/main.ts', 'utf8')
  assert.ok(main.indexOf('preparePaipanH5ColdEntry()') < main.indexOf('const app = createSSRApp'))
  assert.doesNotMatch(fs.readFileSync('apps/mobile/src/lib/paipan-suite-cold-entry.ts', 'utf8'), /uni\.reLaunch/)
})
