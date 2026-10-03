/** 仅供 APP-PLUS 调用；安卓默认支付宝，也可跳转微信支付专用小程序。 */
export function isAndroidPaymentPlatform(platform: string) { return platform.toLowerCase() === 'android' }
export function androidPaymentMethods() {
  return [
    { id: 'alipay', name: '支付宝支付', badge: '支', badgeColor: '#1677FF', color: '#1677FF', enabled: true },
    { id: 'wechat', name: '微信支付', badge: '微', badgeColor: '#07C160', color: '#07C160', enabled: true },
  ]
}
export function assertAndroidPaymentMethod(platform: string, method: string) {
  if (isAndroidPaymentPlatform(platform) && !['alipay', 'wechat'].includes(method)) throw new Error('当前请选择支付宝或微信支付')
  if (!isAndroidPaymentPlatform(platform) && method === 'alipay') throw new Error('当前设备暂不支持此支付宝付款方式')
}
