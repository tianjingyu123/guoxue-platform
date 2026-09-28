export type OrderPaymentAction = 'deliver' | 'pay' | 'wait' | 'closed'

/** 只根据服务端订单状态决定收银页下一步，未知状态不发起第二次付款。 */
export function orderPaymentAction(status: string, paid: boolean, returnedFromProvider = false): OrderPaymentAction {
  if (paid || ['PAID', 'SHIPPED', 'COMPLETED'].includes(status)) return 'deliver'
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'closed'
  if (status === 'PENDING') return returnedFromProvider ? 'wait' : 'pay'
  return 'wait'
}

export type OrderLookupFailure = 'account' | 'missing' | 'login' | 'wait' | 'retry'

/** 未发起付款前查单失败不能无限轮询；已从渠道返回时才继续等待原单回调。 */
export function orderLookupFailure(message: string, returnedFromProvider = false): OrderLookupFailure {
  if (message.includes('只能查看自己的订单')) return 'account'
  if (message.includes('订单不存在')) return 'missing'
  if (message.includes('未登录或登录已过期')) return 'login'
  return returnedFromProvider ? 'wait' : 'retry'
}
