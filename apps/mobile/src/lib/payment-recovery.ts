export type OrderPaymentAction = 'deliver' | 'pay' | 'wait' | 'closed'

/** 只根据服务端订单状态决定收银页下一步，未知状态不发起第二次付款。 */
export function orderPaymentAction(status: string, paid: boolean, returnedFromProvider = false): OrderPaymentAction {
  if (paid || ['PAID', 'SHIPPED', 'COMPLETED'].includes(status)) return 'deliver'
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'closed'
  if (status === 'PENDING') return returnedFromProvider ? 'wait' : 'pay'
  return 'wait'
}
