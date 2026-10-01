/** 实际后台 Vue SFC 的渠道选择/草稿竞态；实际 Axios 解包；Element 控件、网络及权限为明确测试适配。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const adminRequire = createRequire(path.join(root, 'apps/admin/package.json'));
const jsdomRequire = createRequire(path.join(root, 'node_modules/.pnpm/jest-environment-jsdom@27.5.1/node_modules/jest-environment-jsdom/package.json'));
const { JSDOM } = jsdomRequire('jsdom');
const dom = new JSDOM('<html><body><main></main></body></html>');
for (const name of ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'SVGElement', 'Node']) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
const vue = adminRequire('vue');
const ts = adminRequire('typescript');
const { parse, compileScript } = createRequire(adminRequire.resolve('vue'))('@vue/compiler-sfc');
const clients = [
  { clientKey: 'synthetic-google', applicationId: 'rebu', platform: 'android', channelId: 'google-play', enabled: true },
  { clientKey: 'synthetic-xiaomi', applicationId: 'rebu', platform: 'android', channelId: 'xiaomi', enabled: true },
  { clientKey: 'synthetic-ios', applicationId: 'otherapp', platform: 'ios', channelId: 'app-store', enabled: true },
  { clientKey: 'synthetic-harmony', applicationId: 'rebu', platform: 'harmony', channelId: 'huawei', enabled: true },
  { clientKey: 'synthetic-disabled', applicationId: 'rebu', platform: 'android', channelId: 'oneplus', enabled: false },
];
const flush = async () => { await Promise.resolve(); await vue.nextTick(); await new Promise(resolve => setImmediate(resolve)); await vue.nextTick(); };
async function mount({ deferPreview = false } = {}) {
  const posts = [], messages = []; let finishPreview;
  // 运行实际 Axios 客户端及响应拦截器，只替换网络适配器；响应按服务端 envelope 契约返回。
  const apiExports = {};
  const apiSource = ts.transpileModule(fs.readFileSync(path.join(root, 'apps/admin/src/api/index.ts'), 'utf8').replaceAll('import.meta', '__importMeta'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(apiSource, { exports: apiExports, console, Date, setTimeout, __importMeta: { env: { BASE_URL: '/admin/' } }, localStorage: { getItem: () => '', setItem: () => {}, removeItem: () => {} }, require: name => {
    if (name === 'axios') return adminRequire('axios');
    if (name === 'vue') return vue;
    if (name === 'element-plus') return { ElMessage: { error: m => messages.push(m) }, ElNotification: () => {} };
    if (name === '@/utils/auth-session') return { clearAdminSession: () => {}, rememberAdminRedirect: () => {} };
    throw new Error('API 客户端未声明测试适配：' + name);
  } });
  const api = apiExports.api;
  const response = (config, data) => ({ data: { code: 200, data, message: 'ok' }, status: 200, statusText: 'OK', headers: {}, config });
  api.defaults.adapter = async config => {
    const url = config.url;
    if (config.method === 'post') {
      posts.push({ url, body: JSON.parse(config.data) });
      return response(config, { id: 'synthetic-draft' });
    }
    if (url === '/system/distributions') return response(config, clients);
    if (url.includes('/preview')) return deferPreview ? new Promise(resolve => { finishPreview = () => resolve(response(config, { config: { schemaVersion: 1 }, ruleId: 'old-channel' })); }) : response(config, { config: { schemaVersion: 1 }, ruleId: 'synthetic-match' });
    return response(config, []);
  };
  const descriptor = parse(fs.readFileSync(path.join(root, 'apps/admin/src/views/system/ClientPresentationPanel.vue'), 'utf8')).descriptor;
  const source = compileScript(descriptor, { id: 'admin-scope-proof', inlineTemplate: true }).content;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, console, Date, require: name => {
    if (name === 'vue') return vue;
    if (name === '@/api') return { api };
    if (name === '@/store/auth') return { useAuthStore: () => ({ hasRole: role => role === 'SUPER_ADMIN' }) };
    if (name === 'element-plus') return { ElMessage: { warning: m => messages.push(m), error: m => messages.push(m), success: () => {} }, ElMessageBox: { confirm: async () => {} } };
    if (name === '@guoxue/shared') return require('../../packages/shared/dist');
    throw new Error('未声明测试适配：' + name);
  } });
  const app = vue.createApp(exports.default);
  const wrapper = { setup: (_props, { slots }) => () => vue.h('section', [slots.header?.(), slots.default?.()]) };
  for (const name of ['el-card', 'el-form', 'el-divider', 'el-collapse', 'el-collapse-item']) app.component(name, wrapper);
  app.component('el-form-item', { props: ['label'], setup: (props, { slots }) => () => vue.h('label', [props.label, slots.default?.()]) });
  app.component('el-table-column', { setup: () => () => null });
  app.component('el-table', { setup: () => () => null });
  app.component('el-alert', { setup: () => () => null });
  app.component('el-button', { props: ['disabled', 'loading'], emits: ['click'], setup: (props, { slots, emit }) => () => vue.h('button', { disabled: props.disabled || props.loading, onClick: e => emit('click', e) }, slots.default?.()) });
  app.component('el-option', { props: ['label', 'value'], setup: props => () => vue.h('option', { value: props.value }, props.label) });
  app.component('el-select', { props: ['modelValue', 'multiple', 'placeholder'], emits: ['update:modelValue'], setup: (props, { slots, emit }) => () => vue.h('select', { value: props.modelValue, multiple: props.multiple, 'aria-label': props.placeholder, onChange: e => emit('update:modelValue', props.multiple ? [...e.target.selectedOptions].map(o => o.value) : typeof props.modelValue === 'number' ? Number(e.target.value) : e.target.value) }, slots.default?.()) });
  for (const name of ['el-input', 'el-input-number']) app.component(name, { props: ['modelValue', 'placeholder', 'type'], emits: ['update:modelValue'], setup: (props, { emit }) => () => vue.h(props.type === 'textarea' ? 'textarea' : 'input', { value: props.modelValue, placeholder: props.placeholder, onInput: e => emit('update:modelValue', name === 'el-input-number' ? Number(e.target.value) : e.target.value) }) });
  app.component('el-switch', { props: ['modelValue'], setup: props => () => vue.h('input', { type: 'checkbox', checked: props.modelValue }) });
  app.mount(document.querySelector('main')); await flush();
  const click = async text => { const button = [...document.querySelectorAll('button')].find(b => b.textContent === text); assert.ok(button, text); button.click(); await flush(); };
  const select = async (label, value) => { const node = document.querySelector('select[aria-label="' + label + '"]'); assert.ok(node); node.value = value; node.dispatchEvent(new dom.window.Event('change', { bubbles: true })); await flush(); };
  const reason = async value => { const node = document.querySelector('input[placeholder="变更理由，至少两个字"]'); node.value = value; node.dispatchEvent(new dom.window.Event('input', { bubbles: true })); await flush(); };
  return { app, posts, messages, click, select, reason, finish: () => finishPreview?.() };
}
test('实际后台表单：从 Android 切换 Apple 的应用/平台/渠道整体更新，新增华为 Harmony 规则互不覆盖，停用登记不提供选项', async () => {
  const screen = await mount();
  try {
    const previewOptions = [...document.querySelectorAll('select[aria-label="选择已登记的预览应用渠道"] option')];
    assert.equal(previewOptions.length, 4); assert.ok(previewOptions.some(o => /Apple App Store/.test(o.textContent))); assert.ok(!previewOptions.some(o => o.value === 'synthetic-disabled'));
    await screen.select('选择已登记的应用 / 平台 / 商店', 'synthetic-ios');
    await screen.reason('跨应用范围测试'); await screen.click('保存草稿并预览');
    assert.equal(screen.messages.length, 0);
    assert.equal([...document.querySelectorAll('button')].find(b => b.textContent === '发布已预览草稿').disabled, false);
    let rule = screen.posts.at(-1).body.payload.rules[0];
    assert.deepEqual([rule.applicationId, rule.platform, rule.channelId], ['otherapp', 'ios', 'app-store']);
    await screen.select('选择已登记的预览应用渠道', 'synthetic-harmony'); await screen.click('新增渠道规则'); await screen.click('保存草稿并预览');
    const rules = screen.posts.at(-1).body.payload.rules;
    assert.equal(rules.length, 2); assert.equal(rules[0].applicationId, 'otherapp'); assert.deepEqual([rules[1].platform, rules[1].channelId], ['harmony', 'huawei']);
    await screen.click('删除当前草稿规则'); await screen.click('保存草稿并预览'); assert.equal(screen.posts.at(-1).body.payload.rules.length, 1);
  } finally { screen.app.unmount(); }
});
test('跨渠道修改发生在预览在途时，迟到的旧渠道结果不能使发布按钮可用', async () => {
  const screen = await mount({ deferPreview: true });
  try {
    await screen.reason('渠道竞态验证'); await screen.click('保存草稿并预览');
    await screen.select('选择已登记的应用 / 平台 / 商店', 'synthetic-xiaomi');
    screen.finish(); await flush();
    const publish = [...document.querySelectorAll('button')].find(b => b.textContent === '发布已预览草稿');
    assert.equal(publish.disabled, true); assert.ok(![...document.querySelectorAll('pre')].some(node => node.textContent.includes('old-channel'))); assert.equal(screen.posts.length, 1);
  } finally { screen.app.unmount(); }
});
