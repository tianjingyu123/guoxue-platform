import { getStorage, setStorage, removeStorage, getUserInfo } from '@/utils/storage'

const STORAGE_KEY = 'shop_checkout_request_keys_v1'
const TTL = 30 * 60 * 1000
type CheckoutAttempt = { account: string; selection: string; keys: string[]; createdAt: number }
const account = () => String(getUserInfo()?.id || 'authenticated')

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `checkout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

function activeAttempt(): CheckoutAttempt | null {
  const saved = getStorage<CheckoutAttempt>(STORAGE_KEY)
  if (!saved || !Array.isArray(saved.keys) || Date.now() - saved.createdAt >= TTL) return null
  // 登录后用户资料可能晚于首个下单请求写入；未知身份键仍由服务端 userId 唯一约束隔离。
  return saved.account === account() || saved.account === 'authenticated' || account() === 'authenticated' ? saved : null
}

export function hasPendingCheckoutAttempt(): boolean { return !!activeAttempt() }

export function requestKeysFor(selection: string, count: number): string[] {
  const saved = activeAttempt()
  if (saved) {
    if (saved.selection !== selection || saved.keys.length !== count) {
      throw new Error('上次下单结果待确认，请先到我的订单核对')
    }
    return saved.keys
  }
  const keys = Array.from({ length: count }, createRequestId)
  setStorage(STORAGE_KEY, { account: account(), selection, keys, createdAt: Date.now() } as CheckoutAttempt)
  return keys
}

export function clearCheckoutAttempt(): void { removeStorage(STORAGE_KEY) }
