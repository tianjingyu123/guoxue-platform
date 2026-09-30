import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { createVisiblePoller } from '../../apps/mobile/src/utils/visible-poller.ts'

const settle = () => new Promise((resolve) => setImmediate(resolve))
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('慢请求不重叠；连续重试合并成一次后续刷新', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const first = deferred()
  let calls = 0
  const poller = createVisiblePoller(async () => { if (++calls === 1) await first.promise }, () => 3000)
  t.after(() => poller.dispose())
  poller.start(); poller.start(); poller.refresh(); poller.refresh()
  t.mock.timers.tick(9000)
  assert.equal(calls, 1)
  first.resolve(); await settle()
  assert.equal(calls, 2)
  t.mock.timers.tick(2999); assert.equal(calls, 2)
  t.mock.timers.tick(1); await settle(); assert.equal(calls, 3)
})

test('隐藏丢弃迟到响应；重新显示等待旧请求结束后刷新', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const first = deferred(); const applied = []; let calls = 0
  const poller = createVisiblePoller(async (isCurrent) => {
    const call = ++calls
    if (call === 1) await first.promise
    if (isCurrent()) applied.push(call)
  }, () => 3000)
  t.after(() => poller.dispose())
  poller.start(); poller.stop(); poller.start()
  assert.equal(calls, 1)
  first.resolve(); await settle()
  assert.deepEqual(applied, [2])
  poller.stop(); t.mock.timers.tick(9000); await settle()
  assert.equal(calls, 2)
})

test('失败后继续刷新；卸载后不能启动或应用响应', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let calls = 0; const late = deferred(); let applied = false
  const poller = createVisiblePoller(async (isCurrent) => {
    if (++calls === 1) throw Error('断网')
    await late.promise
    applied = isCurrent()
  }, () => 3000)
  poller.start(); await settle(); t.mock.timers.tick(3000)
  assert.equal(calls, 2)
  poller.dispose(); late.resolve(); await settle()
  poller.start(); poller.refresh(); t.mock.timers.tick(9000)
  assert.equal(calls, 2); assert.equal(applied, false)
})

// 执行实际 SFC 脚本，替换端框架与网络边界；不宣称模拟真实腾讯 SDK 或手机渲染。
function pageRuntime(kind, overrides = {}) {
  const hooks = {}; const handlers = new Set(); const staleHandlers = []
  let logins = 0
  const ref = (value) => ({ value })
  const computed = (get) => ({ get value() { return get() } })
  const source = fs.readFileSync(new URL(`../../apps/mobile/src/pkg-im/im/${kind}/index.vue`, import.meta.url), 'utf8')
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
  const fields = kind === 'chat' ? 'messages, imMode, permission, scrollAnchor, refreshPermission' : kind === 'group-chat' ? 'messages, groupDetail' : 'conversations'
  const imApi = {
    getCapabilities: async () => ({ mode: 'FALLBACK' }),
    getConversations: async () => [{ id: 'conv-1', unreadCount: 1 }],
    getC2CHistory: async () => ({ mode: 'FALLBACK', messages: [{ id: 'msg-1' }] }),
    markC2CRead: async () => {},
    getRelationPolicy: async () => ({ state: 'waiting_reply', canSend: false }),
    ...overrides,
  }
  const subscribe = (handler) => {
    handlers.add(handler); staleHandlers.push(handler)
    return () => handlers.delete(handler)
  }
  const context = {
    ref, computed, nextTick: async () => {}, createVisiblePoller,
    defineProps: () => ({ targetId: 'peer-1', groupId: 'group-1' }),
    onMounted: (fn) => { hooks.mount = fn }, onUnmounted: (fn) => { hooks.unmount = fn },
    onShow: (fn) => { hooks.show = fn }, onHide: (fn) => { hooks.hide = fn }, onUnload: (fn) => { hooks.unload = fn },
    uni: { getSystemInfoSync: () => ({ statusBarHeight: 0 }) },
    useTim: () => ({ onMessage: subscribe, onConversationsUpdated: subscribe, ensureLogin: async () => { logins++ } }),
    imApi, mineApi: { getBlacklist: async () => [] },
    toChatPermission: (policy) => policy, timToChatMessage: (item) => item, timToGroupChatMessage: (item) => item,
    timConvToConversationItem: (item) => item,
    goBack: () => {}, navigateTo: () => {},
  }
  const page = vm.runInNewContext(stripTypeScriptTypes(`${source}\n;({ loading, error, loadData, ${fields} })`), context)
  return { page, hooks, handlers, staleHandlers, imApi, get logins() { return logins } }
}

