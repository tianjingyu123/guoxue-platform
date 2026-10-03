import { authApi } from '@/lib/auth-data'
import { getToken, getUserInfo } from '@/utils/storage'

const ATTEMPT_KEY = 'wechat:h5:binding-attempt'
const MAX_AGE = 10 * 60 * 1000
type Attempt = { state: string; userId: string; createdAt: number }
type AttemptStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function currentBindingUser(): string {
  const user = getUserInfo<{ id?: string }>()
  return getToken() && typeof user?.id === 'string' ? user.id : ''
}

export function clearBindingAttempt(storage: AttemptStorage): void {
  try { storage.removeItem(ATTEMPT_KEY) } catch { /* 存储不可用时不影响页面恢复，创建授权仍须写入成功 */ }
}

export function createBindingAttempt(userId: string, storage: AttemptStorage, crypto: Crypto, now = Date.now()): Attempt {
  if (!userId) throw new Error('请先登录后再绑定微信')
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const state = 'wxbind.' + Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  const attempt = { state, userId, createdAt: now }
  // 仅保存短期防重放信息，不保存手机号、授权 code 或登录令牌。
  storage.setItem(ATTEMPT_KEY, JSON.stringify(attempt))
  return attempt
}

export function consumeBindingAttempt(state: string, userId: string, storage: AttemptStorage, now = Date.now()): boolean {
  let attempt: Attempt | null = null
  try { attempt = JSON.parse(storage.getItem(ATTEMPT_KEY) || 'null') }
  catch { /* 无效记录按授权失效处理 */ }
  finally { clearBindingAttempt(storage) }
  return Boolean(userId && /^wxbind\.[0-9a-f]{48}$/.test(state) && attempt?.state === state &&
    attempt.userId === userId && Number.isFinite(attempt.createdAt) &&
    now >= attempt.createdAt && now - attempt.createdAt <= MAX_AGE)
}

export function requestBindingWechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      // #ifdef APP-PLUS
      onlyAuthorize: true,
      // #endif
      success: (result) => {
        const code = typeof result.code === 'string' ? result.code.trim() : ''
        if (code) resolve(code)
        else reject(new Error('未获取到微信授权，请重试'))
      },
      fail: () => reject(new Error('微信授权未完成，可稍后重试')),
    })
  })
}

export async function submitWechatBinding(userId: string, code: string, channel: 'app' | 'miniprogram' | 'h5'): Promise<void> {
  if (!userId || currentBindingUser() !== userId) throw new Error('登录账号已变化，请重新发起微信绑定')
  if (!code.trim()) throw new Error('微信授权已失效，请重试')
  const result = await authApi.bindWechat(code.trim(), channel, userId)
  if (currentBindingUser() !== userId) throw new Error('登录账号已变化，请查看当前账号的绑定状态')
  if (!result.success) throw new Error(result.message || '微信绑定失败')
}
