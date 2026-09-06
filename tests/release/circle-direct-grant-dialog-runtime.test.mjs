import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'

const require = createRequire(resolve('apps/admin/package.json'))
const ts = require('typescript'), vue = require('vue')
const compile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
function setup(t) {
  let now = Date.parse('2026-09-06T00:00:00Z')
  class Clock extends Date { static now() { return now } }
  const sessionExports = {}
  vm.runInNewContext(compile(fs.readFileSync('apps/admin/src/lib/circle-direct-grant-session.ts', 'utf8')), { exports: sessionExports, Date: Clock, Error })
  const props = vue.reactive({ modelValue: true }), emits = [], posts = [], warnings = []
  const api = {
    get: async (_url, { params }) => ({ data: { circleId: 'circle-a', capability: params.capability, subjectUserId: params.subjectUserId ?? null,
      circleName: '合成测试圈', subjectName: '合成成员', scope: params.subjectUserId ? 'PERSONAL' : 'CIRCLE', expectedLatestId: null, expectedLatestRevision: 0 } }),
    post: async (url, body) => { posts.push({ url, body }) },
  }
  const hooks = {}, exports = {}, scope = vue.effectScope()
  const source = fs.readFileSync('apps/admin/src/views/circles/CircleDirectGrantDialog.vue', 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
  scope.run(() => vm.runInNewContext(compile(source + '\nexport { form, context, confirmTarget, submit, saving, error };'), {
    exports, Date: Clock, Error, defineProps: () => props, defineEmits: () => (...args) => emits.push(args),
    require: name => {
      if (name === 'vue') return { ...vue, onBeforeUnmount: fn => { hooks.unmount = fn } }
      if (name === 'element-plus') return { ElMessage: { success: message => warnings.push(message), warning: message => warnings.push(message) } }
      if (name === '@/api') return { api, circleApi: {}, circleBackendApi: { adminCircles: async () => ({ data: { circles: [], total: 0 } }) } }
      if (name === '@/lib/circle-direct-grant-session') return sessionExports
      throw new Error(name)
    },
  }))
  t.after(() => scope.stop())
  Object.assign(exports.form, { circleId: 'circle-a', subjectUserId: 'member-a', reason: '战略伙伴合成验收', expiresAt: '2026-10-01T00:00:00Z', maxUnits: 10, maxConcurrent: 1 })
  return { ...exports, api, posts, emits, warnings, props, hooks, advance: milliseconds => { now += milliseconds } }
}

test('真实弹窗脚本确认后只提交一次，并绑定对象和最新修订', async t => {
  const s = setup(t)
  await s.confirmTarget()
  let finish
  s.api.post = async (url, body) => { s.posts.push({ url, body }); await new Promise(resolve => { finish = resolve }) }
  const first = s.submit(); await s.submit()
  assert.equal(s.posts.length, 1); assert.equal(s.saving.value, true)
  assert.equal(s.posts[0].body.subjectUserId, 'member-a'); assert.equal(s.posts[0].body.expectedLatestRevision, 0)
  finish(); await first
  assert.equal(s.emits.filter(([name]) => name === 'completed').length, 1)
  await s.submit(); assert.equal(s.posts.length, 1)
})

test('确认超时不发请求，重新核对后恢复', async t => {
  const s = setup(t); await s.confirmTarget(); s.advance(60001)
  await s.submit(); assert.equal(s.posts.length, 0); assert.equal(s.context.value, null)
  assert.match(s.error.value, /重新查询/)
  await s.confirmTarget(); await s.submit(); assert.equal(s.posts.length, 1)
})

test('失败与结果不明不自动重发，必须重新核对', async t => {
  const s = setup(t); await s.confirmTarget()
  s.api.post = async () => { s.posts.push({}); throw new Error('NETWORK') }
  await s.submit(); await s.submit()
  assert.equal(s.posts.length, 1); assert.equal(s.context.value, null)
  assert.match(s.error.value, /不会自动重复提交/)
})

test('切换授权对象后迟到确认不得恢复旧目标', async t => {
  const s = setup(t); let finish
  s.api.get = () => new Promise(resolve => { finish = resolve })
  const pending = s.confirmTarget(); s.form.subjectUserId = 'member-b'
  finish({ data: { circleId: 'circle-a', capability: 'SHORT_VIDEO', subjectUserId: 'member-a', scope: 'PERSONAL', circleName: '圈', subjectName: '成员', expectedLatestRevision: 0 } })
  await pending; await s.submit()
  assert.equal(s.context.value, null); assert.equal(s.posts.length, 0)
})

test('不接受错误范围、空显示名或不一致修订的确认响应', async t => {
  for (const patch of [{ scope: 'CIRCLE' }, { circleName: '' }, { expectedLatestRevision: 3 }, { expectedLatestRevision: -1 }]) {
    const s = setup(t), original = s.api.get
    s.api.get = async (...args) => { const result = await original(...args); Object.assign(result.data, patch); return result }
    await s.confirmTarget(); await s.submit()
    assert.equal(s.context.value, null); assert.equal(s.posts.length, 0)
  }
})

test('组件卸载后迟到提交不触发新弹窗的成功提示和关闭', async t => {
  const s = setup(t); await s.confirmTarget(); let finish
  s.api.post = () => new Promise(resolve => { finish = resolve })
  const pending = s.submit(); s.hooks.unmount(); finish(); await pending
  assert.equal(s.emits.length, 0); assert.equal(s.warnings.length, 0)
})
