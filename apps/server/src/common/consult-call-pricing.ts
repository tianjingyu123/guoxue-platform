/** 当前金币字段为 PostgreSQL int4；配置、展示和预扣共用同一数值边界。 */
export const CONSULT_PREPAY_MINUTES = 10;
// 覆盖等待/已预扣通话与一分钟建链余量，不默认签发整天票据。
export const CONSULT_WAITING_SECONDS = 10 * 60;
export const CONSULT_ACCEPT_TICKET_SECONDS = CONSULT_PREPAY_MINUTES * 60 + 60;
export const CONSULT_INITIATE_TICKET_SECONDS = CONSULT_WAITING_SECONDS + CONSULT_ACCEPT_TICKET_SECONDS;
export const CONSULT_MAX_PRICE_PER_MINUTE = Math.floor(2147483647 / CONSULT_PREPAY_MINUTES);

export function isValidConsultCallPrice(value: unknown, allowDisabled = false): value is number {
  return typeof value === "number" && Number.isSafeInteger(value)
    && value >= (allowDisabled ? 0 : 1) && value <= CONSULT_MAX_PRICE_PER_MINUTE;
}
