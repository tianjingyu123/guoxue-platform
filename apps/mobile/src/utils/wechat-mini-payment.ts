const ORIGINAL_ID_PATTERN = /^gh_[a-f0-9]{12,32}$/i

export interface WechatMiniPaymentLaunch {
  orderId: string
  amount?: string
  originalId: string
}

/** App 只把订单定位信息交给小程序；金额和归属由小程序重新向服务端读取。 */
export function wechatMiniPaymentPath(orderId: string): string {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(orderId)) throw new Error('订单信息无效')
  return `/pkg-shop/paying/index?orderId=${encodeURIComponent(orderId)}&method=wechat&fromApp=1`
}

export async function launchWechatMiniPayment(input: WechatMiniPaymentLaunch): Promise<void> {
  if (!ORIGINAL_ID_PATTERN.test(input.originalId)) throw new Error('微信支付小程序尚未完成 App 关联配置')
  const path = wechatMiniPaymentPath(input.orderId)
  const services = await new Promise<any[]>((resolve, reject) => plus.share.getServices(resolve, reject))
  const weixin = services.find(service => service?.id === 'weixin' && service?.nativeClient === true)
  if (!weixin?.launchMiniProgram) throw new Error('未检测到可用的微信客户端，请安装或更新微信')
  await new Promise<void>((resolve, reject) => weixin.launchMiniProgram({ id: input.originalId, path, type: 0 }, resolve, reject))
}
