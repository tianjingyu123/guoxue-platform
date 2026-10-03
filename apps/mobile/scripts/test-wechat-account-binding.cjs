const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { webcrypto } = require('node:crypto')
const { initPreContext, preJs } = require('@dcloudio/uni-cli-shared')
const root = path.join(__dirname, '..')
const results = []
const userA = '123e4567-e89b-42d3-a456-426614174000'
const userB = '123e4567-e89b-42d3-a456-426614174001'

function load(platform = 'mp-weixin', options = {}) {
  initPreContext(platform, {})
  let userId = userA
  const memory = new Map()
  const calls = { sdk: [], bind: [], reads: 0, navigated: [], cleaned: [], loads: [], subscriptions: [] }
  const storage = {
    getItem: key => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key),
  }
  const ctx = {
    exports: {}, URL, Uint8Array, Date,
    ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }),
    onLoad: fn => calls.loads.push(fn), onUnmounted: () => {},
    navigator: { userAgent: options.browser === false ? 'Synthetic Chrome' : 'MicroMessenger Synthetic' },
    window: { sessionStorage: storage, crypto: webcrypto, location: { href: 'https://fixture.invalid/h5/pkg-mine/bind-accounts/index?wx_bind=1&code=synthetic&state=test', origin: 'https://fixture.invalid' }, history: { state: null, replaceState: (...args) => calls.cleaned.push(args[2]) } },
    uni: { login: input => {
      calls.sdk.push(input)
      if (options.delaySdk) { calls.finishSdk = () => input.success({ code: 'synthetic-code' }); return }
      if (options.cancel) { input.fail({ errMsg: 'cancel' }); return }
      input.success({ code: Object.hasOwn(options, 'code') ? options.code : ' synthetic-code ' })
    } },
  }
  const auth = { bindWechat: async (...args) => {
    calls.bind.push(args)
    if (options.changeAfterSubmit) userId = userB
    return { success: options.reject !== true, message: '合成身份冲突' }
  }, getWechatOAuthUrl: async (...args) => { calls.oauth = args; return 'https://open.weixin.qq.com/connect/oauth2/authorize?synthetic=1' } }
  const mocks = {
    '@/lib/auth-data': { authApi: auth },
    '@/utils/storage': { getToken: () => userId ? 'synthetic-token' : '', getUserInfo: () => ({ id: userId }), subscribeAuthContext: fn => { calls.subscriptions.push(fn); return () => {} } },
    '@/lib/mine-data': { mineApi: { getBoundAccounts: async () => { calls.reads++; return [{ provider: 'wechat', name: '微信', isBound: calls.bind.length > 0 }] }, toggleBind: async () => true } },
    '@/lib/remote-config': { hydrateRemoteConfig: async () => {}, isClientFeatureEnabled: () => options.enabled !== false },
    '@/utils/wechat-top-level': { navigateWechatAuthorization: (_window, value) => calls.navigated.push(value) },
  }
  ctx.require = name => { assert(mocks[name], 'unexpected dependency ' + name); return mocks[name] }
  vm.createContext(ctx)
  const helperFile = path.join(root, 'src/utils/wechat-account-binding.ts')
  const helper = preJs(fs.readFileSync(helperFile, 'utf8'), helperFile)
  vm.runInContext(ts.transpileModule(helper, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, ctx)
  const exported = ctx.exports
  mocks['@/utils/wechat-account-binding'] = exported
  const pageFile = path.join(root, 'src/pkg-mine/bind-accounts/index.vue')
  const page = preJs(fs.readFileSync(pageFile, 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1], pageFile)
  const ast = ts.createSourceFile('binding-page.ts', page, ts.ScriptTarget.Latest, true)
  const script = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getFullText(ast)).join('\n')
  Object.assign(ctx, exported, { authApi: auth, mineApi: mocks['@/lib/mine-data'].mineApi, subscribeAuthContext: mocks['@/utils/storage'].subscribeAuthContext, ...mocks['@/lib/remote-config'], ...mocks['@/utils/wechat-top-level'] })
  vm.runInContext(ts.transpileModule(script + '\nglobalThis.pageApi = { handleBind, continueAuthorization, cancelAuthorization, fetchData, accounts, notice, processing, wechatAvailable, authorizationUrl, error };', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx)
  return { helper: exported, page: ctx.pageApi, calls, storage, memory, setUser: value => { userId = value; calls.subscriptions.forEach(fn => fn()) } }
}

