import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const ts = createRequire(resolve('apps/mobile/package.json'))('typescript')
const readPages = () => ts.parseConfigFileTextToJson('pages.json', fs.readFileSync('apps/mobile/src/pages.json', 'utf8')).config
function load(file, dependencies = {}, globals = {}, transform = value => value) {
  const exports = {}
  const source = transform(fs.readFileSync(file, 'utf8')).replaceAll('import.meta', '({env:{BASE_URL:"/h5/"}})')
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports, require: name => {
    if (name in dependencies) return dependencies[name]
    throw new Error(`缺少测试依赖 ${name}`)
  }, ...globals })
  return exports
}
const context = load('apps/mobile/src/lib/public-share-context.ts')

test('默认内容分享只保留公开定位和归因，丢弃认证/支付/回跳参数', () => {
  const result = context.publicShareContext('/pkg-course/detail/index', {
    id: 'course-1', ref: 'public-ref', token: 'synthetic', access_token: 'synthetic', Authorization: 'synthetic',
    code: 'oauth-code', redirect: 'https://outside.invalid', paymentToken: 'synthetic', phone: 'synthetic',
  })
  assert.equal(JSON.stringify(result), JSON.stringify({ route: 'pkg-course/detail/index', params: { id: 'course-1', ref: 'public-ref' } }))
})
test('未知、登录、支付和私有页面不会变成首页分享', () => {
  for (const route of ['', 'pkg-auth/login/index', 'pkg-workspace/report/index', '../pages/index/index', 'https://outside.invalid', 'pages/profile/index']) {
    assert.throws(() => context.publicShareContext(route), /未提供公开分享入口/)
  }
})
test('参数解码有界，分站公开code不等同OAuth code', () => {
  const query = context.parseShareQuery('?id=abc%20def&token=synthetic&broken=%ZZ&__proto__=bad&ref=a+b')
  const result = context.publicShareContext('pkg-circle/circles/detail', query)
  assert.equal(result.params.id, 'abc def')
  assert.equal(result.params.ref, 'a b')
  assert.equal(result.params.token, undefined)
  assert.equal(Object.keys(context.parseShareQuery(`?id=${'x'.repeat(8192)}`)).length, 0)
  assert.equal(context.publicShareContext('pkg-operator/station-home/index', { code: 'public-code' }).params.code, 'public-code')
  assert.equal(context.publicShareContext('pkg-course/detail/index', { id: 'c1', ref: '\nvalue' }).params.ref, undefined)
  assert.throws(() => context.publicShareContext('pkg-course/detail/index', { id: { secret: 'x' } }), /缺少公开分享内容定位/)
})

