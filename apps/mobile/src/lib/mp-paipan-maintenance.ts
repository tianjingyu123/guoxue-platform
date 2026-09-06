export const PAIPAN_MAINTENANCE_ROUTE = '/pages/paipan/index'
export const PAIPAN_MAINTENANCE_MESSAGE = '排盘工具维护升级中，当前暂仅向 App、微信公众号及 H5 用户开放。如有疑问，请联系智能客服。'

/** 仅识别排盘页面，不把客户端平台标识作为服务端身份权限。 */
export function isPaipanPage(url: string): boolean {
  const path = ('/' + String(url || '').replace(/^\/+/, '')).split(/[?#]/)[0]
  return path === '/paipan' || path.startsWith('/paipan/') || path === PAIPAN_MAINTENANCE_ROUTE ||
    /^\/pkg-paipan(?:2|3)?\//.test(path) || path === '/pkg-common/legacy-paipan/index' || path === '/pkg-common/compass/index' ||
    path === '/pkg-mine/submissions/index' || path === '/mine/submissions'
}

export function mpPaipanMaintenanceTarget(url: string): string | null {
  // #ifdef MP-WEIXIN
  if (isPaipanPage(url)) return PAIPAN_MAINTENANCE_ROUTE
  // #endif
  return null
}
