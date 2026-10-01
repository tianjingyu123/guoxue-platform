import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { createVisiblePoller } from '../../apps/mobile/src/utils/visible-poller.ts'

const settle = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const response = (id, unread = 1) => ({ list: [{ id, type: 'system', isRead: false, link: '/pkg-course/detail/index?id=course' }], unreadCounts: { system: unread, total: unread } })

// 执行真实页面脚本，仅替换生命周期和网络；不用用户账号或实际通知数据。
function runtime(overrides = {}) {
 const hooks = {}, listeners = new Set(), toasts = []
 let revision = 0, token = 'synthetic-token', user = { id: 'account-a' }
 const source = fs.readFileSync(new URL('../../apps/mobile/src/pkg-im/im/messages/index.vue', import.meta.url), 'utf8')
  .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
 const imApi = { getMessages: async () => response('first'), markNotifyRead: async () => {}, markAllNotifyRead: async () => {}, ...overrides }
 const page = vm.runInNewContext(stripTypeScriptTypes(`${source}\n;({messages, counts, loading, error, marking, loadData, onMessageTap, markAllRead})`), {
  ref: value => ({ value }), computed: get => ({ get value() { return get() } }), imApi,
  onMounted: fn => { hooks.mount = fn }, onShow: fn => { hooks.show = fn }, onHide: fn => { hooks.hide = fn },
  onUnload: fn => { hooks.unload = fn }, onUnmounted: fn => { hooks.unmount = fn },
  getAuthContextRevision: () => revision, getToken: () => token, getUserInfo: () => user,
  subscribeAuthContext: fn => { listeners.add(fn); return () => listeners.delete(fn) }, createVisiblePoller,
  getMiniProgramMenuSafeRight: () => 90,
  uni: { getSystemInfoSync: () => ({ statusBarHeight: 0 }), showToast: value => toasts.push(value.title) },
  goBack: () => {}, navigateTo: () => {},
 })
 return { page, hooks, imApi, listeners, toasts, changeAccount(id) { user = id ? { id } : null; token = id ? 'synthetic-' + id : ''; revision++; for (const fn of listeners) fn() } }
}

test('返回消息中心立即刷新，后台时停止请求', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); let calls = 0
 const r = runtime({ getMessages: async () => response('message-' + ++calls) }); t.after(() => r.hooks.unmount?.())
 r.hooks.mount(); await settle(); assert.equal(calls, 1)
 assert.equal(typeof r.hooks.hide, 'function'); r.hooks.hide(); t.mock.timers.tick(60000); await settle(); assert.equal(calls, 1)
 r.hooks.show(); await settle(); assert.equal(r.page.messages.value[0].id, 'message-2')
})

test('刷新失败保留已有通知，首次失败可重试', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); const r = runtime(); t.after(() => r.hooks.unmount?.())
 r.hooks.mount(); await settle(); r.imApi.getMessages = async () => { throw Error('合成断网') }
 r.page.loadData(); await settle(); assert.equal(r.page.messages.value[0].id, 'first'); assert.equal(r.page.error.value, '')
})

test('切换账号立刻清空旧通知，迟到响应不能串入新账号', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); const old = deferred(); let calls = 0
 const r = runtime({ getMessages: () => ++calls === 1 ? old.promise : Promise.resolve(response('account-b-message')) }); t.after(() => r.hooks.unmount?.())
 r.hooks.mount(); r.changeAccount('account-b'); assert.equal(r.page.messages.value.length, 0); assert.equal(r.page.counts.value.total || 0, 0)
 old.resolve(response('account-a-private')); await settle(); assert.equal(r.page.messages.value[0]?.id, 'account-b-message')
})

test('全部已读后的旧列表响应不能复活未读，失败不谎报成功', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); const r = runtime(); t.after(() => r.hooks.unmount?.())
 r.hooks.mount(); await settle(); const stale = deferred(); r.imApi.getMessages = () => stale.promise; r.page.loadData()
 await r.page.markAllRead()
 r.imApi.getMessages = async () => { const current = response('first', 0); current.list[0].isRead = true; return current }
 stale.resolve(response('first', 8)); await settle()
 assert.equal(r.page.counts.value.total, 0); assert.equal(r.page.messages.value[0].isRead, true)
 r.imApi.markAllNotifyRead = async () => { throw Error('合成写入失败') }; await r.page.markAllRead()
 assert.equal(r.toasts.filter(x => x === '已全部标为已读').length, 1); assert(r.toasts.includes('合成写入失败'))
})

test('切换账号后旧全部已读结果不能改新账号计数或弹成功提示', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); const write = deferred(); const r = runtime({ markAllNotifyRead: () => write.promise }); t.after(() => r.hooks.unmount?.())
 r.hooks.mount(); await settle(); const marking = r.page.markAllRead(); r.imApi.getMessages = async () => response('new-account', 3); r.changeAccount('account-b')
 await settle(); write.resolve(); await marking; assert.equal(r.page.counts.value.total, 3); assert(!r.toasts.includes('已全部标为已读'))
})

test('首次加载失败显示重试，恢复后展示本人真实列表', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); const r = runtime({ getMessages: async () => { throw Error('合成断网') } }); t.after(() => r.hooks.unmount?.())
 r.hooks.mount(); await settle(); assert.equal(r.page.error.value, '合成断网'); assert.equal(r.page.loading.value, false)
 r.imApi.getMessages = async () => response('recovered'); r.page.loadData(); await settle()
 assert.equal(r.page.error.value, ''); assert.equal(r.page.messages.value[0].id, 'recovered')
})

test('隐藏后的迟到列表不能覆盖页面，单条已读失败可重新同步', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); const r = runtime(); t.after(() => r.hooks.unmount?.())
 r.hooks.mount(); await settle(); const late = deferred(); r.imApi.getMessages = () => late.promise; r.page.loadData()
 r.hooks.hide(); late.resolve(response('hidden-result')); await settle(); assert.equal(r.page.messages.value[0].id, 'first')
 r.imApi.getMessages = async () => response('first'); r.hooks.show(); await settle()
 r.imApi.markNotifyRead = async () => { throw Error('合成写入失败') }; r.page.onMessageTap(r.page.messages.value[0]); await settle()
 assert.equal(r.page.counts.value.total, 1); assert.equal(r.page.messages.value[0].isRead, false)
})

test('卸载释放账号订阅，不再刷新通知', async t => {
 t.mock.timers.enable({ apis: ['setTimeout'] }); let calls = 0
 const r = runtime({ getMessages: async () => { calls++; return response('first') } }); r.hooks.mount(); await settle()
 assert.equal(r.listeners.size, 1); r.hooks.unload(); r.hooks.unmount(); assert.equal(r.listeners.size, 0)
 r.changeAccount('account-b'); t.mock.timers.tick(60000); await settle(); assert.equal(calls, 1)
})
