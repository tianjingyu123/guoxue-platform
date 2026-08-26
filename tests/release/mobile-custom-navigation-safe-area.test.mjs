import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const repoRoot = path.resolve('.')
const mobileSource = path.join(repoRoot, 'apps/mobile/src')
const pagesSource = readFileSync(path.join(mobileSource, 'pages.json'), 'utf8')

function compilePages(appPlus) {
  const output = []
  const stack = []
  let active = true

  for (const line of pagesSource.split(/\r?\n/u)) {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef|else|endif)\b\s*(.*)$/u)
    if (!directive) {
      if (active) output.push(line)
      continue
    }
    const [, kind, expression] = directive
    if (kind === 'ifdef' || kind === 'ifndef') {
      assert.equal(expression.trim(), 'APP-PLUS', `安全区审计尚未支持条件标识 ${expression.trim()}`)
      const condition = kind === 'ifdef' ? appPlus : !appPlus
      stack.push({ parent: active, condition })
      active = active && condition
    } else if (kind === 'else') {
      const current = stack.at(-1)
      assert.ok(current, 'pages.json 的 #else 缺少起始分支')
      active = current.parent && !current.condition
    } else {
      const current = stack.pop()
      assert.ok(current, 'pages.json 的 #endif 缺少起始分支')
      active = current.parent
    }
  }
  assert.equal(stack.length, 0, 'pages.json 存在未闭合的条件分支')
  return JSON.parse(output.join('\n'))
}

function registeredPages() {
  const routes = new Map()
  for (const config of [compilePages(true), compilePages(false)]) {
    for (const page of config.pages || []) routes.set(page.path, page)
    for (const group of config.subPackages || []) {
      for (const page of group.pages || []) routes.set(`${group.root}/${page.path}`, page)
    }
  }
  return routes
}

function pageSource(route) {
  const base = path.join(mobileSource, route)
  const extension = ['.vue', '.nvue', '.uvue'].find((item) => existsSync(base + item))
  assert.ok(extension, `安全区审计找不到页面源码：${route}`)
  return readFileSync(base + extension, 'utf8')
}

const safeAreaEvidence = /<app-safe-area-top|<app-nav-bar|<app-header|<tool-header|<classics-header|--status-bar-height|safe-area-inset-top|statusBarHeight|useAppSafeArea|getMenuButtonBoundingClientRect|safeAreaInsets|\b(?:ToolHeader|AppNavBar|SimpleChat|HistoryPage|HistoryGroups|MinorModeStatus)\b/u

test('所有自定义导航页面必须声明状态栏、刘海或挖孔安全区方案', () => {
  const missing = []
  for (const [route, page] of registeredPages()) {
    if (page.style?.navigationStyle !== 'custom') continue
    if (!safeAreaEvidence.test(pageSource(route))) missing.push(route)
  }
  assert.deepEqual(missing, [], `以下自定义导航页面没有安全区证据：\n${missing.join('\n')}`)
})

test('动态状态栏高度不能停留在未赋值的零值占位', () => {
  const missingRuntimeHeight = []

  for (const [route, page] of registeredPages()) {
    if (page.style?.navigationStyle !== 'custom') continue
    const content = pageSource(route)
    if (!/const\s+statusBarHeight\s*=\s*ref\(0\)/u.test(content)) continue
    if (!/statusBarHeight\.value\s*=/u.test(content)) missingRuntimeHeight.push(route)
  }

  assert.deepEqual(
    missingRuntimeHeight,
    [],
    `以下自定义导航页面声明了 statusBarHeight，但从未读取真机状态栏高度：\n${missingRuntimeHeight.join('\n')}`,
  )
})

const h5NotchFallbackPages = [
  'pkg-auth/login/index',
  'pkg-auth/register/index',
  'pkg-auth/forgot-password/index',
  'pkg-im/im/chat/index',
  'pkg-im/im/group-chat/index',
  'pkg-im/im/messages/index',
  'pkg-im/im/conversations/index',
  'pkg-live/obs-guide/index',
  'pkg-live/obs/index',
  'pkg-live/replay-detail/index',
  'pkg-live/stream-config/index',
]

test('认证、即时通信与直播关键页同时保留 H5 刘海安全区兜底', () => {
  const missingCssFallback = h5NotchFallbackPages.filter(
    (route) => !/env\(safe-area-inset-top\)/u.test(pageSource(route)),
  )
  assert.deepEqual(
    missingCssFallback,
    [],
    `以下自定义导航页面缺少 H5 刘海安全区兜底：\n${missingCssFallback.join('\n')}`,
  )
})

const stickySafePages = [
  'pkg-order/appeal/index',
  'pkg-classics/search/index',
  'pkg-classics/companion/index',
  'pkg-classics/collection/index',
  'pkg-classics/bookmarks/index',
  'pkg-classics/notes/index',
  'pkg-classics/ai-assistant/index',
  'pkg-circle/circles/exit-requests',
  'pkg-circle/circles/guests',
  'pkg-circle/my-circles/index',
  'pkg-circle/articles/index',
  'pkg-merchant/inventory/index',
  'pkg-merchant/after-sales/index',
  'pkg-mine/edit-profile/index',
  'pkg-im/im/contacts/index',
]

test('带状态栏占位的粘性主导航滚动后仍停在系统安全区下方', () => {
  for (const route of stickySafePages) {
    const content = pageSource(route)
    const sticky = content.match(/[^{}]+\{[^{}]*position:\s*sticky[^{}]*\}/u)?.[0] || ''
    assert.match(sticky, /top:\s*var\(--status-bar-height/u, `${route} 的首个粘性主导航仍会滚入状态栏`)
  }
})
