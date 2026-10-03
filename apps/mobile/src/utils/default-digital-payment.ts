// #ifdef H5
import { h5PaymentOptions } from './h5-payment-options'
import { getRemoteConfig, hydrateRemoteConfig } from '@/lib/remote-config'
// #endif

/** 在建单前选择当前可用渠道；只决定入口，不改变金额、权益或支付结果。 */
export async function defaultDigitalPaymentMethod(): Promise<'wechat' | 'alipay'> {
  // #ifdef H5
  await hydrateRemoteConfig(true)
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const options = h5PaymentOptions(ua, getRemoteConfig().features, typeof window !== 'undefined' && window.self === window.top)
  const preferred = ua.toLowerCase().includes('micromessenger') ? 'wechat' : 'alipay'
  if (!options.some(item => item.id === preferred && item.enabled)) {
    throw new Error('当前环境暂不支持付款，请在支持的客户端打开')
  }
  return preferred
  // #endif
  // #ifdef APP-PLUS
  const platform = uni.getSystemInfoSync().platform.toLowerCase()
  if (platform === 'android') return 'alipay'
  // iOS 数字商品不可降级到第三方现金支付。
  throw new Error('当前客户端的数字商品购买暂未开放')
  // #endif
  return 'wechat'
}
