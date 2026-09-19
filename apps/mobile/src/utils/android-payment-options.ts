/** 仅供 APP-PLUS 调用；安卓已接入汇付支付宝，微信APP及银联尚未开通。 */
export function isAndroidPaymentPlatform(platform: string) { return platform.toLowerCase() === 'android' }
export function androidPaymentMethods() {
  return [{ id: 'alipay', name: '支付宝支付', badge: '支', badgeColor: '#1677FF', color: '#1677FF', enabled: true }]
}
export function assertAndroidPaymentMethod(platform: string, method: string) {
  if (isAndroidPaymentPlatform(platform) && method !== 'alipay') throw new Error('当前请使用支付宝支付')
  if (!isAndroidPaymentPlatform(platform) && method === 'alipay') throw new Error('当前设备暂不支持此支付宝付款方式')
}
