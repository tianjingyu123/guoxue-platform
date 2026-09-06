import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const ts = createRequire(resolve('apps/admin/package.json'))('typescript')
// 本组只覆盖这些文件使用的 ifdef/ifndef/endif；遇到其他条件语法必须显式补测。
function preprocess(source, platform) {
  const stack = [true]; const output = []
  for (const line of source.split('\n')) {
    const start = line.match(/\/\/\s*#(ifdef|ifndef)\s+([\w-]+)\s*$/)
    if (start) { stack.push(stack.at(-1) && ((start[2] === platform) === (start[1] === 'ifdef'))); continue }
    if (/\/\/\s*#endif\s*$/.test(line)) { assert.ok(stack.length > 1); stack.pop(); continue }
    assert.ok(!/\/\/\s*#(?:if|else)/.test(line), '未覆盖的条件语法')
    if (stack.at(-1)) output.push(line)
  }
  assert.equal(stack.length, 1); return output.join('\n')
}
function routes(platform) {
  const source = preprocess(fs.readFileSync('apps/mobile/src/pages.json', 'utf8'), platform)
  return JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''))
}
function policy(platform) {
  const exports = {}
  const source = preprocess(fs.readFileSync('apps/mobile/src/lib/mp-paipan-maintenance.ts', 'utf8'), platform)
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
  return exports
}
test('微信不登记排盘分包、嵌入页及排盘案例投稿页，保留维护和客服页', () => {
  const config = routes('MP-WEIXIN')
  assert.ok(config.pages.some(p => p.path === 'pages/paipan/index'))
  assert.ok(config.subPackages.every(p => !/^pkg-paipan/.test(p.root)))
  assert.ok(!config.subPackages.find(p => p.root === 'pkg-common').pages.some(p => p.path === 'legacy-paipan/index'))
  assert.ok(!config.subPackages.find(p => p.root === 'pkg-common').pages.some(p => p.path === 'compass/index'))
  assert.ok(!config.subPackages.find(p => p.root === 'pkg-mine').pages.some(p => p.path === 'submissions/index'))
  assert.ok(config.subPackages.find(p => p.root === 'pkg-agent').pages.some(p => p.path === 'agent/customer-service'))
})
test('App、H5、Harmony继续登记既有工具，不全局关闭', () => {
  for (const platform of ['APP-PLUS', 'H5', 'APP-HARMONY']) {
    const config = routes(platform)
    assert.equal(config.subPackages.filter(p => /^pkg-paipan/.test(p.root)).length, 3)
    assert.ok(config.subPackages.find(p => p.root === 'pkg-common').pages.some(p => p.path === 'legacy-paipan/index'))
    assert.ok(config.subPackages.find(p => p.root === 'pkg-common').pages.some(p => p.path === 'compass/index'))
    assert.equal(policy(platform).mpPaipanMaintenanceTarget('/pkg-common/compass/index'), null)
    assert.equal(policy(platform).mpPaipanMaintenanceTarget('/paipan/bazi'), null)
  }
})
test('微信别名、深链和嵌入入口归维护，非排盘路径不误拦', () => {
  const p = policy('MP-WEIXIN')
  for (const path of ['/paipan', '/paipan/bazi?id=1', 'pkg-paipan2/liuyao/index', '/pkg-common/legacy-paipan/index', '/pkg-common/compass/index', '/mine/submissions']) {
    assert.equal(p.mpPaipanMaintenanceTarget(path), '/pages/paipan/index')
  }
  for (const path of ['/pages/circles/index', '/pkg-shop/checkout/index', '/customer-service', '/pkg-creator/publish/index']) {
    assert.equal(p.mpPaipanMaintenanceTarget(path), null)
  }
  assert.equal(p.PAIPAN_MAINTENANCE_MESSAGE, '排盘工具维护升级中，当前暂仅向 App、微信公众号及 H5 用户开放。如有疑问，请联系智能客服。')
})
