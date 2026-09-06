import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const requireMobile = createRequire(resolve('apps/mobile/package.json'))
const ts = requireMobile('typescript')
const { createRouter, createMemoryHistory } = createRequire(fs.realpathSync('apps/mobile/node_modules/@dcloudio/uni-h5/package.json'))('vue-router')
function fixture() {
  let allowed = true, calls = 0, pending = null
  const dependencies = {
    '@/utils/storage': { getToken: () => 'local-synthetic' },
    '@/lib/legacy-paipan-data': { legacyPaipanApi: { nativeQaAccess: async () => { calls++; return pending ? await pending : { allowed } } } },
  }
  function load(file) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, require: id => dependencies[id] })
    return exports
  }
  dependencies['@/lib/paipan-suite-navigation'] = load('apps/mobile/src/lib/paipan-suite-navigation.ts')
  const api = load('apps/mobile/src/lib/paipan-h5-history-guard.ts')
  const paths = ['/pages/paipan/index', '/pages/circles/index', '/pkg-paipan/bazi/index', '/pkg-common/compass/index']
  const router = createRouter({ history: createMemoryHistory(), routes: paths.map(path => ({ path, component: { render: () => null } })) })
  api.installPaipanH5HistoryGuard(router); api.installPaipanH5HistoryGuard(router)
  return { router, allow: value => { allowed = value }, delay: value => { pending = value }, calls: () => calls }
}

test('真实Router：切到圈子后迟到的拒绝结果不能恢复旧排盘跳转', async () => {
  const f = fixture()
  await f.router.push('/pages/paipan/index')
  let finish
  f.delay(new Promise(resolve => { finish = resolve }))
  const old = f.router.push('/pkg-paipan/bazi/index')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.calls(), 1)
  await f.router.push('/pages/circles/index')
  finish({ allowed: false })
  await old
  assert.equal(f.router.currentRoute.value.path, '/pages/circles/index')
})
test('真实Router：普通跳转及后退重新核验，切换后不恢复自研页', async () => {
  const f = fixture()
  await f.router.push('/pages/paipan/index')
  await f.router.push('/pkg-paipan/bazi/index'); assert.equal(f.calls(), 1)
  await f.router.push('/pages/circles/index'); f.allow(false)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(Error('历史跳转未完成')) }, 2000)
    const stop = f.router.afterEach(to => { if (to.path === '/pages/paipan/index') { clearTimeout(timer); stop(); resolve() } })
    f.router.back()
  })
  assert.equal(f.router.currentRoute.value.path, '/pages/paipan/index')
  assert.equal(f.calls(), 2)
})
test('共用罗盘、圈子不发权限请求，安装两次不重复拦截', async () => {
  const f = fixture(); f.allow(false)
  await f.router.push('/pkg-common/compass/index'); await f.router.push('/pages/circles/index')
  assert.equal(f.calls(), 0)
  await f.router.push('/pkg-paipan/bazi/index')
  assert.equal(f.router.currentRoute.value.path, '/pages/paipan/index'); assert.equal(f.calls(), 1)
})
