const ADMIN_SESSION_KEYS = [
  'token',
  'refresh_token',
  'user_roles',
  'redirect_after_login',
  'admin_assistant_chat',
] as const

/** 清理后台账号私有会话，避免共用电脑换账号后复用上一位运营人员的数据。 */
export function clearAdminSession(options: { preserveRedirect?: boolean } = {}): void {
  for (const key of ADMIN_SESSION_KEYS) {
    if (options.preserveRedirect && key === 'redirect_after_login') continue
    localStorage.removeItem(key)
  }
}
