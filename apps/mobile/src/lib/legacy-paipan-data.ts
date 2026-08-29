import { apiGet, apiGetOptionalAuth } from "@/utils/request";

export interface LegacyPaipanEntry {
  mode: "legacy" | "native";
  url: string | null;
  attributionReady: boolean;
}

const LEGACY_ENTRY_HANDOFF_TTL_MS = 15_000;
let pendingLegacyEntry: { entry: LegacyPaipanEntry; expiresAt: number } | null = null;

/**
 * 排盘入口页与原生 WebView 承接页之间的一次性交接。
 * 只保存在当前 JS 进程内，不写缓存、不拼进路由，也不会把完整签名 URL 暴露到日志。
 */
export function stageLegacyPaipanEntry(entry: LegacyPaipanEntry) {
  pendingLegacyEntry = {
    entry,
    expiresAt: Date.now() + LEGACY_ENTRY_HANDOFF_TTL_MS,
  };
}

export function consumeLegacyPaipanEntry(): LegacyPaipanEntry | null {
  const pending = pendingLegacyEntry;
  pendingLegacyEntry = null;
  if (!pending || pending.expiresAt < Date.now()) return null;
  return pending.entry;
}

export const legacyPaipanApi = {
  // 普通入口虽然需要登录，但 401 只能由排盘页面显示登录提示，不能触发全局 reLaunch
  // 劫持首页、圈子、发现等游客可访问页面。
  entry: () => apiGetOptionalAuth<LegacyPaipanEntry>("/legacy-paipan/entry"),
  account: () => apiGetOptionalAuth<LegacyPaipanEntry>("/legacy-paipan/account"),
  runtime: () => apiGet<{ mode: "legacy" | "native" }>("/legacy-paipan/runtime"),
  nativeQaAccess: () => apiGet<{ allowed: true }>("/legacy-paipan/native-qa/access"),
  stationEntry: (stationId: string) =>
    apiGet<{ mode: "legacy" | "native"; url: string | null }>(
      `/legacy-paipan/station/${encodeURIComponent(stationId)}/entry`,
    ),
};
