/** 登录身份优先；会话缓存必须同时隔离账号及公众号，绝不复用旧的无归属缓存。 */
export async function reusableWechatPaymentIdentity(
  userId: string,
  fetchIdentity: () => Promise<{ appId: string; openid?: string | null; allowSessionCache?: boolean }>,
  readCache: (key: string) => string | null,
) {
  const empty = { appId: '', openid: '', cacheKey: '' }
  if (!userId) return empty
  try {
    const identity = await fetchIdentity()
    if (!identity.appId) return empty
    const cacheKey = `wx_oa_openid:${userId}:${identity.appId}`
    let cached = ''
    try { if (identity.allowSessionCache) cached = readCache(cacheKey) || '' } catch { /* 存储不可用时继续必要授权。 */ }
    return { appId: identity.appId, openid: identity.openid || cached, cacheKey }
  } catch { return empty } // 老服务或暂时不可用时保留原授权流程，不猜测身份。
}