test('会话静默刷新、断网保留已有列表、隐藏停止和恢复', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const r = pageRuntime('conversations'); t.after(() => r.hooks.unmount())
  r.hooks.show(); r.hooks.mount(); await settle()
  assert.equal(r.page.loading.value, false); assert.equal(r.page.conversations.value.length, 1)
  const next = deferred(); r.imApi.getConversations = () => next.promise
  t.mock.timers.tick(3000); await settle()
  assert.equal(r.page.loading.value, false)
  r.hooks.hide(); next.resolve([{ id: '迟到', unreadCount: 7 }]); await settle()
  assert.equal(r.page.conversations.value[0].id, 'conv-1')
  r.imApi.getConversations = async () => { throw Error('断网') }
  r.hooks.show(); await settle()
  assert.equal(r.page.error.value, ''); assert.equal(r.page.conversations.value.length, 1)
})

test('会话能力切换只订阅一次，隐藏释放且旧回调无效', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const r = pageRuntime('conversations', { getCapabilities: async () => ({ mode: 'TENCENT' }) })
  t.after(() => r.hooks.unmount())
  r.hooks.mount(); await settle(); r.page.loadData(); await settle()
  assert.equal(r.handlers.size, 1)
  r.hooks.hide(); assert.equal(r.handlers.size, 0)
  r.hooks.show(); await settle()
  r.staleHandlers[0]([{ id: '旧事件', unreadCount: 9 }])
  assert.equal(r.page.conversations.value[0].id, 'conv-1')
  r.imApi.getCapabilities = async () => ({ mode: 'FALLBACK' })
  r.page.loadData(); await settle(); assert.equal(r.handlers.size, 0)
})

test('聊天重试不重复监听，切换消息源与 SDK 消息去重', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const r = pageRuntime('chat'); t.after(() => r.hooks.unmount())
  r.hooks.mount(); await settle()
  r.imApi.getC2CHistory = async () => ({ mode: 'TENCENT', messages: [{ id: '腾讯历史' }] })
  r.page.loadData(); await settle()
  assert.equal(r.page.imMode.value, 'TENCENT'); assert.equal(r.handlers.size, 1)
  r.page.loadData(); r.page.loadData(); await settle(); assert.equal(r.handlers.size, 1)
  const handler = [...r.handlers][0]
  const item = { id: 'sdk-1', conversationID: 'C2Cpeer-1', flow: 'in' }
  handler([item, item]); handler([item]); await settle()
  assert.equal(r.page.messages.value.length, 2)
  r.imApi.getC2CHistory = async () => ({ mode: 'FALLBACK', messages: [{ id: '过渡历史' }] })
  r.page.loadData(); await settle()
  assert.equal(r.handlers.size, 0); assert.equal(r.page.imMode.value, 'FALLBACK')
  handler([{ ...item, id: '过期SDK事件' }])
  assert.equal(r.page.messages.value.length, 1)
})

test('聊天收到回复后刷新发送权限，已读失败不阻断历史；无新消息不强制滚底', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const r = pageRuntime('chat', { markC2CRead: async () => { throw Error('已读失败') } })
  t.after(() => r.hooks.unmount())
  r.hooks.mount(); await settle()
  assert.equal(r.page.error.value, ''); assert.equal(r.page.messages.value.length, 1)
  r.page.scrollAnchor.value = '用户正在阅读历史'
  r.imApi.getRelationPolicy = async () => ({ state: 'replied', canSend: true })
  t.mock.timers.tick(3000); await settle()
  assert.equal(r.page.permission.value.canSend, true)
  assert.equal(r.page.scrollAnchor.value, '用户正在阅读历史')
})

