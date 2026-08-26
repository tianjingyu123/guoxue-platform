/** 原生 App Link 的最小可信边界。预发布域名仅用于真机验收，正式包仍只声明生产域名。 */
const TRUSTED_APP_LINK_HOSTS = new Set(['api.rebugx.cn', 'pre-api.rebugx.cn'])
const APP_LINK_PATH_PREFIX = '/h5/'
const MAX_APP_LINK_LENGTH = 2048
const SENSITIVE_QUERY_KEYS = new Set([
  'access_token',
  'accesstoken',
  'authorization',
  'password',
  'refresh_token',
  'refreshtoken',
  'secret',
  'token',
])

/**
 * 将系统交给 App 的 HTTPS 链接转换为站内原型路由。
 *
 * 安全约束：只接受精确域名、HTTPS、默认端口和 /h5/ 路径；不接受 URL 凭据、
 * 编码斜杠/反斜杠/空字节或可复用凭据。一次性 handoff 码可以保留，后续仍由后端
 * 单次兑换并立即失效。
 */
export function parseAppEntryLink(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || value.length > MAX_APP_LINK_LENGTH) return null

  let link: URL
  try {
    link = new URL(value)
  } catch {
    return null
  }

  if (
    link.protocol !== 'https:'
    || !TRUSTED_APP_LINK_HOSTS.has(link.hostname.toLowerCase())
    || link.port
    || link.username
    || link.password
  ) return null

  // URL 会规范化点路径；在解码前额外拒绝能改变路径边界的编码字符。
  if (/%(?:00|2f|5c)/iu.test(link.pathname)) return null

  let pathname: string
  try {
    pathname = decodeURIComponent(link.pathname)
  } catch {
    return null
  }
  if (
    !pathname.startsWith(APP_LINK_PATH_PREFIX)
    || pathname.includes('\\')
    || pathname.includes('//')
    || Array.from(pathname).some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127
    })
  ) return null

  let hasSensitiveQuery = false
  link.searchParams.forEach((_value, key) => {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) hasSensitiveQuery = true
  })
  if (hasSensitiveQuery) return null

  const internalPath = pathname.slice('/h5'.length)
  const route = internalPath === '/' ? '/pages/index/index' : internalPath.replace(/\/+$/u, '')
  return `${route}${link.search}`
}