test('内容标识不可丢失，圈子动态和分站不能被分享成另一页面', () => {
  assert.throws(() => context.publicShareContext('pkg-course/detail/index', {}), /缺少公开分享内容定位/)
  assert.throws(() => context.publicShareContext('pkg-circle/circles/post', { id: 'p1' }), /缺少公开分享内容定位/)
  assert.throws(() => context.publicShareContext('pkg-operator/station-home/index', {}), /缺少公开分享内容定位/)
  assert.equal(context.publicShareContext('pkg-circle/circles/post', { id: 'p1', circleId: 'c1' }).params.circleId, 'c1')
  assert.equal(context.publicShareContext('pkg-operator/station-home/index', { s: 'public-station' }).params.s, 'public-station')
  assert.equal(context.publicShareContext('pkg-creator/teacher-profile/index', { userId: 'u1' }).params.userId, 'u1')
  assert.equal(context.publicShareContext('pkg-common/content/index', { slug: 'user-agreement' }).params.slug, 'user-agreement')
})
test('默认分享白名单中的路由都已注册，不产生不存在的落点', () => {
  const pages = readPages()
  const registered = new Set([...pages.pages.map(p => p.path), ...pages.subPackages.flatMap(g => g.pages.map(p => `${g.root}/${p.path}`))])
  const source = fs.readFileSync('apps/mobile/src/lib/public-share-context.ts', 'utf8').split('const PUBLIC_QUERY_KEYS')[0]
  for (const [, route] of source.matchAll(/'((?:pages|pkg-)[^']+)'/g)) assert.ok(registered.has(route), route)
})
test('H5默认分享重建当前路由，不发送整条浏览器凭据URL', () => {
  const api = load('apps/mobile/src/utils/share.ts', {
    '@/lib/brand': { BRAND: { h5Url: 'https://example.test/h5/' } }, '@/lib/public-share-context': context,
  }, {
    getCurrentPages: () => [],
    window: { location: { origin: 'https://example.test', pathname: '/h5/pkg-video/detail/index', search: '?id=v1&token=synthetic&code=oauth', href: 'never-copy-me' } },
  })
  assert.equal(api.getCurrentShareUrl(), 'https://example.test/h5/pkg-video/detail/index?id=v1')
  // 已由业务专用入口生成的分享授权令牌不一刀切删除；默认分享不生成它。
  assert.equal(api.buildH5Url('pkg-workspace/shared/index', { token: 'synthetic-public-grant' }), 'https://example.test/h5/pkg-workspace/shared/index?token=synthetic-public-grant')
})
test('用户取消App系统分享后不再写剪贴板或打开另一个分享', async () => {
  let copied = 0; let browserShared = 0
  const api = load('apps/mobile/src/utils/share.ts', {
    '@/lib/brand': { BRAND: { h5Url: 'https://example.test/h5/' } }, '@/lib/public-share-context': context,
  }, {
    plus: { share: { sendWithSystem: (_data, _ok, fail) => fail({ message: '用户取消分享' }) } },
    navigator: { share: () => { browserShared++; return Promise.resolve() } },
    uni: { setClipboardData: () => copied++, showToast() {} },
  })
  assert.equal(await api.shareLink({ url: 'https://example.test/h5/pkg-video/detail/index?id=v1' }), false)
  assert.equal(copied, 0); assert.equal(browserShared, 0)
})
test('渠道不可用仍可走系统兜底，错误不混同用户取消', () => {
  assert.equal(context.isShareCancelled({ errMsg: 'share:fail cancel' }), true)
  assert.equal(context.isShareCancelled({ name: 'AbortError' }), true)
  assert.equal(context.isShareCancelled({ message: 'weixin not installed' }), false)
})

test('分享面板直接复用真实适配器，失败与取消都不重复调用系统分享', async () => {
  for (const cancelled of [false, true]) {
    let systemCalls = 0; let copied = 0; let closed = 0
    const globals = {
      plus: { share: { sendWithSystem: (_data, _ok, fail) => { systemCalls++; fail({ message: cancelled ? '用户取消分享' : '系统分享不可用' }) } } },
      uni: { setClipboardData: options => { copied++; options.success() }, showToast() {} },
    }
    const api = load('apps/mobile/src/utils/share.ts', {
      '@/lib/brand': { BRAND: { h5Url: 'https://example.test/h5/' } }, '@/lib/public-share-context': context,
    }, globals)
    const sheet = load('apps/mobile/src/components/common/content-share-sheet.vue', {
      vue: { computed: fn => ({ get value() { return fn() } }) },
      '@/components/common/app-icon.vue': {},
      '@/composables/use-overlay-scroll-lock': { useOverlayScrollLock() {} },
      '@/utils/share': api, '@/lib/public-share-context': context,
    }, {
      ...globals,
      defineProps: () => ({ title: '文章', url: 'https://example.test/h5/pkg-circle/articles/detail?id=a1' }),
      withDefaults: (props, defaults) => ({ ...defaults, ...props }),
      defineEmits: () => () => closed++,
    }, source => `${source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]}\nexport { shareMore }`)
    await sheet.shareMore()
    assert.equal(systemCalls, 1)
    assert.equal(copied, cancelled ? 0 : 1)
    assert.equal(closed, cancelled ? 0 : 1)
  }
})
test('小程序公开分享服务使用的路由都与实际客户端一致', () => {
  const pages = readPages()
  const registered = new Set(pages.subPackages.flatMap(g => g.pages.map(p => `/${g.root}/${p.path}`)))
  const source = fs.readFileSync('apps/server/src/modules/mini/mini.service.ts', 'utf8')
  for (const [, route] of source.matchAll(/(?:ARTICLE|COURSE|PRODUCT): "([^"]+)"/g)) assert.ok(registered.has(route), route)
})
