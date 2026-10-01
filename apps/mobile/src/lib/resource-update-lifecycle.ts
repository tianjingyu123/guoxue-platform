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
let healthGeneration = 0;
let updateGeneration = 0;
let activeUpdater: ResourceUpdater | undefined;
function cancelResourceFlow(): void {
  updateGeneration++;
  activeUpdater?.cancel();
  void bridge?.call("cancel").catch(() => {});
}
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
  const generation = updateGeneration;
  const current = () => { if (generation !== updateGeneration || failed) throw new Error("资源流程已取消"); };
  checking = (async () => {
    await bridge!.bindRuntime();
    current();
    await bridge!.call("session", { token: getToken() || "" });
    current();
    subscribeCriticalActivities((activities) => {
      if (activities.length) cancelResourceFlow();
      void bridge
        ?.call("busy", { activities: Object.fromEntries(activities.map((kind) => [kind, true])) })
        .catch(() => {});
    });
    const bundle = await apiGetOptionalAuth<{ keys: SignedWgtControl[] }>(
      "/system/wgt/trust/" + encodeURIComponent(APP_CLIENT_KEY),
    );
    current();
    await bridge!.replaceTrust(bundle.keys);
    current();
    const result = await offer();
    current();
    if (!result.update) return;
    const updater = new ResourceUpdater(
      bridge!,
      async (id) => (await offer()).update?.manifest.releaseId === id,
    );
    activeUpdater = updater;
    await updater.downloadAndStage(result.update);
    current();
    // 此原生实现只持久化排队；下一次 Application.onCreate 再复检网络、身份和关键业务。
    await updater.queueForNextColdLaunch();
  })()
    .catch(() => {})
    .finally(() => {
      checking = undefined;
      activeUpdater = undefined;
    });
  subscribeAuthContext(() => {
    cancelResourceFlow();
    void bridge?.call("session", { token: getToken() || "" }).catch(() => {});
  });
  // #endif
}
export function observeResourceHealth(): void {
  foreground = true;
  if (!bridge || healthyTimer || failed) return;
  const generation = ++healthGeneration;
  healthyTimer = setTimeout(() => {
    healthyTimer = undefined;
    if (failed || !foreground || getCurrentPages().length === 0) return;
    void bridge!
      .identity()
      .then((identity) => {
        // 身份查询期间切后台或出错后，迟到结果不能确认资源健康。
        if (failed || !foreground || generation !== healthGeneration || getCurrentPages().length === 0) return;
        if (identity.resourceVersion > 0 && identity.activeReleaseId)
          return bridge!.call("healthy", { releaseId: identity.activeReleaseId }).catch(() => {});
      })
      .catch(() => {});
  }, 65000);
}
export function pauseResourceHealth(): void {
  // 已完成的排队需要保留到冷启动；仅中止仍在等待的更新流程。
  if (checking) cancelResourceFlow();
  foreground = false;
  healthGeneration++;
  if (healthyTimer) clearTimeout(healthyTimer);
  healthyTimer = undefined;
}
export function markResourceUnhealthy(): void {
  cancelResourceFlow();
  failed = true;
  healthGeneration++;
  if (healthyTimer) clearTimeout(healthyTimer);
  healthyTimer = undefined;
  void bridge?.call("unhealthy").catch(() => {});
}