async function check(name, action) {
  try { await action(); results.push({ name, passed: true }) }
  catch (error) { results.push({ name, passed: false, error: error.message }) }
}

async function main() {
  for (const platform of ['app', 'mp-weixin']) {
    await check(platform + '实际页面绑定只交换临时票据并刷新权威列表', async () => {
      const test = load(platform); await test.calls.loads[0]({}); await test.page.handleBind()
      assert.equal(test.calls.sdk[0].onlyAuthorize, platform === 'app' ? true : undefined)
      assert.equal(test.calls.bind[0][0], 'synthetic-code')
      assert.equal(test.calls.bind[0][1], platform === 'app' ? 'app' : 'miniprogram')
      assert.equal(test.calls.bind[0][2], userA); assert.equal(test.calls.reads, 2)
      assert(test.page.accounts.value[0].isBound); assert.equal(test.page.processing.value, false)
    })
  }
  for (const options of [{ cancel: true }, { code: '' }, { code: '   ' }, { code: 42 }]) {
    await check('SDK失败或无有效票据不请求绑定：' + JSON.stringify(options), async () => {
      const test = load('app', options); await test.calls.loads[0]({}); await test.page.handleBind()
      assert.equal(test.calls.bind.length, 0); assert(test.page.notice.value); assert.equal(test.page.processing.value, false)
    })
  }
  await check('APP远端功能关闭不绕过开关', async () => {
    const test = load('app', { enabled: false }); await test.calls.loads[0]({}); await test.page.handleBind()
    assert.equal(test.calls.sdk.length, 0); assert.equal(test.calls.bind.length, 0)
  })
  await check('连续点击仅发起一次授权', async () => {
    const test = load('app', { delaySdk: true }); await test.calls.loads[0]({})
    const first = test.page.handleBind(); await new Promise(resolve => setImmediate(resolve))
    await test.page.handleBind(); assert.equal(test.calls.sdk.length, 1); test.calls.finishSdk(); await first
  })
  await check('授权过程中换账号不发送旧身份绑定', async () => {
    const test = load('mp-weixin', { delaySdk: true }); await test.calls.loads[0]({})
    const first = test.page.handleBind(); test.setUser(userB); test.calls.finishSdk(); await first
    assert.equal(test.calls.bind.length, 0)
  })
  await check('服务端身份冲突不显示绑定成功', async () => {
    const test = load('app', { reject: true }); await test.calls.loads[0]({}); await test.page.handleBind()
    assert.equal(test.page.notice.value, '合成身份冲突'); assert.equal(test.page.accounts.value[0].isBound, false)
  })
  await check('请求返回前切换账号不接受旧成功结果', async () => {
    const test = load('app', { changeAfterSubmit: true })
    await assert.rejects(test.helper.submitWechatBinding(userA, 'synthetic', 'app'), /账号已变化/)
  })
  await check('绑定主体不存在时不请求服务端', async () => {
    const test = load(); test.setUser(''); await assert.rejects(test.helper.submitWechatBinding(userA, 'synthetic', 'app'))
    assert.equal(test.calls.bind.length, 0)
  })
  await check('H5非微信环境不展示可执行微信授权', async () => {
    const test = load('h5', { browser: false }); await test.calls.loads[0]({}); await test.page.handleBind()
    assert.equal(test.page.wechatAvailable.value, false); assert.equal(test.calls.oauth, undefined)
  })
  await check('H5异步准备后仅在继续授权手势跳转，取消清理尝试', async () => {
    const test = load('h5'); await test.calls.loads[0]({}); await test.page.handleBind()
    assert.equal(test.calls.navigated.length, 0); assert(test.calls.oauth[1].startsWith('wxbind.'))
    test.page.continueAuthorization(); assert.equal(test.calls.navigated.length, 1)
    test.page.cancelAuthorization(); assert.equal(test.memory.size, 0); assert.equal(test.page.authorizationUrl.value, '')
  })
  await check('授权记录仅包含状态、主体和时间，单次使用', () => {
    const test = load('h5'); const attempt = test.helper.createBindingAttempt(userA, test.storage, webcrypto, 100)
    assert.equal(attempt.state.length, 55); assert.deepEqual(Object.keys(attempt).sort(), ['createdAt', 'state', 'userId'])
    assert(test.helper.consumeBindingAttempt(attempt.state, userA, test.storage, 101))
    assert.equal(test.helper.consumeBindingAttempt(attempt.state, userA, test.storage, 102), false)
  })
  for (const [name, time, subject, stateOverride] of [
    ['过期', 600101, userA], ['未来时间', 99, userA], ['切账号', 101, userB], ['伪造state', 101, userA, 'wxbind.forged'],
  ]) {
    await check('回调拒绝' + name + '且清理记录', () => {
      const test = load('h5'); const attempt = test.helper.createBindingAttempt(userA, test.storage, webcrypto, 100)
      assert.equal(test.helper.consumeBindingAttempt(stateOverride || attempt.state, subject, test.storage, time), false)
      assert.equal(test.memory.size, 0)
    })
  }
  await check('H5有效回调调用绑定而非登录并清理URL票据', async () => {
    const test = load('h5'); const attempt = test.helper.createBindingAttempt(userA, test.storage, webcrypto)
    await test.calls.loads[0]({ wx_bind: '1', code: 'synthetic', state: attempt.state })
    assert.equal(test.calls.bind.length, 1); assert.equal(test.calls.bind[0][1], 'h5'); assert.equal(test.calls.bind[0][2], userA)
    assert(!test.calls.cleaned[0].includes('code=')); assert(!test.calls.cleaned[0].includes('state='))
    assert(test.page.notice.value.includes('微信已绑定'))
  })
  await check('H5无合法尝试不提交且仍加载可重试页面', async () => {
    const test = load('h5'); await test.calls.loads[0]({ wx_bind: '1', code: 'synthetic', state: 'wxbind.' + 'a'.repeat(48) })
    assert.equal(test.calls.bind.length, 0); assert.equal(test.calls.reads, 1); assert(test.page.notice.value.includes('失效'))
  })
  const callback = fs.readFileSync(path.join(root, 'static/wechat-oauth-callback.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  initPreContext('h5', {})
  const appFile = path.join(root, 'src/App.vue')
  const appScript = preJs(fs.readFileSync(appFile, 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1], appFile)
  const appAst = ts.createSourceFile('app.ts', appScript, ts.ScriptTarget.Latest, true)
  const restore = appAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'restoreWechatPaymentCallback')
  assert(restore)
  for (const prefix of ['wxbind.', 'wxlogin.']) {
    await check(prefix + '授权不会被残留支付回跳劫持', () => {
      let redirected = false
      const ctx = { URL, URLSearchParams, sessionStorage: { getItem: () => 'https://fixture.invalid/h5/pkg-shop/paying/index' }, window: { location: { search: '?code=synthetic&state=' + prefix + 'a'.repeat(48), replace: () => { redirected = true } } } }
      vm.createContext(ctx)
      vm.runInContext(ts.transpileModule(restore.getFullText(appAst), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx)
      assert.equal(ctx.restoreWechatPaymentCallback(), false); assert.equal(redirected, false)
    })
  }
  for (const [state, route] of [['wxbind.' + 'a'.repeat(48), '/h5/pkg-mine/bind-accounts/index'], ['wxlogin.synthetic', '/h5/pkg-auth/login/index'], ['wxbind.bad', '/h5/pkg-mall/home/index'], ['https://malicious.invalid', '/h5/pkg-mall/home/index']]) {
    await check('静态回调固定同源路由：' + state.slice(0, 15), () => {
      let result
      vm.runInNewContext(callback, { URL, URLSearchParams, window: { location: { origin: 'https://fixture.invalid', search: '?code=synthetic&state=' + encodeURIComponent(state), replace: value => { result = value } } } })
      assert.equal(new URL(result).origin, 'https://fixture.invalid'); assert.equal(new URL(result).pathname, route)
    })
  }
  process.stdout.write(JSON.stringify({ scope: '实际页面/工具/静态回调；SDK和服务端为合成替身，无真实授权', passed: results.filter(item => item.passed).length, failed: results.filter(item => !item.passed).length, cases: results }, null, 2) + '\n')
  if (results.some(item => !item.passed)) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
