export function isPaymentMobile(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent)
}
/** 名称区分设备；名称不代表未开通的渠道已经可用。 */
export function paymentMethodName(method: 'wechat' | 'alipay' | 'unionpay', userAgent: string): string {
  const name = { wechat: '微信', alipay: '支付宝', unionpay: '云闪付' }[method]
  return name + (isPaymentMobile(userAgent) ? '支付' : '扫码')
}
