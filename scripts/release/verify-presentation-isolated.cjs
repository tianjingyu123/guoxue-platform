/** 本机专用 PostgreSQL → 实际配置服务/HTTP → 实际 Vue SFC DOM。SDK/认证适配明确为测试替身。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
if (process.argv[2] !== 'postgresql://channel_test@127.0.0.1:55449/channel_synthetic') throw new Error('只允许独立本机合成库');
process.env.DATABASE_URL = process.argv[2]; process.env.NODE_ENV = 'test'; process.env.CLIENT_CAPABILITY_ENVIRONMENT = 'test';
const serverRequire = createRequire(path.join(root, 'apps/server/package.json'));
const mobileRequire = createRequire(path.join(root, 'apps/mobile/package.json'));
const { PrismaClient } = serverRequire('@prisma/client');
const { ClientPresentationService } = require('../../apps/server/dist/modules/feature-flag/client-presentation.service');
const { FeatureFlagService } = require('../../apps/server/dist/modules/feature-flag/feature-flag.service');
const { FeatureFlagPublicController } = require('../../apps/server/dist/modules/feature-flag/feature-flag.controller');
const { DistributionService } = require('../../apps/server/dist/modules/system/distribution.service');
const { WgtControlService } = require('../../apps/server/dist/modules/system/wgt-control.service');
const { inRollout } = require('../../apps/server/dist/modules/system/distribution.util');
const { EMPTY_PRESENTATION, parseClientPresentation } = require('../../packages/shared/dist/client-presentation');
const ts = mobileRequire('typescript');
const { parse, compileScript } = createRequire(mobileRequire.resolve('vue'))('@vue/compiler-sfc');
const jsdomRequire = createRequire(path.join(root, 'node_modules/.pnpm/jest-environment-jsdom@27.5.1/node_modules/jest-environment-jsdom/package.json'));
const { JSDOM } = jsdomRequire('jsdom');
const dom = new JSDOM('<html><body><div id="new"></div><div id="old"></div><div id="blocks"></div><div id="navigation"></div></body></html>');
for (const name of ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'SVGElement', 'Node']) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
const vue = mobileRequire('vue');
async function run() {
 const prisma = new PrismaClient(); const passed = []; let server;
 const record = name => { passed.push(name); console.log('通过：' + name); };
 try {
  const [identity] = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS actor, inet_server_port() AS port');
  assert.deepEqual(identity, { db: 'channel_synthetic', actor: 'channel_test', port: 55449 });
  await prisma.configVersion.deleteMany({ where: { OR: [{ configKey: { startsWith: 'client_presentation:' } }, { configKey: { startsWith: 'client_capability:' } }] } });
  const scope = { applicationId: 'rebu', platform: 'android', channelId: 'google-play' };
  const registry = await prisma.appDistribution.findUnique({ where: { applicationId_platform_channelId: scope } });
  assert.ok(registry?.enabled); assert.equal(registry.wgtPolicy, 'DENIED');
  const presentation = new ClientPresentationService(prisma), distributions = new DistributionService(prisma);
  const redis = { getJson: async () => null, setJson: async () => {}, del: async () => {} };
  const features = new FeatureFlagService(prisma, redis, distributions);
  const ctrl = new FeatureFlagPublicController(features, { getUiConfig: async () => ({ home: { bigCardInterval: 6 }, agentCard: { categoryColors: {} } }), isMaintenanceMode: async () => false }, presentation);
  const actor = 'synthetic-phase3-admin';
  const capability = (channelId, nativeBuild, profileId) => ({ applicationId: 'rebu', platform: 'android', channelId, nativeBuild, minResourceVersion: '0', maxResourceVersion: '1', profileId, sourceSha: 'a'.repeat(40), installedPackageSha256: 'b'.repeat(64), verificationLevel: 'synthetic' });
  await presentation.registerCapabilities(capability('google-play', '253', 'legacy-v1'), actor, '旧能力集合合成登记');
  await presentation.registerCapabilities(capability('google-play', '254', 'presentation-v1'), actor, '新能力集合合成登记');
  await presentation.registerCapabilities(capability('xiaomi', '254', 'presentation-v1'), actor, '不同渠道同版本合成登记');
  await assert.rejects(presentation.registerCapabilities(capability('google-play', '254', 'presentation-v1'), actor, '重复登记'));
  process.env.CLIENT_CAPABILITY_ENVIRONMENT = 'production';
  await assert.rejects(presentation.registerCapabilities(capability('google-play', '999', 'presentation-v1'), actor, '非测试环境拒绝合成登记'));
  process.env.CLIENT_CAPABILITY_ENVIRONMENT = 'test';
  const rule = (id, config, more = {}) => ({ id, priority: 0, percentage: 100, ...scope, minNativeBuild: '253', maxNativeBuild: '254', minResourceVersion: '0', maxResourceVersion: '1', config, ...more });
  const config = { ...EMPTY_PRESENTATION, entries: [{ id: 'live', visible: false, order: 9 }, { id: 'agent', visible: true, order: 0, label: '学习助手' }, { id: 'course', visible: true, order: 1, label: '精选课程' }], navigation: [{ id: 'circle', visible: false, order: 1 }], homeChannels: ['hot', 'recommend'], pages: { home: [{ id: 'notice-first', type: 'notice', title: '本周学习计划', text: '包内组件更新，无需下载代码', entries: [] }, { id: 'links-next', type: 'entry-grid', title: '精选服务', text: '', entries: ['agent', 'course'], columns: 3 }], course: [{ id: 'course-notice', type: 'richtext', title: '课程服务', text: '已购内容继续阅读', entries: [] }] } };
  const payload = { schemaVersion: 1, rules: [rule('base', EMPTY_PRESENTATION), rule('google-new', config, { priority: 10 }), rule('xiaomi-default', EMPTY_PRESENTATION, { channelId: 'xiaomi' }), rule('resource-one', EMPTY_PRESENTATION, { priority: 20, minResourceVersion: '1' })] };
  config.pages.home.push({ id: 'home-cover', type: 'banner', title: '本周封面', text: '', entries: [], imagePath: '/assets/operations/home.png', targetEntryId: 'course' });
  for (const surface of ['discover', 'live', 'shop', 'circle', 'agent']) config.pages[surface] = [{ id: surface + '-notice', type: 'notice', title: surface + '运营公告', text: '', entries: [] }];
  const first = await presentation.saveDraft({ schemaVersion: 1, rules: [] }, '建立空配置基线', actor); await presentation.publish(first.id, actor, '发布空配置基线');
  const draft = await presentation.saveDraft(payload, 'Google Play 关闭 WGT 的运营验证', actor);
  assert.equal((await presentation.client(scope, '254', 'presentation-v1')).config, null);
  const preview = await presentation.preview(draft.id, scope, '254'); assert.equal(preview.ruleId, 'google-new'); assert.deepEqual(preview.matchingRuleIds, ['google-new', 'base']);
  await presentation.publish(draft.id, actor, '发布声明式运营');
  const current = await presentation.client(scope, '254', 'presentation-v1'); assert.equal(current.ruleId, 'google-new');
  assert.equal((await presentation.client(scope, '253', 'presentation-v1')).config, null);
  assert.equal((await presentation.client({ ...scope, channelId: 'xiaomi' }, '254', 'presentation-v1')).ruleId, 'xiaomi-default');
  assert.equal((await presentation.client(scope, '254', 'presentation-v1', '1')).ruleId, 'resource-one');
  assert.equal((await presentation.client(scope, '254', '')).config, null);
  assert.equal((await presentation.client(scope, '255', 'presentation-v1')).config, null);
  record('草稿不生效；新旧能力、同渠道不同版本、不同渠道同版本、资源版本和重叠优先级隔离');
  const stale = await presentation.saveDraft(payload, '过期草稿', actor); await presentation.rollback(1, actor, '回退空基线'); await assert.rejects(presentation.publish(stale.id, actor, '拒绝过期草稿')); await presentation.rollback(2, actor, '恢复运营配置');
  const gray = await presentation.saveDraft({ schemaVersion: 1, rules: [rule('gray-rule', config, { percentage: 0, priority: 100 }), rule('gray-fallback', EMPTY_PRESENTATION)] }, '灰度未命中验证', actor);
  const grayPreview = await presentation.preview(gray.id, scope, '254', '0', 'synthetic-user'); assert.equal(grayPreview.ruleId, 'gray-fallback'); assert.match(grayPreview.reasons.join(','), /未进入灰度/);
  record('回退及恢复追加版本与操作者；旧草稿不能覆盖；灰度未命中可解释回落');
  await assert.rejects(presentation.saveDraft({ ...payload, script: 'alert(1)' }, '坏配置', actor));
  await assert.rejects(presentation.saveDraft({ schemaVersion: 2, rules: [] }, '错schema', actor));
  const badConfig = { ...config, pages: { home: [{ id: 'bad', type: 'eval', text: 'alert(1)' }] } };
  await assert.rejects(presentation.saveDraft({ schemaVersion: 1, rules: [rule('invalid', badConfig)] }, '坏模块', actor));
  assert.equal(parseClientPresentation(badConfig, false).pages.home.length, 0);
  record('声明式协议拒绝脚本、错 schema 和未内置组件；客户端缺模块安全省略');
  server = http.createServer(async (req, res) => {
   try { if (req.url !== '/config/client') { res.writeHead(404).end(); return; } const syntheticUser = req.headers['x-test-synthetic-user']; const body = await ctrl.getClientConfig({ headers: req.headers, user: typeof syntheticUser === 'string' && /^synthetic-[a-z0-9-]+$/.test(syntheticUser) ? { id: syntheticUser } : undefined }); res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); } catch { res.writeHead(500).end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port, cache = new Map(), requests = [], timers = new Set(); let now = Date.now(), network = true;
  const FakeDate = class extends Date { static now() { return now; } };
  const env = { VITE_APP_CLIENT_KEY: registry.clientKey, VITE_APP_APPLICATION_ID: 'rebu', VITE_APP_CHANNEL_ID: 'google-play', VITE_API_URL: 'http://127.0.0.1:' + port, VITE_PUBLIC_ASSET_ORIGIN: 'https://api.rebugx.cn' };
  const uni = { getStorageSync: key => cache.get(key) || '', setStorageSync: (key, value) => cache.set(key, value), removeStorageSync: key => cache.delete(key), getStorageInfoSync: () => ({ keys: [...cache.keys()] }), getAppBaseInfo: () => ({ appVersionCode: '254' }), showToast: () => {}, $on: () => {}, $off: () => {}, $emit: () => {} };
  const modules = new Map(), sandbox = { uni, console, __importMeta: { env }, Date: FakeDate, getCurrentPages: () => [{}], setTimeout: (fn, delay) => { const id = setTimeout(fn, delay); id.unref(); timers.add(id); return id; }, clearTimeout };
  function load(file, old = false) {
   if (!/\.(ts|vue)$/.test(file)) file += '.ts';
   const key = file + (old ? ':old' : ''); if (modules.has(key)) return modules.get(key);
   const exports = {}; modules.set(key, exports);
   let source = old ? execFileSync('git', ['show', '17f710c00:' + 'apps/mobile/src/' + file], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(path.join(root, 'apps/mobile/src', file), 'utf8');
   if (file.endsWith('.vue')) {
    source = source.replace(/\/\/ #ifdef APP-PLUS[\s\S]*?\/\/ #endif/g, '').replace(/<!-- #ifdef APP-PLUS -->[\s\S]*?<!-- #endif -->/g, '');
    const descriptor = parse(source).descriptor;
    source = compileScript(descriptor, { id: key, inlineTemplate: true, templateOptions: { compilerOptions: { isCustomElement: tag => ['view', 'text', 'image', 'scroll-view', 'swiper', 'swiper-item'].includes(tag) } } }).content;
   }
   source = source.replaceAll('import.meta', '__importMeta');
   const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
   vm.runInNewContext(compiled, { ...sandbox, exports, require: name => {
    if (name === 'vue') return vue;
    if (name === '@guoxue/shared') return require('../../packages/shared/dist');
    if (name === '@dcloudio/uni-app') return { onShow: () => {}, onHide: () => {} };
    if (name === '@/utils/request') return { apiGetOptionalAuth: async () => { if (!network) throw new Error('离线'); const headers = load('lib/app-distribution.ts').distributionHeaders(); const identity = load('utils/storage.ts').getUserInfo()?.id; if (identity) headers['X-Test-Synthetic-User'] = identity; requests.push({ url: '/config/client', headers }); return (await fetch('http://127.0.0.1:' + port + '/config/client', { headers })).json(); } };
    if (name === '@/utils/router') return { navigateTo: () => {}, redirectTo: () => {} };
    if (name === '@/lib/discover-data') return { coreEntries: require('../../packages/shared/dist/client-presentation').PRESENTATION_ENTRIES };
    if (name === '@/components/common/smart-cover.vue') return { default: { render: () => null } };
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('.')) { let child = path.posix.normalize(path.posix.join(path.posix.dirname(file), name)); if (!/\.(ts|vue)$/.test(child)) child += '.ts'; return load(child); }
    throw new Error('未声明测试适配：' + name);
   } });
   return exports;
  }
  const remote = load('lib/remote-config.ts'); await remote.hydrateRemoteConfig(true);
  const core = load('components/navigation/core-entry-grid.vue').default;
  const oldCore = load('components/navigation/core-entry-grid.vue', true).default;
  const panel = load('components/layout/operations-panel.vue').default;
  const navigation = load('components/bottom-nav/bottom-nav.vue').default;
  const newApp = vue.createApp(core), oldApp = vue.createApp(oldCore), blocksApp = vue.createApp(panel, { surface: 'home' }), navApp = vue.createApp(navigation, { active: 'home' });
  for (const app of [newApp, oldApp, blocksApp, navApp]) {
   app.config.warnHandler = warning => { if (!warning.startsWith('Do not use built-in or reserved HTML elements')) throw new Error('Vue 验证出现未知警告：' + warning); };
   for (const tag of ['view', 'text', 'image', 'scroll-view', 'swiper', 'swiper-item']) app.component(tag, { setup(_, context) { return () => vue.h(tag === 'image' ? 'img' : 'div', context.attrs, context.slots.default?.()); } });
  }
  newApp.mount(document.getElementById('new')); oldApp.mount(document.getElementById('old')); blocksApp.mount(document.getElementById('blocks')); navApp.mount(document.getElementById('navigation'));
  await vue.nextTick();
  const labels = () => [...document.querySelectorAll('#new .core-entry-label')].map(node => node.textContent);
  assert.equal(labels()[0], '学习助手'); assert.equal(labels()[1], '精选课程'); assert.ok(!labels().includes('直播'));
  assert.match(document.getElementById('old').textContent, /直播/); assert.match(document.getElementById('blocks').textContent, /本周学习计划/);
  const navLabels = () => [...document.querySelectorAll('.bottom-nav .nav-item')].map(node => node.getAttribute('aria-label'));
  assert.deepEqual(navLabels(), ['首页', '工具', '发现', '我的']);
  assert.deepEqual(Array.from(load('lib/client-presentation.ts').getClientPresentation().homeChannels), ['hot', 'recommend']);
  assert.equal(document.querySelector('#blocks .blk-banner-img').getAttribute('src'), 'https://api.rebugx.cn/assets/operations/home.png');
  assert.match(document.getElementById('blocks').textContent, /本周封面/);
  const surfaceApps = [];
  for (const surface of ['discover', 'live', 'shop', 'course', 'circle', 'agent']) {
   const node = document.createElement('div'); node.id = surface + '-panel'; document.body.append(node);
   const app = vue.createApp(panel, { surface }); app.config.warnHandler = warning => { if (!warning.startsWith('Do not use built-in or reserved HTML elements')) throw new Error(warning); };
   for (const tag of ['view', 'text', 'image', 'scroll-view', 'swiper', 'swiper-item']) app.component(tag, { setup(_, context) { return () => vue.h(tag === 'image' ? 'img' : 'div', context.attrs, context.slots.default?.()); } });
   app.mount(node); surfaceApps.push(app);
   assert.match(node.textContent, surface === 'course' ? /已购内容继续阅读/ : /运营公告/);
  }
  const ordering = [...document.querySelectorAll('#blocks .blk-notice, #blocks .blk-kk')].map(node => node.className); assert.deepEqual(ordering, ['blk-notice', 'blk-kk']);
  await new WgtControlService(prisma).assertReady(registry).then(() => assert.fail('不能启用 WGT'), () => {});
  assert.ok(requests.every(request => request.url === '/config/client')); record('真实 PostgreSQL 配置经本机 HTTP 更新实际 Vue SFC DOM：入口显隐/文案/顺序/模块；旧 SFC 保留内置入口，Google Play WGT 仍关闭');
  await presentation.rollback(1, actor, '恢复默认入口'); await remote.hydrateRemoteConfig(true); await vue.nextTick(); assert.equal(labels()[0], '课程'); assert.ok(labels().includes('直播')); assert.equal(document.getElementById('blocks').textContent, ''); assert.ok(navLabels().includes('圈子'));
  await presentation.rollback(2, actor, '重新恢复运营配置'); await remote.hydrateRemoteConfig(true); await vue.nextTick(); assert.equal(labels()[0], '学习助手');
  record('同一已挂载客户端组件响应后台回退和恢复，无新代码请求');
  await features.upsert('shop_checkout', { enabled: true, operationState: 'READ_ONLY', changeReason: '合成只读' }, actor);
  await features.upsert('client_course_purchase', { enabled: true, operationState: 'MAINTENANCE', changeReason: '合成维护' }, actor);
  await remote.hydrateRemoteConfig(true); const operations = load('lib/operation-routes.ts');
  await vue.nextTick(); assert.match(document.getElementById('course-panel').textContent, /新业务维护中/);
  assert.equal(operations.isOperationRouteAllowed('/pkg-shop/checkout/index'), false);
  assert.equal(operations.isOperationRouteAllowed('/pkg-shop/orders/detail'), true);
  assert.equal(operations.isOperationRouteAllowed('/pkg-course/player/index'), true);
  assert.equal(operations.isOperationRequestAllowed('/courses/test/purchase', 'POST'), false);
  assert.equal(operations.isOperationRequestAllowed('/circles/test/join/confirm', 'POST'), true);
  assert.equal(operations.isOperationRequestAllowed('/shop/orders/test/refund', 'POST'), true);
  assert.equal(operations.isOperationRequestAllowed('/bots/test/chat', 'POST'), true);
  record('只读/维护关闭新业务，历史订单/退款/已购内容导航、已付款确认和续聊不被客户端开关取消');
  network = false; await remote.hydrateRemoteConfig(true); assert.equal(labels()[0], '学习助手'); now += 61000; assert.equal(remote.isClientFeatureEnabled('shop_checkout'), false); assert.equal(operations.isOperationRequestAllowed('/courses/test/purchase', 'POST'), false);
  network = true; await remote.hydrateRemoteConfig(true); await vue.nextTick(); assert.equal(labels()[0], '学习助手');
  const storage = load('utils/storage.ts'); storage.setToken('synthetic-account'); storage.setUserInfo({ id: 'synthetic-user' }); await remote.hydrateRemoteConfig(true); await vue.nextTick(); assert.equal(labels()[0], '学习助手');
  record('离线保留有效展示文案、写开关过期收窄，网络恢复及账号切换重新获取并更新组件');
  const grayConfig = { ...config, entries: config.entries.map(entry => entry.id === 'agent' ? { ...entry, label: '灰度学习助手' } : entry) };
  const bucketUsers = Array.from({ length: 100 }, (_, index) => 'synthetic-bucket-' + index);
  const accepted = bucketUsers.find(user => inRollout('client_presentation:v1:account-gray', user, 50)), rejected = bucketUsers.find(user => !inRollout('client_presentation:v1:account-gray', user, 50));
  assert.ok(accepted && rejected);
  const accountDraft = await presentation.saveDraft({ schemaVersion: 1, rules: [rule('account-gray', grayConfig, { percentage: 50, priority: 100 }), rule('account-default', config)] }, '合成账号灰度联调', actor); await presentation.publish(accountDraft.id, actor, '发布合成账号灰度');
  storage.setUserInfo({ id: accepted }); await remote.hydrateRemoteConfig(true); await vue.nextTick(); assert.equal(labels()[0], '灰度学习助手');
  storage.setUserInfo({ id: rejected }); await remote.hydrateRemoteConfig(true); await vue.nextTick(); assert.equal(labels()[0], '学习助手');
  record('同一 Vue 组件经 HTTP 按账号稳定灰度切换；本机认证注入是明确的合成适配');
  fs.mkdirSync(path.join(root, 'artifacts/presentation-verification'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts/presentation-verification/rendered-client.html'), dom.serialize());
  fs.writeFileSync(path.join(root, 'docs/operations/channel-updates-evidence/presentation.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts', 'tests'], { cwd: root, encoding: 'utf8' }).trim()), syntheticOnly: true, backend: '实际 Prisma/PostgreSQL 与服务/控制器；本机 HTTP 适配及合成账号认证', client: '实际 Vue SFC/RemoteConfig/DOM，JSDOM；SDK/原生元素、图像封面与路由执行适配是测试替身', surfaces: ['home', 'discover', 'live', 'shop', 'course', 'circle', 'agent'], wgtChannel: 'google-play', wgtEnabled: false, codeDownloads: 0, passed, limits: ['没有运行正式 DCloud 安装包', '权限/审计 HTTP 在独立 Jest 中验证', '历史权益保留验证为导航/请求准入，实际订单业务依赖仍须同版预发布验收'] }, null, 2) + '\n');
  newApp.unmount(); oldApp.unmount(); blocksApp.unmount(); navApp.unmount(); for (const app of surfaceApps) app.unmount(); for (const timer of timers) clearTimeout(timer);
 } finally { if (server) await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); dom.window.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
