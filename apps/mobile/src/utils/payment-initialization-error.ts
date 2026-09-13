/** 旧客户端可能只保留message；兼容提示识别，禁止将核对错误降级为重新付款。 */
export function isPaymentInitializationBlocked(error: unknown): boolean {
  const e = error as { status?: number; errorCode?: number; message?: string } | null;
  return !!e && ((e.status === 409 && e.errorCode === 301001)
    || /^(支付核对中：|充值暂未开放：)/.test(e.message || ''));
}
