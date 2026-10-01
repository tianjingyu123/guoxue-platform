import { isClientFeatureEnabled } from "./remote-config";
export { isOperationRequestAllowed } from "./operation-request-policy";
/** 只约束新业务入口；历史订单、退款、客服、已购课程与权益阅读不走此表。 */
export const OPERATION_ROUTE_FEATURES: Record<string, string> = {
  "/pkg-shop/checkout/index": "shop_checkout",
  "/pkg-merchant/join/index": "merchant_onboarding",
  "/pkg-merchant/apply/index": "merchant_onboarding",
  "/pkg-live/create/index": "live_start",
  "/pkg-live/stream-config/index": "live_start",
};
export function isOperationRouteAllowed(path: string): boolean {
  const key = OPERATION_ROUTE_FEATURES[path.split("?")[0]];
  return !key || isClientFeatureEnabled(key, false);
}
let installed = false;
/** 覆盖原生深链与直接 uni 跳转；历史订单、退款、客服、已购阅读均不在封锁表中。 */
export function installOperationRouteGuards(initialPath?: string): void {
  if (!installed) {
    installed = true;
    for (const method of ["navigateTo", "redirectTo", "reLaunch"] as const) {
      uni.addInterceptor(method, {
        invoke(options: { url: string }) {
          if (isOperationRouteAllowed(options.url)) return;
          uni.showToast({ title: "当前功能暂不开放", icon: "none" });
          return false;
        },
      });
    }
  }
  if (initialPath && !isOperationRouteAllowed("/" + initialPath.replace(/^\//, ""))) {
    let attempts = 0;
    const redirect = () => {
      if (getCurrentPages().length === 0 && attempts++ < 40) {
        setTimeout(redirect, 50);
        return;
      }
      uni.reLaunch({ url: "/pages/index/index" });
    };
    setTimeout(redirect, 50);
  }
}
