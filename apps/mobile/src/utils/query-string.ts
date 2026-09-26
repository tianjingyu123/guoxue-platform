/** 不依赖浏览器 URLSearchParams，供微信小程序与 App 原生运行时复用。 */
export function queryString(entries: Array<[string, string | number | undefined]>): string {
  return entries
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
}
