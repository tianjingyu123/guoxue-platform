const IOS_STARTUP_RECOVERY_KEY = "app:ios-startup-recovery-build";
const HOME_ROUTE = "/pages/index/index";
const HOME_ROUTE_KEY = "pages/index/index";
const RECOVERY_DELAY_MS = 1200;
const RETRY_DELAY_MS = 900;

let pendingRecovery: ReturnType<typeof setTimeout> | undefined;
let startupRecoveryStarted = false;
let recoveryInFlight = false;

// #ifdef APP-PLUS
export function shouldRecoverIosStartupRoute(routes: string[]): boolean {
  const normalized = routes
    .map((route) => String(route || "").trim().replace(/^\/+/, ""))
    .filter(Boolean);
  return normalized.length === 0 || normalized[normalized.length - 1] === HOME_ROUTE_KEY;
}
// #endif

/**
 * 修复 iOS 覆盖升级后的失效页面恢复：
 * 旧 App 的场景/WebView 可能在新包启动时被系统恢复，但对应页面已经变化，最终只剩白屏。
 * iOS 可能保留一个仍有首页 route、但实际已经不可渲染的旧 WebView；因此“路由存在”
 * 不能证明页面可见。每次冷启动如果仍停留在首页（或页面栈为空），就只重建一次首页
 * 页面栈；已经进入深链或其他业务页时不打断用户。
 * 不清 token、用户资料或业务缓存，构建号标记只用于诊断。
 *
 * 注意：不能从 onShow 重复调用。reLaunch 首页会再次触发页面显示生命周期，如果把
 * “正常首页”继续当成故障恢复，就会形成首页反复重建，表现为首页闪现后白屏。
 */
export function repairIosStartupRoute(): void {
  // App 的本地编译目标是通用 APP-PLUS；APP-IOS 条件块不会进入云打包输入，
  // 因此必须先编译进通用包，再在运行时严格限定为 iOS。
  // #ifdef APP-PLUS
  let buildNumber = "";
  try {
    const platform = String(uni.getSystemInfoSync().platform || "").toLowerCase();
    if (platform !== "ios") return;
    buildNumber = String(uni.getAppBaseInfo().appVersionCode || "").trim();
  } catch {
    return;
  }

  // 同一个 JS 进程仅允许启动一次看门狗。下一次真正冷启动会创建新的 JS 进程并重新执行。
  if (startupRecoveryStarted) return;
  startupRecoveryStarted = true;
  if (pendingRecovery) clearTimeout(pendingRecovery);
  let attempts = 0;
  const recover = () => {
    pendingRecovery = undefined;
    if (recoveryInFlight) return;
    attempts += 1;
    let routes: string[] = [];
    try {
      routes = getCurrentPages().map((page) =>
        String((page as { route?: string }).route || ""),
      );
      if (!shouldRecoverIosStartupRoute(routes)) return;
    } catch {
      // 页面栈读取失败时继续恢复首页，避免启动永久白屏。
    }
    recoveryInFlight = true;
    uni.reLaunch({
      url: HOME_ROUTE,
      success: () => {
        recoveryInFlight = false;
        try {
          uni.setStorageSync(IOS_STARTUP_RECOVERY_KEY, buildNumber);
        } catch {
          // 标记写入失败不影响本次首页恢复；下次启动最多再恢复一次。
        }
      },
      fail: () => {
        recoveryInFlight = false;
        // App 冷启动过早时页面服务可能尚未就绪，短延迟后仅重试一次。
        if (attempts < 2) pendingRecovery = setTimeout(recover, RETRY_DELAY_MS);
      },
    });
  };

  pendingRecovery = setTimeout(recover, RECOVERY_DELAY_MS);
  // #endif
}
