const IOS_STARTUP_RECOVERY_KEY = "app:ios-startup-recovery-build";
const HOME_ROUTE = "/pages/index/index";
const RECOVERY_DELAY_MS = 800;
const RETRY_DELAY_MS = 900;

// #ifdef APP-PLUS
export function hasRenderableStartupPage(routes: string[]): boolean {
  return routes.some((route) => Boolean(String(route || "").trim()));
}
// #endif

/**
 * 修复 iOS 覆盖升级后的失效页面恢复：
 * 旧 App 的场景/WebView 可能在新包启动时被系统恢复，但对应页面已经变化，最终只剩白屏。
 * 冷启动后仅在页面栈确实为空时重建首页；不清 token、用户资料或业务缓存。
 * 构建号标记只用于诊断，不能阻止后续冷启动再次执行空栈保护。
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

  let attempts = 0;
  const recover = () => {
    attempts += 1;
    try {
      const routes = getCurrentPages().map((page) =>
        String((page as { route?: string }).route || ""),
      );
      if (hasRenderableStartupPage(routes)) {
        uni.setStorageSync(IOS_STARTUP_RECOVERY_KEY, buildNumber);
        return;
      }
    } catch {
      // 页面栈读取失败时继续按空栈恢复，避免启动永久白屏。
    }
    uni.reLaunch({
      url: HOME_ROUTE,
      success: () => {
        try {
          uni.setStorageSync(IOS_STARTUP_RECOVERY_KEY, buildNumber);
        } catch {
          // 标记写入失败不影响本次首页恢复；下次启动最多再恢复一次。
        }
      },
      fail: () => {
        // App 冷启动过早时页面服务可能尚未就绪，短延迟后仅重试一次。
        if (attempts < 2) setTimeout(recover, RETRY_DELAY_MS);
      },
    });
  };

  setTimeout(recover, RECOVERY_DELAY_MS);
  // #endif
}
