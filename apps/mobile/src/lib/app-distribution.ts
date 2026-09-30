/** 固化构建输入，禁止用手机品牌推断安装渠道；WGT不得改变应用和渠道标识。 */
const env = (import.meta as any).env || {}
export const APP_CLIENT_KEY = String(env.VITE_APP_CLIENT_KEY || '').trim()
export const APP_APPLICATION_ID = String(env.VITE_APP_APPLICATION_ID || 'rebu')
export const APP_CHANNEL_ID = String(env.VITE_APP_CHANNEL_ID || 'legacy')
export const APP_RESOURCE_VERSION = String(env.VITE_APP_RESOURCE_VERSION || '0')
export function nativeBuildNumber(): string {
  try {
    return String(uni.getAppBaseInfo().appVersionCode || '')
  } catch {
    return ''
  }
}
export function distributionHeaders(): Record<string, string> {
  return {
    ...(APP_CLIENT_KEY ? { 'X-App-Client': APP_CLIENT_KEY } : {}),
    'X-Native-Build': nativeBuildNumber(),
    'X-Resource-Version': APP_RESOURCE_VERSION,
  }
}
export function clientCacheBoundary(): string {
  return [
    APP_APPLICATION_ID,
    APP_CLIENT_KEY || APP_CHANNEL_ID,
    nativeBuildNumber(),
    APP_RESOURCE_VERSION,
  ]
    .map(encodeURIComponent)
    .join(':')
}
