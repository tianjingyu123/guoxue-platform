import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url), ts = require('../../apps/mobile/node_modules/typescript')
const source = readFileSync(new URL('../../apps/mobile/src/pkg-video/publish/index.vue', import.meta.url), 'utf8')
const functions = source.slice(source.indexOf('const checkingPermission ='), source.indexOf('const coverPreview'))
  + source.slice(source.indexOf('async function handlePublish()'), source.indexOf('</script>'))
function harness(check = async () => true, upload = async () => 'synthetic-video') {
  const ref = value => ({ value }), writes = [], uploads = [], exports = {}
  const state = Object.fromEntries(Object.entries({ uploading: false, submitting: false, selectedCircle: { id: 'circle' },
    showPublishGuide: false, visibility: 'CIRCLE_ONLY', videoError: false, titleError: '', videoTempPath: 'synthetic-local',
    title: '测试视频', scrollTarget: '', uploadProgress: 0, coverUploadedUrl: 'synthetic-cover', coverTempPath: '',
    description: '', videoDuration: 1, tags: [], isPublic: true, selectedProduct: null }).map(([k, v]) => [k, ref(v)]))
  const code = ts.transpileModule(functions + '\nexports.run=handlePublish;exports.hide=invalidatePublication;', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(code, { exports, ref, ...state, onShow() {}, onHide() {}, onUnload() {},
    checkVideoPublishPermission: check, uploadVideo: async (...args) => { uploads.push(args); return upload() },
    videoApi: { publish: async dto => { writes.push(dto) } }, uni: { showToast() {} }, setTimeout: fn => fn(), navigateTo() {},
  })
  return { ...exports, ...state, writes, uploads }
}
test('仅本圈资格拒绝时零上传零发布', async () => {
  const h = harness(async () => false); await h.run()
  assert.equal(h.uploads.length, 0); assert.equal(h.writes.length, 0); assert.equal(h.showPublishGuide.value, true)
})
test('获准的仅本圈发布绑定核验圈子', async () => {
  const h = harness(); await h.run()
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].circleId, 'circle')
})
test('资格查询中重复点击不重查，切圈使原请求失效', async () => {
  let resolve, count = 0
  const h = harness(() => { count++; return new Promise(done => { resolve = done }) })
  const pending = h.run(); await h.run(); h.selectedCircle.value = { id: 'other' }; resolve(true); await pending
  assert.equal(count, 1); assert.equal(h.uploads.length, 0)
})
test('离开页面后迟到的资格拒绝不弹面板', async () => {
  let resolve
  const h = harness(() => new Promise(done => { resolve = done }))
  const pending = h.run(); h.hide(); resolve(false); await pending
  assert.equal(h.showPublishGuide.value, false); assert.equal(h.uploads.length, 0)
})
test('视频上传期间切圈或离开页面不继续发布', async () => {
  for (const change of [h => { h.selectedCircle.value = { id: 'other' } }, h => h.hide()]) {
    let resolve
    const h = harness(async () => true, () => new Promise(done => { resolve = done }))
    const pending = h.run(); await new Promise(done => setImmediate(done)); change(h); resolve('synthetic-video'); await pending
    assert.equal(h.writes.length, 0); assert.equal(h.submitting.value, false)
  }
})
