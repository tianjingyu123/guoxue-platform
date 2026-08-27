const IOS_STARTUP_RECOVERY_KEY = "app:ios-startup-recovery-build";
const HOME_ROUTE = "/pages/index/index";
const RECOVERY_DELAY_MS = 350;
const RETRY_DELAY_MS = 700;

export function needsIosStartupRecovery(buildNumber: string, recoveredBuild: unknown): boolean {
  const current = String(buildNumber || "").trim();
  return Boolean(current && String(recoveredBuild || "").trim() !== current);
}

/**
 * 修复 iOS 覆盖升级后的失效页面恢复：
 * 旧 App 的场景/WebView 可能在新包启动时被系统恢复，但对应页面已经变化，最终只剩白屏。
 * 每个 build 首次启动重建一次首页页面栈；不清 token、用户资料或业务缓存。
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
    if (!needsIosStartupRecovery(buildNumber, uni.getStorageSync(IOS_STARTUP_RECOVERY_KEY))) return;
  } catch {
    return;
  }

  let attempts = 0;
  const recover = () => {
    attempts += 1;
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