test('聊天隐藏期间迟到历史不更新、不标已读；卸载后无后续请求', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const late = deferred(); let historyCalls = 0, readCalls = 0
  const r = pageRuntime('chat', {
    getC2CHistory: () => { historyCalls++; return late.promise },
    markC2CRead: async () => { readCalls++ },
  })
  r.hooks.mount(); await settle(); r.hooks.hide()
  late.resolve({ mode: 'TENCENT', messages: [{ id: '迟到历史' }] }); await settle()
  assert.equal(r.page.messages.value.length, 0); assert.equal(readCalls, 0)
  assert.equal(r.handlers.size, 0)
  r.hooks.unload(); r.hooks.unmount(); r.hooks.show(); t.mock.timers.tick(9000); await settle()
  assert.equal(historyCalls, 1)
})

test('初次网络失败后重试恢复，重复重试仅一次后续请求', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const r = pageRuntime('chat', { getCapabilities: async () => { throw Error('请求的接口不存在：/api/v1/im/capabilities') } })
  t.after(() => r.hooks.unmount())
  r.hooks.mount(); await settle()
  assert.equal(r.page.loading.value, false); assert.equal(r.page.error.value, '暂时无法连接消息服务，请稍后重试')
  const retry = deferred(); let calls = 0
  r.imApi.getCapabilities = async () => { calls++; return retry.promise }
  r.page.loadData(); r.page.loadData(); r.page.loadData(); await settle()
  assert.equal(calls, 1)
  retry.resolve({ mode: 'FALLBACK' }); await settle()
  assert.equal(calls, 2); assert.equal(r.page.error.value, '')
  assert.equal(r.page.loading.value, false)
})

test('权限请求乱序时旧结果不能覆盖新结果，隐藏后的结果也不应用', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const r = pageRuntime('chat'); t.after(() => r.hooks.unmount())
  r.hooks.mount(); await settle()
  const old = deferred(); const latest = deferred(); let calls = 0
  r.imApi.getRelationPolicy = () => ++calls === 1 ? old.promise : latest.promise
  const first = r.page.refreshPermission(); const second = r.page.refreshPermission()
  latest.resolve({ state: 'blocked', canSend: false }); await second
  old.resolve({ state: 'replied', canSend: true }); await first
  assert.equal(r.page.permission.value.canSend, false)
  const hidden = deferred(); r.imApi.getRelationPolicy = () => hidden.promise
  const third = r.page.refreshPermission(); r.hooks.hide()
  hidden.resolve({ state: 'replied', canSend: true }); await third
  assert.equal(r.page.permission.value.canSend, false)
})

test('群聊深链未开通时不登录 SDK；恢复能力后可重试且监听唯一', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let reads = 0
  const r = pageRuntime('group-chat', {
    getCapabilities: async () => ({ mode: 'FALLBACK', groups: false }),
    getGroupDetail: async () => { reads++; return { name: '受控群' } },
    getGroupMembers: async () => [],
    getGroupChatHistory: async () => ({ messages: [] }),
    markGroupRead: async () => {},
  })
  t.after(() => r.hooks.unmount())
  r.hooks.mount(); await settle()
  assert.match(r.page.error.value, /群聊服务暂未开通/); assert.equal(reads, 0)
  assert.equal(r.logins, 0)
  assert.equal(r.handlers.size, 0); assert.equal(r.page.loading.value, false)
  r.imApi.getCapabilities = async () => ({ mode: 'TENCENT', groups: true })
  r.page.loadData(); r.page.loadData(); await settle()
  assert.equal(r.page.error.value, ''); assert.equal(r.handlers.size, 1)
  assert.ok(r.logins > 0)
  r.hooks.hide(); assert.equal(r.handlers.size, 0)
  r.hooks.show(); await settle(); assert.equal(r.handlers.size, 1)
  r.imApi.getCapabilities = async () => ({ mode: 'FALLBACK', groups: false })
  r.page.loadData(); await settle()
  assert.match(r.page.error.value, /群聊服务暂未开通/); assert.equal(r.handlers.size, 0)
})
