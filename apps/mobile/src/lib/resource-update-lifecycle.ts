import { apiGetOptionalAuth } from "@/utils/request";
import { getToken, subscribeAuthContext } from "@/utils/storage";
import { APP_CLIENT_KEY } from "./app-distribution";
import { AndroidResourceBridge } from "./resource-native-bridge";
import { ResourceUpdater } from "./resource-updater";
import {
  installCriticalActivityTracking,
  subscribeCriticalActivities,
} from "./critical-activities";
import type { SignedResourceManifest, SignedWgtControl } from "@guoxue/shared";
let bridge: AndroidResourceBridge | undefined;
let checking: Promise<void> | undefined;
let failed = false;
let healthyTimer: ReturnType<typeof setTimeout> | undefined;
let foreground = false;
async function offer() {
  const identity = await bridge!.identity();
  return apiGetOptionalAuth<{ update: SignedResourceManifest | null }>(
    "/system/resources/check?clientKey=" +
      encodeURIComponent(APP_CLIENT_KEY) +
      "&nativeBuild=" +
      identity.nativeBuild +
      "&resourceVersion=" +
      identity.resourceVersion,
  );
}
export function initializeResourceUpdates(): void {
  // #ifdef APP-PLUS
  installCriticalActivityTracking();
  if (checking || bridge) return;
  if (!APP_CLIENT_KEY || uni.getSystemInfoSync().platform !== "android") return;
  try {
    bridge = new AndroidResourceBridge();
  } catch {
    return;
  }
  checking = (async () => {
    await bridge!.bindRuntime();
    await bridge!.call("session", { token: getToken() || "" });
    subscribeCriticalActivities((activities) => {
      void bridge
        ?.call("busy", { activities: Object.fromEntries(activities.map((kind) => [kind, true])) })
        .catch(() => {});
    });
    const bundle = await apiGetOptionalAuth<{ keys: SignedWgtControl[] }>(
      "/system/wgt/trust/" + encodeURIComponent(APP_CLIENT_KEY),
    );
    await bridge!.replaceTrust(bundle.keys);
    const result = await offer();
    if (!result.update) return;
    const updater = new ResourceUpdater(
      bridge!,
      async (id) => (await offer()).update?.manifest.releaseId === id,
    );
    await updater.downloadAndStage(result.update);
    // 此原生实现只持久化排队；下一次 Application.onCreate 再复检网络、身份和关键业务。
    await updater.queueForNextColdLaunch();
  })()
    .catch(() => {})
    .finally(() => {
      checking = undefined;
    });
  subscribeAuthContext(() => {
    void bridge?.call("session", { token: getToken() || "" }).catch(() => {});
  });
  // #endif
}
export function observeResourceHealth(): void {
  foreground = true;
  if (!bridge || healthyTimer || failed) return;
  healthyTimer = setTimeout(() => {
    healthyTimer = undefined;
    if (failed || !foreground || getCurrentPages().length === 0) return;
    void bridge!
      .identity()
      .then((identity) => {
        if (identity.resourceVersion > 0 && identity.activeReleaseId)
          return bridge!.call("healthy", { releaseId: identity.activeReleaseId }).catch(() => {});
      })
      .catch(() => {});
  }, 65000);
}
export function pauseResourceHealth(): void {
  foreground = false;
  if (healthyTimer) clearTimeout(healthyTimer);
  healthyTimer = undefined;
}
export function markResourceUnhealthy(): void {
  failed = true;
  if (healthyTimer) clearTimeout(healthyTimer);
  healthyTimer = undefined;
  void bridge?.call("unhealthy").catch(() => {});
}
