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

  // DCloud Android JS 运行时不保证提供 WHATWG URL。这里按 App Link 所需的
  // HTTPS 子集严格拆分，既避免运行时兼容问题，也不把任意 URL 当站内路由。
  if (!/^https:\/\//iu.test(value)) return null
  if (Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })) return null

  const afterScheme = value.slice('https://'.length)
  const authorityEnd = afterScheme.search(/[/?#]/u)
  const authority = authorityEnd >= 0 ? afterScheme.slice(0, authorityEnd) : afterScheme
  const remainder = authorityEnd >= 0 ? afterScheme.slice(authorityEnd) : ''
  if (!authority || authority.includes('@')) return null

  const portSeparator = authority.lastIndexOf(':')
  const hostname = (portSeparator >= 0 ? authority.slice(0, portSeparator) : authority).toLowerCase()
  const port = portSeparator >= 0 ? authority.slice(portSeparator + 1) : ''
  if (!TRUSTED_APP_LINK_HOSTS.has(hostname) || (portSeparator >= 0 && port !== '443')) return null

  const fragmentIndex = remainder.indexOf('#')
  const withoutFragment = fragmentIndex >= 0 ? remainder.slice(0, fragmentIndex) : remainder
  const queryIndex = withoutFragment.indexOf('?')
  const rawPathname = queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment
  const search = queryIndex >= 0 ? withoutFragment.slice(queryIndex) : ''

  // URL 会规范化点路径；在解码前额外拒绝能改变路径边界的编码字符。
  if (/%(?:00|23|2e|2f|3f|5c)/iu.test(rawPathname)) return null

  let pathname: string
  try {
    pathname = decodeURIComponent(rawPathname)
  } catch {
    return null
  }
  if (
    !pathname.startsWith(APP_LINK_PATH_PREFIX)
    || pathname.includes('\\')
    || pathname.includes('//')
    || pathname.includes('?')
    || pathname.includes('#')
    || pathname.split('/').some((segment) => segment === '.' || segment === '..')
    || Array.from(pathname).some((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127
    })
  ) return null

  let hasSensitiveQuery = false
  try {
    search.slice(1).split('&').forEach((field) => {
      const separator = field.indexOf('=')
      const rawKey = separator >= 0 ? field.slice(0, separator) : field
      const key = decodeURIComponent(rawKey.replace(/\+/gu, ' ')).toLowerCase()
      if (SENSITIVE_QUERY_KEYS.has(key)) hasSensitiveQuery = true
    })
  } catch {
    return null
  }
  if (hasSensitiveQuery) return null

  const internalPath = pathname.slice('/h5'.length)
  const route = internalPath === '/' ? '/pages/index/index' : internalPath.replace(/\/+$/u, '')
  return `${route}${search}`
}
