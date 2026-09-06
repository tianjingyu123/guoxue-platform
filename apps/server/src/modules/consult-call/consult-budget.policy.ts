/** 按已确认预扣计算截止，不读客户端时长，不追扣、不自动续费。异常历史订单留待核查。 */
export function consultBudgetDeadline(call: { startAt: unknown; prepaidCoin: unknown; pricePerMinute: unknown }) {
  const start = call.startAt instanceof Date ? call.startAt.getTime() : typeof call.startAt === 'string' ? Date.parse(call.startAt) : NaN;
  const prepaid = call.prepaidCoin, price = call.pricePerMinute;
  if (!Number.isFinite(start) || start <= 0 || typeof prepaid !== 'number' || typeof price !== 'number'
    || !Number.isSafeInteger(prepaid) || !Number.isSafeInteger(price) || prepaid <= 0 || prepaid > 2147483647 || price <= 0
    || prepaid % price !== 0) return null;
  const seconds = prepaid / price * 60, deadline = start + seconds * 1000;
  if (!Number.isSafeInteger(seconds) || seconds > 86400 || !Number.isSafeInteger(deadline) || deadline > 8640000000000000) return null;
  return { deadline, seconds, settledCoin: prepaid };
}
