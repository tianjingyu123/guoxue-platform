export interface WechatMiniPaymentLaunch {
  orderId: string
  amount?: string
  shortLink: string
}

/** App 只把订单定位信息交给小程序；金额和归属由小程序重新向服务端读取。 */
export function wechatMiniPaymentPath(orderId: string): string {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(orderId)) throw new Error('订单信息无效')
  return `/pkg-shop/paying/index?orderId=${encodeURIComponent(orderId)}&method=wechat&fromApp=1`
}

export async function launchWechatMiniPayment(input: WechatMiniPaymentLaunch): Promise<void> {
  wechatMiniPaymentPath(input.orderId)
  if (!/^https:\/\/wxaurl\.cn\/[A-Za-z0-9_-]{4,256}$/u.test(input.shortLink)) throw new Error('微信支付小程序链接无效')
  const services = await new Promise<any[]>((resolve, reject) => plus.share.getServices(resolve, reject))
  const weixin = services.find(service => service?.id === 'weixin' && service?.nativeClient === true)
  if (!weixin?.launchMiniProgram) throw new Error('未检测到可用的微信客户端，请安装或更新微信')
  await new Promise<void>((resolve, reject) => weixin.launchMiniProgram({ shortLink: input.shortLink }, resolve, reject))
}
