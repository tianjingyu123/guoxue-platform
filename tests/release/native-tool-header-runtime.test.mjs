import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const mobileRequire = createRequire(resolve('apps/mobile/package.json'))
const vue = mobileRequire('vue')
const { parse, compileScript } = mobileRequire('vue/compiler-sfc')
const ts = mobileRequire('typescript')

function mount(props = {}) {
  const source = fs.readFileSync('apps/mobile/src/components/paipan/tool-header.vue', 'utf8')
  const { descriptor } = parse(source)
  const code = compileScript(descriptor, { id: 'test-tool-header' }).content
  const exports = {}; const navigation = []; const clipboard = []; const external = []
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports,
    require: name => name === 'vue' ? vue : name.endsWith('.vue') ? {} : { navigateTo: x => navigation.push(x), navigateBack: () => navigation.push('back') },
    getCurrentPages: () => [{}, {}],
    window: { location: { href: 'https://test.invalid/private?birth=synthetic' } },
    navigator: { share: x => { external.push(x); return Promise.resolve() } },
    uni: { setClipboardData: x => clipboard.push(x.data), showToast: () => {} },
  })
  const renderer = vue.createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, setText() {}, setElementText() {}, parentNode: () => null,
    nextSibling: () => null, patchProp() {},
  })
  const component = exports.default; component.render = () => null
  const app = renderer.createApp(component, { title: '合成私有工具', ...props }); app.mount({})
  return { state: app._instance.setupState, navigation, clipboard, external, close: () => app.unmount() }
}

test('真实Vue已声明事件：父级自定义返回/分享必须被识别，不能走默认分支', () => {
  let back = 0; let share = 0
  const p = mount({ onBack: () => back++, onShare: () => share++ })
  try {
    p.state.handleBack(); p.state.handleShare()
    assert.equal(back, 1); assert.equal(share, 1)
    assert.deepEqual(p.navigation, []); assert.deepEqual(p.external, []); assert.deepEqual(p.clipboard, [])
  } finally { p.close() }
})
test('没有自定义处理器时返回仍正常，私有顶栏不得默认分享当前地址', () => {
  const p = mount()
  try {
    p.state.handleBack(); p.state.handleShare()
    assert.deepEqual(p.navigation, ['back']); assert.deepEqual(p.external, []); assert.deepEqual(p.clipboard, [])
  } finally { p.close() }
})
