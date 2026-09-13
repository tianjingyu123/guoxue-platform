import type { HuifuAttempt, HuifuCashierView } from './existing-order-huifu'

/** 汇付支付宝H5指引给出A_NATIVE付款码的alipays路线；浏览器外跳仍须用户手势及真机验收。
 * https://paas.huifu.com/help/dev_guide/zf/zfb/h5.md
 */
export function isAlipayMobileBrowser(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent)
    && !/MicroMessenger|AlipayClient|\bQQ\/|Weibo|DingTalk|Html5Plus|\bwv\b/i.test(userAgent)
}
export function alipaySchemeForQr(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1024 || /[\s\\\u0000-\u001f\u007f]/.test(value)
    || !/^https:\/\/qr\.alipay\.com\/[A-Za-z0-9][A-Za-z0-9/_?=&%+.,~-]*$/.test(value)) {
    throw new Error('支付宝付款链接无效，请使用原订单二维码或查询结果')
  }
  return `alipays://platformapi/startapp?saId=10000007&qrcode=${encodeURIComponent(value)}`
}
export function existingAlipayLaunchUrl(input: {
  orderId: string; view: HuifuCashierView; attempt: HuifuAttempt | null
  userAgent: string; topLevel: boolean; now: number
}): string {
  const { view, attempt, now } = input
  if (!input.topLevel || !isAlipayMobileBrowser(input.userAgent)) throw new Error('请在手机浏览器使用此入口，或使用原订单二维码付款')
  if (view.busy || view.phase !== 'pending' || view.channel !== 'alipay' || !attempt?.outTradeNo
    || attempt.orderId !== input.orderId || attempt.channel !== 'alipay' || attempt.qrCode !== view.qrCode
    || !Number.isFinite(attempt.requestedAt) || now < attempt.requestedAt || now - attempt.requestedAt >= 2 * 60 * 60 * 1000) {
    throw new Error('原付款凭据暂不可用，请查询原订单，不要重新提交付款')
  }
  return alipaySchemeForQr(view.qrCode)
}
