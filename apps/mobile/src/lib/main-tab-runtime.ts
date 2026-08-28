/**
 * App 原生主 tab 运行时协调：
 * 1. switchTab 不支持 query，白名单参数通过一次性本地意图交给目标页；
 * 2. 切换开始后由目标页确认就绪，未确认时用原生弹窗提供可见恢复入口。
 *
 * 这里只保存排盘入口类型和内部 stationId，不保存手机号、token、签名 URL 等敏感信息。
 */

const INTENT_KEY = '__gx_main_tab_intent_v1__'
const PENDING_KEY = '__gx_main_tab_pending_v1__'
const RECOVERY_DELAY_MS = 2200
const INTENT_MAX_AGE_MS = 30_000

type MainTabIntent = {
  path: string
  query: Record<string, string>
  createdAt: number
}

type PendingMainTabSwitch = {
  path: string
  createdAt: number
}

let recoveryTimer: ReturnType<typeof setTimeout> | undefined

function readStorage<T>(key: string): T | undefined {
  try {
    const value = uni.getStorageSync(key)
    return value && typeof value === 'object' ? value as T : undefined
  } catch {
    return undefined
  }
}

function removeStorage(key: string): void {
  try { uni.removeStorageSync(key) } catch { /* 存储不可用时不阻断导航 */ }
}

function parseQuery(target: string): Record<string, string> {
  const index = target.indexOf('?')
  if (index < 0) return {}
  const query: Record<string, string> = {}
  target.slice(index + 1).split('&').forEach((field) => {
    if (!field) return
    const separator = field.indexOf('=')
    const rawKey = separator >= 0 ? field.slice(0, separator) : field
    const rawValue = separator >= 0 ? field.slice(separator + 1) : ''
    try {
      const key = decodeURIComponent(rawKey.replace(/\+/gu, ' '))
      if (key) query[key] = decodeURIComponent(rawValue.replace(/\+/gu, ' '))
    } catch { /* 非法 query 不进入本地意图 */ }
  })
  return query
}

function sanitizeIntent(path: string, target: string): Record<string, string> {
  if (path !== '/pages/paipan/index') return {}
  const source = parseQuery(target)
  const query: Record<string, string> = {}
  if (source.target === 'account' || source.target === 'station') query.target = source.target
  if (source.target === 'station' && source.stationId) query.stationId = source.stationId.slice(0, 128)
  if (source.nativeQa === '1') query.nativeQa = '1'
  return query
}

function showRecovery(): void {
  uni.showModal({
    title: '页面恢复',
    content: '页面切换未完成，已为您返回首页。请稍后重试。',
    showCancel: false,
    complete: () => {
      uni.switchTab({
        url: '/pages/index/index',
        fail: () => uni.showToast({ title: '页面恢复失败，请重新打开应用', icon: 'none' }),
      })
    },
  })
}

function scheduleRecovery(): void {
  if (recoveryTimer) clearTimeout(recoveryTimer)
  recoveryTimer = setTimeout(() => {
    recoveryTimer = undefined
    const pending = readStorage<PendingMainTabSwitch>(PENDING_KEY)
    if (!pending?.path) return
    removeStorage(PENDING_KEY)
    removeStorage(INTENT_KEY)
    showRecovery()
  }, RECOVERY_DELAY_MS)
}

/** 在 switchTab 前记录一次性参数和待确认目标。 */
export function beginMainTabSwitch(path: string, target: string): void {
  const query = sanitizeIntent(path, target)
  try {
    if (Object.keys(query).length > 0) {
      const intent: MainTabIntent = { path, query, createdAt: Date.now() }
      uni.setStorageSync(INTENT_KEY, intent)
    } else {
      removeStorage(INTENT_KEY)
    }
    const pending: PendingMainTabSwitch = { path, createdAt: Date.now() }
    uni.setStorageSync(PENDING_KEY, pending)
  } catch { /* 存储失败仍允许原生 tab 切换 */ }
  scheduleRecovery()
}

/** 目标主页面 onShow 后确认已渲染，关闭本次恢复计时。 */
export function markMainTabReady(path: string): void {
  const pending = readStorage<PendingMainTabSwitch>(PENDING_KEY)
  if (pending?.path !== path) return
  removeStorage(PENDING_KEY)
  if (recoveryTimer) {
    clearTimeout(recoveryTimer)
    recoveryTimer = undefined
  }
}

/** App 冷/热启动时恢复上一次未完成的主 tab 切换。 */
export function recoverPendingMainTabSwitch(): void {
  const pending = readStorage<PendingMainTabSwitch>(PENDING_KEY)
  if (!pending?.path) return
  if (!Number.isFinite(pending.createdAt) || Date.now() - pending.createdAt > INTENT_MAX_AGE_MS) {
    removeStorage(INTENT_KEY)
    // onLaunch 阶段原生 UI 尚可能未就绪；保留 pending，延迟到首个页面有机会确认后再恢复。
    scheduleRecovery()
    return
  }
  scheduleRecovery()
}

/** 目标页只消费与自身匹配且未过期的一次性参数。 */
export function consumeMainTabIntent(path: string): Record<string, string> | undefined {
  const intent = readStorage<MainTabIntent>(INTENT_KEY)
  if (!intent?.path || intent.path !== path) return undefined
  removeStorage(INTENT_KEY)
  if (!Number.isFinite(intent.createdAt) || Date.now() - intent.createdAt > INTENT_MAX_AGE_MS) return undefined
  return intent.query
}

/** switchTab API 直接失败时立即清理并显示中文恢复入口。 */
export function failMainTabSwitch(): void {
  removeStorage(PENDING_KEY)
  removeStorage(INTENT_KEY)
  if (recoveryTimer) {
    clearTimeout(recoveryTimer)
    recoveryTimer = undefined
  }
  showRecovery()
}
