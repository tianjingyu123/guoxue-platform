/**
 * 统一存储封装（替代原型 useLocalStorage / useAuth 的存储层）
 * Web localStorage → uni.*StorageSync。函数签名保持简单一致，迁移时只换实现不动调用。
 */

export function getStorage<T = unknown>(key: string, fallback: T | null = null): T | null {
  try {
    const v = uni.getStorageSync(key)
    return v === '' || v === undefined || v === null ? fallback : (v as T)
  } catch {
    return fallback
  }
}

export function setStorage(key: string, value: unknown): void {
  try { uni.setStorageSync(key, value) } catch {}
}

export function removeStorage(key: string): void {
  try { uni.removeStorageSync(key) } catch {}
}

export function clearStorage(): void {
  try { uni.clearStorageSync() } catch {}
}

/* 登录态便捷方法（替代 useAuth 的 token 存取） */
const TOKEN_KEY = 'auth_token'
export const getToken = () => getStorage<string>(TOKEN_KEY, '') || ''
export const setToken = (t: string) => setStorage(TOKEN_KEY, t)
export const clearToken = () => removeStorage(TOKEN_KEY)

// refreshToken：access(2h)过期时用它无感换新 token，避免频繁重新短信登录(降成本)。30天有效。
const REFRESH_KEY = 'auth_refresh_token'
export const getRefreshToken = () => getStorage<string>(REFRESH_KEY, '') || ''
export const setRefreshToken = (t: string) => setStorage(REFRESH_KEY, t)
export const clearRefreshToken = () => removeStorage(REFRESH_KEY)

/* 用户信息缓存（敏感字段不落本地存储，避免明文手机号/生辰在 localStorage 暴露） */
const USERINFO_KEY = 'userInfo'
const SENSITIVE_USER_FIELDS = ['phone','phoneFull','mobile','email','idCard','idCardNo','realName','birthday','birthDate','birthTime','password','phoneEnc','phoneHash']
export function setUserInfo(user: Record<string, any> | null | undefined): void {
  if (!user || typeof user !== 'object') { removeStorage(USERINFO_KEY); return }
  const safe: Record<string, any> = {}
  for (const k of Object.keys(user)) { if (!SENSITIVE_USER_FIELDS.includes(k)) safe[k] = (user as any)[k] }
  setStorage(USERINFO_KEY, safe)
}
export const getUserInfo = <T = any>() => getStorage<T>(USERINFO_KEY, null as any)
export const clearUserInfo = () => removeStorage(USERINFO_KEY)
