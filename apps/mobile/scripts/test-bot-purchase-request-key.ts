import assert from 'node:assert/strict'
import { pendingBotPurchaseRequestId, clearBotPurchaseRequestId } from '../src/lib/bot-purchase-request-key'
import { setUserInfo, clearAuthSession } from '../src/utils/storage'

const data = new Map<string, unknown>()
;(globalThis as any).uni = {
  getStorageSync: (key: string) => data.get(key),
  setStorageSync: (key: string, value: unknown) => data.set(key, value),
  removeStorageSync: (key: string) => data.delete(key),
  getStorageInfoSync: () => ({ keys: [...data.keys()] }),
}

setUserInfo({ id: 'qa-user-1' })
const first = pendingBotPurchaseRequestId('bot-a')
assert.equal(pendingBotPurchaseRequestId('bot-a'), first, '超时重试沿用原请求号')
const secondBot = pendingBotPurchaseRequestId('bot-b')
assert.notEqual(secondBot, first)
assert.equal(pendingBotPurchaseRequestId('bot-a'), first, '切换智能体后原请求仍保留')
clearBotPurchaseRequestId('bot-a')
assert.notEqual(pendingBotPurchaseRequestId('bot-a'), first, '已确认成功后下一次购买使用新请求号')
assert.equal(pendingBotPurchaseRequestId('bot-b'), secondBot)
clearAuthSession()
setUserInfo({ id: 'qa-user-2' })
assert.notEqual(pendingBotPurchaseRequestId('bot-b'), secondBot, '退出登录后不能沿用上个账号请求号')
console.log('追问包请求号本地复用、切换与清理：通过')
