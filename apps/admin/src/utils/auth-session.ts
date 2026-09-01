const ADMIN_SESSION_KEYS = [
  'token',
  'refresh_token',
  'user_roles',
  'redirect_after_login',
  'admin_assistant_chat',
  'admin_recent_routes',
  'admin_workspace',
] as const

/**
 * 只接受当前站点内的绝对路径，阻断通过本地缓存植入外站地址造成的登录后开放重定向。
 */
export function normalizeSameOriginPath(
  value: string | null | undefined,
  origin = window.location.origin,
  basePath = import.meta.env.BASE_URL,
): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  try {
    const url = new URL(value, origin)
    if (url.origin !== origin) return null
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
    if (
      normalizedBase !== '/' &&
      url.pathname !== normalizedBase.slice(0, -1) &&
      !url.pathname.startsWith(normalizedBase)
    ) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

/** 记录登录成功后要恢复的后台工作现场，仅保留同源路径。 */
export function rememberAdminRedirect(value: string): void {
  const safe = normalizeSameOriginPath(value)
  if (safe) localStorage.setItem('redirect_after_login', safe)
}

/** 一次性读取并删除安全的后台恢复路径。 */
export function consumeAdminRedirect(): string | null {
  const raw = localStorage.getItem('redirect_after_login')
  localStorage.removeItem('redirect_after_login')
  return normalizeSameOriginPath(raw)
}

/** 清理后台账号私有会话，避免共用电脑换账号后复用上一位运营人员的数据。 */
export function clearAdminSession(options: { preserveRedirect?: boolean } = {}): void {
  for (const key of ADMIN_SESSION_KEYS) {
    if (options.preserveRedirect && key === 'redirect_after_login') continue
    localStorage.removeItem(key)
  }
}
