import { legacyPaipanApi } from "@/lib/legacy-paipan-data";
import { navigateTo } from "@/utils/router";

const MODE_KEY = "paipan:runtime-mode";
const QA_KEY = "paipan:native-qa-session";

export function isNativePaipanPath(url: string): boolean {
  const path = String(url || "").split("?")[0];
  return (
    path.startsWith("/pkg-paipan/") ||
    path.startsWith("/pkg-paipan2/") ||
    path.startsWith("/pkg-workspace/")
  );
}

export function canOpenNativePaipan(): boolean {
  return uni.getStorageSync(MODE_KEY) === "native" || uni.getStorageSync(QA_KEY) === "allowed";
}

export function setNativeQaSession(allowed: boolean): void {
  if (allowed) uni.setStorageSync(QA_KEY, "allowed");
  else uni.removeStorageSync(QA_KEY);
}

export async function hydratePaipanRuntime(): Promise<"legacy" | "native"> {
  try {
    const result = await legacyPaipanApi.runtime();
    const mode = result.mode === "native" ? "native" : "legacy";
    uni.setStorageSync(MODE_KEY, mode);
    if (mode === "legacy") uni.removeStorageSync(QA_KEY);
    return mode;
  } catch {
    // 门禁接口不可用时按 legacy 关闭自研能力，绝不以网络失败为由放行。
    uni.setStorageSync(MODE_KEY, "legacy");
    uni.removeStorageSync(QA_KEY);
    return "legacy";
  }
}

export function redirectNativePaipanToLegacy(url: string): boolean {
  if (!isNativePaipanPath(url) || canOpenNativePaipan()) return false;
  navigateTo("/pages/paipan/index");
  return true;
}
