import { isPaymentMobile, paymentMethodName } from './payment-device'
import { isAlipayMobileBrowser } from './huifu-alipay-h5'

export type H5PaymentMethod = 'wechat' | 'alipay' | 'unionpay'
export interface H5PaymentOption { id: H5PaymentMethod; name: string; enabled: boolean; reason: string }

/** 只控制H5展示/入口；后台client_*开关按已实现的环境细分，不代表开通商户产品。 */
export function h5PaymentOptions(userAgent: string, features: Record<string, boolean> = {}, topLevel = true): H5PaymentOption[] {
  const mobile = isPaymentMobile(userAgent)
  const wechat = /MicroMessenger/i.test(userAgent)
  const flag = (key: string, fallback: boolean) => typeof features[key] === 'boolean' ? features[key] : fallback
  const choice = (id: H5PaymentMethod, enabled: boolean, reason: string): H5PaymentOption => ({ id, name: paymentMethodName(id, userAgent), enabled, reason: enabled ? '' : reason })
  return [
    choice('wechat', wechat && mobile
      ? flag('client_pay_h5_wechat_jsapi', true)
      : !wechat && mobile && flag('client_pay_h5_wechat_mweb', false),
    wechat && mobile ? '微信支付暂不可用，请稍后重试' : '请在手机微信中打开使用微信支付'),
    choice('alipay', !wechat && (mobile
      ? topLevel && isAlipayMobileBrowser(userAgent) && flag('client_pay_h5_alipay_mobile', true)
      : flag('client_pay_h5_alipay_desktop', true)),
    wechat ? '微信内请使用微信支付，支付宝请在手机浏览器中打开' : mobile ? '请使用手机浏览器完整打开页面后付款' : '支付宝扫码暂不可用'),
    choice('unionpay', !mobile && !wechat && flag('client_pay_h5_unionpay_desktop', false),
    mobile || wechat ? '当前环境暂不支持云闪付付款' : '云闪付暂不可用，请选择其他支付方式'),
  ]
}
