/** iOS 现金收银只用于有收货信息的实物订单；数字权益须走已配置的应用内购买。 */
export function iosCashPaymentBlocked(platform: string, type: string | undefined, hasShippingInfo: boolean): boolean {
  return platform === 'ios' && (type !== 'PRODUCT' || !hasShippingInfo)
}
