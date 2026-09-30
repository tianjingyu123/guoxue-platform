import { isClientFeatureEnabled } from './remote-config'
/** 只约束新业务入口；历史订单、退款、客服、已购课程与权益阅读不走此表。 */
export const OPERATION_ROUTE_FEATURES: Record<string, string> = {
  '/pkg-shop/checkout/index': 'shop_checkout',
  '/pkg-merchant/join/index': 'merchant_onboarding',
  '/pkg-merchant/apply/index': 'merchant_onboarding',
  '/pkg-live/create/index': 'live_start',
  '/pkg-live/obs/index': 'live_start',
}
export function isOperationRouteAllowed(path: string): boolean {
  const key = OPERATION_ROUTE_FEATURES[path.split('?')[0]]
  return !key || isClientFeatureEnabled(key, false)
}
