export interface WechatMiniPaymentLaunch {
  orderId: string
  amount?: string
  scheme: string
}

/** App 只把订单定位信息交给小程序；金额和归属由小程序重新向服务端读取。 */
export function wechatMiniPaymentPath(orderId: string): string {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(orderId)) throw new Error('订单信息无效')
  return `/pkg-shop/paying/index?orderId=${encodeURIComponent(orderId)}&method=wechat&fromApp=1`
}

export async function launchWechatMiniPayment(input: WechatMiniPaymentLaunch): Promise<void> {
  wechatMiniPaymentPath(input.orderId)
  if (!/^weixin:\/\/dl\/business\/\?t=[A-Za-z0-9_-]{4,512}(?:&[A-Za-z0-9_~.%=&-]+)?$/u.test(input.scheme)) throw new Error('微信支付小程序入口无效')
  await new Promise<void>((resolve, reject) => {
    plus.runtime.openURL(input.scheme, () => reject(new Error('未能打开微信，请确认已安装或更新微信')), 'com.tencent.mm')
    // openURL 没有成功回调；调用被系统接受后即可结束等待。
    setTimeout(resolve, 400)
  })
}
