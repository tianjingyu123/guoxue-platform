/** 微信授权和收银台必须在顶层页面运行，不能留在商品/课程详情 iframe 内。 */
export function promoteWechatPaymentPage(current: Window): boolean {
  if (current.self === current.top) return false
  const top = current.top
  if (!top || top.location.origin !== current.location.origin) {
    throw new Error('请直接在微信中打开本站支付页面')
  }
  const target = new URL(current.location.href)
  target.searchParams.delete('__contentLayer')
  top.location.replace(target.toString())
  return true
}

/** 仅在用户点击时调用；保留授权地址校验，并从同源详情层进入微信顶层授权。 */
export function navigateWechatAuthorization(current: Window, value: string): void {
  const target = new URL(value)
  if (target.origin !== 'https://open.weixin.qq.com' || target.pathname !== '/connect/oauth2/authorize') {
    throw new Error('微信授权链接无效')
  }
  const top = current.top
  if (!top || (current.self !== top && top.location.origin !== current.location.origin)) {
    throw new Error('请直接在微信中打开本站授权页面')
  }
  top.location.assign(target.toString())
}
