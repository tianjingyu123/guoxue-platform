/**
 * 旧排盘独立收款适配：协议取自旧版 1.0.8 App，不创建新商城订单或新会员权益。
 * 只从固定旧服务端取得签名，网页只能交付交易号，不能指定商户、金额或支付参数。
 */
export const LEGACY_PAYMENT_APP_ID = 'wxb3c0f47634f99c0b'
export const LEGACY_PAYMENT_ENDPOINT = 'https://www.rebu.net.cn/app/getTrade.php'

export interface LegacyPaymentOrderInfo {
  appid: string
  partnerid: string
  prepayid: string
  timestamp: string
  noncestr: string
  sign: string
  package: 'Sign=WXPay'
}

export type LegacyPaymentOutcome = 'submitted' | 'cancelled' | 'unconfirmed'
type PaymentErrorCode = 'INVALID_ORDER' | 'UNAVAILABLE' | 'STALE_PAGE' | 'BUSY' | 'INVALID_RESPONSE'

const paymentMessages: Record<PaymentErrorCode, string> = {
  INVALID_ORDER: '旧排盘订单无效，请返回订单页重新操作',
  UNAVAILABLE: '旧排盘微信支付暂时不可用，请确认已安装微信及最新应用后重试',
  STALE_PAGE: '当前排盘页面已变化，请在原订单页重新操作',
  BUSY: '已有旧排盘支付正在处理，请勿重复点击',
  INVALID_RESPONSE: '旧排盘支付参数暂不可用，请稍后在原订单页重试',
}

export class LegacyPaymentError extends Error {
  constructor(public readonly code: PaymentErrorCode) {
    super(paymentMessages[code])
    this.name = 'LegacyPaymentError'
  }
}

export function parseLegacyPaymentBridgeUrl(url: string): string | null {
  // 仅接收单一交易号；拒绝网页传入额外金额、回调、接口或商户字段。
  return /^rebu:\/\/legacy-payment\?trade_no=([A-Za-z0-9_-]{1,128})$/u.exec(url)?.[1] || null
}

function signedField(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value)
  return ''
}

export function normalizeLegacyPaymentOrderInfo(value: unknown): LegacyPaymentOrderInfo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LegacyPaymentError('INVALID_RESPONSE')
  const data = value as Record<string, unknown>
  // 旧接口没有 appid 时沿用旧 guoxue App 的固定值；如接口返回它，必须精确一致。
  for (const key of ['appid', 'appId']) {
    if (data[key] !== undefined && data[key] !== LEGACY_PAYMENT_APP_ID) throw new LegacyPaymentError('INVALID_RESPONSE')
  }
  if (data.package !== undefined && data.package !== 'Sign=WXPay') throw new LegacyPaymentError('INVALID_RESPONSE')
  const orderInfo: LegacyPaymentOrderInfo = {
    appid: LEGACY_PAYMENT_APP_ID,
    partnerid: signedField(data.partnerId),
    prepayid: signedField(data.prepayId),
    timestamp: signedField(data.timeStamp),
    noncestr: signedField(data.nonceStr),
    sign: signedField(data.sign),
    package: 'Sign=WXPay',
  }
  if (!/^\d{6,32}$/u.test(orderInfo.partnerid)
    || !/^[A-Za-z0-9_-]{1,128}$/u.test(orderInfo.prepayid)
    || !/^[1-9]\d{8,11}$/u.test(orderInfo.timestamp)
    || !/^[A-Za-z0-9]{1,32}$/u.test(orderInfo.noncestr)
    || !/^(?:[A-Fa-f0-9]{32}|[A-Za-z0-9+/]{40,512}={0,2})$/u.test(orderInfo.sign)) {
    throw new LegacyPaymentError('INVALID_RESPONSE')
  }
  return orderInfo
}

function requireWechatProvider(): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (available: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (available) resolve()
      else reject(new LegacyPaymentError('UNAVAILABLE'))
    }
    const timer = setTimeout(() => finish(false), 5000)
    try {
      uni.getProvider({
        service: 'payment',
        success: (result) => finish(Array.isArray(result.provider) && (result.provider as string[]).includes('wxpay')),
        fail: () => finish(false),
      })
    } catch { finish(false) }
  })
}

function requestLegacyOrderInfo(tradeNo: string): Promise<LegacyPaymentOrderInfo> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new LegacyPaymentError('INVALID_RESPONSE'))
    try {
      // 不使用新系统 apiGet，避免把新系统 Authorization/用户令牌传给旧服务。
      uni.request({
        url: LEGACY_PAYMENT_ENDPOINT,
        method: 'GET',
        data: { app: 'guoxue', trade_no: tradeNo },
        header: { Accept: 'application/json' },
        timeout: 10000,
        success: (response) => {
          if (response.statusCode !== 200) { fail(); return }
          try { resolve(normalizeLegacyPaymentOrderInfo(response.data)) } catch { fail() }
        },
        fail,
      })
    } catch { fail() }
  })
}

let activePayment = false

export async function payLegacyPaipanOrder(
  tradeNo: string,
  options: { canProceed: () => boolean; beforeNativePay?: () => void },
): Promise<LegacyPaymentOutcome> {
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(tradeNo)) throw new LegacyPaymentError('INVALID_ORDER')
  if (activePayment) throw new LegacyPaymentError('BUSY')
  activePayment = true
  const assertCurrentPage = () => {
    if (!options.canProceed()) throw new LegacyPaymentError('STALE_PAGE')
  }
  try {
    assertCurrentPage()
    const platform = uni.getSystemInfoSync().platform
    if (platform !== 'ios' && platform !== 'android') throw new LegacyPaymentError('UNAVAILABLE')
    await requireWechatProvider()
    assertCurrentPage()
    const orderInfo = await requestLegacyOrderInfo(tradeNo)
    assertCurrentPage()
    options.beforeNativePay?.()
    return await new Promise<LegacyPaymentOutcome>((resolve) => {
      try {
        uni.requestPayment({
          provider: 'wxpay',
          orderInfo,
          // SDK success 不是旧订单到账/开通会员的证据，结果仍由旧站自己回查。
          success: () => resolve('submitted'),
          fail: (error) => resolve(
            Number(error.errCode) === -2 || /cancel|取消/iu.test(String(error.errMsg || ''))
              ? 'cancelled' : 'unconfirmed',
          ),
        })
      } catch { resolve('unconfirmed') }
    })
  } catch (error) {
    if (error instanceof LegacyPaymentError) throw error
    throw new LegacyPaymentError('UNAVAILABLE')
  } finally {
    // 原生支付没有可靠终态时不做超时自动重试，防止重复拉起仍在处理的交易。
    activePayment = false
  }
}

/** 只要求旧页面刷新自己的订单/权益，不注入 payOk 或直接写任何会员状态。 */
export const LEGACY_PAYMENT_REFRESH_SCRIPT = `;(function(){
  try{if(typeof window.resumeUpdate==='function'){window.resumeUpdate();return;}}catch(_error){}
  window.location.reload();
})();`
