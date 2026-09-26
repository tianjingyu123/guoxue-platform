import { getStorage, setStorage, removeStorage, getUserInfo } from '@/utils/storage'

const STORAGE_KEY = 'bot_purchase_request_v1'
type PendingPurchase = { account: string; botId: string; requestId: string }

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `bot-purchase-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

export function pendingBotPurchaseRequestId(botId: string): string {
  const account = String(getUserInfo()?.id || 'authenticated')
  const saved = getStorage<PendingPurchase[]>(STORAGE_KEY)
  const entries = Array.isArray(saved) ? saved : []
  // 登录后用户资料可能比首次请求晚到；服务端仍按 userId 隔离同名请求号。
  const pending = entries.find((item) => item.botId === botId && (item.account === account || item.account === 'authenticated'))
  if (pending?.requestId) return pending.requestId
  const requestId = newRequestId()
  setStorage(STORAGE_KEY, [...entries, { account, botId, requestId } as PendingPurchase])
  return requestId
}

export function clearBotPurchaseRequestId(botId: string): void {
  const account = String(getUserInfo()?.id || 'authenticated')
  const saved = getStorage<PendingPurchase[]>(STORAGE_KEY)
  if (!Array.isArray(saved)) return
  const remaining = saved.filter((item) => item.botId !== botId || (item.account !== account && item.account !== 'authenticated'))
  if (remaining.length) setStorage(STORAGE_KEY, remaining)
  else removeStorage(STORAGE_KEY)
}
