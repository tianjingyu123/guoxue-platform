const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { initPreContext, preJs } = require('@dcloudio/uni-cli-shared')

// 使用实际登录页和SDK条件编译器；供应商授权为合成契约，不触发真实微信授权。
const file = path.join(__dirname, '../src/pkg-auth/login/index.vue')
const source = fs.readFileSync(file, 'utf8')
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
function load(platform, scenario = {}) {
  initPreContext(platform, {})
  const compiled = preJs(script, file)
  const ast = ts.createSourceFile(file + '.ts', compiled, ts.ScriptTarget.Latest, true)
  const names = ['requestWechatLoginCode', 'bindCurrentWechatIdentity', 'handleThirdParty']
  const functions = ast.statements.filter(s => ts.isFunctionDeclaration(s) && names.includes(s.name?.text))
  assert.equal(functions.length, 3)
  const js = ts.transpileModule(functions.map(f => f.getFullText(ast)).join('\n'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const calls = { sdk: [], login: [], bind: [], oauth: 0, cleared: 0, tokenWrites: 0, returned: 0, toasts: [] }
  const ctx = {
    isLoading: { value: Boolean(scenario.loading) },
    agreedTerms: { value: scenario.agreed !== false },
    error: { value: '' }, paipanEntry: { value: false },
    uni: {
      login: options => {
        calls.sdk.push(options)
        if (scenario.cancel) return options.fail({ errMsg: '合成用户取消授权' })
        if (scenario.authResultOnly) return options.success({ authResult: { openid: 'synthetic-only' } })
        if ('code' in scenario) return options.success({ code: scenario.code })
        // APP默认流程不提供code；仅授权才返回临时票据，模拟DCloud官方契约。
        options.success(platform === 'app' && options.onlyAuthorize !== true
          ? { authResult: { openid: 'synthetic-only' } }
          : { code: 'synthetic-wechat-code' })
      },
      showToast: data => calls.toasts.push(data.title),
    },
    authApi: {
      wechatLogin: async (code, channel, options) => {
        calls.login.push({ code, channel, options })
        return scenario.successfulLogin
          ? { success: true, data: { token: 'synthetic-rebu-session', user: { id: 'synthetic-user' } } }
          : { success: false, message: '合成服务端拒绝' }
      },
      bindWechat: async (code, channel) => { calls.bind.push({ code, channel }); return { success: scenario.bindAccepted !== false } },
    },
    startH5WechatLogin: async () => { calls.oauth += 1 },
    clearAuthSession: () => { calls.cleared += 1 },
    setToken: () => { calls.tokenWrites += 1 }, setRefreshToken: () => {}, setUserInfo: () => {},
    goAfterLogin: async () => { calls.returned += 1 },
  }
  if (platform === 'h5') ctx.window = {}
  vm.createContext(ctx)
  vm.runInContext(js, ctx)
  return { ctx, calls }
}

const cases = []
const check = async (name, body) => {
  try { await body(); cases.push({ name, passed: true }) }
  catch (error) { cases.push({ name, passed: false, error: error.message }) }
}
async function main() {
  await check('APP实际登录入口取得授权code后交服务端，关闭loading', async () => {
    const { ctx, calls } = load('app'); await ctx.handleThirdParty('wechat')
    assert.equal(calls.sdk.length, 1); assert.equal(calls.sdk[0].onlyAuthorize, true)
    assert.equal(calls.sdk[0].provider, 'weixin'); assert.equal(calls.login.length, 1)
    assert.equal(calls.login[0].code, 'synthetic-wechat-code'); assert.equal(calls.login[0].channel, 'app')
    assert.equal(ctx.isLoading.value, false)
  })
  await check('小程序仍使用原生code，不混入APP仅授权参数', async () => {
    const { ctx, calls } = load('mp-weixin'); await ctx.handleThirdParty('wechat')
    assert.equal(calls.sdk[0].onlyAuthorize, undefined); assert.equal(calls.login[0].channel, 'miniprogram')
    assert.equal(calls.login[0].code, 'synthetic-wechat-code')
  })
  await check('H5仍走现有公众号OAuth，不调用原生SDK', async () => {
    const { ctx, calls } = load('h5'); await ctx.handleThirdParty('wechat')
    assert.equal(calls.oauth, 1); assert.equal(calls.sdk.length, 0); assert.equal(calls.login.length, 0)
  })
  await check('APP已有登录后关联微信入口传app临时code', async () => {
    const { ctx, calls } = load('app'); assert.equal(await ctx.bindCurrentWechatIdentity(), true)
    assert.equal(calls.bind[0].channel, 'app'); assert.equal(calls.bind[0].code, 'synthetic-wechat-code')
  })
  await check('小程序已有登录后关联入口保留小程序身份', async () => {
    const { ctx, calls } = load('mp-weixin'); assert.equal(await ctx.bindCurrentWechatIdentity(), true)
    assert.equal(calls.bind[0].channel, 'miniprogram')
  })
  await check('取消授权不触发关联接口，也不清当前会话', async () => {
    const { ctx, calls } = load('app', { cancel: true }); assert.equal(await ctx.bindCurrentWechatIdentity(), false)
    assert.equal(calls.bind.length, 0); assert.equal(calls.cleared, 0); assert.equal(calls.tokenWrites, 0)
  })
  await check('SDK仅返回authResult时拒绝假造code', async () => {
    const { ctx, calls } = load('app', { authResultOnly: true }); assert.equal(await ctx.bindCurrentWechatIdentity(), false)
    assert.equal(calls.bind.length, 0)
  })
  await check('空白code不发送服务端', async () => {
    const { ctx, calls } = load('app', { code: '   ' }); assert.equal(await ctx.bindCurrentWechatIdentity(), false)
    assert.equal(calls.bind.length, 0)
  })
  await check('非字符串code不发送服务端', async () => {
    const { ctx, calls } = load('app', { code: 42 }); assert.equal(await ctx.bindCurrentWechatIdentity(), false)
    assert.equal(calls.bind.length, 0)
  })
  await check('服务端拒绝关联归属时不走登录替换当前账号', async () => {
    const { ctx, calls } = load('app', { bindAccepted: false }); assert.equal(await ctx.bindCurrentWechatIdentity(), false)
    assert.equal(calls.bind.length, 1); assert.equal(calls.login.length, 0)
    assert.equal(calls.cleared, 0); assert.equal(calls.tokenWrites, 0)
  })
  await check('协议未同意不主动拉起授权', async () => {
    const { ctx, calls } = load('app', { agreed: false }); await ctx.handleThirdParty('wechat')
    assert.equal(calls.sdk.length, 0); assert.equal(calls.login.length, 0)
  })
  await check('已有登录请求时不重复拉起授权', async () => {
    const { ctx, calls } = load('app', { loading: true }); await ctx.handleThirdParty('wechat')
    assert.equal(calls.sdk.length, 0); assert.equal(calls.login.length, 0)
  })
  await check('APP登录成功只返回原旅程一次', async () => {
    const { ctx, calls } = load('app', { successfulLogin: true }); await ctx.handleThirdParty('wechat')
    assert.equal(calls.login.length, 1); assert.equal(calls.tokenWrites, 1); assert.equal(calls.returned, 1)
    assert.equal(ctx.isLoading.value, false)
  })
  await check('关联成功不清当前登录态，不写登录token', async () => {
    const { ctx, calls } = load('app'); assert.equal(await ctx.bindCurrentWechatIdentity(), true)
    assert.equal(calls.cleared, 0); assert.equal(calls.tokenWrites, 0); assert.equal(calls.returned, 0)
  })
  const record = { sourceFile: 'apps/mobile/src/pkg-auth/login/index.vue', cases, passed: cases.filter(c => c.passed).length, failed: cases.filter(c => !c.passed).length, realWechat: false, realPhone: false, scope: '实际页面函数与实际SDK条件编译，微信供应商为合成契约；不代表原生包或真机验收' }
  const flag = process.argv.indexOf('--result')
  if (flag >= 0) fs.writeFileSync(path.resolve(process.argv[flag + 1]), JSON.stringify(record, null, 2) + '\n')
  process.stdout.write(JSON.stringify({ passed: record.passed, failed: record.failed, failedCases: cases.filter(c => !c.passed).map(c => c.name), realWechat: false }) + '\n')
  if (record.failed) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
